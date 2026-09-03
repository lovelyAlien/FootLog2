/**
 * @jest-environment node
 */
// src/auth/authApi.test.ts
// 10-06-PLAN.md Task 2 (RED) — exchangeKakaoToken/getValidAccessToken/authorizedFetch의
// 15개 계약(Test 8~22)을 검증한다. 목킹 라이브러리를 쓰지 않고 손수 만든 fake fetch +
// createFakeSecureStore(같은 폴더 더블) + 고정/제어 가능한 now를 주입한다.
// 'expo-secure-store'를 이 파일이 직접 참조하지 않는다.
import { createFakeSecureStore } from './testing/fakeSecureStore';
import { TOKEN_STORAGE_KEY, PROACTIVE_REFRESH_WINDOW_MS } from './config';
import type { AuthApiDeps, AuthTokens } from './config';
import { exchangeKakaoToken, getValidAccessToken, authorizedFetch } from './authApi';

const BASE_URL = 'https://api.example.test';
const FIXED_NOW = 1_700_000_000_000;

type FetchCall = { url: string; init?: RequestInit };

// node 환경에서 실제 Response 생성자 가용성에 의존하지 않기 위해, ok/status/json만 가진
// 최소 형태를 만들어 `as unknown as Response`로 넘긴다.
function makeResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

// 목킹 프레임워크를 쓰지 않고 손수 만든 fake fetch. 호출 기록(calls)과, 미리 큐에 넣어둔
// 응답 시나리오(성공/거부/지연-대기)를 순서대로 소비하는 함수를 반환한다. 'deferred'
// 시나리오는 즉시 resolve하지 않는 Promise를 반환해 Test 19(동시 요청 중복 제거)가 세
// 호출을 실제로 겹치게 만드는 데 쓰인다.
function createFakeFetch() {
  const calls: FetchCall[] = [];
  type QueueEntry =
    | { kind: 'resolve'; status: number; body: unknown }
    | { kind: 'reject'; error: Error }
    | { kind: 'deferred' };
  const queue: QueueEntry[] = [];
  const deferredResolvers: Array<(response: Response) => void> = [];

  const fetchFn = (async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    const next = queue.shift();
    if (!next) {
      throw new Error('fake fetch: 큐에 준비된 응답이 없다');
    }
    if (next.kind === 'reject') {
      throw next.error;
    }
    if (next.kind === 'deferred') {
      return new Promise<Response>((resolve) => {
        deferredResolvers.push(resolve);
      });
    }
    return makeResponse(next.status, next.body);
  }) as unknown as typeof globalThis.fetch;

  return {
    fetchFn,
    calls,
    enqueueResponse(status: number, body: unknown) {
      queue.push({ kind: 'resolve', status, body });
    },
    enqueueReject(error: Error) {
      queue.push({ kind: 'reject', error });
    },
    enqueueDeferred() {
      queue.push({ kind: 'deferred' });
    },
    resolveNextDeferred(status: number, body: unknown) {
      const resolve = deferredResolvers.shift();
      if (!resolve) throw new Error('resolve할 대기 중인 deferred 응답이 없다');
      resolve(makeResponse(status, body));
    },
  };
}

function makeDeps(overrides: Partial<AuthApiDeps> & { fetchFn?: typeof globalThis.fetch } = {}) {
  const secureStore = overrides.secureStore ?? createFakeSecureStore();
  const fetch = overrides.fetchFn ?? overrides.fetch ?? (async () => makeResponse(200, {}));
  const now = overrides.now ?? (() => FIXED_NOW);
  const apiBaseUrl = overrides.apiBaseUrl ?? BASE_URL;
  return { secureStore, fetch, now, apiBaseUrl } as AuthApiDeps;
}

function tokensNearExpiry(overrides: Partial<AuthTokens> = {}): AuthTokens {
  // PROACTIVE_REFRESH_WINDOW_MS(60_000ms) 이내로 남은 토큰 — D-04 선제 갱신 경로를 탄다.
  return {
    accessToken: 'access-old',
    refreshToken: 'refresh-old',
    accessTokenExpiresAtMs: FIXED_NOW + PROACTIVE_REFRESH_WINDOW_MS - 1_000,
    ...overrides,
  };
}

