---
title: PSFN Conduit Mode
order: 7
---

## PSFN Conduit Mode

PSFN conduit mode connects Amica's browser avatar to a PSFN Satellite Hub websocket. The Hub owns text and audio transport, PSFN Framework owns companion intelligence, and Amica keeps the local VRM presentation layer.

Use this mode for PSFN deployments where Amica should be a visual conduit instead of a standalone AI assistant.

## Ownership Boundaries

Amica owns:

* VRM rendering, model/outfit switching, animation selection, procedural animation, expressions, gaze, blink, and lip sync.
* Browser camera capture and local face tracking UI.
* Operator UI for presentation settings and Hub connection state.
* Legacy local AI provider support when conduit mode is off.

PSFN Satellite Hub owns:

* Realtime websocket session attachment.
* `hello` and authoritative `hello.ack` state.
* Text input transport, streamed assistant text/audio, interrupt, mute/session control, and embodied satellite fan-out.
* Hub to PSFN Framework satellite registry/scalar headers.

PSFN Framework owns:

* LLM responses, long-lived companion identity, memory, prompts, STT, TTS, semantic vision, and post-turn reasoning.

## Amica Environment

Conduit mode disables the local Amica Life text and memory loops by default. It does not disable avatar presentation. The settings UI still exposes:

* Settings -> Appearance -> Character Model
* Settings -> Appearance -> Character Animation

Those pages preserve model and outfit switching through `vrm_url`, idle animation through `animation_url`, and procedural animation through `animation_procedural`.

The VRM viewer applies `animation_url` when a model loads unless procedural animation is enabled. The model update loop applies procedural animation, lip sync, expression, blink, and gaze updates directly from the viewer/model path, so those controls do not depend on Amica Life being initialized.

The Hub capability advertisement includes `animation`, `expression`, and `gaze`. Stable inbound fields for Hub-driven animation and expression commands are not defined yet, so conduit mode should keep advertising those presentation capabilities without inventing incompatible message shapes.

Set these Amica variables for a normal conduit deployment:

```bash
NEXT_PUBLIC_AMICA_RUNTIME_MODE=psfn_conduit
NEXT_PUBLIC_PSFN_HUB_WS_URL=ws://127.0.0.1:8787/
NEXT_PUBLIC_PSFN_DEVICE_ID=amica-browser
NEXT_PUBLIC_PSFN_DEVICE_NAME="Amica Browser"
NEXT_PUBLIC_PSFN_SESSION_ID=amica-local
NEXT_PUBLIC_PSFN_SATELLITE_ID=amica
NEXT_PUBLIC_PSFN_SATELLITE_NAME=Amica
NEXT_PUBLIC_PSFN_CAPABILITIES_INPUT=text
NEXT_PUBLIC_PSFN_CAPABILITIES_OUTPUT=text,subtitle,streamed_audio,animation,expression,gaze
NEXT_PUBLIC_PSFN_CAPABILITIES_CONTROL=interrupt,presence,session_attach
NEXT_PUBLIC_PSFN_CAPABILITIES_SAFETY=local_only
NEXT_PUBLIC_PSFN_VISION_UPLOAD_ENABLED=false
```

Model and presentation defaults can be pinned by deployment:

```bash
NEXT_PUBLIC_VRM_URL=/vrm/AvatarSample_A.vrm
NEXT_PUBLIC_ANIMATION_URL=/animations/idle_loop.vrma
NEXT_PUBLIC_ANIMATION_PROCEDURAL=false
NEXT_PUBLIC_BG_URL=/bg/bg-room2.jpg
NEXT_PUBLIC_FACE_TRACKING_ENABLED=false
NEXT_PUBLIC_RENDER_ANTIALIAS=true
NEXT_PUBLIC_RENDER_PIXEL_RATIO_CAP=2
```

Conduit mode defaults these local Amica systems off:

```bash
NEXT_PUBLIC_CHATBOT_BACKEND=psfn_conduit
NEXT_PUBLIC_TTS_BACKEND=none
NEXT_PUBLIC_STT_BACKEND=none
NEXT_PUBLIC_VISION_BACKEND=none
NEXT_PUBLIC_AMICA_LIFE_ENABLED=false
NEXT_PUBLIC_AMICA_LIFE_MODE=off
NEXT_PUBLIC_EXTERNAL_API_ENABLED=false
NEXT_PUBLIC_REASONING_ENGINE_ENABLED=false
NEXT_PUBLIC_AUTOSEND_FROM_MIC=false
```

