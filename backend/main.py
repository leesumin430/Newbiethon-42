"""
main.py  —  1번 담당
====================

FastAPI 뼈대이자 세 사람의 코드가 만나는 유일한 지점.

실행:
    cd backend
    uvicorn main:app --reload --port 8000
문서:
    http://localhost:8000/docs


통합 구조
---------
    [3번 Frontend]  POST /trip  {"start": "고려대역", "destination": "강남역"}
            |
            v
    [1번] route_service.get_route()        -> stations / duration / transfers
            |
            v
    [2번] congestion_service.get_congestion()  -> score / level
          reward_service.calculate_reward()    -> 포인트
          agent_service.recommend()            -> 추천 문장
            |
            v
    [3번 Frontend]  {"route":..., "congestion":..., "recommendation":..., "reward":...}


2번 모듈이 아직 없어도 이 서버는 뜬다.
없으면 _FALLBACK 값으로 응답하고 "pending": true 를 붙여서
3번이 먼저 화면을 붙일 수 있게 한다. 2번 파일이 생기면 자동으로 진짜 값으로 바뀐다.
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Any

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

import route_service
from route_service import RouteError

logger = logging.getLogger("trip")
logging.basicConfig(level=logging.INFO)


# ==========================================================================
# 2번 모듈 연결 (아직 없으면 스텁으로 동작)
# ==========================================================================
#
# 2번에게 요청할 함수 시그니처 — 이대로 만들어주면 아래 코드가 그대로 붙는다.
#
#   congestion_service.get_congestion(stations: list[str], time: str) -> dict
#       {"score": 78, "level": "HIGH"}
#
#   reward_service.calculate_reward(congestion: dict, route: dict) -> int
#       120
#
#   agent_service.recommend(route: dict, congestion: dict) -> str
#       "19시 30분 이후 이동하면 추가 리워드를 받을 수 있습니다."
#

try:
    import congestion_service  # type: ignore

    HAS_CONGESTION = True
except ImportError:
    HAS_CONGESTION = False

try:
    import reward_service  # type: ignore

    HAS_REWARD = True
except ImportError:
    HAS_REWARD = False

try:
    import agent_service  # type: ignore

    HAS_AGENT = True
except ImportError:
    HAS_AGENT = False


_FALLBACK_CONGESTION: dict[str, Any] = {"score": 0, "level": "UNKNOWN", "pending": True}
_FALLBACK_REWARD = 100
_FALLBACK_MESSAGE = "혼잡도 분석 모듈 연결 대기 중입니다."


def _call_congestion(stations: list[str], when: str) -> dict[str, Any]:
    if not HAS_CONGESTION:
        return dict(_FALLBACK_CONGESTION)
    try:
        return congestion_service.get_congestion(stations, when)
    except Exception:
        logger.exception("congestion_service 호출 실패")
        return dict(_FALLBACK_CONGESTION)


def _call_reward(congestion: dict[str, Any], route: dict[str, Any]) -> int:
    if not HAS_REWARD:
        return _FALLBACK_REWARD
    try:
        return int(reward_service.calculate_reward(congestion, route))
    except Exception:
        logger.exception("reward_service 호출 실패")
        return _FALLBACK_REWARD


def _call_agent(route: dict[str, Any], congestion: dict[str, Any]) -> str:
    if not HAS_AGENT:
        return _FALLBACK_MESSAGE
    try:
        return str(agent_service.recommend(route, congestion))
    except Exception:
        logger.exception("agent_service 호출 실패")
        return _FALLBACK_MESSAGE


# ==========================================================================
# 요청 / 응답 스키마
# ==========================================================================


class TripRequest(BaseModel):
    start: str = Field(examples=["고려대역"], description="출발역 이름")
    destination: str = Field(examples=["강남역"], description="도착역 이름")
    time: str | None = Field(
        default=None,
        examples=["18:00"],
        description="출발 예정 시각(HH:MM). 생략하면 서버의 현재 시각을 쓴다.",
    )


class RouteOut(BaseModel):
    stations: list[str]
    duration: int = Field(description="총 소요시간(분)")
    transfers: int = Field(description="환승 횟수")
    type: str = ""
    distance: int = 0
    fare: int = 0
    lines: list[str] = []
    path: list[list[float]] = Field(default=[], description="지도 폴리라인용 [경도, 위도]")


class TripResponse(BaseModel):
    route: RouteOut
    congestion: dict[str, Any]
    recommendation: str
    reward: int
    time: str


# ==========================================================================
# 앱
# ==========================================================================


@asynccontextmanager
async def lifespan(app: FastAPI):
    route_service.init_client()
    logger.info(
        "startup | congestion=%s reward=%s agent=%s",
        HAS_CONGESTION,
        HAS_REWARD,
        HAS_AGENT,
    )
    if not (HAS_CONGESTION and HAS_REWARD and HAS_AGENT):
        logger.warning("2번 모듈 일부 미연결 — fallback 값으로 응답합니다.")
    try:
        yield
    finally:
        await route_service.close_client()
        logger.info("shutdown")


app = FastAPI(
    title="역 리워드 길찾기 API",
    description="출발역/도착역으로 경로·혼잡도·추천·리워드를 반환합니다.",
    version="0.1.0",
    lifespan=lifespan,
)

# 3번이 로컬에서 열어도 막히지 않도록 개발용으로 넓게 열어둔다.
# 배포 전에 실제 도메인만 남길 것.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _to_http_error(exc: RouteError) -> HTTPException:
    return HTTPException(status_code=404 if exc.not_found else 502, detail=str(exc))


# ==========================================================================
# 엔드포인트
# ==========================================================================


@app.get("/health", tags=["system"])
async def health() -> dict[str, Any]:
    """서버 상태 + 2번 모듈 연결 여부. 통합할 때 이것부터 확인하면 된다."""
    return {
        "status": "ok",
        "modules": {
            "congestion_service": HAS_CONGESTION,
            "reward_service": HAS_REWARD,
            "agent_service": HAS_AGENT,
        },
    }


@app.post("/trip", response_model=TripResponse, tags=["trip"])
async def trip(req: TripRequest) -> TripResponse:
    """
    ★ 3번이 호출하는 메인 엔드포인트 ★

    요청:
        {"start": "고려대역", "destination": "강남역"}
    응답:
        {"route": {...}, "congestion": {...}, "recommendation": "...", "reward": 150}
    """
    when = req.time or datetime.now().strftime("%H:%M")

    # 1번 영역
    try:
        route = await route_service.get_route(req.start, req.destination)
    except RouteError as exc:
        raise _to_http_error(exc) from exc

    # 2번 영역
    congestion = _call_congestion(route["stations"], when)
    reward = _call_reward(congestion, route)
    recommendation = _call_agent(route, congestion)

    return TripResponse(
        route=RouteOut(**route),
        congestion=congestion,
        recommendation=recommendation,
        reward=reward,
        time=when,
    )


@app.get("/api/stations/search", tags=["stations"])
async def station_search(
    q: str = Query(min_length=1, description="역 이름 일부 (예: 강남)"),
    size: int = Query(5, ge=1, le=15),
) -> list[dict[str, Any]]:
    """3번의 입력창 자동완성용. 지하철역만 반환한다."""
    try:
        return await route_service.search_stations(q, size=size)
    except RouteError as exc:
        raise _to_http_error(exc) from exc


@app.get("/api/routes", tags=["trip"])
async def routes(
    start: str = Query(description="출발역"),
    destination: str = Query(description="도착역"),
    limit: int = Query(3, ge=1, le=5),
) -> dict[str, Any]:
    """
    경로 후보 여러 개를 빠른 순으로 반환한다.
    "이 경로로 가면 리워드가 더 많다"를 비교해서 보여줄 때 쓴다.
    """
    try:
        found = await route_service.get_routes(start, destination, limit=limit)
    except RouteError as exc:
        raise _to_http_error(exc) from exc

    when = datetime.now().strftime("%H:%M")
    enriched = []
    for r in found:
        congestion = _call_congestion(r["stations"], when)
        enriched.append(
            {
                "route": r,
                "congestion": congestion,
                "reward": _call_reward(congestion, r),
            }
        )

    return {"count": len(enriched), "time": when, "options": enriched}
