import { useContext, useEffect } from "react";

import type { SatelliteBridgeEvent } from "@/features/psfnSatelliteBridge/types";
import { ViewerContext } from "@/features/vrmViewer/viewerContext";
import { config } from "@/utils/config";

const RECONNECT_DELAY_MS = 500;

export function FaceTrackingBridge() {
  const { viewer } = useContext(ViewerContext);

  useEffect(() => {
    let closed = false;
    let eventSource: EventSource | null = null;
    let reconnectTimer = 0;
    const sessionId = config("psfn_channel_id").trim();

    const connect = () => {
      if (closed) {
        return;
      }

      eventSource = new EventSource("/api/satelliteBridge/");
      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data) as SatelliteBridgeEvent;
          if (payload.data.sessionId !== sessionId) {
            return;
          }

          if (payload.type === "face.target") {
            viewer.setTrackedFaceTarget({
              x: payload.data.x,
              y: payload.data.y,
              confidence: payload.data.confidence,
            });
            return;
          }

          if (payload.type === "face.clear") {
            viewer.setTrackedFaceTarget(null);
          }
        } catch (error) {
          console.error("Error parsing face tracking bridge event:", error);
        }
      };
      eventSource.onerror = (error) => {
        console.error("Error in face tracking bridge connection:", error);
        eventSource?.close();
        eventSource = null;
        if (!closed) {
          reconnectTimer = window.setTimeout(connect, RECONNECT_DELAY_MS);
        }
      };
    };

    connect();

    return () => {
      closed = true;
      if (reconnectTimer) {
        window.clearTimeout(reconnectTimer);
      }
      eventSource?.close();
      viewer.resetTrackedFaceTracking();
    };
  }, [viewer]);

  return null;
}
