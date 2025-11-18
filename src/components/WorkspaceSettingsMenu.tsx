"use client";

import { usePathname } from "next/navigation";
import SettingsMenu from "./SettingsMenu";

const ALLOWED_PREFIXES = ["/studio", "/"];

export default function WorkspaceSettingsMenu() {
  const pathname = usePathname();
  const showMenu = pathname
    ? ALLOWED_PREFIXES.some((prefix) => (prefix === "/" ? pathname === "/" : pathname.startsWith(prefix)))
    : false;

  if (!showMenu) return null;

  return <SettingsMenu />;
}
