import { beforeEach, describe, expect, it } from "vitest";
import { clearScopedBrowserStorage, scopedBrowserStorageKey, scopedIndexedDbName } from "@/lib/browserStorageScope";
const namespaceA = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const namespaceB = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
describe("browser storage scopes", () => {
  beforeEach(() => localStorage.clear());
  it("partitions keys and IndexedDB names by opaque namespace", () => {
    expect(scopedBrowserStorageKey(namespaceA, "files:project")).not.toBe(scopedBrowserStorageKey(namespaceB, "files:project"));
    expect(scopedIndexedDbName(namespaceA)).not.toBe(scopedIndexedDbName(namespaceB));
  });
  it("clears only the selected user namespace", () => {
    localStorage.setItem(scopedBrowserStorageKey(namespaceA, "files"), "a");
    localStorage.setItem(scopedBrowserStorageKey(namespaceB, "files"), "b");
    expect(clearScopedBrowserStorage(localStorage, namespaceA)).toBe(1);
    expect(localStorage.getItem(scopedBrowserStorageKey(namespaceA, "files"))).toBeNull();
    expect(localStorage.getItem(scopedBrowserStorageKey(namespaceB, "files"))).toBe("b");
  });
});
