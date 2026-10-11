
import { describe, expect, it } from "vitest";
import { computeClock, type QuizClockRun, type QuizClockSlot } from "./quiz-clock";

const start = 1_000_000;

const slots: QuizClockSlot[] = [
  { position: 0, durationMs: 20_000, gapMs: 3_000 },
  { position: 1, durationMs: 90_000, gapMs: 3_000 },
];

function run(
  overrides: Partial<QuizClockRun> = {},
): QuizClockRun {
  return {
    status: "RUNNING",
    startedAt: start,
    pausedAt: null,
    pausedMs: 0,
    skipMs: 0,
    ...overrides,
  };
}

describe("computeClock", () => {
  it("returns NOT_STARTED before the quiz starts", () => {
    expect(
      computeClock(
        run({ status: "NOT_STARTED" }),
        slots,
        start,
      ).phase,
    ).toBe("NOT_STARTED");
  });

  it("returns COUNTDOWN before startedAt", () => {
    const result = computeClock(run(), slots, start - 5_000);

    expect(result.phase).toBe("COUNTDOWN");
    expect(result.msUntilStart).toBe(5_000);
  });

  it("returns the current question and its deadline", () => {
    const result = computeClock(run(), slots, start + 8_000);

    expect(result.phase).toBe("QUESTION");
    expect(result.index).toBe(0);
    expect(result.questionStartAtMs).toBe(start);
    expect(result.questionEndAtMs).toBe(start + 20_000);
    expect(result.remainingMs).toBe(12_000);
  });

  it("returns GAP between questions", () => {
    const result = computeClock(run(), slots, start + 21_000);

    expect(result.phase).toBe("GAP");
    expect(result.index).toBe(0);
    expect(result.remainingMs).toBe(2_000);
  });

  it("freezes the clock while paused", () => {
    const result = computeClock(
      run({
        status: "PAUSED",
        pausedAt: start + 8_000,
      }),
      slots,
      start + 50_000,
    );

    expect(result.phase).toBe("PAUSED");
    expect(result.index).toBe(0);
    expect(result.remainingMs).toBe(12_000);
  });

  it("preserves timing after a completed pause", () => {
    const result = computeClock(
      run({ pausedMs: 10_000 }),
      slots,
      start + 18_000,
    );

    expect(result.phase).toBe("QUESTION");
    expect(result.remainingMs).toBe(12_000);
  });


  it("advances to the next question after skipping the current question", () => {
    const result = computeClock(
      run({ skipMs: 22_000 }),
      slots,
      start + 1_000,
    );

    expect(result.phase).toBe("QUESTION");
    expect(result.index).toBe(1);
    expect(result.remainingMs).toBe(90_000);
  });


  it("handles the final question without a trailing gap", () => {
    const result = computeClock(run(), slots, start + 23_000);

    expect(result.phase).toBe("QUESTION");
    expect(result.index).toBe(1);
    expect(result.remainingMs).toBe(90_000);
  });

  it("returns ENDED after the final question", () => {
    const result = computeClock(run(), slots, start + 113_000);

    expect(result.phase).toBe("ENDED");
    expect(result.index).toBe(slots.length - 1);
  });

  it("returns ENDED when the run is explicitly ended", () => {
    expect(
      computeClock(run({ status: "ENDED" }), slots, start).phase,
    ).toBe("ENDED");
  });
});
