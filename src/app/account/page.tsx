"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

export default function AccountPage() {
  const { data: session } = useSession();
  const authType = session?.user?.authType ?? "credentials";
  const isOAuth = authType === "oauth";

  const [email, setEmail] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailMessage, setEmailMessage] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user?.email) {
      setEmail(session.user.email);
    }
  }, [session?.user?.email]);

  async function handleEmailSubmit(event: React.FormEvent) {
    event.preventDefault();
    setEmailBusy(true);
    setEmailMessage(null);

    try {
      // TODO: hook up to API endpoint once available
      await new Promise((resolve) => setTimeout(resolve, 400));
      setEmailMessage("Email preferences saved.");
    } catch {
      setEmailMessage("Something went wrong. Please try again.");
    } finally {
      setEmailBusy(false);
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
      // TODO: hook up to API endpoint once available
      await new Promise((resolve) => setTimeout(resolve, 400));
      setPasswordMessage("Password updated.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setPasswordMessage("Unable to update password. Please try again.");
    } finally {
      setPasswordBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <div className="mb-6 text-sm text-gray-500">
        <Link className="underline decoration-[#2A7C7C]" href="/studio">
          Back to Studio
        </Link>
      </div>

      <h1 className="text-3xl font-semibold tracking-tight">Account settings</h1>
      <p className="mt-2 text-sm text-gray-600">
        Update your sign-in email or change your password below. Changes will take effect the next
        time you sign in.
      </p>

      <section className="mt-10 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Change email</h2>
        {isOAuth ? (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-gray-600">
              Your email is managed by Google and can&apos;t be changed here.
            </p>
            <label className="block text-sm font-medium text-gray-700" htmlFor="account-email">
              Email address
            </label>
            <input
              id="account-email"
              type="email"
              value={email}
              readOnly
              disabled
              className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-gray-500"
            />
          </div>
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
                className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2A7C7C] focus-visible:ring-offset-0"
              />
              <button
                type="submit"
                disabled={emailBusy}
                aria-disabled={emailBusy}
                className="rounded-md bg-[#2A7C7C] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#256666] disabled:opacity-60"
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
        {isOAuth ? (
          <p className="mt-2 text-sm text-gray-600">
            Your account is managed by Google and can&apos;t be changed here.
          </p>
        ) : (
          <>
            <p className="mt-1 text-sm text-gray-600">
              Choose a strong password that you have not used elsewhere.
            </p>
            <form onSubmit={handlePasswordSubmit} className="mt-4 space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700" htmlFor="account-password-current">
                  Current password
                </label>
                <input
                  id="account-password-current"
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  required
                  className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2A7C7C] focus-visible:ring-offset-0"
                />
              </div>
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
                  className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2A7C7C] focus-visible:ring-offset-0"
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
                  className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2A7C7C] focus-visible:ring-offset-0"
                />
              </div>
              <button
                type="submit"
                disabled={passwordBusy}
                aria-disabled={passwordBusy}
                className="rounded-md bg-[#2A7C7C] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#256666] disabled:opacity-60"
              >
                {passwordBusy ? "Saving..." : "Save password"}
              </button>
              {passwordMessage && <p className="text-sm text-gray-600">{passwordMessage}</p>}
            </form>
          </>
        )}
      </section>
    </main>
  );
}
