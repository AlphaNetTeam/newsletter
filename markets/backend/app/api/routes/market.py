from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query, Request

from app.core.config import SYMBOLS
from app.core.live_store import LiveStore
from app.schemas import (
    AboutData,
    ApiResponse,
    CorrelationData,
    CorrelationEntry,
    FaqData,
    MetricsData,
    NewsData,
    PriceHistoryData,
    PricePointOut,
    StatsData,
    StrategiesData,
    SymbolInfo,
    VolatilityData,
)
from app.services import content_service, market_service, news_service, price_service, strategy_service

router = APIRouter(prefix="/api/market", tags=["market"])


def _store(request: Request) -> LiveStore:
    return request.app.state.store


def _ensure_symbol(symbol: str) -> str:
    symbol = symbol.upper()
    if symbol not in SYMBOLS:
        raise HTTPException(status_code=404, detail=f"Unknown symbol '{symbol}'")
    return symbol


@router.get("/symbols", response_model=ApiResponse[list[SymbolInfo]])
async def list_symbols():
    data = [
        SymbolInfo(symbol=sym, name=cfg["name"], assetClass=cfg["asset_class"])
        for sym, cfg in SYMBOLS.items()
    ]
    return ApiResponse(data=data)


@router.get("/status")
async def status(request: Request):
    """Lightweight health view of the live-data pipeline — handy for
    debugging whether Hyperliquid is actually reachable from wherever
    this backend is running.
    """
    store = _store(request)
    return ApiResponse(
        data={
            "hyperliquidWsConnected": store.ws_connected,
            "hyperliquidRestOk": store.rest_ok,
            "symbolsWithCandles": sorted(store.candles.keys()),
            "connectedFrontendClients": store.connections.client_count,
        }
    )


@router.get("/{symbol}/price-history", response_model=ApiResponse[PriceHistoryData])
async def price_history(
    request: Request, symbol: str, range: str = Query("ALL", pattern="^(1M|3M|1Y|ALL)$")
):
    symbol = _ensure_symbol(symbol)
    points, source = await price_service.get_price_series(_store(request), symbol, range)  # type: ignore[arg-type]
    data = PriceHistoryData(
        symbol=symbol,
        range=range,
        points=[PricePointOut(t=p.timestamp_ms, price=p.price) for p in points],
        source=source,
    )
    return ApiResponse(data=data)


@router.get("/{symbol}/stats", response_model=ApiResponse[StatsData])
async def stats(request: Request, symbol: str):
    symbol = _ensure_symbol(symbol)
    data = await price_service.get_stats(_store(request), symbol)
    return ApiResponse(data=StatsData(**data))


@router.get("/{symbol}/metrics", response_model=ApiResponse[MetricsData])
async def metrics(request: Request, symbol: str):
    symbol = _ensure_symbol(symbol)
    data = await market_service.get_metrics(_store(request), symbol)
    return ApiResponse(data=MetricsData(**data))


@router.get("/{symbol}/correlation", response_model=ApiResponse[CorrelationData])
async def correlation(request: Request, symbol: str, window: str = Query("90d")):
    symbol = _ensure_symbol(symbol)
    data = await market_service.get_correlation(_store(request), symbol, window)
    data["entries"] = [CorrelationEntry(**e) for e in data["entries"]]
    return ApiResponse(data=CorrelationData(**data))


@router.get("/{symbol}/about", response_model=ApiResponse[AboutData])
async def about(symbol: str):
    symbol = _ensure_symbol(symbol)
    data = content_service.get_about(symbol)
    return ApiResponse(data=AboutData(**data))


@router.get("/{symbol}/news", response_model=ApiResponse[NewsData])
async def news(request: Request, symbol: str):
    symbol = _ensure_symbol(symbol)
    data = news_service.get_news_for_symbol(_store(request), symbol)
    return ApiResponse(data=NewsData(**data))


@router.get("/{symbol}/strategies", response_model=ApiResponse[StrategiesData])
async def strategies(request: Request, symbol: str):
    symbol = _ensure_symbol(symbol)
    data = strategy_service.get_strategies(_store(request), symbol)
    return ApiResponse(data=StrategiesData(**data))


@router.get("/{symbol}/volatility", response_model=ApiResponse[VolatilityData])
async def volatility(request: Request, symbol: str):
    symbol = _ensure_symbol(symbol)
    data = await market_service.get_volatility(_store(request), symbol)
    return ApiResponse(data=VolatilityData(**data))


@router.get("/{symbol}/faq", response_model=ApiResponse[FaqData])
async def faq(request: Request, symbol: str):
    symbol = _ensure_symbol(symbol)
    vol_data = await market_service.get_volatility(_store(request), symbol)
    data = content_service.build_faq(_store(request), symbol, vol_data.get("holdingDrawdown"))
    return ApiResponse(data=FaqData(**data))
