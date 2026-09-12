import { useState, useEffect } from "react";
import type { Screen, RouteCandidate } from "../App";
import { apiFetch } from "../lib/api";
// RouteStation은 stations 필드 타입으로만 사용됨

interface Props {
  navigate: (s: Screen) => void;
  from: string;
  to: string;
  onSelectRoute: (route: RouteCandidate) => void;
}

// 노선 색상 — 실제 노선명은 API에서 수신
const lineColors: Record<string, string> = {
  "1호선": "#0052a4", "2호선": "#009a44", "3호선": "#ef7c1c",
  "4호선": "#00a5de", "5호선": "#996cac", "6호선": "#cd6529",
  "7호선": "#747f00", "8호선": "#e6186c", "9호선": "#bdb092",
  "신분당선": "#d31145", "경의중앙선": "#77c4a3", "공항철도": "#0090d2",
};

// 혼잡도 기준으로 배지 도출 (API 값 기반)
function getBadge(congestion: number): { label: string; color: string; bg: string; border: string } {
  if (congestion < 30) return { label: "여유", color: "#22c55e", bg: "#f0fdf4", border: "#86efac" };
  if (congestion < 60) return { label: "보통", color: "#f59e0b", bg: "#fffbeb", border: "#fcd34d" };
  return { label: "혼잡", color: "#ef4444", bg: "#fff5f5", border: "#fca5a5" };
}

function CongestionBar({ value }: { value: number }) {
  const color = value < 30 ? "#22c55e" : value < 60 ? "#f59e0b" : "#ef4444";
  const label = value < 30 ? "여유" : value < 60 ? "보통" : "혼잡";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ flex: 1, height: 5, background: "#f0f0f0", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ width: `${value}%`, height: "100%", background: color, borderRadius: 3 }} />
      </div>
      <span style={{ fontSize: 10, fontWeight: 800, color, minWidth: 22 }}>{label}</span>
    </div>
  );
}

async function fetchRoutes(from: string, to: string): Promise<RouteCandidate[]> {
  const path =
    `/api/routes` +
    `?start=${encodeURIComponent(from)}` +
    `&destination=${encodeURIComponent(to)}` +
    `&limit=3`;

  const response = await apiFetch(path);
  const data = await response.json();

  return data.options.map((option: any, index: number) => ({
    id: index + 1,

    // 백엔드 route.duration
    time: option.duration,

    // 백엔드 route.transfers
    transfers: option.transfers,

    // 백엔드 route.lines
    lines: option.lines ?? [],

    // 백엔드 route.stations
    stations: option.stations ?? [],

    // 백엔드 route.transfer_stations
    transfer_stations: option.transfer_stations ?? [],

    // 백엔드 congestion.score
    congestion: option.congestion?.score ?? 0,

    // 백엔드 reward
    reward: option.reward ?? 0,
    reward_breakdown: option.reward_breakdown ?? [],

    bonus : null,


  }));
}

