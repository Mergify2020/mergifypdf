"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState, useTransition } from "react";
import { refreshProjectsSummary } from "@/lib/projectsSummaryCache";

type Props = {
  projectId: string;
};

export default function TrashProjectActions({ projectId }: Props) {
  const router = useRouter();
  const { data: session } = useSession();
  const ownerKey = session?.user?.id ?? session?.user?.email ?? null;
  const [isPending, startTransition] = useTransition();
  const [busy, setBusy] = useState<"restore" | "delete" | null>(null);

  const handleRestore = async () => {
    if (isPending || busy) return;
    setBusy("restore");
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/trash`, {
        method: "DELETE",
      });
      if (!res.ok) {
        return;
      }
      void refreshProjectsSummary(ownerKey);
      startTransition(() => {
        router.refresh();
      });
    } finally {
      setBusy(null);
    }
  };

  const handleDeleteForever = async () => {
    if (isPending || busy) return;
    setBusy("delete");
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        return;
      }
      void refreshProjectsSummary(ownerKey);
      startTransition(() => {
        router.refresh();
      });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={handleRestore}
        disabled={busy !== null}
        className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        Restore
      </button>
      <button
        type="button"
        onClick={handleDeleteForever}
        disabled={busy !== null}
        className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 shadow-sm transition hover:border-rose-300 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy === "delete" ? "Deleting..." : "Delete forever"}
      </button>
    </div>
  );
}
