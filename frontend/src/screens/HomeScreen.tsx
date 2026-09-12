import { useState } from "react";
import type { Screen } from "../App";
import Character from "../components/Character";

interface Props { navigate: (s: Screen) => void; onSearch: (from: string, to: string) => void; }

export default function HomeScreen({ navigate: _navigate, onSearch }: Props) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const swap = () => { const t = from; setFrom(to); setTo(t); };

  return (
    <div style={{ minHeight: "100%", background: "linear-gradient(180deg, #fff5f5 0%, #fffdf7 55%)" }}>
      {/* Header */}
      <div style={{ padding: "52px 20px 0", display: "flex", alignItems: "flex-start", justifyContent: "space-between", background: "rgb(255, 255, 255)" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 22, fontFamily: "'Fredoka One', cursive", color: "#dc143c", letterSpacing: "-0.5px" }}>🚇 SubiGo</span>
          </div>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#c0392b", fontWeight: 600 }}>오늘도 여유롭게 이동해볼까요? 🐯</p>
        </div>
        <div style={{
          background: "#fff", border: "2px solid #ffe0e0",
          borderRadius: 20, padding: "6px 14px",
          display: "flex", alignItems: "center", gap: 4,
        }}>
          <span style={{ fontSize: 14 }}>⭐</span>
          <span style={{ fontSize: 14, fontWeight: 800, color: "#dc143c" }}>1,240P</span>
        </div>
      </div>

      {/* Character */}
      <div style={{ display: "flex", justifyContent: "center", padding: "14px 0 6px", position: "relative", background: "rgb(255, 255, 255)" }}>
        <div style={{ position: "relative" }}>
          <Character size={100} mood="happy" />
          <div style={{
            position: "absolute", top: -6, right: -80,
            background: "#fff", border: "2px solid #ffe0e0",
            borderRadius: "16px 16px 16px 4px",
            padding: "6px 10px", fontSize: 11, fontWeight: 700, color: "#dc143c",
            whiteSpace: "nowrap", boxShadow: "0 2px 8px rgba(220,20,60,0.12)",
          }}>
            오늘도 파이팅! 🌟
          </div>
        </div>
      </div>

      {/* Search card */}
      <div style={{ padding: "0 20px 16px", background: "rgb(255, 255, 255)" }}>
        <div style={{
          background: "#fff", borderRadius: 24, padding: "20px",
          boxShadow: "0 4px 20px rgba(220,20,60,0.08)",
          border: "1.5px solid #ffe0e0",
        }}>
          <p style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 800, color: "#1a1a1a" }}>경로 검색</p>

          <div style={{ marginBottom: 8 }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              background: "#fff5f5", border: "2px solid #ffe0e0",
              borderRadius: 14, padding: "12px 14px",
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: 10,
                background: "#dc143c",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <span style={{ fontSize: 15 }}>🟢</span>
              </div>
              <input
                value={from} onChange={(e) => setFrom(e.target.value)}
                placeholder="출발역을 입력하세요"
                style={{
                  border: "none", background: "transparent",
                  fontSize: 14, fontWeight: 600, color: "#1a1a1a",
                  outline: "none", flex: 1, fontFamily: "Nunito, sans-serif",
                }}
              />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
            <button onClick={swap} style={{
              width: 36, height: 36, borderRadius: "50%",
              background: "#fff5f5", border: "2px solid #ffe0e0",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", fontSize: 16,
            }}>⇅</button>
          </div>

          <div style={{ marginBottom: 18 }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              background: "#fff5f5", border: "2px solid #ffe0e0",
              borderRadius: 14, padding: "12px 14px",
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: 10,
                background: "#ffd700",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <span style={{ fontSize: 15 }}>📍</span>
              </div>
              <input
                value={to} onChange={(e) => setTo(e.target.value)}
                placeholder="도착역을 입력하세요"
                style={{
                  border: "none", background: "transparent",
                  fontSize: 14, fontWeight: 600, color: "#1a1a1a",
                  outline: "none", flex: 1, fontFamily: "Nunito, sans-serif",
                }}
              />
            </div>
          </div>

          <button onClick={() => { if (from.trim() && to.trim()) onSearch(from.trim(), to.trim()); }} style={{
            width: "100%",
            background: "linear-gradient(135deg, #dc143c, #ff4560)",
            color: "#fff", border: "none", borderRadius: 14,
            padding: "15px", fontSize: 16, fontWeight: 800,
            fontFamily: "Nunito, sans-serif", cursor: "pointer",
            boxShadow: "0 4px 16px rgba(220,20,60,0.35)",
          }}>
            🔍 경로 찾기
          </button>
        </div>
      </div>

      {/* Peak hour bonus times */}
      <div style={{ padding: "0 20px 16px" }}>
        {/* Peak hour bonus times */}
        <div style={{
          marginTop: 12, background: "#fff",
          borderRadius: 18, padding: "14px 16px",
          border: "1.5px solid #ffe0e0",
          boxShadow: "0 2px 8px rgba(220,20,60,0.07)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
            <span style={{ fontSize: 14 }}>🎯</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: "#1a1a1a" }}>추가 보너스 시간대</span>
            <span style={{
              background: "#dc143c", color: "#fff",
              fontSize: 10, fontWeight: 800,
              borderRadius: 8, padding: "2px 7px", marginLeft: "auto",
            }}>+30P 리워드</span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
                <span style={{ fontSize: 12 }}>🌅</span>
                <span style={{ fontSize: 11, fontWeight: 800, color: "#78350f" }}>오전</span>
              </div>
              {[
                { time: "05:30 ~ 06:30", label: "이른 출근" },
                { time: "09:00 ~ 10:00", label: "여유 출근" },
              ].map((t) => (
                <div key={t.time} style={{
                  background: "#fff5f5", borderRadius: 10,
                  padding: "6px 10px", marginBottom: 5,
                  border: "1px solid #ffe0e0",
                }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#dc143c" }}>{t.time}</div>
                  <div style={{ fontSize: 10, color: "#aaa", fontWeight: 600 }}>{t.label}</div>
                </div>
              ))}
            </div>
            <div style={{ width: 1, background: "#ffe0e0", borderRadius: 1 }} />
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
                <span style={{ fontSize: 12 }}>🌆</span>
                <span style={{ fontSize: 11, fontWeight: 800, color: "#78350f" }}>오후</span>
              </div>
              {[
                { time: "16:00 ~ 17:00", label: "이른 퇴근" },
                { time: "19:00 ~ 20:00", label: "여유 퇴근" },
              ].map((t) => (
                <div key={t.time} style={{
                  background: "#fff5f5", borderRadius: 10,
                  padding: "6px 10px", marginBottom: 5,
                  border: "1px solid #ffe0e0",
                }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#dc143c" }}>{t.time}</div>
                  <div style={{ fontSize: 10, color: "#aaa", fontWeight: 600 }}>{t.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
