// src/auth/deps.ts
// 계약: 이 파일이 src/auth/ 안에서 'expo-secure-store'를 런타임 import 하는 유일한
// 파일이다. 다른 인증 모듈은 절대 이 패키지를 직접 import 하지 않는다 — tokenStore.ts와
// authApi.ts는 config.ts가 정의한 좁힌 타입 계약(SecureStoreDeps)만 받는다.
import * as SecureStore from 'expo-secure-store';
import type { SecureStoreDeps } from './config';

// setItemAsync/deleteItemAsync를 그대로 대입하면 SDK가 Promise<void>가 아닌 반환형(예:
// void | Promise<void> 오버로드)을 가질 수 있어 계약과 어긋날 수 있다 — 얇은 래퍼로
// 감싸 SecureStoreDeps의 Promise<void> 계약에 정확히 맞춘다(캐스트로 뭉개지 않는다).
async function getItemAsync(key: string): Promise<string | null> {
  return SecureStore.getItemAsync(key);
}

async function setItemAsync(key: string, value: string): Promise<void> {
  await SecureStore.setItemAsync(key, value, {
    // CLAUDE.md "OS 캐시/기본값을 쓸 때 파라미터를 먼저 확인한다" 규약 적용 지점 — 검토
    // 흔적을 코드로 남긴다. keychainAccessible 옵션을 명시적으로 검토했다: 기본값
    // WHEN_UNLOCKED가 이 용도에 적절하다고 판단해 그대로 채택한다. 이 앱은 백그라운드
    // 상태에서 토큰을 갱신하지 않으므로(포그라운드 D-04 선제 갱신만 구현), 기기 잠금
    // 상태에서의 접근이 필요 없다 — AFTER_FIRST_UNLOCK/ALWAYS처럼 더 낮은 보안 등급으로
    // 완화할 이유가 없다.
    keychainAccessible: SecureStore.WHEN_UNLOCKED,
  });
}

async function deleteItemAsync(key: string): Promise<void> {
  await SecureStore.deleteItemAsync(key);
}

export const defaultSecureStoreDeps: SecureStoreDeps = {
  getItemAsync,
  setItemAsync,
  deleteItemAsync,
};
