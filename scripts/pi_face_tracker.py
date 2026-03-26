#!/usr/bin/env python3
import json
import os
import signal
import sys
import threading
import time
import urllib.error
import urllib.request
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import cv2
import numpy as np


BRIDGE_URL = os.environ.get(
    "AMICA_FACE_TRACKING_URL",
    "http://127.0.0.1:3000/api/satelliteBridge/",
).strip()
BRIDGE_TOKEN = os.environ.get("AMICA_BRIDGE_TOKEN", "").strip()
SESSION_ID = (
    os.environ.get("AMICA_FACE_TRACKING_SESSION_ID")
    or os.environ.get("NEXT_PUBLIC_PSFN_CHANNEL_ID")
    or "psfn-face-tracker"
).strip()
CAMERA_INDEX = int(os.environ.get("AMICA_FACE_TRACKING_CAMERA_INDEX", "0"))
CAPTURE_WIDTH = int(os.environ.get("AMICA_FACE_TRACKING_WIDTH", "320"))
CAPTURE_HEIGHT = int(os.environ.get("AMICA_FACE_TRACKING_HEIGHT", "240"))
DETECTION_WIDTH = int(os.environ.get("AMICA_FACE_TRACKING_DETECTION_WIDTH", "160"))
DETECTION_HEIGHT = int(os.environ.get("AMICA_FACE_TRACKING_DETECTION_HEIGHT", "120"))
TARGET_FPS = float(os.environ.get("AMICA_FACE_TRACKING_FPS", "8"))
MIN_FACE_RATIO = float(os.environ.get("AMICA_FACE_TRACKING_MIN_FACE_RATIO", "0.2"))
STALE_CLEAR_SEC = float(os.environ.get("AMICA_FACE_TRACKING_STALE_CLEAR_SEC", "0.6"))
RESEND_SEC = float(os.environ.get("AMICA_FACE_TRACKING_RESEND_SEC", "0.35"))
MOVEMENT_EPSILON = float(os.environ.get("AMICA_FACE_TRACKING_MOVEMENT_EPSILON", "0.03"))
CONFIDENCE_EPSILON = float(os.environ.get("AMICA_FACE_TRACKING_CONFIDENCE_EPSILON", "0.08"))
DEBUG_BIND_HOST = os.environ.get("AMICA_FACE_TRACKING_DEBUG_BIND_HOST", "0.0.0.0").strip()
DEBUG_PORT = int(os.environ.get("AMICA_FACE_TRACKING_DEBUG_PORT", "3001"))
MIC_CONTROL_URL = os.environ.get("AMICA_FACE_TRACKING_MIC_CONTROL_URL", "http://127.0.0.1:8790/mic").strip()
DEBUG_STATE_PATH = os.environ.get(
    "AMICA_FACE_TRACKING_DEBUG_STATE_PATH",
    os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "runtime", "face_tracking_debug.json")
    ),
).strip()
JPEG_QUALITY = int(os.environ.get("AMICA_FACE_TRACKING_DEBUG_JPEG_QUALITY", "75"))
YOLO_MODEL_PATH = os.environ.get(
    "AMICA_FACE_TRACKING_YOLO_MODEL_PATH",
    os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "models", "yolo26n-pose-320.onnx")
    ),
).strip()
YOLO_INPUT_SIZE = int(os.environ.get("AMICA_FACE_TRACKING_YOLO_INPUT_SIZE", "320"))
YOLO_CONFIDENCE = float(os.environ.get("AMICA_FACE_TRACKING_YOLO_CONFIDENCE", "0.4"))
YOLO_FACE_KEYPOINT_CONFIDENCE = float(
    os.environ.get("AMICA_FACE_TRACKING_YOLO_FACE_KEYPOINT_CONFIDENCE", "0.35")
)
YOLO_NMS_THRESHOLD = float(os.environ.get("AMICA_FACE_TRACKING_YOLO_NMS_THRESHOLD", "0.45"))
DETECTOR_NAME = "Ultralytics YOLO26n-pose (ONNX)"
FACE_KEYPOINT_INDEXES = {
    "nose": 0,
    "left_eye": 1,
    "right_eye": 2,
    "left_ear": 3,
    "right_ear": 4,
}

DEFAULT_TUNING = {
    "bodyYaw": 0.7,
    "headYaw": 0.42,
    "headPitch": 0.26,
    "cameraPositionX": 0.018,
    "cameraPositionY": 0.028,
    "cameraTargetX": 0.06,
    "cameraTargetY": 0.04,
    "eyeX": 0.08,
    "eyeY": 0.08,
    "lookAtZ": -1.8,
    "cameraSmoothing": 5.0,
    "bodySmoothing": 5.5,
    "headSmoothing": 7.0,
    "lookAtSmoothing": 7.0,
}

