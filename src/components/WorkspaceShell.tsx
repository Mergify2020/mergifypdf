"use client";

import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Bell,
  BookOpen,
  FileUp,
  FileText,
  FolderKanban,
  Folders, LogOut,
  PanelLeftClose,
  PanelRightClose,
  PenSquare,
  Star,
  Trash2,
  User,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  FileText as PhFileText,
  Folders as PhFolders, Signature as PhSignature,
  Trash as PhTrash,
} from "@phosphor-icons/react";
import { getBillingStatusPresentation } from "@/lib/billingPlans";
import { applyThemePreference } from "@/lib/theme";
import { useSession, signOut } from "next-auth/react";
import {
  PROJECT_NAME_STORAGE_KEY,
  deriveProjectNameFromFilename,
} from "@/lib/projectName";
import {
  beginExistingWorkspaceOpenHandoff,
  beginWorkspaceOpenHandoff,
  cancelWorkspaceOpenHandoff,
} from "@/lib/workspaceOpenHandoff";
import { buildStudioProjectHref } from "@/lib/studioRoute";
import AppHeaderBrand from "./AppHeaderBrand";
import SettingsMenu from "./SettingsMenu";
import HeroHeader from "./HeroHeader";
import PendingFilesReorderList from "@/components/PendingFilesReorderList";
import BillingStatusBanner from "@/components/BillingStatusBanner";
import { useAvatarPreference } from "@/lib/useAvatarPreference";
import { resetAuthScopedClientState } from "@/lib/authClientState";
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

const AccountSettingsPage = dynamic(
  () => import("@/app/(app)/account/page").then((module) => module.AccountSettingsPage),
  {
    ssr: false,
    loading: () => null,
  },
);

const WORKSPACE_META_KEY = "mpdf:files";
const WORKSPACE_HIGHLIGHTS_KEY = "mpdf:highlights";
const MAX_PENDING_FILES = 12;
const WORKSPACE_LAUNCH_MODAL_EXIT_MS = 180;
const WORKSPACE_LAUNCH_FILE_FLASH_MS = 130;
const SHOULD_RUN_HOME_BOOTSTRAP = process.env.NODE_ENV === "production";
const SHOULD_AUTO_FETCH_PREVIEWS = process.env.NODE_ENV === "production";
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
  cancelWorkspaceOpenHandoff();
}

