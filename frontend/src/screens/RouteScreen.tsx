import type { Screen, RouteCandidate } from "../App";

const lineColors: Record<string, string> = {
  "1호선": "#0052a4", "2호선": "#009a44", "3호선": "#ef7c1c",
  "4호선": "#00a5de", "5호선": "#996cac", "6호선": "#cd6529",
  "7호선": "#747f00", "8호선": "#e6186c", "9호선": "#bdb092",
  "신분당선": "#d31145", "경의중앙선": "#77c4a3", "공항철도": "#0090d2",
};

interface Props {
  navigate: (s: Screen) => void;
  from: string;
  to: string;
  selectedRoute: RouteCandidate | null;
}

export default function RouteScreen({ navigate, from, to, selectedRoute }: Props) {
  const stations = selectedRoute?.stations ?? [];

  return (
    <div style={{ minHeight: "100%", background: "linear-gradient(180deg, #fff5f5 0%, #fffdf7 55%)" }}>

      {/* Header */}
      <div style={{ padding: "52px 20px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <button onClick={() => navigate("routelist")}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, padding: 0 }}>←</button>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#1a1a1a" }}>선택한 경로</h1>
        </div>
      </div>

      {/* Summary card */}
      <div style={{ padding: "0 20px 16px" }}>
        <div style={{
          background: "#fff", borderRadius: 24, padding: "20px",
          boxShadow: "0 4px 20px rgba(220,20,60,0.08)",
          border: "1.5px solid #ffe0e0",
        }}>
          {/* From → To */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 14 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ background: "#dc143c", color: "#fff", borderRadius: 12, padding: "6px 14px", fontSize: 15, fontWeight: 800, marginBottom: 4 }}>{from}</div>
              <span style={{ fontSize: 11, color: "#aaa", fontWeight: 600 }}>출발</span>
            </div>
            <div style={{ fontSize: 22 }}>→</div>
            <div style={{ textAlign: "center" }}>
              <div style={{ background: "#ffd700", color: "#5a3e00", borderRadius: 12, padding: "6px 14px", fontSize: 15, fontWeight: 800, marginBottom: 4 }}>{to}</div>
              <span style={{ fontSize: 11, color: "#aaa", fontWeight: 600 }}>도착</span>
            </div>
          </div>

          {/* 이용 노선 태그 */}
          {selectedRoute && selectedRoute.lines.length > 0 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center", marginBottom: 14 }}>
              {selectedRoute.lines.map((line, i) => (
                <span key={i} style={{
                  background: lineColors[line] ?? "#888",
                  color: "#fff", borderRadius: 8,
                  padding: "3px 10px", fontSize: 12, fontWeight: 800,
                }}>{line}</span>
              ))}
            </div>
          )}

          {/* 시간 + 리워드 */}
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{
              flex: 1, background: "#fff5f5", borderRadius: 14,
              padding: "12px", textAlign: "center", border: "1.5px solid #ffe0e0",
            }}>
              <div style={{ fontSize: 11, color: "#aaa", fontWeight: 600, marginBottom: 3 }}>예상 이동시간</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: "#1a1a1a" }}>
                {selectedRoute ? `${selectedRoute.time}분` : "-"}
              </div>
            </div>
            <div style={{
              flex: 1, background: "linear-gradient(135deg, #fffde7, #fff9c4)",
              borderRadius: 14, padding: "12px", textAlign: "center",
              border: "1.5px solid #ffd700",
            }}>
              <div style={{ fontSize: 11, color: "#78350f", fontWeight: 600, marginBottom: 3 }}>예상 리워드</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: "#dc143c" }}>
                {selectedRoute?.reward != null ? `⭐ ${selectedRoute.reward}P` : "-"}
              </div>
            </div>
          </div>

          {/* 환승 횟수 */}
          {selectedRoute && (
            <div style={{
              marginTop: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}>
              <span style={{ fontSize: 13 }}>🔄</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#555" }}>환승 {selectedRoute.transfers}회</span>
            </div>
          )}
        </div>
      </div>

      {/* 경유 역 타임라인 */}
      <div style={{ padding: "0 20px 16px" }}>
        <div style={{
          background: "#fff", borderRadius: 24, padding: "20px",
          boxShadow: "0 4px 20px rgba(220,20,60,0.08)",
          border: "1.5px solid #ffe0e0",
        }}>
          <p style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 800, color: "#dc143c" }}>🚇 경유 역</p>

          {stations.length === 0 ? (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🔄</div>
              <p style={{ margin: 0, fontSize: 13, color: "#aaa", fontWeight: 600 }}>
                경유 역 정보를 불러오는 중이에요
              </p>
            </div>
          ) : (
            stations.map((station, i) => {
              const isFirst = i === 0;
              const isLast = i === stations.length - 1;
              const lineColor = lineColors[station.line] ?? "#dc143c";
              return (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 28 }}>
                    <div style={{
                      width: isFirst || isLast ? 20 : 14,
                      height: isFirst || isLast ? 20 : 14,
                      borderRadius: "50%",
                      background: station.transferTo ? "#ffd700" : lineColor,
                      border: `3px solid ${isFirst ? lineColor : isLast ? "#ffd700" : "#fff"}`,
                      boxShadow: station.transferTo ? "0 0 0 3px rgba(255,215,0,0.35)" : "none",
                      flexShrink: 0, marginTop: isFirst ? 0 : 2,
                    }} />
                    {!isLast && (
                      <div style={{ width: 3, height: 28, background: lineColor, opacity: 0.4, borderRadius: 2, marginTop: 2 }} />
                    )}
                  </div>
                  <div style={{ paddingBottom: isLast ? 0 : 12, flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 14, fontWeight: 800, color: "#1a1a1a" }}>{station}역</span>
                      {station.transferTo && (
                        <span style={{
                          background: "#fffde7", color: "#78350f",
                          fontSize: 10, fontWeight: 800, padding: "2px 6px",
                          borderRadius: 6, border: "1px solid #ffd700",
                        }}>{station.transferTo} 환승</span>
                      )}
                      {isFirst && <span style={{ background: "#fff5f5", color: "#dc143c", fontSize: 10, fontWeight: 800, padding: "2px 6px", borderRadius: 6 }}>출발</span>}
                      {isLast && <span style={{ background: "#fffde7", color: "#78350f", fontSize: 10, fontWeight: 800, padding: "2px 6px", borderRadius: 6 }}>도착</span>}
                    </div>
                    {station.line && (
                      <span style={{
                        fontSize: 10, fontWeight: 700, color: "#fff",
                        background: lineColors[station.line] ?? "#888",
                        borderRadius: 5, padding: "1px 6px", marginTop: 3, display: "inline-block",
                      }}>{station.line}</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 보너스 안내 */}
      {selectedRoute?.bonus && (
        <div style={{ padding: "0 20px 16px" }}>
          <div style={{
            background: "linear-gradient(135deg, #fffde7, #fff9c4)",
            borderRadius: 16, padding: "14px 16px",
            border: "1.5px solid #ffd700",
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <span style={{ fontSize: 20 }}>🐯</span>
            <div>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: "#5a3e00" }}>보너스 적용 중!</p>
              <p style={{ margin: 0, fontSize: 11, color: "#78350f" }}>혼잡도 보너스 {selectedRoute.bonus}가 자동 적용돼요</p>
            </div>
          </div>
        </div>
      )}

      {/* 이동 시작 버튼 */}
      <div style={{ padding: "0 20px 24px" }}>
        <button onClick={() => navigate("transit")} style={{
          width: "100%",
          background: "linear-gradient(135deg, #dc143c, #ff4560)",
          color: "#fff", border: "none", borderRadius: 14,
          padding: "16px", fontSize: 16, fontWeight: 800,
          fontFamily: "Nunito, sans-serif", cursor: "pointer",
          boxShadow: "0 4px 16px rgba(220,20,60,0.35)",
        }}>
          🚇 이동 시작
        </button>
      </div>
    </div>
  );
}
