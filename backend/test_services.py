"""
2번 역할 전체 검증.

    python backend/test_services.py

pytest 없이 그냥 실행된다. 통과하면 exit code 0.
1번/3번과 합치기 전에 한 번, 합친 뒤에 한 번 돌려볼 것.
"""
import sys
import traceback

import congestion_service as cs
import reward_service as rs
import level_service as ls
import agent_service as ag

PASS, FAIL = [], []


def check(name, fn):
    try:
        fn()
        PASS.append(name)
        print(f"  PASS  {name}")
    except AssertionError as e:
        FAIL.append((name, str(e)))
        print(f"  FAIL  {name}\n        {e}")
    except Exception:
        FAIL.append((name, traceback.format_exc(limit=1)))
        print(f"  ERROR {name}\n{traceback.format_exc()}")


# 테스트용 경로: 사당 -> 왕십리, 2호선 우회 vs 4+5호선 도심 관통
ROUTE_2 = ["사당", "방배", "서초", "교대", "강남", "역삼", "선릉", "삼성", "종합운동장",
           "잠실새내", "잠실", "잠실나루", "강변", "구의", "건대입구", "성수", "뚝섬",
           "한양대", "왕십리"]
ROUTE_45 = ["사당", "총신대입구", "동작", "이촌", "신용산", "삼각지", "숙대입구", "서울",
            "회현", "명동", "충무로", "동대문역사문화공원", "청구", "신금호", "행당", "왕십리"]

COMMUTE = ["신림", "봉천", "서울대입구", "낙성대", "사당", "방배", "서초", "교대", "강남"]


# --------------------------------------------------------------- 데이터
def t_data_loads():
    c = cs.get_congestion(["강남", "역삼"], 8, "평일")
    assert 0 <= c["score"] <= 100, f"점수 범위 이탈: {c['score']}"


def t_station_name_variants():
    """'강남역' '강남' '교대(법원.검찰청)' 전부 같은 역으로 인식돼야 한다."""
    a = cs.get_congestion(["강남역", "교대역"], 8, "평일")["score"]
    b = cs.get_congestion(["강남", "교대"], 8, "평일")["score"]
    c = cs.get_congestion(["강남", "교대(법원.검찰청)"], 8, "평일")["score"]
    assert a == b == c, f"역명 정규화 실패: {a} {b} {c}"


def t_unknown_station_no_crash():
    c = cs.get_congestion(["없는역A", "없는역B"], 8, "평일")
    assert 0 <= c["score"] <= 100


# --------------------------------------------------------------- 혼잡도
def t_morning_peak_is_high():
    """출근 시간 신림->강남은 붐벼야 한다."""
    s = cs.get_congestion(COMMUTE, 8, "평일")["score"]
    assert s >= 70, f"08시 신림->강남 혼잡도가 {s}로 낮다"


def t_midday_is_low():
    s = cs.get_congestion(COMMUTE, 13, "평일")["score"]
    assert s < 50, f"13시 혼잡도가 {s}로 높다"


def t_direction_matters():
    """같은 구간이라도 출근 방향과 역방향의 혼잡도가 달라야 한다."""
    fwd = cs.get_congestion(COMMUTE, 8, "평일")["score"]
    rev = cs.get_congestion(list(reversed(COMMUTE)), 8, "평일")["score"]
    assert fwd - rev >= 20, f"방향 구분 실패: 정방향 {fwd}, 역방향 {rev}"


def t_direction_flips_in_evening():
    """퇴근 시간에는 방향이 뒤집혀야 한다."""
    fwd = cs.get_congestion(COMMUTE, 18, "평일")["score"]
    rev = cs.get_congestion(list(reversed(COMMUTE)), 18, "평일")["score"]
    assert rev - fwd >= 20, f"저녁 방향 반전 실패: 정방향 {fwd}, 역방향 {rev}"


# --------------------------------------------------------------- 시간대 보너스
def t_bonus_windows():
    for t in ["05:30", "05:45", "09:00", "09:59", "16:30", "19:00"]:
        assert rs.is_bonus_time(t), f"{t} 는 보너스 시간대여야 한다"
    for t in ["05:29", "06:30", "08:30", "10:00", "18:00", "20:00"]:
        assert not rs.is_bonus_time(t), f"{t} 는 보너스 시간대가 아니어야 한다"


def t_next_window():
    assert rs.next_bonus_window("08:30") == "09:00"
    assert rs.next_bonus_window("17:00") == "19:00"
    assert rs.next_bonus_window("21:00") is None


# --------------------------------------------------------------- 리워드
def t_station_points():
    r = rs.calculate_reward(["a", "b", "c", "d", "e"], "08:30")
    assert r["reward"] == 40, f"4개 역 이동은 40P여야 한다. 실제 {r['reward']}"


def t_bonus_added():
    off = rs.calculate_reward(["a"] * 5, "08:30")["reward"]
    on = rs.calculate_reward(["a"] * 5, "09:20")["reward"]
    assert on - off == rs.OFFPEAK_BONUS, f"시간대 보너스 {on - off}P"


def t_rank_bonus_table():
    for i, want in enumerate([50, 25, 10, 0]):
        r = rs.calculate_reward(["a", "b"], "08:30", rank=i, candidate_count=4)
        assert r["reward"] == 10 + want, f"{i + 1}위 보너스 오류: {r['reward']}"


def t_rank_bonus_truncated():
    """후보가 2개면 50/25 만 쓴다."""
    r0 = rs.calculate_reward(["a", "b"], "08:30", rank=0, candidate_count=2)
    r1 = rs.calculate_reward(["a", "b"], "08:30", rank=1, candidate_count=2)
    assert r0["reward"] == 60 and r1["reward"] == 35, f"{r0['reward']} {r1['reward']}"


