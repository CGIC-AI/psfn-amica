import { handleConfig, serverConfig } from "@/features/externalAPI/externalAPI";

export const AMICA_RUNTIME_MODE_LEGACY = "legacy";
export const AMICA_RUNTIME_MODE_PSFN_CONDUIT = "psfn_conduit";

export type AmicaRuntimeMode =
  | typeof AMICA_RUNTIME_MODE_LEGACY
  | typeof AMICA_RUNTIME_MODE_PSFN_CONDUIT;

type RuntimeEnv = Record<string, string | undefined>;

export function resolveAmicaRuntimeMode(env: RuntimeEnv = process.env): AmicaRuntimeMode {
  const explicitMode = env.NEXT_PUBLIC_AMICA_RUNTIME_MODE?.trim().toLowerCase();

  if (
    explicitMode === AMICA_RUNTIME_MODE_PSFN_CONDUIT ||
    explicitMode === "psfn" ||
    explicitMode === "conduit"
  ) {
    return AMICA_RUNTIME_MODE_PSFN_CONDUIT;
  }

  if (explicitMode === AMICA_RUNTIME_MODE_LEGACY || explicitMode === "standalone") {
    return AMICA_RUNTIME_MODE_LEGACY;
  }

  if (env.NEXT_PUBLIC_PSFN_CONDUIT_MODE?.trim().toLowerCase() === "true") {
    return AMICA_RUNTIME_MODE_PSFN_CONDUIT;
  }

  return AMICA_RUNTIME_MODE_LEGACY;
}

const amicaRuntimeMode = resolveAmicaRuntimeMode();
const psfnConduitRuntime = amicaRuntimeMode === AMICA_RUNTIME_MODE_PSFN_CONDUIT;
const defaultName = process.env.NEXT_PUBLIC_NAME ?? "Assistant";

function runtimeDefault(legacyValue: string, conduitValue: string): string {
  return psfnConduitRuntime ? conduitValue : legacyValue;
}