TUNING_LIMITS = {
    "bodyYaw": (0.0, 1.5),
    "headYaw": (0.0, 1.2),
    "headPitch": (0.0, 0.8),
    "cameraPositionX": (0.0, 0.2),
    "cameraPositionY": (0.0, 0.2),
    "cameraTargetX": (0.0, 0.25),
    "cameraTargetY": (0.0, 0.2),
    "eyeX": (0.0, 0.3),
    "eyeY": (0.0, 0.3),
    "lookAtZ": (-3.0, -0.5),
    "cameraSmoothing": (1.0, 12.0),
    "bodySmoothing": (1.0, 12.0),
    "headSmoothing": (1.0, 12.0),
    "lookAtSmoothing": (1.0, 12.0),
}

DEBUG_PAGE_HTML = """<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Amica Tracker Debug</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #0f1419;
      --panel: #19212b;
      --panel-2: #232d3a;
      --text: #f3f6fb;
      --muted: #93a2b7;
      --accent: #ff8a3d;
      --accent-2: #6ed0ff;
      --border: #2d3948;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "IBM Plex Sans", "Segoe UI", sans-serif;
      background:
        radial-gradient(circle at top right, rgba(255, 138, 61, 0.16), transparent 26%),
        radial-gradient(circle at top left, rgba(110, 208, 255, 0.12), transparent 24%),
        var(--bg);
      color: var(--text);
    }
    main {
      max-width: 1280px;
      margin: 0 auto;
      padding: 20px;
      display: grid;
      gap: 20px;
    }
    .hero {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: flex-start;
      padding: 18px 20px;
      border: 1px solid var(--border);
      border-radius: 20px;
      background: rgba(25, 33, 43, 0.88);
      backdrop-filter: blur(12px);
    }
    .hero h1 {
      margin: 0 0 6px;
      font-size: 28px;
      line-height: 1.1;
    }
    .hero p {
      margin: 0;
      color: var(--muted);
      max-width: 720px;
    }
    .pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border-radius: 999px;
      background: rgba(110, 208, 255, 0.12);
      border: 1px solid rgba(110, 208, 255, 0.28);
      color: var(--accent-2);
      font-size: 13px;
      white-space: nowrap;
    }
    .grid {
      display: grid;
      grid-template-columns: minmax(0, 2fr) minmax(320px, 1fr);
      gap: 20px;
    }
    .panel {
      border: 1px solid var(--border);
      border-radius: 20px;
      background: rgba(25, 33, 43, 0.92);
      padding: 16px;
    }
    .panel h2 {
      margin: 0 0 14px;
      font-size: 16px;
      letter-spacing: 0.02em;
      text-transform: uppercase;
      color: var(--muted);
    }
    .feed {
      width: 100%;
      display: block;
      border-radius: 14px;
      border: 1px solid var(--border);
      background: #000;
    }
    .stats {
      margin-top: 16px;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 12px;
    }
    .stat {
      background: var(--panel-2);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 12px;
    }
    .label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--muted);
      margin-bottom: 6px;
    }
    .value {
      font-size: 15px;
      font-weight: 600;
    }
    .controls {
      display: grid;
      gap: 12px;
    }
    .control {
      padding: 12px;
      border-radius: 14px;
      border: 1px solid var(--border);
      background: var(--panel-2);
    }
    .control-head {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 8px;
    }
    .control label {
      font-size: 14px;
      font-weight: 600;
    }
    .control output {
      color: var(--accent);
      font-variant-numeric: tabular-nums;
    }
    input[type=range] {
      width: 100%;
      accent-color: var(--accent);
    }
    .toolbar {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      margin-top: 14px;
    }
    button {
      border: 1px solid var(--border);
      border-radius: 12px;
      background: linear-gradient(180deg, rgba(255, 138, 61, 0.18), rgba(255, 138, 61, 0.08));
      color: var(--text);
      padding: 10px 14px;
      font: inherit;
      cursor: pointer;
    }
    button.secondary {
      background: rgba(110, 208, 255, 0.08);
      border-color: rgba(110, 208, 255, 0.2);
    }
    .footer {
      color: var(--muted);
      font-size: 12px;
    }
    @media (max-width: 960px) {
      .grid {
        grid-template-columns: 1fr;
      }
      .hero {
        flex-direction: column;
      }
    }
  </style>
</head>
<body>
  <main>
    <section class="hero">
      <div>
        <h1>Amica Tracker Debug</h1>
        <p>
          Native tracker owns the camera. This page is the raw OpenCV feed and live tuning surface for torso, head,
          eyes, and camera response. Detector: native Ultralytics YOLO26 pose on the Pi.
        </p>
      </div>
      <div class="pill" id="detector-pill">Detector: loading</div>
    </section>

    <section class="grid">
      <div class="panel">
        <h2>Camera Feed</h2>
        <img class="feed" id="feed" src="/stream.mjpg" alt="Tracker feed">
        <div class="stats">
          <div class="stat">
            <div class="label">Target</div>
            <div class="value" id="target-value">waiting</div>
          </div>
          <div class="stat">
            <div class="label">Face Box</div>
            <div class="value" id="face-box-value">waiting</div>
          </div>
          <div class="stat">
            <div class="label">Session</div>
            <div class="value" id="session-value">waiting</div>
          </div>
          <div class="stat">
            <div class="label">Mic</div>
            <div class="value" id="mic-value">waiting</div>
          </div>
        </div>
        <div class="toolbar">
          <button id="mic-toggle" type="button">Toggle Mic</button>
          <button class="secondary" id="refresh-button" type="button">Refresh State</button>
        </div>
      </div>

      <div class="panel">
        <h2>Live Tuning</h2>
        <div class="controls" id="controls"></div>
      </div>
    </section>

    <div class="footer">
      The feed is native tracker output. Chromium should stay out of camera capture entirely.
    </div>
  </main>

  <script>
    const sliderDefs = [
      { key: "bodyYaw", label: "Torso Yaw", min: 0, max: 1.5, step: 0.01 },
      { key: "headYaw", label: "Head Yaw", min: 0, max: 1.2, step: 0.01 },
      { key: "headPitch", label: "Head Pitch", min: 0, max: 0.8, step: 0.01 },
      { key: "cameraPositionX", label: "Camera Side Shift", min: 0, max: 0.2, step: 0.001 },
      { key: "cameraPositionY", label: "Camera Vertical Shift", min: 0, max: 0.2, step: 0.001 },
      { key: "cameraTargetX", label: "Camera Target X", min: 0, max: 0.25, step: 0.001 },
      { key: "cameraTargetY", label: "Camera Target Y", min: 0, max: 0.2, step: 0.001 },
      { key: "eyeX", label: "Eye X", min: 0, max: 0.3, step: 0.001 },
      { key: "eyeY", label: "Eye Y", min: 0, max: 0.3, step: 0.001 },
      { key: "lookAtZ", label: "LookAt Z", min: -3, max: -0.5, step: 0.01 },
      { key: "cameraSmoothing", label: "Camera Smoothing", min: 1, max: 12, step: 0.1 },
      { key: "bodySmoothing", label: "Torso Smoothing", min: 1, max: 12, step: 0.1 },
      { key: "headSmoothing", label: "Head Smoothing", min: 1, max: 12, step: 0.1 },
      { key: "lookAtSmoothing", label: "Eye Smoothing", min: 1, max: 12, step: 0.1 },
    ];

    const controlsNode = document.getElementById("controls");
    const detectorPill = document.getElementById("detector-pill");
    const targetValue = document.getElementById("target-value");
    const faceBoxValue = document.getElementById("face-box-value");
    const sessionValue = document.getElementById("session-value");
    const micValue = document.getElementById("mic-value");
    const micToggle = document.getElementById("mic-toggle");
    const refreshButton = document.getElementById("refresh-button");

    let tuning = null;
    let lastMic = null;
    let saveTimer = 0;

    function fmt(value, digits = 3) {
      return Number(value).toFixed(digits);
    }

    function renderControls(nextTuning) {
      if (!tuning) {
        tuning = { ...nextTuning };
        controlsNode.innerHTML = sliderDefs.map((def) => (
          '<div class="control">' +
            '<div class="control-head">' +
              '<label for="' + def.key + '">' + def.label + '</label>' +
              '<output id="' + def.key + '-out"></output>' +
            '</div>' +
            '<input type="range" id="' + def.key + '" min="' + def.min + '" max="' + def.max + '" step="' + def.step + '">' +
          '</div>'
        )).join("");

        sliderDefs.forEach((def) => {
          const input = document.getElementById(def.key);
          input.addEventListener("input", () => {
            tuning[def.key] = Number(input.value);
            document.getElementById(def.key + "-out").textContent = fmt(tuning[def.key]);
            queueSave();
          });
        });
      }

      tuning = { ...tuning, ...nextTuning };
      sliderDefs.forEach((def) => {
        const input = document.getElementById(def.key);
        const output = document.getElementById(def.key + "-out");
        if (!input || !output) {
          return;
        }
        input.value = String(tuning[def.key]);
        output.textContent = fmt(tuning[def.key]);
      });
    }

    function queueSave() {
      window.clearTimeout(saveTimer);
      saveTimer = window.setTimeout(saveTuning, 120);
    }

    async function saveTuning() {
      if (!tuning) {
        return;
      }
      await fetch("/api/tuning", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(tuning),
      });
    }

    async function refreshState() {
      const response = await fetch("/api/state", { cache: "no-store" });
      const state = await response.json();

      detectorPill.textContent = "Detector: " + state.detector + (state.mirroredX ? " / X flipped for target" : "");
      sessionValue.textContent = state.sessionId;
      if (state.target) {
        targetValue.textContent = "x " + fmt(state.target.x) + " / y " + fmt(state.target.y) + " / c " + fmt(state.target.confidence);
      } else {
        targetValue.textContent = "no face";
      }
      if (state.faceBox) {
        faceBoxValue.textContent = state.faceBox.x + ", " + state.faceBox.y + " / " + state.faceBox.width + "x" + state.faceBox.height;
      } else {
        faceBoxValue.textContent = "no box";
      }

      lastMic = state.mic || null;
      micValue.textContent = lastMic ? (lastMic.muted ? "muted" : "live") : "unavailable";
      micToggle.disabled = !lastMic;

      renderControls(state.tuning);
    }

    async function toggleMic() {
      if (!lastMic) {
        return;
      }
      const response = await fetch("/api/mic", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ muted: !lastMic.muted }),
      });
      lastMic = await response.json();
      micValue.textContent = lastMic.muted ? "muted" : "live";
    }

    micToggle.addEventListener("click", () => { void toggleMic(); });
    refreshButton.addEventListener("click", () => { void refreshState(); });

    void refreshState();
    window.setInterval(() => { void refreshState(); }, 500);
  </script>
</body>
</html>
"""

