"""'About {symbol}' and FAQ content.

About-panel copy and the FAQ question text are static editorial content
(maintained here, not fetched from any API — there's no upstream source
for this on the real site either, it's written copy). The FAQ *answers*
are templated with real numbers: the best-strategy pick and "can these
strategies short" answers pull from `strategy_service` (real data from
AlphaNet's own recentStat API when reachable, synthetic fallback
otherwise — see that module's docstring), and the "how is this different
from holding" answer uses a real peak-to-trough drawdown computed from
actual price history (`market_service._max_drawdown`), so the copy stays
internally consistent with whatever the strategies table / volatility
panel are actually showing rather than drifting out of sync.

"Best strategy" specifically means highest 30D ROI — `strategies[0]`,
since `get_strategies` already returns that list ranked by ROI
descending. It's deliberately not some other blended metric (e.g.
Sharpe-adjusted): the point is this answer never disagrees with what the
strategies table itself is showing as the top row.
"""
from __future__ import annotations

from app.core.config import ABOUT_CONTENT, SYMBOLS
from app.core.live_store import LiveStore
from app.services.strategy_service import get_strategies


def get_about(symbol: str) -> dict:
    symbol = symbol.upper()
    content = ABOUT_CONTENT.get(symbol)
    if not content:
        return {"symbol": symbol, "paragraphs": [], "factors": [], "source": "static"}
    return {
        "symbol": symbol,
        "paragraphs": content["paragraphs"],
        "factors": content["factors"],
        "source": "static",
    }


def _fmt_pct(value: float) -> str:
    return f"{value * 100:.1f}%"


def build_faq(store: LiveStore, symbol: str, holding_drawdown: float | None) -> dict:
    symbol = symbol.upper()
    name = SYMBOLS[symbol]["name"]
    strategies = get_strategies(store, symbol)["strategies"]
    count = len(strategies)
    neutral_count = sum(1 for s in strategies if "neutral" in s["tagline"].lower())

    # `strategies` is already ranked by 30D ROI descending (see
    # strategy_service.get_strategies) — the same ordering shown in the
    # table above — so "best" here just means the top of that real
    # ranking, not a separately-computed metric that could disagree with
    # what the table itself shows.
    best = strategies[0]
    short_capable = next((s for s in strategies if "short" in s["name"].lower()), strategies[-1])

    q1_answer = (
        f"By 30-day ROI, {best['name']} is currently on top: {_fmt_pct(best['roi'])}, with a "
        f"{best['sharpe']:.2f} Sharpe ratio and a {_fmt_pct(best['maxDrawdown'])} worst drawdown."
    )

    holding_answer = (
        f"Holding took a {_fmt_pct(holding_drawdown)} peak-to-trough loss over this period. "
        f"The strategies hold {symbol} exposure part of the time and hedge or flip short in downtrends."
        if holding_drawdown is not None
        else (
            f"The strategies hold {symbol} exposure part of the time and hedge or flip short in "
            f"downtrends, rather than being exposed to its full peak-to-trough drawdown."
        )
    )

    entries = [
        {"question": f"What is the best {symbol} trading strategy?", "answer": q1_answer},
        {
            "question": f"Do I have to predict where {symbol} goes?",
            "answer": (
                "No. You choose a strategy and an allocation; the model decides direction, size and "
                f"timing. {neutral_count} of the {count} are net-neutral on average."
            ),
        },
        {"question": f"How is this different from holding {name}?", "answer": holding_answer},
        {
            "question": "What is the minimum allocation?",
            "answer": "1,000 USDC per strategy. Capital stays in your own account; AlphaNet holds trading permission only.",
        },
        {
            "question": f"Can these strategies short {symbol}?",
            "answer": (
                f"Yes. All {count} run long, short or flat on the perpetual, and {short_capable['name']} is "
                f"short-biased by design."
            ),
        },
        {
            "question": "What happens if a strategy stops working?",
            "answer": (
                "Every model runs under an alpha-decay monitor. Drifting strategies are capped, retrained "
                "or retired, and their full history stays published here."
            ),
        },
    ]

    return {"symbol": symbol, "entries": entries}
