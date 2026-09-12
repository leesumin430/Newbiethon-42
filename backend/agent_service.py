"""
추천 문구 생성 + 2번 역할의 통합 진입점.

숫자는 전부 congestion_service / reward_service / level_service 가 정한다.
이 파일은 그 숫자를 사람이 읽을 문장으로 바꾸고, 한 번에 묶어서 넘긴다.

[1번이 쓰는 함수]
    analyze_trip(candidates, time, total_points, today_earned)

[LLM 은 선택 사항]
환경변수 ANTHROPIC_API_KEY 가 있으면 문장을 LLM 이 다듬고,
없거나 호출이 실패하면 규칙 기반 문장이 그대로 나간다.
발표 중 네트워크가 끊겨도 추천 칸이 비지 않게 하려는 것이다.
"""
import os

import congestion_service as cs
import reward_service as rs
import level_service as ls

MODEL = "claude-haiku-4-5-20251001"

SYSTEM = """너는 지하철 이동을 돕는 도우미다.
주어진 데이터만 사용해 한국어 2문장 이내로 안내를 작성한다.
- 숫자를 새로 만들지 마라. 주어진 값만 인용한다.
- 존댓말, 담백한 톤. 이모지 금지.
- 어떤 경로를 왜 추천하는지, 포인트를 더 받으려면 무엇을 하면 되는지 알려준다."""


def _fallback(best, others, time) -> str:
    """LLM 없이도 항상 나오는 규칙 기반 문장."""
    c = best["congestion"]
    lines = "+".join(best.get("lines", [])) if best.get("lines") else None
    label = f"{lines} 경로" if lines else "추천 경로"

    if others:
        gap = others[0]["congestion"]["score"] - c["score"]
        if gap >= 10:
            head = (f"{label}가 대안보다 혼잡도가 {gap}점 낮습니다. "
                    f"이 경로로 가시면 {best['reward']}P를 받습니다.")
        else:
            head = (f"후보 경로들의 혼잡도가 비슷합니다({c['score']} vs "
                    f"{others[0]['congestion']['score']}). "
                    f"{label} 기준 {best['reward']}P입니다.")
    else:
        head = f"현재 혼잡도는 {c['score']}({c['level']})이고 {best['reward']}P를 받습니다."

    if not rs.is_bonus_time(time):
        nxt = rs.next_bonus_window(time)
        if nxt:
            return head + f" {nxt}에 출발하면 {rs.OFFPEAK_BONUS}P를 더 받습니다."

    if c["level"] == "HIGH" and c.get("worst_segment"):
        return head + f" {c['worst_segment']} 구간이 가장 혼잡하니 참고하세요."

    return head


def recommend(best, others, time=None) -> str:
    text = _fallback(best, others, time)
    if not os.environ.get("ANTHROPIC_API_KEY"):
        return text

    try:
        import anthropic

        facts = [f"추천 경로: {' → '.join(best['stations'])}",
                 f"혼잡도: {best['congestion']['score']} ({best['congestion']['level']})",
                 f"받는 포인트: {best['reward']}P"]
        for o in others:
            facts.append(f"대안: 혼잡도 {o['congestion']['score']}, {o['reward']}P")
        if not rs.is_bonus_time(time):
            nxt = rs.next_bonus_window(time)
            if nxt:
                facts.append(f"{nxt}에 출발하면 {rs.OFFPEAK_BONUS}P 추가")

        resp = anthropic.Anthropic().messages.create(
            model=MODEL, max_tokens=200, system=SYSTEM,
            messages=[{"role": "user", "content": "\n".join(facts)}])
        out = "".join(b.text for b in resp.content if b.type == "text").strip()
        return out or text

    except Exception as e:
        print(f"[agent] LLM 실패, 규칙 기반 문장 사용: {e}")
        return text


def analyze_trip(candidates, time=None, total_points: int = 0,
                 today_earned: int = 0, daytype=None) -> dict:
    """
    2번 역할의 단일 진입점. 1번은 이것만 호출하면 된다.

    candidates   : 1번이 만든 후보 경로들
                   [["신림","봉천",...], ...] 또는 [{"stations":[...]}, ...]
    time         : 출발 시각 '09:20' / datetime / 9 / None(현재)
    total_points : 사용자의 기존 누적 포인트
    today_earned : 오늘 이미 적립한 포인트
    """
    routes = rs.rank_routes(candidates, time, daytype)
    if not routes:
        return {"error": "후보 경로가 없습니다."}

    best = rs.apply_daily_cap(routes[0], today_earned)
    routes[0].update(best)

    earned = routes[0]["reward"]
    after = total_points + earned

    return {
        "routes": routes,
        "recommended": routes[0],
        "reward": earned,
        "reward_breakdown": routes[0]["reward_breakdown"],
        "capped": routes[0].get("capped", False),
        "recommendation": recommend(routes[0], routes[1:], time),
        "level": ls.get_level(after),
        "levelup": ls.check_levelup(total_points, after),
        "bonus_windows": rs.bonus_windows_text(),
    }


if __name__ == "__main__":
    a = ["사당", "방배", "서초", "교대", "강남", "역삼", "선릉", "삼성", "종합운동장",
         "잠실새내", "잠실", "잠실나루", "강변", "구의", "건대입구", "성수", "뚝섬",
         "한양대", "왕십리"]
    b = ["사당", "총신대입구", "동작", "이촌", "신용산", "삼각지", "숙대입구", "서울",
         "회현", "명동", "충무로", "동대문역사문화공원", "청구", "신금호", "행당", "왕십리"]

    for t in ["08:30", "09:20"]:
        r = analyze_trip([a, b], t, total_points=3400, daytype="평일")
        print(f"=== 사당 → 왕십리  {t} ===")
        for x in r["routes"]:
            print(f"  {x['rank']}위  혼잡도 {x['congestion']['score']:>3} "
                  f"({x['congestion']['level']:<6}) {x['reward']:>3}P")
        print(f"  추천: {r['recommendation']}")
        print(f"  레벨: Lv.{r['level']['level']} {r['level']['title']} "
              f"({r['level']['progress']}%)  레벨업={r['levelup']}\n")
