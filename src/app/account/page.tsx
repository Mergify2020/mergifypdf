"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

export default function AccountPage() {
  const { data: session } = useSession();
  const providers = session?.user?.providers ?? [];
  const isOAuth = providers.some((provider) => provider !== "credentials");
  const displayName = session?.user?.name ?? "";

  const [email, setEmail] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailMessage, setEmailMessage] = useState<string | null>(null);

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
        <Link className="underline decoration-[#2A7C7C]" href="/studio">
          Back to Studio
        </Link>
      </div>

      <h1 className="text-3xl font-semibold tracking-tight">Account settings</h1>
      <p className="mt-2 text-sm text-gray-600">
        Update your sign-in email or change your password below. Changes will take effect the next
        time you sign in.
      </p>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Profile</h2>
        <p className="mt-1 text-sm text-gray-600">This is how we recognize you across MergifyPDF.</p>
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
      </div>

      <section className="mt-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Change email</h2>
        {isOAuth ? (
          <p className="mt-2 text-sm text-gray-600">
            Your email address is handled by Google, so you can&apos;t update it from MergifyPDF.
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
            Your password is handled by Google, so you can&apos;t update it from MergifyPDF.
          </p>
        ) : (
          <>
            <p className="mt-1 text-sm text-gray-600">
              Choose a strong password that you have not used elsewhere.
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
