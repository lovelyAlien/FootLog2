/**
 * @jest-environment node
 */
// src/app/__tests__/foundation-wiring.test.ts
// Foundation phase(01-04-PLAN.md Task 2)의 배선 계약 회귀 가드.
// RN 렌더 환경이 필요 없는 정적 소스 분석만 수행한다 — fs.readFileSync로 소스를 읽어
// 문자열/정규식으로 배선 계약을 단언한다.
import fs from 'fs';
import path from 'path';

const APP_DIR = path.join(__dirname, '..');
const SRC_DIR = path.join(__dirname, '..', '..');

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(APP_DIR, relativePath), 'utf-8');
}

function stripComments(source: string): string {
  return source
    .split('\n')
    .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
    .join('\n');
}

// src/ 하위 모든 .ts/.tsx 파일을 재귀 수집한다.
function collectSourceFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(collectSourceFiles(fullPath));
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

describe('src/app/_layout.tsx 배선 계약', () => {
  const layoutSource = readSource('_layout.tsx');

  it('Test 1: onInit={migrateDbIfNeeded}로 SQLiteProvider에 마이그레이션을 전달한다', () => {
    expect(layoutSource).toMatch(/onInit=\{migrateDbIfNeeded\}/);
  });

  it('Test 2: migrateDbIfNeeded 직접 호출이 존재하지 않는다 (Pitfall 3 회귀 가드)', () => {
    const codeOnly = stripComments(layoutSource);
    const directCallMatches = codeOnly.match(/await migrateDbIfNeeded|migrateDbIfNeeded\(/g);
    expect(directCallMatches).toBeNull();
  });

  it('Test 3: useFonts(newsreaderFonts)와 SplashScreen.preventAutoHideAsync()를 포함한다', () => {
    expect(layoutSource).toMatch(/useFonts\(newsreaderFonts\)/);
    expect(layoutSource).toMatch(/SplashScreen\.preventAutoHideAsync\(\)/);
  });
});

describe('src/app/index.tsx 배선 계약', () => {
  const indexSource = readSource('index.tsx');

  it('Test 4: src/theme/tokens에서 colors, typography, spacing을 import한다', () => {
    expect(indexSource).toMatch(/from ['"](\.\.\/)?(@\/)?(src\/)?theme\/tokens['"]/);
    expect(indexSource).toMatch(/colors/);
    expect(indexSource).toMatch(/typography/);
    expect(indexSource).toMatch(/spacing/);
  });

  it('Test 6: colors.accent를 사용하지 않는다 (DESIGN.md 승인된 6개 용도에 이 화면이 없음)', () => {
    const codeOnly = stripComments(indexSource);
    expect(codeOnly).not.toMatch(/colors\.accent/);
  });

  it('Test 7: 진행률 패턴(N/M)이 등장하지 않는다 (PROJECT.md CRITICAL 원칙 회귀 가드)', () => {
    expect(indexSource).not.toMatch(/\b\d+\s*\/\s*\d+\b/);
  });
});

describe('src/ 전체 하드코딩 hex 컬러 회귀 가드', () => {
  it('Test 5: src/theme/tokens.ts를 제외한 모든 .ts/.tsx 파일에 hex 컬러 리터럴이 없다', () => {
    const allFiles = collectSourceFiles(SRC_DIR);
    const offenders: string[] = [];

    for (const filePath of allFiles) {
      const relativePath = path.relative(SRC_DIR, filePath);

      // 토큰 정의 파일 자체와 테스트 파일(토큰 값을 직접 단언해야 함)은 예외.
      if (relativePath === path.join('theme', 'tokens.ts')) continue;
      if (/\.test\.(ts|tsx)$/.test(filePath)) continue;

      const source = fs.readFileSync(filePath, 'utf-8');
      const codeOnly = stripComments(source);
      if (/#[0-9A-Fa-f]{3,6}\b/.test(codeOnly)) {
        offenders.push(relativePath);
      }
    }

    expect(offenders).toEqual([]);
  });
});
