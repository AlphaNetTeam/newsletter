import type { AboutData } from "@/lib/types";

export default function AboutPanel({ about, symbol }: { about: AboutData; symbol: string }) {
  return (
    <>
      <hgroup className="section-head">
        <div className="label mono">THE ASSET</div>
        <h2 id="about-heading">
          About <span className="grad-text">{symbol}</span>
          <span className="accent-dot">.</span>
        </h2>
        {about.paragraphs.map((p) => (
          <p key={p.slice(0, 24)} className="lede-sm">
            {p}
          </p>
        ))}
      </hgroup>

      {about.factors.length > 0 && (
        <>
          <div className="label mono mk-drivers-label">WHAT MOVES THE PRICE</div>
          <div className="cap-grid">
            {about.factors.map((f, i) => (
              <div className="cap" key={f.title}>
                <span className="cap-n mono">{String(i + 1).padStart(2, "0")}</span>
                <h3>{f.title}</h3>
                <p>{f.description}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
