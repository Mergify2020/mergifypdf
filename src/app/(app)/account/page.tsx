"use client";

import Link from "next/link";
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, CreditCard, Eye, EyeOff, ExternalLink, Lock, Mail, MoveLeft, PencilLine, Plus, Send, Shield, Smile, Star, Sun, User } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useRef, useState, type ComponentType, type SVGProps } from "react";
import { FileText as PhFileText, Folders as PhFolders, Signature as PhSignature, Trash as PhTrash } from "@phosphor-icons/react";
import { siInstagram, siTiktok, siX } from "simple-icons";
import { useAvatarPreference } from "@/lib/useAvatarPreference";
import { getAvatarFallback } from "@/lib/avatarFallback";
import {
  meetsPasswordPolicy,
  NEW_PASSWORD_REQUIREMENTS_ERROR,
  NEW_PASSWORD_REQUIREMENTS_HINT,
} from "@/lib/passwordPolicy";
import { BILLING_PRICE_IDS, getBillingStatusPresentation, getPlanTierFromPriceId } from "@/lib/billingPlans";
import SettingsMenu from "@/components/SettingsMenu";
import PricingTierCards, { PRICING_TIERS } from "@/components/PricingTierCards";

const PREVIEW_STAGE_SIZE = 256; // matches Tailwind h-64
const MIN_CROP_SIZE = 56;

type DisplayMeta = {
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
  scale: number;
};

type CropRect = { x: number; y: number; size: number };
type Bounds = { left: number; top: number; right: number; bottom: number };
type CropHandle = "nw" | "ne" | "sw" | "se";
type SettingsTab = "account" | "security" | "pricing";
type DeleteAccountReason =
  | "too_expensive"
  | "missing_features"
  | "found_another_tool"
  | "not_using_enough"
  | "technical_issues";

const HANDLE_POSITIONS: Record<CropHandle, string> = {
  nw: "-top-2 -left-2",
  ne: "-top-2 -right-2",
  sw: "-bottom-2 -left-2",
  se: "-bottom-2 -right-2",
};

const DELETE_ACCOUNT_REASONS: Array<{
  value: DeleteAccountReason;
  label: string;
}> = [
  { value: "too_expensive", label: "Too expensive" },
  { value: "missing_features", label: "Missing features" },
  { value: "found_another_tool", label: "Found another tool" },
  { value: "not_using_enough", label: "Not using it enough" },
  { value: "technical_issues", label: "Technical issues" },
];

type MobileDockItem = {
  label: string;
  href: string;
  icon: ComponentType<{
    className?: string;
    weight?: "regular" | "fill";
    size?: number | string;
    color?: string;
  }>;
  active?: boolean;
};

function TikTokIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} aria-hidden="true" {...props}>
      <path fill="currentColor" d={siTiktok.path} />
    </svg>
  );
}

function InstagramIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} aria-hidden="true" {...props}>
      <path fill="currentColor" d={siInstagram.path} />
    </svg>
  );
}

function XIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width={16} height={16} aria-hidden="true" {...props}>
      <path fill="currentColor" d={siX.path} />
    </svg>
  );
}

function computeBounds(meta: DisplayMeta | null): Bounds {
  if (!meta) {
    return { left: 0, top: 0, right: PREVIEW_STAGE_SIZE, bottom: PREVIEW_STAGE_SIZE };
  }
  return {
    left: meta.offsetX,
    top: meta.offsetY,
    right: meta.offsetX + meta.width,
    bottom: meta.offsetY + meta.height,
  };
}

function clampRectToBounds(rect: CropRect, bounds: Bounds): CropRect {
  const maxSize = Math.min(bounds.right - bounds.left, bounds.bottom - bounds.top);
  const size = Math.min(Math.max(rect.size, MIN_CROP_SIZE), maxSize);
  let x = rect.x;
  let y = rect.y;
  if (x < bounds.left) x = bounds.left;
  if (y < bounds.top) y = bounds.top;
  if (x + size > bounds.right) x = bounds.right - size;
  if (y + size > bounds.bottom) y = bounds.bottom - size;
  return { x, y, size };
}

function resizeRectByHandle(
  handle: CropHandle,
  startRect: CropRect,
  dx: number,
  dy: number,
  bounds: Bounds
): CropRect {
  const right = startRect.x + startRect.size;
  const bottom = startRect.y + startRect.size;
  let nextRect: CropRect = startRect;

  switch (handle) {
    case "se": {
      const newRight = Math.min(bounds.right, right + dx);
      const newBottom = Math.min(bounds.bottom, bottom + dy);
      const size = Math.max(MIN_CROP_SIZE, Math.min(newRight - startRect.x, newBottom - startRect.y));
      nextRect = { x: startRect.x, y: startRect.y, size };
      break;
    }
    case "sw": {
      const newLeft = Math.max(bounds.left, startRect.x + dx);
      const newBottom = Math.min(bounds.bottom, bottom + dy);
      const size = Math.max(MIN_CROP_SIZE, Math.min(right - newLeft, newBottom - startRect.y));
      nextRect = { x: right - size, y: startRect.y, size };
      break;
    }
    case "ne": {
      const newTop = Math.max(bounds.top, startRect.y + dy);
      const newRight = Math.min(bounds.right, right + dx);
      const size = Math.max(MIN_CROP_SIZE, Math.min(newRight - startRect.x, bottom - newTop));
      nextRect = { x: startRect.x, y: bottom - size, size };
      break;
    }
    case "nw": {
      const newLeft = Math.max(bounds.left, startRect.x + dx);
      const newTop = Math.max(bounds.top, startRect.y + dy);
      const size = Math.max(MIN_CROP_SIZE, Math.min(right - newLeft, bottom - newTop));
      nextRect = { x: right - size, y: bottom - size, size };
      break;
    }
    default:
      return startRect;
  }

  return clampRectToBounds(nextRect, bounds);
}

