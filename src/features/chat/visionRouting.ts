export const MAX_VISION_IMAGE_BASE64_LENGTH = 3_000_000;

export type VisionRoute =
  | {
      type: "legacy_local";
    }
  | {
      type: "psfn_disabled";
      reason: string;
    }
  | {
      type: "psfn_pending";
      reason: string;
    };

export function resolveVisionRoute(options: {
  psfnConduitMode: boolean;
  psfnVisionUploadEnabled: boolean;
}): VisionRoute {
  if (!options.psfnConduitMode) {
    return { type: "legacy_local" };
  }

  if (!options.psfnVisionUploadEnabled) {
    return {
      type: "psfn_disabled",
      reason:
        "PSFN conduit mode keeps camera capture local, but vision_upload is not advertised until Satellite Hub has a real image upload path.",
    };
  }

  return {
    type: "psfn_pending",
    reason:
      "PSFN vision upload is enabled, but Amica does not yet have a documented Satellite Hub image upload message to send.",
  };
}

export function validateVisionImageBase64(
  imageData: string,
  maxLength = MAX_VISION_IMAGE_BASE64_LENGTH,
): string | null {
  const trimmed = imageData.trim();
  if (!trimmed) {
    return "Vision image data is empty.";
  }

  if (trimmed.length > maxLength) {
    return "Vision image data is too large.";
  }

  return null;
}