async function uploadProjectPdfFromFile(file: File | null | undefined, projectId: string) {
  if (!file || !projectId) return false;
  const formData = new FormData();
  formData.append("file", file, file.name);
  const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/pdf`, {
    method: "POST",
    body: formData,
  });
  return res.ok;
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
  initialSidebarExpanded?: boolean;
  initialTheme?: "light" | "dark";
  initialProfile?: {
    id?: string | null;
    name?: string | null;
    email?: string | null;
  };
}

export default function WorkspaceShell({
  children,
  initialSidebarExpanded = true,
  initialTheme = "light",
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
  const [profileMenuPosition, setProfileMenuPosition] = useState<{ left: number; top: number } | null>(
    null,
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [createPendingFiles, setCreatePendingFiles] = useState<PendingWorkspaceFile[]>([]);
  const [createLimitFlashSignal, setCreateLimitFlashSignal] = useState(0);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createBusy, setCreateBusy] = useState(false);
  const [createLaunchExiting, setCreateLaunchExiting] = useState(false);
  const [createLaunchFileFlash, setCreateLaunchFileFlash] = useState(false);
  const [createShowValidation, setCreateShowValidation] = useState(false);
  const [contentSwapOut, setContentSwapOut] = useState(false);
  const [contentSwapIn, setContentSwapIn] = useState(false);
  const [homeProjectsQuery, setHomeProjectsQuery] = useState("");
  const [mobileSearchExpanded, setMobileSearchExpanded] = useState(false);
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
  const [accountPanelOpen, setAccountPanelOpen] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const createRef = useRef<HTMLDivElement>(null);
  const createFileInputRef = useRef<HTMLInputElement | null>(null);
  const createLaunchFlashTimerRef = useRef<number | null>(null);
  const homeProjectsSearchInputRef = useRef<HTMLInputElement | null>(null);
  const avatarKey = session?.user?.id ?? null;
  const { avatar } = useAvatarPreference(avatarKey);
  const lastSessionUserIdRef = useRef<string | null>(null);
  const [stableProfile, setStableProfile] = useState<{ name: string; email: string }>(() => {
    const initialNameRaw = typeof initialProfile?.name === "string" ? initialProfile.name.trim() : "";
    const initialName = isPlaceholderProfileName(initialNameRaw) ? "" : initialNameRaw;
    const initialEmail = typeof initialProfile?.email === "string" ? initialProfile.email.trim() : "";
    return initialName || initialEmail ? { name: initialName || initialEmail, email: initialEmail } : { name: "", email: "" };
  });
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    applyThemePreference(initialTheme);
  }, [initialTheme]);
  const [logoutConfirmArmed, setLogoutConfirmArmed] = useState(false);
  const logoutConfirmTimeoutRef = useRef<number | null>(null);
  const sidebarTooltipTimeoutRef = useRef<number | null>(null);
  const [sidebarTooltip, setSidebarTooltip] = useState<{
    label: string;
    top: number;
    left: number;
  } | null>(null);
  const [createDragActive, setCreateDragActive] = useState(false);
  const profileName = stableProfile.name || "";
  const profileEmail = stableProfile.email;
  const hasProfileInfo = Boolean(profileName || profileEmail);
  const showProfileSkeleton = sessionStatus === "loading";
  const fallbackAvatar = getAvatarFallback(avatarKey, profileName || profileEmail || null);
  const showAvatarImage = Boolean(avatar) && !avatarLoadFailed && !showProfileSkeleton;
  const homeProjectsQueryContext = useMemo(
    () => ({ query: homeProjectsQuery, setQuery: setHomeProjectsQuery }),
    [homeProjectsQuery],
  );

  const openAccountPanel = useCallback(() => {
    router.push("/account");
  }, [router]);

  const closeAccountPanel = useCallback(() => {
    setAccountPanelOpen(false);
  }, []);

  useEffect(() => {
    setAvatarLoadFailed(false);
  }, [avatar]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.sessionStorage?.getItem(PROFILE_DISPLAY_CACHE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { name?: unknown; email?: unknown };
      const cachedNameRaw = typeof parsed.name === "string" ? parsed.name.trim() : "";
      const cachedName = isPlaceholderProfileName(cachedNameRaw) ? "" : cachedNameRaw;
      const cachedEmail = typeof parsed.email === "string" ? parsed.email.trim() : "";
      if (!cachedName && !cachedEmail) return;
      setStableProfile((current) => {
        const next = { name: cachedName || cachedEmail || "", email: cachedEmail };
        return current.name === next.name && current.email === next.email ? current : next;
      });
    } catch {
      // ignore storage read failures
    }
  }, []);

  useEffect(() => {
    const nextUserId = session?.user?.id ?? null;
    const nextNameRaw = (session?.user?.name ?? "").trim();
    const nextName = isPlaceholderProfileName(nextNameRaw) ? "" : nextNameRaw;
    const nextEmail = (session?.user?.email ?? "").trim();
    const nextProfile = {
      name: nextName || nextEmail || "",
      email: nextEmail || "",
    };

    if (lastSessionUserIdRef.current !== nextUserId) {
      lastSessionUserIdRef.current = nextUserId;
      setStableProfile(nextUserId ? nextProfile : { name: "", email: "" });
      return;
    }

    if (!nextName && !nextEmail) return;
    if (sessionStatus === "loading" && stableProfile.name) return;
    setStableProfile((prev) => ({
      name: nextProfile.name || prev.name || "",
      email: nextProfile.email || prev.email || "",
    }));
  }, [session?.user?.id, session?.user?.email, session?.user?.name, sessionStatus, stableProfile.name]);

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
    if (typeof document === "undefined") return;
    document.documentElement.classList.add("workspace-shell-active");
    document.body.classList.add("workspace-shell-active");
    return () => {
      document.documentElement.classList.remove("workspace-shell-active");
      document.body.classList.remove("workspace-shell-active");
    };
  }, []);

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
      resetAuthScopedClientState(session?.user?.id ?? null, null);
      await signOut({ redirect: false, callbackUrl: "/login" });
      router.replace("/login");
      router.refresh();
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
      if (sidebarTooltipTimeoutRef.current !== null) {
        window.clearTimeout(sidebarTooltipTimeoutRef.current);
      }
      if (createLaunchFlashTimerRef.current !== null) window.clearTimeout(createLaunchFlashTimerRef.current);
    };
  }, []);

  const createId = () =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `file_${Math.random().toString(16).slice(2)}_${Date.now()}`;

  function addCreateFiles(files: FileList | File[]) {
    const list = Array.from(files);
    const filtered = list.filter(
      (file) => file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"),
    );
    if (filtered.length === 0) {
      setCreateError("Please upload at least one PDF document.");
      return;
    }

    setCreatePendingFiles((prev) => {
      const remainingSlots = Math.max(0, MAX_PENDING_FILES - prev.length);
      if (remainingSlots === 0) {
        setCreateLimitFlashSignal((value) => value + 1);
        return prev;
      }
      const filesToAdd = filtered.slice(0, remainingSlots);
      const next = [...prev, ...filesToAdd.map((file) => ({ id: createId(), file }))];
      if (filesToAdd.length < filtered.length) {
        setCreateLimitFlashSignal((value) => value + 1);
        if (createError) setCreateError(null);
      } else if (createError) {
        setCreateError(null);
      }
      return next;
    });
  }

  const createMissingFiles = createPendingFiles.length === 0;
  const showCreateFilesError = createShowValidation && createMissingFiles;

  const resetCreateLaunchTransition = () => {
    if (createLaunchFlashTimerRef.current !== null) {
      window.clearTimeout(createLaunchFlashTimerRef.current);
      createLaunchFlashTimerRef.current = null;
    }
    setCreateLaunchExiting(false);
    setCreateLaunchFileFlash(false);
  };

  function openCreateModal() {
    setCreateError(null);
    setCreateBusy(false);
    setCreatePendingFiles([]);
    resetCreateLaunchTransition();
    setCreateLimitFlashSignal(0);
    setCreateDragActive(false);
    setCreateShowValidation(false);
    setCreateOpen(true);
  }

  function closeCreateModal() {
    if (createBusy) return;
    resetCreateLaunchTransition();
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
    setCreateLaunchExiting(true);
    setCreateLaunchFileFlash(true);
    if (createLaunchFlashTimerRef.current !== null) window.clearTimeout(createLaunchFlashTimerRef.current);
    createLaunchFlashTimerRef.current = window.setTimeout(() => {
      setCreateLaunchFileFlash(false);
      createLaunchFlashTimerRef.current = null;
    }, WORKSPACE_LAUNCH_FILE_FLASH_MS);
    setCreateBusy(true);
    await resetWorkspaceStorage();
    beginWorkspaceOpenHandoff(createPendingFiles, startedAt);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: clean, data: { pages: [], sources: [], pagesCount: 0 } }),
      });
      if (!res.ok) {
        setCreateError("Could not create that project. Please try again.");
        setCreateBusy(false);
        resetCreateLaunchTransition();
        cancelWorkspaceOpenHandoff();
        return;
      }
      const json = (await res.json().catch(() => null)) as { project?: { id?: string } } | null;
      const id = json?.project?.id;
      if (!id) {
        setCreateError("Could not create that project. Please try again.");
        setCreateBusy(false);
        resetCreateLaunchTransition();
        cancelWorkspaceOpenHandoff();
        return;
      }
      void uploadProjectPreviewFromFile(createPendingFiles[0]?.file, id);
      if (createPendingFiles.length === 1) {
        void uploadProjectPdfFromFile(createPendingFiles[0]?.file, id).catch(() => {
          // fall back to studio-side sync if immediate cloud upload fails
        });
      }
      queuePreload(createPendingFiles, id);
      router.push(buildStudioProjectHref(id));
    } catch {
      setCreateError("Could not create that project. Please try again.");
      setCreateBusy(false);
      resetCreateLaunchTransition();
      cancelWorkspaceOpenHandoff();
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
  const workspaceBackgroundClass = pathname === "/projects/all"
    ? "bg-white"
    : useUnifiedWorkspaceBackground
      ? "bg-[var(--app-surface)]"
      : isStudioRoute
        ? "bg-[var(--app-surface)]"
      : isHomePanel
        ? "bg-[var(--app-surface)]"
        : isAccountRoute
          ? "bg-white md:bg-slate-100"
          : "bg-[#323232]";
  const isBillingBannerRoute = isHomePanel || isAccountRoute;
  const homeStripeStatus =
    homeStripeStatusOverride !== undefined ? homeStripeStatusOverride : (session?.user?.stripeStatus ?? null);
  const homeBillingPresentationState = getBillingStatusPresentation(homeStripeStatus);
  const homeBillingIsDelinquent =
    homeBillingPresentationState === "past_due" || homeBillingPresentationState === "unpaid";
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
  const homeBillingModalBody = "Please update your payment method to restore access.";
  const isHomeProjectsPath = (value?: string | null) =>
    value === "/" || (value?.startsWith("/projects") ?? false);
  const showPersistentWorkspaceTopBar =
    (pathname === "/" || pathname === "/projects/all") ? false : (pathname?.startsWith("/signature-center") ?? false);
  const isAllProjectsRoute = pathname === "/" || pathname === "/projects/all";
  const showDesktopAllProjectsTopBar = pathname === "/projects/all" && !phoneViewport;
  const useFlatAllProjectsShell = showDesktopAllProjectsTopBar;
  const fallbackProjectCardCount = fallbackProjectCountReady
    ? (isAllProjectsRoute ? Math.min(homeRecentProjects.length, 60) : Math.min(homeRecentProjects.length, 9))
    : isAllProjectsRoute
      ? 12
      : 6;

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
    if (!accountPanelOpen) return;
    if (isHomeProjectsPath(pathname) || isAccountRoute) return;
    setAccountPanelOpen(false);
  }, [accountPanelOpen, isAccountRoute, pathname]);


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
    if (!SHOULD_RUN_HOME_BOOTSTRAP) {
      setHomeStripeStatusOverride(undefined);
      setHomeBillingMetaReady(true);
      return;
    }
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
  }, [isBillingBannerRoute, session?.user?.email, session?.user?.stripeStatus]);

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
    if (!SHOULD_RUN_HOME_BOOTSTRAP) {
      setFallbackProjectCountReady(true);
      return;
    }

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
      if (SHOULD_AUTO_FETCH_PREVIEWS) {
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
      }
    };

    const cached = getProjectsSummaryCache(ownerKey);
    if (cached) {
      hydrate(cached);
      setFallbackProjectCountReady(true);
    } else {
      const load = async () => {
        const fresh = await refreshProjectsSummary(ownerKey);
        if (fresh && !cancelled) {
          hydrate(fresh);
          return;
        }
        if (!cancelled) setFallbackProjectCountReady(true);
      };

      void load();
    }

    const unsubscribe = subscribeProjectsSummary((update) => {
      if (update.ownerKey !== ownerKey || !update.projects || cancelled) return;
      hydrate(update.projects);
    });
    return () => {
      cancelled = true;
      unsubscribe();
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
      const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/thumbnail?format=json`, {
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error(`Preview refresh failed with status ${res.status}`);
      }
      const data = (await res.json().catch(() => null)) as { url?: string } | null;
      if (!data?.url) {
        throw new Error("Preview refresh did not return a URL");
      }
      lastFailedPreviewRef.current.delete(projectId);
      setHomeRecentProjects((prev) =>
        prev.map((entry) => (entry.id === projectId ? { ...entry, previewUrl: data.url } : entry))
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

    let raf = 0;

    const update = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const anchor = profileRef.current;
        if (!anchor) return;
        const rect = anchor.getBoundingClientRect();
        const left = Math.round(rect.right + 16);
        const top = Math.round(rect.top);
        setProfileMenuPosition({ left, top });
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

    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !createBusy) {
        setCreateOpen(false);
      }
    }

    document.addEventListener("keydown", handleKey);
    return () => {
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
  const panelLeftClass = useFlatAllProjectsShell
    ? "left-[calc(var(--shell-left)+var(--shell-sidebar-width))]"
    : "left-[calc(var(--shell-left)+var(--shell-sidebar-width)+24px)]";
  const shellSidebarContentOffsetClass = "md:pl-[calc(var(--shell-left)+var(--shell-sidebar-width)+24px)]";
  const flatShellSidebarContentOffsetClass = "md:pl-[calc(var(--shell-left)+var(--shell-sidebar-width))]";
  const shellSidebarPanelOffsetClass = sidebarCompact
    ? "md:pl-[calc(var(--shell-left)+var(--shell-sidebar-width)+24px+240px)]"
    : "md:pl-[calc(var(--shell-left)+var(--shell-sidebar-width)+24px+320px)]";
  const flatShellSidebarPanelOffsetClass = sidebarCompact
    ? "md:pl-[calc(var(--shell-left)+var(--shell-sidebar-width)+240px)]"
    : "md:pl-[calc(var(--shell-left)+var(--shell-sidebar-width)+320px)]";
  const baseContentOffsetClass = expanded
    ? useFlatAllProjectsShell
      ? flatShellSidebarContentOffsetClass
      : "md:pl-[calc(var(--shell-left)+256px+24px)]"
    : useFlatAllProjectsShell
      ? flatShellSidebarContentOffsetClass
      : "md:pl-[calc(var(--shell-left)+80px+24px)]";
  const expandedContentOffsetClass =
    panelExpanded && !shouldOverlay
      ? expanded
        ? useFlatAllProjectsShell
        ? flatShellSidebarPanelOffsetClass
        : "md:pl-[calc(var(--shell-left)+256px+24px+320px)]"
        : useFlatAllProjectsShell
          ? flatShellSidebarPanelOffsetClass
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
      : useFlatAllProjectsShell
        ? "justify-start px-0"
        : "justify-start px-3 sm:px-4 md:pl-0 md:pr-6";
  const clearSidebarTooltip = () => {
    if (sidebarTooltipTimeoutRef.current !== null) {
      window.clearTimeout(sidebarTooltipTimeoutRef.current);
      sidebarTooltipTimeoutRef.current = null;
    }
    setSidebarTooltip(null);
  };
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
    if (sidebarTooltipTimeoutRef.current !== null) {
      window.clearTimeout(sidebarTooltipTimeoutRef.current);
    }
    sidebarTooltipTimeoutRef.current = window.setTimeout(() => {
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
      sidebarTooltipTimeoutRef.current = null;
    }, 500);
  };

  useEffect(() => {
    const handleWindowBlur = () => {
      clearSidebarTooltip();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") {
        clearSidebarTooltip();
      }
    };
    const handleDocumentMouseOut = (event: MouseEvent) => {
      if (event.relatedTarget === null) {
        clearSidebarTooltip();
      }
    };

    window.addEventListener("blur", handleWindowBlur);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("mouseout", handleDocumentMouseOut);
    return () => {
      window.removeEventListener("blur", handleWindowBlur);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("mouseout", handleDocumentMouseOut);
    };
  }, []);

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
      openAccountPanel();
    };

    (window as any).addEventListener("open-account-panel", handler);
    return () => {
      (window as any).removeEventListener("open-account-panel", handler);
    };
  }, [openAccountPanel]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!accountPanelOpen) return;
    if (isHomeProjectsPath(pathname) || isAccountRoute) return;
    closeAccountPanel();
  }, [accountPanelOpen, closeAccountPanel, isAccountRoute, pathname]);

  const dismissHomeBillingBanner = () => {
    setHomeBillingBannerDismissed(true);
  };

  const openAccountSettingsPanel = () => {
    setProfileOpen(false);
    setMobileOpen(false);
    openAccountPanel();
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
       
      console.error("Unexpected error loading billing portal");
    } finally {
      setProfileOpen(false);
      if (collapseSidebarAfter) {
        setExpanded(false);
      }
    }
  };

  const bottomSidebarItems: SidebarItem[] = [
    { label: "Trash", icon: PhTrash, href: "/projects/trash" },
  ];

  const renderItems = (
    items: SidebarItem[],
    {
      labelClassName,
      forceExpanded,
      hideCollapsedLabel,
      variant = "primary",
    }: { labelClassName?: string; forceExpanded?: boolean; hideCollapsedLabel?: boolean; variant?: "primary" | "utility" } = {},
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
      const isUtilityVariant = variant === "utility";
      const itemStateClasses = homeSidebarLocked
        ? isActive
          ? "text-[#5B38E6] dark:text-zinc-100"
          : "cursor-pointer text-[#4B5563] hover:text-[#111827] dark:text-zinc-400 dark:hover:text-zinc-100"
        : isActive
          ? "text-[#4C34C9] dark:text-zinc-100"
          : "cursor-pointer text-[#4B5563] hover:text-[#111827] dark:text-zinc-400 dark:hover:text-zinc-100";
      const itemClasses = `group relative flex w-full items-center overflow-visible rounded-xl text-left text-[15px] font-medium transition-[background-color,color,transform] duration-[160ms] ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/25 ${
        disabled ? "cursor-not-allowed text-[#374151] dark:text-zinc-400" : itemStateClasses
      } ${isLogout && logoutConfirmArmed ? "bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-300" : ""}`;
      const rowHeight = isUtilityVariant ? "h-9" : "h-10";
      const iconLaneClasses = "relative z-10 flex h-full w-10 flex-none items-center justify-center";
      const surfaceActiveClasses = homeSidebarLocked
        ? "bg-sky-50 shadow-[0_1px_1px_rgba(15,23,42,0.05)] text-[#5B38E6] dark:bg-white/8 dark:text-zinc-100"
        : "bg-sky-50 shadow-[0_1px_1px_rgba(15,23,42,0.05)] text-[#4C34C9] dark:bg-white/8 dark:text-zinc-100";
      const iconSizeClasses = isUtilityVariant ? "h-5.5 w-5.5" : "h-5.5 w-5.5";
      const labelTextClasses = isUtilityVariant ? "text-[15px] font-medium tracking-tight" : "text-[15px] font-medium tracking-tight";
      const targetHref = label === "Projects" ? "/projects/all" : href;
      const content = (
        <span className={`relative flex w-full items-center px-[8px] ${rowHeight}`}>
          {isActive ? (
            isExpanded ? (
              <span
                className={`pointer-events-none absolute inset-y-0 left-[8px] right-[8px] rounded-xl transition-[opacity,transform,background-color,box-shadow] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${surfaceActiveClasses}`}
                aria-hidden
              />
            ) : (
              <span
                className={`pointer-events-none absolute left-[8px] top-1/2 h-10 w-10 -translate-y-1/2 rounded-xl transition-[opacity,transform,background-color,box-shadow] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${surfaceActiveClasses}`}
                aria-hidden
              />
            )
          ) : (
            <span
              className={`pointer-events-none absolute ${isExpanded ? "inset-y-0 left-[8px] right-[8px]" : "left-[8px] top-1/2 h-10 w-10 -translate-y-1/2"} rounded-xl bg-transparent transition-[background-color,box-shadow,opacity,transform] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] group-hover:bg-slate-50 dark:group-hover:bg-white/[0.05]`}
              aria-hidden
            />
          )}
          <span className={iconLaneClasses}>
            <Icon
              className={`${iconSizeClasses} shrink-0 ${
                isActive ? "text-[#6C47FF] dark:text-zinc-100" : "text-[#6B7280] dark:text-zinc-400"
              } ${
                !isActive && !disabled
                  ? isLogout
                    ? "group-hover:text-red-600 dark:group-hover:text-red-600"
                    : "group-hover:text-[#0F172A] dark:group-hover:text-zinc-100"
                  : ""
              } transition-colors duration-[120ms] ease-out`}
              aria-hidden
              weight={isActive && label !== "Signatures" ? "fill" : "regular"}
            />
          </span>
          <span
            className={`relative z-10 min-w-0 flex-1 whitespace-nowrap overflow-hidden text-ellipsis pl-2 transition-[opacity,transform,max-width] duration-300 ease-out ${
              isExpanded ? "max-w-full translate-x-0 opacity-100" : "max-w-0 -translate-x-2 opacity-0 pointer-events-none"
            } ${isExpanded ? labelClassName ?? "" : ""} ${isLogout ? "group-hover:text-red-600 dark:group-hover:text-red-600" : ""} ${labelTextClasses}`}
            aria-hidden={!isExpanded && hideCollapsedLabel}
          >
            {label}
          </span>
        </span>
      );

      const handleTooltipEnter = (event: React.MouseEvent<HTMLElement> | React.FocusEvent<HTMLElement>) => {
        if (isExpanded) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (sidebarTooltipTimeoutRef.current !== null) {
          window.clearTimeout(sidebarTooltipTimeoutRef.current);
        }
        sidebarTooltipTimeoutRef.current = window.setTimeout(() => {
          setSidebarTooltip({
            label: getSidebarTooltipLabel(logoutArmedA11yLabel),
            top: rect.top + rect.height / 2,
            left: rect.right + 12,
          });
          sidebarTooltipTimeoutRef.current = null;
        }, 500);
      };

      const handleTooltipLeave = () => {
        if (isExpanded) return;
        if (sidebarTooltipTimeoutRef.current !== null) {
          window.clearTimeout(sidebarTooltipTimeoutRef.current);
          sidebarTooltipTimeoutRef.current = null;
        }
        clearSidebarTooltip();
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
        className={`fixed inset-0 z-0 ${workspaceBackgroundClass} dark:bg-[#252525] ${useFlatAllProjectsShell ? "projects-all-workspace" : ""}`}
      />
    ) : null}
    <div
      className={`workspace-shell-root ${useFlatAllProjectsShell ? "projects-all-workspace" : ""} relative z-10 flex h-[calc(var(--workspace-vh,100dvh)-var(--home-banner-offset,0px))] overflow-hidden pt-0 ${homeBillingBannerExiting ? "transition-[padding-top,min-height] duration-300 ease-out" : "transition-none"} md:pt-[var(--home-banner-offset)] ${workspaceBackgroundClass} ${sidebarCompact ? "sidebar-collapsed" : ""} ${expanded ? "" : "sidebar-minimized"} dark:bg-[#252525] `}
      style={
        {
          height: "calc(var(--workspace-vh, 100dvh) - var(--home-banner-offset, 0px))",
          minHeight: "calc(var(--workspace-vh, 100dvh) - var(--home-banner-offset, 0px))",
          "--shell-content-width":
            isAccountRoute ? "2064px" : useFlatAllProjectsShell ? "100%" : "calc(1960px - (var(--shell-sidebar-width) - 80px))",
          "--shell-left": useFlatAllProjectsShell ? "0px" : "max(24px, calc((100vw - (var(--shell-content-width) + var(--shell-sidebar-width) + 24px)) / 2))",
          "--shell-sidebar-width": expanded ? "228px" : "56px",
          "--home-banner-offset": homeBillingBannerOccupiesSpace ? "56px" : "0px",
          "--home-topbar-offset": showPersistentWorkspaceTopBar ? "68px" : "0px",
          "--home-right-column-offset": showPersistentWorkspaceTopBar ? "0px" : "240px",
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
            <div className="pointer-events-auto w-full max-w-[600px] overflow-hidden rounded-2xl border border-[#D9DDF0] bg-white text-[#1F2A37] shadow-[0_20px_50px_rgba(15,23,42,0.28)] dark:border-[#3A3A3A] dark:bg-[#323232] dark:text-zinc-100">
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
        className={`workspace-desktop-sidebar absolute left-[var(--shell-left)] top-[var(--home-banner-offset)] z-50 hidden w-[var(--shell-sidebar-width)] text-slate-800 ${homeBillingBannerExiting ? "transition-[top,height] duration-300 ease-out" : "transition-[width,transform,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"} dark:text-zinc-100 md:flex`}
        style={{
          height: useFlatAllProjectsShell
            ? "calc(var(--workspace-vh, 100dvh) - var(--home-banner-offset, 0px))"
            : "calc(var(--workspace-vh, 100dvh) - var(--workspace-frame-gutter, 48px) - var(--home-banner-offset, 0px))",
        }}
      >
        <div className="relative flex h-full w-full">
          <div
            ref={sidebarRef}
            className={`flex h-full ${railWidthClass} flex-col overflow-hidden transform-gpu transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${expanded ? "translate-x-0 opacity-100" : "translate-x-0 opacity-100"} ${
              useFlatAllProjectsShell
                ? "border-r border-slate-200 bg-white shadow-none dark:border-[#3A3A3A] dark:bg-[#323232] dark:shadow-none"
                : useUnifiedWorkspaceBackground
                  ? "rounded-xl border-[1.5px] border-gray-200 bg-white shadow-sm dark:border-[#3A3A3A] dark:bg-[#323232] dark:shadow-[0_1px_0_rgba(255,255,255,0.02),0_8px_18px_rgba(0,0,0,0.24)]"
                  : "rounded-xl border-[1.5px] border-gray-200 bg-white shadow-sm dark:border-[#3A3A3A] dark:bg-[#323232] dark:shadow-[0_1px_0_rgba(255,255,255,0.02),0_8px_18px_rgba(0,0,0,0.24)]"
            } w-full ${sidebarCompact ? "z-10" : "z-20"}`}
          >
            <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto overflow-x-hidden px-0 py-2.5">
              <div
                className={`flex h-10 w-full items-center border-b border-slate-200 px-1 pb-3 dark:border-[#3A3A3A] ${
                  expanded ? "justify-between" : "justify-center"
                } ${useFlatAllProjectsShell ? "pb-3" : ""}`}
              >
                {expanded ? (
                  <>
                    <AppHeaderBrand
                      logoLightSrc={
                        isHomePanel || isSignaturesPanel
                          ? "/logos/home-expanded-sidebar-logo-light-v6.svg"
                          : undefined
                      }
                      logoDarkSrc={
                        isHomePanel || isSignaturesPanel
                          ? "/logos/home-expanded-sidebar-logo-dark-v6.svg"
                          : undefined
                      }
                    />
                    <button
                      type="button"
                      onClick={() => {
                        clearSidebarTooltip();
                        setExpanded((prev) => !prev);
                      }}
                      onMouseDown={() => {
                        clearSidebarTooltip();
                      }}
                      className="relative z-10 inline-flex items-center justify-center p-1 text-[#374151] transition hover:text-[#111827] dark:text-zinc-300 dark:hover:text-white"
                      aria-label="Collapse sidebar"
                      onMouseEnter={(event) => {
                        setSidebarTooltipFromEvent(event, "Hide navigation", 3, true);
                      }}
                      onMouseLeave={() => {
                        clearSidebarTooltip();
                      }}
                      onFocus={(event) => {
                        setSidebarTooltipFromEvent(event, "Hide navigation", 3, true);
                      }}
                      onBlur={() => {
                        clearSidebarTooltip();
                      }}
                    >
                      <PanelLeftClose className="h-6 w-6" />
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      clearSidebarTooltip();
                      setExpanded(true);
                    }}
                    onMouseDown={() => {
                      clearSidebarTooltip();
                    }}
                    className="group relative flex h-11 w-full items-center justify-center rounded-lg bg-transparent p-0 transition"
                    aria-label="Expand sidebar"
                  >
                    <Image
                      src="/logos/home-collapsed-sidebar-logo-light-dark.svg"
                      alt="MergifyPDF"
                      width={56}
                      height={56}
                      priority
                      className="h-14 w-14 max-w-none transition-opacity duration-200 group-hover:opacity-0 group-focus-visible:opacity-0"
                    />
                    <span className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
                      <PanelRightClose className="h-6 w-6 text-slate-800 dark:text-zinc-100" aria-hidden />
                    </span>
                  </button>
                )}
                </div>
              <div className="flex flex-1 flex-col">
                <nav className={`mt-1.5 flex flex-col items-stretch ${navExpanded ? "gap-1" : "gap-1.5"}`}>
                  {renderItems(navigationItems, {
                    labelClassName: itemLabelClasses,
                    forceExpanded: navExpanded,
                    hideCollapsedLabel: true,
                    variant: "primary",
                  })}
                </nav>

              {bottomSidebarItems.length > 0 ? (
                  <div className="mt-auto flex flex-col items-center gap-1.5 pt-3">
                    {renderItems(bottomSidebarItems, {
                      labelClassName: itemLabelClasses,
                      forceExpanded: navExpanded,
                      hideCollapsedLabel: true,
                      variant: "utility",
                    })}
                  </div>
              ) : null}
              <div className="mt-2.5 flex flex-col gap-1.5">
                <button
                  type="button"
                  aria-label="Notifications"
                  className={`group relative flex w-full items-center overflow-visible rounded-xl text-left text-[15px] font-medium transition-[background-color,color,transform] duration-[160ms] ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/25 ${navExpanded ? "cursor-pointer text-[#4B5563] hover:text-[#111827] dark:text-zinc-400 dark:hover:text-zinc-100" : "cursor-pointer text-[#4B5563] hover:text-[#111827] dark:text-zinc-400 dark:hover:text-zinc-100"}`}
                >
                  <span className={`relative flex w-full items-center px-[8px] h-9`}>
                    <span
                      className={`pointer-events-none absolute ${navExpanded ? "inset-y-0 left-[8px] right-[8px]" : "left-[8px] top-1/2 h-10 w-10 -translate-y-1/2"} rounded-xl bg-transparent transition-[background-color,box-shadow,opacity,transform] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] group-hover:bg-slate-50 dark:group-hover:bg-white/[0.05]`}
                      aria-hidden
                    />
                    <span className="relative z-10 flex h-full w-10 flex-none items-center justify-center">
                      <Bell
                        className={`h-5.5 w-5.5 shrink-0 text-[#6B7280] transition-colors duration-[120ms] ease-out ${navExpanded ? "group-hover:text-[#0F172A] dark:group-hover:text-zinc-100" : ""}`}
                        aria-hidden
                      />
                    </span>
                    <span className={`relative z-10 min-w-0 flex-1 whitespace-nowrap overflow-hidden text-ellipsis pl-2 transition-[opacity,transform,max-width] duration-300 ease-out ${navExpanded ? "max-w-full translate-x-0 opacity-100" : "max-w-0 -translate-x-2 opacity-0 pointer-events-none"} text-[15px] font-medium tracking-tight`}>
                      Notifications
                    </span>
                  </span>
                </button>
                <div ref={profileRef} className="mt-1.5 border-t border-slate-200 pt-2.5 dark:border-[#3A3A3A] w-full">
                  <SettingsMenu
                    trigger="custom"
                    triggerLabel="Open profile menu"
                    triggerClassName={navExpanded ? "group relative flex w-full items-center overflow-visible rounded-xl text-left text-[15px] font-medium transition-[background-color,color,transform] duration-[160ms] ease-out cursor-pointer text-[#4B5563] hover:text-[#111827] dark:text-zinc-400 dark:hover:text-zinc-100" : "group relative flex w-full items-center overflow-visible rounded-xl text-left text-[15px] font-medium transition-[background-color,color,transform] duration-[160ms] ease-out cursor-pointer text-[#4B5563] hover:text-[#111827] dark:text-zinc-400 dark:hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/25"}
                    triggerContent={
                      navExpanded ? (
                        <span className="relative flex w-full items-center px-[8px] h-9">
                          <span
                            className="pointer-events-none absolute inset-y-0 left-[8px] right-[8px] rounded-xl bg-transparent transition-[background-color,box-shadow,opacity,transform] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] group-hover:bg-slate-50 dark:group-hover:bg-white/[0.05]"
                            aria-hidden
                          />
                          <span className="relative z-10 flex h-full w-10 flex-none items-center justify-center">
                            <span className="pointer-events-none flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full">
                              {showAvatarImage ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={avatar!}
                                  alt="Your avatar"
                                  className="h-full w-full rounded-full object-cover"
                                  onError={() => setAvatarLoadFailed(true)}
                                />
                              ) : showProfileSkeleton ? (
                                <span className="flex h-full w-full items-center justify-center rounded-full bg-slate-200 skeleton-shimmer dark:bg-[#3A3A3A]" />
                              ) : (
                                <span
                                  className="flex h-full w-full items-center justify-center rounded-full text-xs font-semibold uppercase text-white"
                                  style={{ backgroundColor: fallbackAvatar.color }}
                                >
                                  {hasProfileInfo ? fallbackAvatar.initials : ""}
                                </span>
                              )}
                            </span>
                          </span>
                          {showProfileSkeleton ? (
                            <span className="relative z-10 min-w-0 flex-1 space-y-1.5 pl-2 text-left">
                              <span className="block h-3.5 w-28 rounded-full bg-slate-200 skeleton-shimmer dark:bg-[#3A3A3A]" />
                              <span className="block h-3 w-36 rounded-full bg-slate-200 skeleton-shimmer dark:bg-[#3A3A3A]" />
                            </span>
                          ) : hasProfileInfo ? (
                            <span className="relative z-10 min-w-0 flex-1 pl-2 text-left">
                              {profileName ? (
                                <span className="block truncate text-[15px] font-medium leading-5 tracking-tight text-slate-900 dark:text-zinc-100">
                                  {profileName}
                                </span>
                              ) : null}
                            </span>
                          ) : (
                            <span className="relative z-10 min-w-0 flex-1 pl-2 text-left">
                              <span className="block truncate text-[15px] font-medium leading-5 tracking-tight text-slate-900 dark:text-zinc-100">
                                Profile
                              </span>
                            </span>
                          )}
                          <ChevronRight className="relative z-10 h-4 w-4 shrink-0 rotate-90 text-slate-400" aria-hidden />
                        </span>
                      ) : (
                        <span className="relative flex w-full items-center px-[8px] h-9">
                          <span
                            className="pointer-events-none absolute left-[8px] top-1/2 h-10 w-10 -translate-y-1/2 rounded-xl bg-transparent transition-[background-color,box-shadow,opacity,transform] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] group-hover:bg-slate-50 dark:group-hover:bg-white/[0.05]"
                            aria-hidden
                          />
                          <span className="relative z-10 flex h-full w-10 flex-none items-center justify-center">
                            <span className="pointer-events-none flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full">
                              {showAvatarImage ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={avatar!}
                                  alt="Your avatar"
                                  className="h-full w-full rounded-full object-cover"
                                  onError={() => setAvatarLoadFailed(true)}
                                />
                              ) : showProfileSkeleton ? (
                                <span className="flex h-full w-full items-center justify-center rounded-full bg-slate-200 skeleton-shimmer dark:bg-[#3A3A3A]" />
                              ) : (
                                <span
                                  className="flex h-full w-full items-center justify-center rounded-full text-xs font-semibold uppercase text-white"
                                  style={{ backgroundColor: fallbackAvatar.color }}
                                >
                                  {hasProfileInfo ? fallbackAvatar.initials : ""}
                                </span>
                              )}
                            </span>
                          </span>
                        </span>
                      )
                    }
                  />
                </div>
              </div>
            </div>
            {profileOpen && profileMenuPosition && (
              <div
                ref={profileMenuRef}
                className="avatar-dropdown-menu fixed z-[60] w-80 max-h-[calc(100vh-24px)] overflow-auto rounded-3xl border border-slate-100 bg-white p-4 text-sm text-slate-800 shadow-[0_30px_80px_rgba(15,23,42,0.35)] dark:border-[#3A3A3A] dark:bg-[#323232] dark:text-zinc-100 dark:shadow-[0_30px_80px_rgba(0,0,0,0.55)]"
                style={{ left: profileMenuPosition.left, top: profileMenuPosition.top }}
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
                    ) : showProfileSkeleton ? (
                      <span className="h-10 w-10 rounded-full bg-slate-200 skeleton-shimmer dark:bg-[#3A3A3A]" />
                    ) : (
                      <span
                        className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold uppercase text-white"
                        style={{ backgroundColor: fallbackAvatar.color }}
                      >
                        {hasProfileInfo ? fallbackAvatar.initials : ""}
                      </span>
                    )}
                  </span>
                  {showProfileSkeleton ? (
                    <div className="flex-1 space-y-2">
                      <div className="h-5 w-36 rounded-full bg-slate-200 skeleton-shimmer dark:bg-[#3A3A3A]" />
                      <div className="h-4 w-48 rounded-full bg-slate-200 skeleton-shimmer dark:bg-[#3A3A3A]" />
                    </div>
                  ) : hasProfileInfo ? (
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
                          openAccountSettingsPanel();
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
                          openAccountSettingsPanel();
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
              </div>
            )}
          </div>
          {panelExpanded ? (
            <div
              ref={panelRef}
              data-workspace-secondary-panel="true"
              className={`absolute ${panelLeftClass} top-0 hidden h-full border-l border-slate-200 ${
                shouldOverlay ? "bg-white" : "bg-slate-100"
              } px-4 py-6 text-slate-800 shadow-[12px_0_36px_rgba(15,23,42,0.10)] transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform md:flex ${sidebarCompact ? "w-[240px]" : "w-[320px]"} z-0 dark:border-[#3A3A3A] dark:bg-[#323232] dark:text-zinc-100 dark:shadow-[12px_0_36px_rgba(0,0,0,0.45)] ${
                panelExpanded
                  ? "translate-x-0 opacity-100 pointer-events-auto"
                  : "-translate-x-10 opacity-0 pointer-events-none"
              }`}
            >
              <div className="flex w-full flex-col gap-6">
                <AppHeaderBrand
                  variant="sidebarPanel"
                  logoLightSrc={
                    isHomePanel || isSignaturesPanel
                      ? "/logos/home-expanded-sidebar-logo-light-v6.svg"
                      : undefined
                  }
                  logoDarkSrc={
                    isHomePanel || isSignaturesPanel
                      ? "/logos/home-expanded-sidebar-logo-dark-v6.svg"
                      : undefined
                  }
                />
                {isAccountRoute ? (
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={() => {
                        openAccountSettingsPanel();
                      }}
                      className="flex w-full items-center gap-3 rounded-2xl bg-slate-100 px-4 py-3.5 text-left text-2xl font-semibold text-slate-800 dark:bg-[#2B2B2B] dark:text-zinc-100"
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
                                      beginExistingWorkspaceOpenHandoff(item.key);
	                                  router.push(buildStudioProjectHref(item.key));
	                                  if (shouldOverlay) {
	                                    setExpanded(false);
	                                  }
	                                }}
	                                className="flex w-full min-w-0 items-center gap-3 rounded-2xl px-1 py-0.5 text-left transition hover:bg-white/60 dark:hover:bg-[#2B2B2B]/60"
	                              >
	                                <span className="relative inline-flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white text-slate-500 shadow-sm dark:shadow-none ring-1 ring-slate-200 dark:bg-[#2B2B2B] dark:text-zinc-300 dark:ring-zinc-700">
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
	                                    <span className="relative inline-flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white text-slate-500 shadow-sm dark:shadow-none ring-1 ring-slate-200 dark:bg-[#2B2B2B] dark:text-zinc-300 dark:ring-zinc-700">
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
      </div>
      </aside>
      </>
      ) : null}

      {/* Mobile drawer */}
      {!hideWorkspaceSidebar && mobileOpen ? (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 dark:bg-zinc-950/60 md:hidden" onClick={() => setMobileOpen(false)} />
          <aside className="page-fade-in fixed inset-y-0 left-0 z-50 w-72 overflow-y-auto border-r border-slate-200 bg-white p-6 shadow-2xl dark:shadow-[0_22px_60px_rgba(0,0,0,0.45)] transition-transform duration-300 dark:border-[#3A3A3A] dark:bg-[#323232] dark:text-zinc-100 md:hidden">
            <div className="mb-6 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1e293b] p-2 text-white shadow-[0_8px_24px_rgba(10,37,64,0.35)] transition hover:bg-[#253248] dark:bg-[#2B2B2B] dark:text-zinc-100 dark:hover:bg-zinc-700"
                aria-label="Close menu"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <nav className="flex flex-col gap-1">
                {renderMobileNavItems(navigationItems)}
              </nav>

              {bottomSidebarItems.length > 0 && (
                <div className="border-t border-slate-200 pt-4">
                  <div className="flex flex-col gap-1">
                    {renderMobileNavItems(bottomSidebarItems)}
                  </div>
                </div>
              )}

            </div>
          </aside>
        </>
      ) : null}

      <div
        className={`workspace-main-with-dock flex min-h-0 w-full flex-1 flex-col bg-transparent transition-[padding-left] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${contentOffsetClass}`} 
      >
        <WorkspaceHomeQueryProvider value={homeProjectsQueryContext}>
          {showPersistentWorkspaceTopBar ? (
            <div
              className={`relative z-40 flex w-full ${showDesktopAllProjectsTopBar ? "px-0 pt-0" : `${contentShellWrapperClass} pt-3 md:pt-6`}`}
            >
              <div
                style={{ maxWidth: showDesktopAllProjectsTopBar ? "none" : "var(--shell-content-width)", width: "100%" }}
                className="w-full transition-none 2xl:transition-[max-width] 2xl:duration-300 2xl:ease-[cubic-bezier(0.22,1,0.36,1)]"
              >
                <div
                  className={`flex w-full items-center gap-3 ${showDesktopAllProjectsTopBar ? "md:pl-[calc(var(--shell-sidebar-width)+24px)] justify-end border-b border-slate-200 pb-3 dark:border-[#3A3A3A]" : ""}`}
                >
                    <div className={showDesktopAllProjectsTopBar ? "hidden" : "flex min-w-0 flex-1 items-center gap-3"}>
                    <div
                      className={`flex transition-[max-width,width] duration-200 ease-out ${
                        mobileSearchExpanded
                          ? "min-w-0 flex-1 w-full max-w-none transition-[max-width,width] duration-200 ease-out"
                          : "w-full max-w-[440px] transition-none md:max-w-xl md:transition-[max-width,width] md:duration-200 md:ease-out"
                      }`}
                    >
                      <div
                        className="flex h-11 w-full cursor-text rounded-full border-[1.5px] border-gray-200 bg-white shadow-sm transition focus-within:border-[3.5px] focus-within:border-[#4F46E5] dark:border-[#3A3A3A] dark:bg-[#323232] dark:shadow-[0_1px_0_rgba(255,255,255,0.02),0_8px_18px_rgba(0,0,0,0.24)] dark:focus-within:border-[#4F46E5]"
                        onMouseDown={(event) => {
                          const target = event.target;
                          if (target instanceof HTMLInputElement) return;
                          event.preventDefault();
                          homeProjectsSearchInputRef.current?.focus();
                        }}
                        onClick={() => {
                          homeProjectsSearchInputRef.current?.focus();
                        }}
                      >
                        <div className="flex h-full w-full items-center gap-2 rounded-full bg-white px-4 text-[#1F2A37] dark:bg-[#323232] dark:text-zinc-100">
                          <svg
                            aria-hidden="true"
                            viewBox="0 0 24 24"
                            className="h-5 w-5 text-[#6B7280] dark:text-zinc-400"
                            fill="none"
                            stroke="currentColor"
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
                            className="h-full min-w-0 flex-1 border-none bg-white text-base text-[#1F2A37] placeholder:text-[#6B7280] outline-none focus:outline-none focus:ring-0 dark:bg-[#323232] dark:text-zinc-100 dark:placeholder:text-zinc-400"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div
                    className={`flex h-10 flex-nowrap items-center gap-2 shrink-0 whitespace-nowrap ${
                      showDesktopAllProjectsTopBar
                        ? "w-auto min-w-0 max-w-none pr-2 opacity-100 md:pr-3 translate-y-[6px]"
                        : mobileSearchExpanded
                          ? "pointer-events-none w-0 min-w-0 max-w-0 overflow-hidden opacity-0 transition-[width,max-width,opacity] duration-200 ease-out"
                          : "w-[44px] min-w-[44px] max-w-[44px] opacity-100 transition-none md:w-[276px] md:min-w-[276px] md:max-w-[276px] md:transition-[width,max-width,opacity] md:duration-200 md:ease-out"
                    }`}
                  >
                    {showDesktopAllProjectsTopBar ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (typeof window !== "undefined") {
                            window.dispatchEvent(new Event("open-create-project"));
                          }
                        }}
                        className="hidden md:inline-flex shrink-0 whitespace-nowrap h-10 items-center gap-2 rounded-md bg-[#6C47FF] px-4 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(108,71,255,0.28)] transition-[transform,background-color,box-shadow] duration-200 hover:-translate-y-[1px] hover:bg-[#5B38E6] hover:shadow-[0_12px_28px_rgba(108,71,255,0.36)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/15 dark:bg-[#6C47FF] dark:text-zinc-100 dark:shadow-[0_10px_24px_rgba(108,71,255,0.32)] dark:hover:bg-[#5B38E6] dark:hover:shadow-[0_12px_28px_rgba(108,71,255,0.42)]"
                      >
                        <FileUp className="h-5 w-5" aria-hidden />
                        <span>Upload PDF</span>
                      </button>
                    ) : null}
                    <button
                      type="button"
                      aria-label="Notifications"
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-transparent p-0 text-slate-700 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/15 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F1F4F9] dark:text-zinc-100 dark:hover:bg-[#2B2B2B] dark:focus-visible:ring-[#2563EB]/30 dark:focus-visible:ring-offset-[#252525]"
                    >
                      <Bell className="h-6 w-6" aria-hidden />
                    </button>
                    <SettingsMenu
                      trigger="custom"
                      triggerLabel="Open profile menu"
                      triggerClassName={navExpanded ? "group flex min-h-[56px] w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-slate-700 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/15 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F1F4F9] dark:text-zinc-100 dark:hover:bg-[#2B2B2B] dark:focus-visible:ring-[#2563EB]/30 dark:focus-visible:ring-offset-[#252525]" : "group flex h-10 w-full items-center justify-center rounded-lg px-2 text-slate-700 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/15 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F1F4F9] dark:text-zinc-100 dark:hover:bg-[#2B2B2B] dark:focus-visible:ring-[#2563EB]/30 dark:focus-visible:ring-offset-[#252525]"}
                      triggerContent={
                        navExpanded ? (
                          <>
                            <span className="flex min-w-0 flex-1 items-center gap-3">
                              <span className="relative flex h-10 w-10 shrink-0 items-center justify-center">
                                {profileOpen ? (
                                  <span
                                    className="pointer-events-none absolute inset-[1px] rounded-full border-2 border-[#6C47FF] bg-transparent"
                                    aria-hidden
                                  />
                                ) : null}
                                <span className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full">
                                  {showAvatarImage ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={avatar!}
                                      alt="Your avatar"
                                      className="h-full w-full rounded-full object-cover"
                                      onError={() => setAvatarLoadFailed(true)}
                                    />
                                  ) : showProfileSkeleton ? (
                                    <span className="flex h-full w-full items-center justify-center rounded-full bg-slate-200 skeleton-shimmer dark:bg-[#3A3A3A]" />
                                  ) : (
                                    <span
                                      className="flex h-full w-full items-center justify-center rounded-full text-xs font-semibold uppercase text-white"
                                      style={{ backgroundColor: fallbackAvatar.color }}
                                    >
                                      {hasProfileInfo ? fallbackAvatar.initials : ""}
                                    </span>
                                  )}
                                </span>
                              </span>
                              {showProfileSkeleton ? (
                                <span className="min-w-0 flex-1 space-y-1 text-left">
                                  <span className="block h-3.5 w-28 rounded-full bg-slate-200 skeleton-shimmer dark:bg-[#3A3A3A]" />
                                  <span className="block h-3 w-36 rounded-full bg-slate-200 skeleton-shimmer dark:bg-[#3A3A3A]" />
                                </span>
                              ) : hasProfileInfo ? (
                                <span className="min-w-0 text-left">
                                  {profileName ? (
                                    <span className="block truncate text-[14px] font-semibold leading-5 text-slate-900 dark:text-zinc-100">
                                      {profileName}
                                    </span>
                                  ) : null}
                                  {profileEmail ? (
                                    <span className="block truncate text-[12px] leading-4 text-slate-500 dark:text-zinc-400">
                                      {profileEmail}
                                    </span>
                                  ) : null}
                                </span>
                              ) : (
                                <span className="min-w-0 text-left">
                                  <span className="block text-[14px] font-semibold leading-5 text-slate-900 dark:text-zinc-100">
                                    Profile
                                  </span>
                                </span>
                              )}
                            </span>
                            <ChevronRight className="h-4 w-4 shrink-0 rotate-90 text-slate-400" aria-hidden />
                          </>
                        ) : (
                          <span className="relative flex h-10 w-10 shrink-0 items-center justify-center">
                                {profileOpen ? (
                                  <span
                                    className="pointer-events-none absolute inset-[1px] rounded-full border-2 border-[#6C47FF] bg-transparent"
                                    aria-hidden
                                  />
                                ) : null}
                                <span className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full">
                              {showAvatarImage ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={avatar!}
                                  alt="Your avatar"
                                  className="h-full w-full rounded-full object-cover"
                                  onError={() => setAvatarLoadFailed(true)}
                                />
                              ) : showProfileSkeleton ? (
                                <span className="flex h-full w-full items-center justify-center rounded-full bg-slate-200 skeleton-shimmer dark:bg-[#3A3A3A]" />
                              ) : (
                                <span
                                  className="flex h-full w-full items-center justify-center rounded-full text-xs font-semibold uppercase text-white"
                                  style={{ backgroundColor: fallbackAvatar.color }}
                                >
                                  {hasProfileInfo ? fallbackAvatar.initials : ""}
                                </span>
                              )}
                            </span>
                          </span>
                        )
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : null}
          <Suspense fallback={null}>
            <main className="relative z-0 flex min-h-0 flex-1 flex-col lg:z-40">
              <div className={`flex min-h-0 w-full flex-1 flex-col `}>
                <div
                  className="workspace-content-shell flex h-full min-h-0 w-full flex-1 flex-col transition-none 2xl:transition-[max-width] 2xl:duration-300 2xl:ease-[cubic-bezier(0.22,1,0.36,1)]"
                  style={{ maxWidth: showDesktopAllProjectsTopBar ? "none" : "var(--shell-content-width)", width: "100%" }}
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
          className={`workspace-bottom-dock fixed inset-x-0 bottom-0 z-[75] hidden border-t border-slate-200 bg-white/95 px-2 pt-1 pb-[calc(6px+env(safe-area-inset-bottom))] backdrop-blur dark:border-[#3A3A3A] dark:bg-[#323232]/95 ${
            showHomeBillingModal ? "pointer-events-none blur-sm opacity-55" : ""
          }`}
        >
          <div className="mx-auto grid max-w-xl grid-cols-4 items-end gap-1">
            {mobileBottomDockItems.map((item) => {
              const Icon = item.icon;
              const activeDockColor = "#7C3AED";
              const iconClassName = item.active
                ? "h-[22px] w-[22px]"
                : "h-[22px] w-[22px] text-[#4B5563] dark:text-white";
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
                      ? "text-[#7C3AED] dark:text-[#7C3AED]"
                      : "text-[#4B5563] hover:bg-[rgba(0,0,0,0.04)] dark:text-white dark:hover:bg-white/5"
                  }`}
                >
                  <Icon
                    className={iconClassName}
                    style={item.active ? { color: activeDockColor } : undefined}
                    aria-hidden
                    weight={item.label === "Signatures" ? "regular" : item.active ? "fill" : "regular"}
                  />
                  <span
                    className={`truncate leading-[1.15] ${
                      item.active ? "dark:text-[#7C3AED]" : "dark:text-white"
                    }`}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}

      {createOpen
        ? createPortal(
            <>
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
              <div
                className={`absolute inset-0 bg-black/40 transition-opacity duration-[${WORKSPACE_LAUNCH_MODAL_EXIT_MS}ms] ease-out dark:bg-black/55 dark:backdrop-blur-sm ${
                  createLaunchExiting ? "opacity-0" : "opacity-100"
                }`}
              />
              <div
                ref={createRef}
                className={`page-fade-in relative z-10 w-full max-w-4xl text-slate-900 transition-[opacity,transform] duration-[${WORKSPACE_LAUNCH_MODAL_EXIT_MS}ms] ease-out dark:text-zinc-100 ${
                  createLaunchExiting ? "pointer-events-none opacity-0 scale-[0.965]" : "opacity-100 scale-100"
                }`}
              >
                <form
                  className="flex max-h-[calc(100vh-3rem)] flex-col overflow-hidden rounded-2xl bg-white shadow-[0_22px_60px_rgba(15,23,42,0.22),0_0_0_1px_rgba(148,163,184,0.14)] dark:bg-[#323232] dark:shadow-[0_22px_60px_rgba(0,0,0,0.5)]"
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
                            className={`group flex min-h-[360px] w-full flex-col overflow-hidden rounded-xl text-center transition duration-200 sm:min-h-[400px] ${
                              showCreateFilesError
                                ? "border border-rose-300 bg-gradient-to-b from-rose-50/70 via-white/90 to-white text-rose-600 shadow-[0_0_0_1px_rgba(251,113,133,0.15)] dark:bg-[#323232]/60"
                                : createDragActive
                                  ? "scale-[1.01] border border-[#3F3F3F] bg-[#323232] shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_0_30px_rgba(0,0,0,0.18)] dark:bg-[#323232]"
                                  : createPendingFiles.length === 0
                                    ? "border-2 border-dashed border-[#D1D5DB] bg-[#F5F5F5] dark:border-[#3A3A3A] dark:bg-[#2B2B2B]/80"
                                    : "bg-transparent dark:bg-transparent"
                            } ${createLaunchFileFlash ? "scale-[1.01] brightness-[1.02] shadow-[0_0_0_1px_rgba(108,71,255,0.15),0_18px_40px_rgba(108,71,255,0.12)]" : ""}`}
                            onDragOver={(event) => {
                              event.preventDefault();
                              if (createBusy) return;
                              setCreateDragActive(true);
                            }}
                            onDragLeave={() => {
                              if (createBusy) return;
                              setCreateDragActive(false);
                            }}
                            onDrop={(event) => {
                              event.preventDefault();
                              if (createBusy) return;
                              setCreateDragActive(false);
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
                                    showCreateFilesError ? "text-rose-600" : "text-slate-900 dark:text-zinc-100"
                                  }`}
                                >
                                  {createDragActive ? (
                                    "Release to add your files"
                                  ) : (
                                    <>
                                      <button
                                        type="button"
                                        className="cursor-pointer text-[1.05em] font-bold text-slate-900 underline decoration-1 underline-offset-2 transition hover:text-slate-900 disabled:cursor-not-allowed dark:text-zinc-100 dark:hover:text-zinc-100"
                                        onClick={() => createFileInputRef.current?.click()}
                                        disabled={createBusy}
                                      >
                                        select files
                                      </button>
                                      <span className="sm:hidden"> to get started</span>
                                      <span className="hidden sm:inline"> or drop your files to get started</span>
                                    </>
                                  )}
                                </p>
                                {!createDragActive ? (
                                  <p className="mt-2 text-sm text-[#4B5563] dark:text-zinc-400">Add up to 12 PDF files.</p>
                                ) : null}
                              </div>
                            ) : (
                              <PendingFilesReorderList
                                files={createPendingFiles}
                                busy={createBusy}
                                onChange={setCreatePendingFiles}
                                onOpenFilePicker={() => createFileInputRef.current?.click()}
                                limitFlashSignal={createLimitFlashSignal}
                              />
                            )}
                            <input
                              ref={createFileInputRef}
                              type="file"
                              accept=".pdf,application/pdf"
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

                  <div className="shrink-0 bg-white dark:bg-[#323232]">
                      <div className="flex min-h-[76px] items-center justify-end gap-3 px-6 py-0 text-sm sm:px-10">
                        <button
                          type="button"
                          onClick={closeCreateModal}
                          className="px-2 py-2 font-semibold text-slate-500 transition hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                          disabled={createBusy}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className={`inline-flex items-center justify-center rounded-full bg-[#6C47FF] px-5 py-2 font-semibold text-white shadow-[0_14px_40px_rgba(15,23,42,0.25)] transition hover:-translate-y-0.5 hover:bg-[#5B38E6] hover:shadow-[0_18px_50px_rgba(15,23,42,0.32)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5CF6] focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:translate-y-0 disabled:bg-[#6C47FF] disabled:shadow-[0_14px_40px_rgba(15,23,42,0.25)] disabled:opacity-60 disabled:pointer-events-none ${
                            createLaunchExiting ? "scale-[0.97] brightness-95" : ""
                          }`}
                          disabled={createBusy || createMissingFiles}
                        >
                          Open Workspace
                        </button>
                      </div>
                  </div>
                </form>
              </div>
            </div>
            </>,
            document.body,
          )
        : null}

      {billingPortalLoading ? (
        <div className="pointer-events-none fixed inset-0 z-[1200]">
          <div className="absolute inset-0 bg-[var(--app-surface)]" />
          <div className="relative flex min-h-screen items-center justify-center px-6 py-10">
            <div className="pointer-events-none flex flex-col items-center text-center">
              <div
                className="h-14 w-14 animate-spin rounded-full border-[5px] border-[#D9CCFF] border-t-[#6C47FF] dark:border-[#3F3F3F] dark:border-t-[#8B6CFF]"
                aria-hidden
              />
              <p className="mt-5 text-[24px] font-semibold tracking-tight text-slate-900 dark:text-[#F5F5F5] sm:text-[28px]">
                Opening Billing Portal...
              </p>
            </div>
          </div>
        </div>
      ) : null}
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

  const accountPanelOverlay =
    accountPanelOpen && typeof document !== "undefined"
      ? createPortal(
          <div className="fixed inset-0 z-[950] bg-[var(--app-surface)]">
            <button
              type="button"
              className="absolute inset-0 cursor-default"
              aria-label="Close account settings"
              onClick={closeAccountPanel}
            />
            <div className="relative h-full w-full bg-[var(--app-surface)]">
              <AccountSettingsPage
                activeSettingsTab="account"
                initialMobileView="home"
                embedded
                onClose={closeAccountPanel}
              />
            </div>
          </div>,
          document.body,
        )
      : null;

  const primaryShell = isStudioRoute ? (
    <Suspense
      fallback={null}
    >
      <main>{children}</main>
    </Suspense>
  ) : isPricingRoute ? (
    pricingShell
  ) : (
    workspaceShell
  );

  return (
    <>
      {primaryShell}
      {accountPanelOverlay}
    </>
  );
}
