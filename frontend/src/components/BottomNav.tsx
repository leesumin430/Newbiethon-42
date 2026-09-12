import type { NavTab } from "../App";

interface Props {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
}

const tabs: { id: NavTab; label: string; icon: string }[] = [
  { id: "home", label: "홈", icon: "🏠" },
  { id: "friends", label: "친구", icon: "👥" },
  { id: "character", label: "캐릭터", icon: "🐯" },
];

export default function BottomNav({ activeTab, onTabChange }: Props) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "stretch",
        background: "#fff",
        borderTop: "1.5px solid #ffe0e0",
        height: 72,
        flexShrink: 0,
      }}
    >
      {tabs.map((tab) => {
        const active = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
              border: "none",
              background: "none",
              cursor: "pointer",
              position: "relative",
              transition: "all 0.15s",
            }}
          >
            <span
              style={{
                fontSize: 26,
                filter: active ? "none" : "grayscale(80%) opacity(0.45)",
                transform: active ? "scale(1.18)" : "scale(1)",
                transition: "all 0.2s ease",
                display: "block",
              }}
            >
              {tab.icon}
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: active ? 800 : 500,
                color: active ? "#dc143c" : "#aaa",
                fontFamily: "Nunito, sans-serif",
                transition: "all 0.2s ease",
              }}
            >
              {tab.label}
            </span>
            {active && (
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: 32,
                  height: 3,
                  borderRadius: 2,
                  background: "#dc143c",
                }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
