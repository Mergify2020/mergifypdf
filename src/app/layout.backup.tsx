import "./globals.css";
import type { Metadata } from "next";
import { SessionProvider } from "next-auth/react";

export const metadata: Metadata = {
  title: "MergifyPDF",
  description: "Fast, simple PDF tools — all in your browser.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
