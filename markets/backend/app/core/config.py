"""
Central configuration for the AlphaNet-clone backend.

Primary data source is Hyperliquid's public `/info` REST API + public
websocket feed (no API key required — see `app/services/hyperliquid_client.py`).
This matches the real site's own "HYPERLIQUID MARKET METRICS" panel
labeling. A deterministic synthetic generator (`app/core/generator.py`)
is kept only as a last-resort fallback for when Hyperliquid is
unreachable, so the app never shows a blank page — but it is clearly
labeled as such via the `source` field on every response.
"""
from __future__ import annotations

from typing import Dict, TypedDict


class SymbolConfig(TypedDict):
    name: str
    # "crypto" for everything today — every SYMBOLS entry currently is a
    # Hyperliquid perp. Kept explicit (not inferred from the symbol string)
    # so the frontend can pick the right <title>/meta-description copy
    # ("Crypto Trading Strategies" vs "Quant Trading Strategy") from real
    # backend data instead of hardcoding a crypto-ticker allowlist — this
    # is the field that makes that switch correct the day a non-crypto
    # symbol (gold, an equity index, ...) is added to SYMBOLS.
    asset_class: str
    # Fallback-only values, used exclusively when Hyperliquid is
    # completely unreachable (both the background poller AND the
    # on-demand retry fail). Real current/historical prices, open
    # interest, volume, funding and max leverage all come from
    # Hyperliquid at runtime and are NOT read from here in the normal
    # (live) path.
    fallback_start_price: float
    fallback_current_price: float
    fallback_volatility: float
    fallback_open_interest: float
    fallback_volume_24h: float
    fallback_max_leverage: int


# Tradable / selectable symbols (shown in the coin picker). These must be
# valid Hyperliquid perp tickers (see hyperliquid_client.py) — plain
# symbols like "BTC", not "BTC-PERP" or "BTC-USD".
SYMBOLS: Dict[str, SymbolConfig] = {
    "BTC": {
        "name": "Bitcoin",
        "asset_class": "crypto",
        "fallback_start_price": 26_010.0,
        "fallback_current_price": 118_420.0,
        "fallback_volatility": 0.020,
        "fallback_open_interest": 1_240_000_000,
        "fallback_volume_24h": 482_600_000,
        "fallback_max_leverage": 25,
    },
    "ETH": {
        "name": "Ethereum",
        "asset_class": "crypto",
        "fallback_start_price": 1_650.0,
        "fallback_current_price": 4_260.0,
        "fallback_volatility": 0.024,
        "fallback_open_interest": 612_000_000,
        "fallback_volume_24h": 305_400_000,
        "fallback_max_leverage": 20,
    },
    "SOL": {
        "name": "Solana",
        "asset_class": "crypto",
        "fallback_start_price": 24.0,
        "fallback_current_price": 172.0,
        "fallback_volatility": 0.030,
        "fallback_open_interest": 198_000_000,
        "fallback_volume_24h": 141_200_000,
        "fallback_max_leverage": 15,
    },
    "DOGE": {
        "name": "Dogecoin",
        "asset_class": "crypto",
        "fallback_start_price": 0.062,
        "fallback_current_price": 0.21,
        "fallback_volatility": 0.033,
        "fallback_open_interest": 54_000_000,
        "fallback_volume_24h": 61_500_000,
        "fallback_max_leverage": 10,
    },
    # --- Added 2026-08: expanded from 4 to all 15 markets AlphaNet's own
    # real strategy API (recentStat) covers — verified against that
    # endpoint's distinct `symbol` values (PERP_{X}_USDC, 3 records each,
    # 45 total) AND against Hyperliquid's live perp universe before
    # adding, so every symbol below has both real strategy data and a
    # real tradable Hyperliquid market. fallback_* figures for all 11 are
    # rough Aug-2026 anchors (approximate, research-based) — same as the
    # four above, they're illustrative only and never shown as real; live
    # price/funding/OI/volume always come from Hyperliquid at runtime.
    "BNB": {
        "name": "Binance",
        "asset_class": "crypto",
        "fallback_start_price": 245.0,
        "fallback_current_price": 620.0,
        "fallback_volatility": 0.018,
        "fallback_open_interest": 180_000_000,
        "fallback_volume_24h": 120_000_000,
        "fallback_max_leverage": 20,
    },
    "ZEC": {
        "name": "Zcash",
        "asset_class": "crypto",
        "fallback_start_price": 30.0,
        "fallback_current_price": 500.0,
        "fallback_volatility": 0.05,
        "fallback_open_interest": 40_000_000,
        "fallback_volume_24h": 90_000_000,
        "fallback_max_leverage": 10,
    },
    "LINK": {
        "name": "Chainlink",
        "asset_class": "crypto",
        "fallback_start_price": 6.5,
        "fallback_current_price": 9.4,
        "fallback_volatility": 0.028,
        "fallback_open_interest": 60_000_000,
        "fallback_volume_24h": 45_000_000,
        "fallback_max_leverage": 10,
    },
    "ADA": {
        "name": "Cardano",
        "asset_class": "crypto",
        "fallback_start_price": 0.25,
        "fallback_current_price": 0.45,
        "fallback_volatility": 0.03,
        "fallback_open_interest": 35_000_000,
        "fallback_volume_24h": 28_000_000,
        "fallback_max_leverage": 10,
    },
    "XMR": {
        "name": "Monero",
        "asset_class": "crypto",
        "fallback_start_price": 160.0,
        "fallback_current_price": 780.0,
        "fallback_volatility": 0.045,
        "fallback_open_interest": 25_000_000,
        "fallback_volume_24h": 60_000_000,
        "fallback_max_leverage": 5,
    },
    "XRP": {
        "name": "XRP",
        "asset_class": "crypto",
        "fallback_start_price": 0.34,
        "fallback_current_price": 1.00,
        "fallback_volatility": 0.026,
        "fallback_open_interest": 250_000_000,
        "fallback_volume_24h": 200_000_000,
        "fallback_max_leverage": 20,
    },
    "TAO": {
        "name": "Bittensor",
        "asset_class": "crypto",
        "fallback_start_price": 350.0,
        "fallback_current_price": 195.0,
        "fallback_volatility": 0.05,
        "fallback_open_interest": 15_000_000,
        "fallback_volume_24h": 20_000_000,
        "fallback_max_leverage": 5,
    },
    "HYPE": {
        "name": "Hyperliquid",
        "asset_class": "crypto",
        "fallback_start_price": 5.0,
        "fallback_current_price": 59.0,
        "fallback_volatility": 0.04,
        "fallback_open_interest": 90_000_000,
        "fallback_volume_24h": 70_000_000,
        "fallback_max_leverage": 5,
    },
    "NEAR": {
        "name": "NEAR Protocol",
        "asset_class": "crypto",
        "fallback_start_price": 1.8,
        "fallback_current_price": 1.6,
        "fallback_volatility": 0.032,
        "fallback_open_interest": 20_000_000,
        "fallback_volume_24h": 18_000_000,
        "fallback_max_leverage": 10,
    },
    "TRX": {
        "name": "TRON",
        "asset_class": "crypto",
        "fallback_start_price": 0.06,
        "fallback_current_price": 0.33,
        "fallback_volatility": 0.015,
        "fallback_open_interest": 30_000_000,
        "fallback_volume_24h": 15_000_000,
        "fallback_max_leverage": 10,
    },
    "PENGU": {
        "name": "Pudgy Penguins",
        "asset_class": "crypto",
        "fallback_start_price": 0.02,
        "fallback_current_price": 0.012,
        "fallback_volatility": 0.06,
        "fallback_open_interest": 12_000_000,
        "fallback_volume_24h": 15_000_000,
        "fallback_max_leverage": 5,
    },
}

