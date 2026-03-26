import { useContext, useEffect } from "react";

import { ensureFaceCascade, loadOpenCv } from "@/features/faceTracking/opencv";
import type { NormalizedFaceTarget } from "@/features/faceTracking/types";
import { ViewerContext } from "@/features/vrmViewer/viewerContext";

const DETECTION_WIDTH = 160;
const DETECTION_HEIGHT = 120;
const DETECTION_INTERVAL_MS = 90;
const MIN_FACE_SIZE_RATIO = 0.18;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function pickLargestFace(faces: any): NormalizedFaceTarget | null {
  let largestRect: any = null;
  let largestArea = 0;

  for (let index = 0; index < faces.size(); index += 1) {
    const rect = faces.get(index);
    const area = rect.width * rect.height;
    if (area > largestArea) {
      largestArea = area;
      largestRect = rect;
    }
  }

  if (!largestRect || largestArea <= 0) {
    return null;
  }

  const centerX = largestRect.x + largestRect.width / 2;
  const centerY = largestRect.y + largestRect.height / 2;
  const normalizedX = ((centerX / DETECTION_WIDTH) - 0.5) * 2;
  const normalizedY = (0.5 - (centerY / DETECTION_HEIGHT)) * 2;
  const confidence = clamp(largestArea / (DETECTION_WIDTH * DETECTION_HEIGHT * 0.14), 0, 1);

  return {
    x: clamp(normalizedX, -1, 1),
    y: clamp(normalizedY, -1, 1),
    confidence,
  };
}

export function FaceTrackingCamera() {
  const { viewer } = useContext(ViewerContext);

  useEffect(() => {
    const frameCanvas = document.createElement("canvas");
    frameCanvas.width = DETECTION_WIDTH;
    frameCanvas.height = DETECTION_HEIGHT;
    const frameContext = frameCanvas.getContext("2d", { willReadFrequently: true });
    if (!frameContext) {
      return undefined;
    }

    let cancelled = false;
    let animationFrameId = 0;
    let mediaStream: MediaStream | null = null;
    let videoElement: HTMLVideoElement | null = null;
    let classifier: any = null;
    let minSize: any = null;
    let maxSize: any = null;

    const cleanup = () => {
      if (animationFrameId) {
        window.cancelAnimationFrame(animationFrameId);
      }
      viewer.resetTrackedFaceTracking();
      classifier?.delete?.();
      minSize?.delete?.();
      maxSize?.delete?.();
      if (videoElement) {
        videoElement.pause();
        videoElement.srcObject = null;
      }
      mediaStream?.getTracks().forEach((track) => track.stop());
    };

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("getUserMedia is not available in this browser.");
      }

      mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: "user",
          width: { ideal: 320 },
          height: { ideal: 240 },
          frameRate: { ideal: 15, max: 15 },
        },
      });

      if (cancelled) {
        mediaStream.getTracks().forEach((track) => track.stop());
        return;
      }

      videoElement = document.createElement("video");
      videoElement.autoplay = true;
      videoElement.muted = true;
      videoElement.playsInline = true;
      videoElement.srcObject = mediaStream;
      await videoElement.play();

      const cv = await loadOpenCv();
      const cascadePath = await ensureFaceCascade(cv);
      if (cancelled) {
        return;
      }

      classifier = new cv.CascadeClassifier();
      if (!classifier.load(cascadePath)) {
        throw new Error("Failed to initialize the OpenCV face cascade.");
      }

      minSize = new cv.Size(
        Math.round(DETECTION_WIDTH * MIN_FACE_SIZE_RATIO),
        Math.round(DETECTION_HEIGHT * MIN_FACE_SIZE_RATIO),
      );
      maxSize = new cv.Size();

      let lastDetectionAt = 0;
      const loop = (timestamp: number) => {
        if (cancelled) {
          return;
        }

        animationFrameId = window.requestAnimationFrame(loop);
        if (timestamp - lastDetectionAt < DETECTION_INTERVAL_MS) {
          return;
        }
        lastDetectionAt = timestamp;

        if (!videoElement || videoElement.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA) {
          return;
        }

        frameContext.drawImage(videoElement, 0, 0, DETECTION_WIDTH, DETECTION_HEIGHT);
        const imageData = frameContext.getImageData(0, 0, DETECTION_WIDTH, DETECTION_HEIGHT);
        const source = cv.matFromImageData(imageData);
        const grayscale = new cv.Mat();
        const faces = new cv.RectVector();

        try {
          cv.cvtColor(source, grayscale, cv.COLOR_RGBA2GRAY);
          cv.equalizeHist(grayscale, grayscale);
          classifier.detectMultiScale(grayscale, faces, 1.12, 3, 0, minSize, maxSize);
          viewer.setTrackedFaceTarget(pickLargestFace(faces));
        } catch (error) {
          console.error("Face tracking frame failed:", error);
          viewer.setTrackedFaceTarget(null);
        } finally {
          source.delete();
          grayscale.delete();
          faces.delete();
        }
      };

      animationFrameId = window.requestAnimationFrame(loop);
    };

    void start().catch((error) => {
      console.error("Face tracking unavailable:", error);
      viewer.resetTrackedFaceTracking();
    });

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [viewer]);

  return null;
}
