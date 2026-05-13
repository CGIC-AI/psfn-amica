export interface SatelliteSegmentOrderState {
  currentTurnId: string | null;
  lastSegmentIndex: number;
}

export interface SatelliteSegmentOrderResult {
  accepted: boolean;
  state: SatelliteSegmentOrderState;
}

export function joinMessageSegments(current: string, next: string): string {
  const currentTrimmed = current.trim();
  const nextTrimmed = next.trim();
  if (!currentTrimmed) {
    return nextTrimmed;
  }
  if (!nextTrimmed) {
    return currentTrimmed;
  }
  if (currentTrimmed === nextTrimmed) {
    return currentTrimmed;
  }
  if (nextTrimmed.includes(currentTrimmed)) {
    return nextTrimmed;
  }
  if (currentTrimmed.includes(nextTrimmed)) {
    return currentTrimmed;
  }
  const overlap = findSegmentOverlap(currentTrimmed, nextTrimmed);
  if (overlap > 0) {
    return `${currentTrimmed}${nextTrimmed.slice(overlap)}`;
  }
  if (/\s$/.test(currentTrimmed) || /^\s/.test(nextTrimmed)) {
    return `${currentTrimmed}${nextTrimmed}`;
  }
  if (/^[,.;:!?)}\]]/.test(nextTrimmed)) {
    return `${currentTrimmed}${nextTrimmed}`;
  }
  return `${currentTrimmed} ${nextTrimmed}`;
}

export function resolveSatelliteSegmentOrder(
  state: SatelliteSegmentOrderState,
  turnId?: string,
  segmentIndex?: number,
): SatelliteSegmentOrderResult {
  if (!turnId) {
    return {
      accepted: true,
      state,
    };
  }

  const nextState: SatelliteSegmentOrderState =
    state.currentTurnId === turnId
      ? { ...state }
      : { currentTurnId: turnId, lastSegmentIndex: -1 };

  if (
    typeof segmentIndex === "number" &&
    segmentIndex <= nextState.lastSegmentIndex
  ) {
    return {
      accepted: false,
      state,
    };
  }

  if (typeof segmentIndex === "number") {
    nextState.lastSegmentIndex = segmentIndex;
  }

  return {
    accepted: true,
    state: nextState,
  };
}

function findSegmentOverlap(current: string, next: string): number {
  const maxOverlap = Math.min(current.length, next.length);
  for (let size = maxOverlap; size > 0; size -= 1) {
    if (current.slice(-size) === next.slice(0, size)) {
      return size;
    }
  }
  return 0;
}