# Fallback anchors for SPX/XAU ONLY used if the live stooq fetch in
# macro_client.py fails entirely. Approximate, illustrative — not a
# substitute for a real feed; the API labels these `source: "synthetic"`
# whenever this path is used.
MACRO_FALLBACK: Dict[str, SymbolConfig] = {
    "SPX": {
        "name": "S&P 500",
        "fallback_start_price": 4_450.0,
        "fallback_current_price": 5_950.0,
        "fallback_volatility": 0.009,
    },
    "XAU": {
        "name": "Gold",
        "fallback_start_price": 1_930.0,
        "fallback_current_price": 2_650.0,
        "fallback_volatility": 0.007,
    },
}

# Full candidate list for the correlation panel: tradable symbols plus a
# couple of macro reference assets (mirrors the SPX / XAU rows on the
# real site's correlation widget). The base symbol is excluded from its
# own panel; the remaining top 5 (by config order) are shown. BTC/ETH/SOL/
# DOGE correlations are computed from real Hyperliquid candle history;
# SPX/XAU come from a best-effort macro data fetch (see macro_client.py)
# and fall back to a synthetic estimate (clearly labeled) if unavailable.
CORRELATION_REFERENCE_ASSETS = ["BTC", "ETH", "SOL", "DOGE", "SPX", "XAU"]

# Target correlation coefficients vs. the base symbol, used ONLY to seed
# the synthetic fallback correlation model (i.e. when real candle history
# isn't available for one/both sides). Approximate/symmetric.
BASE_CORRELATION_TARGETS: Dict[str, float] = {
    "BTC": 0.84,
    "ETH": 0.84,
    "SOL": 0.79,
    "DOGE": 0.71,
    "SPX": 0.31,
    "XAU": 0.12,
}

