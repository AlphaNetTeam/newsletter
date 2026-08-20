from __future__ import annotations

from typing import Generic, List, Optional, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class ApiResponse(BaseModel, Generic[T]):
    """Response envelope matching the convention observed on the
    production API (alphanet.phoenix.global): {code, msg, data}.
    """

    code: int = 200
    msg: str = "success"
    data: Optional[T] = None


class SymbolInfo(BaseModel):
    symbol: str
    name: str
    assetClass: str  # "crypto" today for every symbol — see SymbolConfig.asset_class


class PricePointOut(BaseModel):
    t: int  # unix ms
    price: float


class PriceHistoryData(BaseModel):
    symbol: str
    range: str
    unit: str = "USD"
    points: List[PricePointOut]
    source: str = "synthetic"  # "live" (Hyperliquid) or "synthetic" (generated fallback)


class StatsData(BaseModel):
    symbol: str
    currentPrice: float
    change1m: float
    changeYtd: float
    change1y: float
    athPrice: float
    low12mPrice: float
    source: str = "synthetic"


class MetricsData(BaseModel):
    symbol: str
    openInterest: float
    volume24h: float
    fundingHourly: float
    fundingAnnualized: float
    realizedVol30d: float
    maxLeverage: int
    source: str = "synthetic"


class CorrelationEntry(BaseModel):
    symbol: str
    correlation: float
    source: str = "synthetic"


class CorrelationData(BaseModel):
    baseSymbol: str
    window: str
    entries: List[CorrelationEntry]
    source: str = "synthetic"


class AboutFactor(BaseModel):
    title: str
    description: str


class AboutData(BaseModel):
    symbol: str
    paragraphs: List[str]
    factors: List[AboutFactor]
    source: str = "static"  # editorial copy — not a live/synthetic market figure


class FaqEntry(BaseModel):
    question: str
    answer: str


class FaqData(BaseModel):
    symbol: str
    entries: List[FaqEntry]


class NewsItemOut(BaseModel):
    title: str
    url: str
    source: str  # feed name, e.g. "CoinDesk"
    publishedAt: int  # unix ms


class NewsData(BaseModel):
    symbol: str
    items: List[NewsItemOut]
    source: str = "unavailable"  # "live" or "unavailable" — never "synthetic" (no fabricated headlines)


class StrategyOut(BaseModel):
    key: str
    name: str
    badges: List[str] = []
    tagline: str
    description: str
    type: str
    version: str
    liveSince: str
    trades: int
    roi: float
    sharpe: float
    maxDrawdown: float
    winRate: float
    capacityPct: float
    equityCurve: List[float]


class StrategiesData(BaseModel):
    symbol: str
    strategies: List[StrategyOut]
    source: str = "synthetic"  # "live" (AlphaNet's own recentStat API) or "synthetic" fallback — see strategy_service.py docstring


class VolatilityPointOut(BaseModel):
    t: int
    vol: float


class VolatilitySeriesOut(BaseModel):
    points: List[VolatilityPointOut]
    current: float
    high12m: float
    low12m: float
    vsBtcMultiple: Optional[float] = None
    sp500Current: Optional[float] = None
    sp500Source: str = "unavailable"
    source: str = "synthetic"


class DrawdownEntryOut(BaseModel):
    label: str
    maxDrawdown: float
    source: str


class VolatilityData(BaseModel):
    symbol: str
    series: VolatilitySeriesOut
    drawdownCompare: List[DrawdownEntryOut]
    holdingDrawdown: float
    holdingDrawdownSource: str = "synthetic"
