import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import type { ReactNode } from "react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BUG//BOX — Don't explain the bug. Package it.",
  description:
    "BUG//BOX captures user action timelines, console errors, network failures, screenshots and environment details into a shareable, reproducible Bug Box that developers can replay.",
  keywords: ["bug reporting", "debugging", "qa", "developer tools", "bug reproduction"],
  openGraph: {
    title: "BUG//BOX",
    description: "Turn 'it doesn't work' into reproducible, sanitized evidence packages.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-950 text-slate-100">
        {children}
      </body>
    </html>
  );
}
