import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { isSameOrigin } from "@/lib/requestGuards";
import { meetsPasswordPolicy, NEW_PASSWORD_REQUIREMENTS_ERROR } from "@/lib/passwordPolicy";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(req: Request) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }
  const limit = await rateLimit(req, { keyPrefix: "account-update-password", windowMs: 600_000, max: 5 });
  if (!limit.ok) {
    const retryAfterSeconds = Math.max(1, Math.ceil((limit.resetAt - Date.now()) / 1000));
    const retryAfterMinutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));
    return NextResponse.json(
      {
        error: `Too many requests. Try again in ${retryAfterMinutes} minute${retryAfterMinutes === 1 ? "" : "s"}.`,
      },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
    );
  }
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const providers = session.user.providers ?? [];
  const canManagePassword = providers.length === 0 || providers.includes("credentials");
  if (!canManagePassword) {
    return NextResponse.json(
      { error: "Password is managed by Google and can't be changed here." },
      { status: 403 }
    );
  }

  const { currentPassword, newPassword } = await req.json();
  if (!currentPassword || typeof currentPassword !== "string") {
    return NextResponse.json({ error: "Current password is required." }, { status: 400 });
  }
  if (!newPassword || typeof newPassword !== "string" || !meetsPasswordPolicy(newPassword)) {
    return NextResponse.json(
      { error: NEW_PASSWORD_REQUIREMENTS_ERROR },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user?.password) {
    return NextResponse.json({ error: "Unable to update password." }, { status: 400 });
  }

  const matches = await bcrypt.compare(currentPassword, user.password);
  if (!matches) {
    return NextResponse.json({ error: "The current password you entered is incorrect." }, { status: 400 });
  }

  const sameAsCurrent = await bcrypt.compare(newPassword, user.password);
  if (sameAsCurrent) {
    return NextResponse.json(
      { error: "New password must be different from your current password." },
      { status: 400 }
    );
  }

  const hashed = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: session.user.id },
    data: { password: hashed },
  });

  return NextResponse.json({ success: true });
}