RANGE_DAYS = {
    "1M": 30,
    "3M": 90,
    "1Y": 365,
    "ALL": 365 * 3,
}

# --- Hyperliquid public API (no key required) ---
# Verified against https://hyperliquid.gitbook.io/hyperliquid-docs (2026-08).
HYPERLIQUID_INFO_URL = "https://api.hyperliquid.xyz/info"
HYPERLIQUID_WS_URL = "wss://api.hyperliquid.xyz/ws"

# --- Macro reference data (SPX / XAU), best-effort, no key required ---
# stooq.com's CSV download endpoint (used for years by pandas-datareader's
# StooqDailyReader). Unauthenticated and free, but not an SLA'd API —
# macro_client.py treats any failure/malformed response as "unavailable"
# and falls back to MACRO_FALLBACK above rather than erroring.
STOOQ_CSV_URL = "https://stooq.com/q/d/l/"
STOOQ_TICKERS = {"SPX": "^spx", "XAU": "xauusd"}

# How often the background loops refresh each piece of state. Kept well
# under Hyperliquid's published rate limit (1200 weight/min per IP;
# metaAndAssetCtxs costs 20 — polling every 8s is ~7.5 calls/min, trivial
# headroom even with several instances sharing an IP).
ASSET_CTX_POLL_INTERVAL_S = 8
CANDLE_REFRESH_INTERVAL_S = 5 * 60
MACRO_REFRESH_INTERVAL_S = 6 * 60 * 60
WS_RECONNECT_MIN_BACKOFF_S = 1
WS_RECONNECT_MAX_BACKOFF_S = 30

# A price/asset-ctx snapshot older than this is considered stale and the
# API will report source="synthetic" rather than serve possibly-outdated
# "live" data silently.
STALE_AFTER_S = 60

# Cache TTL for the on-demand candle fetch fallback path (cold cache / a
# symbol not yet warmed by the background refresh loop).
PRICE_HISTORY_TTL = 60 * 5

