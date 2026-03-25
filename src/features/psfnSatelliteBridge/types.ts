export interface SatelliteBridgeSessionEventData {
  sessionId: string;
}

export interface SatelliteUserFinalEvent {
  type: "user.final";
  data: SatelliteBridgeSessionEventData & {
    text: string;
  };
}

export interface SatelliteAssistantFinalEvent {
  type: "assistant.final";
  data: SatelliteBridgeSessionEventData & {
    text: string;
    audioBase64: string;
    mimeType: string;
    durationMs?: number;
  };
}

export interface SatelliteInterruptEvent {
  type: "interrupt";
  data: SatelliteBridgeSessionEventData;
}

export type SatelliteBridgeEvent =
  | SatelliteUserFinalEvent
  | SatelliteAssistantFinalEvent
  | SatelliteInterruptEvent;
