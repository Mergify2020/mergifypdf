"use client";

import type { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import AuthStateSync from "@/components/AuthStateSync";
import PostHogInit from "@/components/PostHogInit";
import PostHogIdentify from "@/components/PostHogIdentify";
import ProjectEntryLoadingHost from "@/components/ProjectEntryLoadingHost";
import ThemePreferenceSync from "@/components/ThemePreferenceSync";

export default function Providers({
  children,
  session,
}: {
  children: React.ReactNode;
  session?: Session | null;
}) {
  const enableAnalytics = process.env.NODE_ENV === "production";

  return (
    <SessionProvider session={session} refetchOnWindowFocus>
      <AuthStateSync />
      <ThemePreferenceSync />
      {enableAnalytics ? <PostHogInit /> : null}
      {enableAnalytics ? <PostHogIdentify /> : null}
      <ProjectEntryLoadingHost />
      {children}
    </SessionProvider>
  );
}
