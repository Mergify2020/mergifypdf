"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { MoreHorizontal, RotateCcw, Trash2 } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { refreshProjectsSummary } from "@/lib/projectsSummaryCache";

type Props = {
  projectId: string;
};

type MenuPosition = {
  top: number;
  left: number;
};

export default function TrashProjectActions({ projectId }: Props) {
  const DELETE_PROGRESS_MS = 1100;
  const router = useRouter();
  const { data: session } = useSession();
  const ownerKey = session?.user?.id ?? null;
  const [isPending, startTransition] = useTransition();
  const [busy, setBusy] = useState<"restore" | "delete" | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuOpen) return;

    const closeMenu = () => {
      setMenuOpen(false);
      setMenuPosition(null);
    };

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      closeMenu();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenu();
    };

    const handleViewportChange = () => {
      closeMenu();
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [menuOpen]);

  const toggleMenu = () => {
    if (busy || isPending) return;
    if (menuOpen) {
      setMenuOpen(false);
      setMenuPosition(null);
      return;
    }

    if (typeof window === "undefined" || !triggerRef.current) return;
    const trigger = triggerRef.current.getBoundingClientRect();
    const menuWidth = 220;
    const menuHeight = 130;
    const margin = 12;
    const left = Math.min(
      Math.max(trigger.right - menuWidth, margin),
      window.innerWidth - menuWidth - margin
    );
    const preferredTop = trigger.bottom + 8;
    const maxTop = window.innerHeight - menuHeight - margin;
    const top = preferredTop <= maxTop ? preferredTop : Math.max(margin, trigger.top - menuHeight - 8);

    setMenuPosition({ top, left });
    setMenuOpen(true);
  };

  const handleRestore = async () => {
    if (isPending || busy) return;
    setMenuOpen(false);
    setMenuPosition(null);
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
    setMenuOpen(false);
    setMenuPosition(null);
    setConfirmDeleteOpen(false);
    setBusy("delete");
    try {
      const [res] = await Promise.all([
        fetch(`/api/projects/${encodeURIComponent(projectId)}`, {
          method: "DELETE",
        }),
        new Promise((resolve) => window.setTimeout(resolve, DELETE_PROGRESS_MS)),
      ]);
      if (!res.ok) return;
      void refreshProjectsSummary(ownerKey);
      startTransition(() => {
        router.refresh();
      });
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggleMenu}
        disabled={busy !== null}
        className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border border-transparent bg-transparent text-slate-600 shadow-none transition disabled:cursor-not-allowed disabled:opacity-60 hover:bg-slate-100 hover:text-slate-900 focus-visible:bg-slate-100 focus-visible:text-slate-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 dark:focus-visible:bg-zinc-800 dark:focus-visible:text-zinc-100 ${
          menuOpen
            ? "bg-slate-100 text-slate-900 dark:bg-zinc-800 dark:text-zinc-100"
            : ""
        }`}
        aria-label="Project actions"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
      >
        <MoreHorizontal className="h-5 w-5" aria-hidden />
      </button>

      {typeof document !== "undefined" && menuOpen && menuPosition
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              aria-label="Trash project actions"
              className="project-actions-menu fixed z-[9999] w-[220px] overflow-hidden rounded-xl border border-[#E5E7EB] bg-white text-sm text-slate-800 shadow-[0_16px_36px_rgba(15,23,42,0.14)] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:shadow-[0_20px_44px_rgba(0,0,0,0.5)]"
              style={{ top: menuPosition.top, left: menuPosition.left }}
              onMouseDown={(event) => {
                event.stopPropagation();
              }}
            >
              <div className="py-1.5">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    void handleRestore();
                  }}
                  disabled={busy !== null}
                  className="project-actions-stagger-item mx-2 flex w-[calc(100%-1rem)] items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-slate-900 transition hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-60 dark:text-zinc-100 dark:hover:bg-zinc-800/70"
                >
                  <RotateCcw className="h-4 w-4" aria-hidden />
                  <span className="text-[15px] font-medium">{busy === "restore" ? "Restoring..." : "Restore"}</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    setMenuPosition(null);
                    setConfirmDeleteOpen(true);
                  }}
                  disabled={busy !== null}
                  className="project-actions-stagger-item mx-2 mb-1 flex w-[calc(100%-1rem)] items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-zinc-800/60"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                  <span className="text-[15px] font-semibold">{busy === "delete" ? "Deleting..." : "Delete forever"}</span>
                </button>
              </div>
            </div>,
            document.body
          )
        : null}

      {typeof document !== "undefined" && confirmDeleteOpen
        ? createPortal(
            <div className="fixed inset-0 z-[10050] flex items-center justify-center bg-slate-900/45 px-4 backdrop-blur-sm">
              <div className="w-full max-w-[460px] rounded-2xl bg-white p-6 shadow-[0_20px_52px_rgba(15,23,42,0.24)] dark:bg-zinc-900">
                <h3 className="text-2xl font-semibold leading-tight tracking-[-0.02em] text-slate-900 dark:text-zinc-100">
                  Permanently delete this project?
                </h3>
                <p className="mt-4 text-base font-medium text-slate-600 dark:text-zinc-300">
                  This action can&apos;t be undone.
                </p>
                <div className="mt-7 flex justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteOpen(false)}
                    className="rounded-xl border-2 border-slate-300 px-4 py-2 text-base font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={busy !== null || isPending}
                    onClick={() => {
                      void handleDeleteForever();
                    }}
                    className="rounded-xl bg-[#E11D48] px-5 py-2 text-base font-semibold text-white transition hover:bg-[#BE123C] disabled:opacity-60"
                  >
                    {busy === "delete" ? "Deleting..." : "Delete permanently"}
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
      {typeof document !== "undefined" && busy === "delete"
        ? createPortal(
            <div className="fixed inset-0 z-[10100] flex items-center justify-center bg-slate-900/20 px-4 backdrop-blur-[1.5px]">
              <div className="flex min-h-[132px] w-full max-w-[440px] flex-col justify-center rounded-2xl border border-slate-200 bg-white px-6 py-7 shadow-[0_20px_52px_rgba(15,23,42,0.24)] dark:border-zinc-700 dark:bg-zinc-900">
                <p className="text-center text-xl font-semibold text-slate-900 dark:text-zinc-100">
                  Deleting permanently
                </p>
                <div className="mt-3 h-4 overflow-hidden rounded-full bg-slate-200 dark:bg-zinc-700">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#C4B5FD] via-[#8B5CF6] to-[#5B21B6]"
                    style={{ animation: `trash-progress-fill ${DELETE_PROGRESS_MS}ms linear forwards` }}
                  />
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
