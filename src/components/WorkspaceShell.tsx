"use client";

import { usePathname, useRouter } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  FileSignature,
  FileText,
  FolderKanban,
  Folders,
  Home,
  LogOut,
  Menu,
  PenSquare,
  Plus,
  Settings,
  Star,
  Trash2,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { PROJECT_NAME_STORAGE_KEY, sanitizeProjectName } from "@/lib/projectName";
import { addRecentProject } from "@/lib/recentProjects";
import AppHeaderBrand from "./AppHeaderBrand";
import PageLoadingSkeleton from "./PageLoadingSkeleton";
import { useAvatarPreference } from "@/lib/useAvatarPreference";
import { getAvatarFallback } from "@/lib/avatarFallback";

const WORKSPACE_META_KEY = "mpdf:files";
const WORKSPACE_HIGHLIGHTS_KEY = "mpdf:highlights";
const WORKSPACE_DB_NAME = "mpdf-file-store";
const WORKSPACE_DB_STORE = "files";

function clearIndexedDb(): Promise<void> {
  if (typeof window === "undefined" || !("indexedDB" in window)) return Promise.resolve();
  return new Promise((resolve) => {
    const request = indexedDB.open(WORKSPACE_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(WORKSPACE_DB_STORE)) {
        db.createObjectStore(WORKSPACE_DB_STORE);
      }
    };
    request.onerror = () => resolve();
    request.onsuccess = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(WORKSPACE_DB_STORE)) {
        db.close();
        resolve();
        return;
      }
      const tx = db.transaction(WORKSPACE_DB_STORE, "readwrite");
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        resolve();
      };
      tx.objectStore(WORKSPACE_DB_STORE).clear();
    };
  });
}

async function resetWorkspaceStorage() {
  try {
    window.localStorage?.removeItem(WORKSPACE_META_KEY);
  } catch {
    // ignore
  }
  try {
    window.sessionStorage?.removeItem(WORKSPACE_META_KEY);
  } catch {
    // ignore
  }
  try {
    window.localStorage?.removeItem(WORKSPACE_HIGHLIGHTS_KEY);
  } catch {
    // ignore
  }
  await clearIndexedDb();
}

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
  { label: "Templates", icon: FileText, href: "/signature-center", disabled: true },
  { label: "Tutorials", icon: BookOpen, href: "/tutorials", disabled: true },
];

type SidebarPanel = {
  title: string;
  subtitle: string;
  items: { label: string; description?: string; icon?: LucideIcon; key?: string }[];
  action?: { label: string; href: string };
};

const sidebarPanels: Record<string, SidebarPanel> = {
  home: {
    title: "Recent documents",
    subtitle: "Quick access",
    items: [
      { label: "Welcome Deck", description: "Updated 1 day ago" },
      { label: "Vendor Agreement FY25", description: "Edited 3 days ago" },
      { label: "Mergify Sign brochure", description: "Shared last week" },
    ],
    action: { label: "View all projects", href: "/projects" },
  },
  projects: {
    title: "",
    subtitle: "",
    items: [
      { label: "All Projects", icon: Folders, key: "all" },
      { label: "Your Projects", icon: User, key: "yours" },
      { label: "Shared With You", icon: Users, key: "shared" },
      { label: "Starred", icon: Star, key: "favorites" },
    ],
  },
  signatures: {
    title: "Signature center",
    subtitle: "Requests overview",
    items: [
      { label: "Send a request", description: "Launch a new signature flow" },
      { label: "Waiting on others", description: "3 recipients pending" },
      { label: "Completed this week", description: "12 signed docs" },
    ],
    action: { label: "Open signature tools", href: "/signature-center" },
  },
  default: {
    title: "Workspace tips",
    subtitle: "Get started",
    items: [
      { label: "Upload PDFs", description: "Drag & drop files to merge" },
      { label: "Reuse templates", description: "Start from saved layouts" },
      { label: "Share securely", description: "Invite teammates to edit" },
    ],
    action: { label: "Explore dashboard", href: "/" },
  },
};

