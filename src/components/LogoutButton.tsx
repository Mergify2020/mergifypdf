"use client";

import { signOut, useSession } from "next-auth/react";
import { LogOut } from "lucide-react"; // icon
import React from "react";

export default function LogoutButton() {
  const { data: session } = useSession();

  if (!session) return null; // hide if not logged in

  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="flex items-center gap-2 rounded-full bg-[#2b7a78] px-4 py-2 text-white shadow-md transition hover:bg-[#205d5b] focus:outline-none focus:ring-2 focus:ring-[#3aafa9]"
    >
      <LogOut size={18} />
      <span>Sign Out</span>
    </button>
  );
}
