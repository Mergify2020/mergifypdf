"use client";

import type { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import PostHogInit from "@/components/PostHogInit";
import PostHogIdentify from "@/components/PostHogIdentify";

export default function Providers({
  children,
  session,
}: {
  children: React.ReactNode;
  session?: Session | null;
}) {
  return (
    <SessionProvider session={session} refetchOnWindowFocus={false}>
      <PostHogInit />
      <PostHogIdentify />
      {children}
    </SessionProvider>
  );
}
