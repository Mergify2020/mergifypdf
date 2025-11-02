// src/app/forgot-password/page.tsx
"use client";

import { useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle"|"loading"|"done">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage(null);
    setIsError(false);

    try {
      const res = await fetch("/api/auth/request-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      setMessage(data?.message ?? "Request processed.");
      setIsError(!data?.ok);
    } catch {
      setMessage("We couldn’t process the reset right now. Please try again.");
      setIsError(true);
    } finally {
      setStatus("done");
    }
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Forgot your password?</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full border rounded px-3 py-2"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="w-full rounded bg-blue-600 text-white py-2 disabled:opacity-60"
        >
          {status === "loading" ? "Sending…" : "Send reset link"}
        </button>
      </form>

      {message && (
        <p className={`mt-4 text-sm ${isError ? "text-red-600" : "text-green-700"}`}>
          {message}
        </p>
      )}
      {!isError && status === "done" && (
        <p className="mt-2 text-xs text-gray-500">
          Tip: It may take a few minutes to show up. Check spam/junk too.
        </p>
      )}
    </div>
  );
}
