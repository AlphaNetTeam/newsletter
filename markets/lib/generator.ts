import { RANGE_DAYS } from "./config";
import type { PricePoint } from "./types";

function seedFor(symbol: string, salt = ""): number {
  const s = `${symbol}:${salt}`;
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gauss(rng: () => number): number {
  const u = Math.max(1e-12, 1 - rng());
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function generateDailySeries(
  symbol: string,
  cfg: { start_price: number; current_price: number; volatility: number },
  days: number,
  asOf = new Date(),
): PricePoint[] {
  const totalDays = RANGE_DAYS.ALL;
  const n = totalDays - 1;
  const rng = mulberry32(seedFor(symbol, "daily-series"));

  const logStart = Math.log(cfg.start_price);
  const logEnd = Math.log(cfg.current_price);

  const w = [0];
  for (let i = 0; i < n; i++) {
    w.push(w[w.length - 1] + gauss(rng) * cfg.volatility);
  }

  const bridged: number[] = [];
  for (let i = 0; i < totalDays; i++) {
    const trend = logStart + (logEnd - logStart) * (i / n);
    const bridgeNoise = w[i] - (i / n) * w[n];
    bridged.push(trend + bridgeNoise);
  }
  bridged[0] = logStart;
  bridged[bridged.length - 1] = logEnd;

  const startMs = asOf.getTime() - (totalDays - 1) * 24 * 60 * 60 * 1000;
  const full: PricePoint[] = bridged.map((v, i) => ({
    t: startMs + i * 24 * 60 * 60 * 1000,
    price: Math.round(Math.exp(v) * 1e6) / 1e6,
  }));
  return full.slice(-days);
}

export function generateDailyReturns(symbol: string, days: number, seedSalt: string): number[] {
  const rng = mulberry32(seedFor(symbol, seedSalt));
  const raw = Array.from({ length: days }, () => gauss(rng));
  const mean = raw.reduce((a, b) => a + b, 0) / raw.length;
  const variance = raw.reduce((a, x) => a + (x - mean) ** 2, 0) / raw.length;
  const std = Math.sqrt(variance) || 1;
  return raw.map((x) => (x - mean) / std);
}

export { seedFor, mulberry32, gauss };
