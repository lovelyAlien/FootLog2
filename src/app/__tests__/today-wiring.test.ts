/**
 * @jest-environment node
 */
// src/app/__tests__/today-wiring.test.ts
// 04-05-PLAN.md Task 2 배선 계약 회귀 가드. checkin-wiring.test.ts와 동일한 기법
// (정적 소스 분석, fs.readFileSync + stripComments)을 그대로 재사용한다 — RN 렌더
// 환경이 필요 없다.
//
// 모든 grep 계열 단언은 stripComments 적용본(codeOnly)을 대상으로 해 헤더 주석이
// 카운트를 오염시키지 않게 한다.
import fs from 'fs';
import path from 'path';
import { stripComments } from '../../test-utils/stripComments';

const APP_DIR = path.join(__dirname, '..');
const TODAY_SCREEN_PATH = path.join('(tabs)', 'index.tsx');

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(APP_DIR, relativePath), 'utf-8');
}

const indexSource = readSource(TODAY_SCREEN_PATH);
const codeOnly = stripComments(indexSource);

describe('src/app/(tabs)/index.tsx 단일 쿼리 계약 (04-CONTEXT.md D-11)', () => {
  it('getTodayCheckins( 호출이 파일 전체에서 정확히 1회 등장한다', () => {
    const occurrences = codeOnly.match(/getTodayCheckins\(/g) ?? [];
    expect(occurrences.length).toBe(1);
  });

  it('SQL 키워드가 등장하지 않는다 (checkin-wiring Test 12와 중복 확인)', () => {
    expect(codeOnly).not.toMatch(/\bINSERT \b|\bSELECT \b|\bUPDATE \b|\bDELETE \b/);
  });

  it('reloadTodayCheckins() 호출이 정확히 4회 등장한다', () => {
    const occurrences = codeOnly.match(/reloadTodayCheckins\(\)/g) ?? [];
    expect(occurrences.length).toBe(4);
  });

  it('commitCheckin 성공 분기(result.ok 블록) 안에 reloadTodayCheckins가 존재한다', () => {
    const match = codeOnly.match(/if \(result\.ok\) \{[\s\S]*?\n\s*\} else \{/);
    expect(match).not.toBeNull();
    const block = match ? match[0] : '';
    expect(block).toMatch(/reloadTodayCheckins\(\)/);
  });

  it('AppState 리스너의 nextAppState === \'active\' 분기 안에 reloadTodayCheckins가 존재한다', () => {
    const match = codeOnly.match(
      /if \(nextAppState === 'active'\) \{[\s\S]*?\n\s*\}/
    );
    expect(match).not.toBeNull();
    const block = match ? match[0] : '';
    expect(block).toMatch(/reloadTodayCheckins\(\)/);
  });
});

describe('src/app/(tabs)/index.tsx 저장된 핀 계약 (04-CONTEXT.md D-10)', () => {
  it('styles.pinSaved 정의가 존재하고 colors.pinSoft를 쓴다 (2026-08-31: accentSoft에서 전환)', () => {
    const match = codeOnly.match(/pinSaved:\s*\{[^}]*\},/s);
    expect(match).not.toBeNull();
    const block = match ? match[0] : '';
    expect(block).toMatch(/colors\.pinSoft\b/);
  });

  it('pinSaved 스타일 블록에 borderWidth/borderColor가 없다 (저장 후 3단계 시각 구분 미유지)', () => {
    const match = codeOnly.match(/pinSaved:\s*\{[^}]*\},/s);
    expect(match).not.toBeNull();
    const block = match ? match[0] : '';
    expect(block).not.toMatch(/borderWidth/);
    expect(block).not.toMatch(/borderColor/);
  });

  it('저장된 핀 마커에 draggable/onDragEnd가 붙지 않는다', () => {
    const match = codeOnly.match(/\{todayCheckins\.map\([\s\S]*?\n\s*\)\)\}/);
    expect(match).not.toBeNull();
    const block = match ? match[0] : '';
    expect(block).not.toMatch(/draggable/);
    expect(block).not.toMatch(/onDragEnd/);
  });

  it('pinStyleForSource가 todayCheckins.map 블록 안에서 호출되지 않는다', () => {
    const match = codeOnly.match(/\{todayCheckins\.map\([\s\S]*?\n\s*\)\)\}/);
    expect(match).not.toBeNull();
    const block = match ? match[0] : '';
    expect(block).not.toMatch(/pinStyleForSource/);
  });
});

