# AlphaNet Strategy Page — Clone

A working implementation of the "BTC trading strategy" page design
("AlphaNet Strategies Redesign"), built with the same overall architecture as the production site at [alphanet.global](https://alphanet.global/): a static React SPA frontend that calls a separate backend API for all market data — nothing is hardcoded into the frontend.

## How the real site works (reverse-engineered)

Inspecting alphanet.global's network traffic and JS bundle showed:

- **Frontend**: a React SPA built with Vite (hashed asset filenames like
  `index-CDN5TAoT.js`), served as a static site behind Cloudflare
  (`cdn-cgi/rum` beacon, Cloudflare Web Analytics). Font is Google's
  "Plus Jakarta Sans", loaded the same way here.
- **Backend**: a separate API host (`alphanet.phoenix.global`) exposing
  REST JSON endpoints under `/api/orderly/...`, wrapping data from
  [Orderly Network](https://orderly.network) (a shared perp-DEX
  orderbook infra — confirmed via "Powered by Orderly" on
  `trade.alphanet.global`, their actual trading app subdomain). Every
  response uses the envelope `{ "code": 200, "msg": "success", "data": ... }`.
- The marketing site (`alphanet.global`), the trading app
  (`trade.alphanet.global`), and the docs (`wp.` / `guide.` subdomains)
  are separate deployments — a multi-app architecture, not one monolith.

This project mirrors that shape at small scale: one Vite/React frontend,
one backend API with the same response envelope, cleanly separated by an
HTTP boundary (`VITE_API_BASE_URL`) so either side can be redeployed or
swapped independently — exactly like the real system.

## Scope

The "Price" tab in the source design is actually one long continuous
page — the "News / Strategies / Volatility / FAQ" pills at the top don't
navigate anywhere (they're non-functional in the source artifact too);
scrolling down the Price view reveals About, Recent news, a strategies
table, a volatility/drawdown panel, and an FAQ, all stacked below the
chart. An earlier pass at this clone only scrolled the mockup's first
screen and missed all of that — this version implements the whole page.

Implemented, all backend-driven (no hardcoded numbers in the frontend):

- Coin selector — all 15 markets AlphaNet's own strategy API covers:
  BTC / ETH / SOL / DOGE / BNB / ZEC / LINK / ADA / XMR / XRP / TAO / HYPE /
  NEAR / TRX / PENGU
- Price chart with 1M / 3M / 1Y / ALL range toggle, live-ticking via WebSocket
- Stats row: 1-month / YTD / 1-year change, all-time-high, 12-month low
- "Hyperliquid Market Metrics" panel: open interest, 24h volume,
  funding rate (raw hourly + annualized), 30-day realized volatility, max leverage
- "Correlation, 90D" panel vs. the other coins + SPX/XAU
- **About {symbol}**: editorial copy + a "what moves the price" grid (static content)
- **Recent news**: real headlines from public RSS feeds, filtered per symbol
- **Strategies on {symbol}**: a performance table + strategy cards, sourced
  from AlphaNet's own real strategy-performance API — top 4 by 30-day
  ROI among the strategies trading that symbol (currently 3, since
  that's all that's live today — example data only as a fallback, see
  below)
- **Volatility and risk profile**: real rolling realized-vol chart + a
  real-vs-example "worst drawdown, strategy vs holding" comparison
- **FAQ**: templated with real computed figures where possible (e.g. the
  actual holding-period drawdown), generic copy elsewhere

Not every section can be equally "real" — see the sourcing breakdown
below for exactly which numbers are live, which are static editorial
copy, and which are clearly-labeled example data with no public source.

## Project structure

```
backend/                  FastAPI service
  app/
    main.py               App entrypoint, CORS, lifespan (starts/stops
                           background data feeds), /ws/prices endpoint
    api/routes/market.py  REST endpoints (+ /api/market/status)
    services/
      hyperliquid_client.py  Hyperliquid REST (meta/candles) + WS relay
      macro_client.py         SPX/XAU from stooq.com, synthetic fallback
      news_service.py          RSS fetch/parse/filter (CoinDesk et al.)
      content_service.py       About copy + templated FAQ answers
      phoenix_client.py        AlphaNet's real recentStat strategy API
      strategy_service.py      real strategies table, synthetic fallback (see docstring)
      price_service.py        price-history + stats, reads LiveStore
      market_service.py       funding/OI/volume/leverage, correlation,
                               volatility series + drawdown comparison
    core/
      config.py           symbols, about copy, strategy defs, RSS feeds,
                           poll intervals, fallback anchors
      live_store.py        in-memory store of live prices/candles/macro/
                            news/strategies + the WebSocket ConnectionManager
      background.py        the 6 always-on asyncio loops (see below)
      generator.py          deterministic synthetic-data fallback
      cache.py               tiny in-process TTL cache
    schemas.py             pydantic response models ({code,msg,data})
  requirements.txt

frontend/                 React + TypeScript + Vite
  src/
    api/                  typed fetch client for the backend (client.ts)
    hooks/
      useLiveMids.ts       WebSocket client for /ws/prices, auto-reconnect
      useInterval.ts        generic polling hook
    components/           Header, CoinSelector, TabsNav, PriceChart,
                           StatsRow, MarketMetricsPanel, CorrelationPanel,
                           DataSourceBadge, AboutPanel, NewsPanel,
                           StrategiesSection, VolatilityPanel, FaqPanel
    pages/StrategyPage.tsx
    utils/format.ts
```

## Data sourcing — real data by default

This is a real project, so the backend's primary data source is
**Hyperliquid's public market data API** (`api.hyperliquid.xyz`) — no API
key required, no rate-limit headaches like CoinGecko's free tier. It is
not a demo that happens to also support live data: live is the default
and synthetic is only a fallback for when Hyperliquid itself is
unreachable (outage, firewall, no egress).

- **Prices, funding, open interest, volume, leverage** — REST
  `metaAndAssetCtxs` polled every 8s (`ASSET_CTX_POLL_INTERVAL_S`) for the
  metrics panel, plus a persistent WebSocket subscription to `allMids`
  for sub-second price ticks.
- **Historical daily candles** (for the chart, ATH/12mo-low, realized
  vol, and real correlation) — REST `candleSnapshot`, refreshed every 5
  minutes (`CANDLE_REFRESH_INTERVAL_S`).
- **SPX / Gold** (for the correlation panel) — best-effort real daily
  closes from `stooq.com`'s free CSV endpoint, refreshed every 6h
  (`MACRO_REFRESH_INTERVAL_S`); Hyperliquid doesn't list these, so
  they're the one thing not covered by Hyperliquid itself.
- **Synthetic fallback** — only used per-symbol/per-panel when the above
  is unreachable or stale (`STALE_AFTER_S = 60`): a seeded Brownian
  bridge in log-price space, pinned to configured start/current anchors
  in `app/core/config.py`, so a fallback chart is at least reproducible
  and internally consistent rather than random noise.

**The UI always tells you which one you're looking at.** Every `stats` /
`price-history` / `metrics` / `correlation` response is tagged
`"source": "live"` or `"source": "synthetic"` (correlation is tagged
per-pair, since e.g. BTC/ETH can be real while BTC/XAU falls back), and
the frontend surfaces this as a badge next to the coin selector. Don't
trust a number over the badge next to it.

### The five newer sections (About / Recent news / Strategies / Volatility / FAQ)

Strategies now fits the live/synthetic split above too (it has its own
real API); About stays static editorial copy since there's no upstream
source for it even on the real site. Here's exactly what each one is:

- **About {symbol}** — static editorial copy maintained in
  `app/core/config.py` (`ABOUT_CONTENT`). Not fetched from anywhere;
  there's no upstream API for this on the real site either. Tagged
  `"source": "static"` to distinguish it from live/synthetic market data.
- **Recent news** — **genuinely real**: headlines fetched server-side
  from public RSS feeds (CoinDesk, CoinTelegraph, Decrypt — no API key),
  refreshed every 10 minutes, filtered per symbol by keyword match. If
  every feed is unreachable the endpoint returns an **empty list**
  tagged `"source": "unavailable"` rather than inventing headlines —
  fabricating fake news text would be a worse failure mode than
  fabricating a placeholder price, so this deliberately has no synthetic
  fallback.
- **Strategies on {symbol}** — **genuinely real**: fetched server-side
  from AlphaNet's own live strategy-performance API
  (`alphanet.phoenix.global/api/orderly/trade/recentStat?t=30`) — the
  same backend the production alphanet.global site itself reads (its
  design mockup's BTC figures for "Hackworth Prime" match this endpoint
  exactly). Refreshed every 10 minutes, filtered to the strategies
  trading the page's selected symbol, top 4 by 30-day ROI. Every one of
  the 15 real markets currently has exactly 3 strategy records (verified
  by inspection, not 4) — so today this shows 3 for every symbol, not
  padded with a synthetic filler row to force 4; it'll return up to 4
  automatically the moment a 4th real one shows up for that market, no
  code change needed. Tagged `"source": "live"`. Only when the API is
  completely unreachable does this fall back to a deterministic
  per-symbol synthetic generator — 4 strategies (matching the design
  mockup's layout, including its "Archimedes Premium" 4th card, which
  doesn't exist in the real live data), always tagged
  `"source": "synthetic"` — see `phoenix_client.py` and
  `strategy_service.py`'s docstrings.
- **Volatility and risk profile** — a genuine blend: the rolling
  realized-vol chart and the "Holding {symbol}" drawdown bar are
  computed from real Hyperliquid candle history (real peak-to-trough
  drawdown, real rolling 30-day vol); the strategy drawdown bars next to
  it are the same figures (live or synthetic-fallback) as the strategies
  table.
- **FAQ** — templated, not hardcoded: the "best strategy" and "how is
  this different from holding" answers pull in the actual computed
  strategy stats and the actual holding-drawdown percentage, so the copy
  stays consistent with whatever the strategies table / volatility panel
  are showing. The rest of the Q&A text is generic, same as the source
  design.

## Real-time updates

Three layers work together so the page updates itself with no manual
refresh, and degrades gracefully instead of breaking when a layer is
unavailable:

1. **Backend background loops** (`app/core/background.py`), started from
   FastAPI's `lifespan` on process boot and running independently of any
   HTTP request: an asset-context poller (8s), a candle refresher (5min),
   a macro refresher (6h), a news-RSS refresher (10min), a strategies
   refresher (10min, from AlphaNet's own recentStat API), and a
   persistent Hyperliquid WebSocket relay with exponential-backoff
   reconnect (1s → 30s cap). All six keep an in-memory `LiveStore` warm;
   a failed poll logs once, then only every 10th repeat
   (`_FailureLogger`), so a sustained outage doesn't flood the logs, and
   the store just serves the last-known-good value with `source`
   correctly reflecting staleness.
2. **Backend → frontend push** (`GET /ws/prices`): every mid-price tick
   the relay receives from Hyperliquid is immediately fanned out over a
   WebSocket to every connected browser tab (`ConnectionManager` in
   `live_store.py`). The frontend's `useLiveMids()` hook consumes this
   and the price chart's "Latest" readout updates live, with a pulsing
   green dot next to it while connected.
3. **REST polling fallback** (`useInterval()` in `StrategyPage.tsx`):
   independent of the WebSocket, the stats/metrics/correlation panels
   re-fetch every 15s and the chart's price history re-fetches every 60s
   (to pick up newly-closed daily candles). This covers browsers/networks
   that can't hold a WebSocket open (corporate proxies, some load
   balancers) — the page still self-updates, just on a slower cadence.

Check `GET /api/market/status` at any time for the current live-vs-degraded
state: `hyperliquidWsConnected`, `hyperliquidRestOk`, which symbols have
candle data cached, and how many frontend clients are on the WebSocket.

To point this at a different exchange/data provider, the integration
surface is `app/services/hyperliquid_client.py` (REST + WS) and
`app/core/background.py` (the polling/relay loops) — `LiveStore`, the
route layer, and response schemas don't need to change.

## Running it

### Backend

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Health check: `curl http://127.0.0.1:8000/api/health`

Once it's up, confirm live data is actually flowing:

```bash
curl http://127.0.0.1:8000/api/market/status
# {"hyperliquidWsConnected": true, "hyperliquidRestOk": true, "symbolsWithCandles": ["BTC","ETH","SOL","DOGE","BNB","ZEC","LINK","ADA","XMR","XRP","TAO","HYPE","NEAR","TRX","PENGU"], ...}
curl http://127.0.0.1:8000/api/market/BTC/stats
# "source": "live"  ← should say "live", not "synthetic", within ~10s of startup
curl http://127.0.0.1:8000/api/market/BTC/news
# "source": "live" with a non-empty "items" array within ~10s — this is the RSS feed check;
# if it stays "unavailable", your network is blocking coindesk.com/cointelegraph.com/decrypt.co
```

> **Note on where this was built and tested.** This backend was written
> and iterated on inside a sandboxed cloud dev environment with no
> outbound internet access to Hyperliquid, stooq, or any other external
> host (all requests there return a proxy-level 403). Every piece was
> verified there as much as the sandbox allows — clean startup, no
> crashes, correct graceful fallback to `"source": "synthetic"` with
> throttled (non-flooding) warning logs when Hyperliquid is unreachable,
> a `tsc` typecheck with zero errors — but the actual live REST/WebSocket
> calls to Hyperliquid could **not** be exercised end-to-end from that
> sandbox. The commands above are the first thing to run on your own
> machine to confirm live data end-to-end; if `source` stays `"synthetic"`
> and `hyperliquidRestOk` stays `false` after ~10s, check your network
> (VPN/firewall blocking `api.hyperliquid.xyz`) — see `backend`'s
> stdout/uvicorn logs for the specific error.

> **Using conda?** If your shell auto-activates a `base` conda
> environment, `source .venv/bin/activate` may not actually put the venv
> first on `PATH` — `uvicorn` can end up resolving to conda's global
> install instead of the one in `.venv`, and you'll see
> `ModuleNotFoundError: No module named 'fastapi'` even though you just
> installed it. Run `conda deactivate` first, confirm with
> `which python3` that it points inside `.venv/`, and prefer
> `python3 -m uvicorn ...` (or `./.venv/bin/python -m uvicorn ...`) over
> the bare `uvicorn` command.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. It reads the API base URL from
`frontend/.env` (`VITE_API_BASE_URL`, defaults to
`http://127.0.0.1:8000`).

### Production build

```bash
cd frontend && npm run build
```

Outputs a static `dist/` (hashed filenames, same as the real site) that
can be deployed to any static host / CDN, pointed at a deployed backend
via `VITE_API_BASE_URL`.
