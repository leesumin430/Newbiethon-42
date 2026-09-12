"""
route_service.py  —  1번 담당
============================

책임: "어떻게 갈 것인가?"
    출발역 + 목적지  ->  경로(역 목록) / 소요시간 / 환승횟수 / 환승역

팀 계약 (이 형태를 바꾸려면 2번, 3번과 먼저 합의할 것)
-------------------------------------------------------
    get_route("고려대역", "강남역")
    ->
    {
        "stations": ["고려대", "안암", ..., "강남"],   # 전체 경유역
        "duration": 33,                                # 분
        "transfers": 2,                                # 환승 횟수
        "transfer_stations": ["신당", "교대"],          # 갈아탄 역
        "segments": [{"line": "6호선", "from": ..., "to": ..., "stations": [...]}],
        "lines": [...], "fare": 1650, "distance": 15823, "path": [[x, y], ...]
    }

부가 기능
---------
  * 검색 캐시    : 같은 질의를 10분간 재사용해 카카오 호출을 줄인다.
  * 오타 보정    : '사담' -> '사당' 처럼 한 글자 오타를 자모 단위로 잡는다.
  * 후보 제안    : 끝내 못 찾으면 RouteError.suggestions 에 후보를 실어 보낸다.

사용 API: 카카오맵 REST API
    - 역 이름 -> 좌표 : GET /v2/local/search/keyword.json (category_group_code=SW8)
    - 좌표 -> 경로     : GET /v2/routing/publictraffic

주의: REST API 키는 서버에서만 사용한다. 프론트로 내려보내지 않는다.
"""

from __future__ import annotations

import csv
import difflib
import logging
import os
import time
from pathlib import Path
from typing import Any

import httpx
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

logger = logging.getLogger("route_service")

KAKAO_API_BASE = "https://dapi.kakao.com"
SUBWAY_CATEGORY_CODE = "SW8"

_TIMEOUT = httpx.Timeout(10.0, connect=5.0)

_client: httpx.AsyncClient | None = None


class RouteError(Exception):
    """
    경로 조회 실패. main.py에서 잡아 HTTP 에러로 변환한다.

    suggestions: 역을 못 찾았을 때 "혹시 이걸 찾으셨나요?" 후보.
    """

    def __init__(
        self,
        message: str,
        *,
        not_found: bool = False,
        suggestions: list[str] | None = None,
    ) -> None:
        super().__init__(message)
        self.not_found = not_found
        self.suggestions = suggestions or []


# ==========================================================================
# 클라이언트 수명주기
# ==========================================================================


def init_client() -> None:
    """앱 시작 시 1회 호출."""
    global _client

    api_key = os.getenv("KAKAO_REST_API_KEY")
    if not api_key:
        raise RuntimeError(
            "KAKAO_REST_API_KEY 환경변수가 없습니다. backend/.env 를 확인하세요."
        )

    _client = httpx.AsyncClient(
        base_url=KAKAO_API_BASE,
        timeout=_TIMEOUT,
        headers={"Authorization": f"KakaoAK {api_key}"},
    )
    load_station_names()


async def close_client() -> None:
    global _client
    if _client is not None:
        await _client.aclose()
        _client = None


def _get_client() -> httpx.AsyncClient:
    if _client is None:
        raise RouteError(
            "route_service가 초기화되지 않았습니다. init_client()를 먼저 호출하세요."
        )
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


# ==========================================================================
# 한글 자모 분해 — 오타 보정용
# ==========================================================================
#
# '사당'과 '사담'은 음절로 비교하면 절반이 다르지만(유사도 0.5),
# 자모로 풀면 'ㅅㅏㄷㅏㅇ' vs 'ㅅㅏㄷㅏㅁ' 으로 한 글자만 다르다(0.8).
# 2~3글자짜리 짧은 역 이름의 오타를 잡으려면 이 분해가 필요하다.

_CHO = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ"
_JUNG = "ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ"
_JONG = " ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ"


