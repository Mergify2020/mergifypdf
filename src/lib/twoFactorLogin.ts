import { prisma } from "@/lib/prisma";
import { generateSixDigitCode, hashVerificationCode } from "@/lib/verificationCode";
import { sendTwoFactorLoginEmail } from "@/lib/email";

const EXPIRATION_MINUTES = 10;
const IDENTIFIER_PREFIX = "2fa-login:";

type IssueResult =
  | { ok: true }
  | { ok: false; error: "EMAIL_MISSING" | "EMAIL_SEND_FAILED" };

export async function issueLoginTwoFactorCode(
  userId: string,
  email: string | null | undefined
): Promise<IssueResult> {
  const identifier = `${IDENTIFIER_PREFIX}${userId}`;
  const code = generateSixDigitCode();
  const hashed = hashVerificationCode(code);
  const expires = new Date(Date.now() + EXPIRATION_MINUTES * 60 * 1000);

  await prisma.verificationToken.deleteMany({ where: { identifier } });
  await prisma.verificationToken.create({
    data: {
      identifier,
      token: hashed,
      expires,
    },
  });

  if (process.env.NODE_ENV !== "production") {
    console.log(`[2fa-login] Verification code for ${email ?? "unknown"}: ${code}`);
  }

  if (!email) {
    console.error("[2fa-login] Cannot send login 2FA email without an address.");
    return { ok: false, error: "EMAIL_MISSING" };
  }

  const result = await sendTwoFactorLoginEmail({ to: email, code });
  if (!result.ok) {
    console.error("[2fa-login] Failed to send 2FA login email:", result.error);
    return { ok: false, error: "EMAIL_SEND_FAILED" };
  }

  return { ok: true };
}

type VerifyResult =
  | { ok: true }
  | { ok: false; code: "invalid_code" | "expired" };

export async function verifyLoginTwoFactorCode(
  userId: string,
  code: string
): Promise<VerifyResult> {
  const identifier = `${IDENTIFIER_PREFIX}${userId}`;
  const hashed = hashVerificationCode(code);

  const record = await prisma.verificationToken.findUnique({
    where: {
      identifier_token: {
        identifier,
        token: hashed,
      },
    },
  });

  if (!record) {
    return { ok: false, code: "invalid_code" };
  }

  if (record.expires < new Date()) {
    await prisma.verificationToken.deleteMany({ where: { identifier } });
    return { ok: false, code: "expired" };
  }

  await prisma.verificationToken.deleteMany({ where: { identifier } });
  return { ok: true };
}

