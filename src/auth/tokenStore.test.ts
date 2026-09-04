/**
 * @jest-environment node
 */
// src/auth/tokenStore.test.ts
// 10-06-PLAN.md Task 2 (RED) — saveTokens/loadTokens/clearTokens의 7개 계약을 검증한다.
// migrations.test.ts/scheduling.test.ts와 동일 규약: 실제 의존성 대신 인메모리 더블을 직접
// 인자로 주입한다(jest.mock() 미사용). 'expo-secure-store'를 이 파일이 직접 참조하지 않는다.
import { createFakeSecureStore } from './testing/fakeSecureStore';
import { TOKEN_STORAGE_KEY } from './config';
import type { AuthTokens } from './config';
import { saveTokens, loadTokens, clearTokens } from './tokenStore';

function sampleTokens(overrides: Partial<AuthTokens> = {}): AuthTokens {
  return {
    accessToken: 'access-abc',
    refreshToken: 'refresh-xyz',
    accessTokenExpiresAtMs: 1_700_000_000_000,
    ...overrides,
  };
}

describe('saveTokens / loadTokens / clearTokens', () => {
  it('Test 1: saveTokens 후 loadTokens가 저장한 것과 동일한 AuthTokens 객체를 반환한다(왕복)', async () => {
    const fake = createFakeSecureStore();
    const tokens = sampleTokens();

    await saveTokens(fake, tokens);
    const loaded = await loadTokens(fake);

    expect(loaded).toEqual(tokens);
  });

  it('Test 2: saveTokens는 SecureStore에 키를 정확히 1개만 쓴다(TOKEN_STORAGE_KEY) — 토큰이 여러 키로 흩어지지 않는다', async () => {
    const fake = createFakeSecureStore();

    await saveTokens(fake, sampleTokens());

    expect(fake.store.size).toBe(1);
    expect([...fake.store.keys()]).toEqual([TOKEN_STORAGE_KEY]);
  });

  it('Test 3: 저장된 값이 accessToken/refreshToken/accessTokenExpiresAtMs 세 필드를 담은 JSON 문자열이다', async () => {
    const fake = createFakeSecureStore();
    const tokens = sampleTokens();

    await saveTokens(fake, tokens);

    const raw = fake.store.get(TOKEN_STORAGE_KEY);
    expect(typeof raw).toBe('string');
    const parsed = JSON.parse(raw!);
    expect(parsed).toEqual({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      accessTokenExpiresAtMs: tokens.accessTokenExpiresAtMs,
    });
  });

  it('Test 4: 아무것도 저장하지 않은 상태에서 loadTokens는 null을 반환한다(throw하지 않는다)', async () => {
    const fake = createFakeSecureStore();

    const loaded = await loadTokens(fake);

    expect(loaded).toBeNull();
  });

  it('Test 5: 저장된 값이 손상된 JSON이면 loadTokens가 throw하지 않고 null을 반환한다 — 앱이 부팅 불능이 되지 않는다', async () => {
    const fake = createFakeSecureStore();
    fake.store.set(TOKEN_STORAGE_KEY, 'not-json');

    const loaded = await loadTokens(fake);

    expect(loaded).toBeNull();
  });

  it('Test 6: 저장된 JSON이 파싱은 되지만 필수 필드가 빠졌으면 loadTokens가 null을 반환한다', async () => {
    const fake = createFakeSecureStore();
    fake.store.set(TOKEN_STORAGE_KEY, JSON.stringify({ accessToken: 'only-access' }));

    const loaded = await loadTokens(fake);

    expect(loaded).toBeNull();
  });

  it('Test 7: clearTokens 후 loadTokens가 null이다', async () => {
    const fake = createFakeSecureStore();
    await saveTokens(fake, sampleTokens());

    await clearTokens(fake);
    const loaded = await loadTokens(fake);

    expect(loaded).toBeNull();
  });
});