describe('src/app/(tabs)/index.tsx 궤적선 계약 (REQ-trajectory-line)', () => {
  it('<Polyline이 정확히 1회 등장하고 strokeColor/strokeWidth를 확정값으로 쓴다', () => {
    const occurrences = codeOnly.match(/<Polyline/g) ?? [];
    expect(occurrences.length).toBe(1);
    const match = codeOnly.match(/<Polyline[\s\S]*?\/>/);
    expect(match).not.toBeNull();
    const block = match ? match[0] : '';
    expect(block).toMatch(/strokeColor=\{colors\.pinSoft\}/);
    expect(block).toMatch(/strokeWidth=\{TRAJECTORY_STROKE_WIDTH\}/);
  });

  it('TRAJECTORY_STROKE_WIDTH = 2 선언이 존재한다', () => {
    expect(codeOnly).toMatch(/const TRAJECTORY_STROKE_WIDTH = 2;/);
  });

  it('lineDashPattern이 등장하지 않는다 (04-UI-SPEC.md 실선 확정)', () => {
    expect(codeOnly).not.toMatch(/lineDashPattern/);
  });

  it('라벨/화살표 관련 식별자가 Polyline 렌더 주변에 등장하지 않는다', () => {
    const match = codeOnly.match(
      /\{trajectoryCoordinates\.length >= 2 && \([\s\S]*?\n\s*\)\}/
    );
    expect(match).not.toBeNull();
    const block = match ? match[0] : '';
    expect(block).not.toMatch(/<Callout/);
    expect(block).not.toMatch(/Marker\.Callout/);
    expect(block).not.toMatch(/title=/);
    expect(block).not.toMatch(/description=/);
    expect(block).not.toMatch(/arrow/);
  });

  it('trajectoryCoordinates.length >= 2 형태의 렌더 가드가 존재한다', () => {
    expect(codeOnly).toMatch(/trajectoryCoordinates\.length >= 2/);
  });
});

describe('src/app/(tabs)/index.tsx accent 예산 계약', () => {
  it('colors.accent(단어 경계)가 2회 이하로 유지된다 (2026-08-31: 지도 마커가 colors.pin으로 이전, foundation-wiring Test 6과 동일 상한)', () => {
    const occurrences = codeOnly.match(/\bcolors\.accent\b/g) ?? [];
    expect(occurrences.length).toBeLessThanOrEqual(2);
  });
});

describe('src/app/(tabs)/index.tsx 스코프 경계 계약 (D-03, Phase 5/7 미선점)', () => {
  it('상세화면 진입 식별자가 등장하지 않는다 (Phase 5 REQ-checkin-detail-base 소관)', () => {
    expect(codeOnly).not.toMatch(/router\.push/);
    expect(codeOnly).not.toMatch(/useRouter/);
    expect(codeOnly).not.toMatch(/<Link\b/);
  });

  it('"오늘 돌아보기"/reflection 관련 식별자가 등장하지 않는다 (Phase 7 소관)', () => {
    expect(codeOnly).not.toMatch(/오늘 돌아보기/);
    expect(codeOnly).not.toMatch(/reflection/i);
  });
});

// 04-06-PLAN.md Task 3 — 바텀시트 마운트 게이트(D-04), 플로팅 버튼 연속 오프셋(D-05),
// 탭바 불간섭(D-09) 배선 계약 회귀 가드. 아래 블록들은 codeOnly(stripComments 적용본)를
// 대상으로 단언한다.

// showActionCard 삼항의 false 분기(else 쪽)를 잘라낸다 — checkin-wiring.test.ts의
// 블록 추출 기법(정규식으로 특정 JSX 서브트리만 잘라 단언)과 동일한 방식.
const showActionCardFalseBranch = (() => {
  const match = codeOnly.match(/\)\s*:\s*\(\s*<>[\s\S]*?<\/>\s*\)\}/);
  return match ? match[0] : '';
})();

