// src/app/layout.tsx
import type { Metadata } from "next";
import Image from "next/image";
import Providers from "@/components/Providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "MergifyPDF",
  description: "Fast, simple PDF tools — all in your browser.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="relative min-h-screen">
        {/* Top-right logo */}
        <div className="absolute top-4 right-4">
          <Image
            src="/logo.png"          // make sure your file lives at /public/logo.png
            alt="MergifyPDF logo"
            width={130}
            height={40}
            priority
          />
        </div>

        {/* App content */}
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
