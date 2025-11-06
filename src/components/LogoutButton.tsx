"use client";

import { signOut } from "next-auth/react";

export default function LogoutButton() {
  async function onClick() {
    // send them back to login after sign out
    await signOut({ callbackUrl: "/login" });
  }

  return (
    <button
      onClick={onClick}
      className="rounded-lg border px-3 py-1 text-sm hover:bg-gray-50"
      title="Sign out"
    >
      Sign out
    </button>
  );
}
