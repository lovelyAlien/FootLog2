/**
 * @jest-environment node
 */
// src/auth/envContract.test.ts
// Phase 10(10-01-PLAN.md Task 3)의 환경변수 이름 계약 + 시크릿 커밋 방지 회귀 가드.
//
// 이 테스트가 존재하는 이유(10-01-PLAN.md 위협 T-10-01):
// `.env.example`은 이후 모든 Phase 10 플랜(10-03/10-06/10-07)이 참조할 환경변수 *이름*의
// 계약이다. 실제 네이티브 앱 키/JWT 시크릿이 이 파일에 값으로 들어오면 그대로 저장소에
// 커밋되어 유출된다. fs.readFileSync + 정적 파싱으로 `.env.example`과 `.gitignore`를 읽어
// (require/dotenv 같은 런타임 로더를 쓰지 않음) 값이 항상 비어 있음을 단언한다 —
// src/notifications/infoPlist.test.ts와 동일한 저장소 회귀 가드 관용구.
//
// `.env`(실제 값 파일)는 존재 여부를 단언하지 않는다 — CI 환경에는 존재하지 않기 때문이다.
import fs from 'fs';
import path from 'path';

const ENV_EXAMPLE_PATH = path.join(__dirname, '../../.env.example');
const GITIGNORE_PATH = path.join(__dirname, '../../.gitignore');

function readEnvExample(): string {
  return fs.readFileSync(ENV_EXAMPLE_PATH, 'utf-8');
}

function readGitignore(): string {
  return fs.readFileSync(GITIGNORE_PATH, 'utf-8');
}

function parseEnvKeys(raw: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex);
    const value = trimmed.slice(eqIndex + 1);
    result[key] = value;
  }
  return result;
}

describe('.env.example 환경변수 계약 + 시크릿 커밋 방지 회귀 가드', () => {
  const raw = readEnvExample();
  const keys = parseEnvKeys(raw);

  it('Test 1: 6개 필수 키를 모두 정의한다', () => {
    expect(Object.keys(keys)).toEqual(
      expect.arrayContaining([
        'KAKAO_NATIVE_APP_KEY',
        'EXPO_PUBLIC_API_BASE_URL',
        'JWT_SECRET',
        'DATABASE_URL',
        'DATABASE_USERNAME',
        'DATABASE_PASSWORD',
      ])
    );
  });

  it('Test 2: KAKAO_NATIVE_APP_KEY 값이 빈 문자열이다 (실제 네이티브 앱 키 커밋 방지)', () => {
    expect(keys.KAKAO_NATIVE_APP_KEY).toBe('');
  });

  it('Test 3: JWT_SECRET 값이 빈 문자열이다 (실제 서명 키 커밋 방지)', () => {
    expect(keys.JWT_SECRET).toBe('');
  });

  it('Test 4: DATABASE_PASSWORD 값이 빈 문자열이다', () => {
    expect(keys.DATABASE_PASSWORD).toBe('');
  });

  it('Test 5: 32자 이상의 hex/base64 시크릿 형태 문자열이 등장하지 않는다 (키 이름 우회 방지)', () => {
    expect(raw).not.toMatch(/[0-9a-fA-F]{32,}/);
    expect(raw).not.toMatch(/[A-Za-z0-9+/]{32,}={0,2}/);
  });

  it('Test 6: .gitignore가 .env*와 !.env.example을 모두 포함한다', () => {
    const gitignore = readGitignore();
    expect(gitignore).toMatch(/^\.env\*$/m);
    expect(gitignore).toMatch(/^!\.env\.example$/m);
  });

  it('Test 7: EXPO_PUBLIC_ 접두사를 가진 키는 EXPO_PUBLIC_API_BASE_URL 하나뿐이다 (비밀값의 공개 접두사 유출 방지)', () => {
    const expoPublicKeys = Object.keys(keys).filter((key) => key.startsWith('EXPO_PUBLIC_'));
    expect(expoPublicKeys).toEqual(['EXPO_PUBLIC_API_BASE_URL']);
  });
});
