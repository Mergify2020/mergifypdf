"use client";

import { ChevronDown, MoveLeft, PencilLine, User, Mail, Lock, Shield, CreditCard, Star, Smile, Sun } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { useAvatarPreference } from "@/lib/useAvatarPreference";
import { getAvatarFallback } from "@/lib/avatarFallback";
import {
  meetsPasswordPolicy,
  NEW_PASSWORD_REQUIREMENTS_ERROR,
  NEW_PASSWORD_REQUIREMENTS_HINT,
} from "@/lib/passwordPolicy";
import PricingPlans from "@/components/PricingPlans";
import SettingsMenu from "@/components/SettingsMenu";
import LoadingOverlay from "@/components/LoadingOverlay";

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
type SettingsTab = "account" | "security";
const HANDLE_POSITIONS: Record<CropHandle, string> = {
  nw: "-top-2 -left-2",
  ne: "-top-2 -right-2",
  sw: "-bottom-2 -left-2",
  se: "-bottom-2 -right-2",
};

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

function AccountSettingsPage({ activeSettingsTab: initialSettingsTab }: { activeSettingsTab: SettingsTab }) {
  const router = useRouter();
  const { data: session, update: updateSession } = useSession();
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
  const accountName = [firstNameValue.trim(), lastNameValue.trim()].filter(Boolean).join(" ")
    || session?.user?.email
    || "Account";
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
  const [twoFactorModalMode, setTwoFactorModalMode] = useState<"enable" | "manage" | null>(null);
  const [confirmDisable2fa, setConfirmDisable2fa] = useState(false);
  const [twoFactorStep, setTwoFactorStep] = useState<"select" | "verify">("select");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [twoFactorBusy, setTwoFactorBusy] = useState(false);
  const [twoFactorError, setTwoFactorError] = useState<string | null>(null);
  const [twoFactorMessage, setTwoFactorMessage] = useState<string | null>(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [disconnectModalOpen, setDisconnectModalOpen] = useState(false);
  const [disconnectPassword, setDisconnectPassword] = useState("");
  const [disconnectBusy, setDisconnectBusy] = useState(false);
  const [disconnectError, setDisconnectError] = useState<string | null>(null);
  const [activeSettingsTab, setActiveSettingsTab] = useState<SettingsTab>(initialSettingsTab);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const showAvatarImage = Boolean(avatar) && !avatarLoadFailed;
  const isEmailConfirmationMismatch =
    emailStep === "request"
    && confirmNewEmail.trim().length > 0
    && newEmail.trim().toLowerCase() !== confirmNewEmail.trim().toLowerCase();
  const isCurrentPasswordIncorrect =
    Boolean(passwordMessage)
    && /current password/i.test(passwordMessage)
    && /incorrect/i.test(passwordMessage);
  const isNewPasswordRequirementsError = passwordMessage === NEW_PASSWORD_REQUIREMENTS_ERROR;
  const isPasswordRateLimited =
    Boolean(passwordMessage) && /^too many requests/i.test(passwordMessage);
  const isNewPasswordMismatch =
    Boolean(passwordMessage) && /do not match/i.test(passwordMessage);
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
    setActiveSettingsTab(initialSettingsTab);
  }, [initialSettingsTab]);

  useEffect(() => {
    const stored = window.localStorage.getItem("theme");
    const initialTheme = stored === "dark" ? "dark" : "light";
    document.documentElement.classList.toggle("dark", initialTheme === "dark");
    if (initialTheme === "light") {
      document.body.classList.remove("dark");
    }
    setTheme(initialTheme);
  }, []);

  useEffect(() => {
    router.prefetch("/");
  }, [router]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      window.dispatchEvent(new Event("workspace-content-ready"));
    });
    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, []);

  function switchSettingsTab(nextTab: SettingsTab) {
    if (nextTab === activeSettingsTab) return;
    setActiveSettingsTab(nextTab);
    if (typeof window !== "undefined") {
      const nextUrl = nextTab === "security" ? "/account?view=security" : "/account";
      window.history.pushState(window.history.state, "", nextUrl);
    }
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
  }, [session?.user?.id]);

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
      setBillingPortalError(null);
      const now = Date.now();
      if (
        warmedBillingPortalUrl &&
        warmedBillingPortalAt > 0 &&
        now - warmedBillingPortalAt < 25_000
      ) {
        window.location.href = warmedBillingPortalUrl;
        return;
      }
      const returnUrl =
        typeof window === "undefined"
          ? undefined
          : `${window.location.origin}/account${activeSettingsTab === "security" ? "?view=security" : ""}`;
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
    } catch {
      setBillingPortalError("Unable to open billing portal right now.");
      setBillingPortalLoading(false);
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
          : `${window.location.origin}/account${activeSettingsTab === "security" ? "?view=security" : ""}`;
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

  async function handleNameSubmit() {
    if (nameBusy) return;
    setNameBusy(true);
    setNameMessage(null);
    try {
      const response = await fetch("/api/account/update-name", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstNameValue,
          lastName: lastNameValue,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error ?? "Unable to update name.");
      }
      const mergedName = [firstNameValue.trim(), lastNameValue.trim()].filter(Boolean).join(" ");
      setSavedFirstName(firstNameValue.trim());
      setSavedLastName(lastNameValue.trim());
      try {
        await updateSession({ name: mergedName || null });
      } catch {
        router.refresh();
      }
      setEditingNameField(null);
      setNameMessage("Name updated.");
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
    setTwoFactorCode("");
    setTwoFactorError(null);
    setTwoFactorMessage(null);
    setTwoFactorBusy(false);
  }

  function openEnableTwoFactor() {
    resetTwoFactorModalState();
    setTwoFactorModalMode("enable");
  }

  function openManageTwoFactor() {
    if (!twoFactorMethod) {
      openEnableTwoFactor();
      return;
    }
    resetTwoFactorModalState();
    setTwoFactorModalMode("manage");
  }

  async function handleConfirmEnableTwoFactor() {
    if (twoFactorModalMode === "manage") {
      setTwoFactorBusy(true);
      setTwoFactorError(null);
      setTwoFactorMessage(null);
      try {
        const response = await fetch("/api/account/two-factor", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            method: "email",
          }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data?.ok) {
          const code = data?.code as string | undefined;
          if (code === "PHONE_REQUIRED") {
            setTwoFactorError("Enter a phone number to use SMS verification.");
          } else if (code === "NOT_ENABLED") {
            setTwoFactorError("Two-factor authentication is not enabled for this account.");
          } else {
            setTwoFactorError(data?.message ?? "Unable to save your 2FA settings.");
          }
          return;
        }

        setTwoFactorMethod("email");

        resetTwoFactorModalState();
        setTwoFactorModalMode(null);
      } catch {
        setTwoFactorError("Unable to save your 2FA settings. Please try again.");
      } finally {
        setTwoFactorBusy(false);
      }
      return;
    }

    if (twoFactorStep === "select") {
      setTwoFactorBusy(true);
      setTwoFactorError(null);
      setTwoFactorMessage(null);
      try {
        const response = await fetch("/api/account/two-factor", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
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
        setTwoFactorCode("");
        setTwoFactorMessage(
          "We sent a 6-digit code to your email. Enter it below to turn on 2FA."
        );
      } catch {
        setTwoFactorError("We couldn’t send your verification code. Please try again.");
      } finally {
        setTwoFactorBusy(false);
      }
      return;
    }

    if (twoFactorCode.trim().length !== 6) {
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
          code: twoFactorCode.trim(),
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

      setTwoFactorMethod("email");
      resetTwoFactorModalState();
      setTwoFactorModalMode(null);
    } catch {
      setTwoFactorError("Verification failed. Please try again.");
    } finally {
      setTwoFactorBusy(false);
    }
  }

  async function handleConfirmDisableTwoFactor() {
    setConfirmDisable2fa(false);
    try {
      await fetch("/api/account/two-factor", { method: "DELETE" });
    } catch {
      // ignore; best-effort
    }
    setTwoFactorMethod(null);
    resetTwoFactorModalState();
    setTwoFactorModalMode(null);
  }

  async function handleConfirmDeleteAccount() {
    setDeleteError(null);
    setDeleteBusy(true);
    try {
      const response = await fetch("/api/account/delete", { method: "POST" });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "Unable to delete your account right now.");
      }
      await signOut({ callbackUrl: "/" });
    } catch (error) {
      setDeleteError(
        error instanceof Error ? error.message : "Unable to delete your account right now."
      );
      setDeleteBusy(false);
    }
  }

  async function handleConfirmDisconnectGoogle(event: React.FormEvent) {
    event.preventDefault();
    if (disconnectPassword.length < 8) return;
    setDisconnectError(null);
    setDisconnectBusy(true);
    try {
      const response = await fetch("/api/account/disconnect-google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: disconnectPassword }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to disconnect Google right now.");
      }
      setDisconnectBusy(false);
      setDisconnectModalOpen(false);
      setDisconnectPassword("");
      router.refresh();
    } catch (error) {
      setDisconnectError(
        error instanceof Error ? error.message : "Unable to disconnect Google right now."
      );
      setDisconnectBusy(false);
    }
  }

  return (
    <main className="w-full bg-slate-100 px-4 py-6 text-slate-900 sm:px-6 lg:px-8 dark:bg-[#222224] dark:text-zinc-100">
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="min-w-0 flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                window.dispatchEvent(new Event("workspace-loading-start"));
                router.push("/");
              }}
              className="inline-flex h-9 w-9 items-center justify-center text-gray-700 transition hover:text-gray-900 dark:text-zinc-100 dark:hover:text-white"
              aria-label="Back to home"
            >
              <MoveLeft className="h-6 w-6 stroke-[2.75]" aria-hidden />
            </button>
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-zinc-100">Account settings</h1>
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-3">
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
              triggerClassName="w-[224px] min-w-[224px] max-w-[224px] overflow-hidden flex h-11 items-center gap-1.5 rounded-full border border-[#E5E7EB] bg-white py-1.5 pl-1 pr-1.5 shadow-[12px_0_36px_rgba(15,23,42,0.10)] transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6C47FF]/30 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-100 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-[0_8px_22px_rgba(0,0,0,0.28),0_24px_52px_rgba(0,0,0,0.24)] dark:hover:bg-zinc-800 dark:focus-visible:ring-offset-[#222224]"
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
                        {fallbackAvatar.initials}
                      </span>
                    )}
                  </span>
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
                  <ChevronDown className="h-4 w-4 shrink-0 text-[#94A3B8] dark:text-zinc-400" aria-hidden="true" />
                </>
              }
            />
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start">
          <aside className="self-start rounded-2xl border-[1.5px] border-gray-200 bg-white p-4 shadow-sm lg:sticky lg:top-6 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-[0_8px_22px_rgba(0,0,0,0.28),0_24px_52px_rgba(0,0,0,0.24)]">
            <p className="px-2 text-xs font-bold uppercase tracking-[0.14em] text-gray-600 dark:text-zinc-400">Settings</p>
            <nav className="mt-3 space-y-1">
              <button
                type="button"
                onClick={() => {
                  switchSettingsTab("account");
                }}
                className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${
                  activeSettingsTab === "account"
                    ? "bg-[rgba(108,71,255,0.10)] text-[#5B38E6] dark:bg-zinc-800/60 dark:text-white"
                    : "text-gray-800 hover:bg-gray-50 hover:text-gray-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
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
                    ? "bg-[rgba(108,71,255,0.10)] text-[#5B38E6] dark:bg-zinc-800/60 dark:text-white"
                    : "text-gray-800 hover:bg-gray-50 hover:text-gray-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
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
                  router.push("/account?view=pricing");
                }}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-gray-800 transition hover:bg-gray-50 hover:text-gray-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              >
                <span className="relative h-5 w-5 text-gray-600 dark:text-zinc-400" aria-hidden>
                  <Star className="h-5 w-5 stroke-[2.2]" />
                  <Smile className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 stroke-[2.4]" />
                </span>
                <span>Plan &amp; usage</span>
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
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-gray-800 transition hover:bg-gray-50 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-60 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              >
                <CreditCard className="h-5 w-5 text-gray-600 stroke-[2.2] dark:text-zinc-400" aria-hidden />
                <span>Billing portal</span>
              </button>
              {billingPortalError ? (
                <p className="px-3 text-xs font-medium text-rose-600 dark:text-rose-400">{billingPortalError}</p>
              ) : null}
            </nav>
          </aside>

          <div className="rounded-2xl border-[1.5px] border-gray-200 bg-white p-6 shadow-sm sm:p-7 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-[0_8px_22px_rgba(0,0,0,0.28),0_24px_52px_rgba(0,0,0,0.24)]">
            <h2 className="text-3xl font-semibold tracking-tight text-gray-900 dark:text-zinc-100">
              {activeSettingsTab === "security" ? "Security" : "Personal details"}
            </h2>

          {activeSettingsTab === "account" ? (
          <>
          <div className="mt-6 border-t border-gray-200 dark:border-zinc-800" />
          <section className="mt-6">
        <dl className="mt-4 grid gap-x-6 gap-y-4 md:grid-cols-2">
          <div className="min-w-0">
            <dt className="text-sm font-medium text-gray-700 dark:text-zinc-300">First name</dt>
            {editingNameField === "first" ? (
              <div className="inline-fade-in-soft mt-2">
                <input
                  value={firstNameValue}
                  onChange={(event) => setFirstNameValue(event.target.value)}
                  autoComplete="given-name"
                  className="w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6C47FF]/35 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      void handleNameSubmit();
                    }}
                    disabled={nameBusy}
                    className="rounded-md bg-[#6C47FF] px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-[#5B38E6] disabled:opacity-60"
                  >
                    {nameBusy ? "Saving..." : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={() => cancelNameEditor("first")}
                    className="rounded-md px-2.5 py-1.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-100 hover:text-gray-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-1 flex items-center justify-between gap-2">
                <dd className="text-base text-gray-900 dark:text-zinc-100">{firstNameValue || "Not provided"}</dd>
                <button
                  type="button"
                  onClick={() => openNameEditor("first")}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-2.5 py-1.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                  aria-label="Edit first name"
                >
                  <PencilLine className="h-3.5 w-3.5" aria-hidden />
                  <span>Edit</span>
                </button>
              </div>
            )}
          </div>

          <div className="min-w-0">
            <dt className="text-sm font-medium text-gray-700 dark:text-zinc-300">Last name</dt>
            {editingNameField === "last" ? (
              <div className="inline-fade-in-soft mt-2">
                <input
                  value={lastNameValue}
                  onChange={(event) => setLastNameValue(event.target.value)}
                  autoComplete="family-name"
                  className="w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6C47FF]/35 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      void handleNameSubmit();
                    }}
                    disabled={nameBusy}
                    className="rounded-md bg-[#6C47FF] px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-[#5B38E6] disabled:opacity-60"
                  >
                    {nameBusy ? "Saving..." : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={() => cancelNameEditor("last")}
                    className="rounded-md px-2.5 py-1.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-100 hover:text-gray-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-1 flex items-center justify-between gap-2">
                <dd className="text-base text-gray-900 dark:text-zinc-100">{lastNameValue || "Not provided"}</dd>
                <button
                  type="button"
                  onClick={() => openNameEditor("last")}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-2.5 py-1.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                  aria-label="Edit last name"
                >
                  <PencilLine className="h-3.5 w-3.5" aria-hidden />
                  <span>Edit</span>
                </button>
              </div>
            )}
          </div>

          <div className="col-span-full border-t border-gray-200 pt-4 dark:border-zinc-800" />

          <div className="min-w-0">
            <dt className="text-sm font-medium text-gray-700 dark:text-zinc-300">Email</dt>
            <dd className="mt-1 text-sm text-gray-800 dark:text-zinc-200">{email || "Unknown"}</dd>
          </div>

        </dl>
        {nameMessage ? <p className="mt-2 text-sm text-gray-600 dark:text-zinc-400">{nameMessage}</p> : null}
        </section>

        <section className="mt-8 border-t border-gray-200 pt-6 dark:border-zinc-800">
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
                className={`w-full rounded-md border bg-white px-3 py-2 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6C47FF]/35 focus-visible:ring-offset-0 read-only:cursor-not-allowed read-only:bg-gray-50 read-only:text-gray-500 dark:bg-zinc-800 dark:text-zinc-100 dark:read-only:bg-zinc-800/60 dark:read-only:text-zinc-500 ${
                  emailStep === "request" && emailRequestSubmitAttempted && !newEmail.trim()
                    ? "border-rose-500 dark:border-rose-500"
                    : "border-gray-300 dark:border-zinc-700"
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
                    className={`w-full rounded-md border bg-white px-3 py-2 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6C47FF]/35 focus-visible:ring-offset-0 dark:bg-zinc-800 dark:text-zinc-100 ${
                      emailRequestSubmitAttempted && !confirmNewEmail.trim()
                        ? "border-transparent ring-2 ring-rose-600/60 dark:ring-rose-500/50"
                        : isEmailConfirmationMismatch
                          ? "border-transparent ring-2 ring-rose-600/60 dark:ring-rose-500/50"
                          : "border-gray-300 dark:border-zinc-700"
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
                        className="h-11 w-9 rounded-lg border-2 border-slate-300 bg-white text-center text-lg text-slate-900 outline-none transition hover:border-slate-400 focus-visible:border-[#6D6AF4] focus-visible:ring-0 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:border-zinc-500 sm:h-12 sm:w-11"
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
                    className="rounded-md border-2 border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:-translate-y-[1px] hover:border-slate-400 hover:shadow-sm disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:border-zinc-500"
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
                    className="rounded-md px-2 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-100 hover:text-gray-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
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
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-300">
                {managedByGoogle ? "Email managed by Google" : "Email changes unavailable"}
              </p>
              {managedByGoogle ? (
                <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">
                  Your email is managed by Google and can&apos;t be changed here.
                </p>
              ) : (
                <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">
                  Your sign-in method manages your email address. Email changes are not available from this page.
                </p>
              )}
            </div>
          )}
        </section>

        <section className="mt-8 border-t border-gray-200 pt-6 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <Sun className="h-4 w-4 text-slate-600 dark:text-zinc-400" aria-hidden />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-zinc-100">Appearance</h2>
          </div>
          <p className="mt-1 text-sm text-gray-600 dark:text-zinc-400">Choose light or dark mode.</p>
          <div className="mt-4 max-w-xs">
            <div className="relative inline-flex h-11 w-[150px] items-center rounded-lg border border-gray-300 bg-white p-1 dark:border-zinc-700 dark:bg-zinc-900">
              <span
                aria-hidden
                className={`absolute top-1 h-[34px] w-[70px] rounded-md bg-[#6C47FF] transition-transform duration-300 ease-out ${
                  theme === "dark" ? "translate-x-[72px]" : "translate-x-0"
                }`}
              />
              <button
                type="button"
                onClick={() => applyTheme("light")}
                className={`relative z-10 w-[70px] rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  theme === "light"
                    ? "text-white"
                    : "text-gray-700 hover:bg-gray-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
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
                    : "text-gray-700 hover:bg-gray-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
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

        {activeSettingsTab === "security" && canChangePassword && (
        <section className="mt-8 border-t border-gray-200 pt-6 dark:border-zinc-800">
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
                  className={`w-full rounded-md border bg-white px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6C47FF]/35 focus-visible:ring-offset-0 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500 ${
                    currentPasswordHasError
                      ? "border-transparent ring-2 ring-rose-600/60 dark:ring-rose-500/50"
                      : "border-gray-300 dark:border-zinc-700"
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
                  className={`w-full rounded-md border bg-white px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6C47FF]/35 focus-visible:ring-offset-0 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500 ${
                    isNewPasswordMismatch || isNewPasswordRequirementsError
                      ? "border-transparent ring-2 ring-rose-600/60 dark:ring-rose-500/50"
                      : newPasswordHasError
                        ? "border-transparent ring-2 ring-rose-600/60 dark:ring-rose-500/50"
                        : "border-gray-300 dark:border-zinc-700"
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
                  className={`w-full rounded-md border bg-white px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6C47FF]/35 focus-visible:ring-offset-0 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500 ${
                    isNewPasswordMismatch || isNewPasswordRequirementsError
                      ? "border-transparent ring-2 ring-rose-600/60 dark:ring-rose-500/50"
                      : confirmPasswordHasError
                        ? "border-transparent ring-2 ring-rose-600/60 dark:ring-rose-500/50"
                        : "border-gray-300 dark:border-zinc-700"
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
        <section className="mt-8 border-t border-gray-200 pt-6 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-slate-600 dark:text-zinc-400" aria-hidden />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-zinc-100">Security</h2>
          </div>
          <p className="mt-1 text-sm text-gray-600 dark:text-zinc-400">Keep your MergifyPDF account secure.</p>
          <div className="mt-4 space-y-6">
            <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800/60">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-zinc-100">Two-factor authentication</p>
                  <p className="text-xs text-gray-600 dark:text-zinc-400">
                    Add an extra layer of protection to your account.
                  </p>
                  {twoFactorMethod && (
                    <p className="mt-1 text-xs font-medium text-green-700 dark:text-emerald-400">
                      2FA enabled · Email verification
                    </p>
                  )}
                </div>
                <div className="mt-2 sm:mt-0">
                  {twoFactorMethod ? (
                    <button
                      type="button"
                      onClick={openManageTwoFactor}
                      className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-800 transition hover:bg-white dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-700"
                    >
                      Manage
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={openEnableTwoFactor}
                      className="rounded-md bg-[#6C47FF] px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-[#5B38E6]"
                    >
                      Enable 2FA
                    </button>
                  )}
                </div>
              </div>
            </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800/60">
            <p className="text-sm font-medium text-gray-800 dark:text-zinc-100">Delete account</p>
            <p className="mt-1 text-xs text-gray-600 dark:text-zinc-400">
              Permanently delete your MergifyPDF account and all associated data. This action cannot be
              undone.
            </p>
            <button
              type="button"
              onClick={() => setDeleteModalOpen(true)}
              className="mt-3 rounded-md bg-[#DC2626] px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-[#B91C1C]"
            >
              Delete my account
            </button>
          </div>

          {managedByGoogle && (
            <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800/60">
              <p className="text-sm font-medium text-gray-800 dark:text-zinc-100">Connected account</p>
              <p className="mt-1 text-xs text-gray-600 dark:text-zinc-400">
                Your MergifyPDF account is connected to Google for sign-in.
              </p>
              <button
                type="button"
                onClick={() => setDisconnectModalOpen(true)}
                className="mt-3 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-800 transition hover:bg-white dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-700"
              >
                Disconnect Google
              </button>
            </div>
          )}
          </div>
        </section>
        ) : null}
        </div>
      </div>
      </div>

      {twoFactorModalMode && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/60 px-4 py-8">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {twoFactorModalMode === "enable" ? "Enable 2-factor authentication" : "Manage 2-factor authentication"}
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Choose how you&apos;d like to receive your verification codes, then confirm with a 6-digit code.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  resetTwoFactorModalState();
                  setTwoFactorModalMode(null);
                }}
                className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close 2FA dialog"
              >
                ✕
              </button>
            </div>

            <form
              className="mt-4 space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                if (twoFactorModalMode === "enable" || twoFactorModalMode === "manage") {
                  void handleConfirmEnableTwoFactor();
                }
              }}
            >
              <fieldset className="space-y-3">
                <legend className="text-xs font-medium text-slate-700">Verification method</legend>
                <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2 text-sm text-slate-800 hover:bg-slate-50">
                  <input
                    type="radio"
                    className="mt-1"
                    checked
                    readOnly
                  />
                  <span>
                    <span className="font-medium">Email verification</span>
                    <br />
                    <span className="text-xs text-slate-600">
                      We&apos;ll email a code when you sign in.
                    </span>
                  </span>
                </label>
              </fieldset>

              {twoFactorStep === "verify" && (
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-slate-700" htmlFor="twofactor-code">
                    Enter 6-digit code
                  </label>
                  <input
                    id="twofactor-code"
                    type="text"
                    inputMode="numeric"
                    pattern="\d{6}"
                    maxLength={6}
                    value={twoFactorCode}
                    onChange={(event) =>
                      setTwoFactorCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-center text-sm tracking-[6px] shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#024d7c]"
                  />
                </div>
              )}

              {twoFactorError && (
                <p className="text-sm text-rose-600">{twoFactorError}</p>
              )}
              {twoFactorMessage && (
                <p className="text-sm text-green-700">{twoFactorMessage}</p>
              )}

              <div className="mt-4 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setTwoFactorModalMode(null)}
                  className="rounded-md px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <div className="flex items-center gap-3">
                  {twoFactorModalMode === "manage" && twoFactorMethod && (
                    <button
                      type="button"
                      className="text-sm font-semibold text-rose-600 hover:text-rose-700"
                      onClick={() => setConfirmDisable2fa(true)}
                    >
                      Disable 2FA
                    </button>
                  )}
                  <button
                    type="submit"
                    className="rounded-md bg-[#024d7c] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#013a60]"
                    disabled={twoFactorBusy}
                  >
                    {twoFactorModalMode === "enable"
                      ? twoFactorStep === "select"
                        ? "Send code"
                        : "Turn on 2FA"
                      : twoFactorStep === "select"
                        ? "Save changes"
                        : "Confirm code"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmDisable2fa && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/60 px-4 py-8">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-slate-900">Turn off 2-factor authentication?</h2>
            <p className="mt-2 text-sm text-slate-600">
              Your account will be protected by password only.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                className="rounded-md px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                onClick={() => setConfirmDisable2fa(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-md bg-[#DC2626] px-4 py-2 text-sm font-semibold text-white hover:bg-[#B91C1C]"
                onClick={handleConfirmDisableTwoFactor}
              >
                Disable 2FA
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/60 px-4 py-8">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-slate-900">Delete your account?</h2>
            <p className="mt-2 text-sm text-slate-600">
              This will permanently delete your MergifyPDF account, documents, and settings. This action
              cannot be undone.
            </p>
            <p className="mt-2 text-xs text-slate-500">
              You may be asked to confirm your password or a verification code.
            </p>
            {deleteError && <p className="mt-3 text-sm text-rose-600">{deleteError}</p>}
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                className="rounded-md px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                onClick={() => {
                  if (deleteBusy) return;
                  setDeleteModalOpen(false);
                  setDeleteError(null);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteBusy}
                className="rounded-md bg-[#DC2626] px-4 py-2 text-sm font-semibold text-white hover:bg-[#B91C1C] disabled:opacity-60"
                onClick={handleConfirmDeleteAccount}
              >
                {deleteBusy ? "Deleting…" : "Yes, delete my account"}
              </button>
            </div>
          </div>
        </div>
      )}

      {disconnectModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/60 px-4 py-8">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Disconnect Google account?</h2>
                <p className="mt-2 text-sm text-slate-600">
                  After disconnecting, you&apos;ll sign in to MergifyPDF with an email and password instead of
                  Google.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDisconnectModalOpen(false)}
                className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close disconnect dialog"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmDisconnectGoogle} className="mt-4 space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-700">Email</label>
                <input
                  type="email"
                  readOnly
                  value={email}
                  className="w-full cursor-not-allowed rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-700" htmlFor="disconnect-password">
                  Create a password
                </label>
                <input
                  id="disconnect-password"
                  type="password"
                  value={disconnectPassword}
                  onChange={(event) => setDisconnectPassword(event.target.value)}
                  minLength={8}
                  required
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#024d7c]"
                />
                <p className="text-xs text-slate-500">
                  You&apos;ll use this password to sign in after disconnecting.
                </p>
              </div>
              {disconnectError && <p className="text-sm text-rose-600">{disconnectError}</p>}
              <div className="mt-5 flex justify-end gap-3">
                <button
                  type="button"
                  className="rounded-md px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                  onClick={() => {
                    if (disconnectBusy) return;
                    setDisconnectModalOpen(false);
                    setDisconnectError(null);
                    setDisconnectPassword("");
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={disconnectBusy || disconnectPassword.length < 8}
                  className="rounded-md bg-[#024d7c] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#013a60] disabled:opacity-60"
                >
                  {disconnectBusy ? "Saving…" : "Save and disconnect"}
                </button>
              </div>
            </form>
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
                    <div className="h-full w-full animate-pulse bg-slate-200" />
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

      <LoadingOverlay
        open={billingPortalLoading}
        label="Opening Billing Portal..."
        zIndexClassName="z-[1200]"
      />
    </main>
  );
}

export default function AccountPage() {
  const searchParams = useSearchParams();
  const view = searchParams.get("view");
  const activeSettingsTab: SettingsTab = view === "security" ? "security" : "account";

  if (view === "pricing") {
    return <PricingPlans />;
  }

  return <AccountSettingsPage activeSettingsTab={activeSettingsTab} />;
}
