import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

const handler = NextAuth({
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
        const user = await prisma.user.findUnique({ where: { email: creds.email } });
        if (!user?.password) return null;
        const ok = await bcrypt.compare(creds.password, user.password);
        if (!ok) return null;
        return { id: user.id, name: user.name ?? null, email: user.email ?? null };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
});

export { handler as GET, handler as POST };
