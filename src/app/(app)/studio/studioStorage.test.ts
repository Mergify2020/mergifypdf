import { beforeEach, describe, expect, it } from "vitest";
import {
  PREVIEW_CACHE_VERSION,
  persistSourceMetadata,
  readStoredSourceIds,
  readWorkspacePreviewCache,
  workspaceFilesKey,
  workspacePreviewCacheKey,
} from "./studioStorage";

describe("Studio storage serialization", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("keeps existing workspace storage keys stable", () => {
    expect(workspaceFilesKey(null)).toBe("mpdf:files");
    expect(workspaceFilesKey("project-1")).toBe("mpdf:files:project-1");
    expect(workspacePreviewCacheKey("project-1")).toBe("mpdf:preview-cache:project-1");
  });

  it("round trips source metadata without exposing extra data", () => {
    persistSourceMetadata(
      [{ storageId: "source-1", name: "sample.pdf", size: 12, updatedAt: 34 }],
      "project-1",
    );
    expect(readStoredSourceIds("project-1")).toEqual(["source-1"]);
  });

  it("fails closed for malformed or mismatched preview caches", () => {
    sessionStorage.setItem(workspacePreviewCacheKey("bad"), "not-json");
    expect(readWorkspacePreviewCache("bad", null)).toBeNull();

    sessionStorage.setItem(
      workspacePreviewCacheKey("project-1"),
      JSON.stringify({
        version: PREVIEW_CACHE_VERSION,
        sourceIds: ["source-1"],
        pages: [{ id: "page-1", srcIdx: 0, pageIdx: 0, rotation: 0 }],
      }),
    );
    expect(readWorkspacePreviewCache("project-1", ["other-source"])).toBeNull();
    expect(readWorkspacePreviewCache("project-1", ["source-1"])).toEqual([
      {
        id: "page-1",
        srcIdx: 0,
        pageIdx: 0,
        rotation: 0,
        width: 0,
        height: 0,
        thumb: "",
        thumbWidth: 0,
        thumbHeight: 0,
        preview: "",
      },
    ]);
  });
});
