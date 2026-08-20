// <title> / meta-description copy, keyed off SymbolInfo.assetClass (a real
// backend field — see SymbolConfig.asset_class in config.py) rather than a
// hardcoded crypto-ticker list here, so this stays correct automatically
// the day a non-crypto symbol (gold, an equity index, ...) is added.
//
// Both descriptions are a single declarative "AlphaNet is a/an ..."
// sentence naming the AI Quantitative Trading Platform positioning up
// front — that phrasing is deliberate for GEO (AI answer engines tend to
// lift a clear subject-is-a-category sentence verbatim), while staying
// within the ~155-160 character window search engines render for
// classic SEO snippets.
const SEO_COPY: Record<string, { title: string; description: string }> = {
  crypto: {
    title: "AlphaNet | Crypto Trading Strategies",
    description:
      "AlphaNet is an AI quantitative trading platform with live-tracked crypto trading strategies for BTC, ETH, SOL and more — real ROI, Sharpe ratio and drawdown.",
  },
};

// Anything not explicitly "crypto" (gold, equities, indices, ...) falls
// back to this generic quant-platform framing.
const DEFAULT_COPY = {
  title: "AlphaNet | Quant Trading Strategy",
  description:
    "AlphaNet is an AI quantitative trading platform with live-tracked quant trading strategies across gold, equities and more — real ROI, Sharpe ratio and drawdown.",
};

export function seoCopyFor(assetClass: string | undefined): { title: string; description: string } {
  if (!assetClass) return SEO_COPY.crypto;
  return SEO_COPY[assetClass] ?? DEFAULT_COPY;
}

/** Updates document.title and the <meta name="description"> tag in place
 * (creating the tag if index.html didn't already have one). Safe to call
 * on every symbol change — cheap DOM writes, no React re-render involved.
 */
export function applySeoCopy(assetClass: string | undefined): void {
  const { title, description } = seoCopyFor(assetClass);
  document.title = title;

  let meta = document.querySelector('meta[name="description"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", "description");
    document.head.appendChild(meta);
  }
  meta.setAttribute("content", description);
}
