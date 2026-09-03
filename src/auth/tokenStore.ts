// src/auth/tokenStore.ts
// 10-06-PLAN.md Task 2 (RED) — 시그니처만 있는 골격. Task 3(GREEN)에서 구현한다.
import type { AuthTokens, SecureStoreDeps } from './config';

export async function saveTokens(_deps: SecureStoreDeps, _tokens: AuthTokens): Promise<void> {
  throw new Error('not implemented');
}

export async function loadTokens(_deps: SecureStoreDeps): Promise<AuthTokens | null> {
  throw new Error('not implemented');
}

export async function clearTokens(_deps: SecureStoreDeps): Promise<void> {
  throw new Error('not implemented');
}