def t_less_crowded_always_wins():
    """핵심 불변식. 한산한 경로가 항상 더 많은 포인트를 받아야 한다."""
    for t in ["08:30", "09:20", "18:00", "19:30"]:
        routes = rs.rank_routes([ROUTE_2, ROUTE_45], t, "평일")
        scores = [r["congestion"]["score"] for r in routes]
        rewards = [r["reward"] for r in routes]
        assert scores == sorted(scores), f"{t}: 혼잡도 정렬 실패 {scores}"
        assert rewards[0] > rewards[-1], \
            f"{t}: 한산한 경로가 손해다. 혼잡도 {scores} -> 포인트 {rewards}"


def t_long_route_not_favored():
    """역이 많다고 더 받으면 안 된다(EQUALIZE_DISTANCE)."""
    routes = rs.rank_routes([ROUTE_2, ROUTE_45], "08:30", "평일")
    longer = max(routes, key=lambda r: len(r["stations"]))
    shorter = min(routes, key=lambda r: len(r["stations"]))
    assert longer["reward"] <= shorter["reward"], \
        f"긴 경로가 더 받는다: {longer['reward']} vs {shorter['reward']}"


def t_repeat_allowed():
    """같은 구간을 두 번 타도 보너스가 그대로 나와야 한다."""
    a = rs.calculate_reward(["a"] * 13, "09:20", rank=0, candidate_count=3)
    b = rs.calculate_reward(["a"] * 13, "09:20", rank=0, candidate_count=3)
    assert a["reward"] == b["reward"] == 200, f"{a['reward']} {b['reward']}"


def t_daily_cap():
    r = rs.calculate_reward(["a"] * 13, "09:20", rank=0, candidate_count=3)
    assert rs.apply_daily_cap(r, 0)["reward"] == 200
    assert rs.apply_daily_cap(r, 450)["reward"] == 50
    assert rs.apply_daily_cap(r, 500)["reward"] == 0
    assert rs.apply_daily_cap(r, 9999)["reward"] == 0


# --------------------------------------------------------------- 레벨
def t_level_thresholds():
    assert ls.get_level(0)["level"] == 1
    assert ls.get_level(3499)["level"] == 1
    assert ls.get_level(3500)["level"] == 2
    assert ls.get_level(999999)["level"] == ls.MAX_LEVEL


def t_level_progress():
    s = ls.get_level(0)
    assert s["progress"] == 0
    s = ls.get_level(ls.LEVEL_TABLE[1][1] - 1)
    assert 95 <= s["progress"] <= 100, f"진행률 {s['progress']}"


def t_level_pace():
    """Lv.10 까지 8~12개월 사이여야 한다."""
    months = ls.LEVEL_TABLE[-1][1] / ls.MONTHLY_POINTS
    assert 8 <= months <= 12, f"Lv.10 도달 {months:.1f}개월"


def t_levelup_detection():
    assert ls.check_levelup(3400, 3600)["to"] == 2
    assert ls.check_levelup(3600, 3700) is None


# --------------------------------------------------------------- 통합
def t_analyze_trip_shape():
    r = ag.analyze_trip([ROUTE_2, ROUTE_45], "09:20",
                        total_points=3400, daytype="평일")
    for k in ("routes", "recommended", "reward", "reward_breakdown",
              "recommendation", "level", "levelup", "bonus_windows"):
        assert k in r, f"응답에 {k} 가 없다"
    assert r["routes"][0]["recommended"] is True
    assert isinstance(r["recommendation"], str) and len(r["recommendation"]) > 10


def t_analyze_trip_empty():
    assert "error" in ag.analyze_trip([], "09:20")


def t_json_serializable():
    """1번이 FastAPI 로 그대로 반환할 수 있어야 한다."""
    import json
    r = ag.analyze_trip([ROUTE_2, ROUTE_45], "09:20", 3400, daytype="평일")
    json.dumps(r, ensure_ascii=False)


TESTS = [
    ("데이터 로딩", t_data_loads),
    ("역명 표기 변형", t_station_name_variants),
    ("없는 역 처리", t_unknown_station_no_crash),
    ("출근 피크 = 높음", t_morning_peak_is_high),
    ("낮 시간 = 낮음", t_midday_is_low),
    ("방향 구분", t_direction_matters),
    ("저녁 방향 반전", t_direction_flips_in_evening),
    ("보너스 시간대 경계", t_bonus_windows),
    ("다음 보너스 시간", t_next_window),
    ("역당 10P", t_station_points),
    ("시간대 보너스 30P", t_bonus_added),
    ("순위 보너스 50/25/10/0", t_rank_bonus_table),
    ("후보 수에 따른 절단", t_rank_bonus_truncated),
    ("한산한 경로가 항상 이득", t_less_crowded_always_wins),
    ("긴 경로 우대 없음", t_long_route_not_favored),
    ("반복 이용 허용", t_repeat_allowed),
    ("일일 상한", t_daily_cap),
    ("레벨 경계값", t_level_thresholds),
    ("레벨 진행률", t_level_progress),
    ("레벨 속도 8~12개월", t_level_pace),
    ("레벨업 감지", t_levelup_detection),
    ("analyze_trip 응답 형식", t_analyze_trip_shape),
    ("빈 후보 처리", t_analyze_trip_empty),
    ("JSON 직렬화", t_json_serializable),
]

if __name__ == "__main__":
    print(f"테스트 {len(TESTS)}개\n")
    for name, fn in TESTS:
        check(name, fn)
    print(f"\n통과 {len(PASS)} / 실패 {len(FAIL)}")
    if FAIL:
        print("\n실패 항목:")
        for n, e in FAIL:
            print(f"  - {n}")
    sys.exit(1 if FAIL else 0)