RUNNING = True
STATE_LOCK = threading.Lock()
FRAME_CONDITION = threading.Condition(STATE_LOCK)
LATEST_JPEG: bytes | None = None
FRAME_SEQUENCE = 0
DEBUG_STATE = {
    "detector": DETECTOR_NAME,
    "sessionId": SESSION_ID,
    "mirroredX": False,
    "target": None,
    "faceBox": None,
    "frameSize": {
        "width": CAPTURE_WIDTH,
        "height": CAPTURE_HEIGHT,
    },
    "updatedAt": 0,
    "tuning": dict(DEFAULT_TUNING),
}


def clamp(value: float, minimum: float, maximum: float) -> float:
    return max(minimum, min(maximum, value))


def signal_handler(_signum, _frame):
    global RUNNING
    RUNNING = False
    with FRAME_CONDITION:
        FRAME_CONDITION.notify_all()


def post_event(event_type: str, data: dict) -> None:
    payload = json.dumps({"type": event_type, "data": data}).encode("utf-8")
    request = urllib.request.Request(
        BRIDGE_URL,
        data=payload,
        method="POST",
        headers={
            "Content-Type": "application/json",
            "X-Amica-Bridge-Token": BRIDGE_TOKEN,
        },
    )
    with urllib.request.urlopen(request, timeout=2) as response:
        response.read()


