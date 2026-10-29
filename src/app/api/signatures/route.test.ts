import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  sameOrigin: vi.fn(),
  mutate: vi.fn(),
}));

vi.mock("next-auth", () => ({ getServerSession: mocks.session }));
vi.mock("@/lib/authOptions", () => ({ authOptions: {} }));
vi.mock("@/lib/requestGuards", () => ({ isSameOrigin: mocks.sameOrigin }));
vi.mock("@/lib/signatureStore", () => ({
  mutateUserSignatures: mocks.mutate,
  loadUserSignatures: vi.fn(),
  saveUserSignatures: vi.fn(),
}));

import { POST } from "./route";

function request(body: unknown) {
  return new Request("http://localhost/api/signatures", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("signature library changes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sameOrigin.mockReturnValue(true);
    mocks.session.mockResolvedValue({ user: { id: "user-1" } });
    mocks.mutate.mockResolvedValue([]);
  });

  it("saves one typed signature with its rendering metadata", async () => {
    const signature = { id: "sig-1", name: "Alex", dataUrl: "data:image/png;base64,AA==", naturalWidth: 100, naturalHeight: 30, createdAt: 1, typedText: "Alex", typedStyleId: "style-1" };
    const response = await POST(request({ type: "add", signature }));
    expect(response.status).toBe(200);
    expect(mocks.mutate).toHaveBeenCalledWith("user-1", { type: "add", signature });
  });

  it("rejects invalid changes and unauthenticated requests", async () => {
    expect((await POST(request({ type: "add", signature: {} }))).status).toBe(400);
    mocks.session.mockResolvedValue(null);
    expect((await POST(request({ type: "delete", id: "sig-1" }))).status).toBe(401);
    expect(mocks.mutate).not.toHaveBeenCalled();
  });

  it("requests an automatic name for QR signatures", async () => {
    const signature = { id: "qr-1", name: "Signature 1", dataUrl: "data:image/png;base64,AA==", naturalWidth: 100, naturalHeight: 30, createdAt: 1 };
    expect((await POST(request({ type: "add", signature, autoName: true }))).status).toBe(200);
    expect(mocks.mutate).toHaveBeenCalledWith("user-1", { type: "add", signature: { ...signature, typedText: undefined, typedStyleId: undefined }, autoName: true });
  });

  it("reports a failed database write", async () => {
    mocks.mutate.mockRejectedValue(new Error("database unavailable"));
    const response = await POST(request({ type: "rename", id: "sig-1", name: "New name" }));
    expect(response.status).toBe(503);
  });
});