# --- "About {symbol}" editorial copy ---------------------------------
# Static, hand-written reference content (not a live/synthetic market
# data field — there's no upstream API for this on the real site either;
# it's maintained copy, same as alphanet.global's own about blurbs).
# Kept in the backend (not hardcoded in the frontend) so it's still
# centrally editable and consistently served through the same
# {code,msg,data} envelope as everything else.
ABOUT_CONTENT: Dict[str, dict] = {
    "BTC": {
        "paragraphs": [
            "Bitcoin is a fixed-supply, proof-of-work digital commodity and the most liquid crypto asset by a wide margin. Its price is driven by macro liquidity, ETF and treasury flows, and the four-year issuance cycle rather than by cash flows, which makes it behave like a high-beta duration asset with no coupon.",
            "For a systematic trader BTC is the easiest market in crypto to size in and the hardest to beat. Spreads are tight enough that models can trade frequently, but the trend is well covered by every participant, so edge comes from timing exposure rather than from direction alone.",
        ],
        "factors": [
            {
                "title": "Macro liquidity and real rates",
                "description": "The dominant driver since the ETF complex opened Bitcoin to allocators.",
            },
            {
                "title": "ETF and treasury flows",
                "description": "Persistent, price-insensitive bid or offer that shows up in basis.",
            },
            {
                "title": "Perp funding and leverage",
                "description": "Crowded positioning produces the liquidation cascades models trade.",
            },
            {
                "title": "Halving and issuance cycle",
                "description": "Slow-moving, but sets the multi-year regime models train against.",
            },
        ],
    },
    "ETH": {
        "paragraphs": [
            "Ethereum is the largest smart-contract platform and the base settlement layer for most of DeFi, stablecoins, and tokenized assets. Its price reflects both a Bitcoin-correlated risk-asset beta and idiosyncratic drivers tied to network usage, staking yield, and the supply burned by transaction fees.",
            "For a systematic trader ETH offers deeper derivatives liquidity than any coin except BTC, with a more volatile, more mean-reverting profile — the staking yield and burn mechanics give it a genuine carry component that BTC lacks, which shows up in richer funding-rate dynamics.",
        ],
        "factors": [
            {
                "title": "BTC beta and risk-on flows",
                "description": "ETH still trades as a leveraged read on broader crypto risk appetite.",
            },
            {
                "title": "Staking yield and issuance",
                "description": "Post-Merge net issuance is state-dependent, feeding a real carry signal.",
            },
            {
                "title": "L2 and DeFi activity",
                "description": "Gas burn and on-chain usage swing the effective supply growth rate.",
            },
            {
                "title": "ETF and institutional flows",
                "description": "Spot ETF flows are smaller than BTC's but move price on quiet days.",
            },
        ],
    },
    "SOL": {
        "paragraphs": [
            "Solana is a high-throughput layer-1 optimized for low fees and fast finality, positioned as the venue of choice for on-chain trading, consumer apps, and memecoin speculation. Its price carries a higher beta than BTC or ETH and reacts sharply to shifts in retail on-chain activity.",
            "For a systematic trader SOL's liquidity is thinner and its volatility regime shifts faster than the majors, so models size positions more conservatively and lean harder on funding and open-interest signals to catch crowded-trade unwinds before they cascade.",
        ],
        "factors": [
            {
                "title": "On-chain trading and memecoin cycles",
                "description": "Retail speculative activity is the single largest swing factor.",
            },
            {
                "title": "Validator and network reliability",
                "description": "Outage history still gets priced in during stress periods.",
            },
            {
                "title": "Perp funding and leverage",
                "description": "Thinner books mean crowded positioning moves price faster than in BTC/ETH.",
            },
            {
                "title": "Ecosystem token unlocks",
                "description": "Scheduled unlocks across the SOL ecosystem periodically add sell pressure.",
            },
        ],
    },
    "DOGE": {
        "paragraphs": [
            "Dogecoin is the largest memecoin by market cap, with no roadmap-driven fundamental narrative — its price is set almost entirely by social attention, retail flow, and its correlation to BTC during broad risk-on/risk-off moves. Liquidity is meaningful but thinner and choppier than the majors.",
            "For a systematic trader DOGE behaves like a high-beta, high-noise satellite to BTC: trend signals work but need wider stops, and funding-rate extremes are a more reliable tell here than in BTC or ETH because retail leverage dominates the order book.",
        ],
        "factors": [
            {
                "title": "Social attention and retail flow",
                "description": "Sentiment spikes move DOGE faster and further than fundamentals-driven assets.",
            },
            {
                "title": "BTC beta",
                "description": "Correlated to broad crypto risk appetite, amplified in both directions.",
            },
            {
                "title": "Perp funding and leverage",
                "description": "Retail-dominated positioning makes funding extremes a strong contrarian signal.",
            },
            {
                "title": "Exchange listings and access",
                "description": "New venue listings or payment integrations periodically re-rate liquidity.",
            },
        ],
    },
    "BNB": {
        "paragraphs": [
            "BNB is the native token of BNB Chain and Binance's ecosystem currency, used for trading fee discounts, gas, and a wide range of DeFi activity across BNB Chain. Its price reflects both broad crypto beta and Binance-specific business risk — regulatory actions, exchange volumes, and the token's scheduled burn mechanics.",
            "For a systematic trader BNB behaves like a large-cap majors trade with an added idiosyncratic tail: exchange-specific news (regulatory, listing, burn events) can move it independently of BTC, so models need event-risk overlays on top of standard trend/mean-reversion signals.",
        ],
        "factors": [
            {"title": "Quarterly burn mechanics", "description": "Scheduled token burns tied to Binance's on-chain metrics periodically tighten supply."},
            {"title": "Binance exchange volume and health", "description": "BNB's utility value tracks the exchange's own trading activity and regulatory standing."},
            {"title": "BTC beta", "description": "Trades as a large-cap majors proxy most of the time, deviating mainly on BNB-specific news."},
            {"title": "Perp funding and leverage", "description": "Crowded long positioning during BNB Chain hype cycles produces sharp funding-driven unwinds."},
        ],
    },
    "ZEC": {
        "paragraphs": [
            "Zcash is a privacy-focused, optionally-shielded proof-of-work coin — one of the oldest privacy coins still trading, competing directly with Monero for the private-transactions narrative. Its price has historically been driven more by privacy-coin-specific narrative cycles and exchange delisting risk than by broad crypto beta.",
            "For a systematic trader ZEC is a high-volatility, thin-liquidity market prone to sharp narrative-driven repricings — a renewed privacy push or an exchange delisting headline can move it double digits in a session, so position sizing needs to be far more conservative than for a major like BTC or ETH.",
        ],
        "factors": [
            {"title": "Privacy narrative cycles", "description": "Renewed interest in shielded transactions periodically drives outsized rallies."},
            {"title": "Exchange listing/delisting risk", "description": "Regulatory pressure on privacy coins is an ever-present tail risk to liquidity."},
            {"title": "Shielded pool adoption", "description": "The share of shielded (vs transparent) transactions is a slow-moving fundamental signal."},
            {"title": "Perp funding and leverage", "description": "Thin books amplify crowded positioning into sharp squeezes in either direction."},
        ],
    },
    "LINK": {
        "paragraphs": [
            "Chainlink is the dominant oracle network, supplying price feeds and cross-chain messaging to most of DeFi. Its token accrues value from network usage — staking and fees — rather than from a fixed-supply scarcity story, making it trade more like an infrastructure-usage bet than a currency.",
            "For a systematic trader LINK offers deep, mature derivatives liquidity and a fairly stable correlation to broad DeFi activity — it tends to lead or lag ETH depending on the cycle, so models often use it as a read on risk appetite specifically within the DeFi complex rather than crypto broadly.",
        ],
        "factors": [
            {"title": "DeFi TVL and oracle usage", "description": "LINK's fee-generating utility scales with on-chain activity across every chain it services."},
            {"title": "Staking and lockups", "description": "A growing share of supply staked for network security reduces effective float."},
            {"title": "ETH / DeFi beta", "description": "Correlated with broader DeFi risk appetite, sometimes leading it."},
            {"title": "Perp funding and leverage", "description": "Established derivatives market with liquid, well-behaved funding dynamics."},
        ],
    },
    "ADA": {
        "paragraphs": [
            "Cardano is a research-driven, peer-reviewed layer-1 blockchain with a large, loyal retail holder base and a slower, more deliberate development cadence than most competitors. Its price has historically lagged other large-cap layer-1s during bull cycles and given back less during drawdowns, reflecting its comparatively low-beta reputation.",
            "For a systematic trader ADA is a lower-volatility large-cap alt with a strong retail-driven floor — trend signals tend to be slower and more persistent than in SOL or DOGE, rewarding patience over high-frequency mean reversion.",
        ],
        "factors": [
            {"title": "Governance and roadmap milestones", "description": "Major protocol upgrades are scheduled and telegraphed well in advance."},
            {"title": "Retail holder base", "description": "A large, sticky long-term holder base dampens volatility relative to peers."},
            {"title": "Layer-1 competitive positioning", "description": "Price is sensitive to relative narrative share versus SOL, ETH and other L1s."},
            {"title": "Perp funding and leverage", "description": "Lower-beta reputation shows up as comparatively muted funding extremes."},
        ],
    },
    "XMR": {
        "paragraphs": [
            "Monero is the largest privacy-first cryptocurrency, using mandatory ring signatures and stealth addresses so every transaction is private by default — unlike Zcash's optional shielding. It has no spot listings on most major regulated exchanges, so perpetuals are one of the only liquid ways to get price exposure.",
            "For a systematic trader XMR is defined by that listing scarcity: thin, concentrated liquidity and a history of explosive, narrative-driven moves (it hit a fresh all-time high in 2026 on renewed privacy-coin demand) make it a high-conviction, small-size market rather than a core book position.",
        ],
        "factors": [
            {"title": "Exchange delisting/relisting headlines", "description": "The single largest driver, given how few venues offer spot XMR."},
            {"title": "Privacy-coin narrative cycles", "description": "Moves closely with (and often leads) the broader privacy-coin complex."},
            {"title": "Regulatory pressure", "description": "Mandatory-privacy design draws more scrutiny than optional-privacy peers like ZEC."},
            {"title": "Perp funding and leverage", "description": "Thin, concentrated liquidity produces some of the sharpest funding swings of any listed market."},
        ],
    },
    "XRP": {
        "paragraphs": [
            "XRP is Ripple's payments-focused token, historically positioned around cross-border settlement rather than smart contracts or DeFi. Years of SEC litigation made it one of the most headline-sensitive assets in crypto, and its price still reacts sharply to regulatory and Ripple-corporate news even after that overhang largely cleared.",
            "For a systematic trader XRP has deep, mature liquidity comparable to BTC/ETH but a distinct driver set — legal/regulatory catalysts and banking-partnership news matter more here than for almost any other major, so models lean more on event-risk filters than pure price-action signals.",
        ],
        "factors": [
            {"title": "Regulatory and legal catalysts", "description": "Court rulings and SEC/regulatory news remain the single biggest price driver."},
            {"title": "Banking and payments partnerships", "description": "New settlement-rail adoption periodically re-rates the payments narrative."},
            {"title": "BTC beta", "description": "Trades with broad crypto risk appetite outside of XRP-specific news windows."},
            {"title": "Perp funding and leverage", "description": "Deep, majors-grade liquidity keeps funding comparatively well-behaved outside catalyst events."},
        ],
    },
    "TAO": {
        "paragraphs": [
            "Bittensor is a decentralized machine-learning network that rewards subnet participants for useful compute and model contributions, positioning TAO as the leading 'AI x crypto' token. Its price has traded heavily on the broader AI-crypto narrative rather than on network fundamentals alone.",
            "For a systematic trader TAO is a high-beta satellite to AI-sector sentiment more than to BTC — thin order books and a halving-style emission schedule mean funding and open-interest extremes are unusually informative, and models tend to size conservatively given the liquidity.",
        ],
        "factors": [
            {"title": "AI-narrative sentiment", "description": "Correlates more with AI-sector news flow than with broader crypto beta."},
            {"title": "Subnet emission schedule", "description": "A Bitcoin-style halving cadence periodically tightens new supply."},
            {"title": "Thin liquidity", "description": "Order books are shallow relative to market cap, amplifying moves in both directions."},
            {"title": "Perp funding and leverage", "description": "Crowded AI-narrative positioning produces some of the sharpest funding-driven squeezes in the list."},
        ],
    },
    "HYPE": {
        "paragraphs": [
            "HYPE is Hyperliquid's own native token — the same exchange this app's live market data comes from — used for gas, governance, and fee-discount/buyback mechanics on the Hyperliquid L1. Its price is unusually directly tied to the exchange's own trading volume and revenue, more so than most exchange tokens.",
            "For a systematic trader HYPE is a direct bet on the perp-DEX sector's biggest winner: revenue-funded buybacks give it a real (if variable) yield component, and because it trades on its own exchange, its liquidity and funding data are about as clean and native as any asset on this list.",
        ],
        "factors": [
            {"title": "Exchange revenue and buybacks", "description": "A share of Hyperliquid's trading fees is used to buy back HYPE, a genuine cash-flow link."},
            {"title": "Perp-DEX sector competition", "description": "Price is sensitive to Hyperliquid's market share versus rival on-chain perp exchanges."},
            {"title": "Protocol / L1 adoption", "description": "Growth of the broader Hyperliquid L1 ecosystem feeds back into token utility."},
            {"title": "Perp funding and leverage", "description": "Trading natively on its own venue makes funding here a particularly clean read on positioning."},
        ],
    },
    "NEAR": {
        "paragraphs": [
            "NEAR Protocol is a sharded, developer-friendly layer-1 that has repositioned itself around AI-agent infrastructure alongside its original scaling pitch. Its price mixes standard layer-1 competitive dynamics with a newer, more speculative AI-narrative overlay.",
            "For a systematic trader NEAR behaves like a mid-cap layer-1: meaningful but not top-tier liquidity, a beta to both the L1 sector and, more recently, the AI-crypto theme, with enough retail participation that funding extremes are a useful contrarian signal during narrative spikes.",
        ],
        "factors": [
            {"title": "Layer-1 competitive positioning", "description": "Price is sensitive to relative narrative share versus other smart-contract platforms."},
            {"title": "AI-agent narrative pivot", "description": "A newer positioning overlay that periodically decouples NEAR from pure L1 beta."},
            {"title": "Developer and ecosystem activity", "description": "Grants, integrations and dApp growth are slower-moving fundamental drivers."},
            {"title": "Perp funding and leverage", "description": "Mid-tier liquidity means crowded retail positioning shows up clearly in funding extremes."},
        ],
    },
    "TRX": {
        "paragraphs": [
            "TRON is a high-throughput layer-1 best known as the dominant settlement rail for USDT — the large majority of global stablecoin transfer volume happens on TRON rather than Ethereum, giving TRX real, usage-linked fundamental demand rather than a purely speculative narrative.",
            "For a systematic trader TRX is unusually low-volatility for an alt of its size, since so much of its activity is stablecoin plumbing rather than speculative trading — it tends to grind rather than trend sharply, so models generally size it as a lower-conviction, lower-turnover position relative to higher-beta names on this list.",
        ],
        "factors": [
            {"title": "USDT settlement volume", "description": "The overwhelming majority of global USDT transfers settle on TRON, a genuine usage-linked demand driver."},
            {"title": "Stablecoin ecosystem growth", "description": "TRON's dominance in stablecoin rails is itself a slow-moving competitive story versus other chains."},
            {"title": "BTC beta", "description": "Lower-beta than most alts, but still drifts with broad crypto risk appetite."},
            {"title": "Perp funding and leverage", "description": "Comparatively muted funding swings reflect the token's lower realized volatility."},
        ],
    },
    "PENGU": {
        "paragraphs": [
            "Pudgy Penguins' PENGU is a memecoin tied to one of the most recognizable NFT brands in crypto, extending the Pudgy Penguins IP — toys, licensing deals, retail partnerships — into a fungible token. Like most memecoins its price is driven almost entirely by social attention and brand momentum rather than any cash-flow or utility fundamental.",
            "For a systematic trader PENGU is the highest-volatility, thinnest-liquidity market on this list — a genuinely retail-driven, narrative-first asset where trend signals can reverse violently on social-sentiment shifts, so models size it smallest and lean hardest on funding/open-interest extremes as a contrarian tell.",
        ],
        "factors": [
            {"title": "Social attention and brand momentum", "description": "Sentiment on social platforms moves PENGU faster and further than any fundamentals-driven asset here."},
            {"title": "IP licensing and retail partnerships", "description": "Toy and merchandise deals occasionally drive real-world-attention-linked rallies."},
            {"title": "Memecoin sector rotation", "description": "Capital rotating in/out of the broader memecoin trade swings PENGU independent of majors."},
            {"title": "Perp funding and leverage", "description": "The most retail-dominated, most leverage-sensitive market in the list — funding extremes are the strongest contrarian signal here."},
        ],
    },
}

