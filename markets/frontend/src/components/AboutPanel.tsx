import type { AboutData } from "../api/types";

interface Props {
  about: AboutData | null;
  symbol: string;
}

// Editorial copy — not a live/synthetic market figure, so this
// deliberately doesn't show a DataSourceBadge (there's nothing to
// distrust here, it's the same kind of static "about" blurb the real
// site would maintain by hand).
export default function AboutPanel({ about, symbol }: Props) {
  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 14px" }}>About {symbol}</h2>
      {!about ? (
        <SkeletonLines />
      ) : (
        <>
          {about.paragraphs.map((p, i) => (
            <p
              key={i}
              style={{
                fontSize: 14,
                lineHeight: 1.6,
                color: "var(--text-secondary)",
                margin: "0 0 14px",
              }}
            >
              {p}
            </p>
          ))}
          {about.factors.length > 0 && (
            <div
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-lg)",
                padding: 18,
                marginTop: 8,
              }}
            >
              <div className="mono-label" style={{ marginBottom: 14 }}>
                WHAT MOVES THE PRICE
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px 24px" }}>
                {about.factors.map((f) => (
                  <div key={f.title}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{f.title}</div>
                    <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                      {f.description}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SkeletonLines() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} style={{ height: 12, background: "rgba(255,255,255,0.04)", borderRadius: 4 }} />
      ))}
    </div>
  );
}
