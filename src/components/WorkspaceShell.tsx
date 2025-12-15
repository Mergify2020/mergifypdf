"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
import { addRecentProject, loadRecentProjects, RECENT_PROJECTS_EVENT, saveRecentProjects } from "@/lib/recentProjects";
import AppHeaderBrand from "./AppHeaderBrand";
import SettingsMenu from "./SettingsMenu";
import HeroHeader from "./HeroHeader";
import PageLoadingSkeleton from "./PageLoadingSkeleton";
import { useAvatarPreference } from "@/lib/useAvatarPreference";
import { getAvatarFallback } from "@/lib/avatarFallback";
import {
  getProjectsSummaryCache,
  PROJECTS_SUMMARY_EVENT,
  refreshProjectsSummary,
  setProjectsSummaryCache,
  type ProjectsSummaryProject,
} from "@/lib/projectsSummaryCache";
import { preloadImageUrls } from "@/lib/preloadImageUrls";

const WORKSPACE_META_KEY = "mpdf:files";
const WORKSPACE_HIGHLIGHTS_KEY = "mpdf:highlights";

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
  items: {
    label: string;
    description?: string;
    icon?: LucideIcon;
    key?: string;
    previewUrl?: string | null;
    hidePreview?: boolean;
  }[];
  action?: { label: string; href: string };
};

