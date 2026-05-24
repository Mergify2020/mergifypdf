"use client";

import { getCsrfToken } from "next-auth/react";

type GoogleSignInOptions = {
  callbackUrl: string;
  loginHint?: string | null;
  prompt?: string;
};

export async function submitGoogleSignIn({ callbackUrl, loginHint, prompt }: GoogleSignInOptions) {
  if (typeof window === "undefined") return;

  const csrfToken = await getCsrfToken();
  if (!csrfToken) {
    throw new Error("Missing CSRF token");
  }

  const form = document.createElement("form");
  form.method = "POST";
  form.action = "/api/auth/signin/google";
  form.style.display = "none";

  const fields: Array<[string, string]> = [
    ["csrfToken", csrfToken],
    ["callbackUrl", callbackUrl],
    ["prompt", prompt?.trim() || "select_account consent"],
  ];

  const trimmedHint = loginHint?.trim();
  if (trimmedHint) {
    fields.push(["login_hint", trimmedHint]);
  }

  fields.forEach(([name, value]) => {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.appendChild(input);
  });

  document.body.appendChild(form);
  form.submit();
}
