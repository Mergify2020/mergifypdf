import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

type AuthType = "oauth" | "credentials";
const cookieDomain = process.env.NEXTAUTH_COOKIE_DOMAIN ?? undefined;
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt", maxAge: SESSION_MAX_AGE, updateAge: 60 * 60 },
  jwt: { maxAge: SESSION_MAX_AGE },
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Secure-mergifypdf.session-token"
          : "mergifypdf.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        domain: cookieDomain,
      },
    },
  },

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
        const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
        if (!user?.password) return null;

        const oauthLinks = await prisma.account.count({
          where: { userId: user.id, provider: { not: "credentials" } },
        });
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
    async jwt({ token, account, user, profile }) {
      const userId = token.sub ?? user?.id;
      if (!userId) return token;

      if (account || !token.providers) {
        const linkedAccounts = await prisma.account.findMany({
          where: { userId },
          select: { provider: true },
        });

        const providerIds = new Set<string>(linkedAccounts.map((entry) => entry.provider));
        if (account?.provider) providerIds.add(account.provider);
        if (providerIds.size === 0) providerIds.add("credentials");

        token.providers = Array.from(providerIds);
        token.authType = (token.providers as string[]).some(
          (provider) => provider !== "credentials"
        )
          ? "oauth"
          : "credentials";
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
        if (session.user) session.user.image = null;
      }
      return session;
    },
  },

  pages: { signIn: "/login" },
  secret: process.env.NEXTAUTH_SECRET,
};