def _to_jamo(text: str) -> str:
    """완성형 한글을 초성/중성/종성으로 분해한다."""
    out: list[str] = []
    for ch in text:
        code = ord(ch)
        if 0xAC00 <= code <= 0xD7A3:
            idx = code - 0xAC00
            out.append(_CHO[idx // 588])
            out.append(_JUNG[(idx % 588) // 28])
            jong = _JONG[idx % 28]
            if jong != " ":
                out.append(jong)
        else:
            out.append(ch)
    return "".join(out)


# ==========================================================================
# 역 이름 사전
# ==========================================================================
#
# 2번의 혼잡도 CSV에서 역 이름을 읽어 오타 보정 사전을 만든다.
# CSV가 없어도 동작한다 — 이 경우 검색에 성공한 이름들이 쌓이면서 사전이 자란다.

_station_names: set[str] = set()
_jamo_index: dict[str, str] = {}  # 자모문자열 -> 원래 이름

_CSV_NAME_COLUMNS = (
    "역명",
    "역이름",
    "지하철역",
    "출발역",
    "station",
    "station_name",
    "name",
)


def _reindex() -> None:
    global _jamo_index
    _jamo_index = {_to_jamo(n): n for n in _station_names}


def add_station_names(names: list[str]) -> None:
    """사전에 역 이름을 추가한다. 검색 성공 시에도 호출된다."""
    changed = False
    for raw in names:
        name = normalize_station(raw)
        if name and name not in _station_names:
            _station_names.add(name)
            changed = True
    if changed:
        _reindex()


def load_station_names(csv_path: str | Path | None = None) -> int:
    """
    2번의 혼잡도 CSV에서 역 이름을 읽어 사전을 채운다.
    파일이 없거나 컬럼을 못 찾아도 조용히 넘어간다(오타 보정만 약해질 뿐).

    반환: 적재된 역 이름 개수
    """
    candidates = (
        [Path(csv_path)]
        if csv_path
        else sorted((BASE_DIR / "data").glob("*.csv"))
    )

    for path in candidates:
        if not path.exists():
            continue
        for encoding in ("utf-8-sig", "cp949", "euc-kr"):
            try:
                with path.open(encoding=encoding, newline="") as fp:
                    reader = csv.DictReader(fp)
                    fields = reader.fieldnames or []
                    column = next(
                        (
                            f
                            for f in fields
                            if f and f.strip() in _CSV_NAME_COLUMNS
                        ),
                        None,
                    )
                    if column is None:
                        break  # 이 파일엔 역명 컬럼이 없다
                    add_station_names([row.get(column, "") for row in reader])
                break
            except (UnicodeDecodeError, csv.Error):
                continue
            except OSError as exc:
                logger.warning("역명 CSV 읽기 실패 %s: %s", path, exc)
                break

    if _station_names:
        logger.info("역 이름 사전 %d개 적재", len(_station_names))
    else:
        logger.info("역 이름 사전 비어 있음 — 검색 결과로 채워집니다")
    return len(_station_names)


def suggest_stations(query: str, limit: int = 3) -> list[str]:
    """
    오타로 보이는 입력에 대해 가장 가까운 역 이름 후보를 돌려준다.
    사전이 비어 있으면 빈 리스트.
    """
    key = normalize_station(query)
    if not key or not _jamo_index:
        return []

    matches = difflib.get_close_matches(
        _to_jamo(key), list(_jamo_index), n=limit, cutoff=0.72
    )
    return [_jamo_index[m] for m in matches]


# ==========================================================================
# 검색 캐시
# ==========================================================================
#
# 자동완성은 타이핑마다 요청이 날아온다. 같은 질의를 10분간 재사용해
# 카카오 쿼터 소모를 줄인다. 역 좌표는 자주 바뀌지 않으므로 안전하다.

_CACHE_TTL_SEC = 600
_CACHE_MAX = 500
_search_cache: dict[str, tuple[float, list[dict[str, Any]]]] = {}


def _cache_get(key: str) -> list[dict[str, Any]] | None:
    hit = _search_cache.get(key)
    if hit is None:
        return None
    stored_at, value = hit
    if time.time() - stored_at > _CACHE_TTL_SEC:
        _search_cache.pop(key, None)
        return None
    return value


def _cache_put(key: str, value: list[dict[str, Any]]) -> None:
    if len(_search_cache) >= _CACHE_MAX:
        # 가장 오래된 것부터 정리
        oldest = sorted(_search_cache.items(), key=lambda kv: kv[1][0])[: _CACHE_MAX // 5]
        for k, _ in oldest:
            _search_cache.pop(k, None)
    _search_cache[key] = (time.time(), value)


def cache_stats() -> dict[str, Any]:
    """디버깅용."""
    return {"entries": len(_search_cache), "station_names": len(_station_names)}


# ==========================================================================
# 1단계: 역 이름 -> 좌표
# ==========================================================================


async def search_stations(query: str, size: int = 5) -> list[dict[str, Any]]:
    """
    역 이름으로 지하철역 후보를 검색한다. 3번의 자동완성 입력창용.

    반환: [{"name": "강남역 2호선", "x": 127.02, "y": 37.49, "address": "..."}]
    """
    query = query.strip()
    if not query:
        return []

    cache_key = f"{query}|{size}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached

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
                    "address": doc.get("road_address_name")
                    or doc.get("address_name", ""),
                }
            )
        except (KeyError, TypeError, ValueError):
            continue

    _cache_put(cache_key, results)
    # 검색에 성공한 이름은 오타 보정 사전에도 넣어둔다.
    add_station_names([r["name"] for r in results])
    return results


async def resolve_station(query: str) -> dict[str, Any]:
    """
    입력 문자열을 실제 역 하나로 확정한다. 오타면 보정을 시도한다.

    반환:
        {
            "query": "사담역",        # 사용자가 친 것
            "matched": "사당",        # 최종 확정된 역
            "corrected": True,        # 보정이 일어났는지
            "name": "사당역 4호선",    # 카카오 표기
            "x": ..., "y": ..., "address": ...
        }

    끝내 못 찾으면 RouteError(not_found=True, suggestions=[...]) 를 던진다.
    """
    query = query.strip()
    if not query:
        raise RouteError("역 이름이 비어 있습니다.", not_found=True)

    # 1) 그대로 검색
    found = await search_stations(query, size=1)
    if found:
        top = found[0]
        return {
            "query": query,
            "matched": normalize_station(top["name"]),
            "corrected": False,
            **top,
        }

    # 2) 오타 보정 후 재검색
    for candidate in suggest_stations(query):
        found = await search_stations(candidate, size=1)
        if found:
            top = found[0]
            logger.info("오타 보정: %s -> %s", query, candidate)
            return {
                "query": query,
                "matched": normalize_station(top["name"]),
                "corrected": True,
                **top,
            }

    # 3) 실패 — 후보를 실어 보낸다
    suggestions = suggest_stations(query)
    message = f"'{query}' 역을 찾지 못했습니다."
    if suggestions:
        message += f" 혹시 {', '.join(suggestions)} 인가요?"
    raise RouteError(message, not_found=True, suggestions=suggestions)


# ==========================================================================
# 2단계: 좌표 -> 경로
# ==========================================================================


async def get_route(start: str, destination: str) -> dict[str, Any]:
    """팀 계약 함수. 가장 빠른 경로 하나를 반환한다."""
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
    """경로 후보를 소요시간 오름차순(빠른 순)으로 반환한다."""
    s = await resolve_station(start)
    d = await resolve_station(destination)

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
        subway = [r for r in parsed if r["stations"]]
        if subway:
            parsed = subway

    parsed.sort(key=lambda r: r["duration"])
    return parsed[:limit]


# ==========================================================================
# 응답 파싱
# ==========================================================================


def _parse_route(raw: dict[str, Any]) -> dict[str, Any]:
    """
    카카오 응답 한 건을 팀 계약 형태로 줄인다.

    카카오는 지하철 구간을 노선별로 나눠 step 배열에 담아준다.
    step 하나 = 노선 하나를 연속으로 타는 구간이므로,
    앞 구간의 마지막 역이 곧 환승역이 된다.

        6호선 [고려대 ... 신당]  <- 신당에서 환승
        3호선 [신당 ... 교대]    <- 교대에서 환승
        2호선 [교대 ... 강남]    <- 마지막 구간이라 환승 없음
    """
    props = raw.get("properties", {})
    fare = props.get("fare") or {}

    segments: list[dict[str, Any]] = []
    path_points: list[list[float]] = []
    lines: list[str] = []

    for step in raw.get("steps", []):
        sp = step.get("properties", {})

        path_points.extend(step.get("path", {}).get("points", []))

        if sp.get("type") != "SUBWAY":
            continue

        line_name = ""
        for vehicle in sp.get("vehicles") or []:
            name = vehicle.get("name")
            if name:
                line_name = name
                if name not in lines:
                    lines.append(name)
                break

        stops: list[str] = []
        for stop in sp.get("stops", []):
            name = normalize_station(stop.get("name", ""))
            if name:
                stops.append(name)

        if not stops:
            continue

        segments.append(
            {
                "line": line_name,
                "from": stops[0],
                "to": stops[-1],
                "stations": stops,
                "count": len(stops),
            }
        )

    # 마지막 구간을 뺀 각 구간의 끝 역이 환승역이다.
    transfer_stations = [seg["to"] for seg in segments[:-1]]

    stations: list[str] = []
    seen: set[str] = set()
    for seg in segments:
        for name in seg["stations"]:
            if name not in seen:
                seen.add(name)
                stations.append(name)

    total_time_sec = int(props.get("totalTime", 0))

    return {
        # --- 팀 계약 필드 ---
        "stations": stations,
        "duration": round(total_time_sec / 60),
        "transfers": int(props.get("transfers", 0)),
        # --- 환승 표시용 ---
        "transfer_stations": transfer_stations,
        "segments": segments,
        # --- 부가 필드 ---
        "type": props.get("type", ""),
        "distance": int(props.get("totalDistance", 0)),
        "fare": int(fare.get("value", 0)),
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


# ==========================================================================
# 단독 실행 확인용
#   python route_service.py                  -> 출발역/도착역을 물어본다
#   python route_service.py 사담역 강남역       -> 오타 보정도 함께 확인
# ==========================================================================

if __name__ == "__main__":
    import asyncio
    import sys

    async def _main() -> None:
        if len(sys.argv) > 2:
            start, dest = sys.argv[1], sys.argv[2]
        else:
            start = input("출발역: ").strip()
            dest = input("도착역: ").strip()

        init_client()
        try:
            s = await resolve_station(start)
            d = await resolve_station(dest)
            for info in (s, d):
                if info["corrected"]:
                    print(f"  [보정] '{info['query']}' -> '{info['matched']}'")

            r = await get_route(s["matched"], d["matched"])

            print(f"\n{s['matched']} → {d['matched']}")
            print(f"  소요 {r['duration']}분 / 환승 {r['transfers']}회 / {r['fare']}원")

            if r["transfer_stations"]:
                print(f"  환승역: {', '.join(r['transfer_stations'])}")
            else:
                print("  환승 없음")

            print("\n  구간")
            for i, seg in enumerate(r["segments"], 1):
                print(
                    f"    {i}. {seg['line']:<6} {seg['from']} → {seg['to']}"
                    f" ({seg['count']}개역)"
                )

            print(f"\n  전체 경유역 {len(r['stations'])}개")
            print(f"  {' - '.join(r['stations'])}")
            print(f"\n  {cache_stats()}")

        except RouteError as exc:
            print(f"[실패] {exc}")
            if exc.suggestions:
                print(f"        후보: {exc.suggestions}")
        finally:
            await close_client()

    asyncio.run(_main())