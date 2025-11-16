"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAvatarPreference } from "@/lib/useAvatarPreference";

export default function AccountPage() {
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
  const { avatar, setAvatar, clearAvatar } = useAvatarPreference();
  const [avatarMessage, setAvatarMessage] = useState<string | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [pendingAvatar, setPendingAvatar] = useState<string | null>(null);
  const [imageMeta, setImageMeta] = useState<{ width: number; height: number } | null>(null);
  const [baseScale, setBaseScale] = useState(1);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const dragInfoRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const cropCircleSize = 280;

  useEffect(() => {
    if (session?.user?.email) {
      setEmail(session.user.email);
    }
  }, [session?.user?.email]);

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
      setImageMeta({ width: img.width, height: img.height });
      const minDim = Math.min(img.width, img.height) || 1;
      const nextBase = cropCircleSize / minDim;
      setBaseScale(nextBase);
      setScale(1);
      setPosition({ x: 0, y: 0 });
    };
    img.onerror = () => {
      setAvatarMessage("Unable to open that image. Try another file.");
      setPendingAvatar(null);
      setShowCropper(false);
    };
  }, [pendingAvatar]);

  const clampPosition = useCallback(
    (x: number, y: number, customScale = scale) => {
      if (!imageMeta) return { x, y };
      const scaledWidth = imageMeta.width * baseScale * customScale;
      const scaledHeight = imageMeta.height * baseScale * customScale;
      const maxX = Math.max(0, (scaledWidth - cropCircleSize) / 2);
      const maxY = Math.max(0, (scaledHeight - cropCircleSize) / 2);
      return {
        x: Math.min(Math.max(x, -maxX), maxX),
        y: Math.min(Math.max(y, -maxY), maxY),
      };
    },
    [imageMeta, baseScale, scale, cropCircleSize]
  );

  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      if (!dragInfoRef.current) return;
      const diffX = event.clientX - dragInfoRef.current.startX;
      const diffY = event.clientY - dragInfoRef.current.startY;
      setPosition(clampPosition(dragInfoRef.current.origX + diffX, dragInfoRef.current.origY + diffY));
    },
    [clampPosition]
  );

  const handlePointerUp = useCallback(() => {
    dragInfoRef.current = null;
    window.removeEventListener("pointermove", handlePointerMove);
    window.removeEventListener("pointerup", handlePointerUp);
  }, [handlePointerMove]);

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    dragInfoRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      origX: position.x,
      origY: position.y,
    };
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  }

  useEffect(() => {
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [handlePointerMove, handlePointerUp]);

  function handleScaleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const next = Number(event.target.value);
    const nextScale = Number.isNaN(next) ? scale : next;
    setScale(nextScale);
    setPosition((prev) => clampPosition(prev.x, prev.y, nextScale));
  }

  function handleCropCancel() {
    setShowCropper(false);
    setPendingAvatar(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleCropConfirm() {
    if (!pendingAvatar || !imageMeta) return;
    setAvatarBusy(true);
    const image = new Image();
    image.src = pendingAvatar;
    image.onload = () => {
      const canvasSize = 512;
      const circleRadius = canvasSize / 2;
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
      const effectiveRadius = (cropCircleSize - 32) / 2;
      const scaleFactor = canvasSize / cropCircleSize;
      ctx.beginPath();
      ctx.arc(circleRadius, circleRadius, effectiveRadius * scaleFactor, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();

      const previewToOutput = canvasSize / (cropCircleSize - 32);
      ctx.translate(canvasSize / 2, canvasSize / 2);
      ctx.scale(previewToOutput, previewToOutput);
      ctx.translate(position.x, position.y);
      ctx.scale(scale * baseScale, scale * baseScale);
      ctx.translate(-image.width / 2, -image.height / 2);
      ctx.drawImage(image, 0, 0);
      ctx.restore();

      const dataUrl = canvas.toDataURL("image/png");
      setAvatar(dataUrl);
      setAvatarBusy(false);
      setAvatarMessage("Profile photo updated.");
      setShowCropper(false);
      setPendingAvatar(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    };
    image.onerror = () => {
      setAvatarBusy(false);
      setAvatarMessage("Unable to process that photo. Try a different file.");
    };
  }

  function handleAvatarReset() {
    clearAvatar();
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setAvatarMessage("Reverted to the default avatar.");
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

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <div className="mb-6 text-sm text-gray-500">
        <Link className="underline decoration-[#024d7c]" href="/studio">
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
              // eslint-disable-next-line @next/next/no-img-element
              <img src="/Defaultpfp.svg" alt="Default avatar" className="h-16 w-16 rounded-full" />
            )}
            <div>
              <p className="text-sm font-semibold text-gray-800">Profile photo</p>
              <p className="text-xs text-gray-500">
                JPG, PNG, or GIF. We’ll crop it into a circle automatically.
              </p>
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

      <section className="mt-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Change email</h2>
        {!canManageEmail ? (
          <p className="mt-2 text-sm text-gray-600">
            {managedByGoogle
              ? "Your email is handled by Google."
              : "Your email is handled by your sign-in provider, so you can't update it from MergifyPDF."}
          </p>
        ) : (
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
        )}
      </section>

      <section className="mt-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Change password</h2>
        {!canChangePassword ? (
          <p className="mt-2 text-sm text-gray-600">
            {managedByGoogle
              ? "Your password is handled by Google."
              : "Your password is handled by your sign-in provider, so you can't update it from MergifyPDF."}
          </p>
        ) : (
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
        )}
      </section>

      {showCropper && pendingAvatar ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 px-4 py-8">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Adjust your profile photo</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Drag to center the picture inside the circle. Use the slider to zoom.
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
                <div
                  className="relative h-64 w-64 cursor-grab overflow-hidden rounded-3xl bg-white shadow-inner shadow-slate-400/30"
                  onPointerDown={handlePointerDown}
                  role="presentation"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={pendingAvatar}
                    alt="Crop preview"
                    draggable={false}
                    className="pointer-events-none absolute left-1/2 top-1/2 select-none"
                    style={{
                      transform: `translate(-50%, -50%) translate(${position.x}px, ${position.y}px) scale(${scale * baseScale})`,
                      transformOrigin: "center",
                    }}
                  />
                  <div
                    className="pointer-events-none absolute inset-4 rounded-full border border-slate-800/40"
                    style={{ boxShadow: "0 0 0 999px rgba(15,23,42,0.6)" }}
                  />
                  <div
                    className="pointer-events-none absolute inset-4 rounded-full"
                    style={{
                      backgroundImage:
                        "linear-gradient(#dbeafe 1px, transparent 1px), linear-gradient(90deg, #dbeafe 1px, transparent 1px)",
                      backgroundSize: `${(cropCircleSize - 32) / 3}px ${(cropCircleSize - 32) / 3}px`,
                    }}
                  />
                </div>
              </div>

              <div className="w-full max-w-sm">
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Zoom
                </label>
                <input
                  type="range"
                  min="1"
                  max="2.5"
                  step="0.01"
                  value={scale}
                  onChange={handleScaleChange}
                  className="mt-2 w-full accent-[#024d7c]"
                />
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
