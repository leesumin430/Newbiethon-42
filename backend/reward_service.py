"""
리워드 계산. 2번 역할의 최종 산출물.
전부 고정 규칙이다. AI 를 쓰지 않는다.

[지급 규칙]
  1. 이동 보상    이동한 역 1개당 10P          (4개 역 이동 -> 40P)
  2. 시간대 보상  아래 4개 구간에 출발하면 +30P
                    05:30-06:30 / 09:00-10:00 / 16:00-17:00 / 19:00-20:00
  3. 경로 보상    후보 경로를 혼잡도 낮은 순으로 정렬해 순위별 지급
                    1위 50P / 2위 25P / 3위 10P / 4위 0P
                    후보가 3개면 50/25/10, 2개면 50/25 만 쓴다.

  같은 구간을 여러 번 타도 보너스는 매번 지급된다. 일일 상한 500P 만 적용.

[1번이 쓰는 함수]
  rank_routes(candidates, time)  여러 후보 경로 -> 혼잡도순 정렬 + 리워드
  calculate_reward(...)          경로 하나에 대한 리워드
"""
from datetime import datetime

import congestion_service as cs

POINT_PER_STATION = 10
OFFPEAK_BONUS = 30              # 비혼잡 시간대 출발
RANK_BONUS = [50, 25, 10, 0]    # 혼잡도 낮은 순 1~4위

DAILY_CAP = 500                 # 하루 획득 상한

# 같은 출발지-목적지면 이동 보상을 동일하게 준다.
#
# 끄면(False) 역을 많이 지나는 경로가 더 많은 포인트를 받는다.
# 사당->왕십리 예: 2호선 18개역(혼잡도 76) 185P vs 4+5호선 15개역(혼잡도 33) 160P.
# 붐비는 경로가 25P 더 받게 되어 혼잡도 분산이라는 목적이 뒤집힌다.
# 켜면 후보 중 최소 역 수를 공통 기준으로 써서 순위 보너스만으로 승부가 난다.
EQUALIZE_DISTANCE = True

# 추가 점수를 주는 시간대 (시, 분) ~ (시, 분)
BONUS_WINDOWS = [
    ((5, 30), (6, 30)),
    ((9, 0), (10, 0)),
    ((16, 0), (17, 0)),
    ((19, 0), (20, 0)),
]


def _to_minutes(t) -> int:
    """'08:30' / datetime / 8 / None(현재) -> 자정 기준 분."""
    if t is None:
        n = datetime.now()
        return n.hour * 60 + n.minute
    if isinstance(t, datetime):
        return t.hour * 60 + t.minute
    if isinstance(t, int):
        return t * 60
    s = str(t)
    if ":" in s:
        h, m = s.split(":")[:2]
        return int(h) * 60 + int(m)
    return int(s) * 60


def is_bonus_time(t=None) -> bool:
    m = _to_minutes(t)
    return any(sh * 60 + sm <= m < eh * 60 + em
               for (sh, sm), (eh, em) in BONUS_WINDOWS)


def bonus_windows_text() -> str:
    return " / ".join(f"{sh:02d}:{sm:02d}-{eh:02d}:{em:02d}"
                      for (sh, sm), (eh, em) in BONUS_WINDOWS)


def next_bonus_window(t=None) -> str | None:
    """다음 보너스 시간대 시작 시각. 안내 문구에 쓴다."""
    m = _to_minutes(t)
    for s in sorted(sh * 60 + sm for (sh, sm), _ in BONUS_WINDOWS):
        if s > m:
            return f"{s // 60:02d}:{s % 60:02d}"
    return None


def calculate_reward(stations, time=None, rank: int | None = None,
                     candidate_count: int = 1,
                     base_stations: int | None = None) -> dict:
    """
    stations        : 경로의 역 이름 리스트 (1번이 준 것)
    time            : 출발 시각. '08:30' / datetime / 8 / None(현재)
    rank            : 후보 경로 중 혼잡도 순위. 0부터 센다. None 이면 경로 보상 없음.
    candidate_count : 후보 경로 총 개수
    base_stations   : 이동 보상 기준 역 수. rank_routes 가 후보 중 최소값을 넣는다.
    """
    stations = [s for s in (stations or []) if s]
    actual = max(0, len(stations) - 1)
    moved = base_stations if base_stations is not None else actual

    breakdown = [{"label": f"이동 {moved}개 역", "point": POINT_PER_STATION * moved}]

    if is_bonus_time(time):
        breakdown.append({"label": "비혼잡 시간대", "point": OFFPEAK_BONUS})

    if rank is not None and candidate_count > 1:
        usable = RANK_BONUS[:min(candidate_count, len(RANK_BONUS))]
        breakdown.append({
            "label": f"한산한 경로 {rank + 1}위/{candidate_count}",
            "point": usable[rank] if rank < len(usable) else 0,
        })

    breakdown = [b for b in breakdown if b["point"] > 0]
    return {
        "reward": sum(b["point"] for b in breakdown),
        "breakdown": breakdown,
        "moved_stations": actual,
        "paid_stations": moved,
        "bonus_time": is_bonus_time(time),
    }


