export type ToolHandler = (name: string, args: unknown) => unknown | Promise<unknown>;
export type TranscriptHandler = (text: string, final: boolean) => void;

export interface RealtimeSession {
  stop: () => void;
}

const MODEL = "gpt-realtime-1.5";

const TOOLS = [
  {
    type: "function",
    name: "display_keyphrase",
    description:
      "Call this whenever the user says a short, memorable phrase, keyword, topic, or command you want to surface on screen. Call it aggressively — on every clause, every noun phrase, every interesting word. Pick a short text (1-6 words). Call again with a new phrase when the user says something new.",
    parameters: {
      type: "object",
      properties: {
        text: {
          type: "string",
          description: "The keyphrase to display, 1-6 words, concise.",
        },
      },
      required: ["text"],
    },
  },
  {
    type: "function",
    name: "no_op",
    description: "Call this when the user is not saying anything actionable. Do not produce text.",
    parameters: { type: "object", properties: {} },
  },
];

const INSTRUCTIONS = `You are a silent listener. You never produce prose or spoken text.
Your only job: as the user speaks, continuously extract short keyphrases and call
display_keyphrase({ text }) with each one. Act immediately — do not wait for the user
to finish a thought. Call the tool on each clause or noteworthy phrase.
If nothing meaningful was said, call no_op. Never respond with speech or prose.`;

export async function startRealtime(
  onTool: ToolHandler,
  onStatus: (s: string) => void,
  onTranscript: TranscriptHandler,
) {
  onStatus("requesting mic");
  const mic = await navigator.mediaDevices.getUserMedia({ audio: true });

  onStatus("minting token");
  const tokenRes = await fetch("/api/token", { method: "POST" });
  if (!tokenRes.ok) throw new Error(`token mint failed: ${await tokenRes.text()}`);
  const tokenJson = await tokenRes.json();
  const ephemeral: string =
    tokenJson?.value ?? tokenJson?.client_secret?.value ?? tokenJson?.client_secret;
  if (!ephemeral) throw new Error("no ephemeral token in response");

  onStatus("connecting");
  const pc = new RTCPeerConnection();
  const audioEl = Object.assign(document.createElement("audio"), { autoplay: true });
  pc.ontrack = (e) => (audioEl.srcObject = e.streams[0]);
  pc.addTrack(mic.getTracks()[0]);

  const dc = pc.createDataChannel("oai-events");
  const send = (obj: unknown) => dc.send(JSON.stringify(obj));

  dc.addEventListener("open", () => {
    send({
      type: "session.update",
      session: {
        type: "realtime",
        model: MODEL,
        output_modalities: ["text"],
        tool_choice: "required",
        tools: TOOLS,
        instructions: INSTRUCTIONS,
        audio: {
          input: {
            transcription: { model: "gpt-4o-mini-transcribe" },
            turn_detection: {
              type: "server_vad",
              threshold: 0.5,
              prefix_padding_ms: 200,
              silence_duration_ms: 250,
              create_response: true,
              interrupt_response: true,
            },
          },
        },
      },
    });
    onStatus("live");
  });

  dc.addEventListener("message", async (e) => {
    let ev: any;
    try {
      ev = JSON.parse(e.data);
    } catch {
      return;
    }

    // eslint-disable-next-line no-console
    console.debug("[realtime]", ev.type, ev);

    if (ev.type === "conversation.item.input_audio_transcription.delta") {
      onTranscript(ev.delta ?? "", false);
    }
    if (ev.type === "conversation.item.input_audio_transcription.completed") {
      onTranscript(ev.transcript ?? "", true);
    }

    if (ev.type === "response.function_call_arguments.done") {
      let args: unknown = {};
      try {
        args = JSON.parse(ev.arguments || "{}");
      } catch {}
      const output = await onTool(ev.name, args);
      send({
        type: "conversation.item.create",
        item: {
          type: "function_call_output",
          call_id: ev.call_id,
          output: JSON.stringify(output ?? { ok: true }),
        },
      });
      send({ type: "response.create" });
    }

    if (ev.type === "error") {
      console.error("realtime error", ev);
    }
  });

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  const sdpRes = await fetch(`https://api.openai.com/v1/realtime/calls?model=${MODEL}`, {
    method: "POST",
    body: offer.sdp,
    headers: {
      Authorization: `Bearer ${ephemeral}`,
      "Content-Type": "application/sdp",
    },
  });
  if (!sdpRes.ok) throw new Error(`SDP exchange failed: ${await sdpRes.text()}`);
  await pc.setRemoteDescription({ type: "answer", sdp: await sdpRes.text() });

  return {
    stop: () => {
      try {
        dc.close();
      } catch {}
      try {
        pc.close();
      } catch {}
      mic.getTracks().forEach((t) => t.stop());
      onStatus("stopped");
    },
  } satisfies RealtimeSession;
}