def make_capture() -> cv2.VideoCapture:
    capture = cv2.VideoCapture(CAMERA_INDEX, cv2.CAP_V4L2)
    capture.set(cv2.CAP_PROP_FRAME_WIDTH, CAPTURE_WIDTH)
    capture.set(cv2.CAP_PROP_FRAME_HEIGHT, CAPTURE_HEIGHT)
    capture.set(cv2.CAP_PROP_FPS, TARGET_FPS)
    capture.set(cv2.CAP_PROP_BUFFERSIZE, 1)
    return capture


def resolve_yolo_model_path() -> str | None:
    if YOLO_MODEL_PATH and os.path.exists(YOLO_MODEL_PATH):
        return YOLO_MODEL_PATH
    return None


def prepare_yolo_input(frame: np.ndarray) -> tuple[np.ndarray, float, int, int]:
    frame_height, frame_width = frame.shape[:2]
    scale = min(YOLO_INPUT_SIZE / frame_width, YOLO_INPUT_SIZE / frame_height)
    resized_width = max(1, int(round(frame_width * scale)))
    resized_height = max(1, int(round(frame_height * scale)))
    pad_x = (YOLO_INPUT_SIZE - resized_width) // 2
    pad_y = (YOLO_INPUT_SIZE - resized_height) // 2

    resized = cv2.resize(frame, (resized_width, resized_height))
    canvas = np.full((YOLO_INPUT_SIZE, YOLO_INPUT_SIZE, 3), 114, dtype=np.uint8)
    canvas[pad_y : pad_y + resized_height, pad_x : pad_x + resized_width] = resized
    return canvas, scale, pad_x, pad_y


def map_to_frame(
    raw_x: float,
    raw_y: float,
    scale: float,
    pad_x: int,
    pad_y: int,
    frame_width: int,
    frame_height: int,
) -> tuple[float, float]:
    frame_x = (raw_x - pad_x) / scale
    frame_y = (raw_y - pad_y) / scale
    return (
        clamp(frame_x, 0.0, frame_width - 1.0),
        clamp(frame_y, 0.0, frame_height - 1.0),
    )


