import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { guardDevRoute } from "@/lib/devRouteGuard";

type DevSubscriptionState =
  | "none"
  | "active"
  | "trialing"
  | "past_due"
  | "unpaid"
  | "canceled"
  | "incomplete"
  | "incomplete_expired";

const ALLOWED_STATES: DevSubscriptionState[] = [
  "none",
  "active",
  "trialing",
  "past_due",
  "unpaid",
  "canceled",
  "incomplete",
  "incomplete_expired",
];

function fakeSubscriptionId(userId: string) {
  return `dev_sub_${userId.slice(-10)}`;
}

export async function GET(req: Request) {
  const blocked = guardDevRoute(req);
  if (blocked) return blocked;

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      stripeStatus: true,
      stripeSubscriptionId: true,
      stripePriceId: true,
      stripeCurrentPeriodEnd: true,
    },
  });

  return NextResponse.json({ ok: true, user });
}

export async function POST(req: Request) {
  const blocked = guardDevRoute(req);
  if (blocked) return blocked;

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({} as { state?: unknown }));
  const requestedState = typeof body.state === "string" ? body.state : "";
  if (!ALLOWED_STATES.includes(requestedState as DevSubscriptionState)) {
    return NextResponse.json(
      { error: "Invalid state", allowedStates: ALLOWED_STATES },
      { status: 400 }
    );
  }

  const state = requestedState as DevSubscriptionState;
  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const fakeSubId = fakeSubscriptionId(session.user.id);

  const data =
    state === "none"
      ? {
          stripeStatus: null,
          stripeSubscriptionId: null,
          stripePriceId: null,
          stripeCurrentPeriodEnd: null,
        }
      : state === "trialing"
        ? {
            stripeStatus: "trialing",
            stripeSubscriptionId: fakeSubId,
            stripeCurrentPeriodEnd: in7Days,
          }
        : state === "active"
          ? {
              stripeStatus: "active",
              stripeSubscriptionId: fakeSubId,
              stripeCurrentPeriodEnd: in30Days,
            }
          : {
              stripeStatus: state,
              stripeSubscriptionId: fakeSubId,
            };

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data,
    select: {
      id: true,
      email: true,
      stripeStatus: true,
      stripeSubscriptionId: true,
      stripePriceId: true,
      stripeCurrentPeriodEnd: true,
    },
  });

  return NextResponse.json({ ok: true, appliedState: state, user: updated });
}
