/**
 * @jest-environment node
 */
// src/today/__tests__/todayUi.test.ts
// 04-04-PLAN.md Task 2/3 — CheckinListRow / TodayBottomSheet UI 계약 회귀 가드
// (D-01/D-02/D-03). RN 렌더 환경이 필요 없는 정적 소스 분석만 수행한다 —
// fs.readFileSync로 소스를 읽어 문자열/정규식으로 토큰/미마운트 계약을 단언한다
// (checkinCardUi.test.ts와 동일 패턴).
import fs from 'fs';
import path from 'path';
import { stripComments } from '../../test-utils/stripComments';

const rowSource = fs.readFileSync(path.join(__dirname, '..', 'CheckinListRow.tsx'), 'utf-8');
const rowCodeOnly = stripComments(rowSource);

describe('CheckinListRow 비인터랙티브 계약 (D-03)', () => {
  it('Test 1: Pressable/TouchableOpacity/onPress/chevron이 등장하지 않는다', () => {
    expect(rowCodeOnly).not.toMatch(/Pressable/);
    expect(rowCodeOnly).not.toMatch(/TouchableOpacity/);
    expect(rowCodeOnly).not.toMatch(/onPress/);
    expect(rowCodeOnly).not.toMatch(/chevron/i);
  });
});

describe('CheckinListRow 필드 구성 (D-01/D-02)', () => {
  it('Test 2: typography.placeName이 등장하지 않는다 (장소명 필드 미사용)', () => {
    expect(rowCodeOnly).not.toMatch(/typography\.placeName/);
  });

  it('Test 3: formatLocalTime 참조가 존재한다', () => {
    expect(rowCodeOnly).toMatch(/formatLocalTime\(/);
  });

  it('Test 4: numberOfLines={1}이 존재한다 (메모 미리보기 1줄)', () => {
    expect(rowCodeOnly).toMatch(/numberOfLines=\{1\}/);
  });

  it('Test 5: typography.journalEntry가 메모 미리보기 한 곳에만 등장한다', () => {
    const occurrences = rowCodeOnly.match(/typography\.journalEntry/g) ?? [];
    expect(occurrences).toHaveLength(1);
  });
});

describe('CheckinListRow 토큰 규율', () => {
  it('Test 6: colors.accent가 등장하지 않는다', () => {
    expect(rowCodeOnly).not.toMatch(/colors\.accent\b/);
  });

  it('Test 7: hex 컬러 리터럴이 등장하지 않는다', () => {
    expect(rowCodeOnly).not.toMatch(/#[0-9a-fA-F]{3,6}\b/);
  });

  it('Test 8: LIST_ROW_MIN_HEIGHT = 44 상수가 정확히 선언된다', () => {
    expect(rowSource).toMatch(/export const LIST_ROW_MIN_HEIGHT = 44/);
  });
});
