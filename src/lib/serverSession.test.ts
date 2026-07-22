import { beforeEach, describe, expect, it, vi } from "vitest";

const getServerSession = vi.fn();

vi.mock("next-auth", () => ({ getServerSession }));
vi.mock("@/lib/authOptions", () => ({ authOptions: {} }));

describe("server session states", () => {
  beforeEach(() => {
    vi.resetModules();
    getServerSession.mockReset();
    delete process.env.NEXT_PHASE;
  });

  it("distinguishes authenticated and unauthenticated responses", async () => {
    getServerSession.mockResolvedValueOnce({ user: { id: "synthetic-user" }, expires: "2099-01-01" });
    const { getServerSessionState } = await import("./serverSession");
    await expect(getServerSessionState()).resolves.toMatchObject({ status: "authenticated" });
  });

  it("treats provider failure as temporarily unavailable, not logged out", async () => {
    getServerSession.mockRejectedValueOnce(new Error("synthetic outage"));
    const { getServerSessionState } = await import("./serverSession");
    await expect(getServerSessionState()).resolves.toEqual({ status: "unavailable", session: null });
  });

  it("does not contact authentication while collecting a production build", async () => {
    process.env.NEXT_PHASE = "phase-production-build";
    const { getServerSessionState } = await import("./serverSession");
    await expect(getServerSessionState()).resolves.toEqual({ status: "unauthenticated", session: null });
    expect(getServerSession).not.toHaveBeenCalled();
  });
});
