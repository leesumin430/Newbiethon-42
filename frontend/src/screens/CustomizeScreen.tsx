import { useState, useRef } from "react";
import type { Screen } from "../App";
import Character from "../components/Character";

interface Props { navigate: (s: Screen) => void; }
type Category = "hat" | "top" | "accessory" | "generate";

const items: Record<Exclude<Category, "generate">, { id: string; name: string; price: number; emoji: string; hat?: string; accessory?: string }[]> = {
  hat: [
    { id: "cap",      name: "파란 캡",  price: 200, emoji: "🧢", hat: "cap" },
    { id: "red",      name: "실크햇",   price: 300, emoji: "🎩", hat: "red" },
    { id: "crown",    name: "황금 왕관", price: 500, emoji: "👑", hat: "crown" },
    { id: "none_hat", name: "없음",     price: 0,   emoji: "✕" },
  ],
  top: [
    { id: "stripe",   name: "스트라이프", price: 250, emoji: "👕" },
    { id: "hoodie",   name: "후디",      price: 350, emoji: "🧥" },
    { id: "none_top", name: "없음",      price: 0,   emoji: "✕" },
  ],
  accessory: [
    { id: "glasses",  name: "선글라스", price: 180, emoji: "🕶️", accessory: "glasses" },
    { id: "ribbon",   name: "리본",    price: 150, emoji: "🎀", accessory: "ribbon" },
    { id: "none_acc", name: "없음",    price: 0,   emoji: "✕" },
  ],
};

const categories: { id: Category; label: string; emoji: string }[] = [
  { id: "hat",      label: "모자",    emoji: "🎩" },
  { id: "top",      label: "상의",    emoji: "👕" },
  { id: "accessory",label: "액세서리", emoji: "💎" },
  { id: "generate", label: "생성",    emoji: "✨" },
];

const GENERATE_COST = 15000;

