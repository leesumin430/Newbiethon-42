import { useState } from "react";
import type { Screen } from "../App";
import Character from "../components/Character";

interface Props { navigate: (s: Screen) => void; }

type Modal = null | "menu" | "account";

export default function CharacterScreen({ navigate }: Props) {
  const [modal, setModal] = useState<Modal>(null);

  return (
    <div style={{ minHeight: "100%", background: "linear-gradient(180deg, #fff5f5 0%, #fffdf7 100%)" }}>

      {/* Header */}
      <div style={{ padding: "52px 20px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: "#1a1a1a" }}>내 캐릭터</h1>
        <div style={{
          background: "#fff", border: "2px solid #ffe0e0",
          borderRadius: 20, padding: "6px 14px",
          display: "flex", alignItems: "center", gap: 4,
        }}>
          <span style={{ fontSize: 13 }}>⭐</span>
          <span style={{ fontSize: 14, fontWeight: 800, color: "#dc143c" }}>1,240P</span>
        </div>
      </div>

      {/* Character showcase */}
      <div style={{ display: "flex", justifyContent: "center", padding: "8px 20px 16px" }}>
        <div style={{
          width: "100%",
          background: "linear-gradient(135deg, #fff5f5, #ffe0e0)",
          borderRadius: 32, padding: "24px 20px 20px",
          border: "2.5px solid #ffb3b3", textAlign: "center",
          boxShadow: "0 8px 32px rgba(220,20,60,0.12)",
          position: "relative", overflow: "hidden",
          display: "flex", flexDirection: "column", alignItems: "center",
        }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} style={{
              position: "absolute", width: 8, height: 8, borderRadius: "50%",
              background: "#ffd700", opacity: 0.4,
              top: `${15 + i * 12}%`, left: i % 2 === 0 ? "8%" : "88%",
            }} />
          ))}

          <Character size={160} mood="happy" />

          <div style={{ marginTop: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 6 }}>
              <span style={{
                background: "#dc143c", color: "#fff",
                borderRadius: 10, padding: "3px 10px",
                fontSize: 13, fontWeight: 800,
              }}>Lv.2</span>

              {/* Clickable name */}
              <button
                onClick={() => setModal("menu")}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 4,
                  padding: "2px 6px", borderRadius: 8,
                  transition: "background 0.15s",
                }}
              >
                <span style={{ fontSize: 15, fontWeight: 800, color: "#1a1a1a" }}>호랑이</span>
                <span style={{ fontSize: 11, color: "#aaa" }}>▾</span>
              </button>

              <span style={{ fontSize: 16 }}>🐯</span>
            </div>
            <p style={{ margin: "0 0 8px", fontSize: 11, color: "#dc143c", fontWeight: 600 }}>EXP 1,300 / 3,500</p>
            <div style={{ height: 8, background: "#ffe0e0", borderRadius: 4, width: 160, margin: "0 auto", overflow: "hidden" }}>
              <div style={{
                width: "37%", height: "100%",
                background: "linear-gradient(90deg, #dc143c, #ffd700)",
                borderRadius: 4,
              }} />
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ padding: "0 20px 16px" }}>
        <div style={{
          background: "#fff", borderRadius: 20, padding: "16px",
          border: "1.5px solid #ffe0e0",
          boxShadow: "0 4px 16px rgba(220,20,60,0.06)",
          display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
          gap: 12, textAlign: "center",
        }}>
          {[
            { label: "총 이동", value: "47회", emoji: "🚇" },
            { label: "총 거리", value: "312km", emoji: "📍" },
            { label: "절약 시간", value: "8.4시간", emoji: "⏱️" },
          ].map(stat => (
            <div key={stat.label}>
              <div style={{ fontSize: 20, marginBottom: 3 }}>{stat.emoji}</div>
              <div style={{ fontSize: 15, fontWeight: 900, color: "#1a1a1a" }}>{stat.value}</div>
              <div style={{ fontSize: 10, color: "#aaa", fontWeight: 600 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ padding: "0 20px 24px", display: "flex", flexDirection: "column", gap: 10 }}>
        <button onClick={() => navigate("customize")} style={{
          width: "100%",
          background: "linear-gradient(135deg, #dc143c, #ff4560)",
          color: "#fff", border: "none", borderRadius: 14,
          padding: "15px 20px", fontSize: 15, fontWeight: 800,
          fontFamily: "Nunito, sans-serif", cursor: "pointer",
          boxShadow: "0 4px 16px rgba(220,20,60,0.3)",
          textAlign: "left", display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <span>🎨 꾸미기</span>
          <span style={{ opacity: 0.7, fontSize: 18 }}>→</span>
        </button>

        <button onClick={() => navigate("chat")} style={{
          width: "100%", background: "#fff", color: "#1a1a1a",
          border: "2px solid #ffe0e0", borderRadius: 14,
          padding: "15px 20px", fontSize: 15, fontWeight: 800,
          fontFamily: "Nunito, sans-serif", cursor: "pointer",
          textAlign: "left", display: "flex", alignItems: "center", justifyContent: "space-between",
          boxShadow: "0 2px 8px rgba(220,20,60,0.06)",
        }}>
          <span>💬 캐릭터와 대화하기</span>
          <span style={{ color: "#dc143c", fontSize: 18 }}>→</span>
        </button>

        <div style={{ background: "#fff", border: "2px solid #ffe0e0", borderRadius: 14, padding: "15px 20px", boxShadow: "0 2px 8px rgba(220,20,60,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: "#1a1a1a" }}>📈 성장 정보</span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {[{ label: "친절함", value: 82 }, { label: "탐험심", value: 67 }, { label: "절약왕", value: 91 }].map(stat => (
              <div key={stat.label} style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: "#aaa", fontWeight: 600, marginBottom: 4 }}>{stat.label}</div>
                <div style={{ height: 6, background: "#ffe0e0", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{
                    width: `${stat.value}%`, height: "100%",
                    background: "linear-gradient(90deg, #dc143c, #ffd700)", borderRadius: 3,
                  }} />
                </div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#dc143c", marginTop: 3 }}>{stat.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Name menu modal ── */}
      {modal === "menu" && (
        <div
          style={{
            position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 50, padding: "0 32px",
          }}
          onClick={() => setModal(null)}
        >
          <div
            style={{ background: "#fff", borderRadius: 22, overflow: "hidden", width: "100%", boxShadow: "0 8px 40px rgba(0,0,0,0.2)" }}
            onClick={e => e.stopPropagation()}
          >
            {/* User badge */}
            <div style={{
              padding: "18px 20px 14px",
              background: "linear-gradient(135deg, #fff5f5, #ffe0e0)",
              borderBottom: "1px solid #ffe0e0",
              display: "flex", alignItems: "center", gap: 12,
            }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", overflow: "hidden", background: "#fff" }}>
                <Character size={44} mood="happy" />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 900, color: "#1a1a1a" }}>호랑이</div>
                <div style={{ fontSize: 12, color: "#888", fontWeight: 600 }}>@abc123</div>
              </div>
            </div>

            {/* Menu items */}
            {[
              { label: "아이디", sub: "@abc123", icon: "🪪", action: () => {}, noArrow: true },
              { label: "계정 정보", sub: "이메일 · 휴대전화", icon: "⚙️", action: () => setModal("account") },
              { label: "로그아웃", sub: "", icon: "🚪", action: () => setModal(null), danger: true },
            ].map((item, i) => (
              <button
                key={item.label}
                onClick={item.action}
                style={{
                  width: "100%", background: "none",
                  border: "none", borderBottom: i < 2 ? "1px solid #f5f5f5" : "none",
                  padding: "14px 20px", cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 12,
                  textAlign: "left",
                }}
              >
                <span style={{ fontSize: 20, flexShrink: 0 }}>{item.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: item.danger ? "#ef4444" : "#1a1a1a" }}>
                    {item.label}
                  </div>
                  {item.sub && <div style={{ fontSize: 11, color: "#aaa", fontWeight: 600 }}>{item.sub}</div>}
                </div>
                {!item.danger && !("noArrow" in item && item.noArrow) && <span style={{ color: "#ccc", fontSize: 16 }}>›</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Account info modal ── */}
      {modal === "account" && (
        <div
          style={{
            position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 50, padding: "0 24px",
          }}
          onClick={() => setModal(null)}
        >
          <div
            style={{ background: "#fff", borderRadius: 22, width: "100%", overflow: "hidden", boxShadow: "0 8px 40px rgba(0,0,0,0.2)" }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{
              padding: "18px 20px",
              background: "linear-gradient(135deg, #fff5f5, #ffe0e0)",
              borderBottom: "1px solid #ffe0e0",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button
                  onClick={() => setModal("menu")}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, padding: 0, color: "#888" }}
                >←</button>
                <span style={{ fontSize: 16, fontWeight: 900, color: "#1a1a1a" }}>계정 정보</span>
              </div>
              <button onClick={() => setModal(null)}
                style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#aaa" }}>✕</button>
            </div>

            {/* Fields */}
            {[
              { label: "휴대전화", value: "010-1234-5678", icon: "📱" },
              { label: "이메일", value: "abcdefg@gmail.com", icon: "✉️" },
              { label: "생년월일", value: "2026-09-12", icon: "🎂" },
            ].map((field, i) => (
              <div key={field.label} style={{
                padding: "16px 20px",
                borderBottom: i < 2 ? "1px solid #f5f5f5" : "none",
                display: "flex", alignItems: "center", gap: 14,
              }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>{field.icon}</span>
                <div>
                  <div style={{ fontSize: 11, color: "#aaa", fontWeight: 700, marginBottom: 2 }}>{field.label}</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#1a1a1a" }}>{field.value}</div>
                </div>
              </div>
            ))}

            <div style={{ padding: "14px 20px" }}>
              <button style={{
                width: "100%", background: "#f5f5f5", color: "#888",
                border: "none", borderRadius: 12, padding: "12px",
                fontSize: 13, fontWeight: 800, fontFamily: "Nunito, sans-serif",
                cursor: "pointer",
              }}>정보 수정</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
