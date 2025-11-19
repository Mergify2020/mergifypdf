// src/app/layout.tsx
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import Providers from "@/components/Providers";
import WorkspaceSettingsMenu from "@/components/WorkspaceSettingsMenu";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { headers } from "next/headers";
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
    other: [{ rel: "mask-icon", url: "/safari-pinned-tab-2080.svg", color: "#024d7c" }],
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  const headersList = headers();
  const pathname = headersList.get("x-pathname") ?? "/";
  const showLoginButton = !session?.user && pathname === "/";

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
        <link rel="mask-icon" href="/safari-pinned-tab-2080.svg" color="#024d7c" />
      </head>

      <body className="min-h-screen bg-white text-gray-900">
        <Providers session={session}>
          <header className="sticky top-0 z-50 w-full border-b border-slate-100 bg-white/95 backdrop-blur">
            <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 lg:px-6">
              <Link
                href={session?.user ? "/" : "/"}
                className="inline-flex items-center gap-2"
                aria-label={session?.user ? "Back to workspace" : "Go to homepage"}
              >
                <Image src="/logo-wordmark2.svg" alt="MergifyPDF" width={192} height={48} priority />
              </Link>
              {session?.user ? (
                <WorkspaceSettingsMenu />
              ) : showLoginButton ? (
                <Link
                  href="/login"
                  className="inline-flex items-center rounded-full bg-[#024d7c] px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#013a60]"
                >
                  Log in
                </Link>
              ) : null}
            </div>
          </header>

          <main className="pt-4">{children}</main>

          <footer className="mt-12 bg-[#0a1523] py-12 text-gray-300">
            <div className="mx-auto grid max-w-6xl gap-8 px-6 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-white/60">Company</p>
              <p className="mt-3 text-base font-semibold text-white">MergifyPDF</p>
              <p className="mt-2 text-sm text-gray-400">
                Questions? <span className="text-gray-500">hello@example.com</span>
              </p>
              <p className="text-sm text-gray-400">
                Call us: <span className="text-gray-500">(000) 000-0000</span>
              </p>
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-white/60">Product</p>
              <ul className="mt-3 space-y-2 text-sm">
                <li>Merge PDFs</li>
                <li>Edit & Highlight</li>
                <li>Sign Documents</li>
              </ul>
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-white/60">Resources</p>
              <ul className="mt-3 space-y-2 text-sm">
                <li>Pricing</li>
                <li>Help center</li>
                <li>Roadmap</li>
              </ul>
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-white/60">Follow us</p>
              <ul className="mt-3 space-y-2 text-sm">
                <li>Twitter</li>
                <li>LinkedIn</li>
                <li>Product Hunt</li>
              </ul>
            </div>
          </div>
            <div className="mx-auto mt-10 flex max-w-6xl flex-col items-center justify-between gap-4 border-t border-white/10 px-6 pt-6 text-xs text-gray-500 sm:flex-row">
              <p>© 2025 MergifyPDF. All rights reserved.</p>
              <p>Made with care for modern document workflows.</p>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
