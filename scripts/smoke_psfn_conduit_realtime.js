const assert = require("assert");
const { WebSocketServer } = require("ws");
const WebSocket = require("ws");

async function main() {
  const server = new WebSocketServer({ port: 0 });
  const port = await waitForListening(server);
  const url = `ws://127.0.0.1:${port}`;
  const received = [];

  server.on("connection", (socket) => {
    socket.on("message", (raw) => {
      const message = JSON.parse(String(raw));
      received.push(message);

      if (message.type === "hello") {
        socket.send(JSON.stringify({
          type: "session.ready",
          sessionId: message.sessionId || "amica-smoke-session",
          channelId: message.channelId || "satellite.endpoint:amica-smoke-session",
          deviceId: message.deviceId,
          deviceName: message.deviceName,
          satelliteId: message.satelliteId || "amica",
          audioFormat: "audio/mpeg",
        }));
        socket.send(JSON.stringify({
          type: "hello.ack",
          sessionId: message.sessionId || "amica-smoke-session",
          channelId: message.channelId || "satellite.endpoint:amica-smoke-session",
          deviceId: message.deviceId,
          deviceName: message.deviceName,
          satelliteId: message.satelliteId || "amica",
          satelliteName: message.satelliteName || "Amica",
          capabilities: message.capabilities || {},
        }));
      }

      if (message.type === "user.text") {
        socket.send(JSON.stringify({
          type: "message",
          data: { role: "user", content: message.text, final: true },
        }));
        socket.send(JSON.stringify({
          type: "message",
          data: { role: "assistant", content: "Smoke reply", live: true },
        }));
        socket.send(JSON.stringify({ type: "text", data: "audio-init" }));
        socket.send(JSON.stringify({ type: "audio", data: Buffer.from("audio").toString("base64") }));
        socket.send(JSON.stringify({ type: "text", data: "audio-end" }));
        socket.send(JSON.stringify({
          type: "message",
          data: { role: "assistant", content: "Smoke reply", final: true },
        }));
        socket.send(JSON.stringify({ type: "action", data: "interrupt" }));
      }
    });
  });

  const client = new WebSocket(url);
  const inbound = [];
  await waitForOpen(client);
  client.on("message", (raw) => {
    inbound.push(JSON.parse(String(raw)));
  });

  client.send(JSON.stringify({
    type: "hello",
    deviceId: "amica-smoke-device",
    deviceName: "Amica Smoke Device",
    sessionId: "amica-smoke-session",
    satelliteId: "amica",
    satelliteName: "Amica",
    capabilities: {
      input: ["text"],
      output: ["text", "subtitle", "streamed_audio", "animation", "expression", "gaze"],
      control: ["interrupt", "presence", "session_attach"],
      safety: ["local_only"],
    },
  }));
  await waitFor(() => inbound.some((message) => message.type === "hello.ack"));

  client.send(JSON.stringify({
    type: "user.text",
    text: "smoke test",
    interrupt: true,
  }));
  await waitFor(() => inbound.some((message) => message.type === "action" && message.data === "interrupt"));

  assert.deepEqual(received.map((message) => message.type), ["hello", "user.text"]);
  assert(inbound.some((message) => message.type === "session.ready"), "missing session.ready");
  assert(inbound.some((message) => message.type === "hello.ack"), "missing hello.ack");
  assert(inbound.some((message) => message.type === "message" && message.data.role === "user" && message.data.final), "missing user final echo");
  assert(inbound.some((message) => message.type === "message" && message.data.role === "assistant" && message.data.live), "missing assistant live text");
  assert(inbound.some((message) => message.type === "audio"), "missing streamed audio");
  assert(inbound.some((message) => message.type === "message" && message.data.role === "assistant" && message.data.final), "missing assistant final text");

  client.close();
  await closeServer(server);

  console.log("PSFN conduit realtime smoke check passed.");
}

function waitForListening(server) {
  return new Promise((resolve) => {
    server.on("listening", () => {
      resolve(server.address().port);
    });
  });
}

function waitForOpen(socket) {
  return new Promise((resolve, reject) => {
    socket.once("open", resolve);
    socket.once("error", reject);
  });
}

function waitFor(predicate) {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const interval = setInterval(() => {
      if (predicate()) {
        clearInterval(interval);
        resolve();
        return;
      }
      if (Date.now() - startedAt > 2000) {
        clearInterval(interval);
        reject(new Error("Timed out waiting for smoke condition."));
      }
    }, 10);
  });
}

function closeServer(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
