import { prisma } from "@/lib/prisma";
import { sendSignupCodeEmail } from "@/lib/email";
import { generateSixDigitCode, hashVerificationCode } from "@/lib/verificationCode";

const EXPIRATION_MINUTES = 10;

export async function issueSignupVerificationCode(userId: string, email: string) {
  const code = generateSixDigitCode();
  const hashed = hashVerificationCode(code);
  const expires = new Date(Date.now() + EXPIRATION_MINUTES * 60 * 1000);

  await prisma.verificationToken.deleteMany({ where: { identifier: userId } });
  await prisma.verificationToken.create({
    data: {
      identifier: userId,
      token: hashed,
      expires,
    },
  });

  if (process.env.NODE_ENV !== "production") {
    console.log(`[signup] Verification code for ${email}: ${code}`);
  }

  const result = await sendSignupCodeEmail({ to: email, code });
  if (!result.ok) {
    console.error("[signup] Failed to send verification code", result.error);
    throw new Error("EMAIL_SEND_FAILED");
  }
}

export async function verifySignupCode(userId: string, code: string) {
  const hashed = hashVerificationCode(code);
  const record = await prisma.verificationToken.findUnique({
    where: {
      identifier_token: {
        identifier: userId,
        token: hashed,
      },
    },
  });

  if (!record) {
    return { ok: false, reason: "invalid_code" } as const;
  }

  if (record.expires < new Date()) {
    await prisma.verificationToken.delete({
      where: {
        identifier_token: {
          identifier: userId,
          token: hashed,
        },
      },
    });
    return { ok: false, reason: "expired" } as const;
  }

  await prisma.verificationToken.deleteMany({ where: { identifier: userId } });
  return { ok: true } as const;
}
