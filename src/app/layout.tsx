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
    icon: "/favicon.v2.svg", // ✅ references your SVG favicon
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* ✅ Force light color scheme across browsers */}
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
        <meta name="theme-color" content="#ffffff" />

        {/* ✅ Optional fallback if an SVG icon isn’t supported */}
        <link rel="icon" type="image/svg+xml" href="/favicon.v2.svg" />
        <link rel="alternate icon" type="image/png" href="/favicon.v2.png" />
      </head>

      <body className="min-h-screen bg-white text-gray-900">
        {/* Header */}
        <header className="w-full sticky top-0 z-50 bg-white/90 backdrop-blur border-b">
          <div className="max-w-6xl mx-auto px-4 py-3">
            <Link href="/" className="inline-flex items-center gap-2" aria-label="Go to homepage">
              <Image
                src="/logo-wordmark.svg"
                alt="MergifyPDF"
                width={160}
                height={40}
                priority
              />
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="pt-2">
          <Providers>{children}</Providers>
        </main>
      </body>
    </html>
  );
}
