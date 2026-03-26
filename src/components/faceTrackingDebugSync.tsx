import { useContext, useEffect } from "react";

import type { FaceTrackingDebugState } from "@/features/faceTracking/types";
import { ViewerContext } from "@/features/vrmViewer/viewerContext";

const DEBUG_STATE_URL = "http://127.0.0.1:3001/api/state";
const POLL_INTERVAL_MS = 350;

export function FaceTrackingDebugSync() {
  const { viewer } = useContext(ViewerContext);

  useEffect(() => {
    let cancelled = false;
    let timer = 0;

    const poll = async () => {
      try {
        const response = await fetch(DEBUG_STATE_URL, {
          cache: "no-store",
        });
        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as Partial<FaceTrackingDebugState>;
        if (!cancelled && payload.tuning) {
          viewer.setTrackedFaceDebugTuning(payload.tuning);
        }
      } catch {
        // Ignore transient debug-server outages while the tracker restarts.
      } finally {
        if (!cancelled) {
          timer = window.setTimeout(poll, POLL_INTERVAL_MS);
        }
      }
    };

    void poll();

    return () => {
      cancelled = true;
      if (timer) {
        window.clearTimeout(timer);
      }
    };
  }, [viewer]);

  return null;
}
