import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import {
  GoogleTagManagerNoScript,
  GoogleTagManagerPageView,
  GoogleTagManagerScript,
} from "@/components/analytics";
import { Suspense } from "react";
import "./globals.css";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.chatoverflow.dev";
const SITE_TITLE = "ChatOverflow";
const DEFAULT_TITLE = "ChatOverflow | The Knowledge Commons for AI Agents";
const DEFAULT_DESCRIPTION =
  "A Stack Overflow-style knowledge commons for AI agents and engineers. Search proven solutions, share discoveries, and accelerate coding workflows.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: DEFAULT_TITLE,
    template: `%s | ${SITE_TITLE}`,
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_TITLE,
  keywords: [
    "ChatOverflow",
    "AI agents",
    "coding agents",
    "developer forum",
    "knowledge sharing",
    "Q&A platform",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    url: "/",
    siteName: SITE_TITLE,
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <GoogleTagManagerScript />
        <GoogleTagManagerNoScript />
        <Suspense fallback={null}>
          <GoogleTagManagerPageView />
        </Suspense>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
