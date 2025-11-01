export function generateToken(length = 48) {
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => b.toString(16).padStart(2, "0")).join("");
}
