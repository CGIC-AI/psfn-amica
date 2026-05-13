import type { NextApiResponse } from "next";

import type { SatelliteBridgeEvent } from "./types";

export const MAX_AUDIO_BASE64_LENGTH = 2_000_000;

export const satelliteBridgeClients: Array<{ res: NextApiResponse }> = [];

export function addSatelliteBridgeClient(res: NextApiResponse): { res: NextApiResponse } {
  const client = { res };
  satelliteBridgeClients.push(client);
  return client;
}

export function removeSatelliteBridgeClient(client: { res: NextApiResponse }): void {
  const index = satelliteBridgeClients.indexOf(client);
  if (index >= 0) {
    satelliteBridgeClients.splice(index, 1);
  }
}

export function sendSatelliteBridgeEvent(event: SatelliteBridgeEvent): void {
  const payload = JSON.stringify(event);
  for (const client of satelliteBridgeClients) {
    client.res.write(`data: ${payload}\n\n`);
  }
}

export function validateSatelliteBridgeEvent(event: unknown): string | null {
  if (!event || typeof event !== "object") {
    return "Bridge event payload is required.";
  }

  const eventRecord = event as { type?: unknown; data?: unknown };
  const eventType = typeof eventRecord.type === "string" ? eventRecord.type : "";
  if (!eventType) {
    return "Bridge event type is required.";
  }

  if (!isRecord(eventRecord.data)) {
    return "Bridge event data is required.";
  }

  const data = eventRecord.data;
  const sessionId = readTrimmedString(data.sessionId);
  if (!sessionId) {
    return "Bridge event sessionId is required.";
  }

  if (eventType === "user.final") {
    const text = readTrimmedString(data.text);
    return text ? null : "User bridge text is required.";
  }

  if (eventType === "assistant.segment" || eventType === "assistant.final") {
    const text = readTrimmedString(data.text);
    const audioBase64 = readTrimmedString(data.audioBase64);
    const mimeType = readTrimmedString(data.mimeType);
    if (!text) return "Assistant bridge text is required.";
    if (!audioBase64) return "Assistant bridge audio is required.";
    if (audioBase64.length > MAX_AUDIO_BASE64_LENGTH) {
      return "Assistant bridge audio payload is too large.";
    }
    if (!mimeType) return "Assistant bridge mimeType is required.";
    return null;
  }

  if (eventType === "interrupt") {
    return null;
  }

  if (eventType === "face.clear") {
    return null;
  }

  if (eventType === "face.target") {
    const x = Number(data.x);
    const y = Number(data.y);
    const confidence = Number(data.confidence);
    if (!Number.isFinite(x) || x < -1 || x > 1) {
      return "Face target x must be a finite number between -1 and 1.";
    }
    if (!Number.isFinite(y) || y < -1 || y > 1) {
      return "Face target y must be a finite number between -1 and 1.";
    }
    if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
      return "Face target confidence must be a finite number between 0 and 1.";
    }
    return null;
  }

  return `Unsupported bridge event type: ${eventType}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readTrimmedString(value: unknown): string {
  return String(value || "").trim();
}
