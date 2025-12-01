import { type DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user?: DefaultSession["user"] & {
      authType?: "oauth" | "credentials";
      providers?: string[];
      id?: string;
      image?: string | null;
      twoFactorEnabled?: boolean;
      twoFactorVerified?: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    authType?: "oauth" | "credentials";
    providers?: string[];
    twoFactorEnabled?: boolean;
    twoFactorVerified?: boolean;
    twoFactorMethod?: string | null;
  }
}

export {};
