/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 백엔드 API 기본 주소. .env / .env.local 또는 배포 플랫폼 환경변수로 설정. */
  readonly VITE_API_BASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
