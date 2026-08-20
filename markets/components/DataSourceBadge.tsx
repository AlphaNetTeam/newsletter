import type { DataSource } from "@/lib/types";

export default function DataSourceBadge({ source }: { source: DataSource | null }) {
  if (!source) return null;
  const isLive = source === "live";

  return (
    <span
      title={
        isLive
          ? "Fetched live from Hyperliquid just now."
          : "Hyperliquid was unreachable — showing deterministic generated demo data, not real market prices."
      }
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: 0.02,
        padding: "3px 9px",
        borderRadius: 999,
        border: `1px solid ${isLive ? "rgba(61,220,151,0.35)" : "rgba(242,112,122,0.35)"}`,
        background: isLive ? "var(--accent-green-dim)" : "rgba(242,112,122,0.12)",
        color: isLive ? "var(--accent-green)" : "var(--accent-red)",
        cursor: "help",
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: isLive ? "var(--accent-green)" : "var(--accent-red)",
        }}
      />
      {isLive ? "Live data" : "Demo data (not real prices)"}
    </span>
  );
}
