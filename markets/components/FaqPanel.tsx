import type { FaqData } from "@/lib/types";

export default function FaqPanel({ faq, symbol }: { faq: FaqData; symbol: string }) {
  return (
    <section id="faq" aria-labelledby="faq-heading">
      <h2 id="faq-heading" style={{ fontSize: 22, fontWeight: 700, margin: "0 0 16px" }}>
        {symbol} trading strategy FAQ
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 48px" }}>
        {faq.entries.map((e, i) => (
          <article
            key={e.question}
            style={{
              padding: "18px 0",
              borderTop: i < 2 ? "none" : "1px solid var(--border)",
            }}
          >
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 8px" }}>{e.question}</h3>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, margin: 0 }}>{e.answer}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
