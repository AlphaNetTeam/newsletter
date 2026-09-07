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

// Hero H1 + lede shown at the top of each symbol page, matching the
// SEO-keyword-bearing headline pattern of the redesigned markets pages:
// "{SYM} Trading Strategies, Funding Rate & Open Interest" plus a lede that
// name-checks funding rate, open interest, volatility, Sharpe and drawdown.
export function symbolHeroTitle(symbol: string): string {
  return `${symbol} Trading Strategies, Funding Rate & Open Interest`;
}

export function symbolHeroLede(symbol: string): string {
  return `Compare systematic ${symbol} trading strategies. Track the current ${symbol} funding rate, perpetual futures open interest, 30-day historical volatility, Sharpe ratio and maximum drawdown in one place.`;
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
      `${symbol} funding rate`,
      `${symbol} open interest`,
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
