import { useState, useRef, useEffect } from "react";
import type { Screen } from "../App";
import Character from "../components/Character";

interface Props { navigate: (s: Screen) => void; }
interface Message { id: number; from: "user" | "char"; text: string; }

const AUTO_REPLIES: Record<string, string> = {
  default: "저도 함께 이동하는 기분이었어요! 다음 여행도 기대할게요 🌟",
  "혼잡": "오늘 이동 정말 고생했어요! 다음에는 덜 붐비는 시간에 이동하면 보너스 리워드도 받을 수 있어요 🐯",
  "지하철": "지하철 타는 거 저도 좋아해요! 역마다 새로운 이야기가 있잖아요 🚇",
  "리워드": "포인트 많이 쌓으면 멋진 아이템도 살 수 있어요! 같이 모아봐요 ⭐",
  "보너스": "혼잡도가 낮은 시간에 이동하면 최대 +30P까지 리워드가 늘어나요! 오전 10시~12시가 최고예요 🌅",
};

const INIT: Message[] = [
  { id: 1, from: "char", text: "안녕하세요! 오늘도 무사히 이동했나요? 저는 항상 여기 있어요 🐯" },
  { id: 2, from: "char", text: "궁금한 거 뭐든 물어봐요! 이동 팁도 알려드릴 수 있어요 🚇" },
];

export default function ChatScreen({ navigate }: Props) {
  const [messages, setMessages] = useState<Message[]>(INIT);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    setMessages((prev) => [...prev, { id: Date.now(), from: "user", text: trimmed }]);
    setInput("");
    const key = Object.keys(AUTO_REPLIES).find((k) => k !== "default" && trimmed.includes(k));
    setTimeout(() => {
      setMessages((prev) => [...prev, { id: Date.now() + 1, from: "char", text: AUTO_REPLIES[key ?? "default"] }]);
    }, 900);
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "#fff5f5" }}>
      <div style={{
        padding: "52px 20px 14px",
        background: "linear-gradient(135deg, #3d0020, #1a0010)",
        flexShrink: 0, display: "flex", alignItems: "center", gap: 12,
      }}>
        <button onClick={() => navigate("character")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, padding: 0, color: "#fff" }}>←</button>
        <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Character size={44} mood="happy" />
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>호랑이</div>
          <div style={{ fontSize: 11, color: "#fca5a5", fontWeight: 600 }}>항상 함께할게요 🐯</div>
        </div>
        <div style={{ marginLeft: "auto", width: 8, height: 8, borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 0 3px rgba(74,222,128,0.3)" }} />
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: "16px 16px 8px" }}>
        {messages.map((msg) => (
          <div key={msg.id} style={{
            display: "flex", alignItems: "flex-end", gap: 8, marginBottom: 12,
            flexDirection: msg.from === "user" ? "row-reverse" : "row",
          }}>
            {msg.from === "char" && (
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#fff", border: "2px solid #ffe0e0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Character size={36} mood="happy" />
              </div>
            )}
            <div style={{
              maxWidth: "70%",
              background: msg.from === "user" ? "linear-gradient(135deg, #dc143c, #ff4560)" : "#fff",
              color: msg.from === "user" ? "#fff" : "#1a1a1a",
              borderRadius: msg.from === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
              padding: "10px 14px", fontSize: 13, fontWeight: 600, lineHeight: 1.5,
              boxShadow: msg.from === "user" ? "0 4px 12px rgba(220,20,60,0.25)" : "0 2px 8px rgba(0,0,0,0.07)",
              border: msg.from === "char" ? "1.5px solid #ffe0e0" : "none",
            }}>{msg.text}</div>
          </div>
        ))}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
          {["혼잡도 팁", "리워드 방법", "보너스 조건"].map((q) => (
            <button key={q} onClick={() => setInput(q)} style={{
              background: "#fff", border: "1.5px solid #ffe0e0",
              borderRadius: 20, padding: "6px 12px",
              fontSize: 11, fontWeight: 700, color: "#dc143c",
              cursor: "pointer", fontFamily: "Nunito, sans-serif",
            }}>{q}</button>
          ))}
        </div>
        <div ref={bottomRef} />
      </div>

      <div style={{
        padding: "10px 16px 20px", background: "#fff",
        borderTop: "1.5px solid #ffe0e0",
        display: "flex", gap: 10, alignItems: "flex-end", flexShrink: 0,
      }}>
        <input
          value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") send(); }}
          placeholder="호랑이에게 말 걸어보세요..."
          style={{
            flex: 1, background: "#fff5f5", border: "2px solid #ffe0e0",
            borderRadius: 20, padding: "10px 16px",
            fontSize: 13, fontFamily: "Nunito, sans-serif", fontWeight: 600,
            color: "#1a1a1a", outline: "none",
          }}
        />
        <button onClick={send} style={{
          width: 44, height: 44, borderRadius: "50%",
          background: "linear-gradient(135deg, #dc143c, #ff4560)",
          border: "none", cursor: "pointer", fontSize: 18,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0, boxShadow: "0 4px 12px rgba(220,20,60,0.3)",
          color: "#fff",
        }}>↑</button>
      </div>
    </div>
  );
}
