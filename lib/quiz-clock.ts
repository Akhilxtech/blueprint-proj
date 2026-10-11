
export type QuizClockStatus =
  | "NOT_STARTED"
  | "RUNNING"
  | "PAUSED"
  | "ENDED";

export type QuizClockRun = {
  status: QuizClockStatus;
  startedAt: Date | string | number | null;
  pausedAt?: Date | string | number | null;
  pausedMs: number;
  skipMs: number;
};

export type QuizClockSlot = {
  position: number;
  durationMs: number;
  gapMs: number;
};

export type QuizClockPhase =
  | "NOT_STARTED"
  | "COUNTDOWN"
  | "QUESTION"
  | "GAP"
  | "PAUSED"
  | "ENDED";

export type QuizClockResult = {
  phase: QuizClockPhase;
  index: number;
  questionStartAtMs: number | null;
  questionEndAtMs: number | null;
  remainingMs: number;
  msUntilStart: number;
};

function toMs(value: Date | string | number | null | undefined) {
  if (value == null) return null;
  if (typeof value === "number") return value;

  const result = value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isFinite(result) ? result : null;
}

function emptyResult(
  phase: QuizClockPhase,
  index = -1,
  msUntilStart = 0,
): QuizClockResult {
  return {
    phase,
    index,
    questionStartAtMs: null,
    questionEndAtMs: null,
    remainingMs: 0,
    msUntilStart: Math.max(0, msUntilStart),
  };
}

/**
 * Derives the global quiz phase from server-authoritative timestamps.
 *
 * index is zero-based; -1 means no question is current.
 * skipMs advances the effective timeline.
 * pausedMs excludes completed pauses from elapsed quiz time.
 */
export function computeClock(
  run: QuizClockRun,
  slots: readonly QuizClockSlot[],
  nowMs: number,
): QuizClockResult {
  if (run.status === "NOT_STARTED") {
    return emptyResult("NOT_STARTED");
  }

  if (run.status === "ENDED") {
    return emptyResult("ENDED");
  }

  const startedAtMs = toMs(run.startedAt);

  if (startedAtMs === null || !Number.isFinite(nowMs)) {
    return emptyResult("NOT_STARTED");
  }

  if (
    !Number.isFinite(run.pausedMs) ||
    !Number.isFinite(run.skipMs) ||
    run.pausedMs < 0 ||
    run.skipMs < 0
  ) {
    throw new RangeError("Invalid quiz clock adjustment");
  }

  for (const slot of slots) {
    if (
      !Number.isFinite(slot.durationMs) ||
      !Number.isFinite(slot.gapMs) ||
      slot.durationMs < 0 ||
      slot.gapMs < 0
    ) {
      throw new RangeError("Invalid quiz slot duration");
    }
  }

  const pausedAtMs = toMs(run.pausedAt);
  const isPaused = run.status === "PAUSED";

  if (isPaused && pausedAtMs === null) {
    throw new RangeError("A paused quiz must have pausedAt");
  }

  // Freeze elapsed time at pausedAt while paused.
  const effectiveNowMs = isPaused ? pausedAtMs! : nowMs;

  const timelineStartMs = startedAtMs + run.pausedMs;
  const effectiveElapsedMs =
    effectiveNowMs - timelineStartMs + run.skipMs;

  if (effectiveElapsedMs < 0) {
    return emptyResult(
      isPaused ? "PAUSED" : "COUNTDOWN",
      -1,
      -effectiveElapsedMs,
    );
  }

  if (slots.length === 0) {
    return emptyResult("ENDED");
  }

  let offsetMs = 0;

  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    const questionStartOffsetMs = offsetMs;
    const questionEndOffsetMs = questionStartOffsetMs + slot.durationMs;
    const slotEndOffsetMs =
      questionEndOffsetMs + (i === slots.length - 1 ? 0 : slot.gapMs);

    const questionStartAtMs =
      timelineStartMs + questionStartOffsetMs - run.skipMs;
    const questionEndAtMs =
      timelineStartMs + questionEndOffsetMs - run.skipMs;

    if (
      effectiveElapsedMs >= questionStartOffsetMs &&
      effectiveElapsedMs < questionEndOffsetMs
    ) {
      const result: QuizClockResult = {
        phase: isPaused ? "PAUSED" : "QUESTION",
        index: i,
        questionStartAtMs,
        questionEndAtMs,
        remainingMs: questionEndOffsetMs - effectiveElapsedMs,
        msUntilStart: 0,
      };

      return result;
    }

    if (
      i < slots.length - 1 &&
      effectiveElapsedMs >= questionEndOffsetMs &&
      effectiveElapsedMs < slotEndOffsetMs
    ) {
      return {
        phase: isPaused ? "PAUSED" : "GAP",
        index: i,
        questionStartAtMs,
        questionEndAtMs,
        remainingMs: slotEndOffsetMs - effectiveElapsedMs,
        msUntilStart: 0,
      };
    }

    offsetMs = slotEndOffsetMs;
  }

  return emptyResult("ENDED", slots.length - 1);
}
