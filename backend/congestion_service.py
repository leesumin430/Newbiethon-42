"""
혼잡도 조회 서비스.

1번(main.py)이 쓰는 함수는 이 세 개다:
    get_congestion(stations, hour, daytype)   경로 혼잡도
    get_hourly_profile(stations, daytype)     시간대별 곡선 (프론트 그래프용)
    find_better_time(stations, hour, daytype) 더 나은 출발 시각

CSV를 읽지 않는다. build_congestion.py 가 만든 JSON만 읽는다.

[혼잡도 점수 0~100의 의미]
  구간 부하 지수를 노선별 최대치로 정규화한 값 × 0.7
  + 역사 혼잡도 백분위 × 0.3
  구간 데이터가 없으면(지선, 환승 구간) 역사 혼잡도로 폴백한다.

[방향성]
  진행 방향과 부하 부호가 반대면 점수가 낮게 나온다.
  역방향 통근이 실제로 한산한 것을 그대로 반영한 것이다.
"""
from pathlib import Path
from datetime import datetime
import json
import re

BASE = Path(__file__).resolve().parent
JSON_PATH = BASE / "data" / "congestion.json"

# 등급 기준 — 해커톤 중간에 바꾸지 말 것
LOW_MAX, MEDIUM_MAX = 40, 70
SEG_WEIGHT = 0.7          # 구간 부하 : 역사 혼잡도 배합비

_DATA = None


def _load():
    global _DATA
    if _DATA is None:
        if not JSON_PATH.exists():
            raise RuntimeError(f"{JSON_PATH} 없음. build_congestion.py 를 먼저 실행할 것.")
        _DATA = json.loads(JSON_PATH.read_text(encoding="utf-8"))
    return _DATA


def norm_station(name) -> str:
    """build_congestion.py 와 동일해야 한다."""
    s = re.sub(r"\(.*?\)", "", str(name)).replace(" ", "").strip()
    if len(s) > 1 and s.endswith("역"):
        s = s[:-1]
    return s


def to_level(score: int) -> str:
    if score < LOW_MAX:
        return "LOW"
    if score < MEDIUM_MAX:
        return "MEDIUM"
    return "HIGH"


def parse_hour(hour=None) -> int:
    if hour is None:
        return datetime.now().hour
    if isinstance(hour, datetime):
        return hour.hour
    if isinstance(hour, int):
        return max(5, min(24, hour))
    m = re.search(r"(\d{1,2})", str(hour))
    return max(5, min(24, int(m.group(1)))) if m else datetime.now().hour


def today_daytype() -> str:
    return "평일" if datetime.now().weekday() < 5 else "주말"


def _station_score(key, hour, daytype) -> int:
    d = _load()["station_score"].get(daytype, {}).get(key)
    return int(d.get(str(hour), 50)) if d else 50


def _pair_score(a, b, hour, daytype):
    """
    인접 두 역 사이 구간의 혼잡도.
    같은 노선에 둘 다 있어야 구간 부하를 쓸 수 있다.
    반환: (score, line, used_segment)
    """
    data = _load()
    idx = data["station_index"]
    ka, kb = norm_station(a), norm_station(b)
    la, lb = idx.get(ka, []), idx.get(kb, [])

    common = [(x["line"], x["no"], y["no"])
              for x in la for y in lb if x["line"] == y["line"]]

    if common:
        line, no_a, no_b = common[0]
        direction = 1 if no_b > no_a else -1
        seg = data["segment"].get(daytype, {}).get(line, {}).get(str(hour), {})
        raw = seg.get(ka)
        seg_max = data["seg_max"].get(line, 0)
        if raw is not None and seg_max > 0:
            # 진행 방향 성분만 취한다. 역방향이면 0에 수렴.
            directional = max(0.0, raw * direction)
            seg_score = min(100.0, directional / seg_max * 100.0)
            st_score = (_station_score(ka, hour, daytype)
                        + _station_score(kb, hour, daytype)) / 2
            score = SEG_WEIGHT * seg_score + (1 - SEG_WEIGHT) * st_score
            return int(round(score)), line, True
        return _station_score(ka, hour, daytype), line, False

    # 환승 구간 등 같은 노선이 없을 때
    return _station_score(ka, hour, daytype), None, False