# --- "Strategies on {symbol}" ----------------------------------------
# Genuinely real: this is AlphaNet's own live strategy-performance API —
# the same one the production alphanet.global site itself reads (its
# design mockup's BTC figures, e.g. Hackworth Prime's +200.4% ROI /
# 2.87 Sharpe / 10.57% drawdown / 303 trades, match this endpoint
# exactly). No API key required; a public unauthenticated GET.
#
# Response shape: {"code":200,"msg":"success","data":[{...}, ...]}, each
# item keyed by "symbol" (Orderly-style, e.g. "PERP_BTC_USDC") and
# "strategy" (e.g. "Hackworth Prime"), with totalReturn/sharpeRatio/
# maxDrawDown/winRate/totalTrades/maxCapacity/actualCapacity/tag/
# marketProfile/dailyStatList (a cumulative-return time series used for
# the equity-curve sparkline). See app/services/strategy_service.py for
# the parser.
PHOENIX_RECENT_STAT_URL = "https://alphanet.phoenix.global/api/orderly/trade/recentStat"
PHOENIX_RECENT_STAT_WINDOW_DAYS = 30  # the API's own `t` query param
STRATEGIES_REFRESH_INTERVAL_S = 10 * 60
STRATEGIES_TOP_N = 4  # "top 4 by 30D ROI" among the strategies trading the selected symbol, per the user's instruction — currently returns 3 for every symbol since that's all that exists live, and will return up to 4 automatically once more do

