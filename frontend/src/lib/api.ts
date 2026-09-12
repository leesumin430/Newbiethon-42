// 백엔드 API 공용 설정.
// 주소를 하드코딩하지 않고 여기서만 관리한다 — 배포 환경이 바뀌면
// VITE_API_BASE_URL 환경변수만 바꾸면 된다 (frontend/.env, 또는 배포 플랫폼 설정).

// 끝에 슬래시가 붙어 있어도(예: "https://x.onrender.com/") 안전하게 제거한다.
// 안 그러면 apiFetch("/api/routes") 호출 시 "//api/routes"처럼 슬래시가
// 두 번 겹쳐 백엔드 라우팅이 어긋날 수 있다.
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/+$/, "");

if (!API_BASE_URL) {
  // 빌드/개발 서버 기동 시점에 바로 알아챌 수 있도록 콘솔에 남긴다.
  console.warn(
    "[api] VITE_API_BASE_URL이 설정되지 않았습니다. frontend/.env를 확인하세요."
  );
}

/**
 * 백엔드 API 호출 공용 헬퍼.
 * path는 "/api/routes" 처럼 슬래시로 시작하는 경로만 넘기면 된다.
 */
export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(`${API_BASE_URL}${path}`, init);
  if (!response.ok) {
    throw new Error(`API 요청 실패: ${path} (${response.status})`);
  }
  return response;
}
