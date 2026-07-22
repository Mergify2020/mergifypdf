const BROWSER_STORAGE_PREFIX = "mpdf:v2";
function assertStorageNamespace(namespace: string) {
  if (!/^[A-Za-z0-9_-]{32,128}$/.test(namespace)) throw new Error("Invalid browser storage namespace.");
}
export function scopedBrowserStorageKey(namespace: string, key: string) {
  assertStorageNamespace(namespace);
  if (!/^[A-Za-z0-9:_-]{1,160}$/.test(key)) throw new Error("Invalid browser storage key.");
  return `${BROWSER_STORAGE_PREFIX}:${namespace}:${key}`;
}
export function scopedIndexedDbName(namespace: string) {
  assertStorageNamespace(namespace);
  return `${BROWSER_STORAGE_PREFIX}:files:${namespace}`;
}
export function clearScopedBrowserStorage(storage: Storage, namespace: string) {
  assertStorageNamespace(namespace);
  const prefix = `${BROWSER_STORAGE_PREFIX}:${namespace}:`;
  const keys: string[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key?.startsWith(prefix)) keys.push(key);
  }
  keys.forEach((key) => storage.removeItem(key));
  return keys.length;
}
