import type { FaqData } from "@/lib/types";

export default function FaqPanel({ faq, symbol }: { faq: FaqData; symbol: string }) {
  return (
    <>
      <hgroup className="section-head">
        <div className="label mono">FAQ</div>
        <h2 id="faq-heading">
          {symbol} trading strategy FAQ<span className="accent-dot">.</span>
        </h2>
      </hgroup>

      <div className="mk-faq-grid">
        {faq.entries.map((e) => (
          <article className="mk-faq-cell" key={e.question}>
            <h3>{e.question}</h3>
            <p>{e.answer}</p>
          </article>
        ))}
      </div>
    </>
  );
}
