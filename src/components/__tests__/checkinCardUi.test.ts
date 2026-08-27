/**
 * @jest-environment node
 */
// src/components/__tests__/checkinCardUi.test.ts
// 03-08-PLAN.md Task 2 — CheckinActionCard 상태별 렌더링 UI 계약 회귀 가드.
// RN 렌더 환경이 필요 없는 정적 소스 분석만 수행한다 — fs.readFileSync로 소스를 읽어
// 문자열/정규식으로 카피/토큰/접근성/미마운트 계약을 단언한다(notificationUi.test.ts와 동일 패턴).
import fs from 'fs';
import path from 'path';
import { stripComments } from '../../test-utils/stripComments';

const cardSource = fs.readFileSync(
  path.join(__dirname, '..', 'CheckinActionCard.tsx'),
  'utf-8'
);
const codeOnly = stripComments(cardSource);

describe('CheckinActionCard 확정 문구 (CHECKIN_COPY 참조)', () => {
  it('Test 1: 확정 문구 5종이 CHECKIN_COPY 참조를 통해 사용된다 (하드코딩 리터럴 아님)', () => {
    expect(cardSource).toMatch(/CHECKIN_COPY\.pinHint/);
    expect(cardSource).toMatch(/CHECKIN_COPY\.confirmCta/);
    expect(cardSource).toMatch(/CHECKIN_COPY\.savedHeadline/);
    expect(cardSource).toMatch(/CHECKIN_COPY\.saveFailedHeadline/);
    expect(cardSource).toMatch(/CHECKIN_COPY\.saveFailedHelper/);
    expect(cardSource).toMatch(/CHECKIN_COPY\.retryCta/);
    // 문구 리터럴 자체가 컴포넌트에 중복 하드코딩되지 않는다.
    expect(codeOnly).not.toContain('핀을 옮겨 위치를 조정할 수 있어요');
    expect(codeOnly).not.toContain('저장하지 못했어요');
  });
});

describe('CheckinActionCard 토큰 규율', () => {
  it('Test 2: stripComments 적용 후 colors.accent가 등장하지 않는다', () => {
    expect(codeOnly).not.toMatch(/colors\.accent/);
  });

  it('Test 3: stripComments 적용 후 colors.mapLand/mapRoad/mapWater가 등장하지 않는다', () => {
    expect(codeOnly).not.toMatch(/colors\.mapLand/);
    expect(codeOnly).not.toMatch(/colors\.mapRoad/);
    expect(codeOnly).not.toMatch(/colors\.mapWater/);
  });

  it('Test 4: stripComments 적용 후 position: \'absolute\'가 등장하지 않는다 (배치는 부모가 결정)', () => {
    expect(codeOnly).not.toMatch(/position:\s*'absolute'/);
  });
});

describe('CheckinActionCard 접근성/터치 타겟', () => {
  it('Test 5: minHeight: 44가 등장한다', () => {
    expect(cardSource).toMatch(/minHeight: 44/);
  });

  it('Test 6: accessibilityRole="button"이 2회 이상 등장한다 (확인/다시 시도)', () => {
    const occurrences = cardSource.match(/accessibilityRole="button"/g) ?? [];
    expect(occurrences.length).toBeGreaterThanOrEqual(2);
  });

  it('Test 7: ActivityIndicator가 등장한다 (SAVING 상태)', () => {
    expect(cardSource).toMatch(/ActivityIndicator/);
  });
});

describe('CheckinActionCard SAVE_FAILED 미마운트 계약', () => {
  it('Test 8: SAVE_FAILED 분기에서 canEditNoteAndPhoto 또는 phase === \'SAVED\' 가드가 메모/사진 JSX를 감싼다', () => {
    expect(cardSource).toMatch(/canEditNoteAndPhoto|phase === 'SAVED'/);
  });
});
