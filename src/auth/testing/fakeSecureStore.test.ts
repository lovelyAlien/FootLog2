/**
 * @jest-environment node
 */
// src/auth/testing/fakeSecureStore.test.ts
// 10-06-PLAN.md Task 1 — 더블 자체의 계약 테스트(fakeNotifications.test.ts와 동일 관용구).
// 이 파일은 'expo-secure-store'를 전혀 참조하지 않는다 — createFakeSecureStore()가
// SecureStoreDeps(../config.ts) 계약만 만족하면 되기 때문이다.
import { createFakeSecureStore } from './fakeSecureStore';
import type { SecureStoreDeps } from '../config';

describe('createFakeSecureStore', () => {
  it('Test 1: 반환된 객체를 SecureStoreDeps에 대입해도 타입 에러가 없다 (컴파일타임 계약)', () => {
    const deps: SecureStoreDeps = createFakeSecureStore();
    expect(deps).toBeDefined();
  });

  it("Test 2: setItemAsync('k','v') 후 getItemAsync('k')가 'v'를 반환한다", async () => {
    const fake = createFakeSecureStore();

    await fake.setItemAsync('k', 'v');
    const value = await fake.getItemAsync('k');

    expect(value).toBe('v');
  });

  it('Test 3: 저장된 적 없는 키에 getItemAsync는 null을 반환한다(undefined가 아니다)', async () => {
    const fake = createFakeSecureStore();

    const value = await fake.getItemAsync('never-set');

    expect(value).toBeNull();
    expect(value).not.toBeUndefined();
  });

  it('Test 4: 같은 키로 두 번 setItemAsync하면 마지막 값으로 덮어써진다', async () => {
    const fake = createFakeSecureStore();

    await fake.setItemAsync('k', 'first');
    await fake.setItemAsync('k', 'second');
    const value = await fake.getItemAsync('k');

    expect(value).toBe('second');
  });

  it("Test 5: deleteItemAsync('k') 후 getItemAsync('k')가 null이다", async () => {
    const fake = createFakeSecureStore();

    await fake.setItemAsync('k', 'v');
    await fake.deleteItemAsync('k');
    const value = await fake.getItemAsync('k');

    expect(value).toBeNull();
  });

  it('Test 6: 존재하지 않는 키를 deleteItemAsync해도 에러를 던지지 않는다', async () => {
    const fake = createFakeSecureStore();

    await expect(fake.deleteItemAsync('never-set')).resolves.not.toThrow();
  });
});