You can still set explicit deployment overrides for debugging, but that should be treated as legacy mode behavior.

## Satellite Hub Environment

Configure Satellite Hub as the PSFN-facing owner of the satellite claim. The current Amica browser path connects to the Hub websocket as a satellite and does not send Framework channel-claim headers directly.

Representative Hub values:

```bash
PSFN_CLAIM_NAMESPACE=satellite.endpoint
PSFN_CLAIM_TYPE=amica-conduit
PSFN_CHANNEL_TYPE=satellite.endpoint
PSFN_CAPABILITY_PROFILE=mobile-location
PSFN_SATELLITE_ID=amica
PSFN_ENDPOINT_ID=amica-browser
PSFN_ENDPOINT_NAME="Amica Browser"
PSFN_ENDPOINT_CLASS=avatar
PSFN_LOCATION_MODE=static
PSFN_TELEMETRY_MODE=event
PSFN_TELEMETRY_CATEGORIES=presence,avatar_state
```

Hub to Framework scalar headers are the contract. The JSON `satellite_claim` payload is diagnostic only.

The matching Framework `satellites.json` endpoint must allow the Hub-mapped capabilities that Amica advertises. The default output set `text,subtitle,streamed_audio,animation,expression,gaze` maps to at least:

```json
[
  "text",
  "audio_output",
  "text_to_speech",
  "avatar",
  "avatar_expression",
  "presence"
]
```

If `NEXT_PUBLIC_PSFN_VISION_UPLOAD_ENABLED=true`, the same endpoint also needs `vision` and `image_upload`. If the endpoint is an Android/mobile build with telemetry, include `location`, `timezone`, `battery`, `health`, and `telemetry` as appropriate.

## Realtime Flow

1. Amica opens `NEXT_PUBLIC_PSFN_HUB_WS_URL`.
2. Amica sends `hello` with `deviceId`, `deviceName`, optional `sessionId`, optional `channelId`, `satelliteId`, `satelliteName`, and capabilities.
3. Hub sends `session.ready` and `hello.ack`; Amica treats `hello.ack` as authoritative.
4. Typed user input sends `user.text` with `interrupt: true`.
5. Hub streams `message` events for user/assistant text, `text: audio-init`, `audio`, `text: audio-end`, and interrupt/action events.
6. Amica displays text and passes Hub audio to the existing VRM lip-sync path. It does not call local LLM/TTS/STT providers for the turn.

The older `/api/satelliteBridge` POST to SSE path is retained as a compatibility/development bridge. It is not the primary Hub contract.

## Vision

Camera capture remains in the UI. Semantic vision is PSFN-owned in conduit mode.

`vision_upload` is not advertised by default because the Hub protocol does not yet define a stable image upload message for Amica. If `NEXT_PUBLIC_PSFN_VISION_UPLOAD_ENABLED=true` is set before that message exists, Amica still blocks local provider fallback and reports the route as pending. This avoids silently leaking frames to legacy OpenAI/Llama/Ollama vision settings.

## Verification

Run the unit harness:

```bash
npm test -- --runInBand
```

Run the local PSFN conduit smoke:

```bash
npm run smoke:psfn-conduit
```

The smoke command checks:

* fake Hub websocket `hello`, `hello.ack`, `user.text`, assistant text/audio, and interrupt flow;
* VRM model and animation settings remain present in conduit menus;
* local AI provider imports stay lazy from the default chat path.

Run TypeScript:

```bash
npx tsc --noEmit --pretty false
```

## Troubleshooting

No Hub connection: check `NEXT_PUBLIC_PSFN_HUB_WS_URL`, browser mixed-content rules, and whether the Hub websocket path/port is reachable.

Typed text does nothing: conduit mode requires the Hub websocket to be connected; local LLM fallback is intentionally disabled for `psfn_conduit`.

No assistant audio: confirm Hub sends `text: audio-init`, one or more `audio` chunks, and `text: audio-end`.

Wrong session: set stable `NEXT_PUBLIC_PSFN_SESSION_ID` or let Hub assign one and inspect `hello.ack`.

Vision unavailable: this is expected until Hub exposes a stable image upload path.

Provider pages missing: in conduit mode, local provider settings are hidden by design. Turn conduit mode off to debug upstream Amica local providers.
