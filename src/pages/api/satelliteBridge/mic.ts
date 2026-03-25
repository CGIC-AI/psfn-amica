import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(req: NextApiRequest, res: NextApiResponse): void {
  if (process.env.NEXT_PUBLIC_PSFN_SATELLITE_BRIDGE_ENABLED !== "true") {
    res.status(503).json({ error: "Satellite bridge is disabled." });
    return;
  }

  void handleRequest(req, res);
}

async function handleRequest(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  try {
    const controlUrl = requiredControlUrl();

    if (req.method === "GET") {
      await proxyMicState(req, res, controlUrl, undefined);
      return;
    }

    if (req.method === "POST") {
      if (typeof req.body?.muted !== "boolean") {
        res.status(400).json({ error: "Boolean muted value is required." });
        return;
      }
      await proxyMicState(req, res, controlUrl, req.body.muted);
      return;
    }

    res.setHeader("Allow", ["GET", "POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(503).json({ error: message });
  }
}

async function proxyMicState(
  req: NextApiRequest,
  res: NextApiResponse,
  controlUrl: string,
  muted: boolean | undefined,
): Promise<void> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(controlUrl, {
      method: req.method,
      headers: {
        "Content-Type": "application/json",
      },
      body: muted === undefined ? undefined : JSON.stringify({ muted }),
      signal: controller.signal,
    });
    const raw = (await response.text()).trim();
    const payload = raw ? (JSON.parse(raw) as unknown) : null;
    if (!payload || typeof payload !== "object") {
      throw new Error(`Mic control response was invalid (${response.status}).`);
    }
    res.status(response.status).json(payload);
  } finally {
    clearTimeout(timeout);
  }
}

function requiredControlUrl(): string {
  const value = process.env.PSFN_SATELLITE_MIC_CONTROL_URL?.trim();
  if (!value) {
    throw new Error("PSFN_SATELLITE_MIC_CONTROL_URL is required.");
  }
  return new URL(value).toString();
}
