import { Queue } from "typescript-collections";
import { textsToScreenplay } from "./messages";
import type { Message, Role, Screenplay, Talk } from "./messages";
import type { Viewer } from "@/features/vrmViewer/viewer";
import type { Alert } from "@/features/alert/alert";

import type { AmicaLife } from "@/features/amicaLife/amicaLife";

import { config, isPsfnConduitMode, updateConfig } from "@/utils/config";
import { cleanTalk } from "@/utils/cleanTalk";
import { processResponse } from "@/utils/processResponse";
import { wait } from "@/utils/wait";
import isDev from '@/utils/isDev';
import type { SatelliteBridgeEvent } from "@/features/psfnSatelliteBridge/types";
import { PsfnRealtimeSatelliteClient } from "@/features/psfnSatelliteBridge/realtimeClient";
import { buildPsfnRealtimeConfig } from "@/features/psfnSatelliteBridge/realtimeProtocol";
import type { HubMessageEvent, RuntimeIdentity } from "@/features/psfnSatelliteBridge/realtimeProtocol";
import { joinMessageSegments, resolveSatelliteSegmentOrder } from "./satellitePlayback";
import { resolveVisionRoute, validateVisionImageBase64 } from "./visionRouting";

import { isCharacterIdle, characterIdleTime, resetIdleTimer } from "@/utils/isIdle";

type Speak = {
  audioBuffer: ArrayBuffer | null;
  screenplay: Screenplay;
  streamIdx: number;
  bubble?: boolean;
};

type TTSJob = {
  screenplay: Screenplay;
  streamIdx: number;
};

export class Chat {
  public initialized: boolean;

  public amicaLife?: AmicaLife;
  public viewer?: Viewer;
  public alert?: Alert;

  public setChatLog?: (messageLog: Message[]) => void;
  public setUserMessage?: (message: string) => void;
  public setAssistantMessage?: (message: string) => void;
  public setShownMessage?: (role: Role) => void;
  public setChatProcessing?: (processing: boolean) => void;
  public setChatSpeaking?: (speaking: boolean) => void;
  public setThoughtMessage?: (message: string) => void;

  // the message from the user that is currently being processed
  // it can be reset
  public stream: ReadableStream<Uint8Array> | null;
  public streams: ReadableStream<Uint8Array>[];
  public reader: ReadableStreamDefaultReader<Uint8Array> | null;
  public readers: ReadableStreamDefaultReader<Uint8Array>[];

  // process these immediately as they come in and add to audioToPlay
  public ttsJobs: Queue<TTSJob>;

  // this should be read as soon as they exist
  // and then deleted from the queue
  public speakJobs: Queue<Speak>;

  private currentAssistantMessage: string;
  private currentUserMessage: string;
  private thoughtMessage: string;

  private lastAwake: number;

  public messageList: Message[];

  public currentStreamIdx: number;
  private satelliteTurnStreams: Map<string, number>;
  private satelliteCurrentTurnId: string | null;
  private satelliteLastSegmentIndex: number;

  private eventSource: EventSource | null = null
  private satelliteEventSource: EventSource | null = null;
  private psfnRealtimeClient: PsfnRealtimeSatelliteClient | null = null;
  private psfnRealtimeAssistantText: string;
  private psfnRealtimeAudioChunks: string[];
  private psfnRealtimeAudioStreamIdx: number | null;
  private lastOutboundUserText: string;

  constructor() {
    this.initialized = false;

    this.stream = null;
    this.reader = null;
    this.streams = [];
    this.readers = [];

    this.ttsJobs = new Queue<TTSJob>();
    this.speakJobs = new Queue<Speak>();

    this.currentAssistantMessage = "";
    this.currentUserMessage = "";
    this.thoughtMessage = "";

    this.messageList = [];
    this.currentStreamIdx = 0;
    this.satelliteTurnStreams = new Map();
    this.satelliteCurrentTurnId = null;
    this.satelliteLastSegmentIndex = -1;
    this.psfnRealtimeAssistantText = "";
    this.psfnRealtimeAudioChunks = [];
    this.psfnRealtimeAudioStreamIdx = null;
    this.lastOutboundUserText = "";

    this.lastAwake = 0;
  }

