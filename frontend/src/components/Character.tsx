import tigerImg from "@/imports/image-2.png";

interface Props {
  size?: number;
  mood?: "happy" | "normal" | "excited" | "dancing";
  hat?: string | null;
  accessory?: string | null;
  bg?: string | null;
}

const bgStyles: Record<string, string> = {
  space: "radial-gradient(circle, #1a0030, #2d0060)",
  garden: "radial-gradient(circle, #d1fae5, #6ee7b7)",
};

const hatEmoji: Record<string, string> = { red: "🎩", cap: "🧢", crown: "👑" };
const accEmoji: Record<string, string> = { glasses: "🕶️", ribbon: "🎀" };

/**
 * Tiger image layout (roughly, within the square canvas):
 *   Head center:  ~50% from left, ~32% from top
 *   Eyes line:    ~30% from top
 *   Nose/mouth:   ~38% from top
 *   Glasses sit across eyes: top ~26%, left ~22%, width ~56%
 *   Ribbon sits on top of head: top ~5%, centered
 *   Hat sits above head: top ~0%, centered
 */
export default function Character({ size = 120, mood = "normal", hat, accessory, bg }: Props) {
  const s = size;

  return (
    <div
      style={{
        position: "relative",
        width: s,
        height: s,
        flexShrink: 0,
        /* Render at 2× then scale down for sharper result */
        imageRendering: "auto",
      }}
    >
      {bg && bgStyles[bg] && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            background: bgStyles[bg],
            zIndex: 0,
          }}
        />
      )}

      {/* Tiger image — rendered at native 2× quality */}
      <img
        src={tigerImg}
        alt="호이 호랑이 캐릭터"
        width={s * 2}
        height={s * 2}
        style={{
          width: s,
          height: s,
          objectFit: "contain",
          objectPosition: "center center",
          display: "block",
          position: "relative",
          zIndex: 1,
          transform: mood === "excited" ? "scale(1.08)" : "scale(1)",
          transition: "transform 0.3s ease",
          filter:
            mood === "excited"
              ? "drop-shadow(0 0 8px rgba(220,20,60,0.55))"
              : mood === "happy"
              ? "drop-shadow(0 3px 8px rgba(220,20,60,0.18))"
              : "none",
        }}
      />

      {/* Hat — sits above the head */}
      {hat && hatEmoji[hat] && (
        <div
          style={{
            position: "absolute",
            top: s * 0.0,
            left: "50%",
            transform: "translateX(-50%)",
            fontSize: s * 0.26,
            zIndex: 3,
            lineHeight: 1,
            pointerEvents: "none",
          }}
        >
          {hatEmoji[hat]}
        </div>
      )}

      {/* Glasses — sit across the eyes (~28% from top, centered) */}
      {accessory === "glasses" && (
        <div
          style={{
            position: "absolute",
            top: `${s * 0.26}px`,
            left: "50%",
            transform: "translateX(-50%)",
            fontSize: s * 0.28,
            zIndex: 3,
            lineHeight: 1,
            pointerEvents: "none",
          }}
        >
          {accEmoji["glasses"]}
        </div>
      )}

      {/* Ribbon — sits on top-right of head */}
      {accessory === "ribbon" && (
        <div
          style={{
            position: "absolute",
            top: `${s * 0.08}px`,
            right: `${s * 0.14}px`,
            fontSize: s * 0.24,
            zIndex: 3,
            lineHeight: 1,
            pointerEvents: "none",
          }}
        >
          {accEmoji["ribbon"]}
        </div>
      )}

      {/* Excited sparkles */}
      {mood === "excited" && (
        <>
          <div style={{ position: "absolute", top: -4, left: 0, fontSize: s * 0.18, zIndex: 4, pointerEvents: "none" }}>✨</div>
          <div style={{ position: "absolute", top: -4, right: 0, fontSize: s * 0.18, zIndex: 4, pointerEvents: "none" }}>⭐</div>
        </>
      )}
    </div>
  );
}