class YoloPoseDetector:
    def __init__(self, model_path: str):
        self.net = cv2.dnn.readNetFromONNX(model_path)
        self.net.setPreferableBackend(cv2.dnn.DNN_BACKEND_OPENCV)
        self.net.setPreferableTarget(cv2.dnn.DNN_TARGET_CPU)

    def detect(self, frame: np.ndarray) -> tuple[dict | None, dict | None]:
        frame_height, frame_width = frame.shape[:2]
        input_frame, scale, pad_x, pad_y = prepare_yolo_input(frame)
        blob = cv2.dnn.blobFromImage(
            input_frame,
            scalefactor=1.0 / 255.0,
            size=(YOLO_INPUT_SIZE, YOLO_INPUT_SIZE),
            swapRB=True,
            crop=False,
        )
        self.net.setInput(blob)
        output = self.net.forward()
        return pick_largest_face(output, frame_width, frame_height, scale, pad_x, pad_y)


def ensure_state_dir() -> None:
    os.makedirs(os.path.dirname(DEBUG_STATE_PATH), exist_ok=True)


def sanitize_tuning(raw_tuning: dict | None) -> dict:
    tuning = dict(DEFAULT_TUNING)
    if not isinstance(raw_tuning, dict):
        return tuning

    for key, (minimum, maximum) in TUNING_LIMITS.items():
        value = raw_tuning.get(key)
        if isinstance(value, (int, float)):
            tuning[key] = clamp(float(value), minimum, maximum)
    return tuning


def load_tuning() -> dict:
    ensure_state_dir()
    if not os.path.exists(DEBUG_STATE_PATH):
        return dict(DEFAULT_TUNING)

    try:
        with open(DEBUG_STATE_PATH, "r", encoding="utf-8") as handle:
            return sanitize_tuning(json.load(handle))
    except Exception as error:
        print(f"Failed to load face tracking debug tuning: {error}", file=sys.stderr)
        return dict(DEFAULT_TUNING)


def save_tuning(tuning: dict) -> None:
    ensure_state_dir()
    with open(DEBUG_STATE_PATH, "w", encoding="utf-8") as handle:
        json.dump(tuning, handle, indent=2, sort_keys=True)


def update_tuning(raw_tuning: dict | None) -> dict:
    with FRAME_CONDITION:
        merged = dict(DEBUG_STATE["tuning"])
        if isinstance(raw_tuning, dict):
            merged.update(raw_tuning)
        tuning = sanitize_tuning(merged)
        DEBUG_STATE["tuning"] = tuning
    save_tuning(tuning)
    return tuning


def parse_face_points(
    row: np.ndarray,
    scale: float,
    pad_x: int,
    pad_y: int,
    frame_width: int,
    frame_height: int,
) -> dict[str, dict]:
    keypoints = row[5:].reshape(-1, 3)
    face_points: dict[str, dict] = {}
    for name, index in FACE_KEYPOINT_INDEXES.items():
        if index >= keypoints.shape[0]:
            continue
        raw_x, raw_y, confidence = keypoints[index]
        confidence = float(confidence)
        if confidence < YOLO_FACE_KEYPOINT_CONFIDENCE:
            continue
        mapped_x, mapped_y = map_to_frame(
            float(raw_x),
            float(raw_y),
            scale,
            pad_x,
            pad_y,
            frame_width,
            frame_height,
        )
        face_points[name] = {
            "x": mapped_x,
            "y": mapped_y,
            "confidence": confidence,
        }
    return face_points


def build_face_target(
    face_points: dict[str, dict],
    bbox: tuple[float, float, float, float],
    score: float,
    frame_width: int,
    frame_height: int,
) -> tuple[dict | None, dict | None, float]:
    primary_points = [
        face_points[name]
        for name in ("nose", "left_eye", "right_eye")
        if name in face_points
    ]
    if not primary_points:
        return None, None, 0.0

    all_points = [
        face_points[name]
        for name in ("nose", "left_eye", "right_eye", "left_ear", "right_ear")
        if name in face_points
    ]
    center_x = sum(point["x"] for point in primary_points) / len(primary_points)
    center_y = sum(point["y"] for point in primary_points) / len(primary_points)

    if "left_eye" in face_points and "right_eye" in face_points:
        eye_midpoint_x = (face_points["left_eye"]["x"] + face_points["right_eye"]["x"]) / 2.0
        eye_midpoint_y = (face_points["left_eye"]["y"] + face_points["right_eye"]["y"]) / 2.0
        center_x = (center_x * 0.55) + (eye_midpoint_x * 0.45)
        center_y = (center_y * 0.45) + (eye_midpoint_y * 0.55)

    x1, y1, width, height = bbox
    box_points = primary_points if len(primary_points) >= 2 else all_points
    if len(box_points) >= 2:
        xs = [point["x"] for point in box_points]
        ys = [point["y"] for point in box_points]
        spread_x = max(xs) - min(xs)
        spread_y = max(ys) - min(ys)
        face_size = max(spread_x * 2.25, spread_y * 3.0, min(width, height) * 0.32, 32.0)
    else:
        face_size = max(min(width, height) * 0.34, 32.0)
    face_size = min(face_size, max(48.0, min(width * 0.78, height * 0.62)))

    face_box_x = clamp(center_x - (face_size / 2.0), 0.0, max(0.0, frame_width - face_size))
    face_box_y = clamp(center_y - (face_size * 0.46), 0.0, max(0.0, frame_height - face_size))

    normalized_x = ((center_x / frame_width) - 0.5) * 2.0
    normalized_y = (0.5 - (center_y / frame_height)) * 2.0
    average_face_confidence = sum(point["confidence"] for point in primary_points) / len(primary_points)
    confidence = clamp(score * (0.65 + (0.35 * average_face_confidence)), 0.0, 1.0)
    ranking = score * width * height * (0.75 + (0.25 * len(primary_points)))

    return (
        {
            "x": round(clamp(normalized_x, -1.0, 1.0), 4),
            "y": round(clamp(normalized_y, -1.0, 1.0), 4),
            "confidence": round(confidence, 4),
        },
        {
            "x": int(round(face_box_x)),
            "y": int(round(face_box_y)),
            "width": int(round(face_size)),
            "height": int(round(face_size)),
        },
        ranking,
    )


