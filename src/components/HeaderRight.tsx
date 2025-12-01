"use client";

import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import WorkspaceSettingsMenu from "@/components/WorkspaceSettingsMenu";
import HeaderAuthButtons from "@/components/HeaderAuthButtons";

export default function HeaderRight() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const isTwoFactorRoute =
    pathname === "/2fa" || pathname === "/two-factor";

  if (isTwoFactorRoute) {
    // On the 2FA challenge screen, hide the profile/settings entry points
    return null;
  }

  if (session?.user) {
    return <WorkspaceSettingsMenu />;
  }

  return <HeaderAuthButtons />;
}