const sidebarPanels: Record<string, SidebarPanel> = {
  home: {
    title: "Recent Projects",
    subtitle: "",
    items: [],
    action: { label: "See All", href: "/projects/all" },
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
  const [homeRecentProjects, setHomeRecentProjects] = useState<
    { id?: string; title: string; updatedAt?: number; previewUrl?: string | null }[]
  >([]);
  const [expanded, setExpanded] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileMenuPosition, setProfileMenuPosition] = useState<{ left: number; bottom: number } | null>(
    null,
  );
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
  const profileMenuRef = useRef<HTMLDivElement>(null);
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
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: clean, data: { pages: [], sources: [], pagesCount: 0 } }),
      });
      if (!res.ok) {
        setCreateError("Could not create that project. Please try again.");
        setCreateBusy(false);
        return;
      }
      const json = (await res.json().catch(() => null)) as { project?: { id?: string } } | null;
      const id = json?.project?.id;
      if (!id) {
        setCreateError("Could not create that project. Please try again.");
        setCreateBusy(false);
        return;
      }
      addRecentProject(ownerId, clean, id);
      setCreateBusy(false);
      setCreateOpen(false);
      router.push(`/studio?project=${encodeURIComponent(id)}`);
    } catch {
      setCreateError("Could not create that project. Please try again.");
      setCreateBusy(false);
    }
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

  const isPricingRoute = pathname === "/pricing";
  const isAccountRoute = pathname?.startsWith("/account");
  const isProjectsPanel = panelKey === "projects";
  const isHomePanel = panelKey === "home";
  const PanelTitleIcon: LucideIcon | null =
    panelKey === "home"
      ? FolderKanban
      : panelKey === "projects"
        ? Folders
        : panelKey === "signatures"
          ? PenSquare
          : BookOpen;

  useEffect(() => {
    router.prefetch("/");
    router.prefetch("/projects/all");
  }, [router]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const ownerKey = session?.user?.id ?? session?.user?.email ?? null;
    if (!ownerKey) return;
    if (getProjectsSummaryCache(ownerKey)) return;

    let cancelled = false;
    const warm = async () => {
      try {
        const res = await fetch("/api/projects?summary=1", { cache: "force-cache" });
        if (!res.ok) return;
        const data = (await res.json()) as { projects?: ProjectsSummaryProject[] };
        if (!Array.isArray(data.projects) || cancelled) return;
        setProjectsSummaryCache(ownerKey, data.projects);
        preloadImageUrls(
          data.projects
            .map((project) => project.previewUrl)
            .filter((url): url is string => typeof url === "string" && url.length > 0)
            .slice(0, 12),
        );
      } catch {
        // ignore warmup failures
      }
    };
    void warm();
    return () => {
      cancelled = true;
    };
  }, [session?.user?.email, session?.user?.id]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const ownerKey = session?.user?.id ?? session?.user?.email ?? null;
    if (!ownerKey) {
      setHomeRecentProjects([]);
      return;
    }

    const sync = () => {
      const summary = getProjectsSummaryCache(ownerKey) ?? [];
      const recentEntries = loadRecentProjects(ownerKey)
        .slice()
        .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));

      const merged = recentEntries
        .map((entry) => {
          const match = summary.find((project) => project.id === entry.id);
          const title = match?.name?.trim() || entry.title?.trim() || "Untitled project";
          const updatedAt = match
            ? new Date(match.updatedAt).getTime()
            : entry.updatedAt ?? Date.now();
          return {
            id: entry.id,
            title,
            updatedAt,
            previewUrl: match?.previewUrl ?? null,
          };
        })
        .filter((entry) => Boolean(entry.id) && entry.title.length > 0);

      if (merged.length > 0) {
        setHomeRecentProjects(merged);
        return;
      }

      const fallback = summary
        .slice()
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 5)
        .map((project) => ({
          id: project.id,
          title: project.name?.trim() || "Untitled project",
          updatedAt: new Date(project.updatedAt).getTime(),
          previewUrl: project.previewUrl ?? null,
        }));
      setHomeRecentProjects(fallback);
    };

    const recentEventKey = `${RECENT_PROJECTS_EVENT}:${ownerKey ?? "anon"}`;
    const summaryEventKey = `${PROJECTS_SUMMARY_EVENT}:${ownerKey ?? "anon"}`;
    window.addEventListener(recentEventKey, sync);
    window.addEventListener(summaryEventKey, sync);

    const reconcileRecents = (projects: ProjectsSummaryProject[]) => {
      const existing = loadRecentProjects(ownerKey);
      if (existing.length === 0) return;

      const allowed = new Set(projects.map((project) => project.id));
      if (allowed.size === 0) {
        saveRecentProjects(ownerKey, []);
        return;
      }

      const nameById = new Map(
        projects.map((project) => [project.id, project.name?.trim() || "Untitled project"] as const),
      );
      const next = existing
        .filter((entry) => allowed.has(entry.id))
        .map((entry) => ({ ...entry, title: nameById.get(entry.id) ?? entry.title }));

      if (next.length !== existing.length || next.some((entry, index) => entry.title !== existing[index]?.title)) {
        saveRecentProjects(ownerKey, next);
      }
    };

    const refreshAndSync = async () => {
      const projects = await refreshProjectsSummary(ownerKey, "no-store");
      if (projects) {
        reconcileRecents(projects);
      }
      if (projects && projects.length > 0) {
        preloadImageUrls(
          projects
            .map((project) => project.previewUrl)
            .filter((url): url is string => typeof url === "string" && url.length > 0)
            .slice(0, 12),
        );
      }
      sync();
    };

    const handleFocus = () => {
      void refreshAndSync();
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void refreshAndSync();
      }
    };

    sync();
    void refreshProjectsSummary(ownerKey, "force-cache").then((projects) => {
      if (projects) {
        reconcileRecents(projects);
      }
      if (projects && projects.length > 0) {
        preloadImageUrls(
          projects
            .map((project) => project.previewUrl)
            .filter((url): url is string => typeof url === "string" && url.length > 0)
            .slice(0, 12),
        );
      }
      sync();
    });

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener(recentEventKey, sync);
      window.removeEventListener(summaryEventKey, sync);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [session?.user?.email, session?.user?.id]);

  const activePanelItems: SidebarPanel["items"] =
    panelKey === "home"
      ? (() => {
          const sorted = [...homeRecentProjects].sort(
            (a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0),
          );
          const mapped = sorted
            .map((entry) => ({
              key: entry.id,
              label: entry.title?.trim() || "Untitled project",
              previewUrl: entry.previewUrl ?? null,
            }))
            .filter((entry) => entry.label.length > 0)
            .slice(0, 5);
          return mapped.length > 0 ? mapped : [{ label: "No projects yet", hidePreview: true }];
        })()
      : activePanel.items;

  useEffect(() => {
    if (!profileOpen) return;

    function handleClick(event: MouseEvent) {
      const target = event.target as Node;
      if (!profileRef.current?.contains(target) && !profileMenuRef.current?.contains(target)) {
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
    if (typeof window === "undefined") return;
    if (!profileOpen) {
      setProfileMenuPosition(null);
      return;
    }

    let raf = 0;

    const update = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const anchor = profileRef.current;
        if (!anchor) return;
        const rect = anchor.getBoundingClientRect();
        const left = Math.round(rect.right + 16);
        const bottom = Math.round(window.innerHeight - (rect.bottom - 24));
        setProfileMenuPosition({ left, bottom });
      });
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);

    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [profileOpen, compactSidebar, narrowSidebar]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handler = () => {
      openCreateModal();
    };

    (window as any).addEventListener("open-create-project", handler);
    return () => {
      (window as any).removeEventListener("open-create-project", handler);
    };
  }, []);

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
      setOverlaySidebar(width < 1024);
    };

    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => {
      window.removeEventListener("resize", updateWidth);
    };
  }, []);

  const sidebarCompact = compactSidebar || narrowSidebar;
  const shouldOverlay = overlaySidebar;
  const railWidthClass = sidebarCompact ? "w-28" : "w-28";
  const panelLeftClass = sidebarCompact ? "left-28" : "left-28";
  const baseContentOffsetClass = sidebarCompact ? "md:pl-28" : "md:pl-28";
  const expandedContentOffsetClass =
    expanded && !shouldOverlay
      ? sidebarCompact
        ? "md:pl-[352px]"
        : "md:pl-[432px]"
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

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handler = () => {
      setExpanded(true);
    };

    (window as any).addEventListener("open-account-panel", handler);
    return () => {
      (window as any).removeEventListener("open-account-panel", handler);
    };
  }, []);

  useEffect(() => {
    if (!isAccountRoute || typeof window === "undefined") return;
    try {
      const shouldOpen = window.localStorage?.getItem("mpdf:open-account-panel");
      if (shouldOpen === "1") {
        setExpanded(true);
        window.localStorage.removeItem("mpdf:open-account-panel");
      }
    } catch {
      // ignore storage read errors
    }
  }, [isAccountRoute]);

  const openBillingPortal = async () => {
    try {
      const res = await fetch("/api/billing-portal", {
        method: "POST",
      });

      if (!res.ok) {
        // eslint-disable-next-line no-console
        console.error("Failed to load portal");
        return;
      }

      const { url } = (await res.json()) as { url?: string };
      if (url) {
        window.location.href = url;
      }
    } catch {
      // eslint-disable-next-line no-console
      console.error("Unexpected error loading billing portal");
    } finally {
      setProfileOpen(false);
      setExpanded(false);
    }
  };

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
        ? "flex w-full items-center justify-start rounded-2xl transition"
        : `flex ${sidebarCompact ? "h-11" : "h-13"} w-full items-center justify-center rounded-2xl transition`;
      const iconWrapperState = isActive
        ? "text-sky-600"
        : "text-slate-500";
      const iconWrapperClasses = `${iconWrapperBase} ${iconWrapperState}`;
      const iconSizeClasses = isExpanded
        ? sidebarCompact
          ? "h-7 w-7 lg:h-8 lg:w-8"
          : "h-8 w-8 xl:h-9 xl:w-9"
        : sidebarCompact
          ? "h-6 w-6"
          : "h-8 w-8 lg:h-9 lg:w-9";
      const expandedLayoutClasses = sidebarCompact
        ? "items-center justify-start gap-2 px-1 py-1.5 text-left text-[11px]"
        : "items-center justify-start gap-2 px-1 py-2 text-left";
      const collapsedLayoutClasses = sidebarCompact
        ? "flex-col items-stretch justify-center gap-1.5 px-1 py-2.5 text-center"
        : "flex-col items-stretch justify-center gap-2 px-1 py-3 text-center";

      const targetHref = label === "Projects" ? "/projects/all" : href;
      const itemClasses = `group flex w-full overflow-hidden rounded-xl text-sm lg:text-base xl:text-lg font-semibold transition-transform transition-shadow duration-150 ease-out ${
        disabled
          ? "cursor-not-allowed text-slate-400 hover:bg-slate-100 hover:-translate-y-0.5 hover:shadow-md"
          : isActive
            ? "text-sky-900 bg-sky-100 hover:-translate-y-0.5 hover:shadow-md"
            : "text-[#013D63] hover:bg-slate-100 hover:-translate-y-0.5 hover:shadow-md"
      } ${isExpanded ? expandedLayoutClasses : collapsedLayoutClasses}`;

      const content = (
        <>
          <span className={iconWrapperClasses}>
            <Icon className={`${iconSizeClasses} shrink-0 stroke-[1.5]`} aria-hidden />
          </span>
          {isExpanded ? (
            <span
              className={`inline-flex flex-1 whitespace-nowrap overflow-hidden text-ellipsis text-sm lg:text-base xl:text-lg transition-all duration-200 ease-in-out ${
                isExpanded ? (sidebarCompact ? "ml-1.5 lg:ml-2" : "ml-2") : "ml-0"
              } ${labelClassName ?? ""} font-semibold`}
            >
              {label}
            </span>
          ) : (
            <span
              className={`text-[11px] sm:text-xs lg:text-sm font-semibold tracking-wide ${
                isActive ? "text-sky-700" : "text-slate-500"
              }`}
            >
              {label}
            </span>
          )}
        </>
      );

      if (disabled) {
        return (
          <button key={label} type="button" aria-label={label} disabled className={itemClasses}>
            {content}
          </button>
        );
      }

      return (
        <Link
          key={label}
          href={targetHref}
          prefetch
          onClick={() => {
            setMobileOpen(false);
          }}
          aria-label={label}
          className={itemClasses}
        >
          {content}
        </Link>
      );
    });

  const renderMobileNavItems = (items: SidebarItem[]) =>
    items.map(({ label, icon: Icon, href, disabled }) => {
      const isActive =
        !disabled &&
        (href === "/"
          ? pathname === "/"
          : pathname?.startsWith(href) || false);
      const targetHref = label === "Projects" ? "/projects/all" : href;
      const baseClasses =
        "flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-semibold transition";
      const stateClasses = disabled
        ? "cursor-not-allowed text-slate-400"
        : isActive
          ? "bg-sky-100 text-sky-900"
          : "text-[#013D63] hover:bg-slate-100";

      const content = (
        <>
          <Icon className="h-6 w-6 shrink-0 stroke-[1.5]" aria-hidden />
          <span className="truncate whitespace-nowrap">{label}</span>
        </>
      );

      if (disabled) {
        return (
          <button key={label} type="button" aria-label={label} disabled className={`${baseClasses} ${stateClasses}`}>
            {content}
          </button>
        );
      }

      return (
        <Link
          key={label}
          href={targetHref}
          prefetch
          onClick={() => setMobileOpen(false)}
          aria-label={label}
          className={`${baseClasses} ${stateClasses}`}
        >
          {content}
        </Link>
      );
    });

  const workspaceShell = (
    <>
    <div className="flex min-h-screen bg-slate-100">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 z-50 lg:z-30 h-screen text-slate-800">
        <div className="relative flex h-full w-full">
          <div
            ref={sidebarRef}
            className={`flex h-full ${railWidthClass} flex-col border-r border-slate-200 bg-white shadow-[0_25px_80px_rgba(15,23,42,0.25)] ${
              sidebarCompact ? "z-10" : "z-20"
            }`}
          >
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto overflow-x-hidden px-1 lg:px-2 py-5">
              <div className="flex items-center justify-center">
              <button
                type="button"
                onClick={() => setExpanded((prev) => !prev)}
                className="relative z-10 flex h-9 w-9 items-center justify-center rounded-full bg-[#1e293b] text-white shadow-[0_8px_24px_rgba(10,37,64,0.35)] transition hover:bg-[#253248]"
                aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
              >
                {expanded ? <ChevronLeft className="h-6 w-6" /> : <ChevronRight className="h-6 w-6" />}
              </button>
            </div>

            <div className="px-1 mt-3 mb-3">
              <button
                type="button"
                onClick={openCreateModal}
                className={`flex w-full flex-col items-center gap-2 rounded-2xl border-[3px] border-[#51bdff] bg-[#008ade] ${
                  sidebarCompact ? "px-2 py-3 lg:px-3 lg:py-3.5" : "px-3 py-4"
                } text-center text-base font-semibold text-white shadow-[0_14px_40px_rgba(15,23,42,0.45)] transition-transform transition-shadow duration-150 ease-out hover:-translate-y-0.5 hover:shadow-[0_18px_50px_rgba(15,23,42,0.6)] hover:bg-[#007fcd]`}
              >
                <span
                  className={`flex ${sidebarCompact ? "h-6 w-6 lg:h-8 lg:w-8" : "h-8 w-8"} items-center justify-center rounded-full bg-white/20 text-white`}
                >
                  <Plus className={`${sidebarCompact ? "h-4.5 w-4.5 lg:h-5 lg:w-5" : "h-5 w-5"} stroke-[3]`} />
                </span>
                <span className="text-[11px] sm:text-xs lg:text-sm font-semibold leading-tight text-white">
                  New
                  <br />
                  Project
                </span>
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
                    sidebarCompact ? "h-[72px] w-[72px]" : "h-20 w-20"
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
                      className={`${sidebarCompact ? "h-[58px] w-[58px]" : "h-16 w-16"} shrink-0 rounded-full object-cover`}
                    />
                  ) : (
                    <span
                      className={`flex ${
                        sidebarCompact ? "h-[58px] w-[58px] text-sm" : "h-16 w-16 text-base"
                      } items-center justify-center rounded-full font-semibold uppercase text-white`}
                      style={{ backgroundColor: fallbackAvatar.color }}
                    >
                      {fallbackAvatar.initials}
                    </span>
                  )}
              </span>
            </button>

            {typeof document !== "undefined" && profileOpen && profileMenuPosition
              ? createPortal(
                  <div
                    ref={profileMenuRef}
                    className="fixed z-[60] w-80 rounded-3xl border border-slate-100 bg-white p-4 text-sm text-slate-800 shadow-[0_30px_80px_rgba(15,23,42,0.35)]"
                    style={{ left: profileMenuPosition.left, bottom: profileMenuPosition.bottom }}
                    onMouseDown={(event) => {
                      event.stopPropagation();
                    }}
                  >
                <div className="flex items-center gap-3 rounded-2xl border-[3px] border-slate-300 px-3 py-3">
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
                    <p className="text-lg font-semibold text-slate-900">{session?.user?.name ?? "Account"}</p>
                    {session?.user?.email ? (
                      <p className="text-sm text-slate-500">{session.user.email}</p>
                    ) : null}
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  {isAccountRoute ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setExpanded(true);
                          setProfileOpen(false);
                          router.push("/account");
                        }}
                        className="flex w-full items-center justify-between rounded-2xl bg-slate-100 px-4 py-3.5 text-left text-2xl font-semibold text-slate-800"
                      >
                        <div className="flex items-center gap-3">
                          <User className="h-6 w-6 text-slate-600" aria-hidden />
                          <span>Account</span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-400" aria-hidden />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          void openBillingPortal();
                        }}
                        className="flex w-full items-center justify-between rounded-2xl px-4 py-3.5 text-left text-2xl font-semibold text-slate-800 transition hover:bg-slate-50"
                      >
                        <div className="flex items-center gap-3">
                          <CreditCard className="h-6 w-6 text-slate-500" aria-hidden />
                          <span>Billing portal</span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-400" aria-hidden />
                      </button>
                      <button
                        type="button"
                      onClick={() => {
                        setProfileOpen(false);
                        router.push("/pricing");
                      }}
                      className="flex w-full items-center justify-between rounded-2xl px-4 py-3.5 text-left text-2xl font-semibold text-slate-800 transition hover:bg-slate-50"
                    >
                      <div className="flex items-center gap-3">
                          <FileText className="h-6 w-6 text-slate-500" aria-hidden />
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
                        className="flex w-full items-center justify-between rounded-2xl px-4 py-3.5 text-left text-2xl font-semibold text-slate-800 transition hover:bg-slate-50"
                      >
                        <div className="flex items-center gap-3">
                          <Trash2 className="h-6 w-6 text-slate-500" aria-hidden />
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
                        className="flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left text-2xl font-semibold text-red-600 transition hover:bg-red-50"
                      >
                        <LogOut className="h-6 w-6" aria-hidden />
                        <span>Log out</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setProfileOpen(false);
                          router.push("/account");
                        }}
                        className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-2xl font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        <div className="flex items-center gap-3">
                          <User className="h-5 w-5 text-slate-500" aria-hidden />
                          <span>Account</span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-400" aria-hidden />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          void openBillingPortal();
                        }}
                        className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-2xl font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        <div className="flex items-center gap-3">
                          <CreditCard className="h-5 w-5 text-slate-500" aria-hidden />
                          <span>Billing portal</span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-400" aria-hidden />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setProfileOpen(false);
                          router.push("/pricing");
                        }}
                        className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-2xl font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-slate-500" aria-hidden />
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
                        className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-2xl font-semibold text-slate-700 transition hover:bg-slate-50"
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
                        className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-2xl font-semibold text-red-600 transition hover:bg-red-50"
                      >
                        <LogOut className="h-6 w-6" aria-hidden />
                        <span>Log out</span>
                      </button>
                    </>
                  )}
                </div>
                  </div>,
                  document.body,
                )
              : null}
            </div>
          </div>
          {expanded ? (
            <div
              ref={panelRef}
              data-workspace-secondary-panel="true"
              className={`absolute ${panelLeftClass} top-0 hidden h-full border-l border-slate-200 ${
                shouldOverlay ? "bg-white" : "bg-slate-100"
              } px-4 py-6 text-slate-800 shadow-[12px_0_36px_rgba(15,23,42,0.10)] transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform md:flex ${sidebarCompact ? "w-[240px]" : "w-[320px]"} z-0 ${
                expanded ? "translate-x-0 opacity-100 pointer-events-auto" : "-translate-x-10 opacity-0 pointer-events-none"
              }`}
            >
              <div className="flex w-full flex-col gap-6">
                <AppHeaderBrand variant="sidebarPanel" />
                {isAccountRoute ? (
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={() => {
                        setExpanded(false);
                        setProfileOpen(false);
                        router.push("/account");
                      }}
                      className="flex w-full items-center gap-3 rounded-2xl bg-slate-100 px-4 py-3.5 text-left text-2xl font-semibold text-slate-800"
                    >
                      <User className="h-6 w-6 text-slate-600" aria-hidden />
                      <span>Account</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        void openBillingPortal();
                      }}
                      className="flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left text-2xl font-semibold text-slate-800 transition hover:bg-slate-50"
                    >
                      <CreditCard className="h-6 w-6 text-slate-600" aria-hidden />
                      <span>Billing portal</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setExpanded(false);
                        setProfileOpen(false);
                        router.push("/pricing");
                      }}
                      className="flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left text-2xl font-semibold text-slate-800 transition hover:bg-slate-50"
                    >
                      <FileText className="h-6 w-6 text-slate-600" aria-hidden />
                      <span>Plans &amp; Pricing</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setExpanded(false);
                        setProfileOpen(false);
                        router.push("/projects/trash");
                      }}
                      className="flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left text-2xl font-semibold text-slate-800 transition hover:bg-slate-50"
                    >
                      <Trash2 className="h-6 w-6 text-slate-600" aria-hidden />
                      <span>Trash</span>
                    </button>
                    <button
                      type="button"
                      disabled={signingOut}
                      onClick={async () => {
                        if (signingOut) return;
                        setExpanded(false);
                        setProfileOpen(false);
                        try {
                          setSigningOut(true);
                          await signOut({ callbackUrl: "/login" });
                        } finally {
                          setSigningOut(false);
                        }
                      }}
                      className="flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left text-2xl font-semibold text-red-600 transition hover:bg-red-50"
                    >
                      <LogOut className="h-6 w-6" aria-hidden />
                      <span>Log out</span>
                    </button>
                  </div>
                ) : (
                  <>
                    {activePanel.title ? (
                      <div>
                        {activePanel.subtitle ? (
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                            {activePanel.subtitle}
                          </p>
                        ) : null}
                        <h3
                          className={`mt-2 flex items-center gap-2 text-lg font-semibold sm:text-xl ${
                            activePanel.subtitle ? "" : "mt-0"
                          } ${panelKey === "home" ? "text-slate-500" : "text-slate-800"}`}
                        >
                          {PanelTitleIcon && panelKey !== "home" ? (
                            <span className="inline-flex h-7 w-7 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                              <PanelTitleIcon className="h-4 w-4" aria-hidden />
                            </span>
                          ) : null}
                          {activePanel.title}
                        </h3>
                      </div>
                    ) : null}
                    <ul className={isHomePanel ? "space-y-1" : simplePanelList ? "space-y-2" : "space-y-3"}>
                      {activePanelItems.map((item) => {
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
                                className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 ${
                                  isProjectsPanel ? "text-base sm:text-lg" : "text-[0.95rem]"
                                } font-semibold transition ${
                                  activeProjectsFilter === (item.key ?? item.label)
                                    ? "bg-sky-50 text-sky-700 shadow-inner"
                                    : "text-slate-700 hover:bg-slate-50"
                                }`}
                              >
                                <ItemIcon
                                  className={`${
                                    isProjectsPanel ? "h-7 w-7 sm:h-8 sm:w-8" : "h-6 w-6"
                                  } ${
                                    activeProjectsFilter === (item.key ?? item.label) ? "text-sky-600" : "text-slate-500"
                                  }`}
                                  aria-hidden
                                />
                                <span className={isProjectsPanel ? "text-base sm:text-lg" : "text-[0.95rem]"}>
                                  {item.label}
                                </span>
                              </button>
                            </li>
                          );
                        }

	                        return (
	                          <li key={item.key ?? item.label} className="px-0 py-0">
	                            {isHomePanel && typeof item.key === "string" && item.key.length > 0 ? (
	                              <button
	                                type="button"
	                                onClick={() => {
	                                  router.push(`/studio?project=${encodeURIComponent(item.key as string)}`);
	                                  if (shouldOverlay) {
	                                    setExpanded(false);
	                                  }
	                                }}
	                                className="flex w-full min-w-0 items-center gap-3 rounded-2xl px-1 py-0.5 text-left transition hover:bg-white/60"
	                              >
	                                <span className="relative inline-flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white text-slate-500 shadow-sm ring-1 ring-slate-200">
	                                  {item.previewUrl ? (
	                                    // eslint-disable-next-line @next/next/no-img-element
	                                    <img
	                                      src={item.previewUrl}
	                                      alt={item.label}
	                                      loading="lazy"
	                                      decoding="async"
	                                      className="h-full w-full object-cover object-top"
	                                    />
	                                  ) : (
	                                    <FileText className="h-6 w-6 opacity-60" aria-hidden />
	                                  )}
	                                </span>
	                                <span className="min-w-0">
	                                  <span className="block truncate text-lg font-semibold text-slate-800 sm:text-xl">
	                                    {item.label}
	                                  </span>
	                                </span>
	                              </button>
	                            ) : (
	                              <p
	                                className={`font-semibold text-slate-800 ${
	                                  isHomePanel ? "text-lg sm:text-xl" : "text-sm"
	                                }`}
	                              >
	                                <span className={isHomePanel ? "flex min-w-0 items-center gap-4" : ""}>
	                                  {isHomePanel && !item.hidePreview ? (
	                                    <span className="relative inline-flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white text-slate-500 shadow-sm ring-1 ring-slate-200">
	                                      {item.previewUrl ? (
	                                        // eslint-disable-next-line @next/next/no-img-element
	                                        <img
	                                          src={item.previewUrl}
	                                          alt={item.label}
	                                          loading="lazy"
	                                          decoding="async"
	                                          className="h-full w-full object-cover object-top"
	                                        />
	                                      ) : (
	                                        <FileText className="h-6 w-6 opacity-60" aria-hidden />
	                                      )}
	                                    </span>
	                                  ) : null}
	                                  <span className={isHomePanel ? "truncate" : ""}>{item.label}</span>
	                                </span>
	                              </p>
	                            )}
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
                        className="text-lg font-semibold text-sky-600 transition hover:text-sky-700 sm:text-xl"
                      >
                        {activePanel.action.label}
                      </button>
                    ) : null}
                  </>
                )}
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
            <div className="mb-6 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1e293b] p-2 text-white shadow-[0_8px_24px_rgba(10,37,64,0.35)] transition hover:bg-[#253248]"
                aria-label="Close menu"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <nav className="flex flex-col gap-1">
                {renderMobileNavItems(navigationItems)}
              </nav>

              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  openCreateModal();
                }}
                className="w-full rounded-2xl border-[3px] border-[#51bdff] bg-[#008ade] py-3 text-center text-sm font-semibold text-white shadow-[0_14px_40px_rgba(15,23,42,0.25)] transition hover:bg-[#007fcd] hover:shadow-[0_18px_50px_rgba(15,23,42,0.32)]"
              >
                Start New Project
              </button>

              <div className="border-t border-slate-200 pt-4">
                {activePanel.title ? (
                  <div className="pb-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      {activePanel.subtitle}
                    </p>
                    <p className="mt-2 text-base font-semibold text-slate-800">{activePanel.title}</p>
                  </div>
                ) : null}

                <div className={isHomePanel ? "space-y-1" : simplePanelList ? "space-y-1" : "space-y-2"}>
                  {activePanelItems.map((item) => {
                    const ItemIcon = item.icon;
                    if (simplePanelList && ItemIcon) {
                      return (
                        <button
                          key={item.key ?? item.label}
                          type="button"
                          onClick={() => {
                            const newValue = item.key ?? item.label;
                            setActiveProjectsFilter(newValue);
                            setMobileOpen(false);
                            const onProjectsRoute = pathname?.startsWith("/projects") ?? false;
                            if (!onProjectsRoute) {
                              router.push("/projects/all");
                            } else if (newValue === "all" && pathname !== "/projects/all") {
                              router.push("/projects/all");
                            }
                          }}
                          className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-sm font-semibold transition ${
                            activeProjectsFilter === (item.key ?? item.label)
                              ? "bg-sky-50 text-sky-700"
                              : "text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          <ItemIcon
                            className={`h-5 w-5 ${
                              activeProjectsFilter === (item.key ?? item.label) ? "text-sky-600" : "text-slate-500"
                            }`}
                            aria-hidden
                          />
                          <span className="truncate">{item.label}</span>
                        </button>
                      );
                    }

                    if (isHomePanel && typeof item.key === "string" && item.key.length > 0) {
                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => {
                            setMobileOpen(false);
                            router.push(`/studio?project=${encodeURIComponent(item.key as string)}`);
                          }}
                          className="flex w-full min-w-0 items-center gap-3 rounded-2xl px-1 py-1 text-left transition hover:bg-slate-50"
                        >
                          <span className="relative inline-flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white text-slate-500 shadow-sm ring-1 ring-slate-200">
                            {item.previewUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={item.previewUrl}
                                alt={item.label}
                                loading="lazy"
                                decoding="async"
                                className="h-full w-full object-cover object-top"
                              />
                            ) : (
                              <FileText className="h-5 w-5 opacity-60" aria-hidden />
                            )}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-slate-800">{item.label}</span>
                          </span>
                        </button>
                      );
                    }

                    return (
                      <div key={item.key ?? item.label} className="rounded-2xl px-3 py-2">
                        <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                        {item.description ? <p className="text-xs text-slate-500">{item.description}</p> : null}
                      </div>
                    );
                  })}
                </div>

                {activePanel.action ? (
                  <button
                    type="button"
                    onClick={() => {
                      setMobileOpen(false);
                      router.push(activePanel.action!.href);
                    }}
                    className="mt-3 w-full text-center text-sm font-semibold text-sky-600 transition hover:text-sky-700"
                  >
                    {activePanel.action.label}
                  </button>
                ) : null}
              </div>

              {otherItems.length > 0 ? (
                <div className="border-t border-slate-200 pt-4">
                  <p className="pb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Other
                  </p>
                  <div className="flex flex-col gap-1">
                    {renderMobileNavItems(otherItems)}
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
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-semibold transition hover:bg-slate-100"
                >
                  <User className="h-6 w-6 text-slate-500" aria-hidden />
                  <span>Profile / Account Settings</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    void openBillingPortal();
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-semibold transition hover:bg-slate-100"
                >
                  <CreditCard className="h-6 w-6 text-slate-500" aria-hidden />
                  <span>Billing portal</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    router.push("/pricing");
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-semibold transition hover:bg-slate-100"
                >
                  <FileText className="h-6 w-6 text-slate-500" aria-hidden />
                  <span>Plans &amp; Pricing</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    router.push("/projects/trash");
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-semibold transition hover:bg-slate-100"
                >
                  <Trash2 className="h-6 w-6 text-slate-500" aria-hidden />
                  <span>Trash</span>
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
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-semibold text-red-600 transition hover:bg-red-50"
                >
                  <LogOut className="h-6 w-6" aria-hidden />
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
          <div className="mx-auto flex h-[76px] w-full max-w-7xl items-center justify-between px-3 lg:px-6">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(true);
                }}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-transparent text-slate-900 shadow-none transition hover:bg-slate-100 active:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-800 focus:ring-offset-2 md:hidden"
              >
                <Menu className="h-7 w-7" />
                <span className="sr-only">Open workspace menu</span>
              </button>
              <AppHeaderBrand />
            </div>
            <div className="relative flex items-center">
              <div
                className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white shadow-md"
                aria-label="Account avatar"
              >
                {avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatar} alt="Your avatar" className="h-full w-full rounded-full object-cover" />
                ) : (
                  <span
                    className="flex h-full w-full items-center justify-center rounded-full text-sm font-semibold uppercase text-white"
                    style={{ backgroundColor: fallbackAvatar.color }}
                  >
                    {fallbackAvatar.initials}
                  </span>
                )}
              </div>
            </div>
          </div>
        </header>

        <Suspense fallback={<PageLoadingSkeleton />}>
          <main className="page-fade-in relative z-0 flex-1 lg:z-40">{children}</main>
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
            className="page-fade-in relative z-10 w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-1.5 text-slate-900 shadow-[0_22px_60px_rgba(15,23,42,0.22)] sm:p-2"
          >
            <form
              className="overflow-hidden rounded-[18px] bg-white px-6 pt-8 pb-6 sm:px-10 sm:pt-10 sm:pb-8"
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

  const pricingShell = (
    <div className="min-h-screen bg-[#e3edf9] text-slate-900">
      <HeroHeader>
        <div className="mx-auto flex h-[76px] w-full max-w-7xl items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <AppHeaderBrand />
          </div>
          <div className="flex items-center gap-3">
            <SettingsMenu variant="pricing" />
          </div>
        </div>
      </HeroHeader>
      <main className="page-fade-in relative z-0 lg:z-40">{children}</main>
    </div>
  );

  return isPricingRoute ? pricingShell : workspaceShell;
}
