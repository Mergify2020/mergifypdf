// src/app/layout.tsx
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import Providers from "@/components/Providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "MergifyPDF",
  description: "Fast, simple PDF tools — all in your browser.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        {/* Header */}
        <header className="w-full sticky top-0 z-50 bg-white/90 backdrop-blur border-b">
          <div className="max-w-6xl mx-auto px-4 py-3">
            <Link href="/" className="inline-flex items-center gap-2" aria-label="Go to homepage">
              {/* Use the SVG in /public. Next/Image passes SVG through unmodified (nice and crisp). */}
              <Image
                src="/logo-wordmark.svg"  // <-- put your Canva SVG in /public as logo-wordmark.svg
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
