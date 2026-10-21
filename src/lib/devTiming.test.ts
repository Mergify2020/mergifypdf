import { describe, expect, it } from "vitest";
import { devTimingsEnabled, safeTimingDetail } from "./devTiming";

describe("development timing logs", () => {
  it("is opt-in", () => {
    expect(devTimingsEnabled({})).toBe(false);
    expect(devTimingsEnabled({ NEXT_PUBLIC_DEV_TIMINGS: "1" })).toBe(true);
  });

  it("drops identifiers, payloads, URLs, and errors by retaining scalar metrics only", () => {
    expect(
      safeTimingDetail({
        durationMs: 12,
        cached: true,
        userId: "user-1",
        payload: { private: true },
        error: new Error("private"),
      }),
    ).toEqual({ durationMs: 12, cached: true });
  });
});