  public initialize(
    amicaLife: AmicaLife,
    viewer: Viewer,
    alert: Alert,
    setChatLog: (messageLog: Message[]) => void,
    setUserMessage: (message: string) => void,
    setAssistantMessage: (message: string) => void,
    setThoughtMessage: (message: string) => void,
    setShownMessage: (role: Role) => void,
    setChatProcessing: (processing: boolean) => void,
    setChatSpeaking: (speaking: boolean) => void,
  ) {
    this.amicaLife = amicaLife;
    this.viewer = viewer;
    this.alert = alert;
    this.setChatLog = setChatLog;
    this.setUserMessage = setUserMessage;
    this.setAssistantMessage = setAssistantMessage;
    this.setShownMessage = setShownMessage;
    this.setThoughtMessage = setThoughtMessage;
    this.setChatProcessing = setChatProcessing;
    this.setChatSpeaking = setChatSpeaking;

    if (this.initialized) {
      return;
    }

    // these will run forever
    this.processTtsJobs();
    this.processSpeakJobs();

    this.updateAwake();
    this.initialized = true;

    this.initSSE();
    this.initSatelliteBridge();
    this.initPsfnRealtimeSatellite();
  }

  public setMessageList(messages: Message[]) {
    this.messageList = messages;
    this.currentAssistantMessage = "";
    this.currentUserMessage = "";
    this.setChatLog!(this.messageList!);
    this.setAssistantMessage!(this.currentAssistantMessage);
    this.setUserMessage!(this.currentAssistantMessage);
    this.currentStreamIdx++;
  }

  public async handleRvc(audio: any) {
    const { rvc } = await import("@/features/rvc/rvc");
    const rvcModelName = config("rvc_model_name");
    const rvcIndexPath = config("rvc_index_path");
    const rvcF0upKey = parseInt(config("rvc_f0_upkey"));
    const rvcF0Method = config("rvc_f0_method");
    const rvcIndexRate = config("rvc_index_rate");
    const rvcFilterRadius = parseInt(config("rvc_filter_radius"));
    const rvcResampleSr = parseInt(config("rvc_resample_sr"));
    const rvcRmsMixRate = parseInt(config("rvc_rms_mix_rate"));
    const rvcProtect = parseInt(config("rvc_protect"));

    const voice = await rvc(
      audio,
      rvcModelName,
      rvcIndexPath,
      rvcF0upKey,
      rvcF0Method,
      rvcIndexRate,
      rvcFilterRadius,
      rvcResampleSr,
      rvcRmsMixRate,
      rvcProtect,
    );

    return voice.audio;
  }

  public idleTime(): number {
    return characterIdleTime(this.lastAwake);
  }

  public isAwake() {
    return !isCharacterIdle(this.lastAwake);
  }

  public updateAwake() {
    this.lastAwake = new Date().getTime();
    resetIdleTimer();
  }

  public async processTtsJobs() {
    while (true) {
      do {
        const ttsJob = this.ttsJobs.dequeue();
        if (!ttsJob) {
          break;
        }

        if (ttsJob.streamIdx !== this.currentStreamIdx) {
          console.log("skipping tts for streamIdx");
          continue;
        }

        const audioBuffer = await this.fetchAudio(ttsJob.screenplay.talk);
        this.speakJobs.enqueue({
          audioBuffer,
          screenplay: ttsJob.screenplay,
          streamIdx: ttsJob.streamIdx,
        });
      } while (this.ttsJobs.size() > 0);
      await wait(50);
    }
  }

  public async processSpeakJobs() {
    while (true) {
      do {
        const speak = this.speakJobs.dequeue();
        if (!speak) {
          break;
        }
        if (speak.streamIdx !== this.currentStreamIdx) {
          console.log("skipping speak for streamIdx");
          continue;
        }

        if ((window as any).chatvrm_latency_tracker) {
          if ((window as any).chatvrm_latency_tracker.active) {
            const ms =
              +new Date() - (window as any).chatvrm_latency_tracker.start;
            console.log("performance_latency", ms);
            (window as any).chatvrm_latency_tracker.active = false;
          }
        }

        if (speak.bubble !== false) {
          this.bubbleMessage("assistant", speak.screenplay.text);
        }

        if (speak.audioBuffer) {
          this.setChatSpeaking!(true);
          await this.viewer!.model?.speak(speak.audioBuffer, speak.screenplay);
          this.setChatSpeaking!(false);
          this.isAwake() ? this.updateAwake() : null;
        }
      } while (this.speakJobs.size() > 0);
      await wait(50);
    }
  }

  public thoughtBubbleMessage(isThinking: boolean, thought: string) {
    // if not thinking, we should clear the thought bubble 
    if (!isThinking) {
      this.thoughtMessage = "";
      this.setThoughtMessage!("");
      return;
    }

    if (this.thoughtMessage !== "") {
      this.thoughtMessage += " ";
    }
    this.thoughtMessage += thought;
    this.setThoughtMessage!(this.thoughtMessage);
  }

