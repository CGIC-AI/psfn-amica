---
title: PSFN Cleanup Plan
order: 8
---

## PSFN Cleanup Plan

This plan is for a later deletion pass after PSFN conduit mode has passing tests and smoke coverage. The current implementation keeps legacy Amica paths available outside conduit mode and lazy-loads local AI providers so the PSFN default path stays lean.

Run these commands before and after each cleanup change:

```bash
npm test -- --runInBand
npx tsc --noEmit --pretty false
npm run smoke:psfn-conduit
```

## Keep

Keep these areas as core PSFN Amica functionality:

* `src/features/vrmViewer/**`
* `src/lib/VRMAnimation/**`
* `src/features/vrmStore/**`
* `src/components/settings/CharacterModelPage.tsx`
* `src/components/settings/CharacterAnimationPage.tsx`
* `src/components/embeddedWebcam.tsx`
* `src/components/faceTrackingCamera.tsx`
* `src/components/faceTrackingBridge.tsx`
* `src/features/psfnSatelliteBridge/**`
* `src/features/chat/realtime*`, `src/features/chat/satellitePlayback.ts`, and `src/features/chat/visionRouting.ts`
* render/debug controls used for WebGL, MToon, WebGPU, face tracking, and VRM inspection

Reason: these modules are presentation, model management, camera, face/gaze, Hub transport, or verification code.

## Leave Legacy-Only For Now

Leave these areas available outside PSFN conduit mode until a separate deletion bead removes them:

* local chat provider implementations: `arbiusChat`, `openAiChat`, `llamaCppChat`, `ollamaChat`, `koboldAiChat`, `openRouterChat`, `windowAiChat`
* local TTS providers: `elevenlabs`, `speecht5`, `openaiTTS`, `localXTTS`, `piper`, `coquiLocal`, `kokoro`, `rvc`
* local semantic vision provider calls in `llamaCppChat`, `ollamaChat`, and `openAiChat`
* STT and wake-word provider settings
* local provider guide docs under `docs/guides/**`

Reason: they are now hidden or lazy-loaded in conduit mode, but they are still useful for upstream comparison and local debugging.

## Candidate Deletions

Delete only after confirming no PSFN deployment relies on legacy mode:

* provider settings pages for hidden local LLM/TTS/STT backends
* local STT worker and Transformers/VAD paths if no browser-local microphone mode is retained
* social/external API integrations if PSFN Framework fully owns outbound actions and memory
* docs that teach local provider setup as the default path for this fork
* Tauri/PWA packaging paths if production settles on one deployment target

Each deletion should include a bead with:

* exact files/modules removed;
* reason for deletion;
* replacement or PSFN-owned path;
* verification command output;
* rollback risk.

## Current Guardrails

The following tests and smokes should fail if the code drifts back toward standalone behavior:

* `__tests__/configRuntime.spec.ts`: conduit defaults and deployment-owned overrides.
* `__tests__/homeRuntime.spec.ts`: Amica Life and external chat log initialization gates.
* `__tests__/settingsMenuKeys.spec.ts`: conduit settings menu trimming while keeping model/animation pages.
* `__tests__/psfnRealtime.spec.ts`: Hub websocket hello/user.text/interrupt and inbound event handling.
* `__tests__/satellitePlayback.spec.ts`: text joining and stale segment rejection.
* `__tests__/visionRouting.spec.ts`: semantic vision stays PSFN-owned in conduit mode.
* `scripts/smoke_psfn_conduit_lazy_ai_imports.js`: local AI providers remain lazy-loaded from `chat.ts`.
* `scripts/smoke_psfn_conduit_vrm_controls.js`: model and animation controls stay reachable.
* `scripts/smoke_psfn_conduit_realtime.js`: fake Hub realtime flow works without live PSFN keys.

## Deletion Order

1. Remove or archive obsolete docs after the PSFN conduit guide is adopted.
2. Remove hidden provider settings pages if no operator needs legacy local mode.
3. Remove local provider implementations and dependencies one family at a time: STT, TTS, LLM, semantic vision.
4. Remove external API/social/plugin loops once Framework replacements are confirmed.
5. Re-run build analysis and tighten smoke checks to ensure the default page loads only presentation, Hub transport, camera/face, and VRM dependencies.
