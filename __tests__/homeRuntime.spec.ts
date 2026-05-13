import { describe, expect, test } from "@jest/globals";

import {
  shouldInitializeAmicaLife,
  shouldWriteExternalChatLogs,
} from "../src/features/homeRuntime";

describe("home runtime guards", () => {
  test("keeps legacy page initialization behavior outside PSFN conduit mode", () => {
    const options = { psfnConduitMode: false };

    expect(shouldInitializeAmicaLife(options)).toBe(true);
    expect(shouldWriteExternalChatLogs(options)).toBe(true);
  });

  test("shuts down Amica Life and external chat log writes in PSFN conduit mode", () => {
    const options = { psfnConduitMode: true };

    expect(shouldInitializeAmicaLife(options)).toBe(false);
    expect(shouldWriteExternalChatLogs(options)).toBe(false);
  });
});
