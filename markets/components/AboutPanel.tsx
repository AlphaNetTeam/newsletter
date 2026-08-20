import type { AboutData } from "@/lib/types";

export default function AboutPanel({ about, symbol }: { about: AboutData; symbol: string }) {
  return (
    <section id="about" aria-labelledby="about-heading">
      <h2 id="about-heading" style={{ fontSize: 20, fontWeight: 700, margin: "0 0 14px" }}>
        About {symbol}
      </h2>
      {about.paragraphs.map((p) => (
        <p
          key={p.slice(0, 24)}
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
                <h3 style={{ fontSize: 13, fontWeight: 600, margin: "0 0 4px" }}>{f.title}</h3>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5, margin: 0 }}>
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