const otherItems: SidebarItem[] = [];

interface WorkspaceShellProps {
  children: React.ReactNode;
}

export default function WorkspaceShell({ children }: WorkspaceShellProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createValue, setCreateValue] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [createBusy, setCreateBusy] = useState(false);
  const [compactSidebar, setCompactSidebar] = useState(false);
  const [narrowSidebar, setNarrowSidebar] = useState(false);
  const [overlaySidebar, setOverlaySidebar] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const createRef = useRef<HTMLDivElement>(null);
  const avatarKey = session?.user?.email ?? session?.user?.id ?? null;
  const { avatar } = useAvatarPreference(avatarKey);
  const [signingOut, setSigningOut] = useState(false);
  const fallbackAvatar = getAvatarFallback(
    avatarKey,
    session?.user?.name ?? session?.user?.email ?? "Account"
  );

  function openCreateModal() {
    setCreateValue("");
    setCreateError(null);
    setCreateBusy(false);
    setCreateOpen(true);
  }

  function closeCreateModal() {
    if (createBusy) return;
    setCreateOpen(false);
  }

  async function handleCreateStart() {
    if (!createValue.trim()) {
      setCreateError("Please name your project.");
      return;
    }
    const clean = sanitizeProjectName(createValue);
    try {
      window.localStorage?.setItem(PROJECT_NAME_STORAGE_KEY, clean);
    } catch {
      // ignore storage failures
    }
    setCreateBusy(true);
    await resetWorkspaceStorage();
    const ownerId = session?.user?.id ?? session?.user?.email ?? null;
    addRecentProject(ownerId, clean);
    setCreateBusy(false);
    setCreateOpen(false);
    router.push("/studio");
  }

  const [activeProjectsFilter, setActiveProjectsFilter] = useState("all");
  const itemLabelClasses = "opacity-100 translate-x-0 max-w-full";
  const panelKey =
    pathname === "/"
      ? "home"
      : pathname?.startsWith("/projects")
        ? "projects"
        : pathname?.startsWith("/signature-center")
          ? "signatures"
          : "default";
  const activePanel = sidebarPanels[panelKey] ?? sidebarPanels.default;
  const simplePanelList =
    activePanel.items.length > 0 && activePanel.items.every((item) => item.icon && !item.description);

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
      if (!createRef.current?.contains(event.target as Node) && !createBusy) {
        setCreateOpen(false);
      }
    }

    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !createBusy) {
        setCreateOpen(false);
      }
    }

      document.addEventListener("mousedown", handleClick);
      document.addEventListener("keydown", handleKey);
      return () => {
        document.removeEventListener("mousedown", handleClick);
        document.removeEventListener("keydown", handleKey);
      };
  }, [createOpen, createBusy]);

  useEffect(() => {
    const updateCompact = () => {
      if (typeof window === "undefined") return;
      setCompactSidebar(window.innerHeight < 900);
    };

    updateCompact();
    window.addEventListener("resize", updateCompact);
    return () => {
      window.removeEventListener("resize", updateCompact);
    };
  }, []);

  useEffect(() => {
    const updateWidth = () => {
      if (typeof window === "undefined") return;
      const width = window.innerWidth;
      setNarrowSidebar(width < 1280);
      setOverlaySidebar(width < 1400);
    };

    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => {
      window.removeEventListener("resize", updateWidth);
    };
  }, []);

  const sidebarCompact = compactSidebar || narrowSidebar;
  const shouldOverlay = overlaySidebar;
  const railWidthClass = sidebarCompact ? "w-[104px]" : "w-24";
  const panelLeftClass = sidebarCompact ? "left-[104px]" : "left-[96px]";
  const baseContentOffsetClass = sidebarCompact ? "md:ml-[104px]" : "md:ml-24";
  const expandedContentOffsetClass =
    expanded && !shouldOverlay
      ? sidebarCompact
        ? "lg:ml-[344px]"
        : "lg:ml-[416px]"
      : "";
  const sidebarExpandedClass = expanded && !shouldOverlay ? "with-sidebar-panel" : "";
  const contentOffsetClass = `${baseContentOffsetClass} ${expandedContentOffsetClass} ${sidebarExpandedClass}`.trim();

  useEffect(() => {
    if (!expanded || !shouldOverlay) return;

    const handleClick = (event: MouseEvent) => {
      if (!(event.target instanceof Node)) return;
      if (sidebarRef.current?.contains(event.target) || panelRef.current?.contains(event.target)) {
        return;
      }
      setExpanded(false);
    };

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [expanded, shouldOverlay]);

  useEffect(() => {
    if (panelKey === "projects") {
      setActiveProjectsFilter("all");
    }
  }, [panelKey]);

  const renderItems = (
    items: SidebarItem[],
    {
      labelClassName,
      forceExpanded,
    }: { labelClassName?: string; forceExpanded?: boolean } = {},
  ) =>
    items.map(({ label, icon: Icon, href, disabled }) => {
      const isExpanded = forceExpanded ?? expanded;
      const isActive =
        !disabled &&
        (href === "/"
          ? pathname === "/"
          : pathname?.startsWith(href) || false);
      const iconWrapperBase = isExpanded
        ? `flex ${sidebarCompact ? "h-9 w-9 lg:h-11 lg:w-11" : "h-11 w-11"} items-center justify-center rounded-2xl transition`
        : `flex ${sidebarCompact ? "h-11" : "h-13"} w-full items-center justify-center rounded-2xl transition`;
      const iconWrapperState = isActive
        ? "bg-sky-100 text-sky-600 shadow-inner"
        : "bg-transparent text-slate-500 group-hover:bg-slate-100/80";
      const iconWrapperClasses = `${iconWrapperBase} ${iconWrapperState}`;
      const iconSizeClasses = isExpanded
        ? sidebarCompact
          ? "h-6 w-6 lg:h-6.5 lg:w-6.5"
          : "h-6.5 w-6.5"
        : sidebarCompact
          ? "h-6 w-6"
          : "h-9 w-9";
      const expandedLayoutClasses = sidebarCompact
        ? "items-center justify-start gap-2 px-2.5 py-1.5 text-left text-[11px]"
        : "items-center justify-start gap-3 px-3 py-2 text-left";
      const collapsedLayoutClasses = sidebarCompact
        ? "flex-col items-stretch justify-center gap-1.5 px-1 py-2.5 text-center"
        : "flex-col items-stretch justify-center gap-2 px-1 py-3 text-center";

      return (
        <button
          key={label}
          type="button"
          onClick={() => {
            if (disabled) return;
            if (label === "Projects") {
              router.push("/projects/all");
            } else {
              router.push(href);
            }
            setMobileOpen(false);
          }}
          aria-label={label}
          disabled={disabled}
          className={`group flex w-full overflow-hidden rounded-xl text-sm font-semibold transition ${
            disabled
              ? "cursor-not-allowed text-slate-400"
              : isActive
                ? "text-sky-900"
                : "text-slate-800"
          } ${isExpanded ? expandedLayoutClasses : collapsedLayoutClasses}`}
        >
          <span className={iconWrapperClasses}>
            <Icon className={`${iconSizeClasses} shrink-0 stroke-[1.5]`} aria-hidden />
          </span>
          {isExpanded ? (
            <span
              className={`inline-flex flex-1 overflow-hidden whitespace-nowrap text-sm transition-all duration-200 ease-in-out ${
                isExpanded ? (sidebarCompact ? "ml-1.5 lg:ml-2" : "ml-2") : "ml-0"
              } ${labelClassName ?? ""} font-semibold`}
            >
              {label}
            </span>
          ) : (
            <span
              className={`text-[10px] font-semibold uppercase tracking-wide ${
                isActive ? "text-sky-700" : "text-slate-500"
              }`}
            >
              {label}
            </span>
          )}
        </button>
      );
    });

  return (
    <>
    <div className="flex min-h-screen bg-white">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 z-30 h-screen text-slate-800">
        <div className="relative flex h-full w-full">
          <div
            ref={sidebarRef}
            className={`flex h-full ${railWidthClass} flex-col border-r border-white/40 bg-white/80 backdrop-blur-xl shadow-[0_25px_80px_rgba(15,23,42,0.25)] ${
              sidebarCompact ? "z-10" : "z-20"
            }`}
          >
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto overflow-x-hidden px-2 lg:px-3 py-5">
              <div className="flex items-center justify-center">
              <button
                type="button"
                onClick={() => setExpanded((prev) => !prev)}
                className="relative z-10 flex h-9 w-9 items-center justify-center rounded-full bg-[#1e293b] text-white shadow-[0_8px_24px_rgba(10,37,64,0.35)] transition hover:bg-[#253248]"
                aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
              >
                {expanded ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
              </button>
            </div>

            <div className="px-1 mt-3 mb-3">
              <button
                type="button"
                onClick={openCreateModal}
                className={`flex w-full flex-col items-center gap-2 rounded-2xl bg-[#4C6FFF] ${
                  sidebarCompact ? "px-2 py-2 lg:px-3 lg:py-2.5" : "px-3 py-3.5"
                } text-center text-sm font-semibold text-white shadow-lg transition hover:bg-[#3A54D6]`}
              >
                <span
                  className={`flex ${sidebarCompact ? "h-6 w-6 lg:h-8 lg:w-8" : "h-8 w-8"} items-center justify-center rounded-full bg-white/20 text-white`}
                >
                  <Plus className={`${sidebarCompact ? "h-4.5 w-4.5 lg:h-5 lg:w-5" : "h-5 w-5"} stroke-[3]`} />
                </span>
            <span className="text-[10px] font-bold uppercase text-white">Create</span>
          </button>
        </div>
            <nav className="flex flex-col gap-1">
              {renderItems(navigationItems, {
                labelClassName: itemLabelClasses,
                forceExpanded: false,
              })}
            </nav>

            {otherItems.length > 0 ? (
              <div className="flex flex-col gap-1 items-center">
                {renderItems(otherItems, { labelClassName: itemLabelClasses, forceExpanded: false })}
              </div>
            ) : null}
          </div>

          <div
            ref={profileRef}
            className={`relative z-50 px-3 pb-6 ${
              sidebarCompact ? "mt-14 sticky bottom-0" : "mt-auto sticky bottom-4"
            }`}
          >
              <button
              type="button"
              onClick={() => setProfileOpen((prev) => !prev)}
              className="flex w-full items-center justify-center rounded-2xl px-3 py-2 transition hover:bg-white/70"
              >
                <span
                  className={`relative flex ${
                    sidebarCompact ? "h-[60px] w-[60px]" : "h-16 w-16"
                  } shrink-0 items-center justify-center rounded-full ${
                    sidebarCompact ? "border-[5px]" : "border-[6px]"
                  } ${
                    profileOpen ? "border-sky-300" : "border-transparent"
                  }`}
                >
                  {avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatar}
                      alt="Your avatar"
                      className={`${sidebarCompact ? "h-[48px] w-[48px]" : "h-12 w-12"} shrink-0 rounded-full object-cover`}
                    />
                  ) : (
                    <span
                      className={`flex ${
                        sidebarCompact ? "h-[48px] w-[48px] text-sm" : "h-12 w-12 text-base"
                      } items-center justify-center rounded-full font-semibold uppercase text-white`}
                      style={{ backgroundColor: fallbackAvatar.color }}
                    >
                      {fallbackAvatar.initials}
                    </span>
                  )}
              </span>
            </button>

              <div
                className={`absolute bottom-6 left-full z-[60] ml-4 w-80 rounded-3xl border border-slate-100 bg-white p-4 text-sm text-slate-800 shadow-[0_30px_80px_rgba(15,23,42,0.35)] transition ${
                  profileOpen ? "opacity-100 translate-y-0" : "pointer-events-none opacity-0 translate-y-2"
                }`}
              >
                <div className="flex items-center gap-3 rounded-2xl border border-slate-100 px-3 py-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-50 text-slate-600">
                    {avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={avatar} alt="Your avatar" className="h-10 w-10 rounded-full object-cover" />
                    ) : (
                      <span
                        className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold uppercase text-white"
                        style={{ backgroundColor: fallbackAvatar.color }}
                      >
                        {fallbackAvatar.initials}
                      </span>
                    )}
                  </span>
                  <div className="flex-1">
                    <p className="text-base font-semibold text-slate-900">{session?.user?.name ?? "Account"}</p>
                    {session?.user?.email ? (
                      <p className="text-xs text-slate-500">{session.user.email}</p>
                    ) : null}
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(false);
                      router.push("/account");
                    }}
                    className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <div className="flex items-center gap-3">
                      <Settings className="h-5 w-5 text-slate-500" aria-hidden />
                      <span>Settings</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(false);
                      router.push("/account?view=pricing");
                    }}
                    className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-5 w-5 text-slate-500" aria-hidden />
                      <span>Plans &amp; Pricing</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(false);
                      router.push("/projects/trash");
                    }}
                    className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <div className="flex items-center gap-3">
                      <Trash2 className="h-5 w-5 text-slate-500" aria-hidden />
                      <span>Trash</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400" aria-hidden />
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
                    className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left font-semibold text-red-600 transition hover:bg-red-50"
                  >
                    <LogOut className="h-5 w-5" aria-hidden />
                    <span>Log out</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
          {expanded ? (
            <div
              ref={panelRef}
              className={`absolute ${panelLeftClass} top-0 hidden h-full bg-gradient-to-b from-white via-white/95 to-white/90 px-4 py-6 text-slate-800 shadow-[20px_0_60px_rgba(15,23,42,0.25)] lg:shadow-[0_35px_90px_rgba(15,23,42,0.3)] backdrop-blur-xl transition-[transform,opacity,filter] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform md:flex ${sidebarCompact ? "w-[240px]" : "w-[320px]"} z-0 ${
                expanded ? "translate-x-0 opacity-100 blur-0 pointer-events-auto" : "-translate-x-10 opacity-0 blur-sm"
              }`}
            >
              <div className="flex w-full flex-col gap-6">
                <AppHeaderBrand />
                {activePanel.title ? (
                  <div>
                    {activePanel.subtitle ? (
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                        {activePanel.subtitle}
                      </p>
                    ) : null}
                    <h3 className={`mt-2 text-lg font-semibold ${activePanel.subtitle ? "" : "mt-0"}`}>
                      {activePanel.title}
                    </h3>
                  </div>
                ) : null}
                <ul className={simplePanelList ? "space-y-2" : "space-y-3"}>
                  {activePanel.items.map((item) => {
                    const ItemIcon = item.icon;
                    if (simplePanelList && ItemIcon) {
                      return (
                        <li key={item.key ?? item.label}>
                          <button
                            type="button"
                            onClick={() => {
                              const newValue = item.key ?? item.label;
                              setActiveProjectsFilter(newValue);
                              const onProjectsRoute = pathname?.startsWith("/projects") ?? false;
                              if (!onProjectsRoute) {
                                router.push("/projects/all");
                              } else if (newValue === "all" && pathname !== "/projects/all") {
                                router.push("/projects/all");
                              }
                            }}
                            className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-[0.95rem] font-semibold transition ${
                              activeProjectsFilter === (item.key ?? item.label)
                                ? "bg-sky-50 text-sky-700 shadow-inner"
                                : "text-slate-700 hover:bg-slate-50"
                            }`}
                          >
                            <ItemIcon
                              className={`h-6 w-6 ${
                                activeProjectsFilter === (item.key ?? item.label) ? "text-sky-600" : "text-slate-500"
                              }`}
                              aria-hidden
                            />
                            <span className="text-[0.95rem]">{item.label}</span>
                          </button>
                        </li>
                      );
                    }

                    return (
                      <li key={item.label} className="rounded-2xl border border-slate-100 bg-white px-3 py-2">
                        <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                        {item.description ? (
                          <p className="text-xs text-slate-500">{item.description}</p>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
                {activePanel.action ? (
                  <button
                    type="button"
                    onClick={() => router.push(activePanel.action!.href)}
                    className="text-sm font-semibold text-sky-600 transition hover:text-sky-700"
                  >
                    {activePanel.action.label}
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
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
              <nav className="flex flex-col gap-1">
                {renderItems(navigationItems, {
                  labelClassName: "opacity-100 translate-x-0",
                  forceExpanded: true,
                })}
              </nav>

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
                    {renderItems(otherItems, {
                      labelClassName: "opacity-100 translate-x-0",
                      forceExpanded: true,
                    })}
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

      <div
        className={`flex min-h-screen w-full flex-col bg-white transition-all duration-300 ease-in-out ${contentOffsetClass}`}
      >
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

        <Suspense fallback={<PageLoadingSkeleton />}>
          <main className="page-fade-in flex-1">{children}</main>
        </Suspense>
      </div>
    </div>

      {createOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
            onClick={closeCreateModal}
          />
          <div
            ref={createRef}
            className="page-fade-in relative z-10 w-full max-w-3xl rounded-2xl border border-white/60 bg-white/35 bg-gradient-to-b from-white/90 via-white/70 to-white/40 p-1.5 text-slate-900 shadow-[0_22px_60px_rgba(15,23,42,0.22)] backdrop-blur-lg sm:p-2"
          >
            <form
              className="overflow-hidden rounded-[18px] bg-white/85 px-6 pt-8 pb-6 shadow-[0_0_0_1px_rgba(148,163,184,0.14)] sm:px-10 sm:pt-10 sm:pb-8"
              onSubmit={(event) => {
                event.preventDefault();
                void handleCreateStart();
              }}
            >
              <h2 className="text-[23px] font-semibold tracking-tight text-slate-900 sm:text-[26px]">
                Create a new project
              </h2>
              <p className="mt-3 text-sm text-slate-600">
                Give your project a name to get started.
              </p>
              <div className="mt-6 space-y-2">
                <input
                  type="text"
                  autoFocus
                  value={createValue}
                  onChange={(event) => {
                    setCreateValue(event.target.value);
                    if (createError) setCreateError(null);
                  }}
                  className="w-full rounded-xl border border-slate-200/80 bg-white px-4 py-3 text-base text-slate-900 outline-none placeholder:text-slate-500 shadow-[0_1px_0_rgba(15,23,42,0.06)] focus:border-sky-300 focus:shadow-[0_0_0_1px_rgba(56,189,248,0.35)] focus:ring-2 focus:ring-sky-100"
                  placeholder="Name your project"
                />
                {createError ? <p className="text-sm text-rose-500">{createError}</p> : null}
              </div>
              <div className="mt-6 rounded-t-none rounded-b-[18px] bg-slate-50/80 px-1.5 pt-3">
                <div className="flex justify-end gap-3 text-sm">
                  <button
                    type="button"
                    onClick={closeCreateModal}
                    className="px-2 py-2 text-slate-500 transition hover:text-slate-900"
                    disabled={createBusy}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center rounded-full bg-gradient-to-r from-sky-500 to-sky-600 px-5 py-2 font-semibold text-white transition hover:-translate-y-0.5 hover:from-sky-600 hover:to-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:translate-y-0 disabled:opacity-60"
                    disabled={createBusy}
                  >
                    {createBusy ? (
                      <span className="flex items-center gap-2">
                        <span
                          className="h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-white"
                          aria-hidden
                        />
                        <span>Preparing…</span>
                      </span>
                    ) : (
                      "Start project"
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