# The live API doesn't include a prose description field (only a short
# "marketProfile" label) — these are matched onto whichever named
# strategies come back, live or fallback, purely as copy. Not
# market/performance data, so this doesn't affect real-vs-synthetic
# tagging either way.
STRATEGY_DESCRIPTIONS: Dict[str, str] = {
    "Hackworth Prime": "The balanced flagship. Relatively equal weighting across all alphas with ~25% directional exposure. Designed to weather all market conditions while capturing fat-tail moves. Best for general deployment.",
    "Hackworth Trend": "Long-bias variant optimized for directional markets. Maximizes returns in uptrends with reduced but maintained short exposure. Deploy when macro trend signals align.",
    "Hackworth OptimaShort": "The most risk-averse variant. Heavy weighting on mean-reversion and short-bias alphas. Delivers lower but steadier returns with smaller drawdowns. Excels in choppy, range-bound conditions.",
    "Archimedes Premium": "A higher-frequency strategy that trades far more often and holds for shorter periods. The result is a noticeably smoother equity curve with shallower drawdowns.",
}
STRATEGY_DESCRIPTION_FALLBACK = "Live multi-alpha strategy track record — see the equity curve and stats alongside it for performance detail."

# Last-resort fallback ONLY — used when alphanet.phoenix.global itself is
# unreachable (outage, firewall, no egress). The live recentStat endpoint
# has no fourth "Archimedes Premium" entry (confirmed by inspection: all
# 15 real markets have exactly 3 strategy records, never 4) — that 4th
# card is unique to the source design mockup. Since this whole roster is
# ALWAYS tagged `source: "synthetic"` and surfaced as clearly-labeled
# example data (never presented as real results), there's no harm in
# matching the mockup's 4-strategy layout here even though live data
# only ever has 3 — it keeps the fallback visually consistent with the
# real design instead of only showing 3 cards when this path is hit.
# Deterministically varied per symbol in strategy_service.py.
STRATEGY_DEFS: list[dict] = [
    {
        "key": "hackworth-prime",
        "name": "Hackworth Prime",
        "badges": ["POPULAR", "HIGH SHARPE"],
        "tagline": "NEUTRAL",
        "type": "Multi-Alpha",
        "version": "V1",
        "liveSince": "2Y 7M",
        "trades": 303,
        "base_roi": 2.004,
        "base_sharpe": 2.87,
        "base_max_drawdown": 0.1057,
        "base_win_rate": 0.518,
        "base_capacity_pct": 0.54,
    },
    {
        "key": "hackworth-trend",
        "name": "Hackworth Trend",
        "badges": ["POPULAR"],
        "tagline": "LONG BIAS, FAT-TAIL HEAVY",
        "type": "Multi-Alpha",
        "version": "V1",
        "liveSince": "2Y 7M",
        "trades": 469,
        "base_roi": 1.542,
        "base_sharpe": 2.21,
        "base_max_drawdown": 0.1640,
        "base_win_rate": 0.449,
        "base_capacity_pct": 0.38,
    },
    {
        "key": "hackworth-optimashort",
        "name": "Hackworth OptimaShort",
        "badges": ["HIGH SHARPE"],
        "tagline": "NEUTRAL WITH INCREASED SHORT-BIAS",
        "type": "Multi-Alpha",
        "version": "V1",
        "liveSince": "2Y 7M",
        "trades": 469,
        "base_roi": 0.418,
        "base_sharpe": 3.52,
        "base_max_drawdown": 0.0820,
        "base_win_rate": 0.583,
        "base_capacity_pct": 0.12,
    },
    {
        "key": "archimedes-premium",
        "name": "Archimedes Premium",
        "badges": ["HIGH SHARPE"],
        "tagline": "HIGHER FREQUENCY & SMOOTHER CURVE",
        "type": "Multi-Alpha",
        "version": "V3",
        "liveSince": "2Y 2M",
        "trades": 6410,
        "base_roi": 0.643,
        "base_sharpe": 3.11,
        "base_max_drawdown": 0.0390,
        "base_win_rate": 0.726,
        "base_capacity_pct": 0.74,
    },
]

