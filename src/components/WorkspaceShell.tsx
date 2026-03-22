"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  BookOpen,
  ChevronDown,
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
  Moon,
  PanelLeftClose,
  PenSquare,
  Plus,
  Settings,
  Sparkles,
  Star,
  Sun,
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
import {
  PROJECT_NAME_STORAGE_KEY,
  deriveProjectNameFromFilename,
} from "@/lib/projectName";
import AppHeaderBrand from "./AppHeaderBrand";
import SettingsMenu from "./SettingsMenu";
import HeroHeader from "./HeroHeader";
import PageLoadingSkeleton from "./PageLoadingSkeleton";
import LoadingOverlay from "./LoadingOverlay";
import UiTooltip from "./UiTooltip";
import BillingStatusBanner from "@/components/BillingStatusBanner";
import { useAvatarPreference } from "@/lib/useAvatarPreference";
import { getAvatarFallback } from "@/lib/avatarFallback";
import { useWorkspaceFilePreloader, type PendingWorkspaceFile } from "@/components/useWorkspaceFilePreloader";
import { uploadProjectPreviewFromFile } from "@/lib/projectPreview";
import { WorkspaceHomeQueryProvider } from "@/components/workspaceHomeQueryContext";
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
const SIDEBAR_EXPANDED_KEY = "mpdf:sidebar-expanded";
const STRIPE_STATUS_CACHE_KEY = "mpdf:stripe-status";
const STRIPE_PLAN_TIER_CACHE_KEY = "mpdf:stripe-plan-tier";
const PROFILE_DISPLAY_CACHE_KEY = "mpdf:profile-display";

function isPlaceholderProfileName(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return true;
  return (
    normalized === "user" ||
    normalized === "mergify user" ||
    normalized === "mergifypdf user" ||
    normalized === "account"
  );
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
}

function getFileTypeLabel(file: File) {
  const extension = file.name.split(".").pop()?.trim();
  if (extension) return extension.toUpperCase();
  const subtype = file.type.split("/").pop()?.trim();
  return subtype ? subtype.toUpperCase() : "FILE";
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
  { label: "Projects", icon: PhFolders, href: "/projects" },
  { label: "Signatures", icon: PhSignature, href: "/signature-center" },
  { label: "Templates", icon: PhFileText, href: "/templates" },
  { label: "Trash", icon: PhTrash, href: "/projects/trash" },
];

const bottomSidebarItems: SidebarItem[] = [];

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
  initialSidebarExpanded?: boolean;
  initialProfile?: {
    id?: string | null;
    name?: string | null;
    email?: string | null;
  };
}

function shouldShowBootLoader(): boolean {
  return false;
}

function bootLoaderMinVisibleMs(): number {
  return 450;
}

function bootLoaderShowDelayMs(): number {
  return 240;
}

