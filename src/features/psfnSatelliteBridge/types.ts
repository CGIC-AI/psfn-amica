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

export interface SatelliteAssistantSegmentEvent {
  type: "assistant.segment";
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

export interface SatelliteFaceTargetEvent {
  type: "face.target";
  data: SatelliteBridgeSessionEventData & {
    x: number;
    y: number;
    confidence: number;
  };
}

export interface SatelliteFaceClearEvent {
  type: "face.clear";
  data: SatelliteBridgeSessionEventData;
}

export type SatelliteBridgeEvent =
  | SatelliteUserFinalEvent
  | SatelliteAssistantSegmentEvent
  | SatelliteAssistantFinalEvent
  | SatelliteInterruptEvent
  | SatelliteFaceTargetEvent
  | SatelliteFaceClearEvent;