async function seedTokens(secureStore: ReturnType<typeof createFakeSecureStore>, tokens: AuthTokens) {
  secureStore.store.set(TOKEN_STORAGE_KEY, JSON.stringify(tokens));
}

describe('exchangeKakaoToken', () => {
  it('Test 8: POST {base}/api/auth/kakao/login에 Content-Type: application/json과 본문 {"kakaoAccessToken":"kakao-tok"}으로 요청한다', async () => {
    const fetch = createFakeFetch();
    fetch.enqueueResponse(200, { accessToken: 'a', refreshToken: 'r', expiresIn: 1800 });
    const deps = makeDeps({ fetchFn: fetch.fetchFn });

    await exchangeKakaoToken(deps, 'kakao-tok');

    expect(fetch.calls).toHaveLength(1);
    expect(fetch.calls[0].url).toBe(`${BASE_URL}/api/auth/kakao/login`);
    const headers = fetch.calls[0].init?.headers as Record<string, string>;
    expect(headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(fetch.calls[0].init?.body as string)).toEqual({ kakaoAccessToken: 'kakao-tok' });
  });

  it('Test 9: 서버 200 응답(expiresIn: 1800)을 받으면 accessTokenExpiresAtMs가 now() + 1800*1000으로 계산되어 저장된다(D-04 절대시각 파생)', async () => {
    const fetch = createFakeFetch();
    fetch.enqueueResponse(200, { accessToken: 'new-access', refreshToken: 'new-refresh', expiresIn: 1800 });
    const secureStore = createFakeSecureStore();
    const deps = makeDeps({ fetchFn: fetch.fetchFn, secureStore });

    const result = await exchangeKakaoToken(deps, 'kakao-tok');

    expect(result.accessTokenExpiresAtMs).toBe(FIXED_NOW + 1800 * 1000);
    const raw = secureStore.store.get(TOKEN_STORAGE_KEY);
    expect(raw).toBeDefined();
    expect(JSON.parse(raw!).accessTokenExpiresAtMs).toBe(FIXED_NOW + 1800 * 1000);
  });

  it("Test 10: 서버가 401을 반환하면 AuthError(kind === 'rejected')를 던지고 SecureStore에 아무것도 저장하지 않는다", async () => {
    const fetch = createFakeFetch();
    fetch.enqueueResponse(401, { message: 'unauthorized' });
    const secureStore = createFakeSecureStore();
    const deps = makeDeps({ fetchFn: fetch.fetchFn, secureStore });

    await expect(exchangeKakaoToken(deps, 'bad-tok')).rejects.toMatchObject({ kind: 'rejected' });
    expect(secureStore.store.size).toBe(0);
  });

  it("Test 11: fetch가 reject하면(오프라인) AuthError(kind === 'network')를 던진다", async () => {
    const fetch = createFakeFetch();
    fetch.enqueueReject(new Error('offline'));
    const deps = makeDeps({ fetchFn: fetch.fetchFn });

    await expect(exchangeKakaoToken(deps, 'kakao-tok')).rejects.toMatchObject({ kind: 'network' });
  });
});

