"use client";

import Link from "next/link";

export default function HeaderLoginButton() {
  return (
    <Link
      href="/login"
      className="inline-flex items-center rounded-full bg-[#024d7c] px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#013a60]"
    >
      Log in
    </Link>
  );
}
