import { EventEmitter } from "events";
import type { NextApiRequest, NextApiResponse } from "next";
import { beforeEach, describe, expect, jest, test } from "@jest/globals";

import handler from "../src/pages/api/satelliteBridge";
import {
  MAX_AUDIO_BASE64_LENGTH,
  satelliteBridgeClients,
  validateSatelliteBridgeEvent,
} from "../src/features/psfnSatelliteBridge/server";

type MockNextResponse = NextApiResponse & {
  headers: Record<string, unknown>;
  statusCode?: number;
  jsonBody?: unknown;
  endedWith?: unknown;
  write: jest.Mock;
};

describe("satellite bridge validation", () => {
  test("accepts supported compatibility bridge event types", () => {
    expect(validateSatelliteBridgeEvent({ type: "user.final", data: { sessionId: "s1", text: "hello" } })).toBeNull();
    expect(validateSatelliteBridgeEvent({ type: "assistant.segment", data: assistantData() })).toBeNull();
    expect(validateSatelliteBridgeEvent({ type: "assistant.final", data: assistantData() })).toBeNull();
    expect(validateSatelliteBridgeEvent({ type: "interrupt", data: { sessionId: "s1" } })).toBeNull();
    expect(validateSatelliteBridgeEvent({ type: "face.clear", data: { sessionId: "s1" } })).toBeNull();
    expect(
      validateSatelliteBridgeEvent({
        type: "face.target",
        data: { sessionId: "s1", x: 0.25, y: -0.25, confidence: 0.9 },
      }),
    ).toBeNull();
  });

  test("returns clear validation errors for malformed payloads", () => {
    expect(validateSatelliteBridgeEvent(null)).toBe("Bridge event payload is required.");
    expect(validateSatelliteBridgeEvent({ data: { sessionId: "s1" } })).toBe("Bridge event type is required.");
    expect(validateSatelliteBridgeEvent({ type: 123, data: { sessionId: "s1" } })).toBe("Bridge event type is required.");
    expect(validateSatelliteBridgeEvent({ type: "user.final" })).toBe("Bridge event data is required.");
    expect(validateSatelliteBridgeEvent({ type: "user.final", data: { text: "hello" } })).toBe(
      "Bridge event sessionId is required.",
    );
    expect(validateSatelliteBridgeEvent({ type: "assistant.final", data: assistantData({ audioBase64: "" }) })).toBe(
      "Assistant bridge audio is required.",
    );
    expect(validateSatelliteBridgeEvent({ type: "face.target", data: { sessionId: "s1", x: 2, y: 0, confidence: 1 } })).toBe(
      "Face target x must be a finite number between -1 and 1.",
    );
    expect(validateSatelliteBridgeEvent({ type: "unknown", data: { sessionId: "s1" } })).toBe(
      "Unsupported bridge event type: unknown",
    );
  });

  test("rejects assistant audio above the compatibility bridge limit", () => {
    expect(
      validateSatelliteBridgeEvent({
        type: "assistant.final",
        data: assistantData({ audioBase64: "a".repeat(MAX_AUDIO_BASE64_LENGTH + 1) }),
      }),
    ).toBe("Assistant bridge audio payload is too large.");
  });
});

describe("satellite bridge API", () => {
  beforeEach(() => {
    satelliteBridgeClients.splice(0, satelliteBridgeClients.length);
    process.env.NEXT_PUBLIC_PSFN_SATELLITE_BRIDGE_ENABLED = "true";
    process.env.AMICA_BRIDGE_TOKEN = "secret";
  });

  test("requires the bridge feature flag", () => {
    process.env.NEXT_PUBLIC_PSFN_SATELLITE_BRIDGE_ENABLED = "false";

    const res = createResponse();
    handler(createRequest({ method: "POST", headers: { "x-amica-bridge-token": "secret" }, body: userFinalEvent() }), res);

    expect(res.statusCode).toBe(503);
    expect(res.jsonBody).toEqual({ error: "Satellite bridge is disabled." });
    expect(satelliteBridgeClients).toHaveLength(0);
  });

  test("rejects unauthorized POSTs before validation", () => {
    const client = { res: createResponse() };
    satelliteBridgeClients.push(client);

    const res = createResponse();
    handler(createRequest({ method: "POST", headers: { "x-amica-bridge-token": "wrong" }, body: {} }), res);

    expect(res.statusCode).toBe(401);
    expect(res.jsonBody).toEqual({ error: "Invalid bridge token." });
    expect(client.res.write).not.toHaveBeenCalled();
  });

  test("publishes valid authorized POSTs", () => {
    const event = userFinalEvent();
    const client = { res: createResponse() };
    satelliteBridgeClients.push(client);

    const res = createResponse();
    handler(createRequest({ method: "POST", headers: { "x-amica-bridge-token": "secret" }, body: event }), res);

    expect(res.statusCode).toBe(200);
    expect(res.jsonBody).toEqual({ ok: true });
    expect(client.res.write).toHaveBeenCalledWith(`data: ${JSON.stringify(event)}\n\n`);
  });

  test("returns validation errors for authorized malformed POSTs", () => {
    const client = { res: createResponse() };
    satelliteBridgeClients.push(client);

    const res = createResponse();
    handler(
      createRequest({
        method: "POST",
        headers: { "x-amica-bridge-token": "secret" },
        body: { type: "assistant.final", data: { sessionId: "s1", text: "hi", audioBase64: "audio" } },
      }),
      res,
    );

    expect(res.statusCode).toBe(400);
    expect(res.jsonBody).toEqual({ error: "Assistant bridge mimeType is required." });
    expect(client.res.write).not.toHaveBeenCalled();
  });
});

function assistantData(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    sessionId: "s1",
    text: "hello",
    audioBase64: "YXVkaW8=",
    mimeType: "audio/webm",
    ...overrides,
  };
}

function userFinalEvent(): Record<string, unknown> {
  return { type: "user.final", data: { sessionId: "s1", text: "hello" } };
}

function createRequest(options: {
  method: string;
  headers?: Record<string, string>;
  body?: unknown;
}): NextApiRequest {
  const req = new EventEmitter() as NextApiRequest;
  req.method = options.method;
  req.headers = options.headers || {};
  req.body = options.body;
  return req;
}

function createResponse(): MockNextResponse {
  const res: MockNextResponse = {
    headers: {} as Record<string, unknown>,
    status(this: MockNextResponse, code: number) {
      this.statusCode = code;
      return this;
    },
    json(this: MockNextResponse, body: unknown) {
      this.jsonBody = body;
      return this;
    },
    end(this: MockNextResponse, body?: unknown) {
      this.endedWith = body;
      return this;
    },
    setHeader(this: MockNextResponse, name: string, value: unknown) {
      this.headers[name] = value;
      return this;
    },
    write: jest.fn(),
    flushHeaders: jest.fn(),
  } as unknown as MockNextResponse;
  return res;
}
