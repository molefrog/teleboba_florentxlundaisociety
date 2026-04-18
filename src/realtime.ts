export type ToolHandler = (name: string, args: unknown) => unknown | Promise<unknown>;
export type TranscriptHandler = (text: string, final: boolean) => void;

export interface RealtimeSession {
  stop: () => void;
}

export interface RealtimeConfig {
  temperament?: "playful" | "lecture" | "corporate" | "improv";
}

const MODEL = "gpt-realtime-1.5";

const SFX_ENUM = [
  "applause",
  "drumroll",
  "sad_trombone",
  "airhorn",
  "record_scratch",
  "ding",
  "buzzer",
  "crowd_ooh",
  "crickets",
  "laugh_track",
  "vinyl_stop",
  "slide_whistle",
];

const TOOLS = [
  {
    type: "function",
    name: "show_text",
    description:
      "Display a single KEY CONCEPT on screen as a big headline. Use when the speaker lands on a memorable phrase, insight, definition, or takeaway worth surfacing. This is slide content — not live captions. Max ~90 chars, ideally 1–8 words or one short sentence. Do NOT call this for every noun you hear; only when there is a concrete key idea.",
    parameters: {
      type: "object",
      properties: {
        text: {
          type: "string",
          description: "The key concept to display. 1–8 words or one short sentence. Avoid filler.",
        },
        font: {
          type: "string",
          enum: ["default", "serif", "silly"],
          description:
            "Typography. 'default' for most speech. 'serif' for editorial, solemn, or thoughtful tones. 'silly' for jokes, absurdism, playful emphasis.",
        },
      },
      required: ["text"],
    },
  },
  {
    type: "function",
    name: "show_timeline",
    description:
      "Display a horizontal timeline of 2–6 dots with labels. Use when the speaker narrates a sequence, journey, or temporal progression ('first… then… finally…', 'stage 1, 2, 3', 'here's how it unfolded'). Each point gets a short title; add a caption only when it adds information.",
    parameters: {
      type: "object",
      properties: {
        points: {
          type: "array",
          minItems: 2,
          maxItems: 6,
          items: {
            type: "object",
            properties: {
              title: { type: "string", description: "Short label (1–3 words)." },
              caption: { type: "string", description: "Optional 1-line caption." },
            },
            required: ["title"],
          },
        },
      },
      required: ["points"],
    },
  },
  {
    type: "function",
    name: "show_alternatives",
    description:
      "Display 2–3 alternatives side-by-side. Use when the speaker compares choices, lists options they considered, or weighs approaches ('we tried A, B, and C — picked C', 'three ways to do this'). Pass `selected` (matching one title, case-insensitive) ONLY when the speaker clearly commits to one option.",
    parameters: {
      type: "object",
      properties: {
        items: {
          type: "array",
          minItems: 2,
          maxItems: 3,
          items: {
            type: "object",
            properties: {
              title: { type: "string", description: "Option name (1–3 words)." },
              text: { type: "string", description: "Short description (< 10 words)." },
            },
            required: ["title", "text"],
          },
        },
        selected: {
          type: "string",
          description:
            "Title of the chosen/highlighted option. Only include when the speaker has clearly picked one.",
        },
      },
      required: ["items"],
    },
  },
  {
    type: "function",
    name: "set_background",
    description:
      "Set a full-screen thematic background behind the content. The background stays until you call set_background again OR until the content TYPE changes (text→timeline, etc). Use for atmospheric illustration of the current topic. Keep queries 1–3 concrete words.",
    parameters: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: ["gif", "image"],
          description:
            "'gif' for kinetic, funny, meme-y, motion-referential vibes. 'image' for atmospheric stills (places, objects, subjects).",
        },
        query: {
          type: "string",
          description: "Search query, 1–3 words. Concrete subject, not abstract concepts.",
        },
      },
      required: ["type", "query"],
    },
  },
  {
    type: "function",
    name: "clear_background",
    description:
      "Remove the current background. Use when the mood shifts and nothing new fits, or the conversation has moved on.",
    parameters: { type: "object", properties: {} },
  },
  {
    type: "function",
    name: "emoji_rain",
    description:
      "Launch a dramatic burst of giant emojis flying up the screen. Use SPARINGLY, only for peak moments: punchlines, celebrations, shock, disappointment, absurd turns. Never back-to-back.",
    parameters: {
      type: "object",
      properties: {
        emojis: {
          type: "string",
          description: "2–6 emoji characters, e.g. '🎉✨🔥' or '💀😱'.",
        },
        density: {
          type: "number",
          minimum: 10,
          maximum: 120,
          description: "Number of emojis (default 40).",
        },
      },
      required: ["emojis"],
    },
  },
  {
    type: "function",
    name: "play_sfx",
    description:
      "Play a short sound effect for dramatic punctuation. Use SPARINGLY, only for clear moments: applause (wins), sad_trombone (failures), drumroll (reveals), airhorn (bangers), record_scratch (abrupt pivots), crickets (awkward silence), etc. Never back-to-back with another sfx or emoji_rain.",
    parameters: {
      type: "object",
      properties: {
        name: {
          type: "string",
          enum: SFX_ENUM,
          description: "Sound name.",
        },
      },
      required: ["name"],
    },
  },
  {
    type: "function",
    name: "no_op",
    description:
      "Explicit no-op. Use when the current speech is filler, connective tissue, or has no actionable visual yet. PREFER this over forcing a tool call.",
    parameters: { type: "object", properties: {} },
  },
];

