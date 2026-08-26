/**
 * @jest-environment node
 */
// src/components/__tests__/notificationUi.test.ts
// Plan 02-06 — 알림 거부 배너 + priming 화면의 UI 계약 회귀 가드.
// RN 렌더 환경이 필요 없는 정적 소스 분석만 수행한다 — fs.readFileSync로 소스를 읽어
// 문자열/정규식으로 카피/토큰/접근성 계약을 단언한다(src/app/__tests__/foundation-wiring.test.ts와 동일 패턴).
import fs from 'fs';
import path from 'path';
import { stripComments } from '../../test-utils/stripComments';

const bannerSource = fs.readFileSync(
  path.join(__dirname, '..', 'NotificationDeniedBanner.tsx'),
  'utf-8'
);
const primingSource = fs.readFileSync(
  path.join(__dirname, '..', '..', 'app', 'priming.tsx'),
  'utf-8'
);

describe('src/components/NotificationDeniedBanner.tsx 계약', () => {
  it('Test 1: 확정 카피 \'알림이 꺼져있어요 · 설정에서 켜기\'를 정확히 포함한다', () => {
    expect(bannerSource).toContain('알림이 꺼져있어요 · 설정에서 켜기');
  });

  it('Test 2: useNotificationPermissionBanner를 참조한다', () => {
    expect(bannerSource).toMatch(/useNotificationPermissionBanner/);
  });

  it('Test 3: 고정 불투명 배경(colors.surface)과 텍스트(colors.textMuted)를 사용한다', () => {
    expect(bannerSource).toMatch(/colors\.surface/);
    expect(bannerSource).toMatch(/colors\.textMuted/);
  });

  it('Test 7: minHeight: 44를 포함한다 (44pt 터치 타겟)', () => {
    expect(bannerSource).toMatch(/minHeight: 44/);
  });

  it('Test 8: accessibilityRole="button"과 accessibilityLabel을 포함한다', () => {
    expect(bannerSource).toMatch(/accessibilityRole="button"/);
    expect(bannerSource).toMatch(/accessibilityLabel/);
  });

  it('Test 9: expo-symbols/Image/Icon을 import 하지 않는다 (아이콘 없음이 명시 스펙)', () => {
    const codeOnly = stripComments(bannerSource);
    expect(codeOnly).not.toMatch(/expo-symbols/);
    expect(codeOnly).not.toMatch(/\bImage\b/);
    expect(codeOnly).not.toMatch(/\bIcon\b/);
  });
});

describe('src/app/priming.tsx 계약 (Task 1 산출물 회귀)', () => {
  it('Test 10: 확정 카피 3종(안내 문구 / 알림 허용하기 / 나중에)을 전부 포함한다', () => {
    expect(primingSource).toContain('매시간 알림으로 지금 어디 있는지 잠깐 기록해요');
    expect(primingSource).toContain('알림 허용하기');
    expect(primingSource).toContain('나중에');
  });

  it('Test 11: 문자열 FootLog가 등장하지 않는다 (REQ-app-name은 Phase 8 소관)', () => {
    expect(primingSource).not.toContain('FootLog');
  });

  it('Test 12: 알림 빈도 관련 문자열이 등장하지 않는다 (D-01 — 빈도 UI는 Phase 6 소관)', () => {
    expect(primingSource).not.toContain('3시간');
    expect(primingSource).not.toContain('끔');
    expect(primingSource).not.toContain('빈도');
  });
});

describe('두 파일 공통 토큰 규율', () => {
  it('Test 4: 어디에도 colors.accent가 등장하지 않는다 (stripComments 적용)', () => {
    expect(stripComments(bannerSource)).not.toMatch(/colors\.accent/);
    expect(stripComments(primingSource)).not.toMatch(/colors\.accent/);
  });

  it('Test 5: 어디에도 typography.journalEntry가 등장하지 않는다 (Newsreader = 사용자 작성 텍스트 전용)', () => {
    expect(stripComments(bannerSource)).not.toMatch(/journalEntry/);
    expect(stripComments(primingSource)).not.toMatch(/journalEntry/);
  });

  it('Test 6: 시맨틱 색 이름(red/orange/yellow/green)이 스타일 문자열 값으로 등장하지 않는다', () => {
    const semanticColorPattern = /['"](red|orange|yellow|green)['"]/;
    expect(stripComments(bannerSource)).not.toMatch(semanticColorPattern);
    expect(stripComments(primingSource)).not.toMatch(semanticColorPattern);
  });
});
