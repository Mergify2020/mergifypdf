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
      { url: "/favicon20.svg", type: "image/svg+xml" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" }, // ← add this
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],       // ← include size
    other: [{ rel: "mask-icon", url: "/safari-pinned-tab.svg", color: "#2A7C7C" }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
        <meta name="theme-color" content="#ffffff" />
      </head>
      <body className="min-h-screen bg-white text-gray-900">
        <header className="w-full sticky top-0 z-50 bg-white/90 backdrop-blur border-b">
          <div className="max-w-6xl mx-auto px-4 py-3">
            <Link href="/" className="inline-flex items-center gap-2" aria-label="Go to homepage">
              <Image src="/logo-wordmark.svg" alt="MergifyPDF" width={160} height={40} priority />
            </Link>
          </div>
        </header>
        <main className="pt-2">
          <Providers>{children}</Providers>
        </main>
      </body>
    </html>
  );
}
