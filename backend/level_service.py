"""
레벨 시스템. 누적 리워드 -> 레벨.

[설계 기준]
전형적 통근(편도 12역, 왕복 2회, 평일 22일) 기준 월 획득량은 약 7,300P.
이 값을 MONTHLY_POINTS 로 놓고, 레벨업 1회당 평균 1개월이 걸리도록 맞췄다.

Lv.10 까지 누적 68,000P = 약 9.3개월.

[곡선]
초반은 빠르고 후반은 느리다.
Lv.2 는 약 2주면 도달해서 사용자가 시스템을 일찍 이해하게 하고,
Lv.10 은 약 6주가 걸려 장기 목표로 남는다.

[튜닝]
MONTHLY_POINTS 하나만 바꾸면 전체 곡선이 같이 움직인다.
리워드 상수를 손봤다면 이 값도 다시 재야 한다.
"""

MAX_LEVEL = 10
MONTHLY_POINTS = 7000          # 평균 사용자의 월 획득량

# 레벨업 1회에 걸리는 개월 수. 길이는 MAX_LEVEL - 1.
LEVEL_MONTHS = [0.5, 0.7, 0.85, 1.0, 1.1, 1.2, 1.3, 1.45, 1.6]

LEVEL_TITLES = [
    "첫 승차", "정기권", "노선 탐험가", "환승의 달인", "출근길 개척자",
    "한산한 길잡이", "지하철 통근왕", "노선 수집가", "숨은 경로 마스터", "지하철의 주인",
]


def _build_table():
    """[(레벨, 누적필요P, 해당레벨구간P)] 생성."""
    table, cum = [(1, 0, 0)], 0
    for i, months in enumerate(LEVEL_MONTHS[:MAX_LEVEL - 1]):
        need = int(round(MONTHLY_POINTS * months / 100.0)) * 100
        cum += need
        table.append((i + 2, cum, need))
    return table


LEVEL_TABLE = _build_table()


def get_level(total_points: int) -> dict:
    """
    total_points: 사용자의 누적 리워드
    반환: 레벨, 칭호, 다음 레벨까지 남은 포인트, 진행률(0~100)
    """
    total = max(0, int(total_points or 0))

    level, level_start = 1, 0
    for lv, cum, _ in LEVEL_TABLE:
        if total >= cum:
            level, level_start = lv, cum
        else:
            break

    if level >= MAX_LEVEL:
        return {
            "level": MAX_LEVEL,
            "title": LEVEL_TITLES[MAX_LEVEL - 1],
            "total_points": total,
            "current": 0,
            "required": 0,
            "remaining": 0,
            "progress": 100,
            "is_max": True,
        }

    next_cum = LEVEL_TABLE[level][1]
    required = next_cum - level_start
    current = total - level_start

    return {
        "level": level,
        "title": LEVEL_TITLES[level - 1],
        "total_points": total,
        "current": current,
        "required": required,
        "remaining": next_cum - total,
        "progress": round(current / required * 100) if required else 100,
        "is_max": False,
    }


def check_levelup(before: int, after: int) -> dict | None:
    """
    포인트 적립 전후를 비교해 레벨업 여부 판정.
    결과 화면에서 레벨업 연출을 띄울지 결정할 때 쓴다.
    """
    a, b = get_level(before), get_level(after)
    if b["level"] <= a["level"]:
        return None
    return {
        "from": a["level"],
        "to": b["level"],
        "title": b["title"],
        "is_max": b["is_max"],
    }


if __name__ == "__main__":
    print(f"기준 월 획득량 {MONTHLY_POINTS:,}P\n")
    print(f"{'Lv':>3} {'칭호':<12} {'구간P':>8} {'누적P':>9} {'소요':>7}")
    total_months = 0.0
    for lv, cum, need in LEVEL_TABLE:
        m = need / MONTHLY_POINTS
        total_months += m
        span = f"{m * 30:.0f}일" if need else "-"
        print(f"{lv:>3} {LEVEL_TITLES[lv - 1]:<12} {need:>8,} {cum:>9,} {span:>7}")
    print(f"\nLv.{MAX_LEVEL} 도달까지 약 {total_months:.1f}개월")

    print("\n[진행 상태 예시]")
    for p in (0, 2000, 3500, 15000, 40000, 68000, 90000):
        s = get_level(p)
        bar = "█" * (s["progress"] // 5)
        print(f"  {p:>6,}P  Lv.{s['level']:<2} {s['title']:<12} "
              f"{bar:<20} {s['progress']:>3}%  다음까지 {s['remaining']:,}P")

    print("\n[레벨업 판정]", check_levelup(3400, 3600))