export default function WorkspaceShell({
  children,
  initialSidebarExpanded = true,
  initialProfile,
}: WorkspaceShellProps) {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
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
  const [fallbackProjectCountReady, setFallbackProjectCountReady] = useState(false);
  const [expanded, setExpanded] = useState(initialSidebarExpanded);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileMenuPosition, setProfileMenuPosition] = useState<{ left: number; bottom: number } | null>(
    null,
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [createPendingFiles, setCreatePendingFiles] = useState<PendingWorkspaceFile[]>([]);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createBusy, setCreateBusy] = useState(false);
  const [createShowValidation, setCreateShowValidation] = useState(false);
  const [contentSwapOut, setContentSwapOut] = useState(false);
  const [contentSwapIn, setContentSwapIn] = useState(false);
  const [homeProjectsQuery, setHomeProjectsQuery] = useState("");
  const [mobileSearchExpanded, setMobileSearchExpanded] = useState(false);
  const [shellTheme, setShellTheme] = useState<"light" | "dark">("light");
  const contentSwapTimerRef = useRef<number | null>(null);
  const contentSettleTimerRef = useRef<number | null>(null);
  const contentSwapSafetyRef = useRef<number | null>(null);
  const pendingContentSwapPathRef = useRef<string | null>(null);
  const [billingPortalLoading, setBillingPortalLoading] = useState(false);
  const [homeStripeStatusOverride, setHomeStripeStatusOverride] = useState<string | null | undefined>(undefined);
  const [homeBillingBannerDismissed, setHomeBillingBannerDismissed] = useState(false);
  const [homeBillingBannerMounted, setHomeBillingBannerMounted] = useState(false);
  const [homeBillingBannerVisible, setHomeBillingBannerVisible] = useState(false);
  const [homeBillingBannerExiting, setHomeBillingBannerExiting] = useState(false);
  const [homeCurrentPlanTier, setHomeCurrentPlanTier] = useState<string | null>(null);
  const [homeBillingMetaReady, setHomeBillingMetaReady] = useState<boolean>(false);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const [compactSidebar, setCompactSidebar] = useState(false);
  const [narrowSidebar, setNarrowSidebar] = useState(false);
  const [overlaySidebar, setOverlaySidebar] = useState(false);
  const [phoneViewport, setPhoneViewport] = useState(false);
  const [mobileDockViewport, setMobileDockViewport] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const createRef = useRef<HTMLDivElement>(null);
  const createFileInputRef = useRef<HTMLInputElement | null>(null);
  const homeProjectsSearchInputRef = useRef<HTMLInputElement | null>(null);
  const avatarKey = session?.user?.id ?? session?.user?.email ?? null;
  const { avatar } = useAvatarPreference(avatarKey);
  const [stableProfile, setStableProfile] = useState<{ name: string; email: string }>(() => {
    const initialNameRaw = typeof initialProfile?.name === "string" ? initialProfile.name.trim() : "";
    const initialName = isPlaceholderProfileName(initialNameRaw) ? "" : initialNameRaw;
    const initialEmail = typeof initialProfile?.email === "string" ? initialProfile.email.trim() : "";
    const initialValue =
      initialName || initialEmail ? { name: initialName || initialEmail, email: initialEmail } : null;
    if (typeof window === "undefined") return initialValue ?? { name: "", email: "" };
    try {
      const raw = window.sessionStorage?.getItem(PROFILE_DISPLAY_CACHE_KEY);
      if (!raw) return initialValue ?? { name: "", email: "" };
      const parsed = JSON.parse(raw) as { name?: unknown; email?: unknown };
      const cachedNameRaw = typeof parsed.name === "string" ? parsed.name.trim() : "";
      const cachedName = isPlaceholderProfileName(cachedNameRaw) ? "" : cachedNameRaw;
      const cachedEmail = typeof parsed.email === "string" ? parsed.email.trim() : "";
      if (!cachedName && !cachedEmail) return initialValue ?? { name: "", email: "" };
      return { name: cachedName || cachedEmail || "", email: cachedEmail };
    } catch {
      return initialValue ?? { name: "", email: "" };
    }
  });
  const [signingOut, setSigningOut] = useState(false);
  const [logoutConfirmArmed, setLogoutConfirmArmed] = useState(false);
  const logoutConfirmTimeoutRef = useRef<number | null>(null);
  const [sidebarTooltip, setSidebarTooltip] = useState<{
    label: string;
    top: number;
    left: number;
  } | null>(null);
  const [createDragActive, setCreateDragActive] = useState(false);
  const [homeBootLoading, setHomeBootLoading] = useState(() => shouldShowBootLoader());
  const homeBootStartedAtRef = useRef(0);
  const homeBootShownAtRef = useRef(0);
  const homeBootVisibleRef = useRef(shouldShowBootLoader());
  const manualLoadingSafetyRef = useRef<number | null>(null);
  const profileName = stableProfile.name || "";
  const profileEmail = stableProfile.email;
  const hasProfileInfo = Boolean(profileName || profileEmail);
  const fallbackAvatar = getAvatarFallback(avatarKey, profileName || profileEmail || null);
  const showAvatarImage = Boolean(avatar) && !avatarLoadFailed;
  const homeProjectsQueryContext = useMemo(
    () => ({ query: homeProjectsQuery, setQuery: setHomeProjectsQuery }),
    [homeProjectsQuery],
  );

  useEffect(() => {
    setAvatarLoadFailed(false);
  }, [avatar]);

  useEffect(() => {
    const nextNameRaw = (session?.user?.name ?? "").trim();
    const nextName = isPlaceholderProfileName(nextNameRaw) ? "" : nextNameRaw;
    const nextEmail = (session?.user?.email ?? "").trim();
    if (!nextName && !nextEmail) return;
    if (sessionStatus === "loading" && stableProfile.name) return;
    setStableProfile((prev) => ({
      name: nextName || nextEmail || prev.name || "",
      email: nextEmail || prev.email || "",
    }));
  }, [session?.user?.email, session?.user?.name, sessionStatus, stableProfile.name]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (!stableProfile.name && !stableProfile.email) {
        window.sessionStorage?.removeItem(PROFILE_DISPLAY_CACHE_KEY);
        return;
      }
      window.sessionStorage?.setItem(PROFILE_DISPLAY_CACHE_KEY, JSON.stringify(stableProfile));
    } catch {
      // ignore storage write failures
    }
  }, [stableProfile]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("theme");
    const initialTheme = stored === "dark" ? "dark" : "light";
    document.documentElement.classList.toggle("dark", initialTheme === "dark");
    document.body.classList.remove("dark");
    setShellTheme(initialTheme);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.add("workspace-shell-active");
    document.body.classList.add("workspace-shell-active");
    return () => {
      document.documentElement.classList.remove("workspace-shell-active");
      document.body.classList.remove("workspace-shell-active");
    };
  }, []);

  const toggleShellTheme = () => {
    document.documentElement.classList.add("theme-transition");
    const nextTheme = shellTheme === "dark" ? "light" : "dark";
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
    if (nextTheme === "light") {
      document.body.classList.remove("dark");
    }
    window.localStorage.setItem("theme", nextTheme);
    document.cookie = `theme=${nextTheme}; path=/; max-age=31536000`;
    setShellTheme(nextTheme);
    window.setTimeout(() => {
      document.documentElement.classList.remove("theme-transition");
    }, 200);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage?.setItem(SIDEBAR_EXPANDED_KEY, expanded ? "1" : "0");
      document.cookie = `mpdf_sidebar_expanded=${expanded ? "1" : "0"}; path=/; max-age=31536000; samesite=lax`;
    } catch {
      // ignore storage write errors
    }
  }, [expanded]);

  useEffect(() => {
    homeBootVisibleRef.current = homeBootLoading;
  }, [homeBootLoading]);

  useEffect(() => {
    const clearManualLoadingSafety = () => {
      if (manualLoadingSafetyRef.current !== null) {
        window.clearTimeout(manualLoadingSafetyRef.current);
        manualLoadingSafetyRef.current = null;
      }
    };
    const handleLoadingStart = () => {
      homeBootShownAtRef.current = performance.now();
      setHomeBootLoading(true);
      clearManualLoadingSafety();
      manualLoadingSafetyRef.current = window.setTimeout(() => {
        setHomeBootLoading(false);
        manualLoadingSafetyRef.current = null;
      }, 8000);
    };
    const handleLoadingStop = () => {
      clearManualLoadingSafety();
      setHomeBootLoading(false);
    };
    window.addEventListener("workspace-loading-start", handleLoadingStart);
    window.addEventListener("workspace-loading-stop", handleLoadingStop);
    return () => {
      clearManualLoadingSafety();
      window.removeEventListener("workspace-loading-start", handleLoadingStart);
      window.removeEventListener("workspace-loading-stop", handleLoadingStop);
    };
  }, []);

  useEffect(() => {
    const handleBillingStart = () => {
      setBillingPortalLoading(true);
    };
    const handleBillingStop = () => {
      setBillingPortalLoading(false);
    };

    window.addEventListener("workspace-billing-portal-start", handleBillingStart);
    window.addEventListener("workspace-billing-portal-stop", handleBillingStop);
    return () => {
      window.removeEventListener("workspace-billing-portal-start", handleBillingStart);
      window.removeEventListener("workspace-billing-portal-stop", handleBillingStop);
    };
  }, []);


  useEffect(() => {
    const handlePageShow = () => {
      setBillingPortalLoading(false);
    };
    window.addEventListener("pageshow", handlePageShow);
    return () => {
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, []);

  useEffect(() => {
    if (!shouldShowBootLoader()) {
      if (manualLoadingSafetyRef.current !== null) {
        window.clearTimeout(manualLoadingSafetyRef.current);
        manualLoadingSafetyRef.current = null;
      }
      setHomeBootLoading(false);
      return;
    }
    homeBootStartedAtRef.current = performance.now();

    let readyReceived = false;
    const showDelayMs = bootLoaderShowDelayMs();
    const minVisibleMs = bootLoaderMinVisibleMs();
    const showTimer = !homeBootVisibleRef.current
      ? window.setTimeout(() => {
          if (readyReceived) return;
          homeBootShownAtRef.current = performance.now();
          setHomeBootLoading(true);
        }, showDelayMs)
      : null;
    if (homeBootVisibleRef.current && homeBootShownAtRef.current <= 0) {
      homeBootShownAtRef.current = performance.now();
    }
    const safetyTimeout = window.setTimeout(() => {
      setHomeBootLoading(false);
    }, 8000);

    const handleReady = () => {
      readyReceived = true;
      if (manualLoadingSafetyRef.current !== null) {
        window.clearTimeout(manualLoadingSafetyRef.current);
        manualLoadingSafetyRef.current = null;
      }
      if (showTimer !== null) window.clearTimeout(showTimer);
      const shownAt = homeBootShownAtRef.current;
      if (!homeBootVisibleRef.current || shownAt <= 0) {
        setHomeBootLoading(false);
        window.clearTimeout(safetyTimeout);
        return;
      }
      const elapsedVisible = performance.now() - shownAt;
      const remaining = Math.max(0, minVisibleMs - elapsedVisible);
      window.setTimeout(() => {
        setHomeBootLoading(false);
      }, remaining);
      window.clearTimeout(safetyTimeout);
    };

    window.addEventListener("workspace-content-ready", handleReady);
    return () => {
      window.removeEventListener("workspace-content-ready", handleReady);
      if (showTimer !== null) window.clearTimeout(showTimer);
      window.clearTimeout(safetyTimeout);
    };
  }, [pathname]);

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

  const createMissingFiles = createPendingFiles.length === 0;
  const showCreateFilesError = createShowValidation && createMissingFiles;

  function openCreateModal() {
    setCreateError(null);
    setCreateBusy(false);
    setCreatePendingFiles([]);
    setCreateDragActive(false);
    setCreateShowValidation(false);
    setCreateOpen(true);
  }

  function closeCreateModal() {
    if (createBusy) return;
    setCreateOpen(false);
  }

  async function handleCreateStart() {
    const startedAt = Date.now();
    setCreateShowValidation(true);
    if (createMissingFiles) {
      setCreateError(null);
      return;
    }
    const clean = deriveProjectNameFromFilename(createPendingFiles[0]?.file?.name);
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
  const panelExpanded = false;
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
  const isSignaturesPanel = panelKey === "signatures";
  const isTemplatesPanel = panelKey === "templates";
  const useUnifiedWorkspaceBackground =
    pathname === "/" ||
    (pathname?.startsWith("/projects") ?? false) ||
    (pathname?.startsWith("/signature-center") ?? false);
  const workspaceBackgroundClass = useUnifiedWorkspaceBackground
    ? "bg-[#F1F4F9]"
    : isHomePanel
      ? "bg-[#F1F4F9]"
      : "bg-slate-100";
  const isBillingBannerRoute = isHomePanel || isAccountRoute;
  const homeStripeStatus = homeStripeStatusOverride ?? (session?.user?.stripeStatus ?? null);
  const homeBillingIsDelinquent = homeStripeStatus === "past_due" || homeStripeStatus === "unpaid";
  const showHomeBillingBanner = isBillingBannerRoute && homeBillingIsDelinquent && !homeBillingBannerDismissed;
  const renderHomeBillingBanner = false;
  const showHomeBillingModal = showHomeBillingBanner && !billingPortalLoading && homeBillingMetaReady;
  const homeBillingBannerOccupiesSpace = false;
  const homePlanName =
    homeCurrentPlanTier === "essential_plus"
      ? "Essential Plus"
      : homeCurrentPlanTier === "signature_pro"
        ? "Signature Pro"
        : "Your plan";
  const homeBillingModalBody = "Update your payment details to continue accessing your workspace.";
  const shellLoadingOpen = billingPortalLoading || homeBootLoading;
  const shellLoadingLabel = billingPortalLoading
    ? "Opening billing portal…"
    : "Loading...";

  const isHomeProjectsPath = (value?: string | null) =>
    value === "/" || (value?.startsWith("/projects") ?? false);
  const showPersistentHomeProjectsTopBar = pathname === "/" || pathname === "/projects/all";
  const isAllProjectsRoute = pathname === "/projects/all";
  const fallbackProjectCardCount = fallbackProjectCountReady
    ? (isAllProjectsRoute ? Math.min(homeRecentProjects.length, 60) : Math.min(homeRecentProjects.length, 9))
    : 0;

  const navigateWithContentSwap = (nextPath: string, closeMobile = false): boolean => {
    const currentPath = pathname ?? "";
    if (!nextPath || nextPath === currentPath) {
      if (closeMobile) setMobileOpen(false);
      return false;
    }
    const shouldAnimateSwap = isHomeProjectsPath(currentPath) && isHomeProjectsPath(nextPath);
    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!shouldAnimateSwap || reduceMotion) {
      if (closeMobile) setMobileOpen(false);
      router.push(nextPath);
      return true;
    }

    if (contentSwapTimerRef.current !== null) {
      window.clearTimeout(contentSwapTimerRef.current);
      contentSwapTimerRef.current = null;
    }
    if (contentSettleTimerRef.current !== null) {
      window.clearTimeout(contentSettleTimerRef.current);
      contentSettleTimerRef.current = null;
    }
    if (contentSwapSafetyRef.current !== null) {
      window.clearTimeout(contentSwapSafetyRef.current);
      contentSwapSafetyRef.current = null;
    }

    pendingContentSwapPathRef.current = nextPath;
    if (closeMobile) setMobileOpen(false);
    setContentSwapIn(false);
    setContentSwapOut(true);
    contentSwapTimerRef.current = window.setTimeout(() => {
      router.push(nextPath);
      contentSwapTimerRef.current = null;
    }, 24);
    contentSwapSafetyRef.current = window.setTimeout(() => {
      setContentSwapOut(false);
      contentSwapSafetyRef.current = null;
    }, 260);
    return true;
  };
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
    const pendingPath = pendingContentSwapPathRef.current;
    if (!pendingPath || pathname !== pendingPath) return;
    if (contentSwapTimerRef.current !== null) {
      window.clearTimeout(contentSwapTimerRef.current);
      contentSwapTimerRef.current = null;
    }
    if (contentSwapSafetyRef.current !== null) {
      window.clearTimeout(contentSwapSafetyRef.current);
      contentSwapSafetyRef.current = null;
    }
    pendingContentSwapPathRef.current = null;
    setContentSwapOut(false);
    setContentSwapIn(true);
    if (contentSettleTimerRef.current !== null) {
      window.clearTimeout(contentSettleTimerRef.current);
    }
    contentSettleTimerRef.current = window.setTimeout(() => {
      setContentSwapIn(false);
      contentSettleTimerRef.current = null;
    }, 120);
  }, [pathname]);

  useEffect(() => {
    return () => {
      if (contentSwapTimerRef.current !== null) {
        window.clearTimeout(contentSwapTimerRef.current);
      }
      if (contentSettleTimerRef.current !== null) {
        window.clearTimeout(contentSettleTimerRef.current);
      }
      if (contentSwapSafetyRef.current !== null) {
        window.clearTimeout(contentSwapSafetyRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isBillingBannerRoute) {
      setHomeStripeStatusOverride(undefined);
      setHomeBillingMetaReady(false);
      return;
    }
    if (!session?.user?.email) {
      // Keep cached/local session status until auth data arrives to avoid banner pop-in on refresh.
      return;
    }
    let cancelled = false;
    async function reconcileHomeStripeStatus() {
      try {
        const response = await fetch("/api/account/trial-status", { cache: "no-store" });
        if (!response.ok) {
          if (!cancelled) {
            setHomeStripeStatusOverride(undefined);
            setHomeBillingMetaReady(true);
          }
          return;
        }
        const data = (await response.json()) as {
          stripeStatus?: string | null;
          currentPlanTier?: string | null;
        };
        if (!cancelled) {
          const nextStatus = typeof data.stripeStatus === "string" ? data.stripeStatus : null;
          const nextPlanTier =
            typeof data.currentPlanTier === "string" ? data.currentPlanTier : null;
          setHomeStripeStatusOverride(nextStatus);
          setHomeCurrentPlanTier(nextPlanTier);
          try {
            if (nextStatus) {
              window.localStorage?.setItem(STRIPE_STATUS_CACHE_KEY, nextStatus);
            } else {
              window.localStorage?.removeItem(STRIPE_STATUS_CACHE_KEY);
            }
            if (nextPlanTier) {
              window.localStorage?.setItem(STRIPE_PLAN_TIER_CACHE_KEY, nextPlanTier);
            } else {
              window.localStorage?.removeItem(STRIPE_PLAN_TIER_CACHE_KEY);
            }
          } catch {
            // ignore storage write errors
          }
          setHomeBillingMetaReady(true);
        }
      } catch {
        if (!cancelled) {
          setHomeStripeStatusOverride(undefined);
          setHomeBillingMetaReady(true);
        }
      }
    }
    void reconcileHomeStripeStatus();
    return () => {
      cancelled = true;
    };
  }, [isBillingBannerRoute, session?.user?.email]);

  useEffect(() => {
    const sessionStripeStatus = session?.user?.stripeStatus;
    if (typeof sessionStripeStatus !== "string") return;
    try {
      window.localStorage?.setItem(STRIPE_STATUS_CACHE_KEY, sessionStripeStatus);
    } catch {
      // ignore storage write errors
    }
  }, [session?.user?.stripeStatus]);

  useEffect(() => {
    // Keep dismiss state across in-app navigation. Reset only after billing is no longer delinquent,
    // so a future delinquent state can show the banner again.
    if (!homeBillingIsDelinquent) {
      setHomeBillingBannerDismissed(false);
    }
  }, [homeBillingIsDelinquent]);

  useEffect(() => {
    let cancelled = false;
    let hideTimer = 0;

    if (showHomeBillingBanner) {
      setHomeBillingBannerExiting(false);
      setHomeBillingBannerMounted(true);
      setHomeBillingBannerVisible(true);
    } else {
      setHomeBillingBannerExiting(true);
      setHomeBillingBannerVisible(false);
      hideTimer = window.setTimeout(() => {
        if (!cancelled) {
          setHomeBillingBannerMounted(false);
          setHomeBillingBannerExiting(false);
        }
      }, 300);
    }

    return () => {
      cancelled = true;
      if (hideTimer) window.clearTimeout(hideTimer);
    };
  }, [showHomeBillingBanner]);

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
      setFallbackProjectCountReady(true);
      return;
    }

    let cancelled = false;
    setHomeRecentProjects([]);
    setFallbackProjectCountReady(false);

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
      setFallbackProjectCountReady(true);
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
        return;
      }
      if (!cancelled) setFallbackProjectCountReady(true);
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
      const isPortraitDockViewport = width <= 1024 && window.innerHeight > width;
      setNarrowSidebar(width < 1280);
      setOverlaySidebar(width < 1024);
      setPhoneViewport(width < 768);
      setMobileDockViewport(width < 768 || isPortraitDockViewport);
    };

    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => {
      window.removeEventListener("resize", updateWidth);
    };
  }, []);

  useEffect(() => {
    if (!phoneViewport && mobileSearchExpanded) {
      setMobileSearchExpanded(false);
    }
  }, [phoneViewport, mobileSearchExpanded]);

  useEffect(() => {
    setMobileSearchExpanded(false);
  }, [pathname]);

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
  const contentShellWrapperClass = mobileDockViewport
    ? "justify-center px-[13px]"
    : hideWorkspaceSidebar
      ? "justify-center px-6"
      : "justify-start px-3 sm:px-4 md:pl-0 md:pr-6";
  const setSidebarTooltipFromEvent = (
    event: React.MouseEvent<HTMLElement> | React.FocusEvent<HTMLElement>,
    label: string,
    offset = 12,
    useSidebarEdge = false
  ) => {
    if ((label === "Expand sidebar" || label === "Show navigation") && expanded) return;
    if ((label === "Collapse sidebar" || label === "Hide navigation") && !expanded) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const sidebarRect = sidebarRef.current?.getBoundingClientRect();
    const leftAnchor = useSidebarEdge ? sidebarRect?.right ?? rect.right : rect.right;
    setSidebarTooltip({
      label,
      top:
        rect.top +
        rect.height / 2 +
        (label === "Expand sidebar" ||
        label === "Collapse sidebar" ||
        label === "Show navigation" ||
        label === "Hide navigation"
          ? 6
          : 0),
      left: leftAnchor + offset,
    });
  };

  const getSidebarTooltipLabel = (label: string) => {
    switch (label) {
      case "Projects":
        return "Browse all projects";
      case "Signatures":
        return "Open signature requests";
      case "Templates":
        return "Browse templates";
      case "Trash":
        return "View deleted projects";
      case "Log out":
        return "Sign out";
      case "Tap again to log out":
        return "Tap again to sign out";
      default:
        return label;
    }
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

  const dismissHomeBillingBanner = () => {
    setHomeBillingBannerDismissed(true);
  };

  const openBillingPortal = async ({ collapseSidebarAfter = true }: { collapseSidebarAfter?: boolean } = {}) => {
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
      if (collapseSidebarAfter) {
        setExpanded(false);
      }
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
          label: getSidebarTooltipLabel(logoutArmedA11yLabel),
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
          onClick={(event) => {
            if (navigateWithContentSwap(targetHref, true)) {
              event.preventDefault();
            }
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
          onClick={(event) => {
            resetLogoutConfirm();
            if (navigateWithContentSwap(targetHref, true)) {
              event.preventDefault();
            }
          }}
          aria-label={logoutArmedA11yLabel}
          className={`${baseClasses} ${stateClasses} ${confirmClasses}`}
        >
          {content}
        </Link>
      );
    });

  const mobileBottomDockItems = [
    {
      label: "Projects",
      href: "/projects/all",
      icon: PhFolders,
      active: isProjectsRoute || pathname === "/projects/all",
    },
    {
      label: "Signatures",
      href: "/signature-center",
      icon: PhSignature,
      active: pathname?.startsWith("/signature-center") ?? false,
    },
    {
      label: "Templates",
      href: "/templates",
      icon: PhFileText,
      active: pathname?.startsWith("/templates") ?? false,
    },
    { label: "Trash", href: "/projects/trash", icon: PhTrash, active: isTrashRoute },
  ] as const;

  const workspaceShell = (
    <>
    {isBillingBannerRoute ? (
      <div
        aria-hidden
        className={`fixed inset-0 z-0 ${workspaceBackgroundClass} dark:bg-[#222224]`}
      />
    ) : null}
    <div
      className={`workspace-shell-root relative z-10 flex pt-0 ${homeBillingBannerExiting ? "transition-[padding-top,min-height] duration-300 ease-out" : "transition-none"} md:pt-[var(--home-banner-offset)] ${workspaceBackgroundClass} ${sidebarCompact ? "sidebar-collapsed" : ""} ${expanded ? "" : "sidebar-minimized"} dark:bg-[#222224]`}
      style={
        {
          minHeight: "calc(var(--workspace-vh, 100dvh) - var(--home-banner-offset))",
          "--shell-content-width":
            isAccountRoute ? "1960px" : "calc(1960px - (var(--shell-sidebar-width) - 80px))",
          "--shell-left":
            "max(24px, calc((100vw - (var(--shell-content-width) + var(--shell-sidebar-width) + 24px)) / 2))",
          "--shell-sidebar-width": expanded ? "256px" : "80px",
          "--home-banner-offset": homeBillingBannerOccupiesSpace ? "56px" : "0px",
          "--home-topbar-offset": showPersistentHomeProjectsTopBar ? "68px" : "0px",
          "--home-right-column-offset": showPersistentHomeProjectsTopBar ? "0px" : "240px",
        } as React.CSSProperties
      }
    >
      {renderHomeBillingBanner ? (
        <div className="pointer-events-none absolute left-0 right-0 top-0 z-[70] hidden md:block">
          <div
            className={`pointer-events-auto ${
              homeBillingBannerExiting
                ? "transition-all duration-300 ease-out -translate-y-full opacity-0"
                : "translate-y-0 opacity-100"
            }`}
          >
            <BillingStatusBanner
              contentMaxWidth={
                isAccountRoute
                  ? "var(--shell-content-width)"
                  : "calc(var(--shell-content-width) + var(--shell-sidebar-width) + 24px)"
              }
              onUpdatePaymentMethod={() => {
                void openBillingPortal({ collapseSidebarAfter: false });
              }}
              onDismiss={dismissHomeBillingBanner}
            />
          </div>
        </div>
      ) : null}
      {showHomeBillingModal ? (
        <div className="fixed inset-0 z-[90]">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-black/45 backdrop-blur-sm"
          />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-3 sm:p-4">
            <div className="pointer-events-auto w-full max-w-[600px] overflow-hidden rounded-2xl border border-[#D9DDF0] bg-white text-[#1F2A37] shadow-[0_20px_50px_rgba(15,23,42,0.28)] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
              <div className="flex items-center justify-between gap-3 bg-rose-100 px-5 py-3.5 dark:bg-rose-900/40">
                <p className="text-lg font-semibold text-rose-700 dark:text-rose-200">{homePlanName} failed to renew</p>
                <button
                  type="button"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-rose-700 transition hover:bg-rose-200 dark:text-rose-200 dark:hover:bg-rose-900/60"
                  onClick={dismissHomeBillingBanner}
                  aria-label="Dismiss payment notice"
                >
                  <X className="h-5 w-5" aria-hidden />
                </button>
              </div>
              <div className="space-y-4 px-5 py-5">
                <p className="text-lg leading-7 text-[#475569] dark:text-zinc-300">{homeBillingModalBody}</p>
                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      void openBillingPortal({ collapseSidebarAfter: false });
                    }}
                    className="inline-flex items-center rounded-full bg-rose-600 px-5 py-2.5 text-base font-semibold text-white transition hover:bg-rose-700 dark:bg-rose-600 dark:hover:bg-rose-700"
                  >
                    Update payment
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {!hideWorkspaceSidebar ? (
      <>
      {/* Desktop sidebar */}
      <aside
        id={isHomePanel ? "home-sidebar" : undefined}
        className={`workspace-desktop-sidebar absolute left-[var(--shell-left)] top-[calc(24px+var(--home-banner-offset))] z-50 hidden w-[var(--shell-sidebar-width)] text-slate-800 ${homeBillingBannerExiting ? "transition-[top,height] duration-300 ease-out" : "transition-none 2xl:transition-[width] 2xl:duration-300 2xl:ease-[cubic-bezier(0.22,1,0.36,1)]"} dark:text-zinc-100 md:flex`}
        style={{
          height:
            "calc(var(--workspace-vh, 100dvh) - var(--workspace-frame-gutter, 48px) - var(--home-banner-offset, 0px))",
        }}
      >
        <div className="relative flex h-full w-full">
          <div
            ref={sidebarRef}
            className={`flex h-full ${railWidthClass} flex-col ${
              useUnifiedWorkspaceBackground
                ? "rounded-xl border-[1.5px] border-gray-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-[0_1px_0_rgba(255,255,255,0.02),0_8px_18px_rgba(0,0,0,0.24)]"
                : "rounded-xl border-[1.5px] border-gray-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-[0_1px_0_rgba(255,255,255,0.02),0_8px_18px_rgba(0,0,0,0.24)]"
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
                        setSidebarTooltipFromEvent(event, "Hide navigation", 3, true);
                      }}
                      onMouseLeave={() => {
                        setSidebarTooltip(null);
                      }}
                      onFocus={(event) => {
                        setSidebarTooltipFromEvent(event, "Hide navigation", 3, true);
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
                      setSidebarTooltipFromEvent(event, "Show navigation", 3, true);
                    }}
                    onMouseLeave={() => {
                      setSidebarTooltip(null);
                    }}
                    onFocus={(event) => {
                      setSidebarTooltipFromEvent(event, "Show navigation", 3, true);
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
                      setSidebarTooltipFromEvent(event, "Create a new project", 3, true);
                    }}
                    onMouseLeave={() => {
                      if (!navExpanded) setSidebarTooltip(null);
                    }}
                    onFocus={(event) => {
                      if (navExpanded) return;
                      setSidebarTooltipFromEvent(event, "Create a new project", 3, true);
                    }}
                    onBlur={() => {
                      if (!navExpanded) setSidebarTooltip(null);
                    }}
                  >
                    <StartProjectButton
                      variant="custom"
                      iconOnly={!navExpanded}
                      onOpen={() => setSidebarTooltip(null)}
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
            {typeof document !== "undefined" && profileOpen && (isHomePanel || profileMenuPosition)
              ? createPortal(
                  <div
                    ref={profileMenuRef}
                    className={`avatar-dropdown-menu fixed z-[60] w-80 rounded-3xl border border-slate-100 bg-white p-4 text-sm text-slate-800 shadow-[0_30px_80px_rgba(15,23,42,0.35)] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:shadow-[0_30px_80px_rgba(0,0,0,0.55)] ${
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
                            {hasProfileInfo ? fallbackAvatar.initials : ""}
                          </span>
                        )}
                      </span>
                      {hasProfileInfo ? (
                        <div className="flex-1">
                          {profileName ? <p className="text-lg font-semibold text-slate-900">{profileName}</p> : null}
                          {profileEmail ? <p className="text-sm text-slate-500">{profileEmail}</p> : null}
                        </div>
                      ) : null}
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
        className={`workspace-main-with-dock flex min-h-0 w-full flex-1 flex-col bg-transparent transition-none 2xl:transition-[padding-left] 2xl:duration-300 2xl:ease-[cubic-bezier(0.22,1,0.36,1)] ${contentOffsetClass}`}
      >
        <WorkspaceHomeQueryProvider value={homeProjectsQueryContext}>
          {showPersistentHomeProjectsTopBar ? (
            <div
              className={`relative z-[80] flex w-full ${contentShellWrapperClass} pt-3 md:pt-6`}
            >
              <div
                style={{ maxWidth: "var(--shell-content-width)" }}
                className="w-full transition-none 2xl:transition-[max-width] 2xl:duration-300 2xl:ease-[cubic-bezier(0.22,1,0.36,1)]"
              >
                <div className="flex w-full items-center gap-3">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div
                      className={`flex transition-[max-width,width] duration-200 ease-out ${
                        mobileSearchExpanded
                          ? "min-w-0 flex-1 w-full max-w-none transition-[max-width,width] duration-200 ease-out"
                          : "w-full max-w-[440px] transition-none md:max-w-xl md:transition-[max-width,width] md:duration-200 md:ease-out"
                      }`}
                    >
                      <div
                        className="flex h-11 w-full cursor-text rounded-full border-[1.5px] border-gray-200 bg-white shadow-sm transition focus-within:border-[3.5px] focus-within:border-[#4F46E5] dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-[0_1px_0_rgba(255,255,255,0.02),0_8px_18px_rgba(0,0,0,0.24)] dark:focus-within:border-[#4F46E5]"
                        onMouseDown={(event) => {
                          const target = event.target;
                          if (target instanceof HTMLInputElement) return;
                          if (phoneViewport) setMobileSearchExpanded(true);
                          event.preventDefault();
                          homeProjectsSearchInputRef.current?.focus();
                        }}
                        onClick={() => {
                          if (phoneViewport) setMobileSearchExpanded(true);
                          homeProjectsSearchInputRef.current?.focus();
                        }}
                      >
                        <div className="flex h-full w-full items-center gap-2 rounded-full bg-white px-4 text-[#1F2A37] dark:bg-zinc-900 dark:text-zinc-100">
                          <svg
                            aria-hidden="true"
                            viewBox="0 0 24 24"
                            className="h-5 w-5"
                            fill="none"
                            stroke="#4F46E5"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <circle cx="11" cy="11" r="8" />
                            <path d="m21 21-4.35-4.35" />
                          </svg>
                          <input
                            ref={homeProjectsSearchInputRef}
                            type="text"
                            value={homeProjectsQuery}
                            onChange={(event) => setHomeProjectsQuery(event.target.value)}
                            placeholder="Search projects..."
                            className="h-full min-w-0 flex-1 border-none bg-white text-base text-[#1F2A37] placeholder:text-[#6B7280] outline-none focus:outline-none focus:ring-0 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-400"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div
                    className={`flex h-11 flex-nowrap items-center gap-2 shrink-0 ${
                      mobileSearchExpanded
                        ? "pointer-events-none w-0 min-w-0 max-w-0 overflow-hidden opacity-0 transition-[width,max-width,opacity] duration-200 ease-out"
                        : "w-[44px] min-w-[44px] max-w-[44px] opacity-100 transition-none md:w-[276px] md:min-w-[276px] md:max-w-[276px] md:transition-[width,max-width,opacity] md:duration-200 md:ease-out"
                    }`}
                  >
                    <UiTooltip label={shellTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}>
                      <button
                        type="button"
                        onClick={toggleShellTheme}
                        className="hidden shrink-0 h-11 w-11 items-center justify-center rounded-full border-[1.5px] border-gray-200 bg-white text-[#1F2A37] shadow-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/15 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:shadow-[0_1px_0_rgba(255,255,255,0.02),0_8px_18px_rgba(0,0,0,0.24)] dark:hover:bg-zinc-800 dark:focus-visible:ring-[#2563EB]/30 md:flex"
                        aria-label={shellTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                        aria-pressed={shellTheme === "dark"}
                      >
                        {shellTheme === "dark" ? (
                          <Sun className="h-4 w-4" aria-hidden />
                        ) : (
                          <Moon className="h-4 w-4" aria-hidden />
                        )}
                      </button>
                    </UiTooltip>
                    <SettingsMenu
                      trigger="custom"
                      triggerLabel="Open profile menu"
                      triggerClassName="w-full min-w-0 max-w-full overflow-hidden flex h-11 items-center justify-center rounded-full border-[1.5px] border-gray-200 bg-white p-1 shadow-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/15 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F1F4F9] dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-[0_1px_0_rgba(255,255,255,0.02),0_8px_18px_rgba(0,0,0,0.24)] dark:hover:bg-zinc-800 dark:focus-visible:ring-[#2563EB]/30 dark:focus-visible:ring-offset-[#222224] md:justify-start md:gap-1.5 md:p-0 md:py-1.5 md:pl-1 md:pr-1.5"
                      triggerContent={
                        <>
                          <span className="shrink-0 pointer-events-none">
                            {showAvatarImage ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={avatar!}
                                alt="Your avatar"
                                className="h-8 w-8 rounded-full object-cover"
                                onError={() => setAvatarLoadFailed(true)}
                              />
                            ) : (
                              <span
                                className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold uppercase text-white"
                                style={{ backgroundColor: fallbackAvatar.color }}
                              >
                                {hasProfileInfo ? fallbackAvatar.initials : ""}
                              </span>
                            )}
                          </span>
                          {hasProfileInfo ? (
                            <span className="hidden min-w-0 flex-1 flex-col leading-tight text-left md:flex">
                              {profileName ? (
                                <span className="truncate text-[13px] font-semibold text-[#1F2A37] dark:text-zinc-100">
                                  {profileName}
                                </span>
                              ) : null}
                              {profileEmail ? (
                                <span className="hidden truncate text-[11px] font-medium text-[#64748B] dark:text-zinc-400 md:block">
                                  {profileEmail}
                                </span>
                              ) : null}
                            </span>
                          ) : null}
                          <ChevronDown className="hidden h-4 w-4 shrink-0 text-[#94A3B8] dark:text-zinc-400 md:block" aria-hidden="true" />
                        </>
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : null}
          <Suspense
            fallback={
              showPersistentHomeProjectsTopBar ? (
                <main className="relative z-0 flex-1 lg:z-40">
                  <div
                className={`flex w-full ${contentShellWrapperClass}`}
              >
                    <div
                      className="workspace-content-shell w-full transition-none 2xl:transition-[max-width] 2xl:duration-300 2xl:ease-[cubic-bezier(0.22,1,0.36,1)]"
                      style={{ maxWidth: "var(--shell-content-width)" }}
                    >
                      <div
                        className="box-border w-full bg-[#F1F4F9] pt-3 pb-0 md:pt-6 md:pb-0 transition-[height] duration-300 ease-out dark:bg-[#222224]"
                        style={{
                          height:
                            "calc(var(--workspace-vh, 100dvh) - var(--home-banner-offset, 0px) - var(--home-topbar-offset, 0px) - var(--workspace-content-bottom-subtract, var(--workspace-frame-gutter, 48px)))",
                        }}
                      >
                        <div className="h-full min-h-0 w-full">
                          <div
                            className={`grid h-full w-full min-h-0 gap-[24px] ${
                              isAllProjectsRoute ? "" : "xl:grid-cols-[minmax(0,1fr)_280px] xl:items-start"
                            }`}
                          >
                            <div className="relative z-40 flex h-full min-h-0 w-full flex-col px-0 pt-0 md:pl-1 md:pr-0">
                              <div className="flex h-full min-h-0 w-full flex-col">
                                <section className="mt-0 flex w-full min-h-0 flex-1 flex-col">
                                  <div
                                    className="box-border flex min-h-0 flex-1 flex-col rounded-xl border-[1.5px] border-gray-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-[0_1px_0_rgba(255,255,255,0.02),0_8px_18px_rgba(0,0,0,0.24)] sm:p-5"
                                    style={{
                                      height:
                                        "calc(100% - var(--workspace-projects-bottom-gap, 0px))",
                                    }}
                                  >
                                    <div className="flex items-center justify-between gap-4">
                                      <h2 className="text-base font-semibold text-[#1F2A37] dark:text-zinc-100 sm:text-lg">
                                        {isAllProjectsRoute ? "All projects" : "Recent projects"}
                                      </h2>
                                      {isAllProjectsRoute ? (
                                        <div className="flex items-center gap-2">
                                          <div className="h-10 w-[140px] rounded-full bg-slate-100 skeleton-shimmer dark:bg-zinc-800/70" />
                                          <div className="h-10 w-32 rounded-full bg-slate-100 skeleton-shimmer dark:bg-zinc-800/70" />
                                        </div>
                                      ) : null}
                                    </div>
                                    <div
                                      className="mt-6 flex-1 overflow-y-hidden overflow-x-hidden"
                                      style={{ paddingRight: 6, paddingLeft: 6, paddingBottom: 6 }}
                                    >
                                      {fallbackProjectCardCount > 0 ? (
                                        <div className="recent-projects-grid projects-grid mt-2 grid w-full max-w-[1880px] items-start gap-6 grid-cols-2">
                                          {Array.from({ length: fallbackProjectCardCount }).map((_, index) => (
                                            <div key={`home-refresh-skeleton-${index}`} className="flex w-full flex-col text-left">
                                              <div className="relative rounded-[10px] bg-[#F9FAFC] dark:bg-zinc-900/60">
                                                <div className="relative m-[3px] aspect-square w-[calc(100%-6px)] overflow-hidden rounded-[10px] border border-[rgba(0,0,0,0.06)] bg-[#EEF1F5] dark:border-zinc-800 dark:bg-zinc-800/70">
                                                  <div className="absolute inset-0 rounded-[10px] skeleton-shimmer opacity-90" />
                                                </div>
                                              </div>
                                              <div className="mt-2 space-y-0.5">
                                                <div className="h-4 w-[58%] rounded-full bg-slate-100 skeleton-shimmer dark:bg-zinc-800/70" />
                                                <div className="h-3 w-[42%] rounded-full bg-slate-100 skeleton-shimmer dark:bg-zinc-800/70" />
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      ) : null}
                                    </div>
                                    {!isAllProjectsRoute ? (
                                      <div className="mt-4 flex items-center">
                                        <Link
                                          href="/projects/all"
                                          className="inline-flex items-center rounded-full border-2 border-[#E6EBF2] px-4 py-2 text-xs font-semibold text-[#1F2A37] transition hover:border-[#D8DEE8] active:translate-y-[1px] active:scale-[0.98] active:bg-[#2563EB]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#51bdff]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F1F4F9] dark:border-zinc-700 dark:text-zinc-100 dark:hover:border-zinc-600 dark:active:bg-[#2563EB]/20 dark:focus-visible:ring-offset-[#222224]"
                                        >
                                          View all projects
                                        </Link>
                                      </div>
                                    ) : null}
                                  </div>
                                </section>
                              </div>
                            </div>
                            {!isAllProjectsRoute ? (
                              <aside
                                className="relative z-10 w-full min-h-0 overflow-visible"
                                style={{ marginTop: "var(--home-right-column-offset, 240px)" }}
                              >
                                <div className="flex min-h-0 flex-col gap-[24px] overflow-visible">
                                  <div className="rounded-xl border-[1.5px] border-gray-200 bg-white px-4 py-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-[0_1px_0_rgba(255,255,255,0.02),0_8px_18px_rgba(0,0,0,0.24)]">
                                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6B7280] dark:text-zinc-400">
                                      SIGN DOCUMENTS
                                    </p>
                                    <div className="mt-3 space-y-2">
                                      <div className="h-9 rounded-lg bg-slate-100 dark:bg-zinc-800/70" />
                                      <div className="h-9 rounded-lg bg-slate-100 dark:bg-zinc-800/70" />
                                      <div className="h-9 rounded-lg bg-slate-100 dark:bg-zinc-800/70" />
                                    </div>
                                  </div>
                                  <div className="rounded-xl border-[1.5px] border-gray-200 bg-white px-4 py-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-[0_1px_0_rgba(255,255,255,0.02),0_8px_18px_rgba(0,0,0,0.24)]">
                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6B7280] dark:text-zinc-400">
                                      Activity
                                    </p>
                                    <div className="mt-3 h-24 rounded-xl border border-dashed border-[#E6EBF2] bg-[#F7F9FC] dark:border-zinc-700 dark:bg-zinc-900/60" />
                                  </div>
                                </div>
                              </aside>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </main>
              ) : null
            }
          >
            <main className="relative z-0 flex-1 lg:z-40">
              <div
                className={`flex w-full ${
                  contentShellWrapperClass
                }`}
              >
                <div
                  className={`workspace-content-shell w-full transition-none 2xl:transition-[max-width] 2xl:duration-300 2xl:ease-[cubic-bezier(0.22,1,0.36,1)] ${
                    contentSwapOut ? "workspace-content-swap-out" : contentSwapIn ? "workspace-content-swap-in" : ""
                  }`}
                  style={{ maxWidth: "var(--shell-content-width)" }}
                >
                  {children}
                </div>
              </div>
            </main>
          </Suspense>
        </WorkspaceHomeQueryProvider>
      </div>
    </div>

      {!hideWorkspaceSidebar ? (
        <div
          className={`workspace-bottom-dock fixed inset-x-0 bottom-0 z-[75] hidden border-t border-slate-200 bg-white/95 px-2 pt-2 pb-[calc(10px+env(safe-area-inset-bottom))] backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/95 ${
            showHomeBillingModal ? "pointer-events-none blur-sm opacity-55" : ""
          }`}
        >
          <div className="mx-auto grid max-w-xl grid-cols-6 items-end gap-1">
            <button
              type="button"
              onClick={openCreateModal}
              className="flex min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 text-[11px] font-semibold text-[#4B5563] transition hover:bg-[rgba(0,0,0,0.04)]"
            >
              <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[#6C47FF] text-white">
                <Plus className="h-[14px] w-[14px]" aria-hidden />
              </span>
              <span className="truncate leading-[1.15]">Create</span>
            </button>
            {mobileBottomDockItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  prefetch
                  onClick={(event) => {
                    if (navigateWithContentSwap(item.href, true)) {
                      event.preventDefault();
                    }
                  }}
                  className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 text-[11px] font-semibold transition ${
                    item.active
                      ? "text-[#4C34C9]"
                      : "text-[#4B5563] hover:bg-[rgba(0,0,0,0.04)]"
                  }`}
                >
                  <Icon
                    className="h-[22px] w-[22px]"
                    aria-hidden
                    weight={item.label === "Signatures" ? "regular" : item.active ? "fill" : "regular"}
                  />
                  <span className="truncate leading-[1.15]">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}

      {createOpen
        ? createPortal(
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
              <div
                className="absolute inset-0 bg-black/40 dark:bg-black/55 dark:backdrop-blur-sm"
              />
              <div
                ref={createRef}
                className="page-fade-in relative z-10 w-full max-w-4xl text-slate-900 dark:text-zinc-100"
              >
                <form
                  className="flex max-h-[calc(100vh-3rem)] flex-col overflow-hidden rounded-2xl bg-white shadow-[0_22px_60px_rgba(15,23,42,0.22),0_0_0_1px_rgba(148,163,184,0.14)] dark:bg-zinc-900 dark:shadow-[0_22px_60px_rgba(0,0,0,0.5)]"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void handleCreateStart();
                  }}
                >
                  <div className="overflow-y-auto px-6 pt-6 pb-0 sm:px-10 sm:pt-7">
                    <h2 className="text-[23px] font-semibold tracking-tight text-slate-900 dark:text-zinc-100 sm:text-[26px]">
                      Start with your files
                    </h2>

                    <div className="mt-5">
                      <div
                        className={`flex min-h-[360px] flex-col overflow-hidden rounded-[10px] text-center transition sm:min-h-[400px] ${
                          showCreateFilesError
                            ? "border-[3px] border-rose-400 bg-rose-50/40 dark:bg-zinc-900/60"
                            : createDragActive
                              ? "border-[3px] border-[#51bdff] bg-sky-50/60 dark:bg-zinc-900/70"
                              : createPendingFiles.length === 0
                                ? "border-2 border-dashed border-[#D1D5DB] bg-[#F5F5F5] dark:border-zinc-700 dark:bg-zinc-800/80"
                                : "bg-transparent dark:bg-transparent"
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
                        {createPendingFiles.length === 0 ? (
                          <div className="flex min-h-[360px] flex-1 flex-col items-center justify-center px-8 py-10 sm:min-h-[400px]">
                            <div className="relative mb-1 h-14 w-16">
                              <FileUp
                                className={`absolute left-1/2 top-1/2 h-12 w-12 -translate-x-[58%] -translate-y-1/2 ${
                                  showCreateFilesError ? "text-rose-500" : "text-[#6C47FF]"
                                }`}
                                aria-hidden
                              />
                            </div>
                            <p
                              className={`mt-3 text-base font-semibold ${
                                showCreateFilesError ? "text-rose-600" : "text-slate-900"
                              }`}
                            >
                              {createDragActive ? (
                                "Release to add your files"
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    className="cursor-pointer text-[1.05em] font-bold text-slate-900 underline decoration-1 underline-offset-2 transition hover:text-slate-900 disabled:cursor-not-allowed"
                                    onClick={() => createFileInputRef.current?.click()}
                                    disabled={createBusy}
                                  >
                                    select files
                                  </button>{" "}
                                  or drop your files to get started
                                </>
                              )}
                            </p>
                          </div>
                        ) : (
                          <div className="flex h-[360px] flex-col gap-4 pt-0 pb-0 text-left sm:h-[400px]">
                            <div className="overflow-hidden rounded-[10px] border-2 border-dashed border-[#D1D5DB] bg-[#F5F5F5] px-8 py-3 shadow-none">
                              <p className="text-[15px] font-medium text-slate-700">
                                Drag and drop, or{" "}
                                <button
                                  type="button"
                                  className="cursor-pointer text-[1.05em] font-bold text-slate-900 underline decoration-1 underline-offset-2 transition hover:text-slate-900 disabled:cursor-not-allowed"
                                  onClick={() => createFileInputRef.current?.click()}
                                  disabled={createBusy}
                                >
                                  select files
                                </button>
                              </p>
                            </div>
                            <div className="min-h-0 flex-1 overflow-hidden rounded-[10px] border-[4px] border-solid border-[#D1D5DB] bg-white shadow-none">
                              <div className="upload-list-scroll h-full overflow-y-auto">
                                {createPendingFiles.map(({ id, file }) => (
                                  <div
                                    key={id}
                                    className="group flex items-center justify-between gap-3 border-b border-[#DDD4FC] bg-[#F6F2FF] px-4 py-3 text-sm text-slate-800 last:border-b-0"
                                  >
                                    <div className="flex min-w-0 items-center gap-3">
                                      <FileText className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
                                      <div className="min-w-0">
                                        <span className="block truncate font-semibold text-slate-900">{file.name}</span>
                                        <span className="block text-xs font-semibold text-slate-900">
                                          {getFileTypeLabel(file)} - {formatBytes(file.size)}
                                        </span>
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => setCreatePendingFiles((prev) => prev.filter((entry) => entry.id !== id))}
                                      className="rounded-full p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                                      aria-label={`Remove ${file.name}`}
                                      disabled={createBusy}
                                    >
                                      <Trash2 className="h-5 w-5" aria-hidden />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
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

                      {createError ? <p className="mt-3 text-sm text-rose-500">{createError}</p> : null}
                    </div>
                  </div>

                  <div className="shrink-0 bg-white">
                    <div className="flex min-h-[76px] items-center justify-end gap-3 px-6 py-0 text-sm sm:px-10">
                      <button
                        type="button"
                        onClick={closeCreateModal}
                        className="px-2 py-2 font-semibold text-slate-500 transition hover:text-slate-900"
                        disabled={createBusy}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="inline-flex items-center justify-center rounded-full bg-[#6C47FF] px-5 py-2 font-semibold text-white shadow-[0_14px_40px_rgba(15,23,42,0.25)] transition hover:-translate-y-0.5 hover:bg-[#5B38E6] hover:shadow-[0_18px_50px_rgba(15,23,42,0.32)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5CF6] focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:translate-y-0 disabled:bg-[#6C47FF] disabled:shadow-[0_14px_40px_rgba(15,23,42,0.25)] disabled:opacity-60 disabled:pointer-events-none"
                        disabled={createBusy || createMissingFiles}
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

      <LoadingOverlay
        open={shellLoadingOpen}
        keepMounted
        label={shellLoadingLabel}
        zIndexClassName="z-[1200]"
      />
      {sidebarTooltip && document.body.dataset.modalOpen !== "true"
        ? createPortal(
          <div
            className="workspace-tooltip fixed z-[200] -translate-y-1/2"
            style={{
              top: sidebarTooltip.top,
              left: sidebarTooltip.left,
            }}
          >
            {sidebarTooltip.label}
            <span aria-hidden className="workspace-tooltip-right-arrow" />
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
