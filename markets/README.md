# AlphaNet Markets

Next.js App Router app for per-market strategy pages. In production it is mounted at `https://alphanet.global/markets` (`basePath: /markets`). Pages are server-rendered for SEO: each coin has its own URL (`/markets/BTC`, `/markets/ETH`, …), metadata, Open Graph image, FAQ structured data, and a sitemap.

Market data is fetched on the server from Hyperliquid, AlphaNet's strategy API, public RSS feeds, and stooq (SPX/XAU). Live price ticks come from Hyperliquid's public WebSocket in the browser. There is no separate backend.

## Run

Requires **Node.js 16.14+** (Next.js 13.5). The production server runs Node 16.20.2.

```bash
cd markets
node -v   # e.g. v16.20.2
npm install
npm run dev
```

Open [http://localhost:3000/markets](http://localhost:3000/markets) — `/markets` redirects to `/markets/BTC`.

Set `NEXT_PUBLIC_SITE_URL` (no trailing slash) to the public origin **including** `/markets`:

```bash
NEXT_PUBLIC_SITE_URL=https://alphanet.global/markets
npm run build
npm start -- --hostname 127.0.0.1 --port 20002
```

Nginx must forward the `/markets` prefix (no trailing slash on `proxy_pass`):

```nginx
location /markets {
    proxy_pass http://localhost:20002;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
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
