import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import {
  clearPrismaDatabaseUnavailable,
  isPrismaDatabaseUnavailableError,
  isPrismaDatabaseCooldownActive,
  markPrismaDatabaseUnavailable,
  prisma,
} from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { ensureStripeCustomerForUser } from "@/lib/stripeCustomers";

type AuthType = "oauth" | "credentials";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days
const AUTH_DB_UNAVAILABLE_ERROR = "AUTH_DB_UNAVAILABLE";
const authDbIssueLogTimestamps = new Map<string, number>();
const AUTH_DB_ISSUE_LOG_WINDOW_MS = 30_000;

async function runAuthDbOperationWithRetry<T>(operation: () => Promise<T>) {
  try {
    const result = await operation();
    clearPrismaDatabaseUnavailable();
    return result;
  } catch (error) {
    if (!isPrismaDatabaseUnavailableError(error)) {
      throw error;
    }

    markPrismaDatabaseUnavailable(error);

    try {
      await prisma.$disconnect();
      await prisma.$connect();
      const result = await operation();
      clearPrismaDatabaseUnavailable();
      return result;
    } catch (retryError) {
      markPrismaDatabaseUnavailable(retryError);
      throw new Error(AUTH_DB_UNAVAILABLE_ERROR);
    }
  }
}

