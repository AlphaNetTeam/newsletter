# AlphaNet Markets

Next.js App Router app for per-market strategy pages. Pages are server-rendered for SEO: each coin has its own URL (`/BTC`, `/ETH`, …), metadata, Open Graph image, FAQ structured data, and a sitemap.

Market data is fetched on the server from Hyperliquid, AlphaNet's strategy API, public RSS feeds, and stooq (SPX/XAU). Live price ticks come from Hyperliquid's public WebSocket in the browser. There is no separate backend.

## Run

```bash
cd markets
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — `/` redirects to `/BTC`.

Set `NEXT_PUBLIC_SITE_URL` (no trailing slash) for canonical URLs, Open Graph, sitemap, and robots in production.

```bash
npm run build
npm start
```

## SEO

- Unique route per symbol via `app/[symbol]/page.tsx`
- `generateMetadata` + canonical URL per page
- `sitemap.ts` / `robots.ts`
- FAQPage + WebPage JSON-LD
- Semantic headings and in-page `#news` / `#strategies` / `#volatility` / `#faq` links
- Coin picker uses real `<a>` links so crawlers can follow every market

## Data

| Section | Source |
| --- | --- |
| Prices, funding, OI, volume, leverage | Hyperliquid REST (`/info`) |
| Live last price | Hyperliquid WebSocket `allMids` |
| Strategies | `alphanet.phoenix.global` `recentStat` |
| News | CoinDesk / CoinTelegraph / Decrypt / BlockBeats RSS |
| SPX / Gold correlation | stooq.com daily CSV |
| About copy | static editorial (`lib/config-data.json`) |

If an upstream is unreachable, market numbers fall back to a labeled synthetic series (`source: "synthetic"`). News never invents headlines.
