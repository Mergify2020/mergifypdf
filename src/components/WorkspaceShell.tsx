"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  FileUp,
  FileSignature,
  FileText,
  FolderKanban,
  Folders,
  Home,
  LogOut,
  Menu,
  PanelLeftClose,
  PenSquare,
  Plus,
  Settings,
  Sparkles,
  Star,
  Trash2,
  User,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  FileText as PhFileText,
  Folders as PhFolders,
  House as PhHouse,
  Signature as PhSignature,
  Trash as PhTrash,
} from "@phosphor-icons/react";
import { useSession, signOut } from "next-auth/react";
import StartProjectButton from "@/components/StartProjectButton";
import { PROJECT_NAME_STORAGE_KEY, sanitizeProjectName } from "@/lib/projectName";
import AppHeaderBrand from "./AppHeaderBrand";
import SettingsMenu from "./SettingsMenu";
import HeroHeader from "./HeroHeader";
import PageLoadingSkeleton from "./PageLoadingSkeleton";
import LoadingOverlay from "./LoadingOverlay";
import { useAvatarPreference } from "@/lib/useAvatarPreference";
import { getAvatarFallback } from "@/lib/avatarFallback";
import { useWorkspaceFilePreloader, type PendingWorkspaceFile } from "@/components/useWorkspaceFilePreloader";
import { uploadProjectPreviewFromFile } from "@/lib/projectPreview";
import {
  getProjectsSummaryCache,
  refreshProjectsSummary,
  subscribeProjectsSummary,
  type ProjectsSummaryProject,
} from "@/lib/projectsSummaryCache";

const WORKSPACE_META_KEY = "mpdf:files";
const WORKSPACE_HIGHLIGHTS_KEY = "mpdf:highlights";
const STARTUP_OVERLAY_KEY = "mpdf:startup-overlay";
const STARTUP_OVERLAY_CONTEXT_KEY = "mpdf:startup-overlay-context";

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

type SidebarNavIcon = React.ComponentType<{
  className?: string;
  weight?: "regular" | "fill";
  size?: number | string;
  color?: string;
}>;

type SidebarItem = {
  label: string;
  icon: SidebarNavIcon;
  href: string;
  disabled?: boolean;
  onClick?: () => void;
};

const navigationItems: SidebarItem[] = [
  { label: "Home", icon: PhHouse, href: "/" },
  { label: "Projects", icon: PhFolders, href: "/projects" },
  { label: "Signatures", icon: PhSignature, href: "/signature-center" },
  { label: "Templates", icon: PhFileText, href: "/templates" },
];