describe('src/app/(tabs)/index.tsx 바텀시트 마운트 게이트 계약 (04-CONTEXT.md D-04)', () => {
  it('<TodayBottomSheet가 정확히 1회 등장한다', () => {
    const occurrences = codeOnly.match(/<TodayBottomSheet/g) ?? [];
    expect(occurrences.length).toBe(1);
  });

  it('showActionCard 삼항의 false 분기(else 쪽) 안에 <TodayBottomSheet가 존재한다', () => {
    expect(showActionCardFalseBranch).not.toBe('');
    expect(showActionCardFalseBranch).toMatch(/<TodayBottomSheet/);
  });

  it('시트 주변에 "숨김" 표현(opacity: 0/display: none/enabled={false}/pointerEvents="none")이 등장하지 않는다 (언마운트 계약, 비활성화 아님)', () => {
    expect(codeOnly).not.toMatch(/opacity:\s*0\b/);
    expect(codeOnly).not.toMatch(/display:\s*['"]none['"]/);
    expect(codeOnly).not.toMatch(/enabled=\{false\}/);
    expect(codeOnly).not.toMatch(/pointerEvents=["']none["']/);
  });
});

describe('src/app/(tabs)/index.tsx 플로팅 버튼 연속 추적 계약 (04-CONTEXT.md D-05)', () => {
  it('useSharedValue 호출이 정확히 1회, useAnimatedStyle 호출이 1회 이상 등장한다', () => {
    const sharedValueCalls = codeOnly.match(/\buseSharedValue\(/g) ?? [];
    const animatedStyleCalls = codeOnly.match(/\buseAnimatedStyle\(/g) ?? [];
    expect(sharedValueCalls.length).toBe(1);
    expect(animatedStyleCalls.length).toBeGreaterThanOrEqual(1);
  });

  it('animatedPosition={ prop이 <TodayBottomSheet에 전달된다', () => {
    const match = codeOnly.match(/<TodayBottomSheet[\s\S]*?\/>/);
    expect(match).not.toBeNull();
    const block = match ? match[0] : '';
    expect(block).toMatch(/animatedPosition=\{/);
  });

  it('useAnimatedStyle 워크릿 본문에 spacing.lg가 등장한다 (D-05 기준 간격)', () => {
    const match = codeOnly.match(/useAnimatedStyle\(\(\) => \{[\s\S]*?\},\s*\[/);
    expect(match).not.toBeNull();
    const block = match ? match[0] : '';
    expect(block).toMatch(/spacing\.lg/);
  });

  it('checkinButtonContainer와 recenterButtonContainer를 쓰는 컨테이너가 각각 Reanimated.View로 렌더된다', () => {
    expect(codeOnly).toMatch(/<Reanimated\.View\s+style=\{\[styles\.checkinButtonContainer/);
    expect(codeOnly).toMatch(/<Reanimated\.View\s*\n?\s*style=\{\[styles\.recenterButtonContainer/);
  });

  it('react-native-reanimated default import가 Animated가 아니라 Reanimated로 바인딩된다 (RN Animated 섀도잉 회귀 가드)', () => {
    expect(codeOnly).toMatch(
      /import Reanimated, \{ useAnimatedStyle, useSharedValue \} from 'react-native-reanimated';/
    );
    expect(codeOnly).not.toMatch(/import Animated,[\s\S]{0,5}\{[\s\S]*?\} from 'react-native-reanimated';/);
  });
});

describe('src/app/(tabs)/index.tsx 탭바 불간섭 계약 (04-CONTEXT.md D-09)', () => {
  it('tabBarStyle/navigation.setOptions/useNavigation이 등장하지 않는다', () => {
    expect(codeOnly).not.toMatch(/tabBarStyle/);
    expect(codeOnly).not.toMatch(/navigation\.setOptions/);
    expect(codeOnly).not.toMatch(/useNavigation/);
  });
});

describe('src/app/(tabs)/index.tsx 제스처/레이어 계약', () => {
  it('GestureHandlerRootView가 등장하지 않는다 (중첩 금지 — 앱 루트에 이미 정확히 1개 존재)', () => {
    expect(codeOnly).not.toMatch(/GestureHandlerRootView/);
  });

  it('react-native-gesture-handler 직접 import가 없다', () => {
    expect(codeOnly).not.toMatch(/react-native-gesture-handler/);
  });

  it('onLayout이 루트 styles.screen View에 붙어 containerHeight를 세팅한다', () => {
    const match = codeOnly.match(/<View style=\{styles\.screen\}[^>]*>/);
    expect(match).not.toBeNull();
    const rootViewTag = match ? match[0] : '';
    expect(rootViewTag).toMatch(/onLayout=\{/);
    expect(codeOnly).toMatch(/setContainerHeight/);
  });
});

describe('src/app/(tabs)/index.tsx 배너 위치 불변 계약', () => {
  it('styles.bannerStack 정의에 bottom 관련 스타일이 추가되지 않았다', () => {
    const match = codeOnly.match(/bannerStack:\s*\{[^}]*\},/s);
    expect(match).not.toBeNull();
    const block = match ? match[0] : '';
    expect(block).not.toMatch(/bottom/);
  });

  it('배너 스택 렌더에 paddingTop: insets.top가 그대로 남아있다', () => {
    expect(codeOnly).toMatch(/styles\.bannerStack,\s*\{\s*paddingTop:\s*insets\.top\s*\}/);
  });
});
