export function nextSignatureName(signatures: { name: string }[]): string {
  const names = new Set(signatures.map((signature) => signature.name.trim().toLowerCase()));
  let sequence = signatures.length + 1;
  while (names.has(`signature ${sequence}`)) sequence += 1;
  return `Signature ${sequence}`;
}
