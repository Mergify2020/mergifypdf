// src/app/layout.tsx
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import Providers from "@/components/Providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "MergifyPDF",
  description: "Fast, simple PDF tools — all in your browser.",
  icons: {
    icon: [
      { url: "/favicon20-2026.svg", type: "image/svg+xml" },
      { url: "/favicon-32-2026.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16-2026.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon-2026.png", sizes: "180x180" }],
    other: [{ rel: "mask-icon", url: "/safari-pinned-tab-2026.svg", color: "#2A7C7C" }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Force light UI */}
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
        <meta name="theme-color" content="#ffffff" />

        {/* Explicit links (helps stubborn Safari/iOS) */}
        <link rel="icon" type="image/svg+xml" href="/favicon20-2026.svg" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32-2026.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16-2026.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon-2026.png" />
        <link rel="mask-icon" href="/safari-pinned-tab-2026.svg" color="#2A7C7C" />
      </head>

      <body className="min-h-screen bg-white text-gray-900">
        <header className="sticky top-0 z-50 w-full border-b border-slate-100 bg-white/95 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 lg:px-6">
            <Link href="/" className="inline-flex items-center gap-2" aria-label="Go to homepage">
              <Image src="/logo-wordmark.svg" alt="MergifyPDF" width={160} height={40} priority />
            </Link>
            <Link
              href="/settings"
              className="rounded-full border border-slate-200 px-4 py-1.5 text-sm font-medium text-gray-700 transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
            >
              Settings
            </Link>
          </div>
        </header>

        <main className="pt-4">
          <Providers>{children}</Providers>
        </main>
      </body>
    </html>
  );
}
