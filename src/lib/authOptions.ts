import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

type AuthType = "oauth" | "credentials";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },

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

      if (user?.image) {
        token.image = user.image;
      } else if (!token.image) {
        const record = await prisma.user.findUnique({
          where: { id: userId },
          select: { image: true },
        });
        token.image = record?.image ?? null;
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.authType = (token.authType as AuthType | undefined) ?? "credentials";
        session.user.providers = (token.providers as string[] | undefined) ?? [];
        if (token.email) session.user.email = token.email as string;
        if (token.name) session.user.name = token.name as string;
        if (token.sub) {
          session.user.id = token.sub;
          if (!token.image) {
            const record = await prisma.user.findUnique({
              where: { id: token.sub },
              select: { image: true },
            });
            token.image = record?.image ?? null;
          }
          session.user.image = (token.image as string | null | undefined) ?? null;
        }
      }
      return session;
    },
  },

  pages: { signIn: "/login" },
  secret: process.env.NEXTAUTH_SECRET,
};
