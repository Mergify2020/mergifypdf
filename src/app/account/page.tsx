"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { useAvatarPreference } from "@/lib/useAvatarPreference";
import { getAvatarFallback } from "@/lib/avatarFallback";
import PricingPlans from "@/components/PricingPlans";

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

function AccountSettingsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const providers = session?.user?.providers ?? [];
  const hasCredentialsAccess = providers.length === 0 || providers.includes("credentials");
  const managedByGoogle = !hasCredentialsAccess && providers.includes("google");
  const canManageEmail = hasCredentialsAccess;
  const canChangePassword = hasCredentialsAccess;
  const displayName = session?.user?.name ?? "";

  const [email, setEmail] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailMessage, setEmailMessage] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const avatarKey = session?.user?.email ?? session?.user?.id ?? null;
  const fallbackAvatar = getAvatarFallback(
    avatarKey,
    displayName || session?.user?.email || "User"
  );
  const { avatar, setAvatar, clearAvatar } = useAvatarPreference(avatarKey);
  const [avatarMessage, setAvatarMessage] = useState<string | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  useEffect(() => {
    if (session?.user?.email) {
      setEmail(session.user.email);
    }
  }, [session?.user?.email]);

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

  async function handleEmailSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canManageEmail) {
      setEmailMessage(managedByGoogle ? "Your email is handled by Google." : "Email changes are disabled for your sign-in method.");
      return;
    }
    setEmailBusy(true);
    setEmailMessage(null);

    try {
      const response = await fetch("/api/account/update-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to update email.");
      }
      setEmailMessage("Email updated.");
    } catch (error) {
      setEmailMessage(
        error instanceof Error ? error.message : "Something went wrong. Please try again."
      );
    } finally {
      setEmailBusy(false);
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

    if (newPassword !== confirmPassword) {
      setPasswordMessage("Passwords do not match.");
      return;
    }

    setPasswordBusy(true);
    try {
      const response = await fetch("/api/account/update-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to update password.");
      }
      setPasswordMessage("Password updated.");
      setNewPassword("");
      setConfirmPassword("");
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
    <main className="mx-auto max-w-2xl px-6 py-12">
      <div className="mb-6 text-sm text-gray-500">
        <Link className="underline decoration-[#024d7c]" href="/">
          Back to Studio
        </Link>
      </div>

      <h1 className="text-3xl font-semibold tracking-tight">Account settings</h1>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Profile</h2>
        <dl className="mt-4 space-y-3">
          <div>
            <dt className="text-sm font-medium text-gray-700">Name</dt>
            <dd className="text-sm text-gray-800">{displayName || "Not provided"}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-700">Email</dt>
            <dd className="text-sm text-gray-800">{email || "Unknown"}</dd>
          </div>
        </dl>
        <div className="mt-4 flex flex-col gap-3 rounded-xl border border-dashed border-gray-200 bg-gray-50/80 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatar} alt="Profile preview" className="h-16 w-16 rounded-full object-cover" />
            ) : (
              <span
                className="flex h-16 w-16 items-center justify-center rounded-full text-lg font-semibold uppercase text-white"
                style={{ backgroundColor: fallbackAvatar.color }}
              >
                {fallbackAvatar.initials}
              </span>
            )}
            <div>
              <p className="text-sm font-semibold text-gray-800">Profile photo</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleAvatarClick}
              disabled={avatarBusy}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-800 transition hover:bg-white disabled:opacity-50"
            >
              {avatarBusy ? "Uploading…" : "Upload photo"}
            </button>
            <button
              type="button"
              onClick={handleAvatarReset}
              className="rounded-lg border border-transparent px-3 py-2 text-sm text-gray-600 hover:text-gray-900"
            >
              Remove
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>
        </div>
        {avatarMessage && <p className="mt-2 text-sm text-gray-600">{avatarMessage}</p>}
      </div>

      {canManageEmail && (
        <section className="mt-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Change email</h2>
          <>
            <p className="mt-1 text-sm text-gray-600">
              We will send confirmations to this email address.
            </p>
            <form onSubmit={handleEmailSubmit} className="mt-4 space-y-4">
              <label className="block text-sm font-medium text-gray-700" htmlFor="account-email">
                Email address
              </label>
              <input
                id="account-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#024d7c] focus-visible:ring-offset-0"
              />
              <button
                type="submit"
                disabled={emailBusy}
                aria-disabled={emailBusy}
                className="rounded-md bg-[#024d7c] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#013a60] disabled:opacity-60"
              >
                {emailBusy ? "Saving..." : "Save email"}
              </button>
              {emailMessage && <p className="text-sm text-gray-600">{emailMessage}</p>}
            </form>
          </>
        </section>
      )}

      {canChangePassword && (
        <section className="mt-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Change password</h2>
          <>
            <p className="mt-1 text-sm text-gray-600">
              Choose a new password that you have not used elsewhere.
            </p>
            <form onSubmit={handlePasswordSubmit} className="mt-4 space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700" htmlFor="account-password-new">
                  New password
                </label>
                <input
                  id="account-password-new"
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  required
                  minLength={8}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#024d7c] focus-visible:ring-offset-0"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700" htmlFor="account-password-confirm">
                  Confirm new password
                </label>
                <input
                  id="account-password-confirm"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                  minLength={8}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#024d7c] focus-visible:ring-offset-0"
                />
              </div>
              <button
                type="submit"
                disabled={passwordBusy}
                aria-disabled={passwordBusy}
                className="rounded-md bg-[#024d7c] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#013a60] disabled:opacity-60"
              >
                {passwordBusy ? "Saving..." : "Save password"}
              </button>
              {passwordMessage && <p className="text-sm text-gray-600">{passwordMessage}</p>}
            </form>
          </>
        </section>
      )}

      <section className="mt-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Security</h2>
        <p className="mt-1 text-sm text-gray-600">Keep your MergifyPDF account secure.</p>
        <div className="mt-4 flex flex-col gap-3 rounded-lg border border-gray-200 bg-gray-50/80 p-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800">Two-factor authentication</p>
              <p className="text-xs text-gray-600">
                Add an extra layer of protection to your account.
              </p>
              {twoFactorMethod && (
                <p className="mt-1 text-xs font-medium text-green-700">
                  2FA enabled · Email verification
                </p>
              )}
            </div>
            <div className="mt-2 sm:mt-0">
              {twoFactorMethod ? (
                <button
                  type="button"
                  onClick={openManageTwoFactor}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-800 transition hover:bg-white"
                >
                  Manage
                </button>
              ) : (
                <button
                  type="button"
                  onClick={openEnableTwoFactor}
                  className="rounded-md bg-[#024d7c] px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-[#013a60]"
                >
                  Enable 2FA
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Data &amp; Privacy</h2>
        <p className="mt-1 text-sm text-gray-600">
          Control how your data and account are handled.
        </p>
        <div className="mt-4 space-y-6">
          <div className="rounded-lg border border-gray-200 bg-gray-50/80 p-4">
            <p className="text-sm font-medium text-gray-800">Delete account</p>
            <p className="mt-1 text-xs text-gray-600">
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
            <div className="rounded-lg border border-gray-200 bg-gray-50/80 p-4">
              <p className="text-sm font-medium text-gray-800">Connected account</p>
              <p className="mt-1 text-xs text-gray-600">
                Your MergifyPDF account is connected to Google for sign-in.
              </p>
              <button
                type="button"
                onClick={() => setDisconnectModalOpen(true)}
                className="mt-3 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-800 transition hover:bg-white"
              >
                Disconnect Google
              </button>
            </div>
          )}
        </div>
      </section>

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
    </main>
  );
}

export default function AccountPage() {
  const searchParams = useSearchParams();
  const view = searchParams.get("view");

  if (view === "pricing") {
    return <PricingPlans />;
  }

  return <AccountSettingsPage />;
}
