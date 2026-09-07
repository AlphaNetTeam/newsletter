import type { DataSource } from "@/lib/types";

export default function DataSourceBadge({ source }: { source: DataSource | null }) {
  if (!source) return null;
  const isLive = source === "live";

  return (
    <span
      className="mono"
      title={
        isLive
          ? "Fetched live from Hyperliquid just now."
          : "Hyperliquid was unreachable — showing deterministic generated demo data, not real market prices."
      }
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 10,
        letterSpacing: "0.1em",
        padding: "5px 10px",
        borderRadius: 999,
        border: `1px solid ${isLive ? "rgba(74,222,128,0.35)" : "rgba(248,113,113,0.35)"}`,
        color: isLive ? "var(--win)" : "var(--loss)",
        cursor: "help",
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: isLive ? "var(--win)" : "var(--loss)",
        }}
      />
      {isLive ? "LIVE" : "DEMO DATA"}
    </span>
  );
}
