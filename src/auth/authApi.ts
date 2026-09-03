// src/auth/authApi.ts
// 10-06-PLAN.md Task 2 (RED) — 시그니처만 있는 골격. Task 3(GREEN)에서 구현한다.
import { defaultSecureStoreDeps } from './deps';
import { API_BASE_URL } from './config';
import type { AuthApiDeps, AuthTokens } from './config';

export async function exchangeKakaoToken(
  _deps: AuthApiDeps,
  _kakaoAccessToken: string
): Promise<AuthTokens> {
  throw new Error('not implemented');
}

export async function getValidAccessToken(_deps: AuthApiDeps): Promise<string | null> {
  throw new Error('not implemented');
}

export async function authorizedFetch(
  _deps: AuthApiDeps,
  _path: string,
  _init?: RequestInit
): Promise<Response> {
  throw new Error('not implemented');
}

export const defaultAuthApiDeps: AuthApiDeps = {
  secureStore: defaultSecureStoreDeps,
  fetch: (...args) => globalThis.fetch(...args),
  now: () => Date.now(),
  apiBaseUrl: API_BASE_URL,
};
