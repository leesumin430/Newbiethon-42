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
    [1번] route_service
          resolve_station()  -> 오타 보정 / 후보 제안
          get_route()        -> stations / duration / transfers
                                + transfer_stations / segments
            |
            v
    [2번] integration.py (어댑터)
          get_congestion()   -> score / level / worst_segment
          calculate_reward() -> 포인트
          recommend()        -> 추천 문장
          rank_routes()      -> 경로 비교 + 순위 보너스
            |
            v
    [3번 Frontend]  {"route":..., "congestion":..., "recommendation":..., "reward":...}
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

# ==========================================================================
# 2번 모듈 연결
# ==========================================================================
#
# 2번의 실제 함수는 시그니처가 다르다(시각 대신 hour 정수 등).
# integration.py 어댑터를 거쳐 붙이므로 세 이름 모두 같은 모듈을 가리킨다.
#
import integration as congestion_service
import integration as reward_service
import integration as agent_service

HAS_CONGESTION = HAS_REWARD = HAS_AGENT = True

logger = logging.getLogger("trip")
logging.basicConfig(level=logging.INFO)


# --------------------------------------------------------------------------
# 2번 호출 래퍼
#   어댑터가 예외를 던져도 서버가 500으로 죽지 않고 기본값으로 응답한다.
#   시연 중에 혼잡도 하나 때문에 경로까지 못 보여주는 상황을 막기 위함.
# --------------------------------------------------------------------------

_FALLBACK_CONGESTION: dict[str, Any] = {"score": 0, "level": "UNKNOWN", "pending": True}
_FALLBACK_REWARD = 100
_FALLBACK_MESSAGE = "혼잡도 정보를 불러오지 못했습니다."


def _call_congestion(stations: list[str], when: str) -> dict[str, Any]:
    try:
        return congestion_service.get_congestion(stations, when)
    except Exception:
        logger.exception("get_congestion 실패")
        return dict(_FALLBACK_CONGESTION)


def _call_reward(congestion: dict[str, Any], route: dict[str, Any]) -> int:
    try:
        return int(reward_service.calculate_reward(congestion, route))
    except Exception:
        logger.exception("calculate_reward 실패")
        return _FALLBACK_REWARD


def _call_agent(route: dict[str, Any], congestion: dict[str, Any]) -> str:
    try:
        return str(agent_service.recommend(route, congestion))
    except Exception:
        logger.exception("recommend 실패")
        return _FALLBACK_MESSAGE


def _call_reward_detail(
    congestion: dict[str, Any], route: dict[str, Any]
) -> list[dict[str, Any]]:
    """
    포인트 적립 내역. 3번 결과 화면의 내역 리스트용.

    시각 인자는 넘기지 않는다. 어댑터가 congestion["hour"](정수)를 꺼내 쓰므로
    여기서 "HH:MM" 문자열을 넘기면 타입이 어긋난다.
    반환 dict의 키 이름은 2번 구현에 따라 다를 수 있어 후보를 순서대로 찾는다.
    """
    try:
        detail = reward_service.calculate_reward_detail(congestion, route)
    except Exception:
        logger.exception("calculate_reward_detail 실패")
        return []

    if not isinstance(detail, dict):
        return []

    for key in ("reward_breakdown", "breakdown", "details", "items"):
        value = detail.get(key)
        if isinstance(value, list):
            return value
    return []


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


class CorrectionOut(BaseModel):
    """오타 보정이 일어났을 때 무엇이 무엇으로 바뀌었는지."""

    field: str = Field(description="start 또는 destination")
    input: str = Field(description="사용자가 입력한 값")
    matched: str = Field(description="실제로 사용된 역")


class RouteOut(BaseModel):
    stations: list[str] = Field(description="전체 경유역. 중복 제거된 평평한 리스트")
    duration: int = Field(description="총 소요시간(분)")
    transfers: int = Field(description="환승 횟수")

    # --- 환승 표시용 ---
    transfer_stations: list[str] = Field(
        default=[], description="갈아탄 역. 예: ['신당', '교대']"
    )
    segments: list[dict[str, Any]] = Field(
        default=[],
        description="노선별 구간. 각 항목: line / from / to / stations / count",
    )

    # --- 부가 필드 ---
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
    reward_breakdown: list[dict[str, Any]] = Field(
        default=[], description="포인트 적립 내역. 결과 화면의 내역 리스트용."
    )
    corrections: list[CorrectionOut] = Field(
        default=[],
        description="오타 보정 내역. 비어 있지 않으면 화면에 '~로 검색했습니다' 안내 권장.",
    )
    time: str


# ==========================================================================
# 앱
# ==========================================================================


@asynccontextmanager
async def lifespan(app: FastAPI):
    route_service.init_client()
    logger.info("startup | %s", route_service.cache_stats())
    try:
        yield
    finally:
        await route_service.close_client()
        logger.info("shutdown")


