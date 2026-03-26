import { handleConfig, serverConfig } from "@/features/externalAPI/externalAPI";

const defaultName = process.env.NEXT_PUBLIC_NAME ?? "Assistant";

export const defaults = {
  // AllTalk TTS specific settings
  localXTTS_url: process.env.NEXT_PUBLIC_LOCALXTTS_URL ?? 'http://127.0.0.1:7851',
  alltalk_version: process.env.NEXT_PUBLIC_ALLTALK_VERSION ?? 'v2',
  alltalk_voice: process.env.NEXT_PUBLIC_ALLTALK_VOICE ?? '',
  alltalk_language: process.env.NEXT_PUBLIC_ALLTALK_LANGUAGE ?? 'en',
  alltalk_rvc_voice: process.env.NEXT_PUBLIC_ALLTALK_RVC_VOICE ?? 'Disabled',
  alltalk_rvc_pitch: process.env.NEXT_PUBLIC_ALLTALK_RVC_PITCH ?? '0',
  autosend_from_mic: 'true',
  wake_word_enabled: 'false',
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
  show_introduction: process.env.NEXT_PUBLIC_SHOW_INTRODUCTION ?? 'true',
  show_arbius_introduction: process.env.NEXT_PUBLIC_SHOW_ARBIUS_INTRODUCTION ?? 'false',
  show_add_to_homescreen: process.env.NEXT_PUBLIC_SHOW_ADD_TO_HOMESCREEN ?? 'true',
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
  chatbot_backend: process.env.NEXT_PUBLIC_CHATBOT_BACKEND ?? 'openai',
  arbius_llm_model_id: process.env.NEXT_PUBLIC_ARBIUS_LLM_MODEL_ID ?? 'default',
  openai_apikey: process.env.NEXT_PUBLIC_OPENAI_APIKEY ?? 'default',
  openai_url: process.env.NEXT_PUBLIC_OPENAI_URL ?? 'https://api.openai.com',
  openai_model: process.env.NEXT_PUBLIC_OPENAI_MODEL ?? 'mlabonne/NeuralDaredevil-8B-abliterated',
  http_referer: process.env.NEXT_PUBLIC_HTTP_REFERER ?? '',
  psfn_channel_type: process.env.NEXT_PUBLIC_PSFN_CHANNEL_TYPE ?? '',
  psfn_channel_id: process.env.NEXT_PUBLIC_PSFN_CHANNEL_ID ?? '',
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
  tts_backend: process.env.NEXT_PUBLIC_TTS_BACKEND ?? 'piper',
  stt_backend: process.env.NEXT_PUBLIC_STT_BACKEND ?? 'whisper_browser',
  vision_backend: process.env.NEXT_PUBLIC_VISION_BACKEND ?? 'vision_openai',
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
  amica_life_enabled: process.env.NEXT_PUBLIC_AMICA_LIFE_ENABLED ?? 'true',
  amica_life_mode: process.env.NEXT_PUBLIC_AMICA_LIFE_MODE ?? 'full',
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
  if (process.env.NEXT_PUBLIC_ELEVENLABS_VOICEID !== undefined) {
    overrides.elevenlabs_voiceid = defaults.elevenlabs_voiceid;
  }
  if (process.env.NEXT_PUBLIC_OPENAI_URL !== undefined) {
    overrides.openai_url = defaults.openai_url;
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
