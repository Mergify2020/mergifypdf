// src/app/layout.tsx
import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { cookies } from "next/headers";
import Providers from "@/components/Providers";
import "./globals.css";

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

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const themeCookie = cookieStore.get?.("theme")?.value;
  const themeClass = themeCookie === "dark" ? "dark" : undefined;
  const themeColor = themeCookie === "dark" ? "#222224" : "#ffffff";
  const colorScheme = themeCookie === "dark" ? "dark light" : "light dark";

  return (
    <html lang="en" className={themeClass} suppressHydrationWarning>
      <head>
        {/* Set the initial theme metadata before hydration */}
        <meta name="color-scheme" content={colorScheme} />
        <meta name="supported-color-schemes" content={colorScheme} />
        <meta name="theme-color" content={themeColor} />

        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                try {
                  var stored = localStorage.getItem("theme");
                  var fallback = document.documentElement.classList.contains("dark") ? "dark" : "light";
                  var theme = stored === "dark" || stored === "light" ? stored : fallback;
                  document.documentElement.classList.toggle("dark", theme === "dark");
                  localStorage.setItem("theme", theme);
                  document.cookie = "theme=" + theme + "; path=/; max-age=31536000";
                } catch (e) {}
              })();
            `,
          }}
        />

        {/* Explicit links (helps stubborn Safari/iOS) */}
        <link rel="icon" href="/favicons/favicon.ico" sizes="any" />
        <link rel="icon" type="image/svg+xml" href="/favicons/favicon.svg" />
        <link rel="icon" type="image/png" sizes="48x48" href="/favicons/favicon-48x48.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicons/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicons/favicon-16x16.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/favicons/apple-touch-icon.png" />
        <link rel="mask-icon" href="/favicons/safari-pinned-tab.svg" color="#024d7c" />
        <link rel="manifest" href="/favicons/site.webmanifest" />

        {/* TrustBox script */}
        <Script
          src="//widget.trustpilot.com/bootstrap/v5/tp.widget.bootstrap.min.js"
          strategy="afterInteractive"
        />
      </head>

      <body className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
