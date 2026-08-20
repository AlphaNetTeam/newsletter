import { ImageResponse } from "next/og";
import { SYMBOLS, isKnownSymbol } from "@/lib/config";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 3600;

export default async function OgImage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol: raw } = await params;
  const symbol = raw.toUpperCase();
  const name = isKnownSymbol(symbol) ? SYMBOLS[symbol].name : symbol;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#05070a",
          color: "#f5f6f8",
          padding: 72,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 28, color: "#9199a8" }}>AlphaNet</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 72, fontWeight: 800, letterSpacing: -2 }}>{symbol} trading strategy</div>
          <div style={{ fontSize: 32, color: "#9199a8", marginTop: 16 }}>{name} · live ROI, Sharpe and drawdown</div>
        </div>
        <div style={{ display: "flex", fontSize: 22, color: "#3ddc97" }}>AI quantitative trading platform</div>
      </div>
    ),
    size,
  );
}
