import type { NewsData } from "../api/types";
import { formatNewsDate } from "../utils/format";

interface Props {
  news: NewsData | null;
}

// Real headlines fetched server-side from public RSS feeds (CoinDesk,
// CoinTelegraph, Decrypt — see backend/app/services/news_service.py).
// Deliberately never shows fabricated headlines, and (per product
// decision) never pads a thin-coverage symbol out with unrelated general
// news either — an honest empty/partial state beats misleading filler.
export default function NewsPanel({ news }: Props) {
  const items = news?.items ?? [];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Recent news</h2>
        {news && news.source === "unavailable" && items.length === 0 && (
          <span
            title="Every configured RSS feed failed or returned nothing — showing no items rather than fabricated headlines."
            style={{ fontSize: 11, color: "var(--text-tertiary)" }}
          >
            unavailable
          </span>
        )}
      </div>

      {!news ? (
        <SkeletonLines />
      ) : items.length === 0 ? (
        <div style={{ fontSize: 13, color: "var(--text-tertiary)", lineHeight: 1.6 }}>
          {news.source === "unavailable"
            ? "No recent news available right now — the news feeds may be unreachable. Check back later."
            : "No dedicated headlines for this symbol right now. Rather than pad this out with unrelated general crypto news, we're just not showing anything — check back later."}
        </div>
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
                {formatNewsDate(item.publishedAt)} · {item.source.toUpperCase()}
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.4 }}>
                {item.title}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function SkeletonLines() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} style={{ height: 14, background: "rgba(255,255,255,0.04)", borderRadius: 4 }} />
      ))}
    </div>
  );
}
