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
const TODAY_SCREEN_PATH = path.join('(tabs)', 'index', 'index.tsx');

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

describe('src/app/(tabs)/index.tsx 배선 계약', () => {
  const indexSource = readSource(TODAY_SCREEN_PATH);

  it('Test 4: src/theme/tokens에서 colors, typography, spacing을 import한다', () => {
    // Phase 4(04-03-PLAN.md Task 2)가 이 화면을 (tabs) 그룹 안으로 옮기며 상대
    // 경로가 한 단계 깊어졌다(../theme/tokens → ../../theme/tokens) — (\.\.\/)?
    // 를 (\.\.\/)*로 완화해 임의 깊이의 상대 경로를 허용한다.
    expect(indexSource).toMatch(/from ['"](\.\.\/)*(@\/)?(src\/)?theme\/tokens['"]/);
    expect(indexSource).toMatch(/colors/);
    expect(indexSource).toMatch(/typography/);
    expect(indexSource).toMatch(/spacing/);
  });

  it('Test 6 (2026-08-31 갱신): colors.accent가 이 화면에서 전혀 등장하지 않는다 — 체크인/지도 마커/재센터 아이콘이 모두 colors.pin으로 통일됨', () => {
    // 2026-08-31 — 지도 위 체크인 핀(진행 중/저장됨)과 이동 궤적선에 이어, 체크인
    // 버튼(+캡처 중 상태)과 재센터 버튼 아이콘도 colors.pin/pinSoft(테라코타,
    // DESIGN.md 참고)로 전환했다. 이 화면 안에서 accent는 더 이상 쓰이지 않는다 —
    // 남은 accent 승인 용도(오늘 표시 밑줄, 스크러버)는 캘린더 탭 소관이라 이
    // 파일과 무관하다.
    const codeOnly = stripComments(indexSource);
    // colors.accentSoft는 별도 토큰이라 단어 경계(\b)가 accent와 Soft 사이에서
    // 끊기지 않으므로 이 정규식에 걸리지 않는다 — colors.accent만 정확히 센다.
    const occurrences = codeOnly.match(/\bcolors\.accent\b/g) ?? [];
    expect(occurrences.length).toBe(0);
    expect(codeOnly).not.toMatch(/\bcolors\.accentSoft\b/);

    expect(codeOnly).toMatch(/checkinButton:\s*\{[^}]*backgroundColor:\s*colors\.pin\b/s);
    // 지도 마커가 accent로 되돌아가는 회귀를 막는다 — pinConfident는 colors.pin이어야 한다.
    expect(codeOnly).not.toMatch(/pinConfident:\s*\{[^}]*backgroundColor:\s*colors\.accent\b/s);
    expect(codeOnly).toMatch(/pinConfident:\s*\{[^}]*backgroundColor:\s*colors\.pin\b/s);
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
      // 재센터 버튼 shadowColor: '#000' 예외 — Apple Maps 스타일 섀도우는 시멘틱 색상 범주 밖
      // (DESIGN.md 2026-09-01, 동일 예외 범주는 mapControlButtonBackground/mapControlIcon/
      // mapControlBadgeBackground/mapControlBadgeNeedle)
      const codeSansRecenterShadow = codeOnly.replace(/shadowColor:\s*['"]#000['"]/g, '');
      if (/#[0-9A-Fa-f]{3,6}\b/.test(codeSansRecenterShadow)) {
        offenders.push(relativePath);
      }
    }

    expect(offenders).toEqual([]);
  });
});
