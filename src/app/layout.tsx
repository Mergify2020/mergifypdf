// src/app/layout.tsx
import type { Metadata, Viewport } from "next";
import Script from "next/script";
import Providers from "@/components/Providers";
import "./globals.css";
import "./enduranceProbe.css";

export const metadata: Metadata = {
  title: "MergifyPDF",
  description: "Fast, simple PDF tools — all in your browser.",
  icons: {
    icon: [
      { url: "/favicons/favicon.svg", type: "image/svg+xml" },
      { url: "/favicons/favicon-48x48.png", sizes: "48x48", type: "image/png" },
      { url: "/favicons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicons/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/favicons/apple-touch-icon.png", sizes: "180x180" }],
    other: [{ rel: "mask-icon", url: "/favicons/safari-pinned-tab.svg", color: "#024d7c" }],
  },
  manifest: "/favicons/site.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

const initialThemeScript = `
  try {
    const stored = localStorage.getItem("theme");
    const dark = stored === "dark";
    const root = document.documentElement;
    const surface = dark ? "#222224" : "#f1f4f9";
    const foreground = dark ? "#f5f5f5" : "#171717";
    root.classList.toggle("dark", dark);
    root.style.backgroundColor = surface;
    root.style.color = foreground;
    root.style.colorScheme = dark ? "dark light" : "light dark";
    root.style.setProperty("--app-surface", surface);
    root.style.setProperty("--app-foreground", foreground);
    root.style.setProperty("--spinner-track", dark ? "#3f3f3f" : "#d9ccff");
    root.style.setProperty("--spinner-head", "#6C47FF");
    const themeMeta = document.querySelector("meta[name=theme-color]");
    if (themeMeta) themeMeta.setAttribute("content", surface);
  } catch {}
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const externalServicesEnabled =
    process.env.NODE_ENV === "production" &&
    process.env.APP_RUNTIME_ENV === "production";

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Set the initial theme metadata before hydration */}
        <meta name="color-scheme" content="light dark" />
        <meta name="supported-color-schemes" content="light dark" />
        <meta name="theme-color" content="#f1f4f9" />
        <script dangerouslySetInnerHTML={{ __html: initialThemeScript }} />

        {/* Theme preference sync happens client-side after hydration. */}

        {/* Explicit links (helps stubborn Safari/iOS) */}
        <link rel="icon" href="/favicons/favicon.ico" sizes="any" />
        <link rel="icon" type="image/svg+xml" href="/favicons/favicon.svg" />
        <link rel="icon" type="image/png" sizes="48x48" href="/favicons/favicon-48x48.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicons/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicons/favicon-16x16.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/favicons/apple-touch-icon.png" />
        <link rel="mask-icon" href="/favicons/safari-pinned-tab.svg" color="#024d7c" />
        <link rel="manifest" href="/favicons/site.webmanifest" />

        {externalServicesEnabled ? (
          <Script
            src="//widget.trustpilot.com/bootstrap/v5/tp.widget.bootstrap.min.js"
            strategy="afterInteractive"
          />
        ) : null}
      </head>

      <body className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
        <Providers analyticsEnabled={externalServicesEnabled}>{children}</Providers>
      </body>
    </html>
  );
}
