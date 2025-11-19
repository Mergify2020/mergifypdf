"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function HeaderLoginButton() {
  const pathname = usePathname();
  if (pathname !== "/") {
    return null;
  }
  return (
    <Link
      href="/login"
      className="inline-flex items-center rounded-full bg-[#024d7c] px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#013a60]"
    >
      Log in
    </Link>
  );
}