export const defaults = {
  amica_runtime_mode: process.env.NEXT_PUBLIC_AMICA_RUNTIME_MODE ?? amicaRuntimeMode,
  // AllTalk TTS specific settings
  localXTTS_url: process.env.NEXT_PUBLIC_LOCALXTTS_URL ?? 'http://127.0.0.1:7851',
  alltalk_version: process.env.NEXT_PUBLIC_ALLTALK_VERSION ?? 'v2',
  alltalk_voice: process.env.NEXT_PUBLIC_ALLTALK_VOICE ?? '',
  alltalk_language: process.env.NEXT_PUBLIC_ALLTALK_LANGUAGE ?? 'en',
  alltalk_rvc_voice: process.env.NEXT_PUBLIC_ALLTALK_RVC_VOICE ?? 'Disabled',
  alltalk_rvc_pitch: process.env.NEXT_PUBLIC_ALLTALK_RVC_PITCH ?? '0',
  autosend_from_mic: process.env.NEXT_PUBLIC_AUTOSEND_FROM_MIC ?? runtimeDefault('true', 'false'),
  wake_word_enabled: process.env.NEXT_PUBLIC_WAKE_WORD_ENABLED ?? runtimeDefault('false', 'false'),
  wake_word: 'Hello',
  time_before_idle_sec: '20',
  debug_gfx: 'false',
  render_antialias: process.env.NEXT_PUBLIC_RENDER_ANTIALIAS ?? 'true',
  render_pixel_ratio_cap: process.env.NEXT_PUBLIC_RENDER_PIXEL_RATIO_CAP ?? '2',
  render_xr_enabled: process.env.NEXT_PUBLIC_RENDER_XR_ENABLED ?? 'true',
  render_xr_framebuffer_scale: process.env.NEXT_PUBLIC_RENDER_XR_FRAMEBUFFER_SCALE ?? '2',
  face_tracking_enabled: process.env.NEXT_PUBLIC_FACE_TRACKING_ENABLED ?? 'false',
  face_tracking_parallax_strength: process.env.NEXT_PUBLIC_FACE_TRACKING_PARALLAX_STRENGTH ?? '1',
  face_tracking_eye_strength: process.env.NEXT_PUBLIC_FACE_TRACKING_EYE_STRENGTH ?? '1',
  use_webgpu: 'false',
  mtoon_debug_mode: 'none',
  mtoon_material_type: 'mtoon',
  language: process.env.NEXT_PUBLIC_LANGUAGE ?? 'en',
  show_introduction: process.env.NEXT_PUBLIC_SHOW_INTRODUCTION ?? runtimeDefault('true', 'false'),
  show_arbius_introduction: process.env.NEXT_PUBLIC_SHOW_ARBIUS_INTRODUCTION ?? 'false',
  show_add_to_homescreen: process.env.NEXT_PUBLIC_SHOW_ADD_TO_HOMESCREEN ?? runtimeDefault('true', 'false'),
  show_settings_button: process.env.NEXT_PUBLIC_SHOW_SETTINGS_BUTTON ?? 'true',
  show_message_input: process.env.NEXT_PUBLIC_SHOW_MESSAGE_INPUT ?? 'true',
  collapse_menu_column: process.env.NEXT_PUBLIC_COLLAPSE_MENU_COLUMN ?? 'false',
  bg_color: process.env.NEXT_PUBLIC_BG_COLOR ?? '',
  bg_url: process.env.NEXT_PUBLIC_BG_URL ?? '/bg/bg-room2.jpg',
  vrm_url: process.env.NEXT_PUBLIC_VRM_URL ?? process.env.NEXT_PUBLIC_VRM_HASH ?? '/vrm/AvatarSample_A.vrm',
  vrm_hash: '',
  vrm_save_type: 'web',
  youtube_videoid: '',
  animation_url: process.env.NEXT_PUBLIC_ANIMATION_URL ?? '/animations/idle_loop.vrma',
  animation_procedural: process.env.NEXT_PUBLIC_ANIMATION_PROCEDURAL ?? 'false',
  voice_url: process.env.NEXT_PUBLIC_VOICE_URL ?? '',
  chatbot_backend: process.env.NEXT_PUBLIC_CHATBOT_BACKEND ?? runtimeDefault('openai', 'psfn_conduit'),
  arbius_llm_model_id: process.env.NEXT_PUBLIC_ARBIUS_LLM_MODEL_ID ?? 'default',
  openai_apikey: process.env.NEXT_PUBLIC_OPENAI_APIKEY ?? 'default',
  openai_url: process.env.NEXT_PUBLIC_OPENAI_URL ?? 'https://api.openai.com',
  openai_model: process.env.NEXT_PUBLIC_OPENAI_MODEL ?? 'mlabonne/NeuralDaredevil-8B-abliterated',
  http_referer: process.env.NEXT_PUBLIC_HTTP_REFERER ?? '',
  psfn_channel_type: process.env.NEXT_PUBLIC_PSFN_CHANNEL_TYPE ?? '',
  psfn_channel_id: process.env.NEXT_PUBLIC_PSFN_CHANNEL_ID ?? '',
  psfn_hub_ws_url: process.env.NEXT_PUBLIC_PSFN_HUB_WS_URL ?? '',
  psfn_realtime_enabled: process.env.NEXT_PUBLIC_PSFN_REALTIME_ENABLED ?? runtimeDefault('false', 'true'),
  psfn_device_id: process.env.NEXT_PUBLIC_PSFN_DEVICE_ID ?? 'amica-browser',
  psfn_device_name: process.env.NEXT_PUBLIC_PSFN_DEVICE_NAME ?? 'Amica Browser',
  psfn_session_id: process.env.NEXT_PUBLIC_PSFN_SESSION_ID ?? '',
  psfn_satellite_id: process.env.NEXT_PUBLIC_PSFN_SATELLITE_ID ?? 'amica',
  psfn_satellite_name: process.env.NEXT_PUBLIC_PSFN_SATELLITE_NAME ?? 'Amica',
  psfn_capabilities_input: process.env.NEXT_PUBLIC_PSFN_CAPABILITIES_INPUT ?? 'text',
  psfn_capabilities_output: process.env.NEXT_PUBLIC_PSFN_CAPABILITIES_OUTPUT ?? 'text,subtitle,streamed_audio,animation,expression,gaze',
  psfn_capabilities_control: process.env.NEXT_PUBLIC_PSFN_CAPABILITIES_CONTROL ?? 'interrupt,presence,session_attach',
  psfn_capabilities_safety: process.env.NEXT_PUBLIC_PSFN_CAPABILITIES_SAFETY ?? 'local_only',
  psfn_vision_upload_enabled: process.env.NEXT_PUBLIC_PSFN_VISION_UPLOAD_ENABLED ?? 'false',
  psfn_satellite_bridge_enabled: process.env.NEXT_PUBLIC_PSFN_SATELLITE_BRIDGE_ENABLED ?? 'false',
  llamacpp_url: process.env.NEXT_PUBLIC_LLAMACPP_URL ?? 'http://127.0.0.1:8080',
  llamacpp_stop_sequence: process.env.NEXT_PUBLIC_LLAMACPP_STOP_SEQUENCE ?? '(End)||[END]||Note||***||You:||User:||</s>',
  ollama_url: process.env.NEXT_PUBLIC_OLLAMA_URL ?? 'http://localhost:11434',
  ollama_model: process.env.NEXT_PUBLIC_OLLAMA_MODEL ?? 'llama2',
  koboldai_url: process.env.NEXT_PUBLIC_KOBOLDAI_URL ?? 'http://localhost:5001',
  koboldai_use_extra: process.env.NEXT_PUBLIC_KOBOLDAI_USE_EXTRA ?? 'false',
  koboldai_stop_sequence: process.env.NEXT_PUBLIC_KOBOLDAI_STOP_SEQUENCE ?? '(End)||[END]||Note||***||You:||User:||</s>',
  moshi_url: process.env.NEXT_PUBLIC_MOSHI_URL ?? 'https://runpod.proxy.net',
  openrouter_apikey: process.env.NEXT_PUBLIC_OPENROUTER_APIKEY ?? '',
  openrouter_url: process.env.NEXT_PUBLIC_OPENROUTER_URL ?? 'https://openrouter.ai/api/v1',
  openrouter_model: process.env.NEXT_PUBLIC_OPENROUTER_MODEL ?? 'openai/gpt-3.5-turbo',
  tts_muted: 'false',
  tts_backend: process.env.NEXT_PUBLIC_TTS_BACKEND ?? runtimeDefault('piper', 'none'),
  stt_backend: process.env.NEXT_PUBLIC_STT_BACKEND ?? runtimeDefault('whisper_browser', 'none'),
  vision_backend: process.env.NEXT_PUBLIC_VISION_BACKEND ?? runtimeDefault('vision_openai', 'none'),
  vision_system_prompt: process.env.NEXT_PUBLIC_VISION_SYSTEM_PROMPT ?? `Look at the image as you would if you are a human, be concise, witty and charming.`,
  vision_openai_apikey: process.env.NEXT_PUBLIC_VISION_OPENAI_APIKEY ?? 'default',
  vision_openai_url: process.env.NEXT_PUBLIC_VISION_OPENAI_URL ?? 'https://api.openai.com',
  vision_openai_model: process.env.NEXT_PUBLIC_VISION_OPENAI_URL ?? 'gpt-4-vision-preview',
  vision_llamacpp_url: process.env.NEXT_PUBLIC_VISION_LLAMACPP_URL ?? 'http://127.0.0.1:8081',
  vision_ollama_url: process.env.NEXT_PUBLIC_VISION_OLLAMA_URL ?? 'http://localhost:11434',
  vision_ollama_model: process.env.NEXT_PUBLIC_VISION_OLLAMA_MODEL ?? 'llava',
  whispercpp_url: process.env.NEXT_PUBLIC_WHISPERCPP_URL ?? 'http://localhost:8080',
  openai_whisper_apikey: process.env.NEXT_PUBLIC_OPENAI_WHISPER_APIKEY ?? '',
  openai_whisper_url: process.env.NEXT_PUBLIC_OPENAI_WHISPER_URL ?? 'https://api.openai.com',
  openai_whisper_model: process.env.NEXT_PUBLIC_OPENAI_WHISPER_MODEL ?? 'whisper-1',
  openai_tts_apikey: process.env.NEXT_PUBLIC_OPENAI_TTS_APIKEY ?? '',
  openai_tts_url: process.env.NEXT_PUBLIC_OPENAI_TTS_URL ?? 'https://api.openai.com',
  openai_tts_model: process.env.NEXT_PUBLIC_OPENAI_TTS_MODEL ?? 'tts-1',
  openai_tts_voice: process.env.NEXT_PUBLIC_OPENAI_TTS_VOICE ?? 'nova',
  rvc_url: process.env.NEXT_PUBLIC_RVC_URL ?? 'http://localhost:8001/voice2voice',
  rvc_enabled: process.env.NEXT_PUBLIC_RVC_ENABLED ?? 'false',
  rvc_model_name: process.env.NEXT_PUBLIC_RVC_MODEL_NAME ?? 'model_name.pth',
  rvc_f0_upkey: process.env.NEXT_PUBLIC_RVC_F0_UPKEY ?? '0',
  rvc_f0_method: process.env.NEXT_PUBLIC_RVC_METHOD ?? 'pm',
  rvc_index_path: process.env.NEXT_PUBLIC_RVC_INDEX_PATH ?? 'none',
  rvc_index_rate: process.env.NEXT_PUBLIC_RVC_INDEX_RATE ?? '0.66',
  rvc_filter_radius: process.env.NEXT_PUBLIC_RVC_FILTER_RADIUS ?? '3',
  rvc_resample_sr: process.env.NEXT_PUBLIC_RVC_RESAMPLE_SR ?? '0',
  rvc_rms_mix_rate: process.env.NEXT_PUBLIC_RVC_RMS_MIX_RATE ?? '1',
  rvc_protect: process.env.NEXT_PUBLIC_RVC_PROTECT ?? '0.33',
  coquiLocal_url: process.env.NEXT_PUBLIC_COQUILOCAL_URL ?? 'http://localhost:5002',
  coquiLocal_voiceid: process.env.NEXT_PUBLIC_COQUILOCAL_VOICEID ?? 'p240',
  kokoro_url: process.env.NEXT_PUBLIC_KOKORO_URL ?? 'http://localhost:8080',
  kokoro_voice: process.env.NEXT_PUBLIC_KOKORO_VOICE ?? 'af_bella',
  piper_url: process.env.NEXT_PUBLIC_PIPER_URL ?? 'http://localhost:5000/tts',
  elevenlabs_apikey: process.env.NEXT_PUBLIC_ELEVENLABS_APIKEY ??'',
  elevenlabs_voiceid: process.env.NEXT_PUBLIC_ELEVENLABS_VOICEID ?? '',
  elevenlabs_model: process.env.NEXT_PUBLIC_ELEVENLABS_MODEL ?? 'eleven_monolingual_v1',
  speecht5_speaker_embedding_url: process.env.NEXT_PUBLIC_SPEECHT5_SPEAKER_EMBEDDING_URL ?? '/speecht5_speaker_embeddings/cmu_us_slt_arctic-wav-arctic_a0001.bin',
  coqui_apikey: process.env.NEXT_PUBLIC_COQUI_APIKEY ?? "",
  coqui_voice_id: process.env.NEXT_PUBLIC_COQUI_VOICEID ?? "71c6c3eb-98ca-4a05-8d6b-f8c2b5f9f3a3",
  amica_life_enabled: process.env.NEXT_PUBLIC_AMICA_LIFE_ENABLED ?? runtimeDefault('true', 'false'),
  amica_life_mode: process.env.NEXT_PUBLIC_AMICA_LIFE_MODE ?? runtimeDefault('full', 'off'),
  reasoning_engine_enabled: process.env.NEXT_PUBLIC_REASONING_ENGINE_ENABLED ?? 'false',
  reasoning_engine_url: process.env.NEXT_PUBLIC_REASONING_ENGINE_URL ?? '',
  external_api_enabled: process.env.NEXT_PUBLIC_EXTERNAL_API_ENABLED ?? 'false',
  x_api_key: process.env.NEXT_PUBLIC_X_API_KEY ?? '',
  x_api_secret: process.env.NEXT_PUBLIC_X_API_SECRET ?? '',
  x_access_token: process.env.NEXT_PUBLIC_X_ACCESS_TOKEN ?? '',
  x_access_secret: process.env.NEXT_PUBLIC_X_ACCESS_SECRET ?? '',
  x_bearer_token: process.env.NEXT_PUBLIC_X_BEARER_TOKEN ?? '',
  telegram_bot_token: process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN ?? '',
  min_time_interval_sec: '10',
  max_time_interval_sec: '20',
  time_to_sleep_sec: '90',
  idle_text_prompt: 'No file selected',
  name: defaultName,
  system_prompt: process.env.NEXT_PUBLIC_SYSTEM_PROMPT ?? `You are ${defaultName}, a helpful AI assistant.

Respond clearly and accurately.
Adapt your tone to the conversation, but keep the identity generic unless a deployment provides a specific persona.
If the user asks for a style, follow it without inventing personal history or hidden preferences.`,
};

