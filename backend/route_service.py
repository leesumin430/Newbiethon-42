"""
route_service.py  —  1번 담당
============================

책임: "어떻게 갈 것인가?"
    출발역 + 목적지  ->  경로(역 목록) / 소요시간 / 환승횟수

팀 계약 (이 형태를 바꾸려면 2번, 3번과 먼저 합의할 것)
-------------------------------------------------------
    get_route("고려대역", "강남역")
    ->
    {
        "stations": ["고려대", "보문", "신당", "강남"],
        "duration": 38,          # 분 단위
        "transfers": 1
    }

이 모듈은 혼잡도/리워드/Agent를 모르는 상태로 동작한다.
그쪽은 2번(congestion_service, reward_service, agent_service) 담당이고,
합치는 지점은 main.py 한 곳뿐이다.

사용 API: 카카오맵 REST API
    - 역 이름 -> 좌표 : GET /v2/local/search/keyword.json (category_group_code=SW8)
    - 좌표 -> 경로     : GET /v2/routing/publictraffic

주의: REST API 키는 서버에서만 사용한다. 프론트로 내려보내지 않는다.
"""

from __future__ import annotations

import os
from typing import Any

import httpx
from dotenv import load_dotenv

# backend/.env 를 읽어 환경변수로 올린다.
# 이 파일 기준으로 경로를 잡아야 어느 디렉터리에서 실행하든 동작한다.
from pathlib import Path
load_dotenv(Path(__file__).resolve().parent / ".env")
KAKAO_API_BASE = "https://dapi.kakao.com"
SUBWAY_CATEGORY_CODE = "SW8"  # 카카오 로컬 카테고리 그룹 코드: 지하철역

_TIMEOUT = httpx.Timeout(10.0, connect=5.0)

# 모듈 전역 클라이언트. main.py의 lifespan에서 init/close 한다.
_client: httpx.AsyncClient | None = None


class RouteError(Exception):
    """경로 조회 실패. main.py에서 잡아 HTTP 에러로 변환한다."""

    def __init__(self, message: str, *, not_found: bool = False) -> None:
        super().__init__(message)
        self.not_found = not_found


# --------------------------------------------------------------------------
# 클라이언트 수명주기
# --------------------------------------------------------------------------


def init_client() -> None:
    """앱 시작 시 1회 호출. 매 요청마다 새 클라이언트를 만들지 않기 위함."""
    global _client

    api_key = os.getenv("KAKAO_REST_API_KEY")
    if not api_key:
        raise RuntimeError(
            "KAKAO_REST_API_KEY 환경변수가 없습니다. backend/.env를 확인하세요."
        )

    _client = httpx.AsyncClient(
        base_url=KAKAO_API_BASE,
        timeout=_TIMEOUT,
        headers={"Authorization": f"KakaoAK {api_key}"},
    )


async def close_client() -> None:
    """앱 종료 시 호출."""
    global _client
    if _client is not None:
        await _client.aclose()
        _client = None


def _get_client() -> httpx.AsyncClient:
    if _client is None:
        raise RouteError("route_service가 초기화되지 않았습니다. init_client()를 먼저 호출하세요.")
    return _client


async def _get(path: str, params: dict[str, Any]) -> dict[str, Any]:
    try:
        res = await _get_client().get(path, params=params)
    except httpx.RequestError as exc:
        raise RouteError(f"카카오 API 연결 실패: {exc}") from exc

    if res.status_code == 401:
        raise RouteError("카카오 인증 실패. REST API 키를 확인하세요.")
    if res.status_code == 429:
        raise RouteError("카카오 API 쿼터를 초과했습니다.")
    if res.status_code >= 400:
        raise RouteError(f"카카오 API 오류({res.status_code}): {res.text[:200]}")

    return res.json()


# --------------------------------------------------------------------------
# 1단계: 역 이름 -> 좌표
# --------------------------------------------------------------------------


async def search_stations(query: str, size: int = 5) -> list[dict[str, Any]]:
    """
    역 이름으로 지하철역 후보를 검색한다.
    3번 프론트의 자동완성 입력창에서 쓴다.

    반환: [{"name": "강남역 2호선", "x": 127.02, "y": 37.49, "address": "..."}]
    """
    query = query.strip()
    if not query:
        return []

    data = await _get(
        "/v2/local/search/keyword.json",
        {"query": query, "category_group_code": SUBWAY_CATEGORY_CODE, "size": size},
    )

    results: list[dict[str, Any]] = []
    for doc in data.get("documents", []):
        try:
            results.append(
                {
                    "name": doc.get("place_name", ""),
                    "x": float(doc["x"]),
                    "y": float(doc["y"]),
                    "address": doc.get("road_address_name") or doc.get("address_name", ""),
                }
            )
        except (KeyError, TypeError, ValueError):
            continue
    return results


async def _resolve(query: str) -> dict[str, Any]:
    """검색 결과 첫 번째를 좌표로 확정한다."""
    found = await search_stations(query, size=1)
    if not found:
        raise RouteError(f"'{query}' 역을 찾지 못했습니다.", not_found=True)
    return found[0]


# --------------------------------------------------------------------------
# 2단계: 좌표 -> 경로
# --------------------------------------------------------------------------


async def get_route(start: str, destination: str) -> dict[str, Any]:
    """
    ★ 팀 계약 함수 ★

    출발역/도착역 이름을 받아 가장 빠른 경로 하나를 반환한다.

        {
            "stations": ["고려대", "보문", "신당", "강남"],
            "duration": 38,
            "transfers": 1
        }

    2번은 여기서 나온 "stations"와 현재 시각으로 혼잡도를 계산하고,
    3번은 "stations"를 세로 타임라인으로 그린다.
    """
    routes = await get_routes(start, destination, limit=1)
    if not routes:
        raise RouteError("해당 구간의 경로를 찾지 못했습니다.", not_found=True)
    return routes[0]


