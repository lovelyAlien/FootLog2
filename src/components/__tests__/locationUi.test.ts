/**
 * @jest-environment node
 */
// src/components/__tests__/locationUi.test.ts
// Plan 03-05 Task 2 — 위치 권한 거부 배너 UI 계약 회귀 가드.
// RN 렌더 환경이 필요 없는 정적 소스 분석만 수행한다 — fs.readFileSync로 소스를 읽어
// 문자열/정규식으로 카피/토큰/접근성 계약을 단언한다
// (src/components/__tests__/notificationUi.test.ts와 동일 패턴).
import fs from 'fs';
import path from 'path';
import { stripComments } from '../../test-utils/stripComments';

const bannerSource = fs.readFileSync(
  path.join(__dirname, '..', 'LocationDeniedBanner.tsx'),
  'utf-8'
);

describe('src/components/LocationDeniedBanner.tsx 계약', () => {
  it("Test 1: 확정 카피 '위치 권한이 꺼져있어요 · 설정에서 켜기'를 정확히 포함한다 (가운뎃점 포함)", () => {
    expect(bannerSource).toContain('위치 권한이 꺼져있어요 · 설정에서 켜기');
  });

  it('Test 2: useLocationPermissionBanner를 참조한다', () => {
    expect(bannerSource).toMatch(/useLocationPermissionBanner/);
  });

  it('Test 3: colors.surface와 colors.textMuted를 사용한다', () => {
    expect(bannerSource).toMatch(/colors\.surface/);
    expect(bannerSource).toMatch(/colors\.textMuted/);
  });

  it('Test 4: minHeight: 44를 포함한다 (44pt 터치 타겟)', () => {
    expect(bannerSource).toMatch(/minHeight: 44/);
  });

  it('Test 5: accessibilityRole="button"과 accessibilityLabel을 포함한다', () => {
    expect(bannerSource).toMatch(/accessibilityRole="button"/);
    expect(bannerSource).toMatch(/accessibilityLabel/);
  });

  it('Test 6: stripComments 적용 후 expo-symbols/Image/Icon/colors.accent/opacity/rgba가 등장하지 않는다', () => {
    const codeOnly = stripComments(bannerSource);
    expect(codeOnly).not.toMatch(/expo-symbols/);
    expect(codeOnly).not.toMatch(/\bImage\b/);
    expect(codeOnly).not.toMatch(/\bIcon\b/);
    expect(codeOnly).not.toMatch(/colors\.accent/);
    expect(codeOnly).not.toMatch(/opacity/);
    expect(codeOnly).not.toMatch(/rgba/);
  });

  it("Test 7: stripComments 적용 후 position: 'absolute'가 등장하지 않는다 (배치는 부모 결정 계약)", () => {
    const codeOnly = stripComments(bannerSource);
    expect(codeOnly).not.toMatch(/position:\s*'absolute'/);
  });

  it('Test 8: colors.mapLand/colors.mapRoad/colors.mapWater가 등장하지 않는다', () => {
    expect(bannerSource).not.toMatch(/colors\.mapLand/);
    expect(bannerSource).not.toMatch(/colors\.mapRoad/);
    expect(bannerSource).not.toMatch(/colors\.mapWater/);
  });
});
