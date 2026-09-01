/**
 * @jest-environment node
 */
// src/checkin/__tests__/nativeDeps.test.ts
// Phase 3 체크인 코어 루프(03-01-PLAN.md Task 1/3)의 네이티브 패키지 설치 + 런타임 import
// 격리 회귀 가드.
// - Task 1 테스트: src/notifications/infoPlist.test.ts와 동일한 패턴으로
//   fs.readFileSync + JSON.parse를 통해 package.json을 정적으로 읽어(require 모듈 캐시
//   영향 배제) dependencies 존재/버전을 단언한다.
// - Task 3 테스트: src/app/__tests__/foundation-wiring.test.ts의 디렉터리 스캔 기반
//   격리 회귀 가드(collectSourceFiles)와 동일한 구조로, src/checkin/ 하위에서 네이티브
//   패키지를 런타임 import하는 파일이 deps.ts 하나뿐임을 단언한다.
// RN 렌더 환경이 필요 없으므로 @jest-environment node를 쓴다.
import fs from 'fs';
import path from 'path';
import { stripComments } from '../../test-utils/stripComments';

const PACKAGE_JSON_PATH = path.join(__dirname, '../../../package.json');
const CHECKIN_DIR = path.join(__dirname, '..');

function readPackageJson(): any {
  const raw = fs.readFileSync(PACKAGE_JSON_PATH, 'utf-8');
  return JSON.parse(raw);
}

const EXPO_STAR_PACKAGES = [
  'expo-location',
  'expo-image-picker',
  'expo-file-system',
  'expo-crypto',
  'expo-image-manipulator',
];
const ALL_NATIVE_PACKAGES = [...EXPO_STAR_PACKAGES, 'react-native-maps'];

describe('package.json 네이티브 모듈 6종 설치 회귀 가드', () => {
  const packageJson = readPackageJson();

  it('Test 1: 6개 패키지 전부 dependencies에 존재한다', () => {
    for (const pkg of ALL_NATIVE_PACKAGES) {
      expect(packageJson.dependencies[pkg]).toBeDefined();
    }
  });

  it('Test 2: expo-* 5종의 버전 문자열이 ~57.로 시작한다(SDK 57 호환 범위 관례)', () => {
    for (const pkg of EXPO_STAR_PACKAGES) {
      expect(packageJson.dependencies[pkg]).toMatch(/^~57\./);
    }
  });
});

// src/checkin/ 하위 모든 .ts/.tsx 파일을 재귀 수집한다(foundation-wiring.test.ts
// collectSourceFiles와 동일 구현).
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

describe('src/checkin/ 네이티브 패키지 런타임 import 격리 회귀 가드', () => {
  it('Test 3: expo-location/expo-image-picker/expo-file-system/expo-crypto/expo-image-manipulator를 런타임(import type이 아닌) import하는 파일이 deps.ts 하나뿐이다', () => {
    const allFiles = collectSourceFiles(CHECKIN_DIR);
    const offenders: string[] = [];

    for (const filePath of allFiles) {
      // 테스트 파일은 이 가드의 대상이 아니다(더블 자체 테스트는 네이티브 패키지를
      // import하지 않는 것이 별도 acceptance criteria로 이미 강제됨).
      if (/\.test\.(ts|tsx)$/.test(filePath)) continue;

      const relativePath = path.relative(CHECKIN_DIR, filePath);
      const source = fs.readFileSync(filePath, 'utf-8');
      const codeOnly = stripComments(source);

      const hasRuntimeImport = EXPO_STAR_PACKAGES.some((pkg) => {
        // `import type ... from 'pkg'`는 컴파일 시 지워지므로 격리 위반이 아니다 —
        // `import type`이 아닌 `from 'pkg'` 등장만 위반으로 잡는다.
        const runtimeImportPattern = new RegExp(
          `^import(?!\\s+type\\b)[^\\n]*from ['"]${pkg}['"]`,
          'm'
        );
        return runtimeImportPattern.test(codeOnly);
      });

      if (hasRuntimeImport) {
        offenders.push(relativePath);
      }
    }

    expect(offenders).toEqual(['deps.ts']);
  });
});
