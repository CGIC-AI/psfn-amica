export type SatelliteInputCapability =
  | "text"
  | "microphone_pcm"
  | "final_transcript"
  | "vision_upload"
  | "wake_event";

export type SatelliteOutputCapability =
  | "text"
  | "subtitle"
  | "streamed_audio"
  | "local_file_audio"
  | "animation"
  | "action"
  | "expression"
  | "gaze"
  | "servo";

export type SatelliteControlCapability =
  | "interrupt"
  | "mute"
  | "sleep_wake"
  | "presence"
  | "session_attach";

export type SatelliteSafetyCapability =
  | "action_allowlist"
  | "confirmation_required"
  | "local_only";

export interface SatelliteCapabilities {
  input?: SatelliteInputCapability[];
  output?: SatelliteOutputCapability[];
  control?: SatelliteControlCapability[];
  safety?: SatelliteSafetyCapability[];
}

export interface PsfnRealtimeConfig {
  url: string;
  deviceId: string;
  deviceName: string;
  sessionId?: string;
  channelId?: string;
  satelliteId?: string;
  satelliteName?: string;
  capabilities: SatelliteCapabilities;
}

export interface HelloMessage {
  type: "hello";
  deviceId: string;
  deviceName: string;
  sessionId?: string;
  channelId?: string;
  satelliteId?: string;
  satelliteName?: string;
  capabilities?: SatelliteCapabilities;
}

export interface SessionReadyMessage {
  type: "session.ready";
  sessionId: string;
  channelId: string;
  deviceId: string;
  deviceName: string;
  satelliteId: string;
  audioFormat: string;
}

export interface HelloAckMessage {
  type: "hello.ack";
  sessionId: string;
  channelId: string;
  deviceId: string;
  deviceName: string;
  satelliteId: string;
  satelliteName: string;
  capabilities: SatelliteCapabilities;
}

export interface HubMessageEvent {
  type: "message";
  data: {
    role: "user" | "assistant";
    content: string;
    live?: boolean;
    final?: boolean;
  };
}

export interface TextSignalMessage {
  type: "text";
  data: string;
}

export interface AudioOutMessage {
  type: "audio";
  data: string;
}

export interface ActionMessage {
  type: "action";
  data: "interrupt" | "pause-audio" | "play-audio";
}

export interface ErrorEventMessage {
  type: "error-event";
  data: {
    message: string;
  };
}

export interface AssistantInterruptedCompatMessage {
  type: "assistant.interrupted";
  sessionId: string;
}

export interface PongMessage {
  type: "pong";
  sentAt: number;
}

export type HubToClientMessage =
  | SessionReadyMessage
  | HelloAckMessage
  | HubMessageEvent
  | TextSignalMessage
  | AudioOutMessage
  | ActionMessage
  | ErrorEventMessage
  | AssistantInterruptedCompatMessage
  | PongMessage
  | { type: "status"; data: string };

export type ConfigReader = (key: string) => string;

export function parseCapabilityList<T extends string>(value: string): T[] {
  const seen = new Set<string>();
  const capabilities: T[] = [];

  for (const rawCapability of value.split(",")) {
    const capability = rawCapability.trim();
    if (!capability || seen.has(capability)) {
      continue;
    }
    seen.add(capability);
    capabilities.push(capability as T);
  }

  return capabilities;
}

export function buildPsfnRealtimeConfig(readConfig: ConfigReader): PsfnRealtimeConfig {
  const input = parseCapabilityList<SatelliteInputCapability>(
    readConfig("psfn_capabilities_input"),
  ).filter((capability) => {
    return capability !== "vision_upload" || readConfig("psfn_vision_upload_enabled") === "true";
  });
  const output = parseCapabilityList<SatelliteOutputCapability>(
    readConfig("psfn_capabilities_output"),
  );
  const control = parseCapabilityList<SatelliteControlCapability>(
    readConfig("psfn_capabilities_control"),
  );
  const safety = parseCapabilityList<SatelliteSafetyCapability>(
    readConfig("psfn_capabilities_safety"),
  );

  return {
    url: readConfig("psfn_hub_ws_url").trim(),
    deviceId: readConfig("psfn_device_id").trim() || "amica-browser",
    deviceName: readConfig("psfn_device_name").trim() || "Amica Browser",
    sessionId: optionalConfig(readConfig("psfn_session_id")),
    channelId: optionalConfig(readConfig("psfn_channel_id")),
    satelliteId: optionalConfig(readConfig("psfn_satellite_id")),
    satelliteName: optionalConfig(readConfig("psfn_satellite_name")),
    capabilities: {
      input,
      output,
      control,
      safety,
    },
  };
}

export function buildHelloMessage(config: PsfnRealtimeConfig): HelloMessage {
  const capabilities = pruneEmptyCapabilityGroups(config.capabilities);
  const message: HelloMessage = {
    type: "hello",
    deviceId: config.deviceId,
    deviceName: config.deviceName,
  };

  if (config.sessionId) {
    message.sessionId = config.sessionId;
  }
  if (config.channelId) {
    message.channelId = config.channelId;
  }
  if (config.satelliteId) {
    message.satelliteId = config.satelliteId;
  }
  if (config.satelliteName) {
    message.satelliteName = config.satelliteName;
  }
  if (Object.keys(capabilities).length > 0) {
    message.capabilities = capabilities;
  }

  return message;
}

function optionalConfig(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function pruneEmptyCapabilityGroups(capabilities: SatelliteCapabilities): SatelliteCapabilities {
  const pruned: SatelliteCapabilities = {};
  if (capabilities.input?.length) {
    pruned.input = capabilities.input;
  }
  if (capabilities.output?.length) {
    pruned.output = capabilities.output;
  }
  if (capabilities.control?.length) {
    pruned.control = capabilities.control;
  }
  if (capabilities.safety?.length) {
    pruned.safety = capabilities.safety;
  }
  return pruned;
}
