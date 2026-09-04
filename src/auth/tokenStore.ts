// src/auth/tokenStore.ts
// 10-06-PLAN.md Task 3(GREEN) — TOKEN_STORAGE_KEY 한 개 키에 AuthTokens 전체를
// JSON.stringify로 저장한다. 토큰마다 키를 나누면(예: access용 키, refresh용 키) 부분
// 저장 상태(access만 쓰고 refresh 쓰기가 실패)가 생겨 저장소 일관성이 깨진다 — 그래서 항상
// 하나의 값으로 원자적으로 덮어쓴다.
import { TOKEN_STORAGE_KEY } from './config';
import type { AuthTokens, SecureStoreDeps } from './config';

export async function saveTokens(deps: SecureStoreDeps, tokens: AuthTokens): Promise<void> {
  await deps.setItemAsync(TOKEN_STORAGE_KEY, JSON.stringify(tokens));
}

// isAuthTokensShape: JSON.parse가 성공해도 필수 세 필드가 없거나 타입이 다르면 저장소가
// 손상됐거나 예전 스키마의 잔재로 본다 — 둘 다 null로 취급해 재로그인을 유도한다.
function isAuthTokensShape(value: unknown): value is AuthTokens {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.accessToken === 'string' &&
    typeof candidate.refreshToken === 'string' &&
    typeof candidate.accessTokenExpiresAtMs === 'number'
  );
}

export async function loadTokens(deps: SecureStoreDeps): Promise<AuthTokens | null> {
  const raw = await deps.getItemAsync(TOKEN_STORAGE_KEY);
  if (raw === null) {
    return null;
  }

  // 절대 throw하지 않는다 — 저장소가 손상됐을 때(예: 손상된 JSON, 예전 스키마 잔재) 앱이
  // 부팅 불능이 되면 안 된다. 손상 감지 시 재로그인 상태로 되돌리는 것으로 충분하다.
  // catch 블록에서 console.error로 값을 찍지 않는다(raw에는 토큰이 들어 있어 로그로
  // 샐 수 있다 — T-10-28).
  try {
    const parsed = JSON.parse(raw);
    if (!isAuthTokensShape(parsed)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function clearTokens(deps: SecureStoreDeps): Promise<void> {
  await deps.deleteItemAsync(TOKEN_STORAGE_KEY);
}
