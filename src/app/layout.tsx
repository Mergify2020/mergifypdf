// src/app/layout.tsx
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import Providers from "@/components/Providers";
import WorkspaceSettingsMenu from "@/components/WorkspaceSettingsMenu";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import "./globals.css";

export const metadata: Metadata = {
  title: "MergifyPDF",
  description: "Fast, simple PDF tools — all in your browser.",
  icons: {
    icon: [
      { url: "/favicon2080.svg", type: "image/svg+xml" },
      { url: "/favicon-32-2080.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16-2080.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon-2080.png", sizes: "180x180" }],
    other: [{ rel: "mask-icon", url: "/safari-pinned-tab-2080.svg", color: "#009DFD" }],
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en">
      <head>
        {/* Force light UI */}
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
        <meta name="theme-color" content="#ffffff" />

        {/* Explicit links (helps stubborn Safari/iOS) */}
        <link rel="icon" type="image/svg+xml" href="/favicon2080.svg" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32-2080.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16-2080.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon-2080.png" />
        <link rel="mask-icon" href="/safari-pinned-tab-2080.svg" color="#009DFD" />
      </head>

      <body className="min-h-screen bg-white text-gray-900">
        <header className="sticky top-0 z-50 w-full border-b border-slate-100 bg-white/95 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 lg:px-6">
            <Link href="/" className="inline-flex items-center gap-2" aria-label="Go to homepage">
              <Image src="/logo-wordmark2.svg" alt="MergifyPDF" width={160} height={40} priority />
            </Link>
            {session?.user ? <WorkspaceSettingsMenu /> : null}
          </div>
        </header>

        <main className="pt-4">
          <Providers session={session}>{children}</Providers>
        </main>
      </body>
    </html>
  );
}
