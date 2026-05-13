import type { NextApiRequest, NextApiResponse } from "next";

import {
  addSatelliteBridgeClient,
  removeSatelliteBridgeClient,
  sendSatelliteBridgeEvent,
  validateSatelliteBridgeEvent,
} from "@/features/psfnSatelliteBridge/server";
import type { SatelliteBridgeEvent } from "@/features/psfnSatelliteBridge/types";

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

  const expectedToken = process.env.AMICA_BRIDGE_TOKEN?.trim();
  if (!expectedToken) {
    res.status(503).json({ error: "AMICA_BRIDGE_TOKEN is required." });
    return;
  }
  const providedToken = String(req.headers["x-amica-bridge-token"] || "").trim();
  if (!providedToken || providedToken !== expectedToken) {
    res.status(401).json({ error: "Invalid bridge token." });
    return;
  }

  const event = req.body as unknown;
  const validationError = validateSatelliteBridgeEvent(event);
  if (validationError) {
    res.status(400).json({ error: validationError });
    return;
  }

  sendSatelliteBridgeEvent(event as SatelliteBridgeEvent);
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
