// src/auth/config.ts
// Phase 10 인증 클라이언트 — 타입/상수 단일 출처(src/notifications/config.ts와 동일 규약).
// 여기서 값을 발명하지 않는다 — 값이 바뀌면 출처 문서(10-06-PLAN.md <interfaces>)를 먼저
// 갱신하고 이 파일에 반영한다.
//
// 이 폴더에서 `expo-secure-store`를 런타임 import 하는 유일한 파일은 `deps.ts`다. 이
// 파일은 타입 전용 import조차 하지 않는다 — 필요한 세 메서드(getItemAsync/setItemAsync/
// deleteItemAsync)를 SecureStoreDeps로 직접 선언하는 것이 이 저장소의 "좁힌 계약" 방식이다
// (src/notifications/config.ts의 NotificationDeps와 동일 패턴, 다만 그쪽은 SDK 타입에서
// Pick하고 이쪽은 세 메서드가 전부라 직접 선언한다).

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  // 절대 시각(epoch ms) — 서버의 expiresIn(초)에서 파생된다. 클라이언트가 만료 여부를
  // 판단할 때 이 값만 근거로 삼는다(JWT를 직접 디코드해 판단하지 않는다 — T-10-29,
  // 서명 검증 없는 파싱은 신뢰할 수 없다).
  accessTokenExpiresAtMs: number;
};

export type SecureStoreDeps = {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
};

export type AuthApiDeps = {
  secureStore: SecureStoreDeps;
  fetch: typeof globalThis.fetch;
  // 테스트에서 시간을 제어하기 위한 주입 지점. `Date.now`를 스파이하거나
  // `jest.useFakeTimers()`를 쓰지 않는다 — 이 필드가 이미 그 역할을 한다.
  now: () => number;
  apiBaseUrl: string;
};

// 토큰 3필드(accessToken/refreshToken/accessTokenExpiresAtMs)를 단일 JSON 값으로 저장하는
// SecureStore 키. 토큰마다 키를 나누면 부분 저장 상태(예: access만 쓰고 refresh 쓰기 실패)가
// 생겨 저장소 일관성이 깨진다 — tokenStore.ts가 이 키 하나만 쓴다.
export const TOKEN_STORAGE_KEY = 'footlog.auth.tokens';

// D-04: 만료 임박 시 사용자가 401을 겪기 전에 선제적으로 갱신한다(reactive 401 재시도가
// 아니다). 60초 여유창으로 시계 오차와 네트워크 지연을 흡수한다.
export const PROACTIVE_REFRESH_WINDOW_MS = 60_000;

// AuthError.kind로 세 가지 실패를 구분한다 — 10-07의 화면이 D-15("에러 메시지 + 재시도
// 버튼")에서 재시도 버튼을 보여줄지, 재로그인을 유도할지 이 구분으로 결정한다:
// - 'network'  : fetch 자체가 실패(오프라인 등). 재시도가 의미 있다.
// - 'rejected' : 서버가 4xx로 거부. 재로그인이 필요하다.
// - 'no-session': 저장된 토큰이 없다.
export class AuthError extends Error {
  readonly kind: 'network' | 'rejected' | 'no-session';

  constructor(kind: 'network' | 'rejected' | 'no-session', message: string) {
    super(message);
    this.kind = kind;
    this.name = 'AuthError';
  }
}

// EXPO_PUBLIC_ 접두사 값은 앱 번들에 그대로 인라인된다(.env.example 주석 참고) — 여기서는
// 값을 읽어 빈 문자열로 폴백만 한다. 모듈 로드 시점에 던지지 않는다 — 그러면 테스트
// import만으로도(예: fakeSecureStore.test.ts가 이 모듈을 거치지 않아도) 앱이 뻗는다.
// 실제 미설정 검사는 authApi.ts의 defaultAuthApiDeps 조립/사용 시점에서 한다.
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';