def pick_largest_face(
    output: np.ndarray,
    frame_width: int,
    frame_height: int,
    scale: float,
    pad_x: int,
    pad_y: int,
) -> tuple[dict | None, dict | None]:
    if output is None:
        return None, None

    if output.ndim == 3:
        predictions = output[0].T if output.shape[1] < output.shape[2] else output[0]
    elif output.ndim == 2:
        predictions = output.T if output.shape[0] < output.shape[1] else output
    else:
        return None, None

    if predictions.shape[-1] < 15:
        return None, None

    boxes: list[list[int]] = []
    scores: list[float] = []
    candidates: list[tuple[tuple[float, float, float, float], np.ndarray, float]] = []

    for row in predictions:
        score = float(row[4])
        if score < YOLO_CONFIDENCE:
            continue

        center_x, center_y, width, height = [float(value) for value in row[:4]]
        if width <= 1.0 or height <= 1.0:
            continue

        raw_x1 = center_x - (width / 2.0)
        raw_y1 = center_y - (height / 2.0)
        raw_x2 = center_x + (width / 2.0)
        raw_y2 = center_y + (height / 2.0)
        mapped_x1, mapped_y1 = map_to_frame(raw_x1, raw_y1, scale, pad_x, pad_y, frame_width, frame_height)
        mapped_x2, mapped_y2 = map_to_frame(raw_x2, raw_y2, scale, pad_x, pad_y, frame_width, frame_height)
        mapped_width = max(1.0, mapped_x2 - mapped_x1)
        mapped_height = max(1.0, mapped_y2 - mapped_y1)

        boxes.append(
            [
                int(round(mapped_x1)),
                int(round(mapped_y1)),
                int(round(mapped_width)),
                int(round(mapped_height)),
            ]
        )
        scores.append(score)
        candidates.append(((mapped_x1, mapped_y1, mapped_width, mapped_height), row, score))

    if not boxes:
        return None, None

    indexes = cv2.dnn.NMSBoxes(boxes, scores, YOLO_CONFIDENCE, YOLO_NMS_THRESHOLD)
    if indexes is None or len(indexes) == 0:
        return None, None

    best_target = None
    best_face_box = None
    best_ranking = 0.0

    for index in np.array(indexes).reshape(-1):
        bbox, row, score = candidates[int(index)]
        face_points = parse_face_points(row, scale, pad_x, pad_y, frame_width, frame_height)
        target, face_box, ranking = build_face_target(face_points, bbox, score, frame_width, frame_height)
        if target is None or face_box is None:
            continue
        if ranking > best_ranking:
            best_target = target
            best_face_box = face_box
            best_ranking = ranking

    return best_target, best_face_box


def changed_enough(previous: dict | None, current: dict) -> bool:
    if previous is None:
        return True

    delta_x = abs(previous["x"] - current["x"])
    delta_y = abs(previous["y"] - current["y"])
    delta_confidence = abs(previous["confidence"] - current["confidence"])
    return (
        delta_x >= MOVEMENT_EPSILON
        or delta_y >= MOVEMENT_EPSILON
        or delta_confidence >= CONFIDENCE_EPSILON
    )


def scale_face_box(face_box: dict | None) -> dict | None:
    if not face_box:
        return None

    return {
        "x": int(round(face_box["x"])),
        "y": int(round(face_box["y"])),
        "width": int(round(face_box["width"])),
        "height": int(round(face_box["height"])),
    }


