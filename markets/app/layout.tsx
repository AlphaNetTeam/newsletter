import type { Metadata } from "next";
import localFont from "next/font/local";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { SITE_NAME, SITE_URL } from "@/lib/config";
import "./globals.css";

// Self-hosted (not fetched from Google at build time) — same exact font
// files as the reference page: Space Grotesk & Inter are variable fonts
// (one file covers their whole weight range), IBM Plex Mono ships as three
// static weights.
const spaceGrotesk = localFont({
  src: "../public/fonts/space-grotesk-var.woff2",
  display: "swap",
  variable: "--font-space",
});

const inter = localFont({
  src: "../public/fonts/inter-var.woff2",
  display: "swap",
  variable: "--font-inter",
});

const plexMono = localFont({
  src: [
    { path: "../public/fonts/ibm-plex-mono-400.woff2", weight: "400", style: "normal" },
    { path: "../public/fonts/ibm-plex-mono-500.woff2", weight: "500", style: "normal" },
    { path: "../public/fonts/ibm-plex-mono-600.woff2", weight: "600", style: "normal" },
  ],
  display: "swap",
  variable: "--font-plex-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} | Crypto Trading Strategies`,
    template: `%s`,
  },
  description:
    "AlphaNet is an AI quantitative trading platform with live-tracked crypto trading strategies for BTC, ETH, SOL and more — real ROI, Sharpe ratio and drawdown.",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${inter.variable} ${plexMono.variable}`}
    >
      <body>
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