const deploymentOwnedOverrides = buildDeploymentOwnedOverrides();

export function prefixed(key: string) {
  return `chatvrm_${key}`;
}

// Ensure syncLocalStorage runs only on the server side and once
if (typeof window !== "undefined") {
  applyDeploymentOwnedOverrides();
  (async () => {
    await handleConfig("init");
  })();
} else {
  (async () => {
    await handleConfig("fetch");
  })();
}

export function config(key: string): string {
  if (Object.prototype.hasOwnProperty.call(deploymentOwnedOverrides, key)) {
    return (<any>deploymentOwnedOverrides)[key];
  }

  if (typeof localStorage !== "undefined" && localStorage.hasOwnProperty(prefixed(key))) {
    return (<any>localStorage).getItem(prefixed(key))!;
  }

  // Fallback to serverConfig if localStorage is unavailable or missing
  if (serverConfig && serverConfig.hasOwnProperty(key)) {
    return serverConfig[key];
  }

  if (defaults.hasOwnProperty(key)) {
    return (<any>defaults)[key];
  }

  throw new Error(`config key not found: ${key}`);
}

export function isPsfnConduitMode(): boolean {
  return config("amica_runtime_mode") === AMICA_RUNTIME_MODE_PSFN_CONDUIT;
}

export async function updateConfig(key: string, value: string) {
  try {
    const localKey = prefixed(key);

    // Update localStorage if available
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(localKey, value);
    }

    // Sync update to server config
    await handleConfig("update",{ key, value });

  } catch (e) {
    console.error(`Error updating config for key "${key}": ${e}`);
  }
}

