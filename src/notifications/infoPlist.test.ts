/**
 * @jest-environment node
 */
// src/notifications/infoPlist.test.ts
// Notification infrastructure phase(02-02-PLAN.md Task 2)의 iOS 권한 문구 회귀 가드.
//
// 이 테스트가 존재하는 이유(02-RESEARCH.md Common Pitfalls §Pitfall 5):
// Phase 3(expo-location)/Phase 4(expo-image-picker)가 각 패키지의 config plugin을
// app.json expo.plugins에 추가하면서, plugin 옵션(locationWhenInUsePermission 등)이
// 기본값(영어)으로 ios.infoPlist의 한국어 문구를 조용히 덮어쓸 위험이 있다.
// fs.readFileSync + JSON.parse로 app.json을 정적으로 읽어(require의 모듈 캐시 영향을
// 배제) 문구와 plugin 옵션 부재를 단언한다 — foundation-wiring.test.ts와 동일한 패턴.
import fs from 'fs';
import path from 'path';

const APP_JSON_PATH = path.join(__dirname, '../../app.json');

function readAppJson(): any {
  const raw = fs.readFileSync(APP_JSON_PATH, 'utf-8');
  return JSON.parse(raw);
}

// D-03 원문 그대로 하드코딩(창업자 최종 확인 대기 중인 초안 — TODOS.md 참고).
const EXPECTED = {
  NSLocationWhenInUseUsageDescription: '체크인 위치를 기록하려면 위치 정보가 필요해요.',
  NSCameraUsageDescription: '체크인에 사진을 남기려면 카메라 접근이 필요해요.',
  NSPhotoLibraryUsageDescription: '체크인에 사진을 첨부하려면 사진 보관함 접근이 필요해요.',
};

describe('app.json ios.infoPlist 권한 문구 회귀 가드', () => {
  const appJson = readAppJson();
  const infoPlist = appJson.expo.ios.infoPlist;

  it('Test 1: NSLocationWhenInUseUsageDescription이 D-03 원문과 정확히 일치한다', () => {
    expect(infoPlist.NSLocationWhenInUseUsageDescription).toBe(
      EXPECTED.NSLocationWhenInUseUsageDescription
    );
  });

  it('Test 2: NSCameraUsageDescription이 D-03 원문과 정확히 일치한다', () => {
    expect(infoPlist.NSCameraUsageDescription).toBe(EXPECTED.NSCameraUsageDescription);
  });

  it('Test 3: NSPhotoLibraryUsageDescription이 D-03 원문과 정확히 일치한다', () => {
    expect(infoPlist.NSPhotoLibraryUsageDescription).toBe(
      EXPECTED.NSPhotoLibraryUsageDescription
    );
  });

  it('Test 4: 세 문구 모두 ASCII 알파벳을 포함하지 않는다 (D-04 한국어 단일 언어)', () => {
    for (const key of Object.keys(EXPECTED) as Array<keyof typeof EXPECTED>) {
      expect(infoPlist[key]).not.toMatch(/[A-Za-z]/);
    }
  });

  it('Test 5: ITSAppUsesNonExemptEncryption이 false로 유지된다 (Phase 1 설정 회귀 가드)', () => {
    expect(infoPlist.ITSAppUsesNonExemptEncryption).toBe(false);
  });

  it('Test 6: expo.plugins에 permission config plugin 옵션이 아직 등장하지 않는다 (Pitfall 5 게이트)', () => {
    // 이 테스트가 실패하면(Phase 3/4가 expo-location/expo-image-picker plugin을 추가하면)
    // 위 문구를 삭제하는 게 아니라, 해당 plugin 옵션(locationWhenInUsePermission/
    // cameraPermission/photosPermission)으로 D-03 한국어 문구를 이관해야 한다.
    const pluginsSerialized = JSON.stringify(appJson.expo.plugins);
    expect(pluginsSerialized).not.toMatch(/locationWhenInUsePermission/);
    expect(pluginsSerialized).not.toMatch(/cameraPermission/);
    expect(pluginsSerialized).not.toMatch(/photosPermission/);
  });
});
