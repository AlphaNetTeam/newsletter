import type { Metadata } from "next";
import { notFound } from "next/navigation";
import JsonLd from "@/components/JsonLd";
import StrategyPage from "@/components/StrategyPage";
import { SYMBOLS, isKnownSymbol } from "@/lib/config";
import { loadMarketPage } from "@/lib/load-market-page";
import { faqJsonLd, symbolDescription, symbolMetadata, webPageJsonLd } from "@/lib/seo";

export const revalidate = 60;
export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(SYMBOLS).map((symbol) => ({ symbol }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ symbol: string }>;
}): Promise<Metadata> {
  const { symbol: raw } = await params;
  const symbol = raw.toUpperCase();
  if (!isKnownSymbol(symbol)) return {};
  const data = await loadMarketPage(symbol);
  return symbolMetadata(symbol, data.stats);
}

export default async function MarketSymbolPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol: raw } = await params;
  const symbol = raw.toUpperCase();
  if (!isKnownSymbol(symbol)) notFound();

  const data = await loadMarketPage(symbol);
  const description = symbolDescription(symbol, data.stats);

  return (
    <>
      <JsonLd data={webPageJsonLd(symbol, description)} />
      <JsonLd data={faqJsonLd(symbol, data.faq)} />
      <StrategyPage data={data} />
    </>
  );
}
