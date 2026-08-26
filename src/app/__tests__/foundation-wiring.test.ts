/**
 * @jest-environment node
 */
// src/app/__tests__/foundation-wiring.test.ts
// Foundation phase(01-04-PLAN.md Task 2)의 배선 계약 회귀 가드.
// RN 렌더 환경이 필요 없는 정적 소스 분석만 수행한다 — fs.readFileSync로 소스를 읽어
// 문자열/정규식으로 배선 계약을 단언한다.
import fs from 'fs';
import path from 'path';
import { stripComments } from '../../test-utils/stripComments';

const APP_DIR = path.join(__dirname, '..');
const SRC_DIR = path.join(__dirname, '..', '..');

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(APP_DIR, relativePath), 'utf-8');
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

  it('Test 2: migrateDbIfNeeded가 onInit prop 한 곳에서만 참조된다 (Pitfall 3 회귀 가드)', () => {
    // 문자열 패턴(`migrateDbIfNeeded(`)만 보는 이전 버전은 `const m = migrateDbIfNeeded;`
    // 같은 별칭(alias) 뒤 간접 호출로 우회될 수 있었다. import 줄을 제외한 코드에서
    // 식별자 자체의 총 등장 횟수를 세면, 별칭 대입도 두 번째 등장으로 잡아낸다.
    const codeOnly = stripComments(layoutSource)
      .split('\n')
      .filter((line) => !/^\s*import\s/.test(line))
      .join('\n');
    const occurrences = codeOnly.match(/\bmigrateDbIfNeeded\b/g) ?? [];
    expect(occurrences).toHaveLength(1);
  });

  it('Test 3: useFonts(newsreaderFonts)와 SplashScreen.preventAutoHideAsync()를 포함한다', () => {
    expect(layoutSource).toMatch(/useFonts\(newsreaderFonts\)/);
    expect(layoutSource).toMatch(/SplashScreen\.preventAutoHideAsync\(\)/);
  });

  it('Test 8: GestureHandlerRootView로 트리를 감싼다 (제스처 기반 UI를 쓰는 이후 phase 대비)', () => {
    expect(layoutSource).toMatch(/GestureHandlerRootView/);
  });
});

describe('src/app/+not-found.tsx', () => {
  it('Test 9: app.json의 footlog:// 스킴에 대응하는 not-found 라우트가 존재한다', () => {
    const notFoundPath = path.join(APP_DIR, '+not-found.tsx');
    expect(fs.existsSync(notFoundPath)).toBe(true);
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