export default function CustomizeScreen({ navigate }: Props) {
  const [activeCategory, setActiveCategory] = useState<Category>("hat");
  const [selectedHat, setSelectedHat]       = useState<string>("cap");
  const [selectedAcc, setSelectedAcc]       = useState<string>("none_acc");
  const [previewHat, setPreviewHat]         = useState<string | null>("cap");
  const [previewAcc, setPreviewAcc]         = useState<string | null>(null);
  const [points]                            = useState(1240);

  // Generate tab state
  const [uploadedPhoto, setUploadedPhoto]   = useState<string | null>(null);
  const [generating, setGenerating]         = useState(false);
  const [generated, setGenerated]           = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const canGenerate = points >= GENERATE_COST;

  const handleSelect = (item: typeof items["hat"][0]) => {
    if (activeCategory === "hat") {
      setPreviewHat(item.hat ?? null); setSelectedHat(item.id);
    } else if (activeCategory === "accessory") {
      setPreviewAcc(item.accessory ?? null); setSelectedAcc(item.id);
    }
  };

  const getSelected = (id: string) =>
    activeCategory === "hat"       ? selectedHat === id :
    activeCategory === "accessory" ? selectedAcc === id : false;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setUploadedPhoto(url);
    setGenerated(false);
  };

  const handleGenerate = () => {
    if (!canGenerate || !uploadedPhoto) return;
    setGenerating(true);
    setTimeout(() => { setGenerating(false); setGenerated(true); }, 2500);
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "#fffdf7" }}>

      {/* Header */}
      <div style={{ padding: "52px 20px 16px", background: "linear-gradient(180deg, #fff5f5, #fffdf7)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={() => navigate("character")}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, padding: 0 }}>←</button>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: "#1a1a1a" }}>캐릭터 꾸미기</h1>
          </div>
          <div style={{
            background: "#fff", border: "2px solid #ffe0e0",
            borderRadius: 20, padding: "6px 14px",
            display: "flex", alignItems: "center", gap: 4,
          }}>
            <span style={{ fontSize: 13 }}>⭐</span>
            <span style={{ fontSize: 14, fontWeight: 800, color: "#dc143c" }}>{points.toLocaleString()}P</span>
          </div>
        </div>
      </div>

      {/* Character preview */}
      <div style={{
        display: "flex", justifyContent: "center", alignItems: "center",
        height: 190, flexShrink: 0,
        background: "linear-gradient(135deg, #3d0020, #1a0010)",
        position: "relative", overflow: "hidden",
      }}>
        {[...Array(10)].map((_, i) => (
          <div key={i} style={{
            position: "absolute", width: 3, height: 3, borderRadius: "50%",
            background: "#ffd700", opacity: 0.3,
            top: `${10 + (i * 11) % 80}%`, left: `${5 + (i * 19) % 90}%`,
          }} />
        ))}
        {generated ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>🐯</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#ffd700" }}>새 캐릭터가 생성됐어요!</div>
          </div>
        ) : (
          <Character size={140} mood="happy" hat={previewHat} accessory={previewAcc} />
        )}
      </div>

      {/* Category tabs */}
      <div style={{
        display: "flex", padding: "10px 20px 0", gap: 6,
        flexShrink: 0, background: "#fff",
        borderBottom: "1.5px solid #ffe0e0", overflowX: "auto",
      }}>
        {categories.map(cat => {
          const active = activeCategory === cat.id;
          const isGenerate = cat.id === "generate";
          return (
            <button key={cat.id} onClick={() => setActiveCategory(cat.id)} style={{
              padding: "8px 12px", borderRadius: "12px 12px 0 0",
              border: "none", flexShrink: 0,
              background: active
                ? (isGenerate ? "linear-gradient(135deg, #7c3aed, #a855f7)" : "#dc143c")
                : "transparent",
              color: active ? "#fff" : "#aaa",
              fontSize: 13, fontWeight: 800,
              fontFamily: "Nunito, sans-serif", cursor: "pointer",
              transition: "all 0.2s",
              position: "relative",
            }}>
              {cat.emoji} {cat.label}
              {isGenerate && !active && (
                <span style={{
                  position: "absolute", top: 4, right: 4,
                  width: 7, height: 7, borderRadius: "50%",
                  background: canGenerate ? "#22c55e" : "#ef4444",
                }} />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflow: "auto", background: "#fff", padding: "16px 20px 20px" }}>

        {/* ── Item grid (hat / top / accessory) ── */}
        {activeCategory !== "generate" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            {items[activeCategory as Exclude<Category,"generate">].map(item => {
              const canAfford = item.price === 0 || points >= item.price;
              const isSelected = getSelected(item.id);
              return (
                <button key={item.id} onClick={() => handleSelect(item)} style={{
                  background: isSelected ? "#fff5f5" : canAfford ? "#fff" : "#fafafa",
                  border: isSelected ? "2.5px solid #dc143c" : "1.5px solid #ffe0e0",
                  borderRadius: 14, padding: "12px 8px",
                  cursor: canAfford ? "pointer" : "not-allowed",
                  textAlign: "center", transition: "all 0.2s",
                  opacity: canAfford ? 1 : 0.5,
                }}>
                  <div style={{ fontSize: 28, marginBottom: 6 }}>{item.emoji}</div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "#1a1a1a", marginBottom: 4, lineHeight: 1.2 }}>{item.name}</div>
                  {item.price === 0
                    ? <div style={{ fontSize: 11, color: "#22c55e", fontWeight: 700 }}>무료</div>
                    : <div style={{ fontSize: 11, fontWeight: 800, color: canAfford ? "#dc143c" : "#ef4444" }}>⭐ {item.price}P</div>
                  }
                  {isSelected && <div style={{ marginTop: 4, fontSize: 10, color: "#dc143c", fontWeight: 800 }}>✓ 착용중</div>}
                </button>
              );
            })}
          </div>
        )}

        {/* ── Generate tab ── */}
        {activeCategory === "generate" && (
          <div>
            {/* Cost badge */}
            <div style={{
              background: canGenerate
                ? "linear-gradient(135deg, #ecfdf5, #d1fae5)"
                : "linear-gradient(135deg, #fff5f5, #ffe0e0)",
              borderRadius: 16, padding: "14px 16px", marginBottom: 16,
              border: `1.5px solid ${canGenerate ? "#6ee7b7" : "#ffb3b3"}`,
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: canGenerate ? "#065f46" : "#9f1239", marginBottom: 2 }}>
                  {canGenerate ? "✅ 생성 가능!" : "⭐ 포인트 부족"}
                </div>
                <div style={{ fontSize: 12, color: canGenerate ? "#047857" : "#be185d", fontWeight: 600 }}>
                  {canGenerate
                    ? `보유 ${points.toLocaleString()}P · 생성 비용 ${GENERATE_COST.toLocaleString()}P`
                    : `${GENERATE_COST.toLocaleString()}P 모아야 생성할 수 있어요 (현재 ${points.toLocaleString()}P)`
                  }
                </div>
              </div>
              <div style={{
                background: canGenerate ? "#10b981" : "#f87171",
                color: "#fff", borderRadius: 12, padding: "6px 12px",
                fontSize: 12, fontWeight: 800,
              }}>
                {GENERATE_COST.toLocaleString()}P
              </div>
            </div>

            {/* Description */}
            <div style={{
              background: "#f5f3ff", borderRadius: 14, padding: "14px 16px", marginBottom: 16,
              border: "1.5px solid #e9d5ff",
            }}>
              <p style={{ margin: "0 0 6px", fontSize: 13, fontWeight: 800, color: "#6d28d9" }}>✨ AI 캐릭터 생성</p>
              <p style={{ margin: 0, fontSize: 12, color: "#7c3aed", fontWeight: 600, lineHeight: 1.6 }}>
                내 사진을 첨부하면 AI 에이전트가<br />나만의 캐릭터를 만들어드려요!
              </p>
            </div>

            {/* Photo upload */}
            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}
              onChange={handleFileChange} />

            <button
              onClick={() => canGenerate && fileRef.current?.click()}
              style={{
                width: "100%", borderRadius: 16, padding: "0",
                border: uploadedPhoto ? "2px solid #a855f7" : "2px dashed #d8b4fe",
                background: uploadedPhoto ? "#f5f3ff" : "#faf5ff",
                cursor: canGenerate ? "pointer" : "not-allowed",
                overflow: "hidden", marginBottom: 14,
                opacity: canGenerate ? 1 : 0.55,
              }}
            >
              {uploadedPhoto ? (
                <div style={{ position: "relative" }}>
                  <img src={uploadedPhoto} alt="업로드된 사진"
                    style={{ width: "100%", height: 140, objectFit: "cover", display: "block" }} />
                  <div style={{
                    position: "absolute", inset: 0,
                    background: "rgba(168,85,247,0.15)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <span style={{ background: "rgba(255,255,255,0.9)", borderRadius: 10,
                      padding: "4px 12px", fontSize: 12, fontWeight: 800, color: "#7c3aed" }}>
                      📷 사진 변경
                    </span>
                  </div>
                </div>
              ) : (
                <div style={{ padding: "28px 16px", textAlign: "center" }}>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>📷</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: canGenerate ? "#7c3aed" : "#aaa", marginBottom: 4 }}>
                    사진 첨부하기
                  </div>
                  <div style={{ fontSize: 11, color: "#aaa", fontWeight: 600 }}>
                    얼굴이 잘 보이는 사진을 올려주세요
                  </div>
                </div>
              )}
            </button>

            {/* Generate button */}
            <button
              onClick={handleGenerate}
              disabled={!canGenerate || !uploadedPhoto || generating}
              style={{
                width: "100%",
                background: canGenerate && uploadedPhoto && !generating
                  ? "linear-gradient(135deg, #7c3aed, #a855f7)"
                  : "#e5e7eb",
                color: canGenerate && uploadedPhoto && !generating ? "#fff" : "#9ca3af",
                border: "none", borderRadius: 14, padding: "15px",
                fontSize: 15, fontWeight: 800,
                fontFamily: "Nunito, sans-serif",
                cursor: canGenerate && uploadedPhoto && !generating ? "pointer" : "not-allowed",
                boxShadow: canGenerate && uploadedPhoto && !generating
                  ? "0 4px 16px rgba(124,58,237,0.35)" : "none",
                transition: "all 0.3s",
              }}
            >
              {generating ? "✨ 생성 중..." : generated ? "🎉 다시 생성하기" : `✨ 캐릭터 생성 (${GENERATE_COST.toLocaleString()}P)`}
            </button>

            {generated && (
              <div style={{
                marginTop: 12, background: "linear-gradient(135deg, #fef3c7, #fde68a)",
                borderRadius: 14, padding: "14px 16px",
                border: "1.5px solid #fcd34d", textAlign: "center",
              }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "#92400e" }}>
                  🎉 새 캐릭터가 생성됐어요!
                </p>
                <p style={{ margin: "4px 0 0", fontSize: 11, color: "#b45309", fontWeight: 600 }}>
                  캐릭터 화면에서 확인해보세요
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Save button (non-generate tabs) */}
      {activeCategory !== "generate" && (
        <div style={{ padding: "12px 20px 16px", background: "#fff", borderTop: "1.5px solid #ffe0e0", flexShrink: 0 }}>
          <button style={{
            width: "100%",
            background: "linear-gradient(135deg, #dc143c, #ff4560)",
            color: "#fff", border: "none", borderRadius: 14, padding: "14px",
            fontSize: 15, fontWeight: 800, fontFamily: "Nunito, sans-serif",
            cursor: "pointer", boxShadow: "0 4px 16px rgba(220,20,60,0.3)",
          }}>🎨 꾸미기 저장</button>
        </div>
      )}
    </div>
  );
}
