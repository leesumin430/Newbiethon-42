import type { Screen, RouteCandidate } from "../App";
import Character from "../components/Character";

interface Props {
  navigate: (s: Screen) => void;
  to: string;
  selectedRoute: RouteCandidate | null;
  totalExp: number;
}

export default function RewardScreen({
  navigate,
  to,
  selectedRoute,
  totalExp,
}: Props) {
  // 레벨별 누적 필요 포인트
  const levelThresholds = [
    0,      // Lv.1
    3500,   // Lv.2
    8400,   // Lv.3
    14400,  // Lv.4
    21400,  // Lv.5
    29100,  // Lv.6
    37500,  // Lv.7
    46600,  // Lv.8
    56800,  // Lv.9
    68000,  // Lv.10
  ];

  // 현재 레벨 계산
  let currentLevelIndex = 0;

  for (let i = 0; i < levelThresholds.length; i++) {
    if (totalExp >= levelThresholds[i]) {
      currentLevelIndex = i;
    }
  }

  const currentLevel = currentLevelIndex + 1;
  const currentThreshold = levelThresholds[currentLevelIndex];
  const nextThreshold = levelThresholds[currentLevelIndex + 1];

  // 현재 레벨 구간 진행률
  const progress =
    nextThreshold !== undefined
      ? ((totalExp - currentThreshold) /
          (nextThreshold - currentThreshold)) *
        100
      : 100;

  const rewards = [
    {
      label: "기본 이동 리워드",
      amount: 200,
      color: "#dc143c",
      emoji: "🚇",
    },
    {
      label: "혼잡도 보너스",
      amount: 80,
      color: "#f59e0b",
      emoji: "🌟",
    },
    {
      label: "추가 보너스",
      amount: 40,
      color: "#22c55e",
      emoji: "🎁",
    },
  ];

  const total = rewards.reduce((s, r) => s + r.amount, 0);

  return (
    <div
      style={{
        minHeight: "100%",
        background:
          "linear-gradient(180deg, #1a0010 0%, #3d0020 35%, #fff5f5 100%)",
      }}
    >
      {/* 도착 정보 */}
      <div style={{ padding: "52px 20px 0", textAlign: "center" }}>
        <div
          style={{
            display: "inline-block",
            background: "rgba(255,255,255,0.15)",
            borderRadius: 20,
            padding: "8px 20px",
            marginBottom: 12,
            backdropFilter: "blur(8px)",
          }}
        >
          <span
            style={{
              fontSize: 13,
              fontWeight: 800,
              color: "#fca5a5",
            }}
          >
            {to} 도착 완료!
          </span>
        </div>

        <h1
          style={{
            margin: "0 0 4px",
            fontSize: 32,
            fontWeight: 900,
            color: "#fff",
          }}
        >
          🎉 도착 완료!
        </h1>

        <p
          style={{
            margin: 0,
            fontSize: 14,
            color: "#fca5a5",
            fontWeight: 600,
          }}
        >
          {selectedRoute?.time}분 이동, 정말 수고했어요!
        </p>
      </div>

      {/* 캐릭터 */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          padding: "20px 0 16px",
        }}
      >
        <Character size={130} mood="excited" />
      </div>

      {/* 이번 여정 보상 */}
      <div style={{ padding: "0 20px 16px" }}>
        <div
          style={{
            background: "#fff",
            borderRadius: 24,
            overflow: "hidden",
            boxShadow: "0 8px 32px rgba(220,20,60,0.12)",
            border: "1.5px solid #ffe0e0",
          }}
        >
          <div style={{ padding: "16px 20px 8px" }}>
            <p
              style={{
                margin: 0,
                fontSize: 13,
                fontWeight: 800,
                color: "#dc143c",
              }}
            >
              이번 여정 보상
            </p>
          </div>

          {rewards.map((r, i) => (
            <div
              key={r.label}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 20px",
                borderTop:
                  i === 0 ? "1px solid #ffe0e0" : "none",
                borderBottom: "1px solid #fff5f5",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: `${r.color}18`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 18,
                  }}
                >
                  {r.emoji}
                </div>

                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#374151",
                  }}
                >
                  {r.label}
                </span>
              </div>

              <span
                style={{
                  fontSize: 15,
                  fontWeight: 900,
                  color: r.color,
                }}
              >
                +{r.amount}P
              </span>
            </div>
          ))}

          <div
            style={{
              padding: "16px 20px",
              background:
                "linear-gradient(135deg, #fff5f5, #ffe0e0)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span
              style={{
                fontSize: 15,
                fontWeight: 800,
                color: "#1a1a1a",
              }}
            >
              총 획득 리워드
            </span>

            <span
              style={{
                fontSize: 22,
                fontWeight: 900,
                color: "#dc143c",
              }}
            >
              ⭐ {total}P
            </span>
          </div>
        </div>
      </div>

      {/* 캐릭터 성장 */}
      <div style={{ padding: "0 20px 16px" }}>
        <div
          style={{
            background: "#fff",
            borderRadius: 20,
            padding: "16px 20px",
            boxShadow: "0 4px 16px rgba(220,20,60,0.08)",
            border: "1.5px solid #ffe0e0",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            <span
              style={{
                fontSize: 13,
                fontWeight: 800,
                color: "#1a1a1a",
              }}
            >
              캐릭터 성장
            </span>

            <span
              style={{
                fontSize: 12,
                color: "#dc143c",
                fontWeight: 700,
              }}
            >
              {currentLevel < 10
                ? `Lv.${currentLevel} → Lv.${
                    currentLevel + 1
                  }까지 ${Math.round(progress)}%`
                : "Lv.10 MAX"}
            </span>
          </div>

          {/* 진행바 */}
          <div
            style={{
              height: 12,
              background: "#ffe0e0",
              borderRadius: 6,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${progress}%`,
                height: "100%",
                background:
                  "linear-gradient(90deg, #dc143c, #ffd700)",
                borderRadius: 6,
                transition: "width 1.2s ease",
              }}
            />
          </div>

          {/* 누적 포인트 */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 6,
            }}
          >
            <span
              style={{
                fontSize: 11,
                color: "#aaa",
                fontWeight: 600,
              }}
            >
              누적 {totalExp.toLocaleString()}P
            </span>

            <span
              style={{
                fontSize: 11,
                color: "#aaa",
                fontWeight: 600,
              }}
            >
              {nextThreshold !== undefined
                ? `${nextThreshold.toLocaleString()}P`
                : "MAX"}
            </span>
          </div>
        </div>
      </div>

      {/* 버튼 */}
      <div
        style={{
          padding: "0 20px 24px",
          display: "flex",
          gap: 10,
        }}
      >
        <button
          onClick={() => navigate("character")}
          style={{
            flex: 1,
            background:
              "linear-gradient(135deg, #dc143c, #ff4560)",
            color: "#fff",
            border: "none",
            borderRadius: 14,
            padding: "15px 10px",
            fontSize: 14,
            fontWeight: 800,
            fontFamily: "Nunito, sans-serif",
            cursor: "pointer",
            boxShadow: "0 4px 16px rgba(220,20,60,0.3)",
          }}
        >
          🐯 캐릭터 보러가기
        </button>

        <button
          onClick={() => navigate("home")}
          style={{
            flex: 1,
            background: "#fff",
            color: "#dc143c",
            border: "2px solid #ffe0e0",
            borderRadius: 14,
            padding: "15px 10px",
            fontSize: 14,
            fontWeight: 800,
            fontFamily: "Nunito, sans-serif",
            cursor: "pointer",
          }}
        >
          🏠 홈으로
        </button>
      </div>
    </div>
  );
}