export function AccountSettingsPage({
  activeSettingsTab: initialSettingsTab,
  initialMobileView,
  embedded = false,
  onClose,
}: {
  activeSettingsTab: SettingsTab;
  initialMobileView: SettingsTab | "home" | null;
  embedded?: boolean;
  onClose?: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status: sessionStatus, update: updateSession } = useSession();
  const providers = session?.user?.providers ?? [];
  const hasCredentialsAccess = providers.length === 0 || providers.includes("credentials");
  const managedByGoogle = !hasCredentialsAccess && providers.includes("google");
  const canManageEmail = hasCredentialsAccess;
  const canChangePassword = hasCredentialsAccess;

  const [email, setEmail] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [confirmNewEmail, setConfirmNewEmail] = useState("");
  const [emailCodeDigits, setEmailCodeDigits] = useState<string[]>(Array(6).fill(""));
  const [emailStep, setEmailStep] = useState<"request" | "verify">("request");
  const [emailRequestBusy, setEmailRequestBusy] = useState(false);
  const [emailVerifyBusy, setEmailVerifyBusy] = useState(false);
  const [emailRequestSubmitAttempted, setEmailRequestSubmitAttempted] = useState(false);
  const [emailMessage, setEmailMessage] = useState<string | null>(null);
  const [emailResendCooldown, setEmailResendCooldown] = useState(0);
  const [billingPortalLoading, setBillingPortalLoading] = useState(false);
  const [billingPortalError, setBillingPortalError] = useState<string | null>(null);
  const [warmedBillingPortalUrl, setWarmedBillingPortalUrl] = useState<string | null>(null);
  const [warmedBillingPortalAt, setWarmedBillingPortalAt] = useState<number>(0);
  const [pricingBillingPeriod, setPricingBillingPeriod] = useState<"monthly" | "annual">("monthly");
  const [pricingCheckoutLoading, setPricingCheckoutLoading] = useState<string | null>(null);
  const [pricingMessage, setPricingMessage] = useState<string | null>(null);
  const [pricingStatusMounted, setPricingStatusMounted] = useState(false);
  const [pricingStatusReady, setPricingStatusReady] = useState(false);
  const [pricingTrialStatus, setPricingTrialStatus] = useState<{
    eligibleForTrial: boolean;
    stripeStatus: string | null;
    stripePriceId?: string | null;
    stripeCustomerId?: string | null;
    stripeCurrentPeriodEnd?: string | null;
    eligibleForTrialByPlan?: {
      essentialPlus?: boolean;
      signaturePro?: boolean;
    };
  } | null>(null);
  const [firstNameValue, setFirstNameValue] = useState("");
  const [lastNameValue, setLastNameValue] = useState("");
  const [savedFirstName, setSavedFirstName] = useState("");
  const [savedLastName, setSavedLastName] = useState("");
  const [editingNameField, setEditingNameField] = useState<"first" | "last" | null>(null);
  const [nameBusy, setNameBusy] = useState(false);
  const [nameMessage, setNameMessage] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordSubmitAttempted, setPasswordSubmitAttempted] = useState(false);
  const accountEmail = email || session?.user?.email || null;
  const avatarKey = session?.user?.id ?? session?.user?.email ?? null;
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const accountNameFromSavedFields = [savedFirstName.trim(), savedLastName.trim()].filter(Boolean).join(" ");
  const accountName =
    accountNameFromSavedFields
    || (session?.user?.name ?? "").trim()
    || session?.user?.email
    || "";
  const fallbackAvatar = getAvatarFallback(
    avatarKey,
    accountName || session?.user?.email || "User"
  );
  const { avatar, setAvatar, clearAvatar } = useAvatarPreference(avatarKey);
  const [avatarMessage, setAvatarMessage] = useState<string | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emailCodeRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [showCropper, setShowCropper] = useState(false);
  const [pendingAvatar, setPendingAvatar] = useState<string | null>(null);
  const [displayMeta, setDisplayMeta] = useState<DisplayMeta | null>(null);
  const [cropRect, setCropRect] = useState<CropRect | null>(null);

  const [twoFactorMethod, setTwoFactorMethod] = useState<"email" | null>(null);
  const [twoFactorModalMode, setTwoFactorModalMode] = useState<"enable" | "disable" | null>(null);
  const [twoFactorStep, setTwoFactorStep] = useState<"select" | "verify">("select");
  const [twoFactorCodeDigits, setTwoFactorCodeDigits] = useState(Array(6).fill(""));
  const [twoFactorBusy, setTwoFactorBusy] = useState(false);
  const [twoFactorError, setTwoFactorError] = useState<string | null>(null);
  const [twoFactorMessage, setTwoFactorMessage] = useState<string | null>(null);
  const [twoFactorResendCooldown, setTwoFactorResendCooldown] = useState(0);
  const twoFactorCodeRefs = useRef<Array<HTMLInputElement | null>>([]);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteModalMode, setDeleteModalMode] = useState<"checking" | "deleting" | "billing" | "google" | "confirm" | null>(null);
  const [deleteBillingInfo, setDeleteBillingInfo] = useState<{
    title: string;
    message: string;
  } | null>(null);
  const [deleteReason, setDeleteReason] = useState<DeleteAccountReason | "">("");
  const [deleteReasonMenuOpen, setDeleteReasonMenuOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deletePasswordVisible, setDeletePasswordVisible] = useState(false);
  const [deleteChecking, setDeleteChecking] = useState(false);
  const [deleteDeleting, setDeleteDeleting] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const deleteCheckRequestRef = useRef<number | null>(null);
  const deleteReasonMenuRef = useRef<HTMLDivElement | null>(null);

  const [activeSettingsTab, setActiveSettingsTab] = useState<SettingsTab>(initialSettingsTab);
  const [mobileSettingsView, setMobileSettingsView] = useState<SettingsTab | "home">(initialMobileView ?? "home");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [accountHydrating, setAccountHydrating] = useState(true);
  const [themeHydrated, setThemeHydrated] = useState(false);
  const [suppressAccountLoader, setSuppressAccountLoader] = useState(false);
  const showAvatarImage = Boolean(avatar) && !avatarLoadFailed;
  const showProfileSkeleton = sessionStatus === "loading";
  const showNameSkeleton = accountHydrating || sessionStatus === "loading";
  const passwordMessageText = passwordMessage ?? "";
  const isEmailConfirmationMismatch =
    emailStep === "request"
    && confirmNewEmail.trim().length > 0
    && newEmail.trim().toLowerCase() !== confirmNewEmail.trim().toLowerCase();
  const isCurrentPasswordIncorrect =
    Boolean(passwordMessage)
    && /current password/i.test(passwordMessageText)
    && /incorrect/i.test(passwordMessageText);
  const isNewPasswordRequirementsError = passwordMessage === NEW_PASSWORD_REQUIREMENTS_ERROR;
  const isPasswordRateLimited =
    Boolean(passwordMessage) && /^too many requests/i.test(passwordMessageText);
  const isNewPasswordMismatch =
    Boolean(passwordMessage) && /do not match/i.test(passwordMessageText);
  const currentPasswordHasError =
    (passwordSubmitAttempted && !currentPassword.trim()) || isCurrentPasswordIncorrect;
  const newPasswordHasError =
    (passwordSubmitAttempted && !newPassword.trim())
    || isNewPasswordMismatch
    || isNewPasswordRequirementsError;
  const confirmPasswordHasError =
    (passwordSubmitAttempted && !confirmPassword.trim())
    || isNewPasswordMismatch
    || isNewPasswordRequirementsError;

  useEffect(() => {
    if (!deleteReasonMenuOpen) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node | null;
      if (deleteReasonMenuRef.current && target && !deleteReasonMenuRef.current.contains(target)) {
        setDeleteReasonMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setDeleteReasonMenuOpen(false);
      }
    }

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [deleteReasonMenuOpen]);

  const accountPageLoading = sessionStatus === "loading" && !suppressAccountLoader;
  const isNameMissing = !firstNameValue.trim() || !lastNameValue.trim();
  const pricingStatusLoaded = pricingStatusMounted && pricingStatusReady;
  const billingPresentationState = pricingStatusLoaded
    ? getBillingStatusPresentation(pricingTrialStatus?.stripeStatus ?? null)
    : "none";
  const accountStripeStatus = billingPresentationState === "none" ? null : billingPresentationState;
  const billingHasCurrentPlan = billingPresentationState !== "none";
  const pricingIsDelinquent = billingPresentationState === "past_due" || billingPresentationState === "unpaid";
  const isTrialingPlan = billingPresentationState === "trialing";
  const pricingStatusLoading = !pricingStatusLoaded;
  const currentPlanTier = (() => {
    const tier = getPlanTierFromPriceId(pricingStatusLoaded ? pricingTrialStatus?.stripePriceId ?? null : null);
    if (tier === "essential_plus") return "Essential Plus";
    if (tier === "signature_pro") return "Signature Pro";
    return null;
  })();
  const currentPlanPriceId = pricingStatusLoaded ? pricingTrialStatus?.stripePriceId ?? null : null;
  const pricingCanUseTrial = pricingStatusLoaded ? pricingTrialStatus?.eligibleForTrial !== false : false;
  const currentPlanDetails = currentPlanTier
    ? PRICING_TIERS.find((tier) => tier.name === currentPlanTier) ?? null
    : null;
  const currentPlanBillingPeriod = (() => {
    if (
      currentPlanPriceId === BILLING_PRICE_IDS.essential_plus.annual ||
      currentPlanPriceId === BILLING_PRICE_IDS.signature_pro.annual
    ) {
      return "annual" as const;
    }
    if (
      currentPlanPriceId === BILLING_PRICE_IDS.essential_plus.monthly ||
      currentPlanPriceId === BILLING_PRICE_IDS.signature_pro.monthly
    ) {
      return "monthly" as const;
    }
    return null;
  })();
  const currentPlanCycleLabel = (() => {
    const periodEnd = pricingTrialStatus?.stripeCurrentPeriodEnd;
    if (!periodEnd) return null;
    const endDate = new Date(periodEnd);
    if (Number.isNaN(endDate.getTime())) return null;
    const formattedEndDate = new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(endDate);
    if (billingPresentationState === "trialing") {
      return `Trial ends on ${formattedEndDate}`;
    }
    if (billingPresentationState === "active") {
      return `Renews on ${formattedEndDate}`;
    }
    if (pricingIsDelinquent) {
      return `Past due since ${formattedEndDate}`;
    }
    return null;
  })();
  const desktopSettingsMaxWidth = "min(2064px, calc(100vw - 48px))";
  const mobileDockItems: MobileDockItem[] = [
    {
      label: "Projects",
      href: "/projects/all",
      icon: PhFolders,
      active: pathname?.startsWith("/projects") ?? false,
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
    {
      label: "Trash",
      href: "/projects/trash",
      icon: PhTrash,
      active: pathname?.startsWith("/projects/trash") ?? false,
    },
  ];
  useEffect(() => {
    setActiveSettingsTab(initialSettingsTab);
  }, [initialSettingsTab]);

  const pricingCanUseTrialForPlan = (planName: string) => {
    const byPlan = pricingTrialStatus?.eligibleForTrialByPlan;
    if (!byPlan) return pricingCanUseTrial;
    if (planName === "Essential Plus") return byPlan.essentialPlus !== false;
    if (planName === "Signature Pro") return byPlan.signaturePro !== false;
    return pricingCanUseTrial;
  };

  useEffect(() => {
    setMobileSettingsView(initialMobileView ?? "home");
  }, [initialMobileView]);

  useEffect(() => {
    if (activeSettingsTab === "account") return;
    setEditingNameField(null);
    setNameMessage(null);
    setFirstNameValue(savedFirstName);
    setLastNameValue(savedLastName);
  }, [activeSettingsTab, savedFirstName, savedLastName]);

  useEffect(() => {
    const stored = window.localStorage.getItem("theme");
    const initialTheme = stored === "dark" ? "dark" : "light";
    document.documentElement.classList.toggle("dark", initialTheme === "dark");
    if (initialTheme === "light") {
      document.body.classList.remove("dark");
    }
    setTheme(initialTheme);
    setThemeHydrated(true);
  }, []);

  useEffect(() => {
    router.prefetch("/");
  }, [router]);

  useEffect(() => {
    if (!session?.user?.email) return;
    let cancelled = false;
    async function loadPricingStatus() {
      try {
        const res = await fetch("/api/account/trial-status", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as {
          eligibleForTrial?: boolean;
          stripeStatus?: string | null;
          stripePriceId?: string | null;
          stripeCustomerId?: string | null;
          stripeCurrentPeriodEnd?: string | null;
          eligibleForTrialByPlan?: {
            essentialPlus?: boolean;
            signaturePro?: boolean;
          };
        };
        if (cancelled) return;
        setPricingTrialStatus({
          eligibleForTrial: data.eligibleForTrial !== false,
          stripeStatus: typeof data.stripeStatus === "string" ? data.stripeStatus : null,
          stripePriceId: typeof data.stripePriceId === "string" ? data.stripePriceId : null,
          stripeCustomerId: typeof data.stripeCustomerId === "string" ? data.stripeCustomerId : null,
          stripeCurrentPeriodEnd:
            typeof data.stripeCurrentPeriodEnd === "string" ? data.stripeCurrentPeriodEnd : null,
          eligibleForTrialByPlan: data.eligibleForTrialByPlan,
        });
      } catch {
        // no-op
      } finally {
        if (!cancelled) {
          setPricingStatusReady(true);
        }
      }
    }
    void loadPricingStatus();
    return () => {
      cancelled = true;
    };
  }, [session?.user?.email]);

  useEffect(() => {
    setPricingStatusMounted(true);
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
    const frame = window.requestAnimationFrame(() => {
      window.dispatchEvent(new Event("workspace-content-ready"));
    });
    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, []);

  function switchSettingsTab(nextTab: SettingsTab) {
    setActiveSettingsTab(nextTab);
    if (embedded && typeof window !== "undefined") {
      const nextUrl = new URL(window.location.href);
      nextUrl.searchParams.set("panel", "account");
      nextUrl.searchParams.set("settingsView", nextTab);
      router.replace(`${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);
      return;
    }
    if (!embedded && typeof window !== "undefined") {
      const nextUrl =
        nextTab === "security"
          ? "/account?view=security"
          : nextTab === "pricing"
            ? "/account?view=pricing"
            : "/account";
      window.history.pushState(window.history.state, "", nextUrl);
    }
  }

  function openMobileSettingsTab(nextTab: SettingsTab) {
    setMobileSettingsView(nextTab);
    switchSettingsTab(nextTab);
  }

  useEffect(() => {
    if (session?.user?.email) {
      setEmail(session.user.email);
      setNewEmail("");
      setConfirmNewEmail("");
    }
  }, [session?.user?.email]);

  function applyTheme(nextTheme: "light" | "dark") {
    document.documentElement.classList.add("theme-transition");
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
    if (nextTheme === "light") {
      document.body.classList.remove("dark");
    }
    window.localStorage.setItem("theme", nextTheme);
    document.cookie = `theme=${nextTheme}; path=/; max-age=31536000`;
    setTheme(nextTheme);
    window.setTimeout(() => {
      document.documentElement.classList.remove("theme-transition");
    }, 200);
  }

  useEffect(() => {
    setAvatarLoadFailed(false);
  }, [avatar]);

  useEffect(() => {
    const fullName = (session?.user?.name ?? "").trim();
    const parts = fullName.split(/\s+/).filter(Boolean);
    const parsedFirstName = parts[0] ?? "";
    const parsedLastName = parts.length > 1 ? parts.slice(1).join(" ") : "";
    setSavedFirstName(parsedFirstName);
    setSavedLastName(parsedLastName);
    setFirstNameValue(parsedFirstName);
    setLastNameValue(parsedLastName);
  }, [session?.user?.name]);

  useEffect(() => {
    if (!accountHydrating) return;
    if (sessionStatus === "loading") return;

    const fullName = (session?.user?.name ?? "").trim();
    const parts = fullName.split(/\s+/).filter(Boolean);
    const parsedFirstName = parts[0] ?? "";
    const parsedLastName = parts.length > 1 ? parts.slice(1).join(" ") : "";
    const sessionEmail = session?.user?.email ?? "";

    if (
      email === sessionEmail &&
      firstNameValue === parsedFirstName &&
      lastNameValue === parsedLastName
    ) {
      setAccountHydrating(false);
    }
  }, [
    accountHydrating,
    sessionStatus,
    session?.user?.email,
    session?.user?.name,
    email,
    firstNameValue,
    lastNameValue,
  ]);

  useEffect(() => {
    window.dispatchEvent(new Event(accountPageLoading ? "workspace-account-loading-start" : "workspace-account-loading-stop"));
  }, [accountPageLoading]);

  useEffect(() => {
    return () => {
      window.dispatchEvent(new Event("workspace-account-loading-stop"));
    };
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout | undefined;
    if (twoFactorResendCooldown > 0) {
      timer = setInterval(() => {
        setTwoFactorResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [twoFactorResendCooldown]);

  function openNameEditor(field: "first" | "last") {
    if (editingNameField === field) return;
    if (editingNameField === "first") {
      setFirstNameValue(savedFirstName);
    } else if (editingNameField === "last") {
      setLastNameValue(savedLastName);
    }
    setEditingNameField(field);
  }

  function cancelNameEditor(field: "first" | "last") {
    if (field === "first") {
      setFirstNameValue(savedFirstName);
    } else {
      setLastNameValue(savedLastName);
    }
    setEditingNameField(null);
  }

  useEffect(() => {
    let cancelled = false;
    async function loadTwoFactor() {
      if (!session?.user?.id) return;
      if (managedByGoogle) {
        setTwoFactorMethod(null);
        return;
      }
      try {
        const response = await fetch("/api/account/two-factor");
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data?.ok || cancelled) return;
        const enabled: boolean = !!data.enabled;
        const method: "email" | null =
          enabled && data.method === "email"
            ? "email"
            : null;
        setTwoFactorMethod(method);
      } catch {
        // ignore; 2FA will appear as disabled
      }
    }
    void loadTwoFactor();
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id, managedByGoogle]);

  async function requestEmailCode() {
    if (!canManageEmail) {
      setEmailMessage(managedByGoogle ? "Your email is handled by Google." : "Email changes are disabled for your sign-in method.");
      return;
    }
    setEmailRequestBusy(true);
    setEmailMessage(null);

    try {
      const response = await fetch("/api/account/update-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "request-code", newEmail }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to send verification code.");
      }
      setEmailStep("verify");
      setEmailRequestSubmitAttempted(false);
      setEmailCodeDigits(Array(6).fill(""));
      setEmailResendCooldown(25);
      setTimeout(() => {
        emailCodeRefs.current[0]?.focus();
      }, 0);
    } catch (error) {
      setEmailMessage(
        error instanceof Error ? error.message : "Something went wrong. Please try again."
      );
    } finally {
      setEmailRequestBusy(false);
    }
  }

  async function handleEmailRequest(event: React.FormEvent) {
    event.preventDefault();
    setEmailMessage(null);
    setEmailRequestSubmitAttempted(true);
    if (!newEmail.trim() || !confirmNewEmail.trim()) {
      setEmailMessage("Please fill in all email fields.");
      return;
    }
    if (newEmail.trim().toLowerCase() !== confirmNewEmail.trim().toLowerCase()) {
      setEmailMessage("Email addresses do not match.");
      return;
    }
    await requestEmailCode();
  }

  async function handleEmailVerify(event: React.FormEvent) {
    event.preventDefault();
    if (!canManageEmail) {
      setEmailMessage(managedByGoogle ? "Your email is handled by Google." : "Email changes are disabled for your sign-in method.");
      return;
    }
    const code = emailCodeDigits.join("").trim();
    if (!/^\d{6}$/.test(code)) {
      setEmailMessage("Enter the 6-digit code.");
      return;
    }
    setEmailVerifyBusy(true);
    setEmailMessage(null);

    try {
      const response = await fetch("/api/account/update-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify-code", newEmail, code }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to verify code.");
      }
      const updatedEmail =
        typeof data.email === "string" && data.email.includes("@")
          ? data.email
          : newEmail.trim().toLowerCase();
      setEmail(updatedEmail);
      setNewEmail("");
      setConfirmNewEmail("");
      setEmailCodeDigits(Array(6).fill(""));
      setEmailStep("request");
      try {
        await updateSession({ email: updatedEmail });
      } catch {
        // ignore; we'll force-refresh below
      }
      router.refresh();
      setEmailMessage(data.message ?? "Email updated.");
    } catch (error) {
      setEmailMessage(
        error instanceof Error ? error.message : "Something went wrong. Please try again."
      );
    } finally {
      setEmailVerifyBusy(false);
    }
  }

  function focusEmailCodeIndex(index: number) {
    emailCodeRefs.current[index]?.focus();
  }

  function updateEmailCodeDigit(index: number, value: string) {
    setEmailCodeDigits((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  useEffect(() => {
    if (emailResendCooldown <= 0) return;
    const timer = window.setInterval(() => {
      setEmailResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => {
      window.clearInterval(timer);
    };
  }, [emailResendCooldown]);

  useEffect(() => {
    if (emailMessage !== "Email updated successfully.") return;
    const timer = window.setTimeout(() => {
      setEmailMessage((current) => (current === "Email updated successfully." ? null : current));
    }, 6000);
    return () => {
      window.clearTimeout(timer);
    };
  }, [emailMessage]);

  async function openBillingPortal() {
    if (billingPortalLoading) return;
    try {
      setBillingPortalLoading(true);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("workspace-billing-portal-start"));
      }
      setBillingPortalError(null);
      const now = Date.now();
      if (
        warmedBillingPortalUrl &&
        warmedBillingPortalAt > 0 &&
        now - warmedBillingPortalAt < 25_000
      ) {
        window.location.href = warmedBillingPortalUrl;
        return true;
      }
      const returnUrl =
        typeof window === "undefined"
          ? undefined
          : embedded
            ? window.location.href
            : `${window.location.origin}/account${
                activeSettingsTab === "security"
                  ? "?view=security"
                  : activeSettingsTab === "pricing"
                    ? "?view=pricing"
                    : ""
              }`;
      const response = await fetch("/api/billing-portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnUrl }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || typeof data?.url !== "string") {
        throw new Error(data?.error ?? "Unable to open billing portal.");
      }
      window.location.href = data.url;
      return true;
    } catch {
      setBillingPortalError("Unable to open billing portal right now.");
      setBillingPortalLoading(false);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("workspace-billing-portal-stop"));
      }
      return false;
    }
  }

  async function warmBillingPortal() {
    if (billingPortalLoading) return;
    const now = Date.now();
    if (
      warmedBillingPortalUrl &&
      warmedBillingPortalAt > 0 &&
      now - warmedBillingPortalAt < 25_000
    ) {
      return;
    }
    try {
      const returnUrl =
        typeof window === "undefined"
          ? undefined
          : embedded
            ? window.location.href
            : `${window.location.origin}/account${
                activeSettingsTab === "security"
                  ? "?view=security"
                  : activeSettingsTab === "pricing"
                    ? "?view=pricing"
                    : ""
              }`;
      const response = await fetch("/api/billing-portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnUrl }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || typeof data?.url !== "string") return;
      setWarmedBillingPortalUrl(data.url);
      setWarmedBillingPortalAt(now);
    } catch {
      // best-effort warmup; ignore failures
    }
  }

  async function handlePricingPlanSelect(
    planName: string,
    options?: { skipTrial?: boolean }
  ) {
    if (planName !== "Essential Plus" && planName !== "Signature Pro") {
      return;
    }

    const priceId = {
      "Essential Plus": {
        monthly: BILLING_PRICE_IDS.essential_plus.monthly,
        annual: BILLING_PRICE_IDS.essential_plus.annual,
      },
      "Signature Pro": {
        monthly: BILLING_PRICE_IDS.signature_pro.monthly,
        annual: BILLING_PRICE_IDS.signature_pro.annual,
      },
    }[planName][pricingBillingPeriod];

    if (!priceId) return;

    try {
      setPricingCheckoutLoading(planName);
      setPricingMessage(null);

      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId, skipTrial: options?.skipTrial === true }),
      });

      if (res.status === 401) {
        if (typeof window !== "undefined") {
          window.location.href = embedded
            ? `/login?callbackUrl=${encodeURIComponent(window.location.href)}`
            : "/login?callbackUrl=/account?view=pricing";
        }
        return;
      }

      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || typeof data.url !== "string") {
        setPricingMessage(data.error ?? "Unable to open checkout right now.");
        return;
      }

      window.location.href = data.url;
    } catch {
      setPricingMessage("Unable to open checkout right now.");
    } finally {
      setPricingCheckoutLoading(null);
    }
  }

  async function handleNameSubmit() {
    if (nameBusy) return;
    const trimmedFirstName = firstNameValue.trim();
    const trimmedLastName = lastNameValue.trim();

    if (!trimmedFirstName || !trimmedLastName) {
      setNameMessage("First and last name are required.");
      return;
    }

    if (trimmedFirstName === savedFirstName && trimmedLastName === savedLastName) {
      setEditingNameField(null);
      setNameMessage(null);
      return;
    }

    setNameBusy(true);
    setNameMessage(null);
    try {
      const response = await fetch("/api/account/update-name", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: trimmedFirstName,
          lastName: trimmedLastName,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error ?? "Unable to update name.");
      }
      const mergedName = `${trimmedFirstName} ${trimmedLastName}`.trim();
      setSavedFirstName(trimmedFirstName);
      setSavedLastName(trimmedLastName);
      setFirstNameValue(trimmedFirstName);
      setLastNameValue(trimmedLastName);
      setEditingNameField(null);
      setNameMessage(null);
      setSuppressAccountLoader(true);
      void updateSession({ name: mergedName })
        .catch(() => {
          router.refresh();
        })
        .finally(() => {
          setSuppressAccountLoader(false);
        });
    } catch (error) {
      setNameMessage(error instanceof Error ? error.message : "Unable to update name.");
    } finally {
      setNameBusy(false);
    }
  }

  function handleAvatarClick() {
    fileInputRef.current?.click();
  }

  function handleAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setAvatarMessage(null);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setPendingAvatar(reader.result);
        setShowCropper(true);
      }
    };
    reader.onerror = () => {
      setAvatarMessage("Unable to load that image. Try a different file.");
    };
    reader.readAsDataURL(file);
  }

  useEffect(() => {
    if (!pendingAvatar) return;
    const img = new Image();
    img.src = pendingAvatar;
    img.onload = () => {
      const scale = Math.min(PREVIEW_STAGE_SIZE / img.width, PREVIEW_STAGE_SIZE / img.height);
      const width = img.width * scale;
      const height = img.height * scale;
      const offsetX = (PREVIEW_STAGE_SIZE - width) / 2;
      const offsetY = (PREVIEW_STAGE_SIZE - height) / 2;
      setDisplayMeta({ width, height, offsetX, offsetY, scale });
      const initialSize = Math.min(width, height) * 0.7;
      setCropRect({
        x: offsetX + (width - initialSize) / 2,
        y: offsetY + (height - initialSize) / 2,
        size: initialSize,
      });
    };
    img.onerror = () => {
      setAvatarMessage("Unable to open that image. Try another file.");
      setPendingAvatar(null);
      setShowCropper(false);
    };
  }, [pendingAvatar]);


  function startCropMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!cropRect) return;
    event.preventDefault();
    const startPointer = { x: event.clientX, y: event.clientY };
    const startRect = cropRect;
    const bounds = computeBounds(displayMeta);

    function onMove(e: PointerEvent) {
      const dx = e.clientX - startPointer.x;
      const dy = e.clientY - startPointer.y;
      const next = clampRectToBounds(
        { x: startRect.x + dx, y: startRect.y + dy, size: startRect.size },
        bounds
      );
      setCropRect(next);
    }

    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function startHandleResize(handle: CropHandle, event: React.PointerEvent<HTMLSpanElement>) {
    if (!cropRect) return;
    event.preventDefault();
    event.stopPropagation();
    const startPointer = { x: event.clientX, y: event.clientY };
    const startRect = cropRect;
    const bounds = computeBounds(displayMeta);

    function onMove(e: PointerEvent) {
      const dx = e.clientX - startPointer.x;
      const dy = e.clientY - startPointer.y;
      const next = resizeRectByHandle(handle, startRect, dx, dy, bounds);
      setCropRect(next);
    }

    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function handleCropCancel() {
    setShowCropper(false);
    setPendingAvatar(null);
    setDisplayMeta(null);
    setCropRect(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleCropConfirm() {
    if (!pendingAvatar || !displayMeta || !cropRect) return;
    setAvatarBusy(true);
    const image = new Image();
    image.src = pendingAvatar;
    image.onload = async () => {
      try {
      const canvasSize = 512;
      const canvas = document.createElement("canvas");
      canvas.width = canvasSize;
      canvas.height = canvasSize;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        setAvatarBusy(false);
        setAvatarMessage("Could not create a preview. Try again.");
        return;
      }
      ctx.save();
      ctx.beginPath();
      ctx.arc(canvasSize / 2, canvasSize / 2, canvasSize / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();

      const cropX = (cropRect.x - displayMeta.offsetX) / displayMeta.scale;
      const cropY = (cropRect.y - displayMeta.offsetY) / displayMeta.scale;
      const cropSize = cropRect.size / displayMeta.scale;

      ctx.drawImage(image, cropX, cropY, cropSize, cropSize, 0, 0, canvasSize, canvasSize);
      ctx.restore();

      const dataUrl = canvas.toDataURL("image/png");
      const response = await fetch("/api/account/update-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: dataUrl }),
      });
      if (!response.ok) {
        throw new Error("Unable to save photo. Please try again.");
      }

      setAvatar(dataUrl);
      setAvatarBusy(false);
      setAvatarMessage("Profile photo updated.");
      setShowCropper(false);
      setPendingAvatar(null);
      setDisplayMeta(null);
      setCropRect(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      } catch (error) {
        setAvatarBusy(false);
        setAvatarMessage(
          error instanceof Error ? error.message : "Unable to update your avatar right now."
        );
      }
    };
    image.onerror = () => {
      setAvatarBusy(false);
      setAvatarMessage("Unable to process that photo. Try a different file.");
    };
  }

  async function handleAvatarReset() {
    try {
      setAvatarBusy(true);
      const response = await fetch("/api/account/update-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: "" }),
      });
      if (!response.ok) {
        throw new Error("Unable to remove avatar.");
      }
      clearAvatar();
      setAvatarMessage("Reverted to the default avatar.");
    } catch (error) {
      setAvatarMessage(
        error instanceof Error ? error.message : "Unable to update your avatar right now."
      );
    } finally {
      setAvatarBusy(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function handlePasswordSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPasswordMessage(null);
    setPasswordSubmitAttempted(true);

    if (!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      setPasswordMessage("Please fill in all password fields.");
      return;
    }

    if (currentPassword.length < 8) {
      setPasswordMessage("Enter your current password.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage("The new passwords you entered do not match.");
      return;
    }
    if (!meetsPasswordPolicy(newPassword)) {
      setPasswordMessage(NEW_PASSWORD_REQUIREMENTS_ERROR);
      return;
    }

    setPasswordBusy(true);
    try {
      const response = await fetch("/api/account/update-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to update password.");
      }
      setPasswordMessage("Password updated.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSubmitAttempted(false);
    } catch (error) {
      setPasswordMessage(
        error instanceof Error ? error.message : "Unable to update password. Please try again."
      );
    } finally {
      setPasswordBusy(false);
    }
  }

  function resetTwoFactorModalState() {
    setTwoFactorStep("select");
    setTwoFactorCodeDigits(Array(6).fill(""));
    setTwoFactorError(null);
    setTwoFactorMessage(null);
    setTwoFactorResendCooldown(0);
    setTwoFactorBusy(false);
  }

  function openEnableTwoFactor() {
    resetTwoFactorModalState();
    setTwoFactorModalMode("enable");
    void requestTwoFactorCode("enable");
  }

  function openDisableTwoFactor() {
    if (!twoFactorMethod) {
      openEnableTwoFactor();
      return;
    }
    resetTwoFactorModalState();
    setTwoFactorModalMode("disable");
    void requestTwoFactorCode("disable");
  }

  async function requestTwoFactorCode(mode: "enable" | "disable") {
    setTwoFactorBusy(true);
    setTwoFactorError(null);
    setTwoFactorMessage(null);
    try {
      const response = await fetch("/api/account/two-factor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: mode,
          method: "email",
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.ok) {
        const code = data?.code as string | undefined;
        if (code === "PHONE_REQUIRED") {
          setTwoFactorError("Enter a phone number to use SMS verification.");
        } else if (code === "SMS_NOT_CONFIGURED") {
          setTwoFactorError("SMS verification isn’t available right now. Choose email instead.");
        } else if (code === "EMAIL_MISSING") {
          setTwoFactorError("We could not find an email address for your account.");
        } else {
          setTwoFactorError(
            data?.message ?? "We couldn’t send your verification code. Please try again."
          );
        }
        return;
      }
      setTwoFactorStep("verify");
      setTwoFactorCodeDigits(Array(6).fill(""));
      setTwoFactorMessage(
        mode === "disable"
          ? "We sent a 6-digit code to your email. Enter it below to turn off 2FA."
          : "We sent a 6-digit code to your email. Enter it below to turn on 2FA."
      );
      setTwoFactorResendCooldown(25);
      setTimeout(() => {
        twoFactorCodeRefs.current[0]?.focus();
      }, 0);
    } catch {
      setTwoFactorError("We couldn’t send your verification code. Please try again.");
    } finally {
      setTwoFactorBusy(false);
    }
  }

  function updateTwoFactorCodeDigit(index: number, value: string) {
    setTwoFactorCodeDigits((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  function focusTwoFactorCodeIndex(index: number) {
    twoFactorCodeRefs.current[index]?.focus();
  }

  async function handleConfirmTwoFactor() {
    if (twoFactorStep === "select") {
      if (twoFactorModalMode === "enable") {
        await requestTwoFactorCode("enable");
      } else if (twoFactorModalMode === "disable") {
        await requestTwoFactorCode("disable");
      }
      return;
    }

    const code = twoFactorCodeDigits.join("").trim();
    if (!/^\d{6}$/.test(code)) {
      setTwoFactorError("Enter the 6-digit code.");
      return;
    }

    setTwoFactorBusy(true);
    setTwoFactorError(null);
    try {
      const response = await fetch("/api/account/two-factor/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: "email",
          action: twoFactorModalMode,
          code,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.ok) {
        const code = data?.code as string | undefined;
        if (code === "invalid_code") {
          setTwoFactorError("That code doesn’t match. Try again.");
        } else if (code === "expired") {
          setTwoFactorError("That code has expired. Request a new one.");
        } else {
          setTwoFactorError(data?.message ?? "Verification failed. Please try again.");
        }
        return;
      }

      if (twoFactorModalMode === "disable") {
        setTwoFactorMethod(null);
        try {
          await updateSession({
            twoFactorEnabled: false,
            twoFactorPassed: true,
            twoFactorMethod: null,
          });
        } catch {
          // Keep the local UI responsive even if the auth token refresh lags.
        }
      } else {
        setTwoFactorMethod("email");
        try {
          await updateSession({
            twoFactorEnabled: true,
            twoFactorPassed: true,
            twoFactorMethod: "email",
          });
        } catch {
          // Keep the local UI responsive even if the auth token refresh lags.
        }
      }
      resetTwoFactorModalState();
      setTwoFactorModalMode(null);
    } catch {
      setTwoFactorError("Verification failed. Please try again.");
    } finally {
      setTwoFactorBusy(false);
    }
  }

  async function handleConfirmDeleteAccount() {
    setDeleteError(null);
    if (!deleteReason) {
      setDeleteError("Select a reason for deleting your account.");
      return;
    }
    if (!managedByGoogle && deletePassword.trim().length === 0) {
      setDeleteError("Enter your current password to delete your account.");
      return;
    }
    setDeleteBusy(true);
    try {
      const response = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: managedByGoogle ? "" : deletePassword,
          reason: deleteReason,
          reasonDetail: "",
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "Unable to delete your account right now.");
      }
      await signOut({ redirect: false });
      window.location.assign("/login?deleted=1");
    } catch (error) {
      if (error instanceof Error && /unauthorized/i.test(error.message)) {
        await signOut({ redirect: false });
        window.location.assign("/login");
        return;
      }
      setDeleteError(
        error instanceof Error ? error.message : "Unable to delete your account right now."
      );
      setDeleteBusy(false);
      setDeleteModalMode("confirm");
    }
  }

  async function handleDeleteAccountClick() {
    const requestId = (deleteCheckRequestRef.current ?? 0) + 1;
    deleteCheckRequestRef.current = requestId;
    setDeleteError(null);
    setDeleteReason("");
    setDeleteReasonMenuOpen(false);
    setDeletePassword("");
    setDeleteModalOpen(true);
    setDeleteModalMode("checking");
    setDeleteBillingInfo(null);
    setDeleteChecking(true);
    setDeleteDeleting(false);

    try {
      const response = await fetch("/api/account/delete/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await response.json().catch(() => ({}));
      if (deleteCheckRequestRef.current !== requestId) {
        return;
      }
      if (!response.ok || !data?.ok) {
        if (response.status === 401) {
          await signOut({ redirect: false });
          window.location.assign("/login");
          return;
        }
        throw new Error(data?.error ?? "Unable to check your subscription right now.");
      }
      if (data.requiresBillingAction) {
        setDeleteBillingInfo({
          title: typeof data.title === "string" ? data.title : "Cancel your plan first",
          message:
            typeof data.message === "string"
              ? data.message
              : "Please cancel your subscription or trial in Billing before deleting your account.",
        });
        setDeleteModalMode("billing");
      } else {
        setDeleteModalMode(managedByGoogle ? "google" : "confirm");
      }
    } catch (error) {
      if (deleteCheckRequestRef.current !== requestId) {
        return;
      }
      setDeleteError(
        error instanceof Error ? error.message : "Unable to check your subscription right now."
      );
      setDeleteModalMode("checking");
    } finally {
      if (deleteCheckRequestRef.current === requestId) {
        setDeleteChecking(false);
      }
    }
  }

  function closeDeleteModal() {
    deleteCheckRequestRef.current = null;
    setDeleteModalOpen(false);
    setDeleteModalMode(null);
    setDeleteBillingInfo(null);
    setDeleteReasonMenuOpen(false);
    setDeleteReason("");
    setDeletePasswordVisible(false);
    setDeleteError(null);
    setDeletePassword("");
    setDeleteChecking(false);
    setDeleteDeleting(false);
  }

  return (
    <main
      className={`box-border flex w-full flex-col overflow-y-auto overscroll-y-contain bg-white px-4 pt-[calc(3.5rem+env(safe-area-inset-top))] pb-[calc(5rem+env(safe-area-inset-bottom))] scroll-pt-[calc(3.5rem+env(safe-area-inset-top))] scroll-pb-[calc(5rem+env(safe-area-inset-bottom))] text-slate-900 dark:bg-[#252525] dark:text-zinc-100 ${
        embedded ? "lg:bg-slate-100 lg:px-0 lg:pt-6 lg:pb-0 lg:scroll-pt-0 lg:scroll-pb-0" : "lg:bg-slate-100 lg:px-0 lg:pt-6 lg:pb-6 lg:overflow-visible lg:scroll-pt-0 lg:scroll-pb-0"
      }`}
      style={{ scrollbarGutter: "stable both-edges" }}
    >
      <div
        className={`flex w-full flex-col ${
          embedded ? "lg:bg-transparent" : "mx-auto max-w-[var(--shell-content-width)]"
        }`}
      >
        <div className="account-settings-home-intro fixed inset-x-0 top-0 z-30 border-b border-gray-300 bg-slate-100 px-4 py-3 dark:border-[#4A4A4A] dark:bg-[#252525] lg:static lg:inset-auto lg:mx-0 lg:mb-6 lg:border-0 lg:bg-transparent lg:px-0 lg:py-0">
          <div
            className="mx-auto flex w-full items-center justify-between gap-3 lg:grid lg:grid-cols-[280px_minmax(0,1fr)] lg:items-center lg:justify-start lg:gap-5"
            style={{ maxWidth: desktopSettingsMaxWidth }}
          >
            <div className="min-w-0 flex items-center gap-3 lg:min-w-0">
              <button
                type="button"
                onClick={() => {
                  if (mobileSettingsView !== "home") {
                    setMobileSettingsView("home");
                    if (embedded && typeof window !== "undefined") {
                      const nextUrl = new URL(window.location.href);
                      nextUrl.searchParams.set("panel", "account");
                      nextUrl.searchParams.set("settingsView", "home");
                      router.replace(`${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);
                    } else if (typeof window !== "undefined") {
                      window.history.pushState(window.history.state, "", "/account");
                    }
                    return;
                  }
                  if (embedded) {
                    onClose?.();
                    return;
                  }
                  router.push("/");
                }}
                className="inline-flex h-9 w-9 items-center justify-center text-gray-700 transition hover:text-gray-900 dark:text-zinc-100 dark:hover:text-white"
                aria-label={mobileSettingsView === "home" ? "Back to home" : "Back to settings home"}
              >
                <MoveLeft className="h-6 w-6 stroke-[2.75]" aria-hidden />
              </button>
                <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-zinc-100">
                  {mobileSettingsView === "home"
                    ? "Account settings"
                    : activeSettingsTab === "security"
                      ? "Security"
                      : activeSettingsTab === "pricing"
                      ? "Plans & pricing"
                      : "Personal details"}
              </h1>
            </div>
            <div className="hidden shrink-0 items-center gap-3 lg:flex lg:justify-self-end">
              <button
                type="button"
                onClick={() => {
                  router.push("/support");
                }}
                className="whitespace-nowrap text-base font-medium text-gray-900 transition hover:text-black dark:text-zinc-100 dark:hover:text-white"
              >
                Contact us
              </button>
              <span className="h-7 w-[1.5px] bg-gray-300 dark:bg-white/30" aria-hidden />
              <SettingsMenu
                trigger="custom"
                triggerLabel="Open profile menu"
                triggerClassName="w-[224px] min-w-[224px] max-w-[224px] overflow-hidden flex h-11 items-center gap-1.5 rounded-full border border-[#E5E7EB] bg-white py-1.5 pl-1 pr-1.5 shadow-sm transition-[transform,background-color,border-color,box-shadow] duration-200 hover:-translate-y-[1px] hover:border-slate-300 hover:bg-slate-50 hover:shadow-[0_12px_24px_rgba(15,23,42,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6C47FF]/30 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-100 dark:border-[#3F3F3F] dark:bg-[#323232] dark:shadow-[0_1px_0_rgba(255,255,255,0.02),0_8px_18px_rgba(0,0,0,0.24)] dark:hover:border-[#4A4A4A] dark:hover:bg-[#2B2B2B] dark:hover:shadow-[0_12px_24px_rgba(0,0,0,0.34)] dark:focus-visible:ring-offset-[#252525]"
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
                      ) : showProfileSkeleton ? (
                        <span className="flex h-8 w-8 rounded-full bg-slate-200 skeleton-shimmer dark:bg-[#3A3A3A]" />
                      ) : (
                        <span
                          className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold uppercase text-white"
                          style={{ backgroundColor: fallbackAvatar.color }}
                        >
                          {fallbackAvatar.initials}
                        </span>
                      )}
                    </span>
                    {showProfileSkeleton ? (
                      <span className="flex min-w-0 flex-1 flex-col gap-1 text-left">
                        <span className="h-3.5 w-28 rounded-full bg-slate-200 skeleton-shimmer dark:bg-[#3A3A3A]" />
                        <span className="h-3 w-36 rounded-full bg-slate-200 skeleton-shimmer dark:bg-[#3A3A3A]" />
                      </span>
                    ) : (
                      <span className="flex min-w-0 flex-1 flex-col leading-tight text-left">
                        <span className="truncate text-[13px] font-semibold text-[#1F2A37] dark:text-zinc-100">
                          {accountName}
                        </span>
                        {accountEmail ? (
                          <span className="truncate text-[11px] font-medium text-[#64748B] dark:text-zinc-400">
                            {accountEmail}
                          </span>
                        ) : null}
                      </span>
                    )}
                    <ChevronDown className="h-4 w-4 shrink-0 text-[#94A3B8] dark:text-zinc-400" aria-hidden="true" />
                  </>
                }
              />
            </div>
          </div>
        </div>
        {mobileSettingsView === "home" ? (
          <div className="account-settings-home-intro bg-white pt-2 dark:bg-[#252525] lg:hidden">
            <div className="-mt-px dark:border-[#4A4A4A]">
              <button
                type="button"
                onClick={() => {
                  openMobileSettingsTab("account");
                }}
                className="account-settings-stagger-item relative flex w-full items-start justify-between border-b border-gray-300 px-4 py-[17px] text-left text-gray-800 transition duration-150 motion-safe:active:scale-[0.99] active:bg-gray-100 active:text-gray-900 last:border-b-0 hover:bg-gray-50 hover:text-gray-900 dark:border-[#4A4A4A] dark:text-zinc-300 dark:active:bg-[#3F3F3F] dark:active:text-zinc-100 dark:hover:bg-[#3A3A3A] dark:hover:text-zinc-100"
              >
                <span className="flex items-start gap-3">
                  <User className="mt-0.5 h-5 w-5 text-gray-600 dark:text-zinc-400" aria-hidden />
                  <span className="flex flex-col gap-1">
                    <span className="text-[16px] font-semibold tracking-tight">Personal details</span>
                    <span className="text-[12.5px] leading-4 text-gray-500 dark:text-zinc-400">
                      Name, email, and profile info
                    </span>
                  </span>
                </span>
                <ChevronRight className="mt-1.5 h-4 w-4 text-current opacity-70" aria-hidden />
              </button>

              <button
                type="button"
                onClick={() => {
                  openMobileSettingsTab("security");
                }}
                className="account-settings-stagger-item relative flex w-full items-start justify-between border-b border-gray-300 px-4 py-[17px] text-left text-gray-800 transition duration-150 motion-safe:active:scale-[0.99] active:bg-gray-100 active:text-gray-900 last:border-b-0 hover:bg-gray-50 hover:text-gray-900 dark:border-[#4A4A4A] dark:text-zinc-300 dark:active:bg-[#3F3F3F] dark:active:text-zinc-100 dark:hover:bg-[#3A3A3A] dark:hover:text-zinc-100"
              >
                <span className="flex items-start gap-3">
                  <Lock className="mt-0.5 h-5 w-5 stroke-[2.2] text-gray-600 dark:text-zinc-400" aria-hidden />
                  <span className="flex flex-col gap-1">
                    <span className="text-[16px] font-semibold tracking-tight">Security</span>
                    <span className="text-[12.5px] leading-4 text-gray-500 dark:text-zinc-400">
                      Password and 2FA settings
                    </span>
                  </span>
                </span>
                <ChevronRight className="mt-1.5 h-4 w-4 text-current opacity-70" aria-hidden />
              </button>

              <button
                type="button"
                onClick={() => {
                  openMobileSettingsTab("pricing");
                }}
                className="account-settings-stagger-item relative flex w-full items-start justify-between border-b border-gray-300 px-4 py-[17px] text-left text-gray-800 transition duration-150 motion-safe:active:scale-[0.99] active:bg-gray-100 active:text-gray-900 last:border-b-0 hover:bg-gray-50 hover:text-gray-900 dark:border-[#4A4A4A] dark:text-zinc-300 dark:active:bg-[#3F3F3F] dark:active:text-zinc-100 dark:hover:bg-[#3A3A3A] dark:hover:text-zinc-100"
              >
                <span className="flex items-start gap-3">
                  <span className="relative mt-0.5 h-5 w-5 text-gray-600 dark:text-zinc-400" aria-hidden>
                    <Star className="h-5 w-5 stroke-[2.2]" />
                    <Smile className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 stroke-[2.4]" />
                  </span>
                  <span className="flex flex-col gap-1">
                    <span className="text-[16px] font-semibold tracking-tight">Plans &amp; pricing</span>
                    <span className="text-[12.5px] leading-4 text-gray-500 dark:text-zinc-400">
                      View or change your plan
                    </span>
                  </span>
                </span>
                <ChevronRight className="mt-1.5 h-4 w-4 text-current opacity-70" aria-hidden />
              </button>

              <button
                type="button"
                onClick={() => {
                  void openBillingPortal();
                }}
                disabled={billingPortalLoading}
                className="account-settings-stagger-item relative flex w-full items-start justify-between border-b border-gray-300 px-4 py-[17px] text-left text-gray-800 transition duration-150 motion-safe:active:scale-[0.99] active:bg-gray-100 active:text-gray-900 last:border-b-0 hover:bg-gray-50 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#4A4A4A] dark:text-zinc-300 dark:active:bg-[#3F3F3F] dark:active:text-zinc-100 dark:hover:bg-[#3A3A3A] dark:hover:text-zinc-100"
              >
                <span className="flex items-start gap-3">
                  <CreditCard className="mt-0.5 h-5 w-5 text-gray-600 stroke-[2.2] dark:text-zinc-400" aria-hidden />
                  <span className="flex flex-col gap-1">
                    <span className="text-[16px] font-semibold tracking-tight">Billing portal</span>
                    <span className="text-[12.5px] leading-4 text-gray-500 dark:text-zinc-400">
                      View invoices and billing information
                    </span>
                  </span>
                </span>
                <ChevronRight className="mt-1.5 h-4 w-4 text-current opacity-70" aria-hidden />
              </button>

              <button
                type="button"
                onClick={() => {
                  router.push("/support");
                }}
                className="account-settings-stagger-item relative flex w-full items-start justify-between border-b border-gray-300 px-4 py-[17px] text-left text-gray-800 transition duration-150 motion-safe:active:scale-[0.99] active:bg-gray-100 active:text-gray-900 last:border-b-0 hover:bg-gray-50 hover:text-gray-900 dark:border-[#4A4A4A] dark:text-zinc-300 dark:active:bg-[#3F3F3F] dark:active:text-zinc-100 dark:hover:bg-[#3A3A3A] dark:hover:text-zinc-100"
              >
                <span className="flex items-start gap-3">
                  <Send className="mt-0.5 h-5 w-5 text-gray-600 stroke-[2.2] dark:text-zinc-400" aria-hidden />
                  <span className="flex flex-col gap-1">
                    <span className="text-[16px] font-semibold tracking-tight">Contact us</span>
                    <span className="text-[12.5px] leading-4 text-gray-500 dark:text-zinc-400">
                      Message support for account help
                    </span>
                  </span>
                </span>
                <ChevronRight className="mt-1.5 h-4 w-4 text-current opacity-70" aria-hidden />
              </button>

              <button
                type="button"
                onClick={() => {
                  router.push("/support");
                }}
                className="account-settings-stagger-item relative flex w-full items-start justify-between border-b border-gray-300 px-4 py-[17px] text-left text-gray-800 transition duration-150 motion-safe:active:scale-[0.99] active:bg-gray-100 active:text-gray-900 last:border-b-0 hover:bg-gray-50 hover:text-gray-900 dark:border-[#4A4A4A] dark:text-zinc-300 dark:active:bg-[#3F3F3F] dark:active:text-zinc-100 dark:hover:bg-[#3A3A3A] dark:hover:text-zinc-100"
              >
                <span className="flex items-start gap-3">
                  <ExternalLink className="mt-0.5 h-5 w-5 text-gray-600 stroke-[2.2] dark:text-zinc-400" aria-hidden />
                  <span className="flex flex-col gap-1">
                    <span className="text-[16px] font-semibold tracking-tight">Help center</span>
                    <span className="text-[12.5px] leading-4 text-gray-500 dark:text-zinc-400">
                      Read guides and common answers
                    </span>
                  </span>
                </span>
                <ChevronRight className="mt-1.5 h-4 w-4 text-current opacity-70" aria-hidden />
              </button>

              <div className="account-settings-stagger-item mt-3 px-4 pt-2 text-xs font-medium text-gray-500 dark:text-zinc-400">
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                  <Link href="/terms" className="transition hover:text-gray-700 dark:hover:text-zinc-200">
                    Terms of Service
                  </Link>
                  <Link href="/privacy" className="transition hover:text-gray-700 dark:hover:text-zinc-200">
                    Privacy Policy
                  </Link>
                </div>
              </div>
          </div>
          </div>
        ) : null}

        <div
          className={`lg:mx-auto lg:flex lg:h-full lg:min-h-0 lg:w-full lg:flex-col ${mobileSettingsView === "home" ? "hidden lg:block" : "block"}`}
          style={{ maxWidth: desktopSettingsMaxWidth }}
        >
          <div className="hidden w-full gap-6 lg:grid lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start">
          <aside className="hidden self-start rounded-2xl border-[1.5px] border-gray-200 bg-white p-4 shadow-sm lg:sticky lg:top-6 lg:block dark:border-[#3F3F3F] dark:bg-[#323232] dark:shadow-[0_8px_22px_rgba(0,0,0,0.28),0_24px_52px_rgba(0,0,0,0.24)]">
            <nav className="space-y-1">
              <button
                type="button"
                onClick={() => {
                  switchSettingsTab("account");
                }}
                className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${
                  activeSettingsTab === "account"
                    ? "bg-[rgba(108,71,255,0.10)] text-[#5B38E6] dark:bg-[#2B2B2B] dark:text-white"
                    : "text-gray-800 hover:bg-gray-50 hover:text-gray-900 dark:text-zinc-300 dark:hover:bg-[#3A3A3A] dark:hover:text-zinc-100"
                }`}
              >
                <User
                  className={`h-5 w-5 ${activeSettingsTab === "account" ? "text-[#5B38E6] dark:text-white" : "text-gray-600 dark:text-zinc-400"}`}
                  aria-hidden
                />
                <span>Personal details</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  switchSettingsTab("security");
                }}
                className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${
                  activeSettingsTab === "security"
                    ? "bg-[rgba(108,71,255,0.10)] text-[#5B38E6] dark:bg-[#2B2B2B] dark:text-white"
                    : "text-gray-800 hover:bg-gray-50 hover:text-gray-900 dark:text-zinc-300 dark:hover:bg-[#3A3A3A] dark:hover:text-zinc-100"
                }`}
              >
                <Lock
                  className={`h-5 w-5 stroke-[2.2] ${activeSettingsTab === "security" ? "text-[#5B38E6] dark:text-white" : "text-gray-600 dark:text-zinc-400"}`}
                  aria-hidden
                />
                <span>Security</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  switchSettingsTab("pricing");
                }}
                className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${
                  activeSettingsTab === "pricing"
                    ? "bg-[rgba(108,71,255,0.10)] text-[#5B38E6] dark:bg-[#2B2B2B] dark:text-white"
                    : "text-gray-800 hover:bg-gray-50 hover:text-gray-900 dark:text-zinc-300 dark:hover:bg-[#3A3A3A] dark:hover:text-zinc-100"
                }`}
                >
                  <span
                  className={`relative h-5 w-5 ${activeSettingsTab === "pricing" ? "text-[#5B38E6] dark:text-white" : "text-gray-600 dark:text-zinc-400"}`}
                  aria-hidden
                >
                  <Star className="h-5 w-5 stroke-[2.2]" />
                  <Smile className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 stroke-[2.4]" />
                </span>
                <span>Plans &amp; pricing</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  void openBillingPortal();
                }}
                onMouseEnter={() => {
                  void warmBillingPortal();
                }}
                onFocus={() => {
                  void warmBillingPortal();
                }}
                disabled={billingPortalLoading}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-gray-800 transition hover:bg-gray-50 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-60 dark:text-zinc-300 dark:hover:bg-[#3A3A3A] dark:hover:text-zinc-100"
              >
                <CreditCard className="h-5 w-5 text-gray-600 stroke-[2.2] dark:text-zinc-400" aria-hidden />
                <span>Billing portal</span>
              </button>
              {billingPortalError ? (
                <p className="px-3 text-xs font-medium text-rose-600 dark:text-rose-400">{billingPortalError}</p>
              ) : null}
            </nav>
            <div className="mt-4 border-t border-gray-200 pt-4 dark:border-[#3F3F3F]">
              <div className="space-y-1.5">
                <a
                  href="https://www.tiktok.com/@mergify.pdf"
                  target="_blank"
                  rel="noreferrer"
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-gray-800 transition hover:bg-gray-50 hover:text-gray-900 dark:text-zinc-300 dark:hover:bg-[#3A3A3A] dark:hover:text-zinc-100"
                  aria-label="MergifyPDF on TikTok"
                >
                  <span className="h-5 w-5 text-gray-600 dark:text-zinc-400">
                    <TikTokIcon />
                  </span>
                  <span>TikTok</span>
                </a>
                <a
                  href="https://www.instagram.com/mergifypdf/"
                  target="_blank"
                  rel="noreferrer"
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-gray-800 transition hover:bg-gray-50 hover:text-gray-900 dark:text-zinc-300 dark:hover:bg-[#3A3A3A] dark:hover:text-zinc-100"
                  aria-label="MergifyPDF on Instagram"
                >
                  <span className="h-5 w-5 text-gray-600 dark:text-zinc-400">
                    <InstagramIcon />
                  </span>
                  <span>Instagram</span>
                </a>
                <a
                  href="https://x.com/MergifyPDF"
                  target="_blank"
                  rel="noreferrer"
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-gray-800 transition hover:bg-gray-50 hover:text-gray-900 dark:text-zinc-300 dark:hover:bg-[#3A3A3A] dark:hover:text-zinc-100"
                  aria-label="MergifyPDF on X"
                >
                  <span className="h-5 w-5 text-gray-600 dark:text-zinc-400">
                    <XIcon />
                  </span>
                  <span>X</span>
                </a>
              </div>
            </div>
            <div className="mt-4 border-t border-gray-200 pt-4 dark:border-[#3F3F3F]">
              <div className="flex flex-col gap-1">
                <Link
                  href="/terms"
                  className="rounded-xl px-3 py-2.5 text-sm font-semibold text-gray-800 transition hover:bg-gray-50 hover:text-gray-900 dark:text-zinc-300 dark:hover:bg-[#3A3A3A] dark:hover:text-zinc-100"
                >
                  Terms of Service
                </Link>
                <Link
                  href="/privacy"
                  className="rounded-xl px-3 py-2.5 text-sm font-semibold text-gray-800 transition hover:bg-gray-50 hover:text-gray-900 dark:text-zinc-300 dark:hover:bg-[#3A3A3A] dark:hover:text-zinc-100"
                >
                  Privacy Policy
                </Link>
              </div>
            </div>
          </aside>

          <div
            key={activeSettingsTab}
            className="account-settings-content-pane flex w-full flex-col bg-white p-6 dark:bg-[#323232] lg:overflow-y-auto lg:rounded-2xl lg:border-[1.5px] lg:border-gray-200 lg:bg-white lg:shadow-sm lg:dark:border-[#3F3F3F] lg:dark:bg-[#323232] lg:dark:shadow-[0_8px_22px_rgba(0,0,0,0.28),0_24px_52px_rgba(0,0,0,0.24)] xl:p-7"
          >
            {activeSettingsTab === "pricing" ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <h2 className="text-3xl font-semibold tracking-tight text-gray-900 dark:text-zinc-100">
                  Plans & pricing
                </h2>
                <div className="flex flex-col items-start gap-2 text-sm text-gray-600 dark:text-zinc-400 sm:items-end sm:text-right">
                  {pricingTrialStatus?.stripeCustomerId ? (
                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                      <span className="text-gray-500 dark:text-zinc-500">Billing ID:</span>
                      <span className="font-mono font-semibold text-gray-900 dark:text-zinc-100">
                        {pricingTrialStatus.stripeCustomerId}
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : (
              <h2 className="text-3xl font-semibold tracking-tight text-gray-900 dark:text-zinc-100">
                {activeSettingsTab === "security" ? "Security" : "Personal details"}
              </h2>
            )}

          {activeSettingsTab === "account" ? (
          <>
          <section className="pt-6">
        <dl className="mt-4 grid gap-x-6 gap-y-4 md:grid-cols-2">
          <div className="min-w-0">
            <dt className="text-sm font-medium text-gray-700 dark:text-zinc-300">First name</dt>
            {editingNameField === "first" ? (
              <div className="inline-fade-in-soft mt-2">
                <input
                  value={firstNameValue}
                  onChange={(event) => {
                    setFirstNameValue(event.target.value);
                    if (nameMessage) setNameMessage(null);
                  }}
                  autoComplete="given-name"
                  className="w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6C47FF]/35 dark:border-[#3F3F3F] dark:bg-[#2B2B2B] dark:text-zinc-100"
                />
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      void handleNameSubmit();
                    }}
                    disabled={nameBusy || isNameMissing}
                    className="rounded-md bg-[#6C47FF] px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-[#5B38E6] disabled:opacity-60"
                  >
                    {nameBusy ? "Saving..." : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={() => cancelNameEditor("first")}
                    className="rounded-md px-2.5 py-1.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-100 hover:text-gray-800 dark:text-zinc-400 dark:hover:bg-[#3A3A3A] dark:hover:text-zinc-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-1 flex items-center justify-between gap-2">
                {showNameSkeleton ? (
                  <div className="flex w-full items-center justify-between gap-2">
                    <dd className="h-5 w-40 rounded-full bg-slate-200 skeleton-shimmer dark:bg-[#3A3A3A]" />
                    <div className="h-8 w-16 rounded-lg bg-slate-200 skeleton-shimmer dark:bg-[#3A3A3A]" />
                  </div>
                ) : (
                  <>
                    <dd className="text-base text-gray-900 dark:text-zinc-100">{firstNameValue || ""}</dd>
                    <button
                      type="button"
                      onClick={() => openNameEditor("first")}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-2.5 py-1.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-200 dark:bg-[#2B2B2B] dark:text-zinc-200 dark:hover:bg-[#3A3A3A]"
                      aria-label="Edit first name"
                    >
                      <PencilLine className="h-3.5 w-3.5" aria-hidden />
                      <span>Edit</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="min-w-0">
            <dt className="text-sm font-medium text-gray-700 dark:text-zinc-300">Last name</dt>
            {editingNameField === "last" ? (
              <div className="inline-fade-in-soft mt-2">
                <input
                  value={lastNameValue}
                  onChange={(event) => {
                    setLastNameValue(event.target.value);
                    if (nameMessage) setNameMessage(null);
                  }}
                  autoComplete="family-name"
                  className="w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6C47FF]/35 dark:border-[#3F3F3F] dark:bg-[#2B2B2B] dark:text-zinc-100"
                />
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      void handleNameSubmit();
                    }}
                    disabled={nameBusy || isNameMissing}
                    className="rounded-md bg-[#6C47FF] px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-[#5B38E6] disabled:opacity-60"
                  >
                    {nameBusy ? "Saving..." : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={() => cancelNameEditor("last")}
                    className="rounded-md px-2.5 py-1.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-100 hover:text-gray-800 dark:text-zinc-400 dark:hover:bg-[#3A3A3A] dark:hover:text-zinc-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-1 flex items-center justify-between gap-2">
                {showNameSkeleton ? (
                  <div className="flex w-full items-center justify-between gap-2">
                    <dd className="h-5 w-44 rounded-full bg-slate-200 skeleton-shimmer dark:bg-[#3A3A3A]" />
                    <div className="h-8 w-16 rounded-lg bg-slate-200 skeleton-shimmer dark:bg-[#3A3A3A]" />
                  </div>
                ) : (
                  <>
                    <dd className="text-base text-gray-900 dark:text-zinc-100">{lastNameValue || ""}</dd>
                    <button
                      type="button"
                      onClick={() => openNameEditor("last")}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-2.5 py-1.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-200 dark:bg-[#2B2B2B] dark:text-zinc-200 dark:hover:bg-[#3A3A3A]"
                      aria-label="Edit last name"
                    >
                      <PencilLine className="h-3.5 w-3.5" aria-hidden />
                      <span>Edit</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="col-span-full border-t border-gray-200 pt-4 dark:border-[#3F3F3F]" />

          <div className="min-w-0">
            <dt className="text-sm font-medium text-gray-700 dark:text-zinc-300">Email</dt>
            <dd className="mt-1 text-sm text-gray-800 dark:text-zinc-200">{email || ""}</dd>
          </div>

        </dl>
        {nameMessage ? <p className="mt-2 text-sm text-rose-600 dark:text-rose-400">{nameMessage}</p> : null}
        </section>

        <section className="mt-8 border-t border-gray-200 pt-6 dark:border-[#3F3F3F]">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-slate-600 dark:text-zinc-400" aria-hidden />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-zinc-100">Change email</h2>
          </div>
          {canManageEmail ? (
          <>
            <form onSubmit={emailStep === "request" ? handleEmailRequest : handleEmailVerify} noValidate className="mt-4 space-y-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300" htmlFor="account-email">
                New email address
              </label>
              <input
                id="account-email"
                type="email"
                value={newEmail}
                onChange={(event) => setNewEmail(event.target.value)}
                required
                placeholder="name@example.com"
                readOnly={emailStep === "verify"}
                aria-readonly={emailStep === "verify"}
                className={`w-full rounded-md border bg-white px-3 py-2 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6C47FF]/35 focus-visible:ring-offset-0 read-only:cursor-not-allowed read-only:bg-gray-50 read-only:text-gray-500 dark:bg-[#2B2B2B] dark:text-zinc-100 dark:read-only:bg-[#2B2B2B]/60 dark:read-only:text-zinc-500 ${
                  emailStep === "request" && emailRequestSubmitAttempted && !newEmail.trim()
                    ? "border-rose-500 dark:border-rose-500"
                    : "border-gray-300 dark:border-[#3F3F3F]"
                }`}
              />
              {emailStep === "request" ? (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300" htmlFor="account-email-confirm">
                    Confirm email address
                  </label>
                  <input
                    id="account-email-confirm"
                    type="email"
                    value={confirmNewEmail}
                    onChange={(event) => setConfirmNewEmail(event.target.value)}
                    required
                    placeholder="Re-enter new email address"
                    className={`w-full rounded-md border bg-white px-3 py-2 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6C47FF]/35 focus-visible:ring-offset-0 dark:bg-[#2B2B2B] dark:text-zinc-100 ${
                      emailRequestSubmitAttempted && !confirmNewEmail.trim()
                        ? "border-transparent ring-2 ring-rose-600/60 dark:ring-rose-500/50"
                        : isEmailConfirmationMismatch
                          ? "border-transparent ring-2 ring-rose-600/60 dark:ring-rose-500/50"
                          : "border-gray-300 dark:border-[#3F3F3F]"
                    }`}
                  />
                  {isEmailConfirmationMismatch ? (
                    <p className="text-sm text-rose-600">Email addresses do not match.</p>
                  ) : null}
                </div>
              ) : null}
              {emailStep === "verify" ? (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-gray-800 dark:text-zinc-200">
                    Verify your identity
                  </p>
                  <p className="text-sm text-gray-600 dark:text-zinc-400">
                    Enter the 6-digit code we sent to your new email to confirm this change.
                  </p>
                  <div className="flex w-full max-w-[320px] items-center justify-between gap-2 sm:w-fit sm:max-w-none sm:gap-3">
                    {emailCodeDigits.map((digit, index) => (
                      <input
                        key={`email-code-${index}`}
                        ref={(el) => {
                          emailCodeRefs.current[index] = el;
                        }}
                        id={index === 0 ? "account-email-code" : undefined}
                        autoFocus={index === 0}
                        className="h-11 w-9 rounded-lg border-2 border-slate-300 bg-white text-center text-lg text-slate-900 outline-none transition hover:border-slate-400 focus-visible:border-[#6D6AF4] focus-visible:ring-0 dark:border-[#4A4A4A] dark:bg-[#2B2B2B] dark:text-zinc-100 dark:hover:border-[#4A4A4A] sm:h-12 sm:w-11"
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, "");
                          if (!value) {
                            updateEmailCodeDigit(index, "");
                            return;
                          }
                          updateEmailCodeDigit(index, value[0]);
                          if (index < 5) {
                            focusEmailCodeIndex(index + 1);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Backspace" && !digit && index > 0) {
                            updateEmailCodeDigit(index - 1, "");
                            focusEmailCodeIndex(index - 1);
                          }
                          if (e.key === "ArrowLeft" && index > 0) {
                            focusEmailCodeIndex(index - 1);
                          }
                          if (e.key === "ArrowRight" && index < 5) {
                            focusEmailCodeIndex(index + 1);
                          }
                        }}
                        onPaste={(e) => {
                          const pasted = e.clipboardData.getData("text").replace(/\D/g, "");
                          if (!pasted) return;
                          e.preventDefault();
                          const next = [...emailCodeDigits];
                          for (let i = 0; i < 6; i += 1) {
                            const targetIndex = index + i;
                            if (targetIndex > 5) break;
                            next[targetIndex] = pasted[i] ?? "";
                          }
                          setEmailCodeDigits(next);
                          const lastIndex = Math.min(index + pasted.length - 1, 5);
                          focusEmailCodeIndex(Math.max(lastIndex, 0));
                        }}
                        aria-label={`Digit ${index + 1}`}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
              {emailStep === "verify" && emailMessage && !emailMessage.startsWith("We sent a 6-digit code") ? (
                <p className="text-sm text-gray-600 dark:text-zinc-400">{emailMessage}</p>
              ) : null}
              {emailStep === "verify" ? (
                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={emailVerifyBusy}
                    aria-disabled={emailVerifyBusy}
                    className="rounded-md bg-[#6C47FF] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#5B38E6] disabled:opacity-60"
                  >
                    {emailVerifyBusy ? "Verifying..." : "Confirm email change"}
                  </button>
                  <button
                    type="button"
                    disabled={emailRequestBusy || emailVerifyBusy || emailResendCooldown > 0}
                    onClick={() => {
                      if (emailRequestBusy || emailVerifyBusy || emailResendCooldown > 0) return;
                      void requestEmailCode();
                    }}
                    className="rounded-md border-2 border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:-translate-y-[1px] hover:border-slate-400 hover:shadow-sm disabled:opacity-60 dark:border-[#4A4A4A] dark:bg-[#2B2B2B] dark:text-zinc-100 dark:hover:border-[#4A4A4A]"
                  >
                    {emailRequestBusy
                      ? "Sending..."
                      : emailResendCooldown > 0
                        ? `Resend code in ${emailResendCooldown}s`
                        : "Resend code"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (emailRequestBusy || emailVerifyBusy) return;
                      setEmailStep("request");
                      setNewEmail("");
                      setConfirmNewEmail("");
                      setEmailRequestSubmitAttempted(false);
                      setEmailCodeDigits(Array(6).fill(""));
                      setEmailMessage(null);
                    }}
                    className="rounded-md px-2 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-100 hover:text-gray-900 dark:text-zinc-400 dark:hover:bg-[#3A3A3A] dark:hover:text-zinc-200"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="submit"
                  disabled={emailRequestBusy || emailResendCooldown > 0 || isEmailConfirmationMismatch}
                  aria-disabled={emailRequestBusy || emailResendCooldown > 0 || isEmailConfirmationMismatch}
                  className="rounded-md bg-[#6C47FF] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#5B38E6] disabled:opacity-60"
                >
                  {emailResendCooldown > 0
                    ? `Send verification code in ${emailResendCooldown}s`
                    : emailRequestBusy
                      ? "Sending code..."
                      : "Send verification code"}
                </button>
              )}
              {emailStep === "request" && emailMessage ? (
                <p
                  className={`text-sm ${
                    emailMessage.toLowerCase().includes("updated")
                      ? "text-green-700"
                      : "text-gray-600 dark:text-zinc-400"
                  }`}
                >
                  {emailMessage}
                </p>
              ) : null}
            </form>
          </>
          ) : (
            <div className="mt-4 rounded-lg border border-[#D8C8FF] bg-[#F3EEFF] px-4 py-3">
              <p className="text-sm font-semibold text-[#5B38E6] dark:text-violet-300">
                {managedByGoogle ? "Email managed by Google" : "Email changes unavailable"}
              </p>
              {managedByGoogle ? (
                <p className="mt-1 text-sm text-[#6C47FF] dark:text-violet-200">
                  Your email is managed by Google and can&apos;t be changed here.
                </p>
              ) : (
                <p className="mt-1 text-sm text-[#6C47FF] dark:text-violet-200">
                  Your sign-in method manages your email address. Email changes are not available from this page.
                </p>
              )}
            </div>
          )}
        </section>

        <section className="mt-8 border-t border-gray-200 pt-6 dark:border-[#3F3F3F]">
          <div className="flex items-center gap-2">
            <Sun className="h-4 w-4 text-slate-600 dark:text-zinc-400" aria-hidden />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-zinc-100">Appearance</h2>
          </div>
          <p className="mt-1 text-sm text-gray-600 dark:text-zinc-400">Choose light or dark mode.</p>
          <div className="mt-4 max-w-xs">
            <div className="relative inline-flex h-11 w-[150px] items-center rounded-lg border border-gray-300 bg-white p-1 dark:border-[#3F3F3F] dark:bg-[#2B2B2B]">
              <span
                aria-hidden
                className={`absolute top-1 h-[34px] w-[70px] rounded-md bg-[#6C47FF] ${
                  theme === "dark" ? "translate-x-[72px]" : "translate-x-0"
                }`}
              />
              <button
                type="button"
                onClick={() => applyTheme("light")}
                className={`relative z-10 w-[70px] rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  theme === "light"
                    ? "text-white"
                    : "text-gray-700 hover:bg-gray-100 dark:text-zinc-300 dark:hover:bg-[#3A3A3A]"
                }`}
                aria-pressed={theme === "light"}
              >
                Light
              </button>
              <button
                type="button"
                onClick={() => applyTheme("dark")}
                className={`relative z-10 w-[70px] rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  theme === "dark"
                    ? "text-white"
                    : "text-gray-700 hover:bg-gray-100 dark:text-zinc-300 dark:hover:bg-[#3A3A3A]"
                }`}
                aria-pressed={theme === "dark"}
              >
                Dark
              </button>
            </div>
          </div>
        </section>

        </>
          ) : null}

        {activeSettingsTab === "pricing" ? (
        <>
        <div className="mt-6 border-t border-gray-200 dark:border-[#3F3F3F]" />
        <section className="mt-6 flex min-h-0 flex-1 flex-col gap-6">
          {pricingIsDelinquent ? (
            <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <p className="text-sm font-medium">
                We couldn&apos;t process your latest payment. Please update your payment method to restore access.
              </p>
            </div>
          ) : null}

          <div className="flex min-h-0 flex-1 flex-col justify-center gap-6">
            <div className="relative overflow-hidden rounded-2xl border-[1.5px] border-slate-200 bg-white shadow-sm transition-all duration-200 dark:border-[#4B4B4B] dark:bg-[#262626] dark:shadow-[0_1px_0_rgba(255,255,255,0.02),0_8px_18px_rgba(0,0,0,0.24)]">
              <div
                className={`h-1 w-full opacity-80 dark:opacity-70 ${
                  pricingIsDelinquent
                    ? "bg-gradient-to-r from-rose-500 via-rose-600 to-rose-500"
                    : billingHasCurrentPlan
                    ? "bg-gradient-to-r from-[#5EEAD4] via-[#14B8A6] to-[#5EEAD4]"
                    : "bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 dark:from-[#4A4A4A] dark:via-[#606060] dark:to-[#4A4A4A]"
                }`}
              />
              <div className="relative z-10 grid gap-6 p-5 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-center lg:gap-8 lg:p-6">
                {pricingStatusLoading ? (
                  <>
                    <div className="min-w-0 space-y-3 py-2 lg:py-3">
                      <div className="skeleton-shimmer h-6 w-32 rounded-full bg-slate-200/90 dark:bg-white/10" />
                      <div className="space-y-3">
                        <div className="skeleton-shimmer h-9 w-64 rounded-lg bg-slate-200/90 dark:bg-white/10" />
                        <div className="skeleton-shimmer h-8 w-52 rounded-lg bg-slate-200/90 dark:bg-white/10" />
                        <div className="skeleton-shimmer h-4 w-72 rounded-lg bg-slate-200/90 dark:bg-white/10" />
                      </div>
                    </div>
                    <div className="flex flex-col items-start gap-2 lg:items-end lg:justify-center">
                      <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center lg:w-auto lg:justify-end">
                        <div className="skeleton-shimmer h-10 w-32 rounded-full bg-slate-200/90 dark:bg-white/10" />
                        <div className="skeleton-shimmer h-10 w-32 rounded-full bg-slate-200/90 dark:bg-white/10" />
                      </div>
                      <div className="skeleton-shimmer h-4 w-56 rounded-lg bg-slate-200/90 dark:bg-white/10" />
                    </div>
                  </>
                ) : (
                  <>
                    <div className={`min-w-0 space-y-3 ${isTrialingPlan ? "py-2 lg:py-3" : "py-1.5 lg:py-2"}`}>
                      {billingHasCurrentPlan && !pricingIsDelinquent ? (
                        <span
                          className={`inline-flex items-center rounded-full px-4 py-1.5 text-[12px] font-semibold leading-none tracking-[0.06em] text-white shadow-sm ${
                            pricingIsDelinquent ? "bg-rose-500" : "bg-emerald-500"
                          }`}
                        >
                          <CheckCircle2 className="mr-2 h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
                          {isTrialingPlan ? "Free Trial" : "Current plan"}
                        </span>
                      ) : null}
                      <div className={isTrialingPlan ? "space-y-1.5" : "space-y-1"}>
                        <p
                          className={`text-[28px] font-bold tracking-tight ${
                            currentPlanDetails
                              ? pricingIsDelinquent
                                ? "text-rose-700 dark:text-rose-300"
                                : `bg-clip-text text-transparent ${
                                    currentPlanDetails.name === "Signature Pro"
                                      ? "bg-gradient-to-r from-purple-600 via-violet-500 to-fuchsia-500"
                                      : "bg-gradient-to-r from-sky-500 via-cyan-500 to-sky-400"
                                  }`
                              : "text-slate-900 dark:text-zinc-100"
                          }`}
                        >
                          {currentPlanDetails?.name ?? "No active plan"}
                        </p>
                        {currentPlanDetails ? (() => {
                          const currentPlanPrice =
                            currentPlanBillingPeriod === "annual"
                              ? currentPlanDetails.annualPrice
                              : currentPlanDetails.monthlyPrice;
                          const [priceAmount, priceSuffix] = currentPlanPrice.split(" per ");
                          if (isTrialingPlan) {
                            return (
                              <div className="space-y-1">
                                {currentPlanCycleLabel ? (
                                  <p
                                    className={`text-[32px] font-semibold leading-none tracking-tight ${
                                      pricingIsDelinquent
                                        ? "text-rose-700 dark:text-rose-200"
                                        : "text-gray-900 dark:text-zinc-100"
                                    }`}
                                  >
                                    {currentPlanCycleLabel}
                                  </p>
                                ) : null}
                                <p
                                  className={`text-sm font-medium leading-5 ${
                                    pricingIsDelinquent
                                      ? "text-rose-600 dark:text-rose-300"
                                      : "text-slate-500 dark:text-zinc-400"
                                  }`}
                                >
                                  Then {priceAmount} {priceSuffix ? `per ${priceSuffix}` : null}
                                </p>
                              </div>
                            );
                          }
                          return (
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                              <p
                                className={`text-[34px] font-semibold leading-none tracking-tight ${
                                  pricingIsDelinquent
                                    ? "text-rose-700 dark:text-rose-200"
                                    : "text-gray-900 dark:text-zinc-100"
                                }`}
                              >
                                {priceAmount}
                              </p>
                              {priceSuffix ? (
                                <span
                                  className={`text-sm font-medium leading-none ${
                                    pricingIsDelinquent
                                      ? "text-rose-600 dark:text-rose-300"
                                      : "text-slate-500 dark:text-zinc-400"
                                  }`}
                                >
                                  per {priceSuffix}
                                </span>
                              ) : null}
                              {currentPlanBillingPeriod === "annual" ? (
                                <span
                                  className={`basis-full text-sm font-medium leading-5 ${
                                    pricingIsDelinquent
                                      ? "text-rose-600 dark:text-rose-300"
                                      : "text-slate-500 dark:text-zinc-400"
                                  }`}
                                >
                                  Billed annually
                                </span>
                              ) : null}
                            </div>
                          );
                        })() : null}
                        {!isTrialingPlan && currentPlanCycleLabel ? (
                          <p
                            className={`mt-1 text-sm font-medium leading-5 tracking-tight ${
                              pricingIsDelinquent
                                ? "text-rose-600 dark:text-rose-300"
                                : "text-slate-600 dark:text-zinc-400"
                            }`}
                          >
                            {currentPlanCycleLabel}
                          </p>
                        ) : null}
                      </div>
                      {!billingHasCurrentPlan ? (
                        <p className="max-w-xl text-sm leading-6 text-gray-600 dark:text-zinc-400">
                          Manage billing settings or choose a plan below.
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-col items-start gap-2 lg:items-end lg:justify-center">
                      <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center lg:w-auto lg:justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            void openBillingPortal();
                          }}
                          className="inline-flex items-center justify-center rounded-full border-2 border-gray-400 bg-white px-4 py-2 text-sm font-semibold text-gray-800 transition hover:bg-gray-100 dark:border-[#5A5A5A] dark:bg-[#2B2B2B] dark:text-zinc-200 dark:hover:bg-[#3A3A3A]"
                        >
                          View billing
                        </button>
                        {billingHasCurrentPlan ? (
                          <button
                            type="button"
                            onClick={() => {
                              void openBillingPortal();
                            }}
                            className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold text-white shadow-sm transition focus-visible:outline-none focus-visible:ring-2 ${
                              pricingIsDelinquent
                                ? "bg-rose-600 hover:bg-rose-700 focus-visible:ring-rose-500/30"
                                : "bg-rose-600 hover:bg-rose-700 focus-visible:ring-rose-500/30"
                            }`}
                          >
                            {pricingIsDelinquent
                              ? "Update payment"
                              : accountStripeStatus === "trialing"
                                ? "Cancel free trial"
                                : "Cancel plan"}
                          </button>
                        ) : null}
                      </div>
                      {billingHasCurrentPlan ? (
                        <p
                          className={`max-w-sm text-xs leading-5 lg:text-right ${
                            pricingIsDelinquent
                              ? "text-rose-600 dark:text-rose-300"
                              : "text-gray-500 dark:text-zinc-400"
                          }`}
                        >
                          <span className="text-rose-500" aria-hidden="true">*</span>{" "}
                          {pricingIsDelinquent
                            ? "Update your payment to restore billing."
                            : "Your plan remains active until the end of your billing period."}
                        </p>
                      ) : null}
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="text-center">
              <h3 className="text-3xl font-semibold tracking-tight text-gray-900 dark:text-zinc-100">
                Everything you need to work with confidence
              </h3>
            </div>

            <div className="flex justify-center">
              <div className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-100 p-1 text-sm font-semibold shadow-sm dark:border-[#3F3F3F] dark:bg-[#2B2B2B]">
                <button
                  type="button"
                  onClick={() => setPricingBillingPeriod("monthly")}
                  className={`rounded-md px-5 py-2 whitespace-nowrap transition-all ${
                    pricingBillingPeriod === "monthly"
                      ? "bg-white text-slate-900 shadow-sm dark:bg-[#3A3A3A] dark:text-white"
                      : "text-slate-600 hover:text-slate-900 dark:text-zinc-300 dark:hover:text-zinc-100"
                  }`}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setPricingBillingPeriod("annual")}
                  className={`rounded-md px-4 py-2 whitespace-nowrap transition-all ${
                    pricingBillingPeriod === "annual"
                      ? "bg-white text-slate-900 shadow-sm dark:bg-[#3A3A3A] dark:text-white"
                      : "text-slate-600 hover:text-slate-900 dark:text-zinc-300 dark:hover:text-zinc-100"
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    <span>Annual</span>
                    <span className="rounded-md bg-purple-500 px-2.5 py-1 text-[11px] font-semibold tracking-tight text-white">
                      SAVE UP TO 42%
                    </span>
                  </span>
                </button>
              </div>
            </div>

            <div id="account-pricing-cards" className="mx-auto w-full max-w-full">
              {pricingStatusLoading ? (
                <div className="grid w-full gap-10 md:grid-cols-2">
                  {PRICING_TIERS.map((tier) => (
                    <div
                      key={tier.name}
                      className="flex h-full min-h-[420px] flex-col rounded-2xl border-[1.5px] border-slate-200 bg-white p-6 shadow-sm dark:border-[#4B4B4B] dark:bg-[#262626] dark:shadow-[0_1px_0_rgba(255,255,255,0.02),0_8px_18px_rgba(0,0,0,0.24)]"
                    >
                      <div className="skeleton-shimmer h-8 w-40 rounded-lg bg-slate-200/90 dark:bg-white/10" />
                      <div className="skeleton-shimmer mt-5 h-14 w-52 rounded-lg bg-slate-200/90 dark:bg-white/10" />
                      <div className="skeleton-shimmer mt-4 h-10 w-full rounded-xl bg-slate-200/90 dark:bg-white/10" />
                      <div className="mt-6 flex-1 space-y-3">
                        {tier.features.slice(0, 5).map((feature, index) => (
                          <div key={`${tier.name}-${feature}-${index}`} className="flex items-start gap-2">
                            <div className="skeleton-shimmer mt-1 h-4 w-4 rounded-full bg-slate-200/90 dark:bg-white/10" />
                            <div className="skeleton-shimmer h-4 w-11/12 rounded bg-slate-200/90 dark:bg-white/10" />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <PricingTierCards
                  billingPeriod={pricingBillingPeriod}
                  canUseTrialForPlan={pricingCanUseTrialForPlan}
                  currentPlanTier={currentPlanTier}
                  currentPlanBillingPeriod={currentPlanBillingPeriod}
                  getPrimaryActionLabel={(tierName, canUseTrial) =>
                    currentPlanTier === "Essential Plus" && tierName === "Signature Pro"
                      ? "Upgrade to Pro"
                      : currentPlanTier === "Signature Pro" && tierName === "Essential Plus"
                        ? "Downgrade to Essential Plus"
                        : canUseTrial
                          ? "Start 7-day trial"
                          : "Subscribe now"
                  }
                  getPrimaryActionOptions={(_, canUseTrial) => (canUseTrial ? undefined : { skipTrial: true })}
                  onPrimaryAction={(planName, options) => {
                    void handlePricingPlanSelect(planName, options);
                  }}
                  onPortalAction={() => {
                    void openBillingPortal();
                  }}
                  getSecondaryActionLabel={(_, canUseTrial) => (currentPlanTier ? null : canUseTrial ? "Pay now" : null)}
                  onSecondaryAction={(planName) => {
                    void handlePricingPlanSelect(planName, { skipTrial: true });
                  }}
                  loadingPlan={pricingCheckoutLoading}
                  className="grid w-full scroll-mt-28 gap-10 md:grid-cols-2"
                />
              )}
            </div>

            {pricingMessage ? (
              <p className="text-sm font-medium text-rose-600 dark:text-rose-400">{pricingMessage}</p>
            ) : null}
          </div>

          <div className="mt-auto flex justify-center pt-1">
            <div className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-zinc-400">
              <span>Payments powered by</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logos/Stripe-Logo-v3.png"
                alt="Stripe"
                className="h-5 sm:h-6 w-auto rounded-md opacity-90 transition-opacity hover:opacity-100"
              />
            </div>
          </div>

        </section>
        </>
        ) : null}

        {activeSettingsTab === "security" && canChangePassword && (
        <section className="mt-8 border-t border-gray-200 pt-6 dark:border-[#3F3F3F]">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-slate-600 dark:text-zinc-400" aria-hidden />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-zinc-100">Change password</h2>
          </div>
          <>
            <form onSubmit={handlePasswordSubmit} noValidate className="mt-4 space-y-5">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300" htmlFor="account-password-current">
                  Enter your current password
                </label>
                <input
                  id="account-password-current"
                  type="password"
                  value={currentPassword}
                  onChange={(event) => {
                    setCurrentPassword(event.target.value);
                    if (passwordSubmitAttempted) {
                      setPasswordSubmitAttempted(false);
                    }
                    if (isCurrentPasswordIncorrect) {
                      setPasswordMessage(null);
                    }
                  }}
                  required
                  minLength={8}
                  className={`w-full rounded-md border bg-white px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6C47FF]/35 focus-visible:ring-offset-0 dark:bg-[#2B2B2B] dark:text-zinc-100 dark:placeholder:text-zinc-500 ${
                    currentPasswordHasError
                      ? "border-transparent ring-2 ring-rose-600/60 dark:ring-rose-500/50"
                      : "border-gray-300 dark:border-[#3F3F3F]"
                  }`}
                  placeholder="Enter your current password"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300" htmlFor="account-password-new">
                  New password
                </label>
                <input
                  id="account-password-new"
                  type="password"
                  value={newPassword}
                  onChange={(event) => {
                    setNewPassword(event.target.value);
                    if (passwordSubmitAttempted) {
                      setPasswordSubmitAttempted(false);
                    }
                    if (isNewPasswordMismatch || isNewPasswordRequirementsError) {
                      setPasswordMessage(null);
                    }
                  }}
                  required
                  minLength={8}
                  className={`w-full rounded-md border bg-white px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6C47FF]/35 focus-visible:ring-offset-0 dark:bg-[#2B2B2B] dark:text-zinc-100 dark:placeholder:text-zinc-500 ${
                    isNewPasswordMismatch || isNewPasswordRequirementsError
                      ? "border-transparent ring-2 ring-rose-600/60 dark:ring-rose-500/50"
                      : newPasswordHasError
                        ? "border-transparent ring-2 ring-rose-600/60 dark:ring-rose-500/50"
                        : "border-gray-300 dark:border-[#3F3F3F]"
                  }`}
                  placeholder="Create new password"
                />
                <p className="text-xs text-gray-500 dark:text-zinc-400">{NEW_PASSWORD_REQUIREMENTS_HINT}</p>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300" htmlFor="account-password-confirm">
                  Confirm new password
                </label>
                <input
                  id="account-password-confirm"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => {
                    setConfirmPassword(event.target.value);
                    if (passwordSubmitAttempted) {
                      setPasswordSubmitAttempted(false);
                    }
                    if (isNewPasswordMismatch || isNewPasswordRequirementsError) {
                      setPasswordMessage(null);
                    }
                  }}
                  required
                  minLength={8}
                  className={`w-full rounded-md border bg-white px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6C47FF]/35 focus-visible:ring-offset-0 dark:bg-[#2B2B2B] dark:text-zinc-100 dark:placeholder:text-zinc-500 ${
                    isNewPasswordMismatch || isNewPasswordRequirementsError
                      ? "border-transparent ring-2 ring-rose-600/60 dark:ring-rose-500/50"
                      : confirmPasswordHasError
                        ? "border-transparent ring-2 ring-rose-600/60 dark:ring-rose-500/50"
                        : "border-gray-300 dark:border-[#3F3F3F]"
                  }`}
                  placeholder="Re-enter your new password"
                />
              </div>
              </div>
              <button
                type="submit"
                disabled={passwordBusy}
                aria-disabled={passwordBusy}
                className="rounded-md bg-[#6C47FF] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#5B38E6] disabled:opacity-60"
              >
                {passwordBusy ? "Saving..." : "Save changes"}
              </button>
              {passwordMessage && (
                <p
                  className={`text-sm ${
                    isCurrentPasswordIncorrect
                    || isNewPasswordRequirementsError
                    || isNewPasswordMismatch
                    || isPasswordRateLimited
                      ? "text-rose-600 dark:text-rose-400"
                      : "text-gray-600 dark:text-zinc-400"
                  }`}
                >
                  {passwordMessage}
                </p>
              )}
            </form>
          </>
        </section>
        )}

        {activeSettingsTab === "security" ? (
        <section className="mt-8 border-t border-gray-200 pt-6 dark:border-[#3F3F3F]">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-slate-600 dark:text-zinc-400" aria-hidden />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-zinc-100">Security</h2>
          </div>
          <p className="mt-1 text-sm text-gray-600 dark:text-zinc-400">Keep your MergifyPDF account secure.</p>
              <div className="mt-4 space-y-6">
            <div className="flex flex-col gap-1 rounded-lg border border-gray-200 bg-white p-4 dark:border-[#3F3F3F] dark:bg-[#2B2B2B]/60">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-gray-800 dark:text-zinc-100">
                    Two-Factor Authentication
                  </p>
                  {!managedByGoogle && twoFactorMethod && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold leading-none text-white ring-1 ring-inset ring-emerald-700/20 dark:bg-emerald-600 dark:text-white dark:ring-emerald-500/20">
                      <CheckCircle2 className="h-3 w-3" aria-hidden />
                      Enabled
                    </span>
                  )}
                </div>
                {managedByGoogle ? (
                  <div className="mt-3 rounded-lg border border-[#D8C8FF] bg-[#F3EEFF] px-4 py-3 text-[#5B38E6] dark:border-[#6650D6]/40 dark:bg-[#2D2250]/30 dark:text-[#B8A8FF]">
                    <p className="text-sm font-medium">2FA unavailable for Google accounts</p>
                    <p className="mt-1 text-sm leading-6">
                      This account uses Google sign-in, so 2FA can’t be turned on.
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-gray-600 dark:text-zinc-400">
                      Require a 6-digit code each time you sign in.
                    </p>
                    {twoFactorMethod ? (
                      <p className="mt-1 text-xs text-gray-600 dark:text-zinc-400">Email verification</p>
                    ) : null}
                  </>
                )}
              </div>
              <div className="mt-3">
                {!managedByGoogle && twoFactorMethod ? (
                  <button
                    type="button"
                    onClick={openDisableTwoFactor}
                    className="rounded-md bg-[#DC2626] px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-[#B91C1C]"
                  >
                    Disable 2FA
                  </button>
                ) : !managedByGoogle ? (
                  <button
                    type="button"
                    onClick={openEnableTwoFactor}
                    className="rounded-md bg-[#6C47FF] px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-[#5B38E6]"
                  >
                    Enable 2FA
                  </button>
                ) : null}
              </div>
            </div>

          <div className="mt-8 border-t border-gray-200 pt-6 dark:border-[#3F3F3F]">
            <div className="flex items-center gap-2">
              <PhTrash className="h-4 w-4 text-slate-600 dark:text-zinc-400" aria-hidden />
              <h2 className="text-lg font-semibold text-slate-900 dark:text-zinc-100">Delete</h2>
            </div>
            <p className="mt-1 text-sm text-gray-600 dark:text-zinc-400">
              Permanently delete your MergifyPDF account and all associated data. This action cannot be
              undone.
            </p>
            <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-[#3F3F3F] dark:bg-[#2B2B2B]/60">
              <p className="text-sm font-medium text-gray-800 dark:text-zinc-100">Delete account</p>
              <button
                type="button"
                onClick={handleDeleteAccountClick}
                className="mt-3 rounded-md bg-[#DC2626] px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-[#B91C1C]"
              >
                Delete my account
              </button>
            </div>
          </div>

          </div>
        </section>
        ) : null}
        <div aria-hidden className="h-[calc(5rem+env(safe-area-inset-bottom))] lg:hidden" />
          </div>
        </div>
      </div>
      </div>

      {twoFactorModalMode && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/55 px-4 py-8 backdrop-blur-sm">
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl border-[1.5px] border-slate-200 bg-white text-slate-900 shadow-[0_22px_60px_rgba(15,23,42,0.22)] dark:border-[#4B4B4B] dark:bg-[#262626] dark:text-zinc-100 dark:shadow-[0_1px_0_rgba(255,255,255,0.02),0_8px_18px_rgba(0,0,0,0.24)]">
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex min-w-0 items-start gap-3">
                  <Shield
                    className={`mt-0.5 h-4.5 w-4.5 flex-none ${
                      twoFactorModalMode === "disable"
                        ? "text-rose-600 dark:text-rose-400"
                        : "text-slate-700 dark:text-zinc-200"
                    }`}
                    aria-hidden
                  />
                  <div className="min-w-0">
                    <h2
                      className={`text-lg font-semibold tracking-tight ${
                        twoFactorModalMode === "disable"
                          ? "text-rose-700 dark:text-rose-300"
                          : "text-slate-900 dark:text-zinc-100"
                      }`}
                    >
                      {twoFactorModalMode === "enable"
                        ? "Enable 2-Factor Authentication"
                        : "Disable 2-Factor Authentication"}
                    </h2>
                  </div>
                </div>
              </div>

              <form
                className="mt-4 space-y-6"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (twoFactorModalMode === "enable" || twoFactorModalMode === "disable") {
                    void handleConfirmTwoFactor();
                  }
                }}
              >
                <p className="text-sm leading-6 text-slate-600 dark:text-zinc-400">
                  {twoFactorModalMode === "disable"
                    ? "To turn off 2FA, we’ll email you a 6-digit code to confirm this change."
                    : "We’ll email you a 6-digit code each time you sign in. You can turn this off anytime."}
                </p>

                {twoFactorStep === "verify" ? (
                  <div className="space-y-2">
                    <label
                      className="block text-sm font-medium text-slate-700 dark:text-zinc-300"
                      htmlFor="twofactor-code-0"
                    >
                      Verify your identity
                    </label>
                    {twoFactorMessage ? (
                      <p className="text-sm text-emerald-700 dark:text-emerald-400">{twoFactorMessage}</p>
                    ) : null}
                    <div className="flex gap-3">
                      {twoFactorCodeDigits.map((digit, index) => (
                        <input
                          key={`twofactor-code-${index}`}
                          ref={(el) => {
                            twoFactorCodeRefs.current[index] = el;
                          }}
                          id={index === 0 ? "twofactor-code-0" : undefined}
                          autoFocus={index === 0}
                          className="h-11 w-9 rounded-lg border-2 border-slate-300 bg-white text-center text-lg text-slate-900 outline-none transition hover:border-slate-400 focus-visible:border-[#6D6AF4] focus-visible:ring-0 dark:border-[#4A4A4A] dark:bg-[#2B2B2B] dark:text-zinc-100 dark:hover:border-[#4A4A4A] sm:h-12 sm:w-11"
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(event) => {
                            const value = event.target.value.replace(/\D/g, "");
                            if (!value) {
                              updateTwoFactorCodeDigit(index, "");
                              return;
                            }
                            updateTwoFactorCodeDigit(index, value[0]);
                            if (index < 5) {
                              focusTwoFactorCodeIndex(index + 1);
                            }
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Backspace" && !digit && index > 0) {
                              updateTwoFactorCodeDigit(index - 1, "");
                              focusTwoFactorCodeIndex(index - 1);
                            }
                            if (event.key === "ArrowLeft" && index > 0) {
                              focusTwoFactorCodeIndex(index - 1);
                            }
                            if (event.key === "ArrowRight" && index < 5) {
                              focusTwoFactorCodeIndex(index + 1);
                            }
                          }}
                          onPaste={(event) => {
                            const pasted = event.clipboardData.getData("text").replace(/\D/g, "");
                            if (!pasted) return;
                            event.preventDefault();
                            const next = [...twoFactorCodeDigits];
                            for (let i = 0; i < 6; i += 1) {
                              const targetIndex = index + i;
                              if (targetIndex > 5) break;
                              next[targetIndex] = pasted[i] ?? "";
                            }
                            setTwoFactorCodeDigits(next);
                            const lastIndex = Math.min(index + pasted.length - 1, 5);
                            focusTwoFactorCodeIndex(Math.max(lastIndex, 0));
                          }}
                          aria-label={`Digit ${index + 1}`}
                        />
                      ))}
                    </div>
                  </div>
                ) : null}

                {twoFactorError ? (
                  <p className="text-sm text-rose-600 dark:text-rose-400">{twoFactorError}</p>
                ) : null}
                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="submit"
                    className={`rounded-md px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-60 ${
                      twoFactorModalMode === "disable"
                        ? "bg-[#DC2626] hover:bg-[#B91C1C]"
                        : "bg-[#6C47FF] hover:bg-[#5B38E6]"
                    }`}
                    disabled={twoFactorBusy}
                  >
                    {twoFactorModalMode === "enable"
                      ? twoFactorStep === "verify"
                        ? "Confirm code"
                        : twoFactorBusy
                          ? "Sending..."
                          : "Send code"
                      : twoFactorStep === "verify"
                        ? "Turn off 2FA"
                        : twoFactorBusy
                          ? "Sending..."
                          : "Send code"}
                  </button>
                  {twoFactorStep === "verify" ? (
                    <button
                      type="button"
                      disabled={twoFactorBusy || twoFactorResendCooldown > 0}
                      onClick={() => {
                        if (twoFactorBusy || twoFactorResendCooldown > 0) return;
                        void requestTwoFactorCode(twoFactorModalMode === "disable" ? "disable" : "enable");
                      }}
                      className="rounded-md border-2 border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:-translate-y-[1px] hover:border-slate-400 hover:shadow-sm disabled:opacity-60 dark:border-[#4A4A4A] dark:bg-[#2B2B2B] dark:text-zinc-100 dark:hover:border-[#4A4A4A]"
                    >
                      {twoFactorBusy
                        ? "Sending..."
                        : twoFactorResendCooldown > 0
                          ? `Resend code in ${twoFactorResendCooldown}s`
                          : "Resend code"}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => {
                      resetTwoFactorModalState();
                      setTwoFactorModalMode(null);
                    }}
                    className="rounded-md px-2 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-100 hover:text-gray-900 dark:text-zinc-400 dark:hover:bg-[#3A3A3A] dark:hover:text-zinc-200"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {deleteModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/55 px-4 py-8 backdrop-blur-sm">
          <div
            className="w-full max-w-lg rounded-2xl bg-white p-7 shadow-2xl sm:p-8"
            aria-busy={deleteChecking || deleteDeleting}
          >
            {deleteModalMode === "checking" ? (
              <>
                <div className="flex flex-col items-center justify-center px-2 py-2 text-center">
                  <div
                    className="h-12 w-12 animate-spin rounded-full border-[5px] border-[#D9CCFF] border-t-[#6C47FF] dark:border-[#3F3F3F] dark:border-t-[#8B6CFF]"
                    aria-hidden
                  />
                  <h2 className="mt-3 text-lg font-semibold text-slate-900">
                    Checking subscription status...
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">This may take a moment.</p>
                </div>
                {deleteError && <p className="mt-2 text-sm text-rose-600">{deleteError}</p>}
                <div className="mt-4 flex justify-end gap-3">
                  <button
                    type="button"
                    className="rounded-md px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                    onClick={() => {
                      if (deleteBusy) return;
                      closeDeleteModal();
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : deleteModalMode === "deleting" ? (
              <>
                <div className="flex flex-col items-center justify-center px-2 py-3 text-center">
                  <div
                    className="h-12 w-12 animate-spin rounded-full border-[5px] border-[#D9CCFF] border-t-[#6C47FF] dark:border-[#3F3F3F] dark:border-t-[#8B6CFF]"
                    aria-hidden
                  />
                  <h2 className="mt-3 text-lg font-semibold text-slate-900">Deleting projects...</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    This may take a moment while we remove your files and account data.
                  </p>
                </div>
                {deleteError && <p className="mt-2 text-sm text-rose-600">{deleteError}</p>}
                <div className="mt-4 flex justify-end gap-3">
                  <button
                    type="button"
                    disabled
                    className="rounded-md px-3 py-2 text-sm font-semibold text-slate-400"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : deleteModalMode === "billing" ? (
              <>
                <h2 className="text-[1.15rem] font-semibold text-slate-900">
                  {deleteBillingInfo?.title ?? "Cancel your plan first"}
                </h2>
                <p className="mt-2 text-[0.95rem] leading-6 text-slate-600">
                  {deleteBillingInfo?.message ??
                    "Please cancel your subscription or trial in Billing before deleting your account."}
                </p>
                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    className="rounded-md px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                    onClick={() => {
                      if (deleteBusy) return;
                      closeDeleteModal();
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={deleteBusy}
                    className="rounded-md bg-[#6C47FF] px-4 py-2 text-sm font-semibold text-white hover:bg-[#5B38E6] disabled:opacity-60"
                    onClick={async () => {
                      if (deleteBusy) return;
                      const opened = await openBillingPortal();
                      if (opened) {
                        closeDeleteModal();
                      } else {
                        setDeleteError("Unable to open billing right now. Please try again.");
                      }
                    }}
                  >
                    Go to billing
                  </button>
                </div>
              </>
            ) : deleteModalMode === "google" ? (
              <>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4.5 w-4.5 flex-none text-rose-600" aria-hidden />
                  <h2 className="text-[1.15rem] font-semibold text-slate-900">Delete your account?</h2>
                </div>
                <p className="mt-2 text-[0.95rem] leading-6 text-slate-600">
                  This will permanently delete your MergifyPDF account, documents, and all associated data. This
                  action cannot be undone.
                </p>
                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    className="rounded-md px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                    onClick={() => {
                      if (deleteBusy) return;
                      closeDeleteModal();
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={deleteBusy}
                    className="rounded-md bg-[#6C47FF] px-4 py-2 text-sm font-semibold text-white hover:bg-[#5B38E6] disabled:opacity-60"
                    onClick={() => setDeleteModalMode("confirm")}
                  >
                    Continue
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4.5 w-4.5 flex-none text-rose-600" aria-hidden />
                  <h2 className="text-[1.15rem] font-semibold text-slate-900">
                    {managedByGoogle ? "Account Deletion" : "Delete your account?"}
                  </h2>
                </div>
                <p className="mt-2 text-[0.95rem] leading-6 text-slate-600">
                  This will permanently delete your MergifyPDF account, documents, and all associated data. This
                  action cannot be undone.
                </p>
                <div className="mt-5 space-y-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Why are you leaving? <span className="text-rose-600">*</span>
                  </label>
                  <div ref={deleteReasonMenuRef} className="relative">
                    <button
                      type="button"
                      aria-haspopup="listbox"
                      aria-expanded={deleteReasonMenuOpen}
                      onClick={() => setDeleteReasonMenuOpen((open) => !open)}
                      className={`flex w-full items-center justify-between rounded-md border-2 px-3 py-2 text-left text-sm shadow-sm transition focus-visible:outline-none ${
                        deleteReasonMenuOpen
                          ? "border-[#6C47FF] bg-white text-slate-900 focus-visible:border-[#6C47FF]"
                          : "border-slate-300 bg-white text-slate-900 hover:border-slate-400 focus-visible:border-[#6C47FF]"
                      }`}
                    >
                      <span className="truncate">
                        {DELETE_ACCOUNT_REASONS.find((reason) => reason.value === deleteReason)?.label ??
                          "Select a reason"}
                      </span>
                      <ChevronDown
                        className={`h-4 w-4 flex-none text-slate-400 transition ${deleteReasonMenuOpen ? "rotate-180" : ""}`}
                        aria-hidden
                      />
                    </button>
                    {deleteReasonMenuOpen ? (
                      <div
                        role="listbox"
                        className="absolute z-10 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-[0_20px_45px_rgba(15,23,42,0.12)]"
                      >
                        {DELETE_ACCOUNT_REASONS.map((reason) => {
                          const selected = deleteReason === reason.value;
                          return (
                            <button
                              key={reason.value}
                              type="button"
                              role="option"
                              aria-selected={selected}
                              onClick={() => {
                                setDeleteReason(reason.value);
                                setDeleteReasonMenuOpen(false);
                              }}
                              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${
                                selected
                                  ? "bg-[rgba(108,71,255,0.10)] text-[#5B38E6]"
                                  : "text-slate-700 hover:bg-slate-50"
                              }`}
                            >
                              <span>{reason.label}</span>
                              {selected ? <CheckCircle2 className="h-4 w-4" aria-hidden /> : null}
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                </div>
                {!managedByGoogle ? (
                  <div className="mt-5 space-y-2">
                    <label className="block text-sm font-medium text-slate-700" htmlFor="delete-account-password">
                      Enter your current password to confirm.
                    </label>
                    <div className="relative">
                      <input
                        id="delete-account-password"
                        type={deletePasswordVisible ? "text" : "password"}
                        value={deletePassword}
                        onChange={(event) => setDeletePassword(event.target.value)}
                        className="delete-account-password-field w-full rounded-md border-2 border-slate-300 px-3 py-2 pr-11 text-sm shadow-sm focus-visible:outline-none focus-visible:border-[#6C47FF]"
                        placeholder="Enter your current password"
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setDeletePasswordVisible((visible) => !visible)}
                        className="absolute inset-y-0 right-0 flex items-center justify-center px-3 text-slate-500 transition hover:text-slate-700"
                        aria-label={deletePasswordVisible ? "Hide password" : "Show password"}
                      >
                        {deletePasswordVisible ? <EyeOff className="h-4.5 w-4.5" aria-hidden /> : <Eye className="h-4.5 w-4.5" aria-hidden />}
                      </button>
                    </div>
                  </div>
                ) : null}
                {deleteError && <p className="mt-3 text-sm text-rose-600">{deleteError}</p>}
                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    className="rounded-md px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                    onClick={() => {
                      if (deleteBusy) return;
                      closeDeleteModal();
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={
                      deleteBusy
                      || !deleteReason
                      || (!managedByGoogle && deletePassword.trim().length === 0)
                    }
                    className="rounded-md bg-[#DC2626] px-4 py-2 text-sm font-semibold text-white hover:bg-[#B91C1C] disabled:opacity-60"
                    onClick={handleConfirmDeleteAccount}
                  >
                    {deleteBusy ? "Please wait..." : "Delete account"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {showCropper && pendingAvatar ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 px-4 py-8">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Adjust your profile photo</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Drag the square to position your photo. Pull any corner to resize.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCropCancel}
                className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close photo cropper"
              >
                ✕
              </button>
            </div>

            <div className="mt-6 flex flex-col items-center gap-5">
              <div className="relative flex h-80 w-80 items-center justify-center">
                <div className="relative h-64 w-64 overflow-hidden rounded-3xl bg-slate-900/5 shadow-inner shadow-slate-950/10">
                  {pendingAvatar && displayMeta ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={pendingAvatar}
                      alt="Crop preview"
                      draggable={false}
                      className="pointer-events-none absolute select-none"
                      style={{
                        width: displayMeta.width,
                        height: displayMeta.height,
                        left: displayMeta.offsetX,
                        top: displayMeta.offsetY,
                      }}
                    />
                  ) : (
                    <div className="skeleton-shimmer h-full w-full bg-slate-200" />
                  )}
                  {cropRect ? (
                    <div
                      role="presentation"
                      onPointerDown={startCropMove}
                      className="absolute cursor-move border-2 border-white/90 shadow-[0_0_0_9999px_rgba(15,23,42,0.45)]"
                      style={{
                        left: cropRect.x,
                        top: cropRect.y,
                        width: cropRect.size,
                        height: cropRect.size,
                      }}
                    >
                      {(["nw", "ne", "sw", "se"] as CropHandle[]).map((handle) => (
                        <span
                          key={handle}
                          onPointerDown={(event) => startHandleResize(handle, event)}
                          className={`absolute h-3.5 w-3.5 rounded-full border border-slate-200 bg-white shadow ${HANDLE_POSITIONS[handle]}`}
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleCropCancel}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCropConfirm}
                disabled={avatarBusy}
                className="rounded-xl bg-[#024d7c] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#013a60] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {avatarBusy ? "Saving…" : "Save photo"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="fixed inset-x-0 bottom-0 z-[75] border-t border-slate-200 bg-white/95 px-2 pt-1 pb-[calc(6px+env(safe-area-inset-bottom))] backdrop-blur dark:border-[#3A3A3A] dark:bg-[#323232]/95 lg:hidden">
        <div className="mx-auto grid max-w-xl grid-cols-5 items-end gap-1">
          <button
            type="button"
            onClick={() => {
              window.dispatchEvent(new Event("open-create-project"));
            }}
            className="flex min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 text-[11px] font-semibold text-[#4B5563] transition hover:bg-[rgba(0,0,0,0.04)] dark:text-white dark:hover:bg-white/5"
          >
            <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full border-[1.5px] border-[#A8B0BA] bg-transparent text-[#6C757D] dark:border-[1.5px] dark:border-white dark:bg-transparent dark:text-white">
              <Plus className="h-[14px] w-[14px]" aria-hidden />
            </span>
            <span className="truncate leading-[1.15] dark:text-white">Create</span>
          </button>
          {mobileDockItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.active ?? false;
            const iconClassName = isActive
              ? "h-[22px] w-[22px]"
              : "h-[22px] w-[22px] text-[#4B5563] dark:text-white";
            return (
              <Link
                key={item.label}
                href={item.href}
                prefetch
                className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 text-[11px] font-semibold transition ${
                  isActive
                    ? "text-[#7C3AED] dark:text-[#7C3AED]"
                    : "text-[#4B5563] hover:bg-[rgba(0,0,0,0.04)] dark:text-white dark:hover:bg-white/5"
                }`}
                >
                <Icon
                  className={iconClassName}
                  aria-hidden
                  weight={item.label === "Signatures" ? "regular" : isActive ? "fill" : "regular"}
                />
                <span className={`truncate leading-[1.15] ${isActive ? "dark:text-[#7C3AED]" : "dark:text-white"}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}

export default function AccountPage() {
  const searchParams = useSearchParams();
  const view = searchParams.get("view");
  const activeSettingsTab: SettingsTab =
    view === "security" ? "security" : view === "pricing" ? "pricing" : "account";

  return (
    <AccountSettingsPage
      activeSettingsTab={activeSettingsTab}
      initialMobileView={view === "security" || view === "pricing" ? activeSettingsTab : null}
    />
  );
}
