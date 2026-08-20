import type { Metadata } from "next";
import { SITE_NAME, SITE_URL, SYMBOLS } from "./config";
import { formatPct, formatUsd } from "./format";
import type { FaqData, StatsData } from "./types";

export function symbolTitle(symbol: string): string {
  const name = SYMBOLS[symbol]?.name ?? symbol;
  return `${symbol} Trading Strategy | ${name} | ${SITE_NAME}`;
}

export function symbolDescription(symbol: string, stats?: StatsData | null): string {
  const name = SYMBOLS[symbol]?.name ?? symbol;
  if (stats) {
    return `${SITE_NAME} is an AI quantitative trading platform. ${name} (${symbol}) trading strategies with live ROI, Sharpe and drawdown — price ${formatUsd(stats.currentPrice)}, 1Y ${formatPct(stats.change1y)}.`;
  }
  return `${SITE_NAME} is an AI quantitative trading platform with live-tracked ${name} (${symbol}) trading strategies — real ROI, Sharpe ratio, drawdown and Hyperliquid market metrics.`;
}

export function symbolMetadata(symbol: string, stats?: StatsData | null): Metadata {
  const title = symbolTitle(symbol);
  const description = symbolDescription(symbol, stats);
  const url = `${SITE_URL}/${symbol}`;
  const name = SYMBOLS[symbol]?.name ?? symbol;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      siteName: SITE_NAME,
      title,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    keywords: [
      `${symbol} trading strategy`,
      `${name} quantitative trading`,
      "AlphaNet",
      "Hyperliquid",
      "crypto trading strategies",
    ],
  };
}

export function faqJsonLd(symbol: string, faq: FaqData) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.entries.map((e) => ({
      "@type": "Question",
      name: e.question,
      acceptedAnswer: { "@type": "Answer", text: e.answer },
    })),
  };
}

export function webPageJsonLd(symbol: string, description: string) {
  const name = SYMBOLS[symbol]?.name ?? symbol;
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `${symbol} trading strategy`,
    description,
    url: `${SITE_URL}/${symbol}`,
    about: {
      "@type": "FinancialProduct",
      name: `${name} perpetual trading strategies`,
      description,
    },
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Markets", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: `${symbol} trading strategy`, item: `${SITE_URL}/${symbol}` },
      ],
    },
  };
}