describe('getValidAccessToken', () => {
  it('Test 12: 저장된 토큰이 없으면 getValidAccessToken이 null을 반환한다(throw하지 않는다) — 아직 로그인하지 않은 정상 상태', async () => {
    const deps = makeDeps();

    const result = await getValidAccessToken(deps);

    expect(result).toBeNull();
  });

  it('Test 13: 만료까지 PROACTIVE_REFRESH_WINDOW_MS보다 넉넉히 남은 토큰이 있으면 네트워크 호출 없이 저장된 access 토큰을 반환한다', async () => {
    const fetch = createFakeFetch();
    const secureStore = createFakeSecureStore();
    await seedTokens(secureStore, {
      accessToken: 'access-fresh',
      refreshToken: 'refresh-fresh',
      accessTokenExpiresAtMs: FIXED_NOW + PROACTIVE_REFRESH_WINDOW_MS * 10,
    });
    const deps = makeDeps({ fetchFn: fetch.fetchFn, secureStore });

    const result = await getValidAccessToken(deps);

    expect(result).toBe('access-fresh');
    expect(fetch.calls).toHaveLength(0);
  });

  it('Test 14: 만료까지 PROACTIVE_REFRESH_WINDOW_MS 이내면 POST {base}/api/auth/refresh를 호출해 새 access 토큰을 받아 저장하고 반환한다(D-04 선제 갱신 — 401을 기다리지 않는다)', async () => {
    const fetch = createFakeFetch();
    fetch.enqueueResponse(200, { accessToken: 'access-new', refreshToken: null, expiresIn: 1800 });
    const secureStore = createFakeSecureStore();
    await seedTokens(secureStore, tokensNearExpiry());
    const deps = makeDeps({ fetchFn: fetch.fetchFn, secureStore });

    const result = await getValidAccessToken(deps);

    expect(result).toBe('access-new');
    expect(fetch.calls).toHaveLength(1);
    expect(fetch.calls[0].url).toBe(`${BASE_URL}/api/auth/refresh`);
  });

  it('Test 15: 이미 만료된 access 토큰도 같은 경로로 갱신된다', async () => {
    const fetch = createFakeFetch();
    fetch.enqueueResponse(200, { accessToken: 'access-new', refreshToken: null, expiresIn: 1800 });
    const secureStore = createFakeSecureStore();
    await seedTokens(secureStore, tokensNearExpiry({ accessTokenExpiresAtMs: FIXED_NOW - 5_000 }));
    const deps = makeDeps({ fetchFn: fetch.fetchFn, secureStore });

    const result = await getValidAccessToken(deps);

    expect(result).toBe('access-new');
    expect(fetch.calls.filter((c) => c.url.includes('/api/auth/refresh'))).toHaveLength(1);
  });

  it("Test 16: 리프레시 응답의 refreshToken이 null이어도(회전 없음, A8) 기존 refresh 토큰이 저장소에 그대로 보존된다 — null로 덮어써서 세션을 잃지 않는다", async () => {
    const fetch = createFakeFetch();
    fetch.enqueueResponse(200, { accessToken: 'access-new', refreshToken: null, expiresIn: 1800 });
    const secureStore = createFakeSecureStore();
    await seedTokens(secureStore, tokensNearExpiry({ refreshToken: 'refresh-keep-me' }));
    const deps = makeDeps({ fetchFn: fetch.fetchFn, secureStore });

    await getValidAccessToken(deps);

    const raw = secureStore.store.get(TOKEN_STORAGE_KEY);
    expect(JSON.parse(raw!).refreshToken).toBe('refresh-keep-me');
  });

  it("Test 17: 리프레시가 401을 반환하면 저장된 토큰이 전부 삭제되고 AuthError(kind === 'rejected')가 던져진다(재로그인 필요 상태로 되돌림)", async () => {
    const fetch = createFakeFetch();
    fetch.enqueueResponse(401, { message: 'unauthorized' });
    const secureStore = createFakeSecureStore();
    await seedTokens(secureStore, tokensNearExpiry());
    const deps = makeDeps({ fetchFn: fetch.fetchFn, secureStore });

    await expect(getValidAccessToken(deps)).rejects.toMatchObject({ kind: 'rejected' });
    expect(secureStore.store.size).toBe(0);
  });

  it("Test 18: 리프레시가 네트워크 오류로 실패하면 AuthError(kind === 'network')가 던져지고 저장된 토큰은 삭제되지 않는다 — 오프라인 때문에 세션을 잃으면 안 된다", async () => {
    const fetch = createFakeFetch();
    fetch.enqueueReject(new Error('offline'));
    const secureStore = createFakeSecureStore();
    await seedTokens(secureStore, tokensNearExpiry());
    const deps = makeDeps({ fetchFn: fetch.fetchFn, secureStore });

    await expect(getValidAccessToken(deps)).rejects.toMatchObject({ kind: 'network' });
    expect(secureStore.store.size).toBe(1);
  });

  it('Test 19: getValidAccessToken을 동시에 3번 호출해도 리프레시 fetch가 정확히 1회만 발생한다(in-flight 중복 제거)', async () => {
    const fetch = createFakeFetch();
    fetch.enqueueDeferred();
    const secureStore = createFakeSecureStore();
    await seedTokens(secureStore, tokensNearExpiry());
    const deps = makeDeps({ fetchFn: fetch.fetchFn, secureStore });

    // await 없이 세 프로미스를 먼저 만들어 실제로 겹치게 한다. fetch 응답이 즉시
    // resolve되지 않는(deferred) 상태이므로, 셋 다 in-flight 체크 지점에 도달할 시간을
    // 번다.
    const p1 = getValidAccessToken(deps);
    const p2 = getValidAccessToken(deps);
    const p3 = getValidAccessToken(deps);
    // RED 단계(구현 전) 방어: 세 프로미스 중 하나가 동기적으로 즉시 거부되면(예: 스텁의
    // 'not implemented') Promise.all로 아직 넘기기 전에 unhandled rejection으로 잡혀
    // 워커 프로세스가 죽을 수 있다 — no-op catch를 미리 붙여 흡수한다. 이 catch는 원본
    // 프로미스를 소비하지 않으므로(추가 consumer일 뿐) 아래 Promise.all의 결과/거부
    // 판정에는 영향이 없다.
    p1.catch(() => {});
    p2.catch(() => {});
    p3.catch(() => {});

    // 세 호출 모두 loadTokens의 내부 await 체인을 통과해 in-flight 체크 지점(그중 하나가
    // fake fetch를 실제로 호출하는 지점)까지 진행되도록, 마이크로태스크 큐가 완전히
    // 비워질 때까지 기다린다. setImmediate는 마이크로태스크보다 나중에 실행되는
    // 매크로태스크라 이 시점엔 세 체인 모두 진행이 끝나 있음을 보장한다
    // (jest.useFakeTimers/jest.spyOn을 쓰지 않고 실제 이벤트 루프 순서에만 의존한다).
    await new Promise((resolve) => setImmediate(resolve));

    fetch.resolveNextDeferred(200, { accessToken: 'access-shared', refreshToken: null, expiresIn: 1800 });

    const results = await Promise.all([p1, p2, p3]);

    expect(results).toEqual(['access-shared', 'access-shared', 'access-shared']);
    expect(fetch.calls.filter((c) => c.url.includes('/api/auth/refresh'))).toHaveLength(1);
  });
});