# --- Recent news --------------------------------------------------------
# Real headlines pulled from public RSS feeds (no API key required) —
# genuinely live data, not fabricated. Filtered per-symbol by keyword
# match against title/description; falls back to the general top-of-feed
# items if a symbol has too few dedicated hits. If every feed is
# unreachable the endpoint returns an empty list tagged "unavailable"
# rather than inventing headlines — fabricating fake news text would be
# a much worse failure mode than fabricating a placeholder price.
RSS_FEEDS: list[dict] = [
    {"name": "CoinDesk", "url": "https://www.coindesk.com/arc/outboundfeeds/rss/"},
    {"name": "CoinTelegraph", "url": "https://cointelegraph.com/rss"},
    {"name": "Decrypt", "url": "https://decrypt.co/feed"},
    # BlockBeats (律动BlockBeats) — per their official feed docs
    # (github.com/BlockBeatsOfficial/RSS-v2), the v2 endpoint serves
    # standard RSS 2.0 XML and language is selected via a `language`
    # request header (cn / en / cht) rather than a separate URL — hence
    # the `headers` entry below, requesting the English edition. Not
    # independently verified against a live response (the research tools
    # available couldn't confirm a non-empty reply), but this is exactly
    # what their own docs specify, and `news_service.fetch_all_feeds`
    # already treats any one feed failing/parsing-empty as "just fewer
    # items" rather than a hard error — so this is safe to ship even if
    # something about the header/URL needs adjusting later.
    {
        "name": "BlockBeats",
        "url": "https://api.theblockbeats.news/v2/rss/all",
        "headers": {"language": "en"},
    },
]

