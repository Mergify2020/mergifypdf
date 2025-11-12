"use client";

import { usePathname } from "next/navigation";
import SettingsMenu from "./SettingsMenu";

const STUDIO_PREFIX = "/studio";

export default function WorkspaceSettingsMenu() {
  const pathname = usePathname();
  const showMenu = pathname?.startsWith(STUDIO_PREFIX);

  if (!showMenu) return null;

  return <SettingsMenu />;
}