export function defaultConfig(key: string): string {
  if (defaults.hasOwnProperty(key)) {
    return (<any>defaults)[key];
  }

  throw new Error(`config key not found: ${key}`);
}

export async function resetConfig() {
  for (const [key, value] of Object.entries(defaults)) {
    await updateConfig(key, value);
  }
}

function buildDeploymentOwnedOverrides(): Record<string, string> {
  const overrides: Record<string, string> = {};

  if (psfnConduitRuntime) {
    for (const key of [
      "amica_runtime_mode",
      "autosend_from_mic",
      "wake_word_enabled",
      "show_introduction",
      "show_add_to_homescreen",
      "chatbot_backend",
      "tts_backend",
      "stt_backend",
      "vision_backend",
      "amica_life_enabled",
      "amica_life_mode",
      "reasoning_engine_enabled",
      "external_api_enabled",
      "psfn_realtime_enabled",
      "psfn_capabilities_input",
      "psfn_capabilities_output",
      "psfn_capabilities_control",
      "psfn_capabilities_safety",
      "psfn_vision_upload_enabled",
    ]) {
      overrides[key] = (<any>defaults)[key];
    }
  }

  if (
    process.env.NEXT_PUBLIC_AMICA_RUNTIME_MODE !== undefined ||
    process.env.NEXT_PUBLIC_PSFN_CONDUIT_MODE !== undefined
  ) {
    overrides.amica_runtime_mode = defaults.amica_runtime_mode;
  }
  if (process.env.NEXT_PUBLIC_VRM_URL || process.env.NEXT_PUBLIC_VRM_HASH) {
    overrides.vrm_url = defaults.vrm_url;
    overrides.vrm_hash = "";
    overrides.vrm_save_type = "web";
  }
  if (process.env.NEXT_PUBLIC_NAME) {
    overrides.name = defaults.name;
  }
  if (process.env.NEXT_PUBLIC_SYSTEM_PROMPT !== undefined) {
    overrides.system_prompt = defaults.system_prompt;
  }
  if (process.env.NEXT_PUBLIC_ALLTALK_VOICE !== undefined) {
    overrides.alltalk_voice = defaults.alltalk_voice;
  }
  if (process.env.NEXT_PUBLIC_HTTP_REFERER !== undefined) {
    overrides.http_referer = defaults.http_referer;
  }
  if (process.env.NEXT_PUBLIC_PSFN_CHANNEL_TYPE !== undefined) {
    overrides.psfn_channel_type = defaults.psfn_channel_type;
  }
  if (process.env.NEXT_PUBLIC_PSFN_CHANNEL_ID !== undefined) {
    overrides.psfn_channel_id = defaults.psfn_channel_id;
  }
  if (process.env.NEXT_PUBLIC_PSFN_HUB_WS_URL !== undefined) {
    overrides.psfn_hub_ws_url = defaults.psfn_hub_ws_url;
  }
  if (process.env.NEXT_PUBLIC_PSFN_REALTIME_ENABLED !== undefined) {
    overrides.psfn_realtime_enabled = defaults.psfn_realtime_enabled;
  }
  if (process.env.NEXT_PUBLIC_PSFN_DEVICE_ID !== undefined) {
    overrides.psfn_device_id = defaults.psfn_device_id;
  }
  if (process.env.NEXT_PUBLIC_PSFN_DEVICE_NAME !== undefined) {
    overrides.psfn_device_name = defaults.psfn_device_name;
  }
  if (process.env.NEXT_PUBLIC_PSFN_SESSION_ID !== undefined) {
    overrides.psfn_session_id = defaults.psfn_session_id;
  }
  if (process.env.NEXT_PUBLIC_PSFN_SATELLITE_ID !== undefined) {
    overrides.psfn_satellite_id = defaults.psfn_satellite_id;
  }
  if (process.env.NEXT_PUBLIC_PSFN_SATELLITE_NAME !== undefined) {
    overrides.psfn_satellite_name = defaults.psfn_satellite_name;
  }
  if (process.env.NEXT_PUBLIC_PSFN_CAPABILITIES_INPUT !== undefined) {
    overrides.psfn_capabilities_input = defaults.psfn_capabilities_input;
  }
  if (process.env.NEXT_PUBLIC_PSFN_CAPABILITIES_OUTPUT !== undefined) {
    overrides.psfn_capabilities_output = defaults.psfn_capabilities_output;
  }
  if (process.env.NEXT_PUBLIC_PSFN_CAPABILITIES_CONTROL !== undefined) {
    overrides.psfn_capabilities_control = defaults.psfn_capabilities_control;
  }
  if (process.env.NEXT_PUBLIC_PSFN_CAPABILITIES_SAFETY !== undefined) {
    overrides.psfn_capabilities_safety = defaults.psfn_capabilities_safety;
  }
  if (process.env.NEXT_PUBLIC_PSFN_VISION_UPLOAD_ENABLED !== undefined) {
    overrides.psfn_vision_upload_enabled = defaults.psfn_vision_upload_enabled;
  }
  if (process.env.NEXT_PUBLIC_PSFN_SATELLITE_BRIDGE_ENABLED !== undefined) {
    overrides.psfn_satellite_bridge_enabled = defaults.psfn_satellite_bridge_enabled;
  }
  if (process.env.NEXT_PUBLIC_FACE_TRACKING_ENABLED !== undefined) {
    overrides.face_tracking_enabled = defaults.face_tracking_enabled;
  }
  if (process.env.NEXT_PUBLIC_FACE_TRACKING_PARALLAX_STRENGTH !== undefined) {
    overrides.face_tracking_parallax_strength = defaults.face_tracking_parallax_strength;
  }
  if (process.env.NEXT_PUBLIC_FACE_TRACKING_EYE_STRENGTH !== undefined) {
    overrides.face_tracking_eye_strength = defaults.face_tracking_eye_strength;
  }
  if (process.env.NEXT_PUBLIC_CHATBOT_BACKEND !== undefined) {
    overrides.chatbot_backend = defaults.chatbot_backend;
  }
  if (process.env.NEXT_PUBLIC_TTS_BACKEND !== undefined) {
    overrides.tts_backend = defaults.tts_backend;
  }
  if (process.env.NEXT_PUBLIC_STT_BACKEND !== undefined) {
    overrides.stt_backend = defaults.stt_backend;
  }
  if (process.env.NEXT_PUBLIC_ELEVENLABS_VOICEID !== undefined) {
    overrides.elevenlabs_voiceid = defaults.elevenlabs_voiceid;
  }
  if (process.env.NEXT_PUBLIC_OPENAI_URL !== undefined) {
    overrides.openai_url = defaults.openai_url;
  }
  if (process.env.NEXT_PUBLIC_OPENAI_WHISPER_URL !== undefined) {
    overrides.openai_whisper_url = defaults.openai_whisper_url;
  }
  if (process.env.NEXT_PUBLIC_OPENAI_WHISPER_APIKEY !== undefined) {
    overrides.openai_whisper_apikey = defaults.openai_whisper_apikey;
  }
  if (process.env.NEXT_PUBLIC_OPENAI_WHISPER_MODEL !== undefined) {
    overrides.openai_whisper_model = defaults.openai_whisper_model;
  }
  if (process.env.NEXT_PUBLIC_OPENAI_TTS_URL !== undefined) {
    overrides.openai_tts_url = defaults.openai_tts_url;
  }
  if (process.env.NEXT_PUBLIC_OPENAI_TTS_APIKEY !== undefined) {
    overrides.openai_tts_apikey = defaults.openai_tts_apikey;
  }
  if (process.env.NEXT_PUBLIC_OPENAI_TTS_MODEL !== undefined) {
    overrides.openai_tts_model = defaults.openai_tts_model;
  }
  if (process.env.NEXT_PUBLIC_OPENAI_TTS_VOICE !== undefined) {
    overrides.openai_tts_voice = defaults.openai_tts_voice;
  }
  if (process.env.NEXT_PUBLIC_VISION_OPENAI_URL !== undefined) {
    overrides.vision_openai_url = defaults.vision_openai_url;
  }
  if (process.env.NEXT_PUBLIC_PIPER_URL !== undefined) {
    overrides.piper_url = defaults.piper_url;
  }
  if (process.env.NEXT_PUBLIC_REASONING_ENGINE_URL !== undefined) {
    overrides.reasoning_engine_url = defaults.reasoning_engine_url;
  }
  if (process.env.NEXT_PUBLIC_SHOW_SETTINGS_BUTTON !== undefined) {
    overrides.show_settings_button = defaults.show_settings_button;
  }
  if (process.env.NEXT_PUBLIC_SHOW_MESSAGE_INPUT !== undefined) {
    overrides.show_message_input = defaults.show_message_input;
  }
  if (process.env.NEXT_PUBLIC_COLLAPSE_MENU_COLUMN !== undefined) {
    overrides.collapse_menu_column = defaults.collapse_menu_column;
  }

  return overrides;
}

function applyDeploymentOwnedOverrides(): void {
  if (typeof localStorage === "undefined") {
    return;
  }

  for (const [key, value] of Object.entries(deploymentOwnedOverrides)) {
    localStorage.setItem(prefixed(key), value);
  }
}
