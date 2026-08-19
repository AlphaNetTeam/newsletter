import type { FaqData } from "../api/types";

interface Props {
  faq: FaqData | null;
  symbol: string;
}

export default function FaqPanel({ faq, symbol }: Props) {
  const entries = faq?.entries ?? [];

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 16px" }}>{symbol} trading strategy FAQ</h2>
      {entries.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ height: 14, background: "rgba(255,255,255,0.04)", borderRadius: 4 }} />
          ))}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 48px" }}>
          {entries.map((e, i) => (
            <div
              key={e.question}
              style={{
                padding: "18px 0",
                borderTop: i < 2 ? "none" : "1px solid var(--border)",
              }}
            >
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>{e.question}</div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>{e.answer}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
