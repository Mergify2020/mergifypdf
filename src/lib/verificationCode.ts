import crypto from "crypto";

export function generateSixDigitCode(): string {
  const num = Math.floor(100000 + Math.random() * 900000);
  return num.toString();
}

export function hashVerificationCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}
