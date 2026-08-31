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

const sheetSource = fs.readFileSync(path.join(__dirname, '..', 'TodayBottomSheet.tsx'), 'utf-8');
const sheetCodeOnly = stripComments(sheetSource);

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

describe('TodayBottomSheet 리스트 렌더링 (Anti-Pattern 가드)', () => {
  it('Test 9: BottomSheetFlatList를 사용한다', () => {
    expect(sheetCodeOnly).toMatch(/BottomSheetFlatList/);
  });

  it('Test 10: 플레인 FlatList/ScrollView가 등장하지 않는다', () => {
    expect(sheetCodeOnly).not.toMatch(/<FlatList/);
    expect(sheetCodeOnly).not.toMatch(/<ScrollView/);
  });

  it('Test 11: 중첩 GestureHandlerRootView가 등장하지 않는다', () => {
    expect(sheetCodeOnly).not.toMatch(/GestureHandlerRootView/);
  });
});

describe('TodayBottomSheet 애니메이션/문구/스타일 토큰 규율', () => {
  it('Test 12: motion.bottomSheetSnapMs 참조가 존재한다', () => {
    expect(sheetCodeOnly).toMatch(/motion\.bottomSheetSnapMs/);
  });

  it('Test 13: TODAY_COPY.emptyState 참조가 존재하고 문구 리터럴이 하드코딩되지 않는다', () => {
    expect(sheetCodeOnly).toMatch(/TODAY_COPY\.emptyState/);
    expect(sheetCodeOnly).not.toContain('아직 기록이 없어요');
  });

  it('Test 14: colors.surface / radius.lg 표면 스타일이 존재한다', () => {
    expect(sheetCodeOnly).toMatch(/colors\.surface/);
    expect(sheetCodeOnly).toMatch(/radius\.lg/);
  });

  it('Test 15: colors.accent가 등장하지 않는다', () => {
    expect(sheetCodeOnly).not.toMatch(/colors\.accent\b/);
  });

  it("Test 16: position: 'absolute'가 등장하지 않는다 (배치는 부모 책임)", () => {
    expect(sheetCodeOnly).not.toMatch(/position:\s*'absolute'/);
  });

  it('Test 17: 리터럴 80이 등장하지 않는다 (CLOSED 높이는 토큰에서 파생)', () => {
    expect(sheetCodeOnly).not.toMatch(/\b80\b/);
  });

  it('Test 18: LIST_ROW_MIN_HEIGHT를 import해 CLOSED 높이 계산에 재사용한다', () => {
    expect(sheetCodeOnly).toMatch(/LIST_ROW_MIN_HEIGHT/);
  });

  it('Test 19: hex 컬러 리터럴이 등장하지 않는다', () => {
    expect(sheetCodeOnly).not.toMatch(/#[0-9a-fA-F]{3,6}\b/);
  });

  it('Test 20: containerHeight가 0 이하일 때 null을 반환하는 조기 반환이 존재한다', () => {
    expect(sheetCodeOnly).toMatch(/containerHeight\s*<=\s*0/);
  });
});
