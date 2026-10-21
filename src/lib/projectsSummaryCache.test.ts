import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearAllProjectsSummaryCache,
  getProjectsSummaryCache,
  refreshProjectsSummary,
  setProjectsSummaryCache,
} from "./projectsSummaryCache";

describe("project summary cache", () => {
  beforeEach(() => {
    clearAllProjectsSummaryCache();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("stores per-owner summaries and clears them explicitly", () => {
    const projects = [{ id: "project-1", name: "Synthetic", updatedAt: 1 }];
    setProjectsSummaryCache("owner-1", projects);
    expect(getProjectsSummaryCache("owner-1")).toEqual(projects);
    expect(getProjectsSummaryCache("owner-2")).toBeNull();
    clearAllProjectsSummaryCache();
    expect(getProjectsSummaryCache("owner-1")).toBeNull();
  });

  it("deduplicates simultaneous refreshes for one owner", async () => {
    let resolveResponse!: (response: Response) => void;
    const fetchMock = vi.fn(() => new Promise<Response>((resolve) => {
      resolveResponse = resolve;
    }));
    vi.stubGlobal("fetch", fetchMock);

    const first = refreshProjectsSummary("owner-1", { force: true });
    const second = refreshProjectsSummary("owner-1", { force: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    resolveResponse(new Response(JSON.stringify({
      projects: [{ id: "project-1", name: "Synthetic", updatedAt: 1 }],
    }), { status: 200, headers: { "content-type": "application/json" } }));

    await expect(first).resolves.toEqual([{ id: "project-1", name: "Synthetic", updatedAt: 1 }]);
    await expect(second).resolves.toEqual([{ id: "project-1", name: "Synthetic", updatedAt: 1 }]);
  });
});