def rank_routes(candidates, time=None, daytype=None) -> list[dict]:
    """
    1번이 만든 후보 경로들을 혼잡도 낮은 순으로 정렬하고 리워드를 붙인다.

    candidates: [["신림","봉천",...], [...]]              역 리스트들
             또는 [{"stations":[...], "duration":38}, ...]  (다른 키는 그대로 보존)

    반환: 혼잡도 오름차순 리스트. 각 항목에 congestion / rank / reward 가 추가된다.
    """
    if not candidates:
        return []

    hour = _to_minutes(time) // 60
    dt = daytype or cs.today_daytype()

    items = []
    for c in candidates:
        route = dict(c) if isinstance(c, dict) else {"stations": list(c)}
        cong = cs.get_congestion(route["stations"], hour, dt)
        route["congestion"] = {
            "score": cong["score"],
            "level": cong["level"],
            "worst_segment": cong.get("worst_segment"),
        }
        items.append(route)

    items.sort(key=lambda r: r["congestion"]["score"])

    n = len(items)
    base = (min(len(r["stations"]) - 1 for r in items)
            if EQUALIZE_DISTANCE else None)

    for i, r in enumerate(items):
        r["rank"] = i + 1
        res = calculate_reward(r["stations"], time, rank=i,
                               candidate_count=n, base_stations=base)
        r["reward"] = res["reward"]
        r["reward_breakdown"] = res["breakdown"]
        r["recommended"] = (i == 0)

    return items


def apply_daily_cap(result: dict, today_earned: int = 0) -> dict:
    """
    일일 상한 적용. 상태를 갖지 않으므로 1번이 오늘자 누적액을 넘겨준다.

    today_earned : 오늘 이미 적립한 포인트 합계

    같은 구간을 반복해도 보너스는 그대로 지급된다.
    왕복 통근이 정상 사용 패턴이므로 반복 자체를 막지 않는다.
    무제한 적립만 DAILY_CAP 으로 잘라낸다.
    """
    out = dict(result)
    # calculate_reward 는 "breakdown", rank_routes 는 "reward_breakdown" 으로 담는다.
    key = "breakdown" if "breakdown" in out else "reward_breakdown"
    breakdown = list(out.get(key, []))
    total = sum(b["point"] for b in breakdown)

    remaining = max(0, DAILY_CAP - today_earned)
    if total > remaining:
        breakdown.append({"label": f"일일 한도 {DAILY_CAP}P 초과",
                          "point": remaining - total})
        total = remaining
        out["capped"] = True

    out[key] = breakdown
    out["reward"] = total
    return out


if __name__ == "__main__":
    print("보너스 시간대:", bonus_windows_text())
    for t in ["05:45", "08:30", "09:20", "16:10", "18:00", "19:30"]:
        print(f"  {t}  {'O' if is_bonus_time(t) else 'X'}")

    # 신림 -> 종로3가 : 2호선+1호선 / 2호선+5호선
    a = ["신림", "신대방", "구로디지털단지", "대림", "신도림", "문래", "영등포구청",
         "당산", "합정", "홍대입구", "신촌", "이대", "아현", "충정로", "시청",
         "종각", "종로3가"]
    b = ["신림", "신대방", "구로디지털단지", "대림", "신도림", "문래", "영등포구청",
         "당산", "합정", "홍대입구", "신촌", "이대", "아현", "충정로", "서대문",
         "광화문", "종로3가"]

    for t in ["08:30", "09:20"]:
        print(f"\n=== 신림 → 종로3가   {t} ===")
        for r in rank_routes([a, b], t, "평일"):
            c = r["congestion"]
            detail = " + ".join(f"{x['label']} {x['point']}"
                                for x in r["reward_breakdown"])
            print(f"  {r['rank']}위  혼잡도 {c['score']:>3} ({c['level']:<6}) "
                  f"{r['reward']:>3}P   {detail}")