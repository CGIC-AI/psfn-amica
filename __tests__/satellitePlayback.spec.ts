import { describe, expect, test } from "@jest/globals";

import {
  joinMessageSegments,
  resolveSatelliteSegmentOrder,
  SatelliteSegmentOrderState,
} from "../src/features/chat/satellitePlayback";

describe("satellite playback helpers", () => {
  test("joins repeated, overlapping, and sentence-continuation segments", () => {
    expect(joinMessageSegments("", "Hello")).toBe("Hello");
    expect(joinMessageSegments("Hello", "Hello")).toBe("Hello");
    expect(joinMessageSegments("Hello wor", "world")).toBe("Hello world");
    expect(joinMessageSegments("Hello", ", world")).toBe("Hello, world");
    expect(joinMessageSegments("Hello", "world")).toBe("Hello world");
    expect(joinMessageSegments("Hello", "Hello world")).toBe("Hello world");
  });

  test("accepts increasing satellite segment indexes for the active turn", () => {
    let state: SatelliteSegmentOrderState = {
      currentTurnId: null,
      lastSegmentIndex: -1,
    };

    const first = resolveSatelliteSegmentOrder(state, "turn-1", 0);
    expect(first.accepted).toBe(true);
    expect(first.state).toEqual({ currentTurnId: "turn-1", lastSegmentIndex: 0 });
    state = first.state;

    const second = resolveSatelliteSegmentOrder(state, "turn-1", 1);
    expect(second.accepted).toBe(true);
    expect(second.state).toEqual({ currentTurnId: "turn-1", lastSegmentIndex: 1 });
  });

  test("rejects duplicate and stale satellite segment indexes", () => {
    const state: SatelliteSegmentOrderState = {
      currentTurnId: "turn-1",
      lastSegmentIndex: 2,
    };

    expect(resolveSatelliteSegmentOrder(state, "turn-1", 2)).toEqual({
      accepted: false,
      state,
    });
    expect(resolveSatelliteSegmentOrder(state, "turn-1", 1)).toEqual({
      accepted: false,
      state,
    });
  });

  test("resets ordering when a new turn starts", () => {
    const state: SatelliteSegmentOrderState = {
      currentTurnId: "turn-1",
      lastSegmentIndex: 4,
    };

    expect(resolveSatelliteSegmentOrder(state, "turn-2", 0)).toEqual({
      accepted: true,
      state: { currentTurnId: "turn-2", lastSegmentIndex: 0 },
    });
  });
});