const TEMPERAMENT_NOTES: Record<string, string> = {
  playful:
    "Temperament: PLAYFUL. Lean into silly fonts, gifs, emoji_rain, sfx. Chaos cinema. Bias toward kinetic backgrounds.",
  lecture:
    "Temperament: LECTURE. Serious and educational. Favor timeline and alternatives. Serif or default fonts. Minimal sfx/emoji. Image backgrounds (whiteboard, reference photos) over gifs.",
  corporate:
    "Temperament: CORPORATE. Tasteful and restrained. Default font. Stock-photo-style image backgrounds. Almost no sfx or emoji_rain. Clean timelines and comparisons.",
  improv:
    "Temperament: IMPROV. Unhinged, context-aware absurdism. Silly font often, surprise sfx, emoji_rain for laughs, gif backgrounds for visual jokes.",
};

function buildInstructions(temperament?: string): string {
  const tempLine = TEMPERAMENT_NOTES[temperament ?? "playful"] ?? TEMPERAMENT_NOTES.playful;
  return `You are a silent visual companion to a live presenter. You NEVER produce prose or spoken text. Your only purpose is to project visual context on screen as the presenter speaks.

Listen to each clause. When you hear a KEY CONCEPT worth surfacing as a slide, call the appropriate tool. Otherwise call no_op. This is a dynamic slide deck, not live captions.

GOLDEN RULE FOR TEXT: show_text holds KEY CONCEPTS, not singular words. Think slide headlines for a talk — "Ship before you're ready" not "ship". "Three things went wrong" not "wrong". 1–8 words or one short sentence.

WHEN TO USE EACH TOOL:
- show_text: the speaker just made a memorable point, definition, or takeaway.
- show_timeline: the speaker is narrating a sequence ("first… then… finally…", steps, phases).
- show_alternatives: the speaker is comparing options / listing choices / weighing approaches.
- set_background: you want a thematic visual to sit behind future slides. Let it ride across same-type updates. Don't change it every slide.
- clear_background: the current bg doesn't fit anymore.
- emoji_rain / play_sfx: PUNCTUATION. Peaks only — jokes landing, celebrations, failures, reveals. Never back-to-back.
- no_op: filler speech, throat-clearing, transitions. Prefer this over noise.

${tempLine}

Hard rules:
- NEVER speak or produce prose. Tools only.
- Do not fire tools redundantly for the same idea in a row.
- Text captures ideas, not nouns. When in doubt, no_op.`;
}

export async function startRealtime(
  onTool: ToolHandler,
  onStatus: (s: string) => void,
  onTranscript: TranscriptHandler,
  config: RealtimeConfig = {},
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
        instructions: buildInstructions(config.temperament),
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
