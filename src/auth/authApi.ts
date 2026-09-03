// src/auth/authApi.ts
// 10-06-PLAN.md Task 3(GREEN) — 카카오 토큰 교환 / 선제 갱신(D-04) / Bearer 헤더 부착.
//
// 이 모듈은 401을 겪은 뒤 재시도하는 반응형(reactive) 로직을 구현하지 않는다 — 이번
// phase는 D-04(만료 임박 선제 갱신)만 구현한다. 저장된 만료 시각이 실제와 어긋나 서버가
// 여전히 401을 반환하는 잔여 경로가 있을 수 있으며, 그 경우 사용자가 할 수 있는 것은
// 재로그인뿐이다. 반응형 401 재시도는 Phase 12(실제 도메인 API 호출이 생기는 시점)에서
// 검토한다(T-10-29, CLAUDE.md "빠른 값이 틀렸을 때 스스로 보정되는 경로" 규약 적용 지점).
//
// console.log/console.error를 이 파일 어디에도 넣지 않는다 — 에러 객체에 응답 본문이
// 딸려 오면 토큰이 로그에 남을 수 있다(T-10-28).
import { defaultSecureStoreDeps } from './deps';
import { API_BASE_URL, AuthError, PROACTIVE_REFRESH_WINDOW_MS } from './config';
import type { AuthApiDeps, AuthTokens } from './config';
import { clearTokens, loadTokens, saveTokens } from './tokenStore';

type KakaoLoginResponse = { accessToken: string; refreshToken: string; expiresIn: number };
type RefreshResponse = { accessToken: string; refreshToken: string | null; expiresIn: number };

