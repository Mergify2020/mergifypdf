// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import { cookies } from "next/headers";
import Providers from "@/components/Providers";
import { getServerSessionSafe } from "@/lib/serverSession";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap" });

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

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSessionSafe();
  const cookieStore = await cookies();
  const themeCookie = cookieStore.get?.("theme")?.value;
  const themeClass = themeCookie === "dark" ? "dark" : undefined;

  return (
    <html lang="en" className={themeClass} suppressHydrationWarning>
      <head>
        {/* Force light UI */}
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
        <meta name="theme-color" content="#ffffff" />

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

      <body className={`${inter.className} min-h-screen bg-white text-gray-900 dark:bg-[#222224] dark:text-zinc-100`}>
        <Providers session={session}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
