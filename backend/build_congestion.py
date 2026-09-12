"""
서울교통공사 역별/일별/시간대별 승하차인원 CSV -> congestion.json 전처리.

    python backend/build_congestion.py

한 번만 실행한다. 이후 서비스 코드는 pandas 없이 JSON만 읽는다.

[산출물]
  station_score[daytype][역][시] = 0~100   역사 혼잡도 (승차+하차 백분위)
  segment[daytype][호선][시][역]  = load    구간 부하 지수 (부호 = 진행 방향)
  seg_max[호선]                   = 정규화 기준값

[방법]
  1) 역번호 = 노선 내 순서. 오름차순 정렬 후 (승차-하차)를 누적 = 구간 부하.
  2) 이 데이터는 개찰구 기준이라 환승 유입이 승차에 잡히지 않는다.
     그대로 누적하면 드리프트가 쌓여 음수로 폭주한다 (1호선 하차/승차 = 4.25배).
     -> 선형 detrend 로 시작/끝을 0으로 강제해 드리프트를 제거한다.
  3) 부호는 진행 방향을 뜻한다. (+) = 역번호 오름차순, (-) = 내림차순.
     검증: 08-09시와 18-19시의 부호가 8개 노선 중 7개에서 반전됐다.

[한계]
  절대 재차인원이 아니라 상대 지표다. 발표에서 '몇 명'이라고 말하지 말 것.
  8호선은 노선이 짧아 신호가 약하다 -> 역사 혼잡도로 폴백된다.
"""
from pathlib import Path
import json
import re
import sys

import numpy as np
import pandas as pd

BASE = Path(__file__).resolve().parent
CSV_PATH = BASE / "data" / "서울교통공사_역별_일별_시간대별_승하차인원_정보.csv"
OUT_PATH = BASE / "data" / "congestion.json"

HOUR_COLS = {
    "06시이전": 5, "06-07시간대": 6, "07-08시간대": 7, "08-09시간대": 8,
    "09-10시간대": 9, "10-11시간대": 10, "11-12시간대": 11, "12-13시간대": 12,
    "13-14시간대": 13, "14-15시간대": 14, "15-16시간대": 15, "16-17시간대": 16,
    "17-18시간대": 17, "18-19시간대": 18, "19-20시간대": 19, "20-21시간대": 20,
    "21-22시간대": 21, "22-23시간대": 22, "23-24시간대": 23, "24시이후": 24,
}

# 지선. 역번호 순서가 본선과 이어지지 않아 누적 계산을 깨뜨린다.
SPUR_STATIONS = {
    "용답", "신답", "신설동", "용두",          # 2호선 성수지선
    "도림천", "양천구청", "신정네거리",        # 2호선 신정지선
    "마천", "거여", "개롱", "오금", "방이",    # 5호선 마천지선
}


def norm_station(name) -> str:
    """'강남역', '교대(법원.검찰청)', ' 강남 ' -> '강남'"""
    s = re.sub(r"\(.*?\)", "", str(name)).replace(" ", "").strip()
    if len(s) > 1 and s.endswith("역"):
        s = s[:-1]
    return s


def load_csv(path: Path) -> pd.DataFrame:
    for enc in ("cp949", "euc-kr", "utf-8-sig", "utf-8"):
        try:
            df = pd.read_csv(path, encoding=enc)
            print(f"[읽기] encoding={enc}, shape={df.shape}")
            return df
        except UnicodeDecodeError:
            continue
    raise RuntimeError("CSV 인코딩 실패")


