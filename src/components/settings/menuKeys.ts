export const mainSettingsMenuKeys = [
  "appearance",
  "amica_life",
  "chatbot",
  "language",
  "tts",
  "stt",
  "vision",
  "developer",
  "external_api",
  "reset_settings",
  "community",
] as const;

export const appearanceSettingsMenuKeys = [
  "background_img",
  "background_color",
  "background_video",
  "character_model",
  "character_animation",
] as const;

export const chatbotSettingsMenuKeys = [
  "chatbot_backend",
  "name",
  "system_prompt",
  "arbius_llm_settings",
  "chatgpt_settings",
  "psfn_settings",
  "llamacpp_settings",
  "ollama_settings",
  "koboldai_settings",
  "moshi_settings",
  "openrouter_settings",
] as const;

export const ttsSettingsMenuKeys = [
  "tts_backend",
  "elevenlabs_settings",
  "speecht5_settings",
  "coquiLocal_settings",
  "openai_tts_settings",
  "piper_settings",
  "localXTTS_settings",
  "kokoro_settings",
  "rvc_settings",
] as const;

export const sttSettingsMenuKeys = [
  "stt_backend",
  "stt_wake_word",
  "whisper_openai_settings",
  "whispercpp_settings",
] as const;

export const visionSettingsMenuKeys = [
  "vision_backend",
  "vision_llamacpp_settings",
  "vision_ollama_settings",
  "vision_openai_settings",
  "vision_system_prompt",
] as const;

type SettingsMenuKeyMap = Record<string, readonly string[]>;

const settingsMenuKeysByPage = {
  main_menu: mainSettingsMenuKeys,
  appearance: appearanceSettingsMenuKeys,
  chatbot: chatbotSettingsMenuKeys,
  tts: ttsSettingsMenuKeys,
  stt: sttSettingsMenuKeys,
  vision: visionSettingsMenuKeys,
} as const satisfies SettingsMenuKeyMap;

const conduitSettingsMenuKeysByPage = {
  main_menu: [
    "appearance",
    "language",
    "vision",
    "developer",
    "reset_settings",
  ],
  chatbot: [
    "name",
    "system_prompt",
  ],
  tts: [],
  stt: [],
  vision: [
    "vision_system_prompt",
  ],
} as const satisfies SettingsMenuKeyMap;

export function getSettingsMenuKeys(page: string, isPsfnConduitMode: boolean): string[] {
  if (isPsfnConduitMode && page in conduitSettingsMenuKeysByPage) {
    return [...(conduitSettingsMenuKeysByPage[page as keyof typeof conduitSettingsMenuKeysByPage] ?? [])];
  }

  if (page in settingsMenuKeysByPage) {
    return [...settingsMenuKeysByPage[page as keyof typeof settingsMenuKeysByPage]];
  }

  return [];
}