describe('authorizedFetch', () => {
  it("Test 20: authorizedFetch(deps, '/api/things')가 {base}/api/things로 요청하며 Authorization: Bearer <access> 헤더를 포함한다", async () => {
    const fetch = createFakeFetch();
    fetch.enqueueResponse(200, { ok: true });
    const secureStore = createFakeSecureStore();
    await seedTokens(secureStore, {
      accessToken: 'access-fresh',
      refreshToken: 'refresh-fresh',
      accessTokenExpiresAtMs: FIXED_NOW + PROACTIVE_REFRESH_WINDOW_MS * 10,
    });
    const deps = makeDeps({ fetchFn: fetch.fetchFn, secureStore });

    await authorizedFetch(deps, '/api/things');

    expect(fetch.calls).toHaveLength(1);
    expect(fetch.calls[0].url).toBe(`${BASE_URL}/api/things`);
    const headers = fetch.calls[0].init?.headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer access-fresh');
  });

  it("Test 21: authorizedFetch 호출 시 저장된 토큰이 없으면 AuthError(kind === 'no-session')를 던지고 fetch를 호출하지 않는다", async () => {
    const fetch = createFakeFetch();
    const deps = makeDeps({ fetchFn: fetch.fetchFn });

    await expect(authorizedFetch(deps, '/api/things')).rejects.toMatchObject({ kind: 'no-session' });
    expect(fetch.calls).toHaveLength(0);
  });

  it('Test 22: authorizedFetch에 넘긴 init.headers의 기존 헤더가 보존되며 Authorization만 추가된다', async () => {
    const fetch = createFakeFetch();
    fetch.enqueueResponse(200, { ok: true });
    const secureStore = createFakeSecureStore();
    await seedTokens(secureStore, {
      accessToken: 'access-fresh',
      refreshToken: 'refresh-fresh',
      accessTokenExpiresAtMs: FIXED_NOW + PROACTIVE_REFRESH_WINDOW_MS * 10,
    });
    const deps = makeDeps({ fetchFn: fetch.fetchFn, secureStore });

    await authorizedFetch(deps, '/api/things', {
      headers: { 'X-Custom': 'custom-value' },
    });

    const headers = fetch.calls[0].init?.headers as Record<string, string>;
    expect(headers['X-Custom']).toBe('custom-value');
    expect(headers['Authorization']).toBe('Bearer access-fresh');
  });
});
