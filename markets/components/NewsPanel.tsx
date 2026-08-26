import { formatNewsDate } from "@/lib/format";
import type { NewsData } from "@/lib/types";

export default function NewsPanel({ news }: { news: NewsData }) {
  const items = news.items;

  return (
    <section id="news" aria-labelledby="news-heading">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <h2 id="news-heading" style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>
          Recent news
        </h2>
        {news.source === "unavailable" && items.length === 0 && (
          <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>unavailable</span>
        )}
      </div>

      {items.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--text-tertiary)", lineHeight: 1.6, margin: 0 }}>
          {news.source === "unavailable"
            ? "No recent news available right now — the news feeds may be unreachable. Check back later."
            : "No dedicated headlines for this symbol right now. Rather than pad this out with unrelated general crypto news, we're just not showing anything — check back later."}
        </p>
      ) : (
        <div>
          {items.map((item, i) => (
            <a
              key={item.url}
              href={item.url}
              target="_blank"
              rel="noreferrer"
              style={{
                display: "block",
                padding: i === 0 ? "0 0 14px" : "14px 0",
                borderTop: i === 0 ? "none" : "1px solid var(--border)",
                textDecoration: "none",
              }}
            >
              <div className="mono-label" style={{ marginBottom: 6 }}>
                <time dateTime={new Date(item.publishedAt).toISOString()}>
                  {formatNewsDate(item.publishedAt)}
                </time>{" "}
                · {item.source.toUpperCase()}
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.4 }}>
                {item.title}
              </div>
            </a>
          ))}
        </div>
      )}
    </section>
  );
}
