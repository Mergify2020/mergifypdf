"use client";

import { Suspense } from "react";
import type { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import AuthStateSync from "@/components/AuthStateSync";
import DevHmrProbe from "@/components/DevHmrProbe";
import PostHogInit from "@/components/PostHogInit";
import PostHogIdentify from "@/components/PostHogIdentify";
import ProjectEntryLoadingHost from "@/components/ProjectEntryLoadingHost";
import ThemePreferenceSync from "@/components/ThemePreferenceSync";

export default function Providers({
  children,
  session,
  analyticsEnabled = false,
}: {
  children: React.ReactNode;
  session?: Session | null;
  analyticsEnabled?: boolean;
}) {

  return (
    <SessionProvider session={session} refetchOnWindowFocus={false} refetchInterval={0}>
      <DevHmrProbe />
      <AuthStateSync />
      <ThemePreferenceSync />
      {analyticsEnabled ? <PostHogInit /> : null}
      {analyticsEnabled ? <PostHogIdentify /> : null}
      <Suspense fallback={null}>
        <ProjectEntryLoadingHost />
      </Suspense>
      {children}
    </SessionProvider>
  );
}