  public bubbleMessage(role: Role, text: string) {
    // TODO: currentUser & Assistant message should be contain the message with emotion in it

    if (role === "user") {
      this.flushCurrentUserMessage();
      this.currentUserMessage = text.trim();
      this.setUserMessage!(this.currentUserMessage);
      this.setAssistantMessage!("");

      this.flushCurrentAssistantMessage();

      this.setChatLog!([
        ...this.messageList!,
        { role: "user", content: this.currentUserMessage },
      ]);
    }

    if (role === "assistant") {
      if (
        this.currentAssistantMessage != "" &&
        !this.isAwake() &&
        config("amica_life_enabled") === "true"
      ) {
        this.messageList!.push({
          role: "assistant",
          content: this.currentAssistantMessage,
        });

        this.currentAssistantMessage = text;
        this.setAssistantMessage!(this.currentAssistantMessage);
      } else if (config("chatbot_backend") === "moshi") {
        if (this.currentAssistantMessage !== "") {
          this.messageList!.push({
            role: "assistant",
            content: this.currentAssistantMessage,
          });
        }
        this.currentAssistantMessage = text;
        this.setAssistantMessage!(this.currentAssistantMessage);
        this.setUserMessage!("");

      } else {
        this.currentAssistantMessage = joinMessageSegments(this.currentAssistantMessage, text);
        this.setUserMessage!("");
        this.setAssistantMessage!(this.currentAssistantMessage);
      }

      this.flushCurrentUserMessage();

      this.setChatLog!([
        ...this.messageList!,
        { role: "assistant", content: this.currentAssistantMessage },
      ]);
    }

    this.setShownMessage!(role);
  }

  private flushCurrentUserMessage() {
    const pendingUserMessage = this.currentUserMessage.trim();
    if (!pendingUserMessage) {
      this.currentUserMessage = "";
      return;
    }

    this.messageList!.push({
      role: "user",
      content: pendingUserMessage,
    });
    this.currentUserMessage = "";
  }

  private flushCurrentAssistantMessage() {
    const pendingAssistantMessage = this.currentAssistantMessage.trim();
    if (!pendingAssistantMessage) {
      this.currentAssistantMessage = "";
      return;
    }

    this.messageList!.push({
      role: "assistant",
      content: pendingAssistantMessage,
    });
    this.currentAssistantMessage = "";
  }

  public async interrupt() {
    const shouldSendHubInterrupt = isPsfnConduitMode() && this.psfnRealtimeClient?.isConnected();
    this.currentStreamIdx++;
    try {
      if (this.reader) {
        console.debug("cancelling");
        if (!this.reader?.closed) {
          await this.reader?.cancel();
        }
        // this.reader = null;
        // this.stream = null;
        console.debug("finished cancelling");
      }
    } catch (e: any) {
      console.error(e.toString());
    }

    // TODO if llm type is llama.cpp, we can send /stop message here
    this.ttsJobs.clear();
    this.speakJobs.clear();
    this.viewer?.model?.stopSpeaking();
    this.setChatSpeaking?.(false);
    this.setChatProcessing?.(false);
    if (shouldSendHubInterrupt) {
      this.psfnRealtimeClient?.interrupt();
    }
  }

  // this happens either from text or from voice / whisper completion
  public async receiveMessageFromUser(message: string, amicaLife: boolean) {
    if (message === null || message === "") {
      return;
    }

    if (isPsfnConduitMode()) {
      await this.receiveMessageFromPsfnConduit(message);
      return;
    }

    console.time("performance_interrupting");
    console.debug("interrupting...");
    await this.interrupt();
    console.timeEnd("performance_interrupting");
    await wait(0);
    console.debug("wait complete");

    if (!amicaLife) {
      console.log("receiveMessageFromUser", message);

      // For external API
      const { handleUserInput } = await import("../externalAPI/externalAPI");
      await handleUserInput(message);

      this.amicaLife?.receiveMessageFromUser(message);

      if (!/\[.*?\]/.test(message)) {
        message = `[neutral] ${message}`;
      }

      this.updateAwake();
      this.bubbleMessage("user", message);
    }

    // make new stream
    const messages: Message[] = [
      { role: "system", content: config("system_prompt") },
      ...this.messageList!,
      { role: "user", content: amicaLife ? message : this.currentUserMessage },
    ];
    // console.debug('messages', messages);

    await this.makeAndHandleStream(messages);
  }

