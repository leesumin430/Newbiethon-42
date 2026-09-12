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
}: Props) {
  // ============================================================
  // 임시 가상 사용자 데이터
  // 실제 사용자 데이터 연동 후 이 부분만 API 값으로 교체
  // ============================================================
  const mockUser = {
    level: 2,
    name: "호랑이",
    exp: 1300,
    nextLevelExp: 3500,
  };

  const currentLevel = mockUser.level;
  const currentExp = mockUser.exp;
  const nextThreshold = mockUser.nextLevelExp;

  const progress = Math.min(
    (currentExp / nextThreshold) * 100,
    100
  );

  // ============================================================
  // 백엔드 리워드 데이터
  // ============================================================
  const rewards = selectedRoute?.reward_breakdown ?? [];
  const total = selectedRoute?.reward ?? 0;

  return (
    <div
      style={{
        minHeight: "100%",
        background:
          "linear-gradient(180deg, #1a0010 0%, #3d0020 35%, #fff5f5 100%)",
      }}
    >
      {/* 도착 정보 */}
      <div
        style={{
          padding: "52px 20px 0",
          textAlign: "center",
        }}
      >
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
          {/* 보상 제목 */}
          <div
            style={{
              padding: "16px 20px 8px",
            }}
          >
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

          {/* 리워드 상세 */}
          {rewards.map((r, i) => {
            const isMove = r.label.startsWith("이동");
            const isTime = r.label === "비혼잡 시간대";
            const isRank = r.label.startsWith("한산한 경로");

            const color = isMove
              ? "#dc143c"
              : isTime
                ? "#f59e0b"
                : "#22c55e";

            const emoji = isMove
              ? "🚇"
              : isTime
                ? "🌟"
                : "🎁";

            const displayLabel = isMove
              ? "기본 이동 리워드"
              : isTime
                ? "시간대 보너스"
                : isRank
                  ? "한산한 경로 보너스"
                  : r.label;

            return (
              <div
                key={`${r.label}-${i}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 20px",
                  borderTop:
                    i === 0
                      ? "1px solid #ffe0e0"
                      : "none",
                  borderBottom:
                    "1px solid #fff5f5",
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
                      background: `${color}18`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 18,
                    }}
                  >
                    {emoji}
                  </div>

                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: "#374151",
                    }}
                  >
                    {displayLabel}
                  </span>
                </div>

                <span
                  style={{
                    fontSize: 15,
                    fontWeight: 900,
                    color,
                  }}
                >
                  +{r.point}P
                </span>
              </div>
            );
          })}

          {/* 총 획득 리워드 */}
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
      <div
        style={{
          padding: "0 20px 16px",
        }}
      >
        <div
          style={{
            background: "#fff",
            borderRadius: 20,
            padding: "16px 20px",
            boxShadow:
              "0 4px 16px rgba(220,20,60,0.08)",
            border: "1.5px solid #ffe0e0",
          }}
        >
          {/* 레벨 / 이름 */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 12,
            }}
          >
            <div
              style={{
                background:
                  "linear-gradient(135deg, #dc143c, #ff4560)",
                color: "#fff",
                borderRadius: 12,
                padding: "6px 12px",
                fontSize: 14,
                fontWeight: 900,
              }}
            >
              Lv.{currentLevel}
            </div>

            <span
              style={{
                fontSize: 18,
                fontWeight: 900,
                color: "#1a1a1a",
              }}
            >
              {mockUser.name}
            </span>

            <span
              style={{
                fontSize: 18,
              }}
            >
              🐯
            </span>
          </div>

          {/* EXP */}
          <div
            style={{
              marginBottom: 10,
              textAlign: "center",
            }}
          >
            <span
              style={{
                fontSize: 14,
                color: "#dc143c",
                fontWeight: 700,
              }}
            >
              EXP {currentExp.toLocaleString()} /{" "}
              {nextThreshold.toLocaleString()}
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

          {/* 진행률 */}
          <div
            style={{
              marginTop: 7,
              textAlign: "right",
            }}
          >
            <span
              style={{
                fontSize: 11,
                color: "#aaa",
                fontWeight: 600,
              }}
            >
              Lv.{currentLevel + 1}까지{" "}
              {Math.round(progress)}%
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
            boxShadow:
              "0 4px 16px rgba(220,20,60,0.3)",
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