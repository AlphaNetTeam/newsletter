import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import Header from "@/components/Header";
import { SITE_NAME, SITE_URL } from "@/lib/config";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-jakarta",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} | Crypto Trading Strategies`,
    template: `%s`,
  },
  description:
    "AlphaNet is an AI quantitative trading platform with live-tracked crypto trading strategies for BTC, ETH, SOL and more — real ROI, Sharpe ratio and drawdown.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={jakarta.variable}>
      <body>
        <Header />
        {children}
      </body>
    </html>
  );
}