NEWS_KEYWORDS: Dict[str, list[str]] = {
    "BTC": ["bitcoin", "btc"],
    "ETH": ["ethereum", "eth", "ether"],
    "SOL": ["solana", "sol"],
    "DOGE": ["dogecoin", "doge"],
    "BNB": ["binance", "binance coin", "bnb chain", "bnb"],
    "ZEC": ["zcash", "zec"],
    # "link" deliberately excluded — matching is plain substring (see
    # news_service.matches), and "link" is far too common a word in
    # ordinary headlines to use bare.
    "LINK": ["chainlink"],
    # "ada" deliberately excluded — substring-collides with "Canada",
    # "Nevada", etc.
    "ADA": ["cardano"],
    "XMR": ["monero", "xmr"],
    "XRP": ["xrp", "ripple"],
    "TAO": ["bittensor", "tao"],
    # "hype" deliberately excluded — collides with generic "hype" headlines
    # unrelated to this token (AI hype, market hype, ...).
    "HYPE": ["hyperliquid"],
    # "near" deliberately excluded — an ordinary English word, would match
    # almost anything ("Bitcoin nears $130K").
    "NEAR": ["near protocol"],
    "TRX": ["tron", "trx"],
    "PENGU": ["pudgy penguins", "pengu"],
}

NEWS_REFRESH_INTERVAL_S = 10 * 60  # RSS feeds don't need second-by-second polling
NEWS_MAX_ITEMS_PER_FEED = 30  # how many raw items to keep per feed after parsing
NEWS_ITEMS_PER_SYMBOL = 6  # how many items the API returns per symbol

# --- Volatility panel ---------------------------------------------------
VOL_WINDOW_DAYS = 30  # rolling realized-vol window
VOL_LOOKBACK_DAYS = 365  # how much of the rolling series to return (trailing 12mo)
