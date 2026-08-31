/**
 * @jest-environment node
 */
// src/app/__tests__/notification-wiring.test.ts
// Plan 02-07 배선 계약 회귀 가드. foundation-wiring.test.ts와 동일한 기법(정적
// 소스 분석, fs.readFileSync + stripComments + collectSourceFiles)을 그대로
// 재사용한다 — RN 렌더 환경이 필요 없다.
import fs from 'fs';
import path from 'path';
import { stripComments } from '../../test-utils/stripComments';

const APP_DIR = path.join(__dirname, '..');
const SRC_DIR = path.join(__dirname, '..', '..');
const TODAY_SCREEN_PATH = path.join('(tabs)', 'index.tsx');

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

// Test 3/9가 스캔에서 제외할 파일: 테스트 자체와 테스트 더블(testing/ 하위)은
// 이 배선 계약의 대상이 아니다.
function isExcludedFromWiringContract(relativePath: string): boolean {
  return /\.test\.(ts|tsx)$/.test(relativePath) || relativePath.split(path.sep).includes('testing');
}

describe('src/app/_layout.tsx 배선 계약 (Plan 02-07)', () => {
  const layoutSource = readSource('_layout.tsx');

  it('Test 1: <SafeAreaProvider>로 트리를 감싼다 (priming의 useSafeAreaInsets 요구)', () => {
    expect(layoutSource).toMatch(/<SafeAreaProvider>/);
  });

  it('Test 2: runForegroundNotificationCheck가 import 줄 제외 정확히 1회 등장한다', () => {
    // foundation-wiring.test.ts Test 2와 동일 기법 — 별칭 대입을 통한 중복 호출
    // 우회까지 잡기 위해 import 줄을 제외한 코드에서 식별자 등장 횟수를 센다.
    const codeOnly = stripComments(layoutSource)
      .split('\n')
      .filter((line) => !/^\s*import\s/.test(line))
      .join('\n');
    const occurrences = codeOnly.match(/\brunForegroundNotificationCheck\b/g) ?? [];
    expect(occurrences).toHaveLength(1);
  });

  it('Test 4: AppState가 (주석 제거 후) 등장하지 않는다 (구독 함수 우회 회귀 가드)', () => {
    const codeOnly = stripComments(layoutSource);
    expect(codeOnly).not.toMatch(/\bAppState\b/);
  });

  it('Test 5: onInit={migrateDbIfNeeded}가 그대로 있다 (Phase 1 배선 회귀 가드)', () => {
    expect(layoutSource).toMatch(/onInit=\{migrateDbIfNeeded\}/);
  });
});

describe('중복 자가진단 리스너 회귀 가드 (T-02-19)', () => {
  it('Test 3: runForegroundNotificationCheck를 참조하는 non-test 파일은 registry.ts와 _layout.tsx 2개뿐이다', () => {
    const allFiles = collectSourceFiles(SRC_DIR);
    const referencing: string[] = [];

    for (const filePath of allFiles) {
      const relativePath = path.relative(SRC_DIR, filePath);
      if (isExcludedFromWiringContract(relativePath)) continue;

      const codeOnly = stripComments(fs.readFileSync(filePath, 'utf-8'));
      if (/\brunForegroundNotificationCheck\b/.test(codeOnly)) {
        referencing.push(relativePath);
      }
    }

    expect(referencing.sort()).toEqual([path.join('app', '_layout.tsx'), path.join('notifications', 'registry.ts')]);
  });
});

describe('src/app/(tabs)/index.tsx 배선 계약 (Plan 02-07)', () => {
  const indexSource = readSource(TODAY_SCREEN_PATH);

  it('Test 6: <NotificationDeniedBanner />를 렌더링한다', () => {
    expect(indexSource).toMatch(/<NotificationDeniedBanner \/>/);
  });

  it('Test 7: <Redirect와 /priming을 포함한다', () => {
    expect(indexSource).toMatch(/<Redirect/);
    expect(indexSource).toMatch(/\/priming/);
  });

  it('Test 8: router.replace가 (주석 제거 후) 등장하지 않는다 (선언형 리다이렉트만 사용)', () => {
    const codeOnly = stripComments(indexSource);
    expect(codeOnly).not.toMatch(/router\.replace/);
  });
});

describe('expo-notifications 런타임 import 격리 회귀 가드 (Plan 01 계약, phase 전체)', () => {
  it('Test 9: src/notifications/ 하위 non-test 파일 중 expo-notifications를 런타임 import 하는 파일은 deps.ts 하나뿐이다', () => {
    const notificationsDir = path.join(SRC_DIR, 'notifications');
    const allFiles = collectSourceFiles(notificationsDir);
    const offenders: string[] = [];

    for (const filePath of allFiles) {
      const relativePath = path.relative(SRC_DIR, filePath);
      if (isExcludedFromWiringContract(relativePath)) continue;
      if (relativePath === path.join('notifications', 'deps.ts')) continue;

      const codeOnly = stripComments(fs.readFileSync(filePath, 'utf-8'))
        .split('\n')
        // 타입 전용 import(`import type ... from 'expo-notifications'`)는 런타임에
        // 네이티브 모듈을 로드하지 않으므로 제외한다 — config.ts가 이 형태로만
        // 참조한다.
        .filter((line) => !/^\s*import\s+type\s/.test(line))
        .join('\n');

      if (/from\s+['"]expo-notifications['"]/.test(codeOnly)) {
        offenders.push(relativePath);
      }
    }

    expect(offenders).toEqual([]);
  });
});

describe('priming 라우트 존재 회귀 가드', () => {
  it('Test 10: src/app/priming.tsx 파일이 존재한다 (typedRoutes가 /priming을 해석할 수 있는 전제)', () => {
    const primingPath = path.join(APP_DIR, 'priming.tsx');
    expect(fs.existsSync(primingPath)).toBe(true);
  });
});
