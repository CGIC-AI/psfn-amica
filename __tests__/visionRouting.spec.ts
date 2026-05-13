import { describe, expect, test } from "@jest/globals";

import {
  MAX_VISION_IMAGE_BASE64_LENGTH,
  resolveVisionRoute,
  validateVisionImageBase64,
} from "../src/features/chat/visionRouting";

describe("vision routing", () => {
  test("keeps legacy local vision outside PSFN conduit mode", () => {
    expect(resolveVisionRoute({
      psfnConduitMode: false,
      psfnVisionUploadEnabled: false,
    })).toEqual({ type: "legacy_local" });
  });

  test("does not advertise or use local vision providers in conduit mode by default", () => {
    const route = resolveVisionRoute({
      psfnConduitMode: true,
      psfnVisionUploadEnabled: false,
    });

    expect(route.type).toBe("psfn_disabled");
    if (route.type !== "psfn_disabled") {
      throw new Error(`unexpected route: ${route.type}`);
    }
    expect(route.reason).toContain("vision_upload is not advertised");
  });

  test("marks PSFN vision pending when enabled before a Hub upload message exists", () => {
    const route = resolveVisionRoute({
      psfnConduitMode: true,
      psfnVisionUploadEnabled: true,
    });

    expect(route.type).toBe("psfn_pending");
    if (route.type !== "psfn_pending") {
      throw new Error(`unexpected route: ${route.type}`);
    }
    expect(route.reason).toContain("image upload message");
  });

  test("bounds captured image payloads before routing", () => {
    expect(validateVisionImageBase64("")).toBe("Vision image data is empty.");
    expect(validateVisionImageBase64("a".repeat(MAX_VISION_IMAGE_BASE64_LENGTH + 1))).toBe(
      "Vision image data is too large.",
    );
    expect(validateVisionImageBase64("Y2FtZXJh")).toBeNull();
  });
});
