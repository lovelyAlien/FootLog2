/**
 * @jest-environment node
 */
// src/checkin/__tests__/nativeDeps.test.ts
// Phase 3 체크인 코어 루프(03-01-PLAN.md Task 1)의 네이티브 패키지 설치 회귀 가드.
// src/notifications/infoPlist.test.ts와 동일한 패턴: fs.readFileSync + JSON.parse로
// package.json을 정적으로 읽어(require 모듈 캐시 영향 배제) dependencies 존재/버전을
// 단언한다. RN 렌더 환경이 필요 없으므로 @jest-environment node를 쓴다.
import fs from 'fs';
import path from 'path';

const PACKAGE_JSON_PATH = path.join(__dirname, '../../../package.json');

function readPackageJson(): any {
  const raw = fs.readFileSync(PACKAGE_JSON_PATH, 'utf-8');
  return JSON.parse(raw);
}

const EXPO_STAR_PACKAGES = ['expo-location', 'expo-image-picker', 'expo-file-system', 'expo-crypto'];
const ALL_NATIVE_PACKAGES = [...EXPO_STAR_PACKAGES, 'react-native-maps'];

describe('package.json 네이티브 모듈 5종 설치 회귀 가드', () => {
  const packageJson = readPackageJson();

  it('Test 1: 5개 패키지 전부 dependencies에 존재한다', () => {
    for (const pkg of ALL_NATIVE_PACKAGES) {
      expect(packageJson.dependencies[pkg]).toBeDefined();
    }
  });

  it('Test 2: expo-* 4종의 버전 문자열이 ~57.로 시작한다(SDK 57 호환 범위 관례)', () => {
    for (const pkg of EXPO_STAR_PACKAGES) {
      expect(packageJson.dependencies[pkg]).toMatch(/^~57\./);
    }
  });
});
