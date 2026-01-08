"use client";

import type { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import RecentProjectsBridge from "@/components/RecentProjectsBridge";

export default function Providers({
  children,
  session,
}: {
  children: React.ReactNode;
  session?: Session | null;
}) {
  return (
    <SessionProvider session={session}>
      <RecentProjectsBridge />
      {children}
    </SessionProvider>
  );
}
