import {
  buildHelloMessage,
  HubMessageEvent,
  HelloAckMessage,
  PsfnRealtimeConfig,
  SessionReadyMessage,
} from "./realtimeProtocol";

export interface PsfnRealtimeHandlers {
  onOpen?: () => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (message: string) => void;
  onSessionReady?: (message: SessionReadyMessage) => void;
  onHelloAck?: (message: HelloAckMessage) => void;
  onMessage?: (message: HubMessageEvent) => void;
  onAudioStart?: () => void;
  onAudioChunk?: (audioBase64: string) => void;
  onAudioEnd?: () => void;
  onInterrupt?: () => void;
  onStatus?: (message: string) => void;
}

export class PsfnRealtimeSatelliteClient {
  private socket: WebSocket | null = null;
  private reconnectTimer: number | null = null;
  private closedByClient = false;

  public constructor(
    private readonly config: PsfnRealtimeConfig,
    private readonly handlers: PsfnRealtimeHandlers,
    private readonly reconnectDelayMs = 1500,
  ) {}

  public connect(): void {
    if (!this.config.url) {
      this.handlers.onError?.("PSFN Hub websocket URL is not configured");
      return;
    }

    this.closedByClient = false;
    this.clearReconnectTimer();

    if (
      this.socket &&
      (this.socket.readyState === WebSocket.OPEN ||
        this.socket.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    const socket = new WebSocket(this.config.url);
    this.socket = socket;

    socket.onopen = () => {
      this.handlers.onOpen?.();
      socket.send(JSON.stringify(buildHelloMessage(this.config)));
    };

    socket.onmessage = (event) => {
      this.handleSocketMessage(event.data);
    };

    socket.onerror = () => {
      this.handlers.onError?.("PSFN Hub websocket error");
    };

    socket.onclose = (event) => {
      if (this.socket === socket) {
        this.socket = null;
      }
      this.handlers.onClose?.(event);
      if (!this.closedByClient) {
        this.scheduleReconnect();
      }
    };
  }

  public close(): void {
    this.closedByClient = true;
    this.clearReconnectTimer();

    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  public isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  public sendUserText(text: string, interrupt = true): boolean {
    return this.send({
      type: "user.text",
      text,
      interrupt,
    });
  }

  public interrupt(): boolean {
    return this.send({ type: "interrupt" });
  }

  public ping(): boolean {
    return this.send({ type: "ping", sentAt: Date.now() });
  }

  private send(message: object): boolean {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      this.handlers.onError?.("PSFN Hub websocket is not connected");
      return false;
    }

    this.socket.send(JSON.stringify(message));
    return true;
  }

  private handleSocketMessage(rawMessage: unknown): void {
    let message: Record<string, unknown>;
    try {
      const text = typeof rawMessage === "string" ? rawMessage : String(rawMessage);
      message = JSON.parse(text);
    } catch (error) {
      this.handlers.onError?.(`Invalid PSFN Hub websocket message: ${error}`);
      return;
    }

    switch (message.type) {
      case "session.ready":
        this.handlers.onSessionReady?.(message as unknown as SessionReadyMessage);
        break;
      case "hello.ack":
        this.handlers.onHelloAck?.(message as unknown as HelloAckMessage);
        break;
      case "message":
        this.handlers.onMessage?.(message as unknown as HubMessageEvent);
        break;
      case "text":
        if (message.data === "audio-init") {
          this.handlers.onAudioStart?.();
        } else if (message.data === "audio-end") {
          this.handlers.onAudioEnd?.();
        } else if (typeof message.data === "string") {
          this.handlers.onStatus?.(message.data);
        }
        break;
      case "audio":
        if (typeof message.data === "string") {
          this.handlers.onAudioChunk?.(message.data);
        }
        break;
      case "action":
        if (message.data === "interrupt" || message.data === "pause-audio") {
          this.handlers.onInterrupt?.();
        }
        break;
      case "assistant.interrupted":
        this.handlers.onInterrupt?.();
        break;
      case "error-event":
        if (isRecord(message.data) && typeof message.data.message === "string") {
          this.handlers.onError?.(message.data.message);
        }
        break;
      case "status":
        if (typeof message.data === "string") {
          this.handlers.onStatus?.(message.data);
        }
        break;
      default:
        break;
    }
  }

  private scheduleReconnect(): void {
    this.clearReconnectTimer();
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, this.reconnectDelayMs);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer === null) {
      return;
    }
    window.clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
