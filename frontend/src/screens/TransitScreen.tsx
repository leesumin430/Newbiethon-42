import { useState, useEffect } from "react";
import type { Screen, RouteCandidate } from "../App";
import Character from "../components/Character";

interface Props {
  navigate: (s: Screen) => void;
  selectedRoute: RouteCandidate | null;
}

// ============================================================
// 시연용 배속 설정
//   1   = 실시간 (실제 서비스용)
//   60  = 60배속  (21분 -> 21초)   <- 시연 권장
//   120 = 120배속 (21분 -> 10초)
// 제출/배포 전에는 1로 되돌릴 것.
const DEMO_SPEED = 60;
// ============================================================

export default function TransitScreen({ navigate, selectedRoute }: Props) {
  const stations = selectedRoute?.stations ?? [];

  // 백엔드가 내려준 역별 도착시간. 없으면 역당 4초로 폴백.
  const stationTimes =
    selectedRoute?.station_times && selectedRoute.station_times.length > 0
      ? selectedRoute.station_times
      : stations.map((s, i) => ({ station: s, at: i * 4, line: "" }));

  const [startedAt] = useState(() => Date.now());
  const [currentIdx, setCurrentIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      const sec = ((Date.now() - startedAt) / 1000) * DEMO_SPEED;
      setElapsed(sec);

      let idx = 0;
      for (let i = 0; i < stationTimes.length; i++) {
        if (stationTimes[i].at <= sec) idx = i;
      }
      setCurrentIdx(idx);

      if (idx >= stationTimes.length - 1) clearInterval(timer);
    }, 200);

    return () => clearInterval(timer);
  }, [startedAt, stationTimes]);

  const progress = currentIdx / Math.max(stations.length - 1, 1);

  const nextStop = stationTimes[currentIdx + 1];
  const remainMin = nextStop
    ? Math.max(Math.ceil((nextStop.at - elapsed) / 60), 0)
    : 0;

  const reward = selectedRoute?.reward ?? Math.round(200 + progress * 80);

  return (
    <div style={{ minHeight: "100%", background: "linear-gradient(180deg, #1a0010 0%, #3d0020 30%, #fff5f5 100%)" }}>
      <div style={{ padding: "52px 20px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 0 3px rgba(74,222,128,0.3)" }} />
              <span style={{ fontSize: 14, fontWeight: 800, color: "#fca5a5" }}>이동 중</span>
              {DEMO_SPEED > 1 && (
                <span style={{
                  background: "rgba(255,215,0,0.18)",
                  border: "1px solid rgba(255,215,0,0.45)",
                  borderRadius: 8, padding: "1px 7px",
                  fontSize: 10, fontWeight: 800, color: "#ffd700",
                }}>
                  시연 {DEMO_SPEED}배속
                </span>
              )}
            </div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "#fff" }}>
              {currentIdx + 1} / {stations.length} 정거장
            </h2>
          </div>
          <div style={{
            background: "rgba(255,255,255,0.15)", borderRadius: 16,
            padding: "8px 14px", backdropFilter: "blur(8px)",
          }}>
            <span style={{ fontSize: 12, color: "#fca5a5", fontWeight: 700 }}>
              {stations[0]} → {stations[stations.length - 1]}
            </span>
          </div>
        </div>
        <div style={{ marginTop: 14, height: 8, background: "rgba(255,255,255,0.2)", borderRadius: 4, overflow: "hidden" }}>
          <div style={{
            width: `${progress * 100}%`, height: "100%",
            background: "linear-gradient(90deg, #dc143c, #ffd700)",
            borderRadius: 4, transition: "width 1s ease",
          }} />
        </div>
      </div>

      {/* Route visualization */}
      <div style={{
        margin: "0 20px", background: "rgba(255,255,255,0.97)",
        borderRadius: 24, padding: "20px 24px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
      }}>
        <div style={{ position: "relative", width: "100%" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
              columnGap: 0,
              rowGap: 48,
              width: "100%",
              padding: "52px 0 8px",
            }}
          >
            {stations.map((name, i) => {
              const row = Math.floor(i / 7);
              const positionInRow = i % 7;
              const reverse = row % 2 === 1;

              const column = reverse ? 7 - positionInRow : positionInRow + 1;

              const hasNext = i < stations.length - 1;
              const rowEnd = positionInRow === 6;

              const isTransfer =
                selectedRoute?.transfer_stations?.includes(name) ?? false;

              return (
                <div
                  key={`${name}-${i}`}
                  style={{
                    gridColumn: column,
                    gridRow: row + 1,
                    position: "relative",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    minWidth: 0,
                  }}
                >
                  {/* 캐릭터 */}
                  {i === currentIdx && (
                    <div
                      style={{
                        position: "absolute",
                        bottom: "calc(100% + 4px)",
                        left: "50%",
                        transform: "translateX(-50%)",
                        zIndex: 10,
                      }}
                    >
                      <Character size={44} mood="happy" />
                    </div>
                  )}

                  {/* 역 점 */}
                  <div
                    style={{
                      width: i === 0 || i === stations.length - 1 ? 20 : isTransfer ? 17 : 14,
                      height: i === 0 || i === stations.length - 1 ? 20 : isTransfer ? 17 : 14,
                      borderRadius: "50%",
                      background: i <= currentIdx ? "#dc143c" : "#d1d5db",
                      border:
                        i === currentIdx
                          ? "3px solid #fff"
                          : isTransfer
                            ? "3px solid #fff"
                            : "2px solid transparent",
                      boxShadow:
                        i === currentIdx
                          ? "0 0 0 4px rgba(220,20,60,0.35)"
                          : isTransfer
                            ? "0 0 0 2px #f59e0b"
                            : "none",
                      zIndex: 2,
                      flexShrink: 0,
                    }}
                  />

                  {/* 역 이름 */}
                  <span
                    style={{
                      fontSize: name.length >= 7 ? 8 : name.length >= 5 ? 9 : 10,
                      fontWeight: i === currentIdx ? 800 : 600,
                      color: i <= currentIdx ? "#dc143c" : "#9ca3af",
                      marginTop: 5,
                      textAlign: "center",
                      width: "100%",
                      padding: "0 2px",
                      wordBreak: "keep-all",
                      overflowWrap: "anywhere",
                      lineHeight: 1.15,
                      zIndex: 2,
                    }}
                  >
                    {name}
                  </span>

                  {/*환승역 표시 */}
                  {isTransfer && (
                    <span
                      style={{
                        marginTop: 3,
                        fontSize: 8,
                        fontWeight: 800,
                        color: "#f59e0b",
                        background: "#fff7ed",
                        border: "1px solid #f59e0b",
                        borderRadius: 6,
                        padding: "1px 4px",
                        lineHeight: 1.2,
                        zIndex: 2,
                        whiteSpace: "nowrap",
                      }}
                    >
                      환승
                    </span>
                  )}

                  {/* 가로 연결선 */}
                  {hasNext && !rowEnd && (
                    <div
                      style={{
                        position: "absolute",
                        top: 7,
                        height: 4,
                        width: "100%",
                        background: i < currentIdx ? "#dc143c" : "#e5e7eb",
                        ...(reverse ? { right: "50%" } : { left: "50%" }),
                        zIndex: 1,
                      }}
                    />
                  )}

                  {/* 7번째 역에서 다음 줄로 연결 */}
                  {hasNext && rowEnd && (
                    <div
                      style={{
                        position: "absolute",
                        top: 7,
                        left: "50%",
                        width: 4,
                        height: "calc(100% + 48px)",
                        transform: "translateX(-50%)",
                        background: i < currentIdx ? "#dc143c" : "#e5e7eb",
                        zIndex: 1,
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {currentIdx < stations.length - 1 ? (
          <div style={{ marginTop: 12, background: "#fff5f5", borderRadius: 12, padding: "10px 14px", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 14 }}>🔜</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#c0392b" }}>
              다음 역: <strong style={{ color: "#dc143c" }}>{stations[currentIdx + 1]}역</strong>
              {remainMin > 0 && (
                <span style={{ opacity: 0.75, fontWeight: 600 }}> · 약 {remainMin}분</span>
              )}
            </span>
          </div>
        ) : (
          <div style={{ marginTop: 12, background: "#fffde7", borderRadius: 12, padding: "10px 14px", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 14 }}>🎉</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#5a3e00" }}>
              {stations[stations.length - 1]}역에 도착했어요!
            </span>
          </div>
        )}
      </div>

      {/* Reward card */}
      <div style={{ padding: "16px 20px 16px" }}>
        <div style={{
          background: "rgba(255,255,255,0.13)",
          border: "1.5px solid rgba(255,255,255,0.25)",
          borderRadius: 20, padding: "16px 18px", backdropFilter: "blur(8px)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <p style={{ margin: "0 0 4px", fontSize: 12, color: "#fca5a5", fontWeight: 600 }}>현재 예상 리워드</p>
              <p style={{ margin: 0, fontSize: 28, fontWeight: 900, color: "#ffd700" }}>+{reward}P</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{
                background: "#4ade80", color: "#14532d",
                borderRadius: 10, padding: "4px 10px",
                fontSize: 11, fontWeight: 800, marginBottom: 4,
              }}>혼잡도 보너스 +20P</div>
              <p style={{ margin: 0, fontSize: 10, color: "#fca5a5" }}>여유로운 이동 보너스 적용 중</p>
            </div>
          </div>
        </div>
      </div>

      {currentIdx === stations.length - 1 && (
        <div style={{ padding: "0 20px 16px" }}>
          <button onClick={() => navigate("reward")} style={{
            width: "100%",
            background: "linear-gradient(135deg, #ffd700, #ffb300)",
            color: "#5a3e00", border: "none", borderRadius: 14,
            padding: "16px", fontSize: 16, fontWeight: 800,
            fontFamily: "Nunito, sans-serif", cursor: "pointer",
            boxShadow: "0 4px 16px rgba(255,215,0,0.4)",
          }}>
            🎁 리워드 받기
          </button>
        </div>
      )}
    </div>
  );
}