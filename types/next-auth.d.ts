import { type DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user?: DefaultSession["user"] & {
      authType?: "oauth" | "credentials";
      providers?: string[];
      id?: string;
      image?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    authType?: "oauth" | "credentials";
    providers?: string[];
  }
}

export {};
