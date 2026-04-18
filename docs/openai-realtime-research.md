# OpenAI Realtime API — browser voice agent with tool calling (early 2026)

## TL;DR recommendation

Use **`@openai/agents-realtime`** (from `@openai/agents`) with model **`gpt-realtime`** over **WebRTC**, backed by a tiny server endpoint that mints ephemeral tokens. Execute tools on `response.function_call_arguments.done` for minimum latency. Use `semantic_vad` by default; switch to `server_vad` with short silence for command-style UX.

## 1. Transport: WebRTC, not WebSocket

OpenAI explicitly recommends **WebRTC for browsers**. WebSocket is for server-to-server — using it from a browser forces you to expose your API key and gives worse jitter/packet-loss handling. The official `openai-realtime-console` repo moved its browser WebSocket path to a "legacy, not recommended" branch.

## 2. Auth: ephemeral tokens

Your backend mints a short-lived `ek_...` token; browser uses it as a bearer.

```
POST https://api.openai.com/v1/realtime/client_secrets
Authorization: Bearer $OPENAI_API_KEY

{ "session": { "type": "realtime", "model": "gpt-realtime",
               "audio": { "output": { "voice": "marin" } } } }
```

⚠️ The preview endpoint `/v1/realtime/sessions` is **gone** in GA. Lots of blog posts still reference it.

## 3. Model

- **`gpt-realtime`** — GA (Aug/Sep 2025). Use this.
- `gpt-realtime-1.5` — newer snapshot pinned by the Agents SDK quickstart.
- `gpt-4o-realtime-preview-*` — legacy, avoid for new work.

## 4. Tool-calling event flow (exact names)

**Declare tools** via `session.update` (or in the initial `client_secrets` body):

```json
{
  "type": "session.update",
  "session": {
    "tools": [
      {
        "type": "function",
        "name": "open_calendar",
        "description": "...",
        "parameters": { "type": "object", "properties": {} }
      }
    ],
    "tool_choice": "auto"
  }
}
```

**Server events on the data channel:**

1. `response.created`
2. `response.output_item.added` (item `type: "function_call"`)
3. `response.function_call_arguments.delta` — streamed JSON args
4. `response.function_call_arguments.done` — full args + `call_id` + `name` ← **fire the tool here**
5. `response.output_item.done`
6. `response.done`

**Submit result** (two client events):

```json
{
  "type": "conversation.item.create",
  "item": {
    "type": "function_call_output",
    "call_id": "call_sHlR...",
    "output": "{\"ok\":true}"
  }
}
{ "type": "response.create" }
```

Parallel tool calls: multiple `function_call` items in one response — submit each output with its own `call_id`, then one `response.create`.

## 5. Minimal WebRTC handshake

```js
const { value: EPHEMERAL_KEY } = await fetch("/token").then(r => r.json());
const pc = new RTCPeerConnection();
const audioEl = Object.assign(document.createElement("audio"), { autoplay: true });
pc.ontrack = e => (audioEl.srcObject = e.streams[0]);

const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
pc.addTrack(mic.getTracks()[0]);

const dc = pc.createDataChannel("oai-events");
dc.addEventListener("message", e => handleServerEvent(JSON.parse(e.data)));

await pc.setLocalDescription(await pc.createOffer());
const sdp = await fetch("https://api.openai.com/v1/realtime/calls?model=gpt-realtime", {
  method: "POST",
  body: pc.localDescription.sdp,
  headers: {
    Authorization: `Bearer ${EPHEMERAL_KEY}`,
    "Content-Type": "application/sdp",
  },
});
await pc.setRemoteDescription({ type: "answer", sdp: await sdp.text() });
```

⚠️ GA endpoint is **`/v1/realtime/calls`**. Old docs show `/v1/realtime` — stale.

## 6. `@openai/agents-realtime` SDK (recommended)

```ts
import { RealtimeAgent, RealtimeSession, tool } from "@openai/agents/realtime";
import { z } from "zod";

const openCalendar = tool("open_calendar", {
  description: "Open the calendar UI",
  parameters: z.object({ date: z.string().optional() }),
  execute: async ({ date }) => {
    openUi(date);
    return { ok: true };
  },
});

const agent = new RealtimeAgent({
  name: "assistant",
  instructions: "Call tools immediately; narrate after.",
  tools: [openCalendar],
});

const session = new RealtimeSession(agent, {
  model: "gpt-realtime",
  config: { audio: { input: { turnDetection: { type: "semantic_vad" } } } },
});

await session.connect({ apiKey: ephemeralFromBackend });
```

Handles ephemeral negotiation, mic/playback, interruption (`audio_interrupted` with `truncatedIndex`), and tool dispatch. Drop to raw WebRTC only for custom audio pipelines (AudioWorklet etc).

## 7. Turn detection

- **`server_vad`** — energy-based. Knobs: `threshold`, `prefixPaddingMs`, `silenceDurationMs`, `idleTimeoutMs`, `createResponse`, `interruptResponse`.
- **`semantic_vad`** — small model decides end-of-utterance semantically. Better for hesitant speech.

Default recommendation: `semantic_vad` for conversation, `server_vad` with low `silenceDurationMs` (200–300ms) for command UX.

## 8. "Fire tools as I speak" — what's actually possible

**Tools cannot fire mid-user-utterance.** The loop is: user speaks → VAD commits → response turn starts → model emits `function_call` → you fire tool. To minimize perceived latency:

1. `server_vad` with short `silenceDurationMs` (200–300ms).
2. Act on **`response.function_call_arguments.done`**, not `response.done`.
3. Prompt the model: "call tools first, narrate after."
4. Non-blocking, optimistic tool execution in the browser.
5. If you truly need sub-word latency, run a local wake-word/keyword spotter in the browser for a curated command set and keep the Realtime model for conversation.

## Shifts since preview (easy to get wrong from stale tutorials)

| Thing          | Preview                       | GA                              |
| -------------- | ----------------------------- | ------------------------------- |
| SDP endpoint   | `/v1/realtime`                | `/v1/realtime/calls`            |
| Token mint     | `/v1/realtime/sessions`       | `/v1/realtime/client_secrets`   |
| Token response | `client_secret.value`         | `ek_...` shape varies — inspect |
| Model          | `gpt-4o-realtime-preview-*`   | `gpt-realtime`                  |

## Sources

- developers.openai.com/api/docs/guides/realtime, /realtime-webrtc, /realtime-conversations
- platform.openai.com/docs/api-reference/realtime-client-events, /realtime-server-events, /realtime-calls
- github.com/openai/openai-realtime-console
- github.com/openai/openai-agents-js • openai.github.io/openai-agents-js/guides/voice-agents/
- webrtchacks.com/how-openai-does-webrtc-in-the-new-gpt-realtime/ (2025-09-23)
- developers.openai.com/blog/realtime-api