function logAuthDbRefreshIssue(scope: "jwt" | "session", error: unknown) {
  const prefix =
    scope === "jwt"
      ? "[auth.jwt] Failed to refresh auth flags from DB; using token fallback."
      : "[auth.session] Failed to refresh profile fields from DB.";
  const dedupeKey = scope;
  const now = Date.now();
  const lastLoggedAt = authDbIssueLogTimestamps.get(dedupeKey) ?? 0;

  if (now - lastLoggedAt < AUTH_DB_ISSUE_LOG_WINDOW_MS) {
    return;
  }

  authDbIssueLogTimestamps.set(dedupeKey, now);
  markPrismaDatabaseUnavailable(error);

  if (process.env.NODE_ENV === "production") {
    console.error(prefix);
    return;
  }

  console.warn(prefix);
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt", maxAge: SESSION_MAX_AGE, updateAge: 60 * 60 },
  jwt: { maxAge: SESSION_MAX_AGE },

  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(creds) {
        if (!creds?.email || !creds?.password) return null;

        const normalizedEmail = creds.email.trim().toLowerCase();
        const user = await runAuthDbOperationWithRetry(() =>
          prisma.user.findUnique({ where: { email: normalizedEmail } })
        );
        if (!user?.password) return null;

        const oauthLinks = await runAuthDbOperationWithRetry(() =>
          prisma.account.count({
            where: { userId: user.id, provider: { not: "credentials" } },
          })
        );
        if (oauthLinks > 0) {
          throw new Error("OAUTH_ONLY");
        }

        const ok = await bcrypt.compare(creds.password, user.password);
        if (!ok) return null;

        if (!user.emailVerified) {
          throw new Error("EMAIL_NOT_VERIFIED");
        }

        return { id: user.id, name: user.name ?? null, email: user.email ?? null };
      },
    }),

    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "select_account",
          access_type: "offline",
          response_type: "code",
        },
      },
      /** If an email already exists (credentials) let Google link to it again */
      allowDangerousEmailAccountLinking: true,
    }),
  ],

  callbacks: {
    async jwt({ token, account, user, profile, trigger, session }) {
      const userId = token.sub ?? user?.id;
      if (!userId) return token;

      if (trigger === "update" && session) {
        if (typeof session.email === "string") {
          token.email = session.email;
        }
        if (typeof session.name === "string") {
          token.name = session.name;
        }
        if (typeof session.twoFactorEnabled === "boolean") {
          token.twoFactorEnabled = session.twoFactorEnabled;
        }
        if (typeof session.twoFactorPassed === "boolean") {
          token.twoFactorPassed = session.twoFactorPassed;
        }
        if (
          typeof session.twoFactorMethod === "string"
          || session.twoFactorMethod === null
        ) {
          token.twoFactorMethod = session.twoFactorMethod;
        }
        if (
          typeof session.stripeStatus === "string"
          || session.stripeStatus === null
        ) {
          token.stripeStatus = session.stripeStatus;
        }
        if (
          typeof session.stripePriceId === "string"
          || session.stripePriceId === null
        ) {
          token.stripePriceId = session.stripePriceId;
        }
      }

      if (account || !token.providers) {
        let linkedAccounts: Array<{ provider: string }> = [];
        if (!isPrismaDatabaseCooldownActive()) {
          try {
            linkedAccounts = await prisma.account.findMany({
              where: { userId },
              select: { provider: true },
            });
            clearPrismaDatabaseUnavailable();
          } catch (error) {
            logAuthDbRefreshIssue("jwt", error);
          }
        }

        const providerIds = new Set<string>(linkedAccounts.map((entry) => entry.provider));
        if (account?.provider) providerIds.add(account.provider);
        if (providerIds.size === 0) {
          const existingProviders = Array.isArray(token.providers) ? token.providers : [];
          existingProviders.forEach((provider) => {
            if (typeof provider === "string") providerIds.add(provider);
          });
        }
        if (providerIds.size === 0) providerIds.add("credentials");

        token.providers = Array.from(providerIds);
        token.authType = (token.providers as string[]).some(
          (provider) => provider !== "credentials"
        )
          ? "oauth"
          : "credentials";
      }

      const shouldRefreshAuthState = (
        account != null
        || user != null
        || trigger === "update"
        || typeof token.twoFactorEnabled !== "boolean"
        || (typeof token.twoFactorMethod !== "string" && token.twoFactorMethod !== null)
        || (typeof token.stripeStatus !== "string" && token.stripeStatus !== null)
        || (typeof token.stripePriceId !== "string" && token.stripePriceId !== null)
      );

      let dbUser:
        | {
            twoFactorEnabled: boolean | null;
            twoFactorMethod: string | null;
            stripeStatus: string | null;
            stripePriceId: string | null;
          }
        | null = null;
      if (shouldRefreshAuthState && !isPrismaDatabaseCooldownActive()) {
        try {
          dbUser = await prisma.user.findUnique({
            where: { id: userId },
            select: {
              twoFactorEnabled: true,
              twoFactorMethod: true,
              stripeStatus: true,
              stripePriceId: true,
            },
          });
          clearPrismaDatabaseUnavailable();
        } catch (error) {
          // Avoid tearing down valid sessions during transient DB connectivity issues.
          logAuthDbRefreshIssue("jwt", error);
        }
      }

      const twoFactorEnabled = dbUser
        ? !!dbUser.twoFactorEnabled
        : typeof token.twoFactorEnabled === "boolean"
          ? token.twoFactorEnabled
          : false;
      token.twoFactorEnabled = twoFactorEnabled;
      token.twoFactorMethod = dbUser?.twoFactorMethod
        ?? (typeof token.twoFactorMethod === "string" ? token.twoFactorMethod : null);
      token.stripeStatus = dbUser?.stripeStatus
        ?? (typeof token.stripeStatus === "string" ? token.stripeStatus : null);
      token.stripePriceId = dbUser?.stripePriceId
        ?? (typeof token.stripePriceId === "string" ? token.stripePriceId : null);

      if (account) {
        // Fresh sign-in: always reset 2FA pass flag based on whether 2FA is enabled
        token.twoFactorPassed = !twoFactorEnabled;
      } else if (typeof token.twoFactorPassed !== "boolean") {
        // Default for existing tokens without this flag yet
        token.twoFactorPassed = !twoFactorEnabled;
      }

      const nextEmail = profile?.email ?? user?.email ?? (token.email as string | undefined);
      if (nextEmail) token.email = nextEmail;

      const nextName = profile?.name ?? user?.name ?? (token.name as string | undefined);
      if (nextName) token.name = nextName;

      delete (token as Record<string, unknown>).picture;
      delete (token as Record<string, unknown>).image;
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.authType = (token.authType as AuthType | undefined) ?? "credentials";
        session.user.providers = (token.providers as string[] | undefined) ?? [];
        if (token.email) session.user.email = token.email as string;
        if (token.name) session.user.name = token.name as string;
        if (token.sub) session.user.id = token.sub;
        session.user.image = null;

        const twoFactorEnabled =
          typeof token.twoFactorEnabled === "boolean" ? token.twoFactorEnabled : false;
        const twoFactorPassed =
          typeof token.twoFactorPassed === "boolean"
            ? token.twoFactorPassed
            : !twoFactorEnabled;

        session.user.twoFactorEnabled = twoFactorEnabled;
        session.user.twoFactorPassed = twoFactorPassed;
        session.user.stripeStatus =
          typeof token.stripeStatus === "string" ? token.stripeStatus : null;
        session.user.stripePriceId =
          typeof token.stripePriceId === "string" ? token.stripePriceId : null;

      }
      return session;
    },
  },

  events: {
    async createUser({ user }) {
      if (!user.id || !user.email) return;
      try {
        await ensureStripeCustomerForUser({
          userId: user.id,
          email: user.email,
          name: user.name ?? null,
        });
      } catch (error) {
        console.error("[auth.createUser] Failed to initialize Stripe customer", error);
      }
    },
  },

  pages: { signIn: "/login" },
  secret: process.env.NEXTAUTH_SECRET,
};
