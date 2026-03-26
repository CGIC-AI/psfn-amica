export interface NormalizedFaceTarget {
  x: number;
  y: number;
  confidence: number;
}

export interface FaceTrackingDebugTuning {
  bodyYaw: number;
  headYaw: number;
  headPitch: number;
  cameraPositionX: number;
  cameraPositionY: number;
  cameraTargetX: number;
  cameraTargetY: number;
  eyeX: number;
  eyeY: number;
  lookAtZ: number;
  cameraSmoothing: number;
  bodySmoothing: number;
  headSmoothing: number;
  lookAtSmoothing: number;
}

export interface FaceTrackingDebugState {
  detector: string;
  sessionId: string;
  mirroredX: boolean;
  target: NormalizedFaceTarget | null;
  faceBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
  frameSize: {
    width: number;
    height: number;
  };
  updatedAt: number;
  tuning: FaceTrackingDebugTuning;
}

export const DEFAULT_FACE_TRACKING_DEBUG_TUNING: FaceTrackingDebugTuning = {
  bodyYaw: 0.7,
  headYaw: 0.42,
  headPitch: 0.26,
  cameraPositionX: 0.018,
  cameraPositionY: 0.028,
  cameraTargetX: 0.06,
  cameraTargetY: 0.04,
  eyeX: 0.08,
  eyeY: 0.08,
  lookAtZ: -1.8,
  cameraSmoothing: 5,
  bodySmoothing: 5.5,
  headSmoothing: 7,
  lookAtSmoothing: 7,
};
