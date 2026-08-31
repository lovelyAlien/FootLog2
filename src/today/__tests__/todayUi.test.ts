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

// Test 1 반전 근거 — Phase 4 D-03(04-CONTEXT.md)은 "이 행은 비인터랙티브하다"는
// 계약이었다. Phase 5(05-CONTEXT.md/05-UI-SPEC.md)가 상세화면 진입점을 새로 만들면서
// 이 계약을 명시적으로 뒤집는다 — 아래 단언은 회귀가 아니라 05-05-PLAN.md Task 2가
// 의도한 D-03 반전이다. 다만 chevron 부재 단언은 살아있다 — Phase 5도 "탭 가능함을
// 암시하는 새 시각 요소는 추가하지 않는다"는 결정을 그대로 유지한다(05-UI-SPEC.md).
describe('CheckinListRow 탭 가능 전환 (D-03 반전, 05-05-PLAN.md Task 2)', () => {
  it('Test 1: Pressable과 onPress가 등장한다(탭 가능) — 그러나 chevron과 TouchableOpacity는 여전히 등장하지 않는다', () => {
    expect(rowCodeOnly).toMatch(/Pressable/);
    expect(rowCodeOnly).toMatch(/onPress/);
    expect(rowCodeOnly).not.toMatch(/TouchableOpacity/);
    expect(rowCodeOnly).not.toMatch(/chevron/i);
  });

  it('Test 1b: ReanimatedSwipeable이 react-native-gesture-handler/ReanimatedSwipeable 경로로 import되고, 구 Swipeable 클래스는 단독 import되지 않는다', () => {
    expect(rowCodeOnly).toMatch(/from 'react-native-gesture-handler\/ReanimatedSwipeable'/);
    expect(rowCodeOnly).not.toMatch(/^import \{ Swipeable/m);
  });

  // activeOffsetX/failOffsetY는 설치된 ReanimatedSwipeable(react-native-gesture-handler
  // @2.32.0)의 SwipeableProps에 존재하지 않는다(node_modules 소스 직접 확인) — 대신
  // 실제로 존재하는 dragOffsetFromLeftEdge/dragOffsetFromRightEdge가 내부적으로
  // activeOffsetX와 동일한 효과를 낸다(ReanimatedSwipeable.tsx 502~506줄).
  it('Test 1c: dragOffsetFromLeftEdge와 dragOffsetFromRightEdge가 등장한다 (BottomSheetFlatList 세로 팬 제스처 경합 완화, 05-RESEARCH.md Pitfall 3)', () => {
    expect(rowCodeOnly).toMatch(/dragOffsetFromLeftEdge/);
    expect(rowCodeOnly).toMatch(/dragOffsetFromRightEdge/);
  });

  it('Test 1d: 삭제 어포던스 폭 72와 SwipeDirection.RIGHT 비교가 존재한다', () => {
    expect(rowCodeOnly).toMatch(/\b72\b/);
    expect(rowCodeOnly).toMatch(/SwipeDirection\.RIGHT/);
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
  // Test 6은 반전 대상이 아니다 — 한 글자도 고치지 않는다. 삭제 어포던스는
  // colors.accent가 아니라 colors.pin(테라코타)을 쓰므로 이 단언은 05-05-PLAN.md
  // 이후에도 수정 없이 통과해야 하며, DESIGN.md 2026-08-31 갱신(accent = 캘린더 탭
  // 전용 2개) 이후 오히려 더 강한 의미를 갖는다. 이 테스트가 빨간불이 되면 어포던스
  // 색을 잘못 넣은 것이다 — 테스트가 아니라 코드를 고쳐야 한다.
  it('Test 6: colors.accent가 등장하지 않는다', () => {
    expect(rowCodeOnly).not.toMatch(/colors\.accent\b/);
  });

  it('Test 7: hex 컬러 리터럴이 등장하지 않는다', () => {
    expect(rowCodeOnly).not.toMatch(/#[0-9a-fA-F]{3,6}\b/);
  });

  it('Test 8: LIST_ROW_MIN_HEIGHT = 44 상수가 정확히 선언된다', () => {
    expect(rowSource).toMatch(/export const LIST_ROW_MIN_HEIGHT = 44/);
  });

  // 새 색상 가드(05-05-PLAN.md Task 2) — 삭제 어포던스 색이 Pin인 근거는 DESIGN.md
  // Decisions Log 2026-09-01(accent→Pin 전환)이다. colors.pin은 정확히 1회, 삭제
  // 어포던스 배경에만 등장해야 하고 colors.pinSoft(저장된 핀용 옅은 톤)는 등장하지
  // 않아야 한다 — pinSoft가 어포던스에 잘못 쓰이면 삭제 의미가 흐려진다.
  it('Test 8b (2026-09-01 추가): colors.pin이 정확히 1회, 삭제 어포던스 배경(deleteAffordance)에만 등장한다', () => {
    const pinOccurrences = rowCodeOnly.match(/colors\.pin\b(?!Soft)/g) ?? [];
    expect(pinOccurrences).toHaveLength(1);
    const affordanceBlockMatch = rowCodeOnly.match(/deleteAffordance:\s*\{[\s\S]*?\},/);
    expect(affordanceBlockMatch).not.toBeNull();
    expect(affordanceBlockMatch ? affordanceBlockMatch[0] : '').toMatch(
      /backgroundColor:\s*colors\.pin\b(?!Soft)/
    );
  });

  it('Test 8c: colors.pinSoft가 등장하지 않는다 (저장된 핀용 옅은 톤을 어포던스에 쓰지 않는다)', () => {
    expect(rowCodeOnly).not.toMatch(/colors\.pinSoft\b/);
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

  // 05-05-PLAN.md Task 2 — 어포던스는 CheckinListRow 안에만 있다는 계약의 색상
  // 측면 가드. 시트 자신은 colors.pin도 도입하지 않는다.
  it('Test 15b (2026-09-01 추가): colors.pin도 등장하지 않는다 (어포던스는 CheckinListRow 안에만 있다)', () => {
    expect(sheetCodeOnly).not.toMatch(/colors\.pin\b/);
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

describe('TodayBottomSheet 콜백 순수 전달 계약 (05-05-PLAN.md Task 2 — 행 탭/스와이프 삭제 배선)', () => {
  it('Test 21: onRowPress/onDeleteRequest를 CheckinListRow에 그대로 전달한다', () => {
    expect(sheetCodeOnly).toMatch(/onRowPress:\s*\(id:\s*string\)\s*=>\s*void/);
    expect(sheetCodeOnly).toMatch(/onDeleteRequest:\s*\(checkin:\s*CheckinRow\)\s*=>\s*void/);
    expect(sheetCodeOnly).toMatch(/onPress=\{onRowPress\}/);
    expect(sheetCodeOnly).toMatch(/onDeleteRequest=\{onDeleteRequest\}/);
  });

  it('Test 22: 시트 코드에 deleteCheckin이나 router가 등장하지 않는다 (순수 전달 계약 — 삭제/네비게이션 로직을 갖지 않는다)', () => {
    expect(sheetCodeOnly).not.toMatch(/deleteCheckin/);
    expect(sheetCodeOnly).not.toMatch(/\brouter\./);
  });
});
