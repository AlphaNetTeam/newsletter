import { ABOUT_CONTENT, SYMBOLS } from "./config";
import type { AboutData, FaqData, StrategiesData } from "./types";

export function getAbout(symbol: string): AboutData {
  const content = ABOUT_CONTENT[symbol];
  if (!content) return { symbol, paragraphs: [], factors: [], source: "static" };
  return {
    symbol,
    paragraphs: content.paragraphs,
    factors: content.factors,
    source: "static",
  };
}

function fmtPct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function buildFaq(
  symbol: string,
  strategiesData: StrategiesData,
  holdingDrawdown: number | null,
): FaqData {
  const name = SYMBOLS[symbol].name;
  const strategies = strategiesData.strategies;
  const count = strategies.length;
  const neutralCount = strategies.filter((s) => s.tagline.toLowerCase().includes("neutral")).length;
  const best = strategies[0];
  const shortCapable =
    strategies.find((s) => s.name.toLowerCase().includes("short")) ?? strategies[strategies.length - 1];

  const q1 = best
    ? `By 30-day ROI, ${best.name} is currently on top: ${fmtPct(best.roi)}, with a ${best.sharpe.toFixed(2)} Sharpe ratio and a ${fmtPct(best.maxDrawdown)} worst drawdown.`
    : `Live strategy rankings for ${symbol} appear as soon as performance data is available.`;

  const holdingAnswer =
    holdingDrawdown != null
      ? `Holding took a ${fmtPct(holdingDrawdown)} peak-to-trough loss over this period. The strategies hold ${symbol} exposure part of the time and hedge or flip short in downtrends.`
      : `The strategies hold ${symbol} exposure part of the time and hedge or flip short in downtrends, rather than being exposed to its full peak-to-trough drawdown.`;

  return {
    symbol,
    entries: [
      { question: `What is the best ${symbol} trading strategy?`, answer: q1 },
      {
        question: `Do I have to predict where ${symbol} goes?`,
        answer: `No. You choose a strategy and an allocation; the model decides direction, size and timing. ${neutralCount} of the ${count} are net-neutral on average.`,
      },
      { question: `How is this different from holding ${name}?`, answer: holdingAnswer },
      {
        question: "What is the minimum allocation?",
        answer:
          "1,000 USDC per strategy. Capital stays in your own account; AlphaNet holds trading permission only.",
      },
      {
        question: `Can these strategies short ${symbol}?`,
        answer: shortCapable
          ? `Yes. All ${count} run long, short or flat on the perpetual, and ${shortCapable.name} is short-biased by design.`
          : `Yes. Strategies can run long, short or flat on the ${symbol} perpetual.`,
      },
      {
        question: "What happens if a strategy stops working?",
        answer:
          "Every model runs under an alpha-decay monitor. Drifting strategies are capped, retrained or retired, and their full history stays published here.",
      },
    ],
  };
}
