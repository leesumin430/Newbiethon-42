import { useState } from "react";
import type { Screen } from "../App";
import Character from "../components/Character";
import squirrelImg from "@/imports/image-7.png";
import bunnyImg from "@/imports/image-8.png";
import subwayBg from "@/imports/image-9.png";

interface Props { navigate: (s: Screen) => void; }

function Bubble({ text, align = "left" }: { text: string; align?: "left" | "right" }) {
  return (
    <div style={{
      background: "#fff",
      borderRadius: align === "left" ? "14px 14px 14px 4px" : "14px 14px 4px 14px",
      padding: "6px 11px",
      fontSize: 12, fontWeight: 700, color: "#1a1a1a",
      boxShadow: "0 2px 10px rgba(0,0,0,0.18)",
      whiteSpace: "nowrap",
      marginBottom: 3,
    }}>
      {text}
    </div>
  );
}

export default function FriendsScreen({ navigate: _navigate }: Props) {
  const [showAdd, setShowAdd] = useState(false);
  const [searchId, setSearchId] = useState("");
  const [searchResult, setSearchResult] = useState<null | "found" | "notfound">(null);
  const [showComment, setShowComment] = useState(false);
  const [comment, setComment] = useState("");
  const [postedComment, setPostedComment] = useState<string | null>(null);

  const handlePostComment = () => {
    if (!comment.trim()) return;
    setPostedComment(comment.trim());
    setComment("");
    setShowComment(false);
    setTimeout(() => setPostedComment(null), 2 * 60 * 60 * 1000);
  };

  const handleSearch = () => {
    if (!searchId.trim()) return;
    setSearchResult(searchId.toLowerCase() === "bomi123" ? "found" : "notfound");
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "#e8eaec", overflow: "hidden" }}>

      {/* Header */}
      <div style={{
        padding: "52px 20px 10px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexShrink: 0, position: "relative", zIndex: 10,
        background: "rgb(255, 255, 255)",
      }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: "#1a1a1a" }}>친구</h1>
        <button
          onClick={() => { setShowAdd(true); setSearchId(""); setSearchResult(null); }}
          style={{
            background: "#dc143c", color: "#fff", border: "none",
            borderRadius: 20, padding: "7px 16px",
            fontSize: 13, fontWeight: 800, fontFamily: "Nunito, sans-serif",
            cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
            boxShadow: "0 2px 8px rgba(220,20,60,0.35)",
          }}
        >
          <span style={{ fontSize: 15 }}>+</span> 친구 추가
        </button>
      </div>

      {/* Subway scene — actual image as background */}
      <div style={{ position: "relative", height: 400, flexShrink: 0, overflow: "hidden" }}>
        {/* Real subway image */}
        <img
          src={subwayBg}
          alt="지하철 내부"
          style={{
            position: "absolute", inset: 0,
            width: "100%", height: "100%",
            objectFit: "cover",
            objectPosition: "center center",
          }}
        />

        {/* Characters layer */}
        <div style={{
          position: "absolute",
          bottom: 62,
          left: 0, right: 0,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          gap: 10,
          zIndex: 5,
        }}>
          {/* Squirrel */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <Bubble text="안녕하세요! 👋" align="right" />
            <img src={squirrelImg} alt="다람쥐 보미" width={180} height={180}
              style={{ width: 86, height: 86, objectFit: "contain", display: "block", mixBlendMode: "screen" }} />
            <div style={{
              background: "rgba(255,255,255,0.9)", borderRadius: 10,
              padding: "3px 10px", marginTop: 2,
              fontSize: 11, fontWeight: 800, color: "#1a1a1a",
            }}>보미 · Lv.3</div>
          </div>

          {/* Tiger — center */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            {/* Posted comment bubble */}
            {postedComment && (
              <div style={{
                background: "#fff", borderRadius: "14px 14px 14px 4px",
                padding: "6px 11px", fontSize: 12, fontWeight: 700, color: "#1a1a1a",
                boxShadow: "0 2px 10px rgba(0,0,0,0.18)", whiteSpace: "nowrap",
                marginBottom: 3, maxWidth: 140,
                overflow: "hidden", textOverflow: "ellipsis",
              }}>{postedComment}</div>
            )}
            <button
              onClick={() => setShowComment(true)}
              style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}
            >
              <Character size={106} mood="happy" />
            </button>
            <div style={{
              background: "#dc143c", color: "#fff",
              borderRadius: 12, padding: "4px 14px", marginTop: 2,
              fontSize: 12, fontWeight: 800,
              boxShadow: "0 3px 10px rgba(220,20,60,0.35)",
            }}>나 · Lv.2</div>
          </div>

          {/* Bunny */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <Bubble text="오늘 뭐해? 🐰" align="left" />
            <img src={bunnyImg} alt="토끼 단이" width={180} height={180}
              style={{ width: 86, height: 86, objectFit: "contain", display: "block", mixBlendMode: "screen" }} />
            <div style={{
              background: "rgba(255,255,255,0.9)", borderRadius: 10,
              padding: "3px 10px", marginTop: 2,
              fontSize: 11, fontWeight: 800, color: "#1a1a1a",
            }}>단이 · Lv.5</div>
          </div>
        </div>
      </div>

      {/* Friend list */}
      <div style={{
        flex: 1, background: "rgb(255, 255, 255)",
        borderTop: "1.5px solid #ffe0e0",
        overflowY: "auto", padding: "14px 20px 16px",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: "#1a1a1a" }}>👥 친구 목록</span>
          <span style={{ fontSize: 12, color: "#aaa", fontWeight: 600 }}>2명</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            { name: "보미", lv: 3, status: "이동 중 🚇", bg: "#fff8f0", img: squirrelImg },
            { name: "단이", lv: 5, status: "여유 보너스 획득! ⭐", bg: "#f0fdf4", img: bunnyImg },
          ].map(f => (
            <div key={f.name} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              background: f.bg, borderRadius: 16, padding: "10px 14px",
              border: "1.5px solid #ffe0e0",
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 46, height: 46, background: "#222",
                  borderRadius: "50%", overflow: "hidden", flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <img src={f.img} alt={f.name}
                    style={{ width: 52, height: 52, objectFit: "contain", mixBlendMode: "screen" }} />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#1a1a1a" }}>{f.name}</div>
                  <div style={{ fontSize: 11, color: "#888", fontWeight: 600 }}>{f.status}</div>
                </div>
              </div>
              <span style={{
                background: "#dc143c", color: "#fff",
                borderRadius: 10, padding: "4px 10px",
                fontSize: 12, fontWeight: 800,
              }}>Lv.{f.lv}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Comment Input Modal */}
      {showComment && (
        <div
          style={{
            position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)",
            display: "flex", alignItems: "flex-end", justifyContent: "center",
            zIndex: 50,
          }}
          onClick={() => setShowComment(false)}
        >
          <div
            style={{
              background: "#fff", borderRadius: "24px 24px 0 0",
              padding: "20px 20px 32px", width: "100%",
              boxShadow: "0 -8px 40px rgba(0,0,0,0.18)",
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <span style={{ fontSize: 15, fontWeight: 900, color: "#1a1a1a" }}>💬 댓글 입력</span>
              <button onClick={() => setShowComment(false)}
                style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#aaa" }}>✕</button>
            </div>
            <div style={{
              display: "flex", alignItems: "flex-end", gap: 8,
              background: "#f5f5f5", border: "2px solid #ffe0e0",
              borderRadius: 16, padding: "10px 10px 10px 14px",
            }}>
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handlePostComment(); } }}
                placeholder="1~2줄로 남겨보세요 ✏️"
                rows={2}
                style={{
                  flex: 1, border: "none", background: "transparent",
                  fontSize: 14, fontFamily: "Nunito, sans-serif",
                  fontWeight: 600, color: "#1a1a1a", outline: "none",
                  resize: "none", lineHeight: 1.5,
                }}
              />
              <button
                onClick={handlePostComment}
                style={{
                  width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                  background: comment.trim()
                    ? "linear-gradient(135deg, #dc143c, #ff4560)"
                    : "#e5e7eb",
                  color: comment.trim() ? "#fff" : "#aaa",
                  border: "none", fontSize: 16, cursor: comment.trim() ? "pointer" : "default",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: comment.trim() ? "0 3px 10px rgba(220,20,60,0.3)" : "none",
                  transition: "all 0.2s",
                }}
              >↑</button>
            </div>
            <p style={{ margin: "8px 0 0", fontSize: 11, color: "#aaa", fontWeight: 600 }}>
              Enter로 바로 등록할 수 있어요
            </p>
          </div>
        </div>
      )}

      {/* Friend Add Modal */}
      {showAdd && (
        <div
          style={{
            position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 50, padding: "0 24px",
          }}
          onClick={() => setShowAdd(false)}
        >
          <div
            style={{
              background: "#fff", borderRadius: 24, padding: "24px 24px 20px",
              width: "100%", boxShadow: "0 8px 40px rgba(0,0,0,0.25)",
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: "#1a1a1a" }}>친구 추가</h2>
              <button onClick={() => setShowAdd(false)}
                style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#aaa", lineHeight: 1 }}>✕</button>
            </div>
            <p style={{ margin: "0 0 16px", fontSize: 12, color: "#888", fontWeight: 600 }}>
              친구의 아이디를 입력해서 검색하세요
            </p>

            {/* Search bar — icon button, single row */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <div style={{
                flex: 1, display: "flex", alignItems: "center", gap: 8,
                background: "#f5f5f5", border: "2px solid #ffe0e0",
                borderRadius: 14, padding: "10px 14px",
              }}>
                <input
                  value={searchId}
                  onChange={e => { setSearchId(e.target.value); setSearchResult(null); }}
                  onKeyDown={e => e.key === "Enter" && handleSearch()}
                  placeholder="아이디 입력 (예: bomi123)"
                  style={{
                    border: "none", background: "transparent",
                    fontSize: 14, fontFamily: "Nunito, sans-serif",
                    fontWeight: 600, color: "#1a1a1a", outline: "none", flex: 1,
                  }}
                />
              </div>
              {/* Icon-only search button */}
              <button
                onClick={handleSearch}
                style={{
                  width: 44, height: 44, borderRadius: 14, flexShrink: 0,
                  background: "linear-gradient(135deg, #dc143c, #ff4560)",
                  color: "#fff", border: "none",
                  fontSize: 18, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 3px 10px rgba(220,20,60,0.3)",
                }}
              >🔍</button>
            </div>

            {/* Search results */}
            {searchResult === "found" && (
              <div style={{
                background: "#fff8f0", borderRadius: 16,
                padding: "14px 16px", border: "1.5px solid #ffe0e0",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                marginBottom: 4,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{
                    width: 44, height: 44, background: "#222",
                    borderRadius: "50%", overflow: "hidden",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <img src={squirrelImg} alt="보미"
                      style={{ width: 50, height: 50, objectFit: "contain", mixBlendMode: "screen" }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "#1a1a1a" }}>보미</div>
                    <div style={{ fontSize: 11, color: "#888", fontWeight: 600 }}>@bomi123 · Lv.3</div>
                  </div>
                </div>
                <button style={{
                  background: "#dc143c", color: "#fff", border: "none",
                  borderRadius: 12, padding: "8px 14px",
                  fontSize: 13, fontWeight: 800, fontFamily: "Nunito, sans-serif",
                  cursor: "pointer",
                }}>신청</button>
              </div>
            )}
            {searchResult === "notfound" && (
              <div style={{
                background: "#f9f9f9", borderRadius: 14, padding: "14px 16px",
                border: "1.5px solid #eee", textAlign: "center", marginBottom: 4,
              }}>
                <span style={{ fontSize: 20 }}>🔍</span>
                <p style={{ margin: "6px 0 0", fontSize: 13, color: "#888", fontWeight: 600 }}>
                  해당 아이디의 유저를 찾을 수 없어요
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