const bottomSidebarItems: SidebarItem[] = [
  { label: "Trash", icon: PhTrash, href: "/projects/trash" },
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

interface WorkspaceShellProps {
  children: React.ReactNode;
}

export default function WorkspaceShell({ children }: WorkspaceShellProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const firstName = useMemo(() => {
    const source = session?.user?.name ?? session?.user?.email ?? "";
    const trimmed = source.trim();
    if (!trimmed) return "there";
    return trimmed.split(/\s+/)[0] ?? "there";
  }, [session?.user?.email, session?.user?.name]);
  const previewRefreshInFlight = useRef<Set<string>>(new Set());
  const lastFailedPreviewRef = useRef<Map<string, string>>(new Map());
  const pathname = usePathname();
  const { queuePreload } = useWorkspaceFilePreloader();
  const [homeRecentProjects, setHomeRecentProjects] = useState<
    { id?: string; title: string; updatedAt?: number; previewUrl?: string | null; hasPreview?: boolean }[]
  >([]);
  const [expanded, setExpanded] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileMenuPosition, setProfileMenuPosition] = useState<{ left: number; bottom: number } | null>(
    null,
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [createValue, setCreateValue] = useState("");
  const [createPendingFiles, setCreatePendingFiles] = useState<PendingWorkspaceFile[]>([]);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createBusy, setCreateBusy] = useState(false);
  const [createShowValidation, setCreateShowValidation] = useState(false);
  const [createRemoveConfirmId, setCreateRemoveConfirmId] = useState<string | null>(null);
  const [billingPortalLoading, setBillingPortalLoading] = useState(false);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const [compactSidebar, setCompactSidebar] = useState(false);
  const [narrowSidebar, setNarrowSidebar] = useState(false);
  const [overlaySidebar, setOverlaySidebar] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const createRef = useRef<HTMLDivElement>(null);
  const createFileInputRef = useRef<HTMLInputElement | null>(null);
  const avatarKey = session?.user?.id ?? session?.user?.email ?? null;
  const { avatar } = useAvatarPreference(avatarKey);
  const [signingOut, setSigningOut] = useState(false);
  const [logoutConfirmArmed, setLogoutConfirmArmed] = useState(false);
  const logoutConfirmTimeoutRef = useRef<number | null>(null);
  const [sidebarTooltip, setSidebarTooltip] = useState<{
    label: string;
    top: number;
    left: number;
  } | null>(null);
  const [createDragActive, setCreateDragActive] = useState(false);
  const fallbackAvatar = getAvatarFallback(
    avatarKey,
    session?.user?.name ?? session?.user?.email ?? "Account"
  );
  const showAvatarImage = Boolean(avatar) && !avatarLoadFailed;

  useEffect(() => {
    setAvatarLoadFailed(false);
  }, [avatar]);

  const clearLogoutConfirmTimer = () => {
    if (logoutConfirmTimeoutRef.current !== null && typeof window !== "undefined") {
      window.clearTimeout(logoutConfirmTimeoutRef.current);
      logoutConfirmTimeoutRef.current = null;
    }
  };

  const resetLogoutConfirm = () => {
    clearLogoutConfirmTimer();
    setLogoutConfirmArmed(false);
  };

  const handleLogoutRequest = async ({
    closeProfile = false,
    closeMobile = false,
    closeExpanded = false,
  }: {
    closeProfile?: boolean;
    closeMobile?: boolean;
    closeExpanded?: boolean;
  } = {}) => {
    if (signingOut) return;
    if (closeProfile) setProfileOpen(false);
    if (closeMobile) setMobileOpen(false);
    if (closeExpanded) {
      setExpanded(false);
      setProfileOpen(false);
    }

    try {
      setSigningOut(true);
      await signOut({ callbackUrl: "/login" });
    } finally {
      setSigningOut(false);
    }
  };


  useEffect(() => {
    if (!createOpen) return;
    document.body.dataset.modalOpen = "true";

    const scrollY = window.scrollY || 0;
    const body = document.body;
    const html = document.documentElement;
    const prevBody = {
      overflow: body.style.overflow,
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
    };
    const prevHtmlOverflow = html.style.overflow;

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";

    return () => {
      delete document.body.dataset.modalOpen;
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBody.overflow;
      body.style.position = prevBody.position;
      body.style.top = prevBody.top;
      body.style.left = prevBody.left;
      body.style.right = prevBody.right;
      body.style.width = prevBody.width;
      window.scrollTo(0, scrollY);
    };
  }, [createOpen]);

  useEffect(() => {
    return () => {
      clearLogoutConfirmTimer();
    };
  }, []);

  const createId = () =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `file_${Math.random().toString(16).slice(2)}_${Date.now()}`;

  function formatBytes(bytes: number) {
    if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
    const units = ["B", "KB", "MB", "GB"] as const;
    const base = 1024;
    const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(base)), units.length - 1);
    const value = bytes / Math.pow(base, exponent);
    const decimals = exponent === 0 ? 0 : 2;
    return `${value.toFixed(decimals)} ${units[exponent]}`;
  }

  function addCreateFiles(files: FileList | File[]) {
    const list = Array.from(files);
    const filtered = list.filter(
      (file) => file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"),
    );
    if (filtered.length === 0) {
      setCreateError("Please upload at least one PDF document.");
      return;
    }

    setCreatePendingFiles((prev) => [
      ...prev,
      ...filtered.map((file) => ({ id: createId(), file })),
    ]);
    if (createError) setCreateError(null);
  }

  const createMissingName = !createValue.trim();
  const createMissingFiles = createPendingFiles.length === 0;
  const showCreateNameError = createShowValidation && createMissingName;
  const showCreateFilesError = createShowValidation && createMissingFiles;

  function openCreateModal() {
    setCreateValue("");
    setCreateError(null);
    setCreateBusy(false);
    setCreatePendingFiles([]);
    setCreateDragActive(false);
    setCreateShowValidation(false);
    setCreateRemoveConfirmId(null);
    setCreateOpen(true);
  }

  function closeCreateModal() {
    if (createBusy) return;
    setCreateOpen(false);
  }

  async function handleCreateStart() {
    const startedAt = Date.now();
    setCreateShowValidation(true);
    if (createMissingName || createMissingFiles) {
      setCreateError(null);
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
      void uploadProjectPreviewFromFile(createPendingFiles[0]?.file, id);
      queuePreload(createPendingFiles, id);
      const elapsed = Date.now() - startedAt;
      if (elapsed < 2000) {
        await new Promise((resolve) => setTimeout(resolve, 2000 - elapsed));
      }
      setCreateBusy(false);
      setCreateOpen(false);
      window.sessionStorage?.setItem(STARTUP_OVERLAY_KEY, "1");
      window.sessionStorage?.setItem(STARTUP_OVERLAY_CONTEXT_KEY, "new");
      router.push(`/studio?project=${encodeURIComponent(id)}`);
    } catch {
      setCreateError("Could not create that project. Please try again.");
      setCreateBusy(false);
    }
  }

  const [activeProjectsFilter, setActiveProjectsFilter] = useState("all");
  const itemLabelClasses = "opacity-100 translate-x-0 max-w-full";
  const isTrashRoute = pathname?.startsWith("/projects/trash") ?? false;
  const isProjectsRoute = (pathname?.startsWith("/projects") ?? false) && !isTrashRoute;
  const panelKey =
    pathname === "/" || pathname === "/projects/all" || isTrashRoute
      ? "home"
      : isProjectsRoute
        ? "projects"
        : pathname?.startsWith("/signature-center")
          ? "signatures"
          : pathname?.startsWith("/templates")
            ? "templates"
            : "default";
  const homeSidebarLocked = panelKey === "home";
  const panelExpanded = homeSidebarLocked || panelKey === "templates" ? false : expanded;
  const navExpanded = expanded;
  const activePanel = sidebarPanels[panelKey] ?? sidebarPanels.default;
  const simplePanelList =
    activePanel.items.length > 0 && activePanel.items.every((item) => item.icon && !item.description);

  const isPricingRoute = pathname === "/pricing";
  const isAccountRoute = pathname?.startsWith("/account");
  const hideWorkspaceSidebar = isAccountRoute;
  const isStudioRoute = pathname?.startsWith("/studio");
  const isProjectsPanel = panelKey === "projects";
  const isHomePanel = panelKey === "home";
  const isTemplatesPanel = panelKey === "templates";
  const PanelTitleIcon: LucideIcon =
    panelKey === "home"
      ? FolderKanban
      : panelKey === "projects"
        ? Folders
        : panelKey === "signatures"
          ? PenSquare
          : BookOpen;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const routes = ["/", "/projects/all", "/signature-center", "/templates", "/projects/trash"];
    const prefetch = () => {
      routes.forEach((route) => {
        router.prefetch(route);
      });
    };
    if ("requestIdleCallback" in globalThis) {
      const handle = (globalThis as Window & typeof globalThis).requestIdleCallback(prefetch, { timeout: 1200 });
      return () => (globalThis as Window & typeof globalThis).cancelIdleCallback(handle);
    }
    const timer = setTimeout(prefetch, 200);
    return () => clearTimeout(timer);
  }, [router]);

  useEffect(() => {
    if (hideWorkspaceSidebar) {
      setMobileOpen(false);
    }
  }, [hideWorkspaceSidebar]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const ownerKey = session?.user?.id ?? null;
    if (!ownerKey) {
      setHomeRecentProjects([]);
      return;
    }

    let cancelled = false;
    setHomeRecentProjects([]);

    const preloadImages = (urls: string[]) => {
      urls.forEach((url) => {
        const img = new window.Image();
        img.decoding = "async";
        img.src = url;
      });
    };

    const mapSummary = (projects: ProjectsSummaryProject[]) => {
      const mapped = projects
        .map((project) => ({
          id: project.id,
          title: project.name?.trim() || "Untitled project",
          updatedAt: new Date(project.updatedAt).getTime(),
          previewUrl: null,
          hasPreview: project.hasPreview ?? false,
        }))
        .filter((entry) => Boolean(entry.id) && entry.title.length > 0)
        .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));

      return mapped;
    };

    const hydrate = (projects: ProjectsSummaryProject[]) => {
      const mapped = mapSummary(projects);
      if (cancelled) return;
      setHomeRecentProjects(mapped);
      mapped
        .filter((project) => project.hasPreview && !project.previewUrl && project.id)
        .slice(0, 12)
        .forEach((project) => {
          if (project.id) {
            void refreshPreviewUrl(project.id);
          }
        });
      const previewUrls = mapped
        .flatMap((project) => (project.previewUrl ? [project.previewUrl] : []))
        .slice(0, 12);
      preloadImages(previewUrls);
    };

    const cached = getProjectsSummaryCache(ownerKey);
    if (cached) {
      hydrate(cached);
    }

    const load = async () => {
      const fresh = await refreshProjectsSummary(ownerKey);
      if (fresh && !cancelled) {
        hydrate(fresh);
      }
    };

    void load();

    const unsubscribe = subscribeProjectsSummary((update) => {
      if (update.ownerKey !== ownerKey || !update.projects || cancelled) return;
      hydrate(update.projects);
    });

    const handleFocus = () => {
      void load();
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void load();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      cancelled = true;
      unsubscribe();
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [session?.user?.id]);

  const refreshPreviewUrl = async (projectId: string, previousUrl?: string | null) => {
    if (previewRefreshInFlight.current.has(projectId)) return;
    if (previousUrl && lastFailedPreviewRef.current.get(projectId) === previousUrl) {
      setHomeRecentProjects((prev) =>
        prev.map((entry) => (entry.id === projectId ? { ...entry, previewUrl: null } : entry))
      );
      return;
    }
    previewRefreshInFlight.current.add(projectId);
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/preview`, {
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error(`Preview refresh failed with status ${res.status}`);
      }
      const data = (await res.json().catch(() => null)) as { url?: string } | null;
      if (!data?.url) {
        throw new Error("Preview refresh returned an invalid payload.");
      }
      lastFailedPreviewRef.current.delete(projectId);
      setHomeRecentProjects((prev) =>
        prev.map((entry) => (entry.id === projectId ? { ...entry, previewUrl: data.url ?? null } : entry))
      );
    } catch {
      if (previousUrl) {
        lastFailedPreviewRef.current.set(projectId, previousUrl);
      }
      setHomeRecentProjects((prev) =>
        prev.map((entry) => (entry.id === projectId ? { ...entry, previewUrl: null } : entry))
      );
    } finally {
      previewRefreshInFlight.current.delete(projectId);
    }
  };

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

    if (isHomePanel) {
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
  }, [profileOpen, compactSidebar, narrowSidebar, isHomePanel]);

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
  const railWidthClass = "w-full";
  const panelLeftClass = "left-[calc(var(--shell-left)+var(--shell-sidebar-width)+24px)]";
  const baseContentOffsetClass = expanded
    ? "md:pl-[calc(var(--shell-left)+256px+24px)]"
    : "md:pl-[calc(var(--shell-left)+80px+24px)]";
  const expandedContentOffsetClass =
    panelExpanded && !shouldOverlay
      ? expanded
        ? "md:pl-[calc(var(--shell-left)+256px+24px+320px)]"
        : "md:pl-[calc(var(--shell-left)+80px+24px+240px)]"
      : "";
  const sidebarExpandedClass = panelExpanded && !shouldOverlay ? "with-sidebar-panel" : "";
  const contentOffsetClass = hideWorkspaceSidebar
    ? ""
    : `${baseContentOffsetClass} ${expandedContentOffsetClass} ${sidebarExpandedClass}`.trim();
  const setSidebarTooltipFromEvent = (
    event: React.MouseEvent<HTMLElement> | React.FocusEvent<HTMLElement>,
    label: string,
    offset = 12,
    useSidebarEdge = false
  ) => {
    if (label === "Expand sidebar" && expanded) return;
    if (label === "Collapse sidebar" && !expanded) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const sidebarRect = sidebarRef.current?.getBoundingClientRect();
    const leftAnchor = useSidebarEdge ? sidebarRect?.right ?? rect.right : rect.right;
    setSidebarTooltip({
      label,
      top: rect.top + rect.height / 2 + (label === "Expand sidebar" || label === "Collapse sidebar" ? 6 : 0),
      left: leftAnchor + offset,
    });
  };

  useEffect(() => {
    if (!panelExpanded || !shouldOverlay) return;

    const handleClick = (event: MouseEvent) => {
      if (!(event.target instanceof Node)) return;
      if (sidebarRef.current?.contains(event.target) || panelRef.current?.contains(event.target)) {
        return;
      }
      setExpanded(false);
    };

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [panelExpanded, shouldOverlay]);

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
      setBillingPortalLoading(true);
      const returnUrl = typeof window === "undefined" ? undefined : window.location.href;
      const res = await fetch("/api/billing-portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnUrl }),
      });

      if (!res.ok) {
        setBillingPortalLoading(false);
        // eslint-disable-next-line no-console
        console.error("Failed to load portal");
        return;
      }

      const { url } = (await res.json()) as { url?: string };
      if (url) {
        window.location.href = url;
        return;
      }
      setBillingPortalLoading(false);
    } catch {
      setBillingPortalLoading(false);
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
      hideCollapsedLabel,
    }: { labelClassName?: string; forceExpanded?: boolean; hideCollapsedLabel?: boolean } = {},
  ) =>
    items.map(({ label, icon: Icon, href, disabled, onClick }) => {
      const isExpanded = forceExpanded ?? navExpanded;
      const isLogout = label === "Log out";
      const logoutArmedA11yLabel = isLogout && logoutConfirmArmed ? "Tap again to log out" : label;
      const isActive =
        !disabled &&
        (label === "Trash"
          ? isTrashRoute
          : label === "Projects"
            ? isProjectsRoute || pathname === "/projects/all"
            : href === "/"
              ? pathname === "/"
              : pathname?.startsWith(href) || false);
      const iconWrapperBase = isExpanded
        ? `flex ${sidebarCompact ? "w-9" : "w-10"} items-center justify-center rounded-2xl transition`
        : "flex h-8 w-full items-center justify-center rounded-2xl transition";
      const iconWrapperState = homeSidebarLocked
        ? isActive
          ? "text-[#6C47FF] dark:text-zinc-100"
          : "text-[#6B7280] dark:text-zinc-400"
        : isActive
          ? "text-[#6C47FF] dark:text-zinc-100"
          : "text-[#6B7280] dark:text-zinc-400";
      const iconWrapperHover = !isActive && !disabled
        ? isLogout
          ? "group-hover:text-red-600 dark:group-hover:text-red-600"
          : "group-hover:text-[#374151] dark:group-hover:text-zinc-200"
        : "";
      const logoutHoverClass = isLogout ? "group-hover:text-red-600 dark:group-hover:text-red-600" : "";
      const iconWrapperClasses = `${iconWrapperBase} ${iconWrapperState} ${iconWrapperHover} ${logoutHoverClass} transition-colors duration-[120ms] ease-out`;
      const iconSizeClasses = "h-6 w-6";
      const expandedLayoutClasses = sidebarCompact
        ? "items-center justify-start gap-2 px-1 py-0 text-left text-[11px] h-11"
        : "items-center justify-start gap-2 px-1 py-0 text-left h-11";
      const collapsedLayoutClasses =
        "flex-col items-stretch justify-center gap-1 px-1 py-0 text-center h-[36px]";

      const targetHref = label === "Projects" ? "/projects/all" : href;
      const itemClasses = homeSidebarLocked
        ? `group relative flex w-full overflow-visible rounded-xl text-sm font-medium transition-[background-color,color] duration-[120ms] ease-out ${
            disabled
              ? "cursor-not-allowed text-[#4B5563] dark:text-zinc-500"
              : isActive
                ? "text-[#6C47FF] dark:text-zinc-100"
                : "cursor-pointer text-[#4B5563] hover:text-[#374151] dark:text-zinc-400 dark:hover:text-zinc-200"
          } ${isExpanded ? expandedLayoutClasses : collapsedLayoutClasses} ${
            isLogout && logoutConfirmArmed ? "bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-300" : ""
          }`
        : `group relative flex w-full overflow-visible rounded-xl text-sm font-medium transition-[background-color,color] duration-[120ms] ease-out ${
            disabled
              ? "cursor-not-allowed text-[#4B5563] dark:text-zinc-500"
              : isActive
                ? "text-[#6C47FF] dark:text-zinc-100"
                : "cursor-pointer text-[#4B5563] hover:text-[#374151] dark:text-zinc-400 dark:hover:text-zinc-200"
          } ${isExpanded ? expandedLayoutClasses : collapsedLayoutClasses} ${
            isLogout && logoutConfirmArmed ? "bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-300" : ""
          }`;

      const basePadding = isExpanded ? "px-3 py-2.5" : "px-3 py-[5.5px]";
      const activeRoundedClass = "rounded-r-xl";
      const content = (
        <span className="relative flex w-full items-center pl-0">
          {isActive ? (
            isExpanded ? (
                <span
                className="absolute left-0 inset-y-0 w-[3px] rounded-full bg-[#6C47FF] dark:bg-zinc-200"
                style={{ top: 3, bottom: 3 }}
                aria-hidden
              />
            ) : (
                <span
                className="absolute left-0 inset-y-0 w-[3px] rounded-full bg-[#6C47FF] dark:bg-zinc-200"
                style={{ top: 3, bottom: 3 }}
                aria-hidden
              />
            )
          ) : null}
          <span
            className={`flex items-center ${basePadding} transition-[width] duration-[140ms] ease-out ${
              isActive
                ? `w-full ${activeRoundedClass} bg-[rgba(108,71,255,0.06)] shadow-inner dark:shadow-none dark:bg-zinc-800/60`
                : "group-hover:w-full group-hover:rounded-xl group-hover:bg-[rgba(0,0,0,0.04)] dark:group-hover:bg-white/5"
            } ${isExpanded ? "" : "w-full justify-center"}`}
          >
            <span className={iconWrapperClasses}>
              <Icon
                className={`${iconSizeClasses} shrink-0`}
                aria-hidden
                weight={isActive && label !== "Signatures" ? "fill" : "regular"}
              />
            </span>
            {isExpanded ? (
              <span
                className={`inline-flex flex-1 whitespace-nowrap overflow-hidden text-ellipsis text-sm transition-all duration-200 ease-in-out ${
                  isExpanded ? "ml-2" : "ml-0"
                } ${labelClassName ?? ""} ${logoutHoverClass} font-medium`}
              >
                {label}
              </span>
            ) : hideCollapsedLabel ? null : (
              <span
                className={`text-[11px] sm:text-xs lg:text-sm font-medium tracking-wide ${logoutHoverClass} ${
                  isActive ? "text-[#5B38E6] dark:text-zinc-100" : "text-slate-500 dark:text-zinc-400"
                }`}
              >
                {label}
              </span>
            )}
          </span>
        </span>
      );

      const handleTooltipEnter = (event: React.MouseEvent<HTMLElement> | React.FocusEvent<HTMLElement>) => {
        if (isExpanded) return;
        const rect = event.currentTarget.getBoundingClientRect();
        setSidebarTooltip({
          label: logoutArmedA11yLabel,
          top: rect.top + rect.height / 2,
          left: rect.right + 12,
        });
      };

      const handleTooltipLeave = () => {
        if (isExpanded) return;
        setSidebarTooltip(null);
      };

      if (disabled) {
        return (
          <button
            key={label}
            type="button"
            aria-label={logoutArmedA11yLabel}
            disabled
            className={itemClasses}
            onMouseEnter={handleTooltipEnter}
            onMouseLeave={handleTooltipLeave}
            onFocus={handleTooltipEnter}
            onBlur={handleTooltipLeave}
          >
            {content}
          </button>
        );
      }

      if (onClick) {
        return (
          <button
            key={label}
            type="button"
            aria-label={logoutArmedA11yLabel}
            className={itemClasses}
            onClick={() => {
              if (isLogout) {
                void handleLogoutRequest();
                return;
              }
              resetLogoutConfirm();
              onClick();
            }}
            onMouseEnter={handleTooltipEnter}
            onMouseLeave={handleTooltipLeave}
            onFocus={handleTooltipEnter}
            onBlur={handleTooltipLeave}
          >
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
            resetLogoutConfirm();
          }}
          aria-label={logoutArmedA11yLabel}
          className={itemClasses}
          onMouseEnter={handleTooltipEnter}
          onMouseLeave={handleTooltipLeave}
          onFocus={handleTooltipEnter}
          onBlur={handleTooltipLeave}
        >
          {content}
        </Link>
      );
    });

  const renderMobileNavItems = (items: SidebarItem[]) =>
    items.map(({ label, icon: Icon, href, disabled, onClick }) => {
      const isLogout = label === "Log out";
      const logoutArmedA11yLabel = isLogout && logoutConfirmArmed ? "Tap again to log out" : label;
      const isActive =
        !disabled &&
        (label === "Trash"
          ? isTrashRoute
          : label === "Projects"
            ? isProjectsRoute || pathname === "/projects/all"
            : href === "/"
              ? pathname === "/"
              : pathname?.startsWith(href) || false);
      const targetHref = label === "Projects" ? "/projects/all" : href;
      const baseClasses =
        "flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-medium transition-[background-color,color] duration-[120ms] ease-out";
      const stateClasses = disabled
        ? "cursor-not-allowed text-[#4B5563]"
        : isActive
          ? "bg-[rgba(108,71,255,0.08)] text-[#4C34C9]"
          : "cursor-pointer text-[#4B5563] hover:bg-[rgba(0,0,0,0.04)] hover:text-[#374151]";
      const confirmClasses = isLogout && logoutConfirmArmed ? "bg-red-50 text-red-700" : "";

      const content = (
        <>
          <Icon className="h-6 w-6 shrink-0" aria-hidden weight={isActive ? "fill" : "regular"} />
          <span className="truncate whitespace-nowrap">{label}</span>
          {isLogout && logoutConfirmArmed ? (
            <span className="ml-auto rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-700">
              Tap again
            </span>
          ) : null}
        </>
      );

      if (disabled) {
        return (
          <button key={label} type="button" aria-label={logoutArmedA11yLabel} disabled className={`${baseClasses} ${stateClasses} ${confirmClasses}`}>
            {content}
          </button>
        );
      }

      if (onClick) {
        return (
          <button
            key={label}
            type="button"
            aria-label={logoutArmedA11yLabel}
            className={`${baseClasses} ${stateClasses} ${confirmClasses}`}
            onClick={() => {
              if (isLogout) {
                void handleLogoutRequest({ closeMobile: true });
                return;
              }
              resetLogoutConfirm();
              setMobileOpen(false);
              onClick();
            }}
          >
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
            resetLogoutConfirm();
            setMobileOpen(false);
          }}
          aria-label={logoutArmedA11yLabel}
          className={`${baseClasses} ${stateClasses} ${confirmClasses}`}
        >
          {content}
        </Link>
      );
    });

  const workspaceShell = (
    <>
    <div
      className={`flex min-h-screen ${isHomePanel ? "bg-[#F1F4F9]" : "bg-slate-100"} ${sidebarCompact ? "sidebar-collapsed" : ""} ${expanded ? "" : "sidebar-minimized"} dark:bg-[#222224]`}
      style={
        {
          "--shell-content-width": expanded ? "1680px" : "1960px",
          "--shell-left":
            "max(24px, calc((100vw - (var(--shell-content-width) + var(--shell-sidebar-width) + 24px)) / 2))",
          "--shell-sidebar-width": expanded ? "256px" : "80px",
        } as React.CSSProperties
      }
    >
      {!hideWorkspaceSidebar ? (
      <>
      {/* Desktop sidebar */}
      <aside className="page-fade-in fixed left-[var(--shell-left)] top-6 bottom-6 z-50 hidden w-[var(--shell-sidebar-width)] text-slate-800 transition-[width] duration-300 ease-in-out dark:text-zinc-100 md:flex">
        <div className="relative flex h-full w-full">
          <div
            ref={sidebarRef}
            className={`flex h-full ${railWidthClass} flex-col ${
              homeSidebarLocked
                ? "rounded-xl border border-[#E5E7EB] bg-white shadow-[0_10px_30px_rgba(0,0,0,0.08)] dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-[0_12px_30px_rgba(0,0,0,0.35)]"
                : "rounded-xl border border-[#E5E7EB] bg-white shadow-[0_10px_30px_rgba(0,0,0,0.08)] dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-[0_12px_30px_rgba(0,0,0,0.35)]"
            } w-full ${sidebarCompact ? "z-10" : "z-20"}`}
          >
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto overflow-x-hidden px-1 py-5 lg:px-2">
              <div
                className={`flex h-12 w-full items-center px-1 ${
                  expanded ? "justify-between" : "justify-center"
                }`}
              >
                {expanded ? (
                  <>
                    <AppHeaderBrand
                      logoLightSrc={
                        isHomePanel ? "/logos/home-expanded-sidebar-logo-light-v6.svg" : undefined
                      }
                      logoDarkSrc={
                        isHomePanel ? "/logos/home-expanded-sidebar-logo-dark-v6.svg" : undefined
                      }
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setSidebarTooltip(null);
                        setExpanded((prev) => !prev);
                      }}
                      onMouseDown={() => {
                        setSidebarTooltip(null);
                      }}
                      className="relative z-10 inline-flex items-center justify-center p-1 text-slate-500 transition hover:text-slate-900 dark:text-zinc-300 dark:hover:text-white"
                      aria-label="Collapse sidebar"
                      onMouseEnter={(event) => {
                        setSidebarTooltipFromEvent(event, "Collapse sidebar", 3, true);
                      }}
                      onMouseLeave={() => {
                        setSidebarTooltip(null);
                      }}
                      onFocus={(event) => {
                        setSidebarTooltipFromEvent(event, "Collapse sidebar", 3, true);
                      }}
                      onBlur={() => {
                        setSidebarTooltip(null);
                      }}
                    >
                      <PanelLeftClose className="h-6 w-6" />
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setSidebarTooltip(null);
                      setExpanded(true);
                    }}
                    onMouseDown={() => {
                      setSidebarTooltip(null);
                    }}
                    className="inline-flex items-center justify-center overflow-visible"
                    aria-label="Expand sidebar"
                    onMouseEnter={(event) => {
                      setSidebarTooltipFromEvent(event, "Expand sidebar", 3, true);
                    }}
                    onMouseLeave={() => {
                      setSidebarTooltip(null);
                    }}
                    onFocus={(event) => {
                      setSidebarTooltipFromEvent(event, "Expand sidebar", 3, true);
                    }}
                    onBlur={() => {
                      setSidebarTooltip(null);
                    }}
                  >
                    <Image
                      src="/logos/home-collapsed-sidebar-logo-light-dark.svg"
                      alt="MergifyPDF"
                      width={187}
                      height={49}
                      priority
                      className="h-[49px] w-[187px] max-w-none"
                    />
                  </button>
                )}
              </div>
              <div className="flex flex-1 flex-col">
                <nav className={`mt-2 flex flex-col items-center ${navExpanded ? "gap-3" : "gap-[18px]"}`}>
                  {renderItems(navigationItems, {
                    labelClassName: itemLabelClasses,
                    forceExpanded: navExpanded,
                    hideCollapsedLabel: true,
                  })}
                  <div
                    className="relative"
                    onMouseEnter={(event) => {
                      if (navExpanded) return;
                      setSidebarTooltipFromEvent(event, "Start a new project", 3, true);
                    }}
                    onMouseLeave={() => {
                      if (!navExpanded) setSidebarTooltip(null);
                    }}
                    onFocus={(event) => {
                      if (navExpanded) return;
                      setSidebarTooltipFromEvent(event, "Start a new project", 3, true);
                    }}
                    onBlur={() => {
                      if (!navExpanded) setSidebarTooltip(null);
                    }}
                  >
                    <StartProjectButton
                      variant="custom"
                      iconOnly={!navExpanded}
                      className={
                        navExpanded
                          ? "flex h-12 w-[220px] items-center justify-center rounded-xl border border-transparent bg-[#6C47FF] px-5 text-sm font-semibold tracking-wide text-white shadow-[0_8px_18px_rgba(15,23,42,0.14)] transition-[width,transform,opacity,background-color,box-shadow] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] origin-left transform-gpu opacity-100 scale-100 hover:bg-[#5B38E6] hover:shadow-[0_10px_22px_rgba(15,23,42,0.18)] dark:border-zinc-700/40 dark:bg-[#6C47FF] dark:text-zinc-100 dark:shadow-[0_10px_22px_rgba(0,0,0,0.35)] dark:hover:bg-[#5B38E6] dark:hover:border-zinc-600/60 dark:hover:shadow-[0_12px_26px_rgba(0,0,0,0.42)] dark:active:bg-[#4E2FD1]"
                          : "flex h-12 w-12 items-center justify-center rounded-lg border border-transparent bg-[#6C47FF] text-white shadow-[0_8px_18px_rgba(15,23,42,0.14)] transition-[width,transform,opacity,background-color,box-shadow] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] origin-left transform-gpu opacity-100 scale-95 hover:bg-[#5B38E6] hover:shadow-[0_10px_22px_rgba(15,23,42,0.18)] dark:border-zinc-700/40 dark:bg-[#6C47FF] dark:text-zinc-100 dark:shadow-[0_10px_22px_rgba(0,0,0,0.35)] dark:hover:bg-[#5B38E6] dark:hover:border-zinc-600/60 dark:hover:shadow-[0_12px_26px_rgba(0,0,0,0.42)] dark:active:bg-[#4E2FD1]"
                      }
                    />
                  </div>
                </nav>

              {bottomSidebarItems.length > 0 ? (
                  <div className="mt-auto flex flex-col items-center gap-3 pt-6">
                    {renderItems(bottomSidebarItems, {
                      labelClassName: itemLabelClasses,
                      forceExpanded: navExpanded,
                      hideCollapsedLabel: true,
                    })}
                  </div>
              ) : null}
            </div>
            </div>

            {!isHomePanel && !isTemplatesPanel ? (
              <div
                ref={profileRef}
                className={`relative z-50 px-3 pb-6 ${
                  sidebarCompact ? "mt-14 sticky bottom-0" : "mt-auto sticky bottom-4"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setProfileOpen((prev) => !prev)}
                  className="flex w-full items-center justify-center rounded-2xl px-3 py-2 transition hover:bg-white/70 dark:hover:bg-zinc-800/60"
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
                    {showAvatarImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={avatar!}
                        alt="Your avatar"
                        className={`${
                          sidebarCompact ? "h-[58px] w-[58px]" : "h-16 w-16"
                        } shrink-0 rounded-full object-cover`}
                        onError={() => setAvatarLoadFailed(true)}
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
              </div>
            ) : null}

            {typeof document !== "undefined" && profileOpen && (isHomePanel || profileMenuPosition)
              ? createPortal(
                  <div
                    ref={profileMenuRef}
                    className={`fixed z-[60] w-80 rounded-3xl border border-slate-100 bg-white p-4 text-sm text-slate-800 shadow-[0_30px_80px_rgba(15,23,42,0.35)] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:shadow-[0_30px_80px_rgba(0,0,0,0.55)] ${
                      isHomePanel ? "right-8 top-[92px] max-h-[calc(100vh-120px)] overflow-auto" : ""
                    }`}
                    style={
                      isHomePanel
                        ? undefined
                        : { left: profileMenuPosition!.left, bottom: profileMenuPosition!.bottom }
                    }
                    onMouseDown={(event) => {
                      event.stopPropagation();
                    }}
                  >
                    <div className="flex items-center gap-3 rounded-2xl border-[3px] border-slate-300 px-3 py-3">
                      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-50 text-slate-600">
                        {showAvatarImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={avatar!}
                            alt="Your avatar"
                            className="h-10 w-10 rounded-full object-cover"
                            onError={() => setAvatarLoadFailed(true)}
                          />
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
                          <Link
                            href="/projects/trash"
                            onClick={() => {
                              setProfileOpen(false);
                            }}
                            className="flex w-full items-center justify-between rounded-2xl px-4 py-3.5 text-left text-2xl font-semibold text-slate-800 transition hover:bg-slate-50"
                          >
                            <div className="flex items-center gap-3">
                              <Trash2 className="h-6 w-6 text-slate-500" aria-hidden />
                              <span>Trash</span>
                            </div>
                            <ChevronRight className="h-4 w-4 text-slate-400" aria-hidden />
                          </Link>
                          <button
                            type="button"
                            disabled={signingOut}
                            onClick={async () => {
                              await handleLogoutRequest({ closeProfile: true });
                            }}
                            className="flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left text-2xl font-semibold text-red-600 transition hover:bg-red-50"
                          >
                            <LogOut className="h-6 w-6" aria-hidden />
                            <span>{signingOut ? "Logging out..." : "Log out"}</span>
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
                          <Link
                            href="/projects/trash"
                            onClick={() => {
                              setProfileOpen(false);
                            }}
                            className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-2xl font-semibold text-slate-700 transition hover:bg-slate-50"
                          >
                            <div className="flex items-center gap-3">
                              <Trash2 className="h-5 w-5 text-slate-500" aria-hidden />
                              <span>Trash</span>
                            </div>
                            <ChevronRight className="h-4 w-4 text-slate-400" aria-hidden />
                          </Link>
                          <button
                            type="button"
                            disabled={signingOut}
                            onClick={async () => {
                              await handleLogoutRequest({ closeProfile: true });
                            }}
                            className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-2xl font-semibold text-red-600 transition hover:bg-red-50"
                          >
                            <LogOut className="h-6 w-6" aria-hidden />
                            <span>{signingOut ? "Logging out..." : "Log out"}</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>,
                  document.body,
                )
              : null}
          </div>
          {panelExpanded ? (
            <div
              ref={panelRef}
              data-workspace-secondary-panel="true"
              className={`absolute ${panelLeftClass} top-0 hidden h-full border-l border-slate-200 ${
                shouldOverlay ? "bg-white" : "bg-slate-100"
              } px-4 py-6 text-slate-800 shadow-[12px_0_36px_rgba(15,23,42,0.10)] transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform md:flex ${sidebarCompact ? "w-[240px]" : "w-[320px]"} z-0 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:shadow-[12px_0_36px_rgba(0,0,0,0.45)] ${
                panelExpanded
                  ? "translate-x-0 opacity-100 pointer-events-auto"
                  : "-translate-x-10 opacity-0 pointer-events-none"
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
                      className="flex w-full items-center gap-3 rounded-2xl bg-slate-100 px-4 py-3.5 text-left text-2xl font-semibold text-slate-800 dark:bg-zinc-800 dark:text-zinc-100"
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
                    <Link
                      href="/projects/trash"
                      onClick={() => {
                        setExpanded(false);
                        setProfileOpen(false);
                      }}
                      className="flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left text-2xl font-semibold text-slate-800 transition hover:bg-slate-50"
                    >
                      <Trash2 className="h-6 w-6 text-slate-600" aria-hidden />
                      <span>Trash</span>
                    </Link>
                    <button
                      type="button"
                      disabled={signingOut}
                      onClick={async () => {
                        await handleLogoutRequest({ closeExpanded: true });
                      }}
                      className="flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left text-2xl font-semibold text-red-600 transition hover:bg-red-50"
                    >
                      <LogOut className="h-6 w-6" aria-hidden />
                      <span>{signingOut ? "Logging out..." : "Log out"}</span>
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
                          {panelKey !== "home" ? (
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
                                    ? "bg-sky-50 text-sky-700 shadow-inner dark:shadow-none"
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
	                                className="flex w-full min-w-0 items-center gap-3 rounded-2xl px-1 py-0.5 text-left transition hover:bg-white/60 dark:hover:bg-zinc-800/60"
	                              >
	                                <span className="relative inline-flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white text-slate-500 shadow-sm dark:shadow-none ring-1 ring-slate-200 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-700">
                                  {item.previewUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={item.previewUrl}
                                      alt=""
                                      loading="lazy"
                                      decoding="async"
                                      className="h-full w-full object-cover object-top"
                                      onError={() => {
                                        if (typeof item.key === "string" && item.key.length > 0) {
                                          void refreshPreviewUrl(item.key, item.previewUrl);
                                        }
                                      }}
                                    />
                                  ) : (
                                    <div className="h-full w-full animate-pulse bg-slate-100" />
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
	                                    <span className="relative inline-flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white text-slate-500 shadow-sm dark:shadow-none ring-1 ring-slate-200 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-700">
                                      {item.previewUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                          src={item.previewUrl}
                                          alt=""
                                          loading="lazy"
                                          decoding="async"
                                          className="h-full w-full object-cover object-top"
                                          onError={() => {
                                            if (typeof item.key === "string" && item.key.length > 0) {
                                              void refreshPreviewUrl(item.key, item.previewUrl);
                                            }
                                          }}
                                        />
                                      ) : (
                                        <div className="h-full w-full animate-pulse bg-slate-100" />
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
      </>
      ) : null}

      {/* Mobile drawer */}
      {!hideWorkspaceSidebar && mobileOpen ? (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 dark:bg-zinc-950/60 md:hidden" onClick={() => setMobileOpen(false)} />
          <aside className="page-fade-in fixed inset-y-0 left-0 z-50 w-72 overflow-y-auto border-r border-slate-200 bg-white p-6 shadow-2xl dark:shadow-[0_22px_60px_rgba(0,0,0,0.45)] transition-transform duration-300 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 md:hidden">
            <div className="mb-6 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1e293b] p-2 text-white shadow-[0_8px_24px_rgba(10,37,64,0.35)] transition hover:bg-[#253248] dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
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
                          <span className="relative inline-flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white text-slate-500 shadow-sm dark:shadow-none ring-1 ring-slate-200 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-700">
                            {item.previewUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={item.previewUrl}
                                alt=""
                                loading="lazy"
                                decoding="async"
                                className="h-full w-full object-cover object-top"
                                onError={() => {
                                  if (typeof item.key === "string" && item.key.length > 0) {
                                    void refreshPreviewUrl(item.key, item.previewUrl);
                                  }
                                }}
                              />
                            ) : (
                              <div className="h-full w-full animate-pulse bg-slate-100" />
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

              {bottomSidebarItems.length > 0 ? (
                <div className="border-t border-slate-200 pt-4">
                  <div className="flex flex-col gap-1">
                    {renderMobileNavItems(bottomSidebarItems)}
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
                <Link
                  href="/projects/trash"
                  onClick={() => {
                    setMobileOpen(false);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-semibold transition hover:bg-slate-100"
                >
                  <Trash2 className="h-6 w-6 text-slate-500" aria-hidden />
                  <span>Trash</span>
                </Link>
                <button
                  type="button"
                  disabled={signingOut}
                  onClick={async () => {
                    await handleLogoutRequest({ closeMobile: true });
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-semibold text-red-600 transition hover:bg-red-50"
                >
                  <LogOut className="h-6 w-6" aria-hidden />
                  <span>{signingOut ? "Logging out..." : "Log out"}</span>
                </button>
              </div>
            </div>
          </aside>
        </>
      ) : null}

      <div
        className={`flex min-h-screen w-full flex-col bg-transparent transition-all duration-300 ease-in-out ${contentOffsetClass}`}
      >
        <header className="sticky top-0 z-20 w-full border-b border-slate-200 bg-white/90 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/90 md:hidden">
          <div className="mx-auto flex h-[76px] w-full max-w-7xl items-center justify-between px-3 lg:px-6">
            <div className="flex items-center gap-2">
              {!hideWorkspaceSidebar ? (
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
              ) : null}
              <AppHeaderBrand />
            </div>
            <div className="relative flex items-center" />
          </div>
        </header>

        <Suspense fallback={<PageLoadingSkeleton />}>
          <main className="relative z-0 flex-1 lg:z-40">
            <div className="flex w-full justify-start pr-6">
              <div
                className="workspace-content-shell w-full"
                style={{ maxWidth: "var(--shell-content-width)" }}
              >
                {children}
              </div>
            </div>
          </main>
        </Suspense>
      </div>
    </div>

      {createOpen
        ? createPortal(
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
              <div
                className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm dark:bg-zinc-950/70"
                onClick={closeCreateModal}
              />
              <div
                ref={createRef}
                className="page-fade-in relative z-10 w-full max-w-3xl rounded-2xl border border-white/60 bg-white/35 bg-gradient-to-b from-white/90 via-white/70 to-white/40 p-1.5 text-slate-900 shadow-[0_0_0_1px_rgba(255,255,255,0.65),0_22px_60px_rgba(15,23,42,0.22)] dark:shadow-[0_22px_60px_rgba(0,0,0,0.5)] backdrop-blur-lg dark:border-zinc-700 dark:bg-zinc-900/60 dark:from-zinc-900/80 dark:via-zinc-900/60 dark:to-zinc-900/40 dark:text-zinc-100 sm:p-2"
              >
                <form
                  className="flex max-h-[calc(100vh-3rem)] flex-col overflow-hidden rounded-[18px] bg-white/85 shadow-[0_0_0_1px_rgba(148,163,184,0.14)] dark:bg-zinc-900/80 dark:shadow-[0_12px_30px_rgba(0,0,0,0.35)]"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void handleCreateStart();
                  }}
                >
                  <div className="overflow-y-auto px-6 pt-8 pb-4 sm:px-10 sm:pt-10">
                    <h2 className="text-[23px] font-semibold tracking-tight text-slate-900 dark:text-zinc-100 sm:text-[26px]">
                      Create a new project
                    </h2>

                    <div className="mt-6 space-y-2">
                      <div className="relative">
                        <input
                          type="text"
                          autoFocus
                          value={createValue}
                          onChange={(event) => {
                            setCreateValue(event.target.value);
                            if (createError) setCreateError(null);
                          }}
                          aria-label="Project name (required)"
                          className={`peer w-full rounded-2xl border-[3px] bg-white py-4 pl-[29px] pr-5 text-lg text-slate-900 shadow-sm dark:shadow-none transition focus:outline-none focus:ring-0 dark:bg-zinc-900 dark:text-zinc-100 ${
                            showCreateNameError
                              ? "border-rose-400 hover:border-rose-500 focus:border-rose-500"
                              : "border-slate-300 hover:border-[#51bdff] focus:border-[#51bdff] dark:border-zinc-700 dark:hover:border-zinc-500 dark:focus:border-zinc-500"
                          }`}
                          disabled={createBusy}
                        />
                        {!createValue ? (
                          <div
                            aria-hidden
                            className="pointer-events-none absolute inset-y-0 left-[29px] flex items-center text-base"
                          >
                            <span
                              className={`relative pl-1 ${
                                showCreateNameError ? "text-rose-500" : "text-slate-500 dark:text-zinc-400"
                              }`}
                            >
                              {showCreateNameError ? (
                                <span className="absolute -left-3 font-bold text-rose-500">*</span>
                              ) : null}
                              <span>Name your project</span>
                            </span>
                          </div>
                        ) : null}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-zinc-400">
                        This helps you find and organize projects later.
                      </p>
                      {createError ? <p className="text-sm text-rose-500">{createError}</p> : null}
                    </div>

                    <div className="mt-6">
                      <div
                        className={`flex flex-col items-center justify-center rounded-[18px] border-[3px] border-dashed px-6 py-10 text-center transition ${
                          showCreateFilesError
                            ? "border-rose-400 bg-rose-50/40 dark:bg-zinc-900/60"
                            : createDragActive
                              ? "border-[#51bdff] bg-sky-50/60 dark:border-zinc-500 dark:bg-zinc-900/70"
                              : "border-slate-300 bg-white/60 hover:border-[#51bdff] dark:border-zinc-700 dark:bg-zinc-900/50 dark:hover:border-zinc-500"
                        } ${createBusy ? "opacity-70" : ""}`}
                        onDragOver={(event) => {
                          event.preventDefault();
                          if (!createBusy) setCreateDragActive(true);
                        }}
                        onDragLeave={() => setCreateDragActive(false)}
                        onDrop={(event) => {
                          event.preventDefault();
                          setCreateDragActive(false);
                          if (createBusy) return;
                          if (event.dataTransfer?.files?.length) addCreateFiles(event.dataTransfer.files);
                        }}
                      >
                        <FileUp
                          className={`h-9 w-9 ${showCreateFilesError ? "text-rose-500" : "text-slate-500"}`}
                          aria-hidden
                        />
                        <p
                          className={`mt-3 text-base font-semibold ${
                            showCreateFilesError ? "text-rose-600" : "text-slate-900"
                          }`}
                        >
                          Drop document here to upload
                        </p>
                        <button
                          type="button"
                          className="mt-4 inline-flex items-center justify-center rounded-[12px] border-[3px] border-[#51bdff] bg-white px-5 py-2 text-sm font-semibold text-[#013d63] shadow-sm dark:shadow-none transition hover:-translate-y-0.5 hover:bg-slate-50"
                          onClick={() => createFileInputRef.current?.click()}
                          disabled={createBusy}
                        >
                          Select from device
                        </button>
                        <input
                          ref={createFileInputRef}
                          type="file"
                          accept="application/pdf"
                          multiple
                          className="hidden"
                          onChange={(event) => {
                            const files = event.target.files;
                            if (files) addCreateFiles(files);
                            event.target.value = "";
                          }}
                          disabled={createBusy}
                        />
                      </div>

                      {createPendingFiles.length > 0 ? (
                        <div className="mt-4 rounded-2xl border border-slate-200 bg-white/70 p-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-900">
                            You&apos;re uploading ({createPendingFiles.length})
                          </p>
                          <div className="mt-2 space-y-2">
                      {createPendingFiles.map(({ id, file }) => (
                        <div
                          key={id}
                          className="group flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 transition hover:border-[#51bdff] hover:bg-sky-50/60"
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            <FileText className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
                            <span className="min-w-0 truncate">{file.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {createRemoveConfirmId === id ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setCreateRemoveConfirmId(null)}
                                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                                  disabled={createBusy}
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCreatePendingFiles((prev) => prev.filter((entry) => entry.id !== id));
                                    setCreateRemoveConfirmId(null);
                                  }}
                                  className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                                  disabled={createBusy}
                                >
                                  Delete
                                </button>
                              </>
                            ) : (
                              <>
                                <span className="whitespace-nowrap text-xs text-slate-500">
                                  {formatBytes(file.size)}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setCreateRemoveConfirmId(id)}
                                  className="rounded-full p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                                  aria-label={`Remove ${file.name}`}
                                  disabled={createBusy}
                                >
                                  <X className="h-4 w-4" aria-hidden />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="shrink-0 rounded-b-[18px] bg-slate-50/80">
                    <div className="flex justify-end gap-3 px-6 pt-[10px] pb-4 text-sm sm:px-10">
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
                        className="inline-flex items-center justify-center rounded-[12px] border-[3px] border-[#51bdff] bg-[#008ade] px-5 py-2 font-semibold text-white shadow-[0_14px_40px_rgba(15,23,42,0.25)] transition hover:-translate-y-0.5 hover:bg-[#007fcd] hover:shadow-[0_18px_50px_rgba(15,23,42,0.32)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#51bdff] focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:translate-y-0 disabled:opacity-60"
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
                          "Open Workspace"
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>,
            document.body,
          )
        : null}

      <LoadingOverlay open={billingPortalLoading} label="Opening billing portal…" />
      {sidebarTooltip
        ? createPortal(
          <div
            className="fixed z-[200] -translate-y-1/2 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-lg"
            style={{
              top: sidebarTooltip.top,
              left: sidebarTooltip.left,
            }}
          >
            {sidebarTooltip.label}
          </div>,
          document.body,
        )
        : null}
    </>
  );

  const pricingShell = (
    <div className="min-h-screen bg-[#e3edf9] text-slate-900">
      <HeroHeader>
        <div className="mx-auto flex h-[76px] w-full max-w-7xl items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <AppHeaderBrand
              logoLightSrc="/logos/home-expanded-sidebar-logo-light-v6.svg"
              logoDarkSrc="/logos/home-expanded-sidebar-logo-dark-v6.svg"
            />
          </div>
          <div className="flex items-center gap-3">
            <SettingsMenu variant="pricing" />
          </div>
        </div>
      </HeroHeader>
      <main className="relative z-0 lg:z-40">{children}</main>
    </div>
  );

  if (isStudioRoute) {
    return (
      <Suspense fallback={<PageLoadingSkeleton />}>
        <main>{children}</main>
      </Suspense>
    );
  }

  return isPricingRoute ? pricingShell : workspaceShell;
}
