import { useState } from "react";
import HomeScreen from "./screens/HomeScreen";
import RouteScreen from "./screens/RouteScreen";
import RouteListScreen from "./screens/RouteListScreen";
import TransitScreen from "./screens/TransitScreen";
import RewardScreen from "./screens/RewardScreen";
import CharacterScreen from "./screens/CharacterScreen";
import CustomizeScreen from "./screens/CustomizeScreen";
import ChatScreen from "./screens/ChatScreen";
import FriendsScreen from "./screens/FriendsScreen";
import BottomNav from "./components/BottomNav";

export type Screen =
  | "home" | "routelist" | "route" | "transit" | "reward"
  | "character" | "customize" | "chat" | "friends";

export type NavTab = "home" | "friends" | "character";

// API 응답 shape — 프론트에서 임의 생성하지 않음
export interface RouteStation {
  name: string;
  transferTo?: string; // 환승 노선명 (없으면 undefined)
  line: string;        // 해당 구간 노선
}

export interface RewardBreakdownItem {
  label: string;
  point: number;
}

export interface RouteCandidate {
  id: number;
  time: number;           // 소요시간(분) — API
  transfers: number;      // 환승 횟수 — API
  lines: string[];        // 이용 노선 목록 — API
  stations: string[]; // 경유 역 목록 — API
  congestion: number;     // 혼잡도 0~100 — API
  reward: number | null;  // 예상 리워드(P) — 서버 로직
  reward_breakdown: RewardBreakdownItem[];
  bonus: string | null;   // 보너스 포인트 표시 — 서버 로직
  transfer_stations?: string[]; //환승 역 표시
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [activeTab, setActiveTab] = useState<NavTab>("home");
  const [searchFrom, setSearchFrom] = useState("");
  const [searchTo, setSearchTo] = useState("");
  const [selectedRoute, setSelectedRoute] = useState<RouteCandidate | null>(null);
  const [totalExp, setTotalExp] = useState(0);
  
  const navigate = (s: Screen) => {
    setScreen(s);
    if (s === "home" || s === "routelist" || s === "route" || s === "transit" || s === "reward") setActiveTab("home");
    else if (s === "friends") setActiveTab("friends");
    else if (s === "character" || s === "customize" || s === "chat") setActiveTab("character");
  };

  const handleSearch = (from: string, to: string) => {
    setSearchFrom(from);
    setSearchTo(to);
    navigate("routelist");
  };

  const handleSelectRoute = (route: RouteCandidate) => {
    setSelectedRoute(route);
    navigate("route");
  };

  const handleTabChange = (tab: NavTab) => {
    setActiveTab(tab);
    if (tab === "home") setScreen("home");
    else if (tab === "friends") setScreen("friends");
    else if (tab === "character") setScreen("character");
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "#f5d5d5",
      }}
    >
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          width: 390,
          height: 844,
          background: "#fffdf7",
          borderRadius: 40,
          boxShadow: "0 32px 80px rgba(220,20,60,0.25), 0 8px 24px rgba(0,0,0,0.12)",
        }}
      >
        <div
          style={{ flex: 1, overflowY: "auto", overflowX: "hidden", scrollbarWidth: "none" }}
        >
          {screen === "home" && <HomeScreen navigate={navigate} onSearch={handleSearch} />}
          {screen === "routelist" && <RouteListScreen navigate={navigate} from={searchFrom} to={searchTo} onSelectRoute={handleSelectRoute} />}
          {screen === "route" && <RouteScreen navigate={navigate} from={searchFrom} to={searchTo} selectedRoute={selectedRoute} />}
          {screen === "transit" && <TransitScreen navigate={navigate} selectedRoute={selectedRoute} />}
          {screen === "reward" && <RewardScreen navigate={navigate} to={searchTo} selectedRoute={selectedRoute} totalExp={totalExp}/>}
          {screen === "character" && <CharacterScreen navigate={navigate} />}
          {screen === "customize" && <CustomizeScreen navigate={navigate} />}
          {screen === "chat" && <ChatScreen navigate={navigate} />}
          {screen === "friends" && <FriendsScreen navigate={navigate} />}
        </div>
        <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
      </div>
    </div>
  );
}