def to_long(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["수송일자"] = pd.to_datetime(df["수송일자"])
    df["daytype"] = np.where(df["수송일자"].dt.dayofweek < 5, "평일", "주말")
    df["key"] = df["역명"].apply(norm_station)

    cols = [c for c in HOUR_COLS if c in df.columns]
    long = df.melt(
        id_vars=["호선", "역번호", "key", "승하차구분", "daytype"],
        value_vars=cols, var_name="_slot", value_name="value",
    )
    long["hour"] = long["_slot"].map(HOUR_COLS)
    long["value"] = pd.to_numeric(long["value"], errors="coerce").fillna(0)
    return long


def build_station_score(long: pd.DataFrame) -> dict:
    """역사 혼잡도 = (승차+하차) 일평균의 백분위. 구간 부하가 없을 때의 폴백."""
    g = long.groupby(["daytype", "key", "hour"], as_index=False)["value"].mean()
    out = {}
    for dt, grp in g.groupby("daytype"):
        grp = grp.copy()
        grp["score"] = (grp["value"].rank(pct=True) * 100).round().astype(int)
        out[dt] = {
            st: {str(int(h)): int(v) for h, v in zip(s["hour"], s["score"])}
            for st, s in grp.groupby("key")
        }
    return out


def build_segment(long: pd.DataFrame):
    """구간 부하 지수. detrend 된 누적 (승차 - 하차)."""
    spur = {norm_station(x) for x in SPUR_STATIONS}
    main = long[~long["key"].isin(spur)]

    piv = main.groupby(
        ["daytype", "호선", "hour", "역번호", "key", "승하차구분"],
        as_index=False)["value"].mean()
    piv = piv.pivot_table(
        index=["daytype", "호선", "hour", "역번호", "key"],
        columns="승하차구분", values="value").reset_index()
    for c in ("승차", "하차"):
        if c not in piv.columns:
            piv[c] = 0.0
    piv[["승차", "하차"]] = piv[["승차", "하차"]].fillna(0.0)

    segment, seg_max = {}, {}
    for (dt, line, hour), grp in piv.groupby(["daytype", "호선", "hour"]):
        grp = grp.sort_values("역번호").reset_index(drop=True)
        if len(grp) < 3:
            continue
        c = np.cumsum((grp["승차"] - grp["하차"]).values)
        c = c - np.linspace(c[0], c[-1], len(c))   # 핵심: 드리프트 제거
        node = (segment.setdefault(dt, {}).setdefault(line, {})
                .setdefault(str(int(hour)), {}))
        for st, v in zip(grp["key"], c):
            node[st] = int(round(v))
        seg_max[line] = max(seg_max.get(line, 0.0), float(np.abs(c).max()))

    return segment, {k: int(round(v)) for k, v in seg_max.items()}


def build_station_index(df: pd.DataFrame) -> dict:
    """역명 -> [{line, no}]  (환승역은 여러 개)"""
    idx = {}
    for _, r in df[["호선", "역번호", "역명"]].drop_duplicates().iterrows():
        idx.setdefault(norm_station(r["역명"]), []).append(
            {"line": r["호선"], "no": int(r["역번호"])})
    return idx


def main():
    if not CSV_PATH.exists():
        print(f"CSV 없음: {CSV_PATH}")
        sys.exit(1)

    df = load_csv(CSV_PATH)
    long = to_long(df)

    print("[1/3] 역사 혼잡도...")
    station_score = build_station_score(long)
    print("[2/3] 구간 부하...")
    segment, seg_max = build_segment(long)
    print("[3/3] 역 인덱스...")
    station_index = build_station_index(df)

    payload = {
        "station_score": station_score,
        "segment": segment,
        "seg_max": seg_max,
        "station_index": station_index,
        "meta": {
            "source": CSV_PATH.name,
            "period": [str(df["수송일자"].min())[:10], str(df["수송일자"].max())[:10]],
            "lines": sorted(seg_max),
            "station_count": len(station_index),
            "note": "구간 부하는 상대 지표. 절대 재차인원 아님.",
        },
    }
    OUT_PATH.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")

    mb = OUT_PATH.stat().st_size / 1024 / 1024
    print(f"\n[완료] {OUT_PATH}  ({mb:.1f} MB)")
    print(f"역 {len(station_index)}개 / 노선 {sorted(seg_max)}")
    print(f"샘플 역명: {list(station_index)[:8]}")
    print("=> 이 역명 형식을 1번에게 공유할 것.")


if __name__ == "__main__":
    main()
