// src/auth/testing/fakeSecureStore.ts
// 테스트 전용 인메모리 SecureStore 더블 — src/notifications/testing/fakeNotifications.ts와
// 같은 위치 규약(`src/<도메인>/testing/`)과 같은 형태(프로덕션이 쓰는 좁힌 타입
// `SecureStoreDeps`를 그대로 만족시키는 더블)를 따른다.
//
// 이 파일은 'expo-secure-store'를 전혀 import 하지 않는다 — deps.ts가 그 런타임 import를
// 유일하게 소유한다(config.ts 헤더 규약).
//
// 실제 네이티브 모듈과 다르게 동작하는 지점(fakeNotifications.ts 규율과 동일하게 주석으로
// 명시):
// 1. 이 더블은 OS 키체인 암호화를 재현하지 않는다 — 평문 Map에 그대로 보관한다.
// 2. 이 더블은 기기 잠금 상태에 따른 접근 실패(keychainAccessible 제약)를 재현하지 않는다.
// 3. 이 더블은 iOS 키체인의 값 길이 상한을 강제하지 않는다 — 어떤 길이의 값도 저장된다.
import type { SecureStoreDeps } from '../config';

export type FakeSecureStore = SecureStoreDeps & {
  readonly store: Map<string, string>;
};

export function createFakeSecureStore(): FakeSecureStore {
  const store = new Map<string, string>();

  const getItemAsync: SecureStoreDeps['getItemAsync'] = async (key) => {
    // 없는 키에는 null을 반환한다(undefined가 아니다) — 실제 SecureStore 계약과 동일.
    return store.has(key) ? store.get(key)! : null;
  };

  const setItemAsync: SecureStoreDeps['setItemAsync'] = async (key, value) => {
    // 같은 키로 두 번 호출하면 마지막 값으로 덮어써진다(Map.set의 기본 동작).
    store.set(key, value);
  };

  const deleteItemAsync: SecureStoreDeps['deleteItemAsync'] = async (key) => {
    // 존재하지 않는 키를 지워도 Map.delete는 false만 반환할 뿐 throw 하지 않는다 —
    // 실제 expo-secure-store의 no-op 동작과 동일.
    store.delete(key);
  };

  return {
    getItemAsync,
    setItemAsync,
    deleteItemAsync,
    store,
  };
}
