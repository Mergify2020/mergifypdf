// src/app/layout.tsx
import type { Metadata } from "next";
import Providers from "@/components/Providers";
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
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