export default function RouteListScreen({ navigate, from, to, onSelectRoute }: Props) {
  const [loading, setLoading] = useState(true);
  const [routes, setRoutes] = useState<RouteCandidate[]>([]);

  useEffect(() => {
    setLoading(true);
    setRoutes([]);

    fetchRoutes(from, to)
      .then(data => {
        const sorted = [...data].sort(
          (a, b) => a.congestion - b.congestion
        );

        setRoutes(sorted);
      })
      .catch(error => {
        console.error("경로 조회 실패:", error);
        setRoutes([]);
      })
      .finally(() => {
        setLoading(false);
      });

  }, [from, to]);

  return (
    <div style={{ minHeight: "100%", background: "linear-gradient(180deg, #fff5f5 0%, #fffdf7 60%)" }}>

      {/* Header */}
      <div style={{ padding: "52px 20px 16px", background: "#fff5f5" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <button
            onClick={() => navigate("home")}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, padding: 0 }}
          >←</button>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: "#1a1a1a" }}>경로 선택</h1>
        </div>

        {/* From / To pill */}
        <div style={{
          background: "#fff", borderRadius: 16, padding: "12px 16px",
          border: "1.5px solid #ffe0e0",
          boxShadow: "0 2px 8px rgba(220,20,60,0.07)",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", border: "2px solid #bbf7d0" }} />
            <div style={{ width: 1.5, height: 16, background: "#ffe0e0", borderRadius: 1 }} />
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#dc143c", border: "2px solid #fecaca" }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#1a1a1a" }}>{from}</div>
            <div style={{ fontSize: 11, color: "#aaa", margin: "3px 0" }}>→</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#1a1a1a" }}>{to}</div>
          </div>
          <button
            onClick={() => navigate("home")}
            style={{
              background: "none", border: "1.5px solid #ffe0e0",
              borderRadius: 10, padding: "5px 10px",
              fontSize: 12, fontWeight: 700, color: "#dc143c",
              cursor: "pointer", fontFamily: "Nunito, sans-serif",
            }}
          >수정</button>
        </div>
      </div>

      {/* Sort label */}
      <div style={{ padding: "12px 20px 8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: "#1a1a1a" }}>
          {loading
            ? "🔍 경로 검색 중..."
            : <>🔍 추천 경로 <span style={{ color: "#dc143c" }}>{routes.length}개</span></>}
        </span>
        {!loading && <span style={{ fontSize: 11, color: "#aaa", fontWeight: 600 }}>혼잡도 낮은 순</span>}
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div style={{ padding: "0 20px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{
              background: "#fff", borderRadius: 20, padding: "18px 16px",
              border: "1.5px solid #ffe0e0",
              boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
            }}>
              <div style={{ height: 14, width: "40%", background: "#f0f0f0", borderRadius: 6, marginBottom: 10 }} />
              <div style={{ height: 10, width: "65%", background: "#f5f5f5", borderRadius: 6, marginBottom: 8 }} />
              <div style={{ height: 5, background: "#f5f5f5", borderRadius: 3 }} />
            </div>
          ))}
        </div>
      )}

      {/* Route cards — 혼잡도 낮은 순 정렬됨 */}
      {!loading && (
        <div style={{ padding: "0 20px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
          {routes.map((route, idx) => {
            const isTop = idx === 0;
            const badge = getBadge(route.congestion);
            return (
              <button
                key={route.id}
                onClick={() => onSelectRoute(route)}
                style={{
                  width: "100%", textAlign: "left", cursor: "pointer",
                  background: isTop ? "linear-gradient(135deg, #fff5f5, #ffe8e8)" : "#fff",
                  border: isTop ? "2px solid #dc143c" : "1.5px solid #ffe0e0",
                  borderRadius: 20, padding: "18px 16px",
                  boxShadow: isTop
                    ? "0 6px 24px rgba(220,20,60,0.18)"
                    : "0 2px 10px rgba(0,0,0,0.05)",
                  position: "relative", overflow: "hidden",
                  fontFamily: "Nunito, sans-serif",
                }}
              >
                {/* 추천 리본 — 혼잡도 최저 */}
                {isTop && (
                  <div style={{
                    position: "absolute", top: 12, right: -22,
                    background: "#dc143c", color: "#fff",
                    fontSize: 10, fontWeight: 800,
                    padding: "3px 28px", transform: "rotate(45deg)",
                  }}>추천</div>
                )}

                {/* Top row */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
                  <div style={{ flex: 1, marginRight: 12 }}>
                    {/* 혼잡도 배지 */}
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                      <span style={{
                        background: badge.bg, color: badge.color,
                        border: `1px solid ${badge.border}`,
                        borderRadius: 8, padding: "2px 8px",
                        fontSize: 11, fontWeight: 800,
                      }}>{badge.label}</span>
                      <span style={{ fontSize: 12, color: "#888", fontWeight: 600 }}>
                        혼잡도 {route.congestion}%
                      </span>
                    </div>

                    {/* 노선 태그 — API에서 수신한 값만 표시 */}
                    {route.lines.length > 0 ? (
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {route.lines.map((line, i) => (
                          <span key={i} style={{
                            background: lineColors[line] ?? "#888",
                            color: "#fff", borderRadius: 6,
                            padding: "2px 7px", fontSize: 10, fontWeight: 800,
                          }}>{line}</span>
                        ))}
                      </div>
                    ) : (
                      <span style={{ fontSize: 11, color: "#ccc", fontWeight: 600 }}>노선 정보 로딩 중…</span>
                    )}
                  </div>

                  {/* 소요시간 + 보너스 */}
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div
                      style={{
                        fontSize: 26,
                        fontWeight: 900,
                        color: isTop ? "#dc143c" : "#1a1a1a",
                        lineHeight: 1,
                      }}
                    >
                      {route.time}
                      <span style={{ fontSize: 13, fontWeight: 700 }}>
                        분
                      </span>
                    </div>

                    {route.reward !== null && (
                      <div
                        style={{
                          marginTop: 4,
                          background: "#ffd700",
                          borderRadius: 8,
                          padding: "2px 8px",
                          fontSize: 11,
                          fontWeight: 800,
                          color: "#78350f",
                        }}
                      >
                        +{route.reward}P 보너스
                      </div>
                    )}
                  </div>

                  {/* ★ Top row 닫기 */}
                </div>

                {/* Stats row */}
                <div style={{
                  display: "flex", gap: 12, marginBottom: 10,
                  padding: "8px 0", borderTop: "1px solid #f5f5f5",
                }}>
                  {route.transfer_stations && route.transfer_stations.length > 0 && (
                    <div
                      style={{
                        marginBottom: 10,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        flexWrap: "wrap",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: "#888",
                        }}
                      >
                        환승역
                      </span>

                      {route.transfer_stations.map((station, i) => (
                        <span
                          key={i}
                          style={{
                            background: "#fff7ed",
                            color: "#f59e0b",
                            border: "1px solid #fcd34d",
                            borderRadius: 7,
                            padding: "2px 7px",
                            fontSize: 10,
                            fontWeight: 800,
                          }}
                        >
                          {station}
                        </span>
                      ))}
                    </div>
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ fontSize: 12 }}>🔄</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#555" }}>환승 {route.transfers}회</span>
                  </div>
                  <div style={{ width: 1, background: "#eee" }} />
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ fontSize: 12 }}>⏱️</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#555" }}>{route.time}분 소요</span>
                  </div>
                </div>

                {/* 혼잡도 바 */}
                <CongestionBar value={route.congestion} />

                {/* 선택 화살표 */}
                <div style={{
                  position: "absolute", right: 16, bottom: 16,
                  width: 28, height: 28, borderRadius: "50%",
                  background: isTop ? "#dc143c" : "#f5f5f5",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 14, color: isTop ? "#fff" : "#aaa",
                }}>›</div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
