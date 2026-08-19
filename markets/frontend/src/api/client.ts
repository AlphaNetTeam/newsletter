import type {
  AboutData,
  ApiResponse,
  CorrelationData,
  FaqData,
  MetricsData,
  NewsData,
  PriceHistoryData,
  RangeKey,
  StatsData,
  StrategiesData,
  SymbolInfo,
  VolatilityData,
} from "./types";

// Same pattern as the production app: a single configurable API base URL,
// injected at build time via Vite env vars (see .env.example).
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

// Derive the websocket URL from the same base (http->ws, https->wss) so
// there's only one place to configure the backend location.
export const WS_BASE = API_BASE.replace(/^http/, "ws");

async function request<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status} ${res.statusText}`);
  }
  const body: ApiResponse<T> = await res.json();
  if (body.code !== 200) {
    throw new Error(body.msg || "Unknown API error");
  }
  return body.data;
}

export const marketApi = {
  listSymbols: () => request<SymbolInfo[]>(`/api/market/symbols`),

  priceHistory: (symbol: string, range: RangeKey) =>
    request<PriceHistoryData>(
      `/api/market/${symbol}/price-history?range=${range}`
    ),

  stats: (symbol: string) => request<StatsData>(`/api/market/${symbol}/stats`),

  metrics: (symbol: string) =>
    request<MetricsData>(`/api/market/${symbol}/metrics`),

  correlation: (symbol: string) =>
    request<CorrelationData>(`/api/market/${symbol}/correlation?window=90d`),

  about: (symbol: string) => request<AboutData>(`/api/market/${symbol}/about`),

  news: (symbol: string) => request<NewsData>(`/api/market/${symbol}/news`),

  strategies: (symbol: string) =>
    request<StrategiesData>(`/api/market/${symbol}/strategies`),

  volatility: (symbol: string) =>
    request<VolatilityData>(`/api/market/${symbol}/volatility`),

  faq: (symbol: string) => request<FaqData>(`/api/market/${symbol}/faq`),

  status: () =>
    request<{
      hyperliquidWsConnected: boolean;
      hyperliquidRestOk: boolean;
      symbolsWithCandles: string[];
      connectedFrontendClients: number;
    }>(`/api/market/status`),
};