// fetch 실패(오프라인 등)를 AuthError('network')로, 응답이 !ok면 AuthError('rejected')로
// 변환한다. 어떤 경우에도 요청 본문이나 서버 응답 본문(토큰 값이 실려올 수 있다)을 에러
// 메시지에 넣지 않는다.
async function postJson(deps: AuthApiDeps, path: string, body: unknown): Promise<unknown> {
  let response: Response;
  try {
    response = await deps.fetch(`${deps.apiBaseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new AuthError('network', '네트워크 요청에 실패했습니다.');
  }

  if (!response.ok) {
    throw new AuthError('rejected', `서버가 요청을 거부했습니다(status ${response.status}).`);
  }

  return response.json();
}

export async function exchangeKakaoToken(
  deps: AuthApiDeps,
  kakaoAccessToken: string
): Promise<AuthTokens> {
  const json = (await postJson(deps, '/api/auth/kakao/login', {
    kakaoAccessToken,
  })) as KakaoLoginResponse;

  const tokens: AuthTokens = {
    accessToken: json.accessToken,
    refreshToken: json.refreshToken,
    accessTokenExpiresAtMs: deps.now() + json.expiresIn * 1000,
  };

  // 저장을 성공 경로 뒤에만 둔다 — postJson이 실패하면(위에서 throw) 이 줄에 도달하지
  // 않으므로 실패 시 저장하지 않는다는 계약이 자연히 지켜진다.
  await saveTokens(deps.secureStore, tokens);
  return tokens;
}

// 모듈 내부 전용(export하지 않는다). 리프레시 응답의 refreshToken이 null이어도(A8 —
// 회전 없음) 기존 refresh 토큰을 그대로 보존한다 — null로 덮어쓰면 세션을 잃는다.
async function refreshTokens(deps: AuthApiDeps, current: AuthTokens): Promise<AuthTokens> {
  try {
    const json = (await postJson(deps, '/api/auth/refresh', {
      refreshToken: current.refreshToken,
    })) as RefreshResponse;

    const refreshed: AuthTokens = {
      accessToken: json.accessToken,
      // A8: 응답의 refreshToken이 null이면 기존 값을 보존한다(이 한 줄이 Test 16이
      // 잡는 지점).
      refreshToken: json.refreshToken ?? current.refreshToken,
      accessTokenExpiresAtMs: deps.now() + json.expiresIn * 1000,
    };

    await saveTokens(deps.secureStore, refreshed);
    return refreshed;
  } catch (error) {
    if (error instanceof AuthError && error.kind === 'rejected') {
      // 서버가 리프레시 토큰 자체를 거부 — 재로그인이 필요한 상태로 되돌린다.
      await clearTokens(deps.secureStore);
    }
    // kind === 'network'면 지우지 않고 그대로 던진다 — 오프라인 때문에 세션을 잃지
    // 않는다(T-10-30).
    throw error;
  }
}

// in-flight 중복 제거용 모듈 스코프 변수. 이 장치가 없으면 앱 시작 시 여러 화면이 동시에
// 토큰을 요청해 리프레시 네트워크 호출이 N번 발생한다(T-10-31). 진행 중인 리프레시가
// 있으면 그 프로미스를 그대로 재사용한다.
let inFlightRefresh: Promise<AuthTokens> | null = null;

export async function getValidAccessToken(deps: AuthApiDeps): Promise<string | null> {
  const tokens = await loadTokens(deps.secureStore);
  if (tokens === null) {
    return null;
  }

  if (tokens.accessTokenExpiresAtMs - deps.now() > PROACTIVE_REFRESH_WINDOW_MS) {
    // 만료까지 여유창보다 넉넉히 남았다 — 네트워크 호출 없이 그대로 반환한다.
    return tokens.accessToken;
  }

  if (!inFlightRefresh) {
    inFlightRefresh = refreshTokens(deps, tokens).finally(() => {
      inFlightRefresh = null;
    });
  }

  const refreshed = await inFlightRefresh;
  return refreshed.accessToken;
}

// init.headers가 평범한 객체/배열-튜플/Headers 인스턴스 중 어떤 형태로 와도 실제로
// 동작하는 형태로 병합한다. 전역 Headers 인스턴스로 정규화하면 반복 시 헤더 이름이
// 소문자로 강제되어 호출부가 넘긴 원래 표기(예: 'X-Custom')가 사라진다 — 그래서 여기서는
// 평범한 객체 스프레드로 대소문자를 보존한다.
function mergeAuthorizationHeader(
  headersInit: RequestInit['headers'] | undefined,
  accessToken: string
): Record<string, string> {
  const merged: Record<string, string> = {};

  if (Array.isArray(headersInit)) {
    for (const [key, value] of headersInit) {
      merged[key] = value;
    }
  } else if (typeof Headers !== 'undefined' && headersInit instanceof Headers) {
    headersInit.forEach((value, key) => {
      merged[key] = value;
    });
  } else if (headersInit) {
    Object.assign(merged, headersInit as Record<string, string>);
  }

  merged.Authorization = `Bearer ${accessToken}`;
  return merged;
}

export async function authorizedFetch(
  deps: AuthApiDeps,
  path: string,
  init?: RequestInit
): Promise<Response> {
  const accessToken = await getValidAccessToken(deps);
  if (accessToken === null) {
    // 저장된 토큰이 없다 — fetch를 호출하지 않는다.
    throw new AuthError('no-session', '저장된 세션이 없습니다. 다시 로그인해야 합니다.');
  }

  const headers = mergeAuthorizationHeader(init?.headers, accessToken);
  return deps.fetch(`${deps.apiBaseUrl}${path}`, { ...init, headers });
}

export const defaultAuthApiDeps: AuthApiDeps = {
  secureStore: defaultSecureStoreDeps,
  fetch: (...args) => globalThis.fetch(...args),
  now: () => Date.now(),
  // EXPO_PUBLIC_API_BASE_URL 미설정을 조용히 상대 경로 요청으로 흘려보내지 않는다 — 게터로
  // 감싸 최초 사용 시점에 검사한다(모듈 로드 시점에 던지면 이 객체를 import만 해도 뻗는다).
  get apiBaseUrl(): string {
    if (API_BASE_URL === '') {
      throw new Error(
        'EXPO_PUBLIC_API_BASE_URL이 설정되지 않았습니다. .env 파일을 확인하세요(.env.example 참고).'
      );
    }
    return API_BASE_URL;
  },
};
