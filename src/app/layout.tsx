// src/app/layout.tsx
import type { Metadata } from "next";
import Link from "next/link";
import Providers from "@/components/Providers";
import WorkspaceSettingsMenu from "@/components/WorkspaceSettingsMenu";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import HeaderLoginButton from "@/components/HeaderLoginButton";
import AppHeaderBrand from "@/components/AppHeaderBrand";
import Footer from "@/components/Footer";
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
          <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/90 backdrop-blur">
            <div className="mx-auto flex h-[76px] w-full max-w-7xl items-center justify-between px-4 lg:px-6">
              <AppHeaderBrand />
              {session?.user ? (
                <WorkspaceSettingsMenu />
              ) : (
                <div className="flex items-center gap-3">
                  <Link
                    href="/account?view=pricing"
                    className="hidden rounded-full bg-gradient-to-r from-[#6A4EE8] via-[#5C6CFF] to-[#024d7c] p-[2px] text-xs shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg sm:inline-flex"
                  >
                    <span className="flex w-full items-center justify-center rounded-full bg-white px-8 py-2.5 font-semibold text-slate-800">
                      Pricing
                    </span>
                  </Link>
                  <HeaderLoginButton />
                </div>
              )}
            </div>
          </header>
          <main>{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
