import type { NextApiRequest, NextApiResponse } from "next";

import {
  addSatelliteBridgeClient,
  removeSatelliteBridgeClient,
  sendSatelliteBridgeEvent,
} from "@/features/psfnSatelliteBridge/server";
import type { SatelliteBridgeEvent } from "@/features/psfnSatelliteBridge/types";

const MAX_AUDIO_BASE64_LENGTH = 2_000_000;

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "4mb",
    },
  },
};

export default function handler(req: NextApiRequest, res: NextApiResponse): void {
  if (process.env.NEXT_PUBLIC_PSFN_SATELLITE_BRIDGE_ENABLED !== "true") {
    res.status(503).json({ error: "Satellite bridge is disabled." });
    return;
  }

  if (req.method === "GET") {
    handleSseConnection(req, res);
    return;
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", ["GET", "POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
    return;
  }

  const expectedToken = process.env.PSFN_BRIDGE_TOKEN?.trim();
  if (!expectedToken) {
    res.status(503).json({ error: "PSFN_BRIDGE_TOKEN is required." });
    return;
  }
  const providedToken = String(req.headers["x-psfn-bridge-token"] || "").trim();
  if (!providedToken || providedToken !== expectedToken) {
    res.status(401).json({ error: "Invalid bridge token." });
    return;
  }

  const event = req.body as SatelliteBridgeEvent;
  const validationError = validateSatelliteBridgeEvent(event);
  if (validationError) {
    res.status(400).json({ error: validationError });
    return;
  }

  sendSatelliteBridgeEvent(event);
  res.status(200).json({ ok: true });
}

function handleSseConnection(req: NextApiRequest, res: NextApiResponse): void {
  res.status(200);
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("X-Accel-Buffering", "no");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();
  res.write(": connected\n\n");

  const client = addSatelliteBridgeClient(res);
  req.on("close", () => {
    removeSatelliteBridgeClient(client);
    res.end();
  });
}

function validateSatelliteBridgeEvent(event: SatelliteBridgeEvent | null | undefined): string | null {
  if (!event || typeof event !== "object") {
    return "Bridge event payload is required.";
  }
  const eventType = typeof event.type === "string" ? event.type : "";
  if (!eventType) {
    return "Bridge event type is required.";
  }
  if (!("data" in event) || !event.data || typeof event.data !== "object") {
    return "Bridge event data is required.";
  }
  const sessionId = String((event.data as { sessionId?: unknown }).sessionId || "").trim();
  if (!sessionId) {
    return "Bridge event sessionId is required.";
  }

  if (eventType === "user.final") {
    const text = String((event.data as { text?: unknown }).text || "").trim();
    return text ? null : "User bridge text is required.";
  }

  if (eventType === "assistant.segment" || eventType === "assistant.final") {
    const text = String((event.data as { text?: unknown }).text || "").trim();
    const audioBase64 = String((event.data as { audioBase64?: unknown }).audioBase64 || "").trim();
    const mimeType = String((event.data as { mimeType?: unknown }).mimeType || "").trim();
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

  return `Unsupported bridge event type: ${eventType}`;
}