app = FastAPI(
    title="역 리워드 길찾기 API",
    description="출발역/도착역으로 경로·혼잡도·추천·리워드를 반환합니다.",
    version="0.4.0",
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
    """
    RouteError -> HTTPException.

    역을 못 찾은 경우 detail 에 후보를 함께 실어 보낸다.
    프론트에서는 err.detail.suggestions 로 "혹시 이걸 찾으셨나요?"를 띄우면 된다.
    """
    if exc.not_found:
        return HTTPException(
            status_code=404,
            detail={"message": str(exc), "suggestions": exc.suggestions},
        )
    return HTTPException(status_code=502, detail={"message": str(exc), "suggestions": []})


# ==========================================================================
# 엔드포인트
# ==========================================================================


@app.get("/health", tags=["system"])
async def health() -> dict[str, Any]:
    """서버 상태 + 2번 모듈 연결 여부 + 캐시 상태."""
    return {
        "status": "ok",
        "modules": {
            "congestion_service": HAS_CONGESTION,
            "reward_service": HAS_REWARD,
            "agent_service": HAS_AGENT,
        },
        "cache": route_service.cache_stats(),
    }


@app.post("/trip", response_model=TripResponse, tags=["trip"])
async def trip(req: TripRequest) -> TripResponse:
    """
    3번이 호출하는 메인 엔드포인트.

    요청:
        {"start": "고려대역", "destination": "강남역"}
    응답:
        {"route": {...}, "congestion": {...}, "recommendation": "...", "reward": 150}

    오타는 자동 보정되며, 보정이 일어나면 corrections 에 기록된다.
    역을 아예 못 찾으면 404 + detail.suggestions 로 후보를 돌려준다.
    """
    when = req.time or datetime.now().strftime("%H:%M")

    # 1번 영역 — 입력 확정(오타 보정 포함)
    try:
        start_info = await route_service.resolve_station(req.start)
        end_info = await route_service.resolve_station(req.destination)
    except RouteError as exc:
        raise _to_http_error(exc) from exc

    corrections = [
        CorrectionOut(field=field, input=info["query"], matched=info["matched"])
        for field, info in (("start", start_info), ("destination", end_info))
        if info["corrected"]
    ]

    # 1번 영역 — 경로 조회
    # 확정된 이름으로 부르므로 내부 재검색은 캐시에서 처리된다.
    try:
        route = await route_service.get_route(start_info["matched"], end_info["matched"])
    except RouteError as exc:
        raise _to_http_error(exc) from exc

    # 2번 영역
    congestion = _call_congestion(route["stations"], when)
    reward = _call_reward(congestion, route)
    recommendation = _call_agent(route, congestion)
    breakdown = _call_reward_detail(congestion, route)

    return TripResponse(
        route=RouteOut(**route),
        congestion=congestion,
        recommendation=recommendation,
        reward=reward,
        reward_breakdown=breakdown,
        corrections=corrections,
        time=when,
    )


@app.get("/api/stations/search", tags=["stations"])
async def station_search(
    q: str = Query(min_length=1, description="역 이름 일부 (예: 강남)"),
    size: int = Query(5, ge=1, le=15),
) -> list[dict[str, Any]]:
    """
    3번의 입력창 자동완성용. 지하철역만 반환한다.
    같은 질의는 10분간 캐시되므로 타이핑마다 호출해도 부담이 적다.
    (그래도 프론트에서 250ms 정도 디바운스를 거는 편이 좋다.)
    """
    try:
        return await route_service.search_stations(q, size=size)
    except RouteError as exc:
        raise _to_http_error(exc) from exc


@app.get("/api/stations/resolve", tags=["stations"])
async def station_resolve(
    q: str = Query(min_length=1, description="확인할 역 이름"),
) -> dict[str, Any]:
    """
    입력값이 유효한 역인지 확인하고, 오타면 보정해서 돌려준다.
    입력창에서 포커스가 빠질 때 호출하면 '사담 → 사당으로 검색합니다' 안내를 띄울 수 있다.

    못 찾으면 404 + detail.suggestions 로 후보를 돌려준다.
    """
    try:
        return await route_service.resolve_station(q)
    except RouteError as exc:
        raise _to_http_error(exc) from exc


@app.get("/api/routes", tags=["trip"])
async def routes(
    start: str = Query(description="출발역"),
    destination: str = Query(description="도착역"),
    limit: int = Query(3, ge=1, le=5),
    include_path: bool = Query(
        False,
        description="지도 좌표(path) 포함 여부. 경로당 수백 개라 비교 화면에서는 보통 끈다.",
    ),
) -> dict[str, Any]:
    """
    경로 후보를 비교해서 반환한다.

    rank_routes 가 혼잡도 낮은 순으로 정렬하고 순위 보너스(50/25/10/0)를 붙인다.
    '한산한 경로를 고르면 포인트를 더 준다'는 서비스 핵심이 여기서 나온다.

    options 각 항목은 flat 구조다 (route 로 한 번 더 감싸지 않는다):
        stations, duration, transfers, transfer_stations, segments, lines, fare, ...
        congestion  {"score", "level", "worst_segment"}
        rank        1위부터
        reward      최종 포인트
        reward_breakdown  적립 내역
        recommended 1위 여부
    """
    try:
        found = await route_service.get_routes(start, destination, limit=limit)
    except RouteError as exc:
        raise _to_http_error(exc) from exc

    when = datetime.now().strftime("%H:%M")

    try:
        ranked = congestion_service.rank_routes(found, when)
    except Exception:
        logger.exception("rank_routes 실패 — 정렬/보너스 없이 반환")
        ranked = found

    if not include_path:
        for item in ranked:
            item.pop("path", None)

    return {"count": len(ranked), "time": when, "options": ranked}


@app.get("/api/level", tags=["reward"])
async def level(
    points: int = Query(ge=0, description="사용자의 누적 포인트"),
    before: int | None = Query(
        None, description="이번 이동 전 포인트. 주면 레벨업 여부도 함께 반환한다."
    ),
) -> dict[str, Any]:
    """
    누적 포인트 -> 레벨 / 칭호 / 진행률.
    3번의 캐릭터 화면 프로그레스 바와 레벨업 연출에 쓴다.
    """
    try:
        result: dict[str, Any] = dict(reward_service.get_level(points))
        if before is not None:
            result["levelup"] = reward_service.check_levelup(before, points)
        result["bonus_windows"] = reward_service.bonus_windows()
        return result
    except Exception as exc:
        logger.exception("get_level 실패")
        raise HTTPException(status_code=500, detail=f"레벨 계산 실패: {exc}") from exc