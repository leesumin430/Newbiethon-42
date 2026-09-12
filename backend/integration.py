"""
integration.py — 1번(main.py)과 2번 서비스를 잇는 어댑터.

main.py 는 아래 세 이름을 기대한다.
    congestion_service.get_congestion(stations, time)   time 은 'HH:MM'
    reward_service.calculate_reward(congestion, route)
    agent_service.recommend(route, congestion)

2번의 실제 함수는 시그니처가 다르다(시각 대신 시(hour) 정수, 경로 순위 인자 등).
main.py 를 고치지 않고 붙이기 위해 이 얇은 층을 둔다.
서로의 파일을 건드리지 않으므로 병합 충돌도 나지 않는다.

main.py 상단 import 를 이렇게 바꾸면 끝난다:
    import integration as congestion_service
    import integration as reward_service
    import integration as agent_service
    HAS_CONGESTION = HAS_REWARD = HAS_AGENT = True
"""
from __future__ import annotations

from typing import Any

import congestion_service as cs
import reward_service as rs
import level_service as ls


def _stations_of(route) -> list:
    """dict / list 어느 쪽이 와도 역 리스트를 꺼낸다."""
    if isinstance(route, dict):
        return route.get("stations") or []
    return list(route or [])


# ---------------------------------------------------------------- 혼잡도
def get_congestion(stations, time=None) -> dict[str, Any]:
    """
    main.py 의 _call_congestion 이 호출한다.
    time: 'HH:MM' 문자열 또는 None(현재 시각)
    """
    hour = rs._to_minutes(time) // 60
    c = cs.get_congestion(_stations_of(stations), hour, cs.today_daytype())
    return {
        "score": c["score"],
        "level": c["level"],
        "hour": c["hour"],
        "daytype": c["daytype"],
        "worst_segment": c.get("worst_segment"),
        # 1.0 이면 전 구간 실데이터, 낮으면 추정값 비중이 크다는 뜻.
        # 0.5 미만이면 화면에 '참고용' 표시를 권장.
        "match_rate": c.get("match_rate", 0.0),
    }


# ---------------------------------------------------------------- 리워드
def calculate_reward(congestion, route, time=None) -> int:
    """
    main.py 의 _call_reward 가 호출한다.
    경로 하나만 들어오므로 순위 보너스는 빠지고 이동 + 시간대 보상만 계산된다.
    순위 보너스까지 받으려면 /api/routes 에서 rank_routes 를 쓸 것.
    """
    when = time
    if when is None and isinstance(congestion, dict) and congestion.get("hour") is not None:
        when = int(congestion["hour"])
    return rs.calculate_reward(_stations_of(route), when)["reward"]


def calculate_reward_detail(congestion, route, time=None) -> dict[str, Any]:
    """포인트 내역까지 필요할 때. 3번 화면의 적립 내역 리스트용."""
    when = time
    if when is None and isinstance(congestion, dict) and congestion.get("hour") is not None:
        when = int(congestion["hour"])
    return rs.calculate_reward(_stations_of(route), when)


# ---------------------------------------------------------------- 추천 문구
def recommend(route, congestion, time=None) -> str:
    """main.py 의 _call_agent 가 호출한다."""
    score = congestion.get("score", 50)
    level = congestion.get("level", "MEDIUM")
    when = time if time is not None else congestion.get("hour")

    if rs.is_bonus_time(when):
        return (f"현재 혼잡도는 {score}({level})이고, "
                f"지금 출발하면 비혼잡 시간대 {rs.OFFPEAK_BONUS}P가 추가됩니다.")

    nxt = rs.next_bonus_window(when)
    tail = f" {nxt}에 출발하면 {rs.OFFPEAK_BONUS}P를 더 받습니다." if nxt else ""

    worst = congestion.get("worst_segment")
    if level == "HIGH" and worst:
        return f"현재 혼잡도 {score}({level})입니다. {worst} 구간이 가장 붐빕니다.{tail}"
    if level == "LOW":
        return f"현재 혼잡도 {score}({level})로 이동하기 좋습니다.{tail}"
    return f"현재 혼잡도는 {score}({level})입니다.{tail}"


# ---------------------------------------------------------------- 경로 비교
def rank_routes(candidates, time=None) -> list[dict[str, Any]]:
    """
    /api/routes 용. 후보 경로를 혼잡도 낮은 순으로 정렬하고
    순위 보너스(50/25/10/0)까지 붙인다.

    candidates: route_service.get_routes() 결과를 그대로 넣으면 된다.
                stations 외의 필드(duration, transfers, lines...)는 보존된다.

    각 항목에 추가되는 키:
        congestion  {"score","level","worst_segment"}
        rank        1위부터
        reward      최종 포인트
        reward_breakdown  적립 내역 리스트
        recommended 1위 여부
    """
    return rs.rank_routes(candidates, time)


# ---------------------------------------------------------------- 레벨
def get_level(total_points: int) -> dict[str, Any]:
    """누적 포인트 -> 레벨/칭호/진행률(0~100). 3번의 프로그레스 바용."""
    return ls.get_level(total_points)


def check_levelup(before: int, after: int):
    """레벨업 했으면 dict, 아니면 None. 결과 화면 연출 여부 판단용."""
    return ls.check_levelup(before, after)


def bonus_windows() -> str:
    """'05:30-06:30 / 09:00-10:00 / ...' 안내 문구용."""
    return rs.bonus_windows_text()


if __name__ == "__main__":
    a = ["사당", "방배", "서초", "교대", "강남", "역삼", "선릉", "삼성", "종합운동장",
         "잠실새내", "잠실", "잠실나루", "강변", "구의", "건대입구", "성수", "뚝섬",
         "한양대", "왕십리"]
    b = ["사당", "총신대입구", "동작", "이촌", "신용산", "삼각지", "숙대입구", "서울",
         "회현", "명동", "충무로", "동대문역사문화공원", "청구", "신금호", "행당", "왕십리"]

    print("[main.py /trip 경로]")
    c = get_congestion(a, "08:30")
    print("  congestion:", c)
    print("  reward    :", calculate_reward(c, {"stations": a}, "08:30"))
    print("  recommend :", recommend({"stations": a}, c, "08:30"))

    print("\n[main.py /api/routes 경로]")
    found = [{"stations": a, "duration": 42, "transfers": 0},
             {"stations": b, "duration": 38, "transfers": 1}]
    for r in rank_routes(found, "08:30"):
        print(f"  {r['rank']}위 혼잡도 {r['congestion']['score']:>3} "
              f"({r['congestion']['level']:<6}) {r['reward']:>3}P  "
              f"소요 {r['duration']}분 환승 {r['transfers']}회")

    print("\n[레벨]", get_level(3600))