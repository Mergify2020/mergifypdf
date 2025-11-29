"use client";

import Link from "next/link";

export default function HeaderLoginButton() {
  return (
    <Link
      href="/login"
      className="inline-flex items-center rounded-full border border-slate-300 bg-transparent px-4 py-2 text-xs font-semibold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-white/70"
    >
      Log in
    </Link>
  );
}
