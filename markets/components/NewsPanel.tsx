import { formatNewsDate } from "@/lib/format";
import type { NewsData } from "@/lib/types";

export default function NewsPanel({ news, symbol }: { news: NewsData; symbol: string }) {
  const items = news.items;

  return (
    <>
      <hgroup className="section-head">
        <div className="label mono">NEWS FLOW</div>
        <h2 id="news-heading">
          Recent news<span className="accent-dot">.</span>
        </h2>
        <p className="lede-sm">Headlines moving {symbol} right now.</p>
      </hgroup>

      {items.length === 0 ? (
        <p style={{ fontSize: 14, color: "var(--txt-4)", lineHeight: 1.6 }}>
          {news.source === "unavailable"
            ? "No recent news available right now — the news feeds may be unreachable. Check back later."
            : "No dedicated headlines for this symbol right now. Rather than pad this out with unrelated general crypto news, we're just not showing anything — check back later."}
        </p>
      ) : (
        <div className="mk-news-list">
          {items.map((item) => (
            <a key={item.url} href={item.url} target="_blank" rel="noreferrer" className="mk-news-row">
              <div className="mk-news-meta mono">
                <time dateTime={new Date(item.publishedAt).toISOString()}>{formatNewsDate(item.publishedAt)}</time>
                {" · "}
                {item.source.toUpperCase()}
              </div>
              <div className="mk-news-title">{item.title}</div>
              <span className="btn-arrow">↗</span>
            </a>
          ))}
        </div>
      )}
    </>
  );
}