async def get_routes(
    start: str,
    destination: str,
    *,
    limit: int = 3,
    subway_only: bool = True,
) -> list[dict[str, Any]]:
    """
    경로 후보를 소요시간 오름차순(빠른 순)으로 여러 개 반환한다.

    get_route()는 이 함수의 첫 번째 결과다.
    "다른 경로로 가면 리워드가 더 많다"를 보여주려면 이쪽을 쓴다.
    """
    s = await _resolve(start)
    d = await _resolve(destination)

    if s["x"] == d["x"] and s["y"] == d["y"]:
        raise RouteError("출발역과 도착역이 같습니다.", not_found=True)

    data = await _get(
        "/v2/routing/publictraffic",
        {
            "start_x": s["x"],
            "start_y": s["y"],
            "s_name": s["name"],
            "end_x": d["x"],
            "end_y": d["y"],
            "e_name": d["name"],
        },
    )

    status = data.get("status")
    if status != "OK":
        raise RouteError(_status_message(status), not_found=(status == "NO_RESULTS"))

    parsed = [_parse_route(raw) for raw in data.get("routes", [])]

    if subway_only:
        # 지하철역 리워드 서비스이므로 지하철이 포함된 경로만 남긴다.
        subway = [r for r in parsed if r["stations"]]
        if subway:
            parsed = subway

    parsed.sort(key=lambda r: r["duration"])
    return parsed[:limit]


# --------------------------------------------------------------------------
# 응답 파싱
# --------------------------------------------------------------------------


def _parse_route(raw: dict[str, Any]) -> dict[str, Any]:
    """
    카카오 응답 한 건을 팀 계약 형태로 줄인다.

    카카오 원본은 도보/버스/지하철 step이 섞여 있고 좌표 배열까지 들어 있어
    그대로 프론트에 넘기면 너무 무겁다. 필요한 것만 뽑는다.
    """
    props = raw.get("properties", {})
    fare = props.get("fare") or {}

    stations: list[str] = []
    seen: set[str] = set()
    path_points: list[list[float]] = []
    lines: list[str] = []

    for step in raw.get("steps", []):
        sp = step.get("properties", {})
        step_type = sp.get("type")

        # 지도에 경로선을 그리기 위한 좌표 (3번이 사용)
        path_points.extend(step.get("path", {}).get("points", []))

        if step_type != "SUBWAY":
            continue

        for vehicle in sp.get("vehicles", []):
            name = vehicle.get("name")
            if name and name not in lines:
                lines.append(name)

        for stop in sp.get("stops", []):
            name = normalize_station(stop.get("name", ""))
            if name and name not in seen:
                seen.add(name)
                stations.append(name)

    total_time_sec = int(props.get("totalTime", 0))

    return {
        # --- 팀 계약 필드 ---
        "stations": stations,
        "duration": round(total_time_sec / 60),  # 분
        "transfers": int(props.get("transfers", 0)),
        # --- 부가 필드 (있으면 쓰고, 없어도 되는 것들) ---
        "type": props.get("type", ""),
        "distance": int(props.get("totalDistance", 0)),  # 미터
        "fare": int(fare.get("value", 0)),  # 원
        "lines": lines,
        "path": path_points,
    }


def normalize_station(name: str) -> str:
    """
    '강남역 2호선', '강남역' -> '강남'

    2번의 혼잡도 CSV와 역 이름 표기를 맞추기 위한 함수.
    2번도 이 함수를 import해서 쓰면 양쪽 키가 어긋나지 않는다.
    """
    cleaned = name.strip()

    # '강남역 2호선' 같이 뒤에 노선명이 붙는 경우 잘라낸다
    for marker in ("역 ", " ", "("):
        if marker in cleaned:
            cleaned = cleaned.split(marker)[0]
            break

    if cleaned.endswith("역") and len(cleaned) > 1:
        cleaned = cleaned[:-1]

    return cleaned.strip()


def _status_message(status: str | None) -> str:
    return {
        "STARTNODES_NULL": "출발지 주변에서 정류장을 찾지 못했습니다.",
        "ENDNODES_NULL": "도착지 주변에서 정류장을 찾지 못했습니다.",
        "EQUAL_POINTS": "출발지와 도착지가 동일합니다.",
        "INVALID_REQUEST": "잘못된 요청입니다. 좌표값을 확인하세요.",
        "NO_RESULTS": "해당 구간의 대중교통 경로가 없습니다.",
    }.get(status or "", f"경로 조회 실패 (status={status})")


# --------------------------------------------------------------------------
# 단독 실행 확인용
#   python route_service.py 고려대역 강남역
#   -> 1번의 "완료 기준"이 바로 이것
# --------------------------------------------------------------------------

if __name__ == "__main__":
    import asyncio
    import json
    import sys

    async def _main() -> None:
        start = sys.argv[1] if len(sys.argv) > 1 else "고려대역"
        dest = sys.argv[2] if len(sys.argv) > 2 else "강남역"

        init_client()
        try:
            result = await get_route(start, dest)
            # path는 좌표가 수백 개라 터미널 확인 시 제외
            preview = {k: v for k, v in result.items() if k != "path"}
            print(f"\n{start} → {dest}")
            print(json.dumps(preview, ensure_ascii=False, indent=2))
            print(f"\n경유 역 {len(result['stations'])}개, 경로 좌표 {len(result['path'])}개")
        except RouteError as exc:
            print(f"[실패] {exc}")
        finally:
            await close_client()

    asyncio.run(_main())