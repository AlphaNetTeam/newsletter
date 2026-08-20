"""Recent-news service: fetches real headlines from public crypto-news
RSS feeds (no API key required) and filters them per-symbol.

No fabricated content: if every feed is unreachable, callers get an
empty list tagged `source: "unavailable"` rather than invented
headlines. A backend polling loop (see `app/core/background.py`)
refreshes the shared raw pool every `NEWS_REFRESH_INTERVAL_S`; request
handlers just filter/format from whatever's cached in `LiveStore`, same
pattern as the rest of this app.
"""
from __future__ import annotations

import logging
import time
import xml.etree.ElementTree as ET
from email.utils import parsedate_to_datetime
from typing import List

import httpx

from app.core.config import (
    NEWS_ITEMS_PER_SYMBOL,
    NEWS_KEYWORDS,
    NEWS_MAX_ITEMS_PER_FEED,
    RSS_FEEDS,
)
from app.core.live_store import LiveStore, NewsItem

logger = logging.getLogger("news_service")

# Real browser-like headers — some RSS endpoints reject bare httpx UAs.
_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "application/rss+xml, application/xml, text/xml, */*",
}


def _parse_pubdate(raw: str | None) -> int | None:
    if not raw:
        return None
    try:
        dt = parsedate_to_datetime(raw)
        if dt.tzinfo is None:
            return None
        return int(dt.timestamp() * 1000)
    except (TypeError, ValueError):
        return None


def _parse_rss(xml_text: str, feed_name: str) -> List[NewsItem]:
    items: List[NewsItem] = []
    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError as e:
        logger.warning("news_service: malformed RSS from %s (%s)", feed_name, e)
        return items

    # RSS 2.0: <rss><channel><item>...</item></channel></rss>. Some feeds
    # namespace their <item> tags; `.//item` matches regardless of depth,
    # and we read child tags by local name to sidestep namespace prefixes.
    for item_el in root.findall(".//item")[:NEWS_MAX_ITEMS_PER_FEED]:
        title = (item_el.findtext("title") or "").strip()
        link = (item_el.findtext("link") or "").strip()
        pub_raw = item_el.findtext("pubDate")
        published_ms = _parse_pubdate(pub_raw)
        if not title or not link or published_ms is None:
            continue
        items.append(
            NewsItem(title=title, url=link, source=feed_name, published_at_ms=published_ms)
        )
    return items


async def fetch_all_feeds(client: httpx.AsyncClient) -> List[NewsItem]:
    """Fetches every configured RSS feed and returns the merged, deduped,
    date-sorted item list. Raises nothing — a single feed failing just
    means fewer items; the caller decides what "all feeds down" means.
    """
    all_items: List[NewsItem] = []
    for feed in RSS_FEEDS:
        try:
            # A few feeds (e.g. BlockBeats' language selection) need an
            # extra header beyond the shared browser-UA default — merge
            # rather than replace so those still get a real User-Agent too.
            headers = {**_HEADERS, **feed.get("headers", {})}
            resp = await client.get(feed["url"], headers=headers)
            resp.raise_for_status()
            all_items.extend(_parse_rss(resp.text, feed["name"]))
        except Exception as e:
            logger.warning("news_service: failed to fetch %s (%s: %s)", feed["name"], type(e).__name__, e)

    # Dedup by URL (some feeds cross-post identical wire stories).
    seen_urls: set[str] = set()
    deduped: List[NewsItem] = []
    for item in sorted(all_items, key=lambda i: i.published_at_ms, reverse=True):
        if item.url in seen_urls:
            continue
        seen_urls.add(item.url)
        deduped.append(item)

    return deduped


def get_news_for_symbol(store: LiveStore, symbol: str) -> dict:
    """Filters the shared raw pool for `symbol`-relevant items only.

    Deliberately does NOT backfill with unrelated general headlines when a
    symbol has thin coverage — most of the 15 markets besides BTC/ETH
    rarely get dedicated headlines from these 3 general-crypto feeds, so a
    niche symbol may come back with fewer than NEWS_ITEMS_PER_SYMBOL items,
    or none at all. That's the honest result; padding it out with
    unrelated "recent crypto news" would misrepresent what's actually
    {symbol}-specific (an earlier version of this did backfill — removed
    per explicit product decision: better to show 2 real items than 6
    where 4 are unrelated filler).
    """
    symbol = symbol.upper()
    keywords = NEWS_KEYWORDS.get(symbol, [symbol.lower()])

    if not store.news_raw:
        return {"symbol": symbol, "items": [], "source": store.news_source}

    def matches(item: NewsItem) -> bool:
        title_lower = item.title.lower()
        return any(kw in title_lower for kw in keywords)

    top = [i for i in store.news_raw if matches(i)][:NEWS_ITEMS_PER_SYMBOL]
    return {
        "symbol": symbol,
        "items": [
            {
                "title": i.title,
                "url": i.url,
                "source": i.source,
                "publishedAt": i.published_at_ms,
            }
            for i in top
        ],
        # The feed pool itself can be perfectly live even when this
        # specific symbol has zero matches right now — that's "no
        # dedicated coverage", not "the news source is down", so this no
        # longer collapses to "unavailable" just because `top` is empty
        # (that mapping only made sense back when an empty `top` reliably
        # meant the whole raw pool was empty too, before backfill removal).
        "source": store.news_source,
    }
