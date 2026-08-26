import {
  BROWSER_UA,
  NEWS_ITEMS_PER_SYMBOL,
  NEWS_KEYWORDS,
  NEWS_MAX_ITEMS_PER_FEED,
  RSS_FEEDS,
} from "./config";
import type { NewsData, NewsItemOut, NewsSource } from "./types";

function tagText(block: string, tag: string): string {
  const cdata = block.match(
    new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`, "i"),
  );
  if (cdata) return cdata[1].trim();
  const plain = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  if (!plain) return "";
  return plain[1].replace(/<[^>]+>/g, "").trim();
}

function parsePubDate(raw: string): number | null {
  if (!raw) return null;
  const ms = Date.parse(raw);
  return Number.isFinite(ms) ? ms : null;
}

function parseRss(xml: string, feedName: string): NewsItemOut[] {
  const items: NewsItemOut[] = [];
  const re = /<item\b[^>]*>([\s\S]*?)<\/item>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(xml)) && items.length < NEWS_MAX_ITEMS_PER_FEED) {
    const block = match[1];
    const title = tagText(block, "title");
    const url = tagText(block, "link") || tagText(block, "guid");
    const publishedAt = parsePubDate(tagText(block, "pubDate"));
    if (!title || !url || publishedAt == null) continue;
    items.push({ title, url, source: feedName, publishedAt });
  }
  return items;
}

async function fetchAllFeeds(): Promise<{ items: NewsItemOut[]; source: NewsSource }> {
  const results = await Promise.all(
    RSS_FEEDS.map(async (feed) => {
      try {
        const res = await fetch(feed.url, {
          headers: {
            "User-Agent": BROWSER_UA,
            Accept: "application/rss+xml, application/xml, text/xml, */*",
            ...(feed.headers ?? {}),
          },
          next: { revalidate: 10 * 60 },
        });
        if (!res.ok) return [] as NewsItemOut[];
        return parseRss(await res.text(), feed.name);
      } catch {
        return [] as NewsItemOut[];
      }
    }),
  );

  const seen = new Set<string>();
  const deduped: NewsItemOut[] = [];
  for (const item of results.flat().sort((a, b) => b.publishedAt - a.publishedAt)) {
    if (seen.has(item.url)) continue;
    seen.add(item.url);
    deduped.push(item);
  }
  return { items: deduped, source: deduped.length ? "live" : "unavailable" };
}

export async function getNewsForSymbol(symbol: string): Promise<NewsData> {
  const { items, source } = await fetchAllFeeds();
  const keywords = NEWS_KEYWORDS[symbol] ?? [symbol.toLowerCase()];
  const top = items
    .filter((item) => {
      const title = item.title.toLowerCase();
      return keywords.some((kw) => title.includes(kw));
    })
    .slice(0, NEWS_ITEMS_PER_SYMBOL);

  return { symbol, items: top, source };
}
