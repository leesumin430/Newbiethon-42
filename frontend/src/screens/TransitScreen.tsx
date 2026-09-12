import { useState, useEffect } from "react";
import type { Screen } from "../App";
import Character from "../components/Character";

interface Props { navigate: (s: Screen) => void; }

const stations = ["고려대", "보문", "신당", "약수", "한강진", "이태원", "강남"];

export default function TransitScreen({ navigate }: Props) {
  const [currentIdx, setCurrentIdx] = useState(2);

  useEffect(() => {
    if (currentIdx < stations.length - 1) {
      const t = setTimeout(() => setCurrentIdx((i) => i + 1), 4000);
      return () => clearTimeout(t);
    }
  }, [currentIdx]);

  const progress = currentIdx / (stations.length - 1);
  const reward = Math.round(200 + progress * 80);

  return (
    <div style={{ minHeight: "100%", background: "linear-gradient(180deg, #1a0010 0%, #3d0020 30%, #fff5f5 100%)" }}>
      <div style={{ padding: "52px 20px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 0 3px rgba(74,222,128,0.3)" }} />
              <span style={{ fontSize: 14, fontWeight: 800, color: "#fca5a5" }}>이동 중</span>
            </div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "#fff" }}>
              {currentIdx + 1} / {stations.length} 정거장
            </h2>
          </div>
          <div style={{
            background: "rgba(255,255,255,0.15)", borderRadius: 16,
            padding: "8px 14px", backdropFilter: "blur(8px)",
          }}>
            <span style={{ fontSize: 12, color: "#fca5a5", fontWeight: 700 }}>고려대 → 강남</span>
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
        <div style={{ position: "relative", overflowX: "auto" }}>
          <div style={{ display: "flex", alignItems: "center", paddingBottom: 8, minWidth: 300 }}>
            {stations.map((name, i) => (
              <div key={name} style={{ display: "flex", alignItems: "center", flex: i < stations.length - 1 ? 1 : 0 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
                  {i === currentIdx && (
                    <div style={{
                      position: "absolute", bottom: "calc(100% + 4px)",
                      left: "50%", transform: "translateX(-50%)", zIndex: 10,
                    }}>
                      <Character size={44} mood="happy" />
                    </div>
                  )}
                  <div style={{
                    width: i === 0 || i === stations.length - 1 ? 20 : 14,
                    height: i === 0 || i === stations.length - 1 ? 20 : 14,
                    borderRadius: "50%",
                    background: i <= currentIdx ? "#dc143c" : "#d1d5db",
                    border: i === currentIdx ? "3px solid #fff" : "2px solid transparent",
                    boxShadow: i === currentIdx ? "0 0 0 4px rgba(220,20,60,0.35)" : "none",
                    transition: "all 0.5s ease", flexShrink: 0, marginTop: 52,
                  }} />
                  <span style={{
                    fontSize: 10, fontWeight: i === currentIdx ? 800 : 600,
                    color: i <= currentIdx ? "#dc143c" : "#9ca3af",
                    marginTop: 5, textAlign: "center", maxWidth: 40,
                    lineHeight: 1.2, transition: "all 0.3s",
                  }}>{name}</span>
                </div>
                {i < stations.length - 1 && (
                  <div style={{
                    flex: 1, height: 4,
                    background: i < currentIdx ? "linear-gradient(90deg, #dc143c, #ff4560)" : "#e5e7eb",
                    marginTop: 52, transition: "background 0.5s ease", borderRadius: 2,
                  }} />
                )}
              </div>
            ))}
          </div>
        </div>

        {currentIdx < stations.length - 1 ? (
          <div style={{ marginTop: 12, background: "#fff5f5", borderRadius: 12, padding: "10px 14px", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 14 }}>🔜</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#c0392b" }}>
              다음 역: <strong style={{ color: "#dc143c" }}>{stations[currentIdx + 1]}역</strong>
            </span>
          </div>
        ) : (
          <div style={{ marginTop: 12, background: "#fffde7", borderRadius: 12, padding: "10px 14px", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 14 }}>🎉</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#5a3e00" }}>강남역에 도착했어요!</span>
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