def get_congestion(stations, hour=None, daytype=None) -> dict:
    """
    stations: 1번이 주는 역 이름 리스트 (순서대로)
    """
    h = parse_hour(hour)
    dt = daytype or today_daytype()
    stations = [s for s in (stations or []) if s]

    if len(stations) < 2:
        s = _station_score(norm_station(stations[0]), h, dt) if stations else 50
        return {"score": s, "level": to_level(s), "hour": h, "daytype": dt,
                "worst_station": stations[0] if stations else None,
                "segments": [], "match_rate": 0.0}

    segs = []
    for a, b in zip(stations, stations[1:]):
        sc, line, used = _pair_score(a, b, h, dt)
        segs.append({"from": a, "to": b, "score": sc,
                     "level": to_level(sc), "line": line, "segment_data": used})

    scores = [s["score"] for s in segs]
    mean, worst = sum(scores) / len(scores), max(scores)
    # 체감 혼잡도는 평균보다 최악 구간에 좌우된다. 6:4로 섞는다.
    score = int(round(mean * 0.6 + worst * 0.4))
    worst_seg = max(segs, key=lambda s: s["score"])

    return {
        "score": score,
        "level": to_level(score),
        "hour": h,
        "daytype": dt,
        "worst_station": worst_seg["from"],
        "worst_segment": f"{worst_seg['from']}→{worst_seg['to']}",
        "segments": segs,
        "match_rate": round(sum(s["segment_data"] for s in segs) / len(segs), 2),
    }


def get_hourly_profile(stations, daytype=None, start=6, end=24) -> dict:
    dt = daytype or today_daytype()
    return {h: get_congestion(stations, h, dt)["score"] for h in range(start, end)}


def peak_score(stations, daytype=None) -> int:
    """이 경로의 하루 중 최대 혼잡도. 분산 보너스의 기준선이 된다."""
    return max(get_hourly_profile(stations, daytype).values())


def find_better_time(stations, hour=None, daytype=None,
                     window=4, min_gain=8) -> dict | None:
    """지금부터 window 시간 안에 유의미하게 나은 시각. 없으면 None."""
    now = parse_hour(hour)
    dt = daytype or today_daytype()
    current = get_congestion(stations, now, dt)["score"]

    best_h, best = None, current
    for h in range(now + 1, min(now + window + 1, 24)):
        s = get_congestion(stations, h, dt)["score"]
        if s < best:
            best_h, best = h, s

    if best_h is None or current - best < min_gain:
        return None
    return {"hour": best_h, "score": best, "level": to_level(best),
            "gain": current - best}


if __name__ == "__main__":
    route = ["신림역", "봉천역", "서울대입구역", "낙성대역", "사당역",
             "방배역", "서초역", "교대역", "강남역"]
    print("경로:", " → ".join(route))
    for h in (8, 11, 18, 22):
        c = get_congestion(route, h, "평일")
        print(f"  {h:>2}시  score={c['score']:>3} {c['level']:<7} "
              f"최혼잡={c['worst_segment']:<12} 구간데이터={c['match_rate']}")

    print("\n[시간대 프로필 · 평일]")
    for h, s in get_hourly_profile(route, "평일").items():
        print(f"  {h:>2}시 {'█' * (s // 4):<25} {s}")

    print("\n[역방향 검증] 강남 → 신림 (같은 구간, 반대 방향)")
    rev = list(reversed(route))
    for h in (8, 18):
        print(f"  {h}시  정방향={get_congestion(route, h, '평일')['score']:>3}  "
              f"역방향={get_congestion(rev, h, '평일')['score']:>3}")

    print("\n[추천]", find_better_time(route, 18, "평일"))
