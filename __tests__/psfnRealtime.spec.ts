import { afterEach, describe, expect, jest, test } from "@jest/globals";

import { PsfnRealtimeSatelliteClient } from "../src/features/psfnSatelliteBridge/realtimeClient";
import {
  buildHelloMessage,
  buildPsfnRealtimeConfig,
} from "../src/features/psfnSatelliteBridge/realtimeProtocol";

const originalWebSocket = globalThis.WebSocket;

describe("PSFN realtime protocol", () => {
  test("builds a Hub hello from Amica config without advertising disabled vision upload", () => {
    const values: Record<string, string> = {
      psfn_hub_ws_url: " ws://127.0.0.1:4317/realtime ",
      psfn_device_id: "amica-device",
      psfn_device_name: "Amica Device",
      psfn_session_id: "session-1",
      psfn_channel_id: "",
      psfn_satellite_id: "amica",
      psfn_satellite_name: "Amica",
      psfn_capabilities_input: "text,vision_upload,text",
      psfn_capabilities_output: "text,subtitle,streamed_audio,animation,expression,gaze",
      psfn_capabilities_control: "interrupt,presence,session_attach",
      psfn_capabilities_safety: "local_only",
      psfn_vision_upload_enabled: "false",
    };

    const realtimeConfig = buildPsfnRealtimeConfig((key) => values[key] || "");
    const hello = buildHelloMessage(realtimeConfig);

    expect(realtimeConfig.url).toBe("ws://127.0.0.1:4317/realtime");
    expect(hello).toEqual({
      type: "hello",
      deviceId: "amica-device",
      deviceName: "Amica Device",
      sessionId: "session-1",
      satelliteId: "amica",
      satelliteName: "Amica",
      capabilities: {
        input: ["text"],
        output: ["text", "subtitle", "streamed_audio", "animation", "expression", "gaze"],
        control: ["interrupt", "presence", "session_attach"],
        safety: ["local_only"],
      },
    });
  });

  test("advertises vision upload only when the deployment enables it", () => {
    const values: Record<string, string> = {
      psfn_hub_ws_url: "ws://hub/realtime",
      psfn_device_id: "amica-device",
      psfn_device_name: "Amica Device",
      psfn_session_id: "",
      psfn_channel_id: "",
      psfn_satellite_id: "",
      psfn_satellite_name: "",
      psfn_capabilities_input: "text,vision_upload",
      psfn_capabilities_output: "",
      psfn_capabilities_control: "",
      psfn_capabilities_safety: "",
      psfn_vision_upload_enabled: "true",
    };

    const hello = buildHelloMessage(buildPsfnRealtimeConfig((key) => values[key] || ""));

    expect(hello.capabilities?.input).toEqual(["text", "vision_upload"]);
  });
});

describe("PSFN realtime client", () => {
  afterEach(() => {
    (globalThis as any).WebSocket = originalWebSocket;
  });

  test("sends hello, user text, and interrupt over the Hub websocket", () => {
    const FakeWebSocket = makeFakeWebSocket();
    (globalThis as any).WebSocket = FakeWebSocket;

    const client = new PsfnRealtimeSatelliteClient({
      url: "ws://hub/realtime",
      deviceId: "amica-device",
      deviceName: "Amica Device",
      satelliteId: "amica",
      satelliteName: "Amica",
      capabilities: { input: ["text"], output: ["streamed_audio"] },
    }, {});

    client.connect();
    const socket = FakeWebSocket.instances[0];
    socket.open();

    expect(socket.sent.map((value) => JSON.parse(value))).toEqual([
      {
        type: "hello",
        deviceId: "amica-device",
        deviceName: "Amica Device",
        satelliteId: "amica",
        satelliteName: "Amica",
        capabilities: {
          input: ["text"],
          output: ["streamed_audio"],
        },
      },
    ]);

    expect(client.sendUserText("hello", true)).toBe(true);
    expect(client.interrupt()).toBe(true);
    expect(socket.sent.slice(1).map((value) => JSON.parse(value))).toEqual([
      { type: "user.text", text: "hello", interrupt: true },
      { type: "interrupt" },
    ]);
  });

  test("reduces Hub websocket messages into handlers", () => {
    const FakeWebSocket = makeFakeWebSocket();
    (globalThis as any).WebSocket = FakeWebSocket;

    const handlers = {
      onHelloAck: jest.fn(),
      onMessage: jest.fn(),
      onAudioStart: jest.fn(),
      onAudioChunk: jest.fn(),
      onAudioEnd: jest.fn(),
      onInterrupt: jest.fn(),
    };
    const client = new PsfnRealtimeSatelliteClient({
      url: "ws://hub/realtime",
      deviceId: "amica-device",
      deviceName: "Amica Device",
      capabilities: {},
    }, handlers);

    client.connect();
    const socket = FakeWebSocket.instances[0];
    socket.open();
    socket.message({ type: "hello.ack", sessionId: "s1", channelId: "satellite.endpoint:s1" });
    socket.message({ type: "message", data: { role: "assistant", content: "hi", live: true } });
    socket.message({ type: "text", data: "audio-init" });
    socket.message({ type: "audio", data: "YXVkaW8=" });
    socket.message({ type: "text", data: "audio-end" });
    socket.message({ type: "action", data: "interrupt" });

    expect(handlers.onHelloAck).toHaveBeenCalledWith(expect.objectContaining({ sessionId: "s1" }));
    expect(handlers.onMessage).toHaveBeenCalledWith({
      type: "message",
      data: { role: "assistant", content: "hi", live: true },
    });
    expect(handlers.onAudioStart).toHaveBeenCalledTimes(1);
    expect(handlers.onAudioChunk).toHaveBeenCalledWith("YXVkaW8=");
    expect(handlers.onAudioEnd).toHaveBeenCalledTimes(1);
    expect(handlers.onInterrupt).toHaveBeenCalledTimes(1);
  });
});

type FakeWebSocketClass = {
  new (url: string): FakeWebSocketInstance;
  instances: FakeWebSocketInstance[];
  OPEN: number;
  CONNECTING: number;
};

type FakeWebSocketInstance = {
  url: string;
  readyState: number;
  sent: string[];
  onopen: (() => void) | null;
  onmessage: ((event: MessageEvent) => void) | null;
  onclose: ((event: CloseEvent) => void) | null;
  onerror: (() => void) | null;
  send: (message: string) => void;
  close: () => void;
  open: () => void;
  message: (message: object) => void;
};

function makeFakeWebSocket(): FakeWebSocketClass {
  class FakeWebSocket implements FakeWebSocketInstance {
    static instances: FakeWebSocketInstance[] = [];
    static CONNECTING = 0;
    static OPEN = 1;

    readyState = FakeWebSocket.CONNECTING;
    sent: string[] = [];
    onopen: (() => void) | null = null;
    onmessage: ((event: MessageEvent) => void) | null = null;
    onclose: ((event: CloseEvent) => void) | null = null;
    onerror: (() => void) | null = null;

    constructor(public url: string) {
      FakeWebSocket.instances.push(this);
    }

    send(message: string): void {
      this.sent.push(message);
    }

    close(): void {
      this.readyState = 3;
      this.onclose?.({} as CloseEvent);
    }

    open(): void {
      this.readyState = FakeWebSocket.OPEN;
      this.onopen?.();
    }

    message(message: object): void {
      this.onmessage?.({ data: JSON.stringify(message) } as MessageEvent);
    }
  }

  return FakeWebSocket;
}
