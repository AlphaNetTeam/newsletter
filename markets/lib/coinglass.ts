// Deprecated: the 24H LIQUIDATION metric now comes from HyperTracker
// instead of CoinGlass — see ./hypertracker.ts. This file is kept only
// because this environment can't delete files on your machine; nothing
// imports it anymore, and it's safe to delete it yourself
// (`rm lib/coinglass.ts`).
export { fetchLiquidation24h } from "./hypertracker";