  public initSSE() {
    if (!isDev || config("external_api_enabled") !== "true") {
      return;
    }  
    // Close existing SSE connection if it exists
    this.closeSSE();

    this.eventSource = new EventSource('/api/amicaHandler');

    // Listen for incoming messages from the server
    this.eventSource.onmessage = async (event) => {
      try {
        // Parse the incoming JSON message
        const message = JSON.parse(event.data);

        console.log(message);

        // Destructure to get the message type and data
        const { type, data } = message;

        // Handle the message based on its type
        switch (type) {
          case 'normal':
            console.log('Normal message received:', data);
            const messages: Message[] = [
              { role: "system", content: config("system_prompt") },
              ...this.messageList!,
              { role: "user", content: data},
            ];
            const { getEchoChatResponseStream } = await import("./echoChat");
            let stream = await getEchoChatResponseStream(messages);
            this.streams.push(stream);
            this.handleChatResponseStream();
            break;
          
          case 'animation':
            console.log('Animation data received:', data);
            const { loadVRMAnimation } = await import('@/lib/VRMAnimation/loadVRMAnimation');
            const animation = await loadVRMAnimation(`/animations/${data}`);
            if (!animation) {
              throw new Error("Loading animation failed");
            }
            this.viewer?.model?.playAnimation(animation,data);
            requestAnimationFrame(() => { this.viewer?.resetCameraLerp(); });
            break;

          case 'playback':
            console.log('Playback flag received:', data);
            this.viewer?.startRecording();
            // Automatically stop recording after 10 seconds
            setTimeout(() => {
              this.viewer?.stopRecording((videoBlob) => {
                // Log video blob to console
                console.log("Video recording finished", videoBlob);

                // Create a download link for the video file
                const url = URL.createObjectURL(videoBlob!);
                const a = document.createElement("a");
                a.href = url;
                a.download = "recording.webm"; // Set the file name for download
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);

                // Revoke the URL to free up memory
                URL.revokeObjectURL(url);
              });
            }, data); // Stop recording after 10 seconds
            break;

          case 'systemPrompt':
            console.log('System Prompt data received:', data);
            updateConfig("system_prompt",data);
            break;

          default:
            console.warn('Unknown message type:', type);
        }
      } catch (error) {
        console.error('Error parsing SSE message:', error);
      }
    };


    this.eventSource.addEventListener('end', () => {
      console.log('SSE session ended');
      this.eventSource?.close();
    });

