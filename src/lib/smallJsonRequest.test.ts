import { describe, expect, it } from "vitest";
import { readSmallJson } from "@/lib/smallJsonRequest";

describe("small JSON request reader", () => {
  it("parses small metadata and rejects oversized or malformed input", async () => {
    await expect(readSmallJson(new Request("http://localhost", { method: "POST", body: "{\"ok\":true}" }))).resolves.toEqual({ ok: true });
    await expect(readSmallJson(new Request("http://localhost", {
      method: "POST",
      headers: { "content-length": "40000" },
      body: "{}",
    }))).rejects.toMatchObject({ code: "REQUEST_TOO_LARGE" });
    await expect(readSmallJson(new Request("http://localhost", { method: "POST", body: "{" }))).rejects.toMatchObject({ code: "INVALID_JSON" });
  });
});
