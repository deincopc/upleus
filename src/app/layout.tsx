import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Analytics } from "@vercel/analytics/react";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://upleus.com";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "Upleus",
    template: "%s | Upleus",
  },
  description:
    "Monitor your websites, APIs, domains, and cron jobs. Get instant alerts when something goes wrong — before your users notice.",
  keywords: ["uptime monitoring", "website monitoring", "SSL monitoring", "domain expiry", "status page"],
  authors: [{ name: "Upleus" }],
  openGraph: {
    type: "website",
    siteName: "Upleus",
    title: "Upleus — Uptime Monitoring",
    description:
      "Monitor your websites, APIs, domains, and cron jobs. Get instant alerts when something goes wrong.",
    url: APP_URL,
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Upleus" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Upleus — Uptime Monitoring",
    description:
      "Monitor your websites, APIs, domains, and cron jobs. Get instant alerts when something goes wrong.",
    images: ["/og.png"],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${geist.variable} h-full antialiased`} suppressHydrationWarning>
        <body className="min-h-full bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
          <ThemeProvider>
            {children}
          </ThemeProvider>
          <Analytics />
        </body>
      </html>
    </ClerkProvider>
  );
}
