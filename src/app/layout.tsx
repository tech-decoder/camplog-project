import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CampLog — Campaign Change Tracking for Ad Arbitrage Teams",
  description:
    "Stop tracking campaign changes in spreadsheets. CampLog captures changes in a chat interface and tracks impact with AI. Built for performance marketing teams.",
  metadataBase: new URL("https://camplog-ltv.vercel.app"),
  openGraph: {
    title: "CampLog — Campaign Change Tracking for Ad Arbitrage Teams",
    description:
      "Stop tracking campaign changes in spreadsheets. CampLog captures changes in a chat interface and tracks impact with AI.",
    siteName: "CampLog",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CampLog — Campaign Change Tracking for Ad Arbitrage Teams",
    description:
      "Stop tracking campaign changes in spreadsheets. CampLog captures changes in a chat interface and tracks impact with AI.",
  },
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <TooltipProvider>
          {children}
          <Toaster />
          <Analytics />
        </TooltipProvider>
      </body>
    </html>
  );
}