def update_debug_frame(frame, face_box: dict | None, target: dict | None) -> None:
    global LATEST_JPEG, FRAME_SEQUENCE

    display_frame = frame.copy()
    scaled_box = scale_face_box(face_box)

    cv2.line(
        display_frame,
        (CAPTURE_WIDTH // 2, 0),
        (CAPTURE_WIDTH // 2, CAPTURE_HEIGHT),
        (255, 140, 60),
        1,
    )
    cv2.line(
        display_frame,
        (0, CAPTURE_HEIGHT // 2),
        (CAPTURE_WIDTH, CAPTURE_HEIGHT // 2),
        (255, 140, 60),
        1,
    )

    if scaled_box:
        top_left = (scaled_box["x"], scaled_box["y"])
        bottom_right = (
            scaled_box["x"] + scaled_box["width"],
            scaled_box["y"] + scaled_box["height"],
        )
        cv2.rectangle(display_frame, top_left, bottom_right, (110, 208, 255), 2)

    label = "no face"
    if target:
        label = f"x {target['x']:+.3f} y {target['y']:+.3f} c {target['confidence']:.3f}"
    cv2.putText(
        display_frame,
        label,
        (10, CAPTURE_HEIGHT - 14),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.44,
        (255, 255, 255),
        1,
        cv2.LINE_AA,
    )

    ok, encoded = cv2.imencode(
        ".jpg",
        display_frame,
        [int(cv2.IMWRITE_JPEG_QUALITY), JPEG_QUALITY],
    )

    with FRAME_CONDITION:
        DEBUG_STATE["target"] = target
        DEBUG_STATE["faceBox"] = scaled_box
        DEBUG_STATE["frameSize"] = {
            "width": int(frame.shape[1]),
            "height": int(frame.shape[0]),
        }
        DEBUG_STATE["updatedAt"] = int(time.time() * 1000)
        if ok:
            LATEST_JPEG = encoded.tobytes()
            FRAME_SEQUENCE += 1
            FRAME_CONDITION.notify_all()


def read_json_body(handler: BaseHTTPRequestHandler) -> dict:
    content_length = int(handler.headers.get("Content-Length", "0"))
    raw = handler.rfile.read(content_length) if content_length > 0 else b"{}"
    payload = json.loads(raw.decode("utf-8") or "{}")
    if not isinstance(payload, dict):
        raise ValueError("Expected a JSON object.")
    return payload


def proxy_mic_request(method: str, payload: dict | None) -> tuple[int, bytes]:
    body = None
    headers = {}
    if payload is not None:
        body = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"

    request = urllib.request.Request(
        MIC_CONTROL_URL,
        data=body,
        method=method,
        headers=headers,
    )

    try:
        with urllib.request.urlopen(request, timeout=2) as response:
            return response.status, response.read()
    except urllib.error.HTTPError as error:
        return error.code, error.read()
    except Exception as error:
        return 503, json.dumps({"error": str(error)}).encode("utf-8")


def read_mic_state() -> dict | None:
    status, body = proxy_mic_request("GET", None)
    if status < 200 or status >= 300:
        return None

    try:
        payload = json.loads(body.decode("utf-8"))
        if isinstance(payload, dict):
            return payload
    except Exception:
        return None
    return None


def snapshot_state() -> dict:
    with STATE_LOCK:
        state = {
            "detector": DEBUG_STATE["detector"],
            "sessionId": DEBUG_STATE["sessionId"],
            "mirroredX": DEBUG_STATE["mirroredX"],
            "target": DEBUG_STATE["target"],
            "faceBox": DEBUG_STATE["faceBox"],
            "frameSize": dict(DEBUG_STATE["frameSize"]),
            "updatedAt": DEBUG_STATE["updatedAt"],
            "tuning": dict(DEBUG_STATE["tuning"]),
        }

    state["mic"] = read_mic_state()
    return state


class TrackerDebugHandler(BaseHTTPRequestHandler):
    server_version = "AmicaFaceTracker/1.0"

    def log_message(self, _format, *_args):
        return

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(HTTPStatus.NO_CONTENT)
        self.end_headers()

    def do_GET(self):
        path = self.path.split("?", 1)[0]
        if path in {"/", "/index.html"}:
            body = DEBUG_PAGE_HTML.encode("utf-8")
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return

        if path == "/api/state":
            payload = json.dumps(snapshot_state()).encode("utf-8")
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
            return

        if path == "/api/tuning":
            payload = json.dumps({"tuning": snapshot_state()["tuning"]}).encode("utf-8")
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
            return

        if path == "/api/mic":
            status, body = proxy_mic_request("GET", None)
            self.send_response(status)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return

        if path == "/frame.jpg":
            with STATE_LOCK:
                frame = LATEST_JPEG

            if not frame:
                self.send_error(HTTPStatus.SERVICE_UNAVAILABLE, "No frame available yet.")
                return

            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "image/jpeg")
            self.send_header("Content-Length", str(len(frame)))
            self.end_headers()
            self.wfile.write(frame)
            return

        if path == "/stream.mjpg":
            self.serve_stream()
            return

        self.send_error(HTTPStatus.NOT_FOUND, "Not found.")

    def do_POST(self):
        path = self.path.split("?", 1)[0]
        if path == "/api/tuning":
            try:
                payload = read_json_body(self)
                tuning = update_tuning(payload)
                body = json.dumps({"tuning": tuning}).encode("utf-8")
                self.send_response(HTTPStatus.OK)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
            except Exception as error:
                message = json.dumps({"error": str(error)}).encode("utf-8")
                self.send_response(HTTPStatus.BAD_REQUEST)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Content-Length", str(len(message)))
                self.end_headers()
                self.wfile.write(message)
            return

        if path == "/api/mic":
            try:
                payload = read_json_body(self)
            except Exception as error:
                message = json.dumps({"error": str(error)}).encode("utf-8")
                self.send_response(HTTPStatus.BAD_REQUEST)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Content-Length", str(len(message)))
                self.end_headers()
                self.wfile.write(message)
                return

            status, body = proxy_mic_request("POST", payload)
            self.send_response(status)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return

        self.send_error(HTTPStatus.NOT_FOUND, "Not found.")

    def serve_stream(self):
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", "multipart/x-mixed-replace; boundary=frame")
        self.end_headers()

        last_sequence = -1
        try:
            while RUNNING:
                with FRAME_CONDITION:
                    FRAME_CONDITION.wait_for(
                        lambda: FRAME_SEQUENCE != last_sequence or not RUNNING,
                        timeout=1.0,
                    )
                    if not RUNNING:
                        break
                    frame = LATEST_JPEG
                    last_sequence = FRAME_SEQUENCE

                if not frame:
                    continue

                self.wfile.write(b"--frame\r\n")
                self.wfile.write(b"Content-Type: image/jpeg\r\n")
                self.wfile.write(f"Content-Length: {len(frame)}\r\n\r\n".encode("ascii"))
                self.wfile.write(frame)
                self.wfile.write(b"\r\n")
                self.wfile.flush()
        except (BrokenPipeError, ConnectionResetError):
            return


def start_debug_server() -> ThreadingHTTPServer | None:
    if DEBUG_PORT <= 0:
        return None

    server = ThreadingHTTPServer((DEBUG_BIND_HOST, DEBUG_PORT), TrackerDebugHandler)
    server.daemon_threads = True
    thread = threading.Thread(target=server.serve_forever, name="face-tracker-debug", daemon=True)
    thread.start()
    print(
        f"Face tracker debug UI listening on http://{DEBUG_BIND_HOST}:{DEBUG_PORT}/",
        file=sys.stderr,
    )
    return server


def main() -> int:
    if not BRIDGE_TOKEN:
        print("AMICA_BRIDGE_TOKEN is required for the face tracker.", file=sys.stderr)
        return 1

    if not SESSION_ID:
        print("A face tracking session ID is required.", file=sys.stderr)
        return 1

    cv2.setNumThreads(1)
    model_path = resolve_yolo_model_path()
    if not model_path:
        print("Failed to locate the YOLO pose model for face tracking.", file=sys.stderr)
        return 1

    try:
        detector = YoloPoseDetector(model_path)
    except Exception as error:
        print(f"Failed to load the YOLO pose model for face tracking: {error}", file=sys.stderr)
        return 1

    update_tuning(load_tuning())
    debug_server = start_debug_server()
    capture = make_capture()

    last_target = None
    last_sent_at = 0.0
    last_seen_face_at = 0.0
    face_active = False

    try:
        while RUNNING:
            if not capture.isOpened():
                capture.release()
                capture = make_capture()
                time.sleep(1.0)
                continue

            started_at = time.monotonic()
            ok, frame = capture.read()
            if not ok or frame is None:
                time.sleep(0.1)
                continue

            now = time.monotonic()
            target, face_box = detector.detect(frame)
            update_debug_frame(frame, face_box, target)

            try:
                if target is not None:
                    last_seen_face_at = now
                    should_send = (
                        changed_enough(last_target, target)
                        or now - last_sent_at >= RESEND_SEC
                    )
                    if should_send:
                        post_event(
                            "face.target",
                            {
                                "sessionId": SESSION_ID,
                                "x": target["x"],
                                "y": target["y"],
                                "confidence": target["confidence"],
                            },
                        )
                        last_target = target
                        last_sent_at = now
                    face_active = True
                elif face_active and now - last_seen_face_at >= STALE_CLEAR_SEC:
                    post_event("face.clear", {"sessionId": SESSION_ID})
                    last_target = None
                    last_sent_at = now
                    face_active = False
            except urllib.error.URLError:
                pass
            except Exception as error:
                print(f"Face tracker bridge error: {error}", file=sys.stderr)

            elapsed = time.monotonic() - started_at
            sleep_for = max(0.0, (1.0 / TARGET_FPS) - elapsed)
            if sleep_for > 0:
                time.sleep(sleep_for)
    finally:
        if debug_server is not None:
            debug_server.shutdown()
            debug_server.server_close()
        capture.release()

    return 0


if __name__ == "__main__":
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    raise SystemExit(main())
