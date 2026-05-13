import { describe, expect, jest, test, beforeEach, afterEach } from "@jest/globals";

const originalEnv = process.env;

async function loadConfig(env: Record<string, string | undefined> = {}) {
  jest.resetModules();
  process.env = {
    ...originalEnv,
    NEXT_PUBLIC_AMICA_RUNTIME_MODE: undefined,
    NEXT_PUBLIC_PSFN_CONDUIT_MODE: undefined,
    NEXT_PUBLIC_CHATBOT_BACKEND: undefined,
    NEXT_PUBLIC_TTS_BACKEND: undefined,
    NEXT_PUBLIC_STT_BACKEND: undefined,
    NEXT_PUBLIC_VISION_BACKEND: undefined,
    NEXT_PUBLIC_AMICA_LIFE_ENABLED: undefined,
    NEXT_PUBLIC_PSFN_HUB_WS_URL: undefined,
    ...env,
  };

  jest.doMock("@/features/externalAPI/externalAPI", () => ({
    handleConfig: jest.fn(async () => undefined),
    serverConfig: {},
  }), { virtual: true });

  return import("../src/utils/config");
}

describe("PSFN runtime config", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.unmock("@/features/externalAPI/externalAPI");
  });

  test("defaults to the legacy standalone runtime", async () => {
    const { defaultConfig, resolveAmicaRuntimeMode, AMICA_RUNTIME_MODE_LEGACY } = await loadConfig();

    expect(resolveAmicaRuntimeMode({})).toBe(AMICA_RUNTIME_MODE_LEGACY);
    expect(defaultConfig("amica_runtime_mode")).toBe(AMICA_RUNTIME_MODE_LEGACY);
    expect(defaultConfig("chatbot_backend")).toBe("openai");
    expect(defaultConfig("tts_backend")).toBe("piper");
    expect(defaultConfig("stt_backend")).toBe("whisper_browser");
    expect(defaultConfig("vision_backend")).toBe("vision_openai");
    expect(defaultConfig("amica_life_enabled")).toBe("true");
  });

  test("PSFN conduit mode disables local AI defaults", async () => {
    const { defaultConfig, isPsfnConduitMode, AMICA_RUNTIME_MODE_PSFN_CONDUIT } = await loadConfig({
      NEXT_PUBLIC_PSFN_CONDUIT_MODE: "true",
    });

    expect(defaultConfig("amica_runtime_mode")).toBe(AMICA_RUNTIME_MODE_PSFN_CONDUIT);
    expect(isPsfnConduitMode()).toBe(true);
    expect(defaultConfig("chatbot_backend")).toBe("psfn_conduit");
    expect(defaultConfig("tts_backend")).toBe("none");
    expect(defaultConfig("stt_backend")).toBe("none");
    expect(defaultConfig("vision_backend")).toBe("none");
    expect(defaultConfig("amica_life_enabled")).toBe("false");
    expect(defaultConfig("show_introduction")).toBe("false");
    expect(defaultConfig("show_add_to_homescreen")).toBe("false");
    expect(defaultConfig("vrm_url")).toBe("/vrm/AvatarSample_A.vrm");
    expect(defaultConfig("animation_url")).toBe("/animations/idle_loop.vrma");
    expect(defaultConfig("animation_procedural")).toBe("false");
    expect(defaultConfig("psfn_realtime_enabled")).toBe("true");
    expect(defaultConfig("psfn_capabilities_output")).toContain("streamed_audio");
  });

  test("deployment-owned conduit defaults override stale localStorage", async () => {
    localStorage.setItem("chatvrm_chatbot_backend", "openai");
    localStorage.setItem("chatvrm_tts_backend", "piper");
    localStorage.setItem("chatvrm_amica_life_enabled", "true");

    const { config } = await loadConfig({
      NEXT_PUBLIC_AMICA_RUNTIME_MODE: "psfn_conduit",
      NEXT_PUBLIC_PSFN_HUB_WS_URL: "ws://127.0.0.1:4317/realtime",
    });

    expect(config("chatbot_backend")).toBe("psfn_conduit");
    expect(config("tts_backend")).toBe("none");
    expect(config("amica_life_enabled")).toBe("false");
    expect(config("psfn_hub_ws_url")).toBe("ws://127.0.0.1:4317/realtime");
  });

  test("explicit deployment backend overrides are respected in conduit mode", async () => {
    const { config } = await loadConfig({
      NEXT_PUBLIC_PSFN_CONDUIT_MODE: "true",
      NEXT_PUBLIC_TTS_BACKEND: "piper",
      NEXT_PUBLIC_STT_BACKEND: "whisper_browser",
    });

    expect(config("tts_backend")).toBe("piper");
    expect(config("stt_backend")).toBe("whisper_browser");
  });
});