    this.eventSource.onerror = (error) => {
      console.error('Error in SSE connection:', error);
      this.eventSource?.close();
      setTimeout(this.initSSE, 500);
    };
  }

  public closeSSE() {
    if (this.eventSource) {
        console.log("Closing existing SSE connection...");
        this.eventSource.close();
        this.eventSource = null;
    }
}

  public initSatelliteBridge() {
    if (config("psfn_satellite_bridge_enabled") !== "true") {
      return;
    }

    this.closeSatelliteBridge();
    this.satelliteEventSource = new EventSource("/api/satelliteBridge/");
    this.satelliteEventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as SatelliteBridgeEvent;
        if (payload.data.sessionId !== config("psfn_channel_id").trim()) {
          return;
        }
        switch (payload.type) {
          case "user.final":
            this.registerSatelliteTurn(payload.data.turnId);
            this.updateAwake();
            this.bubbleMessage("user", payload.data.text);
            break;
          case "assistant.segment":
          case "assistant.final":
            void this.enqueueSatelliteAssistantReply(
              payload.data.text,
              payload.data.audioBase64,
              payload.data.turnId,
              payload.data.segmentIndex,
            );
            break;
          case "interrupt":
            this.handleSatelliteInterrupt();
            break;
        }
      } catch (error) {
        console.error("Error parsing satellite bridge event:", error);
      }
    };
    this.satelliteEventSource.onerror = (error) => {
      console.error("Error in satellite bridge connection:", error);
      this.closeSatelliteBridge();
      setTimeout(() => this.initSatelliteBridge(), 500);
    };
  }

  public closeSatelliteBridge() {
    if (this.satelliteEventSource) {
      console.log("Closing existing satellite bridge connection...");
      this.satelliteEventSource.close();
      this.satelliteEventSource = null;
    }
  }

  public initPsfnRealtimeSatellite() {
    if (!isPsfnConduitMode() || config("psfn_realtime_enabled") !== "true") {
      return;
    }

    const realtimeConfig = buildPsfnRealtimeConfig(config);
    if (!realtimeConfig.url) {
      console.warn("PSFN conduit mode is enabled, but psfn_hub_ws_url is empty.");
      return;
    }

    this.closePsfnRealtimeSatellite();
    this.psfnRealtimeClient = new PsfnRealtimeSatelliteClient(realtimeConfig, {
      onOpen: () => {
        console.log("Connected to PSFN Satellite Hub websocket.");
      },
      onClose: () => {
        console.warn("Disconnected from PSFN Satellite Hub websocket.");
        this.setChatProcessing?.(false);
      },
      onError: (message) => {
        console.error(message);
        this.alert?.error("PSFN Satellite Hub", message);
      },
      onSessionReady: (message) => {
        console.log("PSFN Satellite Hub session ready", message.sessionId, message.channelId);
        void this.applyPsfnRuntimeIdentity(message.identity);
      },
      onHelloAck: (message) => {
        console.log("PSFN Satellite Hub hello acknowledged", message.sessionId, message.channelId);
        void this.applyPsfnRuntimeIdentity(message.identity);
      },
      onMessage: (message) => {
        this.handlePsfnRealtimeMessage(message);
      },
      onAudioStart: () => {
        this.psfnRealtimeAudioChunks = [];
        this.psfnRealtimeAudioStreamIdx = this.currentStreamIdx;
      },
      onAudioChunk: (audioBase64) => {
        this.psfnRealtimeAudioChunks.push(audioBase64);
      },
      onAudioEnd: () => {
        this.enqueuePsfnRealtimeAudio();
      },
      onInterrupt: () => {
        this.handlePsfnRealtimeInterrupt();
      },
      onStatus: (message) => {
        console.debug("PSFN Satellite Hub status", message);
      },
    });
    this.psfnRealtimeClient.connect();
  }

  public closePsfnRealtimeSatellite() {
    this.psfnRealtimeClient?.close();
    this.psfnRealtimeClient = null;
  }

  private async receiveMessageFromPsfnConduit(message: string) {
    console.time("performance_interrupting");
    console.debug("interrupting...");
    await this.interruptForPsfnUserText();
    console.timeEnd("performance_interrupting");
    await wait(0);

    if (!this.psfnRealtimeClient) {
      this.initPsfnRealtimeSatellite();
    }

    if (!this.psfnRealtimeClient?.isConnected()) {
      const errMsg = "PSFN Satellite Hub websocket is not connected.";
      console.error(errMsg);
      this.alert?.error("PSFN Satellite Hub", errMsg);
      return;
    }

    const sent = this.psfnRealtimeClient.sendUserText(message, true);
    if (!sent) {
      return;
    }

    this.lastOutboundUserText = message.trim();
    this.psfnRealtimeAssistantText = "";
    this.updateAwake();
    this.setChatProcessing?.(true);
  }

  private async interruptForPsfnUserText() {
    const client = this.psfnRealtimeClient;
    this.psfnRealtimeClient = null;
    await this.interrupt();
    this.psfnRealtimeClient = client;
  }

  private handlePsfnRealtimeMessage(message: HubMessageEvent) {
    const data = message.data;
    if (!data || typeof data.content !== "string") {
      return;
    }

    if (data.role === "user") {
      if (data.live) {
        this.setShownMessage?.("user");
        this.setUserMessage?.(data.content);
        return;
      }

      if (data.final) {
        this.currentStreamIdx += 1;
        this.psfnRealtimeAssistantText = "";
        this.psfnRealtimeAudioChunks = [];
        this.psfnRealtimeAudioStreamIdx = this.currentStreamIdx;
        this.lastOutboundUserText = "";
        this.updateAwake();
        this.bubbleMessage("user", data.content);
        this.setChatProcessing?.(true);
      }
      return;
    }

    if (data.role !== "assistant") {
      return;
    }

    if (data.live) {
      this.psfnRealtimeAssistantText += data.content;
      this.setRealtimeAssistantMessage(this.psfnRealtimeAssistantText);
      return;
    }

    if (data.final) {
      this.psfnRealtimeAssistantText = data.content;
      this.bubbleMessage("assistant", data.content);
      this.setChatProcessing?.(false);
    }
  }

  private async applyPsfnRuntimeIdentity(identity?: RuntimeIdentity) {
    const assistantName = identity?.companion?.name?.trim();
    const userName = identity?.user?.name?.trim();

    if (assistantName) {
      await updateConfig("psfn_assistant_name", assistantName);
      await updateConfig("name", assistantName);
    }
    if (userName) {
      await updateConfig("psfn_user_name", userName);
    }
  }

  private setRealtimeAssistantMessage(message: string) {
    this.currentAssistantMessage = message.trimStart();
    this.setUserMessage?.("");
    this.setAssistantMessage?.(this.currentAssistantMessage);
    this.flushCurrentUserMessage();
    this.setChatLog?.([
      ...this.messageList!,
      { role: "assistant", content: this.currentAssistantMessage },
    ]);
    this.setShownMessage?.("assistant");
  }

  private enqueuePsfnRealtimeAudio() {
    if (this.psfnRealtimeAudioChunks.length === 0) {
      return;
    }

    const text = this.psfnRealtimeAssistantText.trim() || this.currentAssistantMessage;
    const screenplay = textsToScreenplay([text || "[neutral]"])[0];
    if (!screenplay) {
      return;
    }

    this.speakJobs.enqueue({
      audioBuffer: decodeBase64AudioChunks(this.psfnRealtimeAudioChunks),
      screenplay,
      streamIdx: this.psfnRealtimeAudioStreamIdx ?? this.currentStreamIdx,
      bubble: false,
    });
    this.psfnRealtimeAudioChunks = [];
    this.psfnRealtimeAudioStreamIdx = null;
  }

  private handlePsfnRealtimeInterrupt() {
    this.currentStreamIdx += 1;
    this.psfnRealtimeAssistantText = "";
    this.psfnRealtimeAudioChunks = [];
    this.psfnRealtimeAudioStreamIdx = null;
    this.ttsJobs.clear();
    this.speakJobs.clear();
    this.viewer?.model?.stopSpeaking();
    this.setChatSpeaking?.(false);
    this.setChatProcessing?.(false);
  }

  private async enqueueSatelliteAssistantReply(
    text: string,
    audioBase64: string,
    turnId?: string,
    segmentIndex?: number,
  ) {
    const streamIdx = this.resolveSatelliteStreamIdx(turnId);
    if (streamIdx === null) {
      console.warn("Dropping satellite assistant segment for unknown turn", turnId);
      return;
    }
    const segmentOrder = resolveSatelliteSegmentOrder(
      {
        currentTurnId: this.satelliteCurrentTurnId,
        lastSegmentIndex: this.satelliteLastSegmentIndex,
      },
      turnId,
      segmentIndex,
    );
    if (!segmentOrder.accepted) {
      console.warn("Dropping duplicate or stale satellite assistant segment", {
        turnId,
        segmentIndex,
        lastSegmentIndex: this.satelliteLastSegmentIndex,
      });
      return;
    }
    this.satelliteCurrentTurnId = segmentOrder.state.currentTurnId;
    this.satelliteLastSegmentIndex = segmentOrder.state.lastSegmentIndex;

    const audioBuffer = decodeBase64Audio(audioBase64);
    const screenplay = textsToScreenplay([text])[0];
    if (!screenplay) {
      return;
    }
    this.speakJobs.enqueue({
      audioBuffer,
      screenplay,
      streamIdx,
    });
  }

  private handleSatelliteInterrupt() {
    this.currentStreamIdx += 1;
    this.satelliteTurnStreams.clear();
    this.satelliteCurrentTurnId = null;
    this.satelliteLastSegmentIndex = -1;
    this.speakJobs.clear();
    this.viewer?.model?.stopSpeaking();
    this.setChatSpeaking?.(false);
  }

  private registerSatelliteTurn(turnId?: string) {
    if (!turnId) {
      this.satelliteCurrentTurnId = null;
      this.satelliteLastSegmentIndex = -1;
      return;
    }
    let streamIdx = this.satelliteTurnStreams.get(turnId);
    if (streamIdx === undefined) {
      this.currentStreamIdx += 1;
      streamIdx = this.currentStreamIdx;
      this.satelliteTurnStreams.set(turnId, streamIdx);
      if (this.satelliteTurnStreams.size > 6) {
        const staleTurnId = this.satelliteTurnStreams.keys().next().value;
        if (staleTurnId && staleTurnId !== turnId) {
          this.satelliteTurnStreams.delete(staleTurnId);
        }
      }
    }
    this.satelliteCurrentTurnId = turnId;
    this.satelliteLastSegmentIndex = -1;
  }

  private resolveSatelliteStreamIdx(turnId?: string): number | null {
    if (!turnId) {
      return this.currentStreamIdx;
    }
    return this.satelliteTurnStreams.get(turnId) ?? null;
  }

  public async makeAndHandleStream(messages: Message[]) {
    try {
      this.streams.push(await this.getChatResponseStream(messages));
    } catch (e: any) {
      const errMsg = e.toString();
      console.error(errMsg);
      this.alert?.error("Failed to get chat response", errMsg);
      return errMsg;
    }

    if (this.streams[this.streams.length - 1] == null) {
      const errMsg = "Error: Null stream encountered.";
      console.error(errMsg);
      this.alert?.error("Null stream encountered", errMsg);
      return errMsg;
    }

    return await this.handleChatResponseStream();
  }

  public async handleChatResponseStream() {
    if (this.streams.length === 0) {
      console.log("no stream!");
      return;
    }

    this.currentStreamIdx++;
    const streamIdx = this.currentStreamIdx;
    this.setChatProcessing!(true);

    console.time("chat stream processing");
    let reader = this.streams[this.streams.length - 1].getReader();
    this.readers.push(reader);
    let sentences = new Array<string>();

    let aiTextLog = "";
    let tag = "";
    let isThinking = false;
    let rolePlay = "";
    let receivedMessage = "";

    let firstTokenEncountered = false;
    let firstSentenceEncountered = false;
    console.time("performance_time_to_first_token");
    console.time("performance_time_to_first_sentence");

    try {
      while (true) {
        if (this.currentStreamIdx !== streamIdx) {
          console.log("wrong stream idx");
          break;
        }
        const { done, value } = await reader.read();
        if (!firstTokenEncountered) {
          console.timeEnd("performance_time_to_first_token");
          firstTokenEncountered = true;
        }
        if (done) break;

        receivedMessage += value;
        receivedMessage = receivedMessage.trimStart();

        const proc = processResponse({
          sentences,
          aiTextLog,
          receivedMessage,
          tag,
          isThinking,
          rolePlay,
          callback: (aiTalks: Screenplay[]): boolean => {
            // Generate & play audio for each sentence, display responses
            if (streamIdx !== this.currentStreamIdx) {
              console.log("wrong stream idx");
              return true; // should break
            }

            if (!isThinking) {
              this.ttsJobs.enqueue({
                screenplay: aiTalks[0],
                streamIdx: streamIdx,
              });
            } 

            // thought bubble
            this.thoughtBubbleMessage(isThinking, aiTalks[0].text);
            
            if (!firstSentenceEncountered) {
              console.timeEnd("performance_time_to_first_sentence");
              firstSentenceEncountered = true;
            }

            return false; // normal processing
          },
        });

        sentences = proc.sentences;
        aiTextLog = proc.aiTextLog;
        receivedMessage = proc.receivedMessage;
        tag = proc.tag;
        isThinking = proc.isThinking;
        rolePlay = proc.rolePlay;
        if (proc.shouldBreak) {
          break;
        }
      }
    } catch (e: any) {
      const errMsg = e.toString();
      this.bubbleMessage!("assistant", errMsg);
      console.error(errMsg);
    } finally {
      if (!reader.closed) {
        reader.releaseLock();
      }
      console.timeEnd("chat stream processing");
      if (streamIdx === this.currentStreamIdx) {
        this.setChatProcessing!(false);
      }
    }

    return aiTextLog;
  }

  async fetchAudio(talk: Talk): Promise<ArrayBuffer | null> {
    // TODO we should remove non-speakable characters
    // since this depends on the tts backend, we should do it
    // in their respective functions
    // this is just a simple solution for now
    talk = cleanTalk(talk);
    if (talk.message.trim() === "" || config("tts_muted") === "true") {
      return null;
    }

    const rvcEnabled = config("rvc_enabled") === "true";

    try {
      switch (config("tts_backend")) {
        case "none": {
          return null;
        }
        case "elevenlabs": {
          const voiceId = config("elevenlabs_voiceid");
          const { elevenlabs } = await import("@/features/elevenlabs/elevenlabs");
          const voice = await elevenlabs(talk.message, voiceId, talk.style);
          if (rvcEnabled) {
            return await this.handleRvc(voice.audio);
          }
          return voice.audio;
        }
        case "speecht5": {
          const speakerEmbeddingUrl = config("speecht5_speaker_embedding_url");
          const { speecht5 } = await import("@/features/speecht5/speecht5");
          const voice = await speecht5(talk.message, speakerEmbeddingUrl);
          if (rvcEnabled) {
            return await this.handleRvc(voice.audio);
          }
          return voice.audio;
        }
        case "openai_tts": {
          const { openaiTTS } = await import("@/features/openaiTTS/openaiTTS");
          const voice = await openaiTTS(talk.message);
          if (rvcEnabled) {
            return await this.handleRvc(voice.audio);
          }
          return voice.audio;
        }
        case "localXTTS": {
          const { localXTTSTTS } = await import("@/features/localXTTS/localXTTS");
          const voice = await localXTTSTTS(talk.message);
          if (rvcEnabled) {
            return await this.handleRvc(voice.audio);
          }
          return voice.audio;
        }
        case "piper": {
          const { piper } = await import("@/features/piper/piper");
          const voice = await piper(talk.message);
          if (rvcEnabled) {
            return await this.handleRvc(voice.audio);
          }
          return voice.audio;
        }
        case "coquiLocal": {
          const { coquiLocal } = await import("@/features/coquiLocal/coquiLocal");
          const voice = await coquiLocal(talk.message);
          return voice.audio;
        }
        case "kokoro": {
          const { kokoro } = await import("../kokoro/kokoro");
          const voice = await kokoro(talk.message);
          return voice.audio;
        }
      }
    } catch (e: any) {
      console.error(e.toString());
      this.alert?.error("Failed to get TTS response", e.toString());
    }

    return null;
  }

  public async getChatResponseStream(messages: Message[]) {
    console.debug("getChatResponseStream", messages);
    const chatbotBackend = config("chatbot_backend");

    // Extract the system prompt and convo messages
    const systemPrompt = messages.find((msg) => msg.role === "system")!;
    const conversationMessages = messages.filter((msg) => msg.role !== "system");

    if (config("reasoning_engine_enabled") === "true") {
      const { getReasoingEngineChatResponseStream } = await import("./reasoiningEngineChat");
      return getReasoingEngineChatResponseStream(systemPrompt, conversationMessages)
    } 

    switch (chatbotBackend) {
      case "arbius_llm": {
        const { getArbiusChatResponseStream } = await import("./arbiusChat");
        return getArbiusChatResponseStream(messages);
      }
      case "chatgpt":
      case "psfn": {
        const { getOpenAiChatResponseStream } = await import("./openAiChat");
        return getOpenAiChatResponseStream(messages);
      }
      case "psfn_conduit":
        throw new Error("PSFN conduit mode uses Satellite Hub websocket; local chat streaming is disabled.");
      case "llamacpp": {
        const { getLlamaCppChatResponseStream } = await import("./llamaCppChat");
        return getLlamaCppChatResponseStream(messages);
      }
      case "windowai": {
        const { getWindowAiChatResponseStream } = await import("./windowAiChat");
        return getWindowAiChatResponseStream(messages);
      }
      case "ollama": {
        const { getOllamaChatResponseStream } = await import("./ollamaChat");
        return getOllamaChatResponseStream(messages);
      }
      case "koboldai": {
        const { getKoboldAiChatResponseStream } = await import("./koboldAiChat");
        return getKoboldAiChatResponseStream(messages);
      }
      case 'openrouter': {
        const { getOpenRouterChatResponseStream } = await import("./openRouterChat");
        return getOpenRouterChatResponseStream(messages);
      }
    }

    const { getEchoChatResponseStream } = await import("./echoChat");
    return getEchoChatResponseStream(messages);
  }

  public async getVisionResponse(imageData: string) {
    try {
      const validationError = validateVisionImageBase64(imageData);
      if (validationError) {
        this.alert?.error("Vision capture rejected", validationError);
        return;
      }

      const visionRoute = resolveVisionRoute({
        psfnConduitMode: isPsfnConduitMode(),
        psfnVisionUploadEnabled: config("psfn_vision_upload_enabled") === "true",
      });
      if (visionRoute.type !== "legacy_local") {
        console.warn(visionRoute.reason);
        this.alert?.error("PSFN vision unavailable", visionRoute.reason);
        return;
      }

      const visionBackend = config("vision_backend");

      console.debug("vision_backend", visionBackend);

      let res = "";
      if (visionBackend === "vision_llamacpp") {
        const { getLlavaCppChatResponse } = await import("./llamaCppChat");
        const messages: Message[] = [
          { role: "system", content: config("vision_system_prompt") },
          ...this.messageList!,
          {
            role: "user",
            content: "Describe the image as accurately as possible",
          },
        ];

        res = await getLlavaCppChatResponse(messages, imageData);
      } else if (visionBackend === "vision_ollama") {
        const { getOllamaVisionChatResponse } = await import("./ollamaChat");
        const messages: Message[] = [
          { role: "system", content: config("vision_system_prompt") },
          ...this.messageList!,
          {
            role: "user",
            content: "Describe the image as accurately as possible",
          },
        ];

        res = await getOllamaVisionChatResponse(messages, imageData);
      } else if (visionBackend === "vision_openai") {
        const { getOpenAiVisionChatResponse } = await import("./openAiChat");
        const messages: Message[] = [
          { role: "user", content: config("vision_system_prompt") },
          ...this.messageList! as any[],
          {
            role: "user",
            // @ts-ignore normally this is a string
            content: [
              {
                type: "text",
                text: "Describe the image as accurately as possible",
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${imageData}`,
                },
              },
            ],
          },
        ];

        res = await getOpenAiVisionChatResponse(messages);
      } else {
        console.warn("vision_backend not supported", visionBackend);
        return;
      }

      await this.makeAndHandleStream([
        { role: "system", content: config("system_prompt") },
        ...this.messageList!,
        {
          role: "user",
          content: `This is a picture I just took from my webcam (described between [[ and ]] ): [[${res}]] Please respond accordingly and as if it were just sent and as though you can see it.`,
        },
      ]);
    } catch (e: any) {
      console.error("getVisionResponse", e.toString());
      this.alert?.error("Failed to get vision response", e.toString());
    }
  }
}

function decodeBase64Audio(encoded: string): ArrayBuffer {
  return decodeBase64AudioChunks([encoded]);
}

function decodeBase64AudioChunks(encodedChunks: string[]): ArrayBuffer {
  const chunks = encodedChunks.map((encoded) => decodeBase64Bytes(encoded));
  const byteLength = chunks.reduce((total, chunk) => total + chunk.byteLength, 0);
  const combined = new Uint8Array(byteLength);
  let offset = 0;

  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return combined.buffer;
}

function decodeBase64Bytes(encoded: string): Uint8Array {
  const binary = window.atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}
