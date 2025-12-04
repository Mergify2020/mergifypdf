"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  FileSignature,
  FileText,
  FolderKanban,
  HelpCircle,
  Home,
  LogOut,
  Menu,
  PenSquare,
  Plus,
  Trash2,
  User,
  type LucideIcon,
} from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import AppHeaderBrand from "./AppHeaderBrand";
import Footer from "./Footer";
import { useAvatarPreference } from "@/lib/useAvatarPreference";
import { getAvatarFallback } from "@/lib/avatarFallback";

type SidebarItem = {
  label: string;
  icon: LucideIcon;
  href: string;
  disabled?: boolean;
};

const navigationItems: SidebarItem[] = [
  { label: "Home", icon: Home, href: "/" },
  { label: "Projects", icon: FolderKanban, href: "/projects" },
  { label: "Signatures", icon: PenSquare, href: "/signature-center" },
  { label: "Templates", icon: FileText, href: "/signature-center" },
  { label: "Tutorials", icon: BookOpen, href: "/tutorials" },
  { label: "Trash", icon: Trash2, href: "/projects?view=trash" },
];

const otherItems: SidebarItem[] = [];

interface WorkspaceShellProps {
  children: React.ReactNode;
}

export default function WorkspaceShell({ children }: WorkspaceShellProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [expanded, setExpanded] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const createRef = useRef<HTMLDivElement>(null);
  const avatarKey = session?.user?.email ?? session?.user?.id ?? null;
  const { avatar } = useAvatarPreference(avatarKey);
  const [signingOut, setSigningOut] = useState(false);
  const fallbackAvatar = getAvatarFallback(
    avatarKey,
    session?.user?.name ?? session?.user?.email ?? "Account"
  );

  const sectionLabelClasses = expanded
    ? "opacity-100 translate-x-0"
    : "opacity-0 translate-x-2 pointer-events-none";
  const itemLabelClasses = expanded
    ? "opacity-100 translate-x-0 max-w-full"
    : "opacity-0 translate-x-2 max-w-0";

  useEffect(() => {
    if (!profileOpen) return;

    function handleClick(event: MouseEvent) {
      if (!profileRef.current?.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    }

    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setProfileOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [profileOpen]);

  useEffect(() => {
    if (!createOpen) return;

    function handleClick(event: MouseEvent) {
      if (!createRef.current?.contains(event.target as Node)) {
        setCreateOpen(false);
      }
    }

    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setCreateOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [createOpen]);

  const renderItems = (
    items: SidebarItem[],
    {
      labelClassName,
    }: { labelClassName?: string } = {},
  ) =>
    items.map(({ label, icon: Icon, href, disabled }) => (
      <button
        key={label}
        type="button"
        onClick={() => {
          if (disabled) return;
          router.push(href);
          setMobileOpen(false);
        }}
        aria-label={label}
        disabled={disabled}
        className={`group flex w-full items-center gap-3 overflow-hidden rounded-xl px-3 py-2 text-left text-sm font-semibold transition ${
          disabled ? "text-slate-400" : "text-slate-800 hover:bg-slate-100"
        } ${expanded ? "justify-start" : "flex-col justify-center px-1 py-3 gap-1 text-center"}`}
      >
        <Icon className="h-6 w-6 shrink-0 text-slate-600" aria-hidden />
        {expanded ? (
          <span
            className={`inline-flex flex-1 overflow-hidden whitespace-nowrap text-sm transition-all duration-200 ease-in-out ${
              expanded ? "ml-2" : "ml-0"
            } ${labelClassName ?? ""}`}
          >
            {label}
          </span>
        ) : (
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            {label}
          </span>
        )}
      </button>
    ));

  return (
    <div className="flex min-h-screen bg-white">
      {/* Desktop sidebar */}
      <aside
        className={`hidden md:flex fixed left-0 top-0 z-30 h-screen flex-col border-r border-white/40 bg-white/80 text-slate-800 shadow-[0_25px_80px_rgba(15,23,42,0.25)] backdrop-blur-xl rounded-none overflow-hidden transition-all duration-300 ease-in-out ${
          expanded ? "w-64" : "w-24"
        }`}
      >
        <div className="flex flex-1 flex-col gap-4 overflow-hidden px-3 py-6">
          <div
            className={`px-2 ${expanded ? "flex items-center justify-between gap-4" : "flex flex-col items-center gap-3"}`}
          >
            <div
              className={`transition-all duration-300 ${
                expanded ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2 pointer-events-none"
              }`}
            >
              <AppHeaderBrand />
            </div>
            <button
              type="button"
              onClick={() => setExpanded((prev) => !prev)}
              className="relative z-10 flex h-9 w-9 items-center justify-center rounded-full bg-[#1e293b] text-white shadow-[0_8px_24px_rgba(10,37,64,0.35)] transition hover:bg-[#253248]"
              aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
            >
              {expanded ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
            </button>
          </div>

          <div className={`px-3 ${expanded ? "mt-12 mb-6" : "flex justify-center mt-12 mb-6"}`} ref={createRef}>
            <button
              type="button"
              onClick={() => setCreateOpen((prev) => !prev)}
              className={`flex w-full items-center gap-3 rounded-2xl bg-gradient-to-r from-[#009dfd] via-[#1f65ff] to-[#8b5cf6] px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:opacity-90 ${
                expanded ? "justify-start" : "flex-col text-center min-w-[72px]"
              }`}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white">
                <Plus className="h-6 w-6 stroke-[3]" />
              </span>
              {expanded ? (
                <span>Create</span>
              ) : (
                <span className="text-[10px] font-bold uppercase text-white">Create</span>
              )}
            </button>
            <div
              className={`relative transition ${
                createOpen ? "opacity-100" : "pointer-events-none opacity-0"
              }`}
            >
              <div className="absolute left-0 right-0 z-20 mt-3 rounded-2xl border border-white/40 bg-white/95 p-3 text-sm text-slate-800 shadow-xl">
                <button
                  type="button"
                  onClick={() => {
                    router.push("/studio");
                    setCreateOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left transition hover:bg-slate-100"
                >
                  <FileText className="h-4 w-4 text-slate-500" aria-hidden />
                  <span>New Editing Project</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    router.push("/signature-center");
                    setCreateOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left transition hover:bg-slate-100"
                >
                  <FileSignature className="h-4 w-4 text-slate-500" aria-hidden />
                  <span>New Signature Request</span>
                </button>
              </div>
            </div>
          </div>
          <div className="px-3">
            <p
              className={`text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 transition-transform duration-200 ${sectionLabelClasses}`}
            >
              Navigation
            </p>
          </div>
          <nav className="flex flex-col gap-1">
            {renderItems(navigationItems, {
              labelClassName: itemLabelClasses,
            })}
          </nav>

          {otherItems.length > 0 ? (
            <div className={`flex flex-col gap-1 ${expanded ? "" : "items-center"}`}>
              {renderItems(otherItems, { labelClassName: itemLabelClasses })}
            </div>
          ) : null}
        </div>

        <div ref={profileRef} className="relative px-3 pb-6">
          <button
            type="button"
            onClick={() => setProfileOpen((prev) => !prev)}
            className="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left text-sm font-semibold text-slate-800 transition hover:bg-white/70"
          >
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatar}
                alt="Your avatar"
                className="h-10 w-10 shrink-0 rounded-full object-cover"
              />
            ) : (
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold uppercase text-white"
                style={{ backgroundColor: fallbackAvatar.color }}
              >
                {fallbackAvatar.initials}
              </span>
            )}
            <div
              className={`flex-1 text-sm transition-all duration-200 ${
                expanded ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-1 pointer-events-none"
              }`}
            >
              <p className="font-semibold">{session?.user?.name ?? "Account"}</p>
              {session?.user?.email && <p className="text-xs text-slate-500">{session.user.email}</p>}
            </div>
          </button>

          <div
            className={`absolute bottom-24 left-4 right-4 rounded-2xl border border-white/40 bg-white/90 p-3 text-sm text-slate-800 shadow-xl transition ${
              profileOpen ? "opacity-100 translate-y-0" : "pointer-events-none opacity-0 translate-y-2"
            }`}
          >
            <button
              type="button"
              onClick={() => {
                setProfileOpen(false);
                router.push("#");
              }}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left transition hover:bg-slate-100"
            >
              <HelpCircle className="h-4 w-4 text-slate-500" aria-hidden />
              <span>Help &amp; Support</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setProfileOpen(false);
                router.push("#");
              }}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left transition hover:bg-slate-100"
            >
              <FileText className="h-4 w-4 text-slate-500" aria-hidden />
              <span>Terms &amp; Conditions</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setProfileOpen(false);
                router.push("/account");
              }}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left transition hover:bg-slate-100"
            >
              <User className="h-4 w-4 text-slate-500" aria-hidden />
              <span>Profile / Account Settings</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setProfileOpen(false);
                router.push("/account?view=pricing");
              }}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left transition hover:bg-slate-100"
            >
              <CreditCard className="h-4 w-4 text-slate-500" aria-hidden />
              <span>Subscription &amp; Billing</span>
            </button>
            <button
              type="button"
              disabled={signingOut}
              onClick={async () => {
                if (signingOut) return;
                setProfileOpen(false);
                try {
                  setSigningOut(true);
                  await signOut({ callbackUrl: "/login" });
                } finally {
                  setSigningOut(false);
                }
              }}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-red-600 transition hover:bg-red-50"
            >
              <LogOut className="h-4 w-4" aria-hidden />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen ? (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setMobileOpen(false)} />
          <aside className="fixed inset-y-0 left-0 z-50 w-72 overflow-y-auto border-r border-slate-200 bg-white p-6 shadow-2xl transition-transform duration-300 md:hidden">
            <div className="mb-6 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Workspace</p>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="rounded-full border border-slate-200 p-2 text-slate-600"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="pb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Navigation</p>
                <nav className="flex flex-col gap-1">
                  {renderItems(navigationItems, { labelClassName: "opacity-100 translate-x-0" })}
                </nav>
              </div>

              <div className="border-t border-slate-200 pt-4">
                <p className="pb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Create</p>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMobileOpen(false);
                      router.push("/studio");
                    }}
                    className="flex w-full items-center gap-3 rounded-2xl border border-[#009dfd] bg-[#e6f6ff] px-3 py-2 text-sm font-semibold text-[#013d63]"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#009dfd] text-white">
                      <Plus className="h-4 w-4" />
                    </span>
                    New Editing Project
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileOpen(false);
                      router.push("/signature-center");
                    }}
                    className="flex w-full items-center gap-3 rounded-2xl border border-[#009dfd] bg-[#e6f6ff] px-3 py-2 text-sm font-semibold text-[#013d63]"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#009dfd] text-white">
                      <Plus className="h-4 w-4" />
                    </span>
                    New Signature Request
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  router.push("/studio");
                }}
                className="w-full rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 py-3 text-center text-sm font-semibold text-white shadow-lg transition hover:shadow-xl"
              >
                Start New Project
              </button>

              {otherItems.length > 0 ? (
                <div className="border-t border-slate-200 pt-4">
                  <p className="pb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Other
                  </p>
                  <div className="flex flex-col gap-1">
                    {renderItems(otherItems, { labelClassName: "opacity-100 translate-x-0" })}
                  </div>
                </div>
              ) : null}

              <div className="border-t border-slate-200 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    router.push("/account");
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left transition hover:bg-slate-100"
                >
                  <User className="h-4 w-4 text-slate-500" aria-hidden />
                  <span>Profile / Account Settings</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    router.push("/account?view=pricing");
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left transition hover:bg-slate-100"
                >
                  <CreditCard className="h-4 w-4 text-slate-500" aria-hidden />
                  <span>Subscription &amp; Billing</span>
                </button>
                <button
                  type="button"
                  disabled={signingOut}
                  onClick={async () => {
                    if (signingOut) return;
                    setMobileOpen(false);
                    try {
                      setSigningOut(true);
                      await signOut({ callbackUrl: "/login" });
                    } finally {
                      setSigningOut(false);
                    }
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-red-600 transition hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" aria-hidden />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </aside>
        </>
      ) : null}

      <div className={`flex min-h-screen w-full flex-col bg-white transition-all duration-300 ease-in-out ${expanded ? "md:ml-64" : "md:ml-24"}`}>
        <header className="sticky top-0 z-20 w-full border-b border-slate-200 bg-white/90 backdrop-blur md:hidden">
          <div className="mx-auto flex h-[76px] w-full max-w-7xl items-center justify-between px-4 lg:px-6">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-800 shadow-md transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-800 md:hidden"
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Open workspace menu</span>
              </button>
              <AppHeaderBrand />
            </div>
          </div>
        </header>

        <main className="page-fade-in flex-1">{children}</main>
      </div>
    </div>
  );
}
