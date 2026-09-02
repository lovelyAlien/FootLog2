/**
 * @jest-environment node
 */
// src/app/__tests__/tabs-wiring.test.ts
// 04-03-PLAN.md Task 3 — 탭 셸 UI 계약 회귀 가드. 다른 배선 테스트(checkin-wiring.test.ts,
// notification-wiring.test.ts)와 동일한 기법(정적 소스 분석, fs.readFileSync +
// stripComments)을 그대로 재사용한다 — RN 렌더 환경이 필요 없다.
import fs from 'fs';
import path from 'path';
import { stripComments } from '../../test-utils/stripComments';

const APP_DIR = path.join(__dirname, '..');

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(APP_DIR, relativePath), 'utf-8');
}

const layoutSource = readSource(path.join('(tabs)', '_layout.tsx'));
const layoutCodeOnly = stripComments(layoutSource);
// 06-03-PLAN.md Task 3 — Phase 6이 (tabs)/calendar.tsx 플랫 플레이스홀더를 nested
// Stack 폴더(calendar/_layout.tsx + calendar/index.tsx)로 승격했다(D-07 경계 반전).
// 이 파일이 읽던 대상도 함께 갱신한다.
const calendarIndexSource = readSource(path.join('(tabs)', 'calendar', 'index.tsx'));
const calendarIndexCodeOnly = stripComments(calendarIndexSource);
const calendarLayoutSource = readSource(path.join('(tabs)', 'calendar', '_layout.tsx'));
const calendarLayoutCodeOnly = stripComments(calendarLayoutSource);
const calendarGridScreenSource = fs.readFileSync(
  path.join(APP_DIR, '..', 'calendar', 'CalendarGridScreen.tsx'),
  'utf-8'
);
const calendarGridScreenCodeOnly = stripComments(calendarGridScreenSource);
const todayIndexSource = readSource(path.join('(tabs)', 'index', 'index.tsx'));
const todayIndexCodeOnly = stripComments(todayIndexSource);
const todayIndexLayoutSource = readSource(path.join('(tabs)', 'index', '_layout.tsx'));
const todayIndexLayoutCodeOnly = stripComments(todayIndexLayoutSource);
const contentSource = fs.readFileSync(
  path.join(APP_DIR, '..', 'today', 'content.ts'),
  'utf-8'
);

describe('라우트 구조 계약', () => {
  it('Test 1 (2026-09-01 갱신, 06-03-PLAN.md — Phase 4 D-07 경계를 Phase 6이 의도적으로 반전): (tabs)/_layout.tsx, (tabs)/index/index.tsx, (tabs)/calendar/_layout.tsx, (tabs)/calendar/index.tsx가 전부 존재하고 플랫 플레이스홀더 파일은 더 이상 존재하지 않는다', () => {
    expect(fs.existsSync(path.join(APP_DIR, '(tabs)', '_layout.tsx'))).toBe(true);
    expect(fs.existsSync(path.join(APP_DIR, '(tabs)', 'index', 'index.tsx'))).toBe(true);
    expect(fs.existsSync(path.join(APP_DIR, '(tabs)', 'calendar', '_layout.tsx'))).toBe(true);
    expect(fs.existsSync(path.join(APP_DIR, '(tabs)', 'calendar', 'index.tsx'))).toBe(true);
    const flatPlaceholderFileName = ['calendar', 'tsx'].join('.');
    expect(fs.existsSync(path.join(APP_DIR, '(tabs)', flatPlaceholderFileName))).toBe(false);
  });

  it('Test 2 (이동 완료 회귀 가드): src/app/index.tsx가 더 이상 존재하지 않는다', () => {
    expect(fs.existsSync(path.join(APP_DIR, 'index.tsx'))).toBe(false);
  });

  it('Test 3: src/app/priming.tsx가 (tabs) 밖에 그대로 존재한다', () => {
    expect(fs.existsSync(path.join(APP_DIR, 'priming.tsx'))).toBe(true);
  });

  it('Test 16 (2026-09-01 추가, 05-01-PLAN.md 이동 완료 회귀 가드): (tabs)/index.tsx(파일)가 더 이상 존재하지 않는다', () => {
    expect(fs.existsSync(path.join(APP_DIR, '(tabs)', 'index.tsx'))).toBe(false);
  });

  it('Test 17 (2026-09-01 추가, 05-RESEARCH.md Pitfall 2 회귀 가드): (tabs)/index/_layout.tsx가 존재하고 Stack과 headerShown: false를 명시한다', () => {
    expect(fs.existsSync(path.join(APP_DIR, '(tabs)', 'index', '_layout.tsx'))).toBe(true);
    expect(todayIndexLayoutCodeOnly).toMatch(/import\s*\{[^}]*\bStack\b[^}]*\}\s*from\s*['"]expo-router['"]/);
    expect(todayIndexLayoutCodeOnly).toMatch(/<Stack\b/);
    expect(todayIndexLayoutCodeOnly).toMatch(/headerShown:\s*false/);
  });

  it('Test 18 (2026-09-01 추가, 폴더화 이후 탭 세그먼트 이름 고정 회귀 가드): (tabs)/_layout.tsx가 여전히 <Tabs.Screen name="index" ...>를 등록한다', () => {
    expect(layoutCodeOnly).toMatch(/<Tabs\.Screen\s+name="index"/);
  });
});

describe('탭바 계약 (D-06/D-07, 04-UI-SPEC.md)', () => {
  it('Test 4: _layout.tsx가 expo-router에서 Tabs를 import하고 렌더한다', () => {
    expect(layoutCodeOnly).toMatch(/import\s*\{[^}]*\bTabs\b[^}]*\}\s*from\s*['"]expo-router['"]/);
    expect(layoutCodeOnly).toMatch(/<Tabs\b/);
  });

  it('Test 5: Tabs.Screen이 정확히 2개이며 name="index"와 name="calendar"다', () => {
    const screens = layoutCodeOnly.match(/<Tabs\.Screen\b[^/]*\/>/g) ?? [];
    expect(screens).toHaveLength(2);
    expect(layoutCodeOnly).toMatch(/<Tabs\.Screen\s+name="index"/);
    expect(layoutCodeOnly).toMatch(/<Tabs\.Screen\s+name="calendar"/);
  });

  it('Test 6: 탭 제목이 TODAY_COPY 상수 참조로 지정되고 문구 리터럴이 직접 하드코딩되지 않는다', () => {
    expect(layoutCodeOnly).toMatch(/TODAY_COPY\.tabToday/);
    expect(layoutCodeOnly).toMatch(/TODAY_COPY\.tabCalendar/);
    expect(layoutCodeOnly).not.toContain("'오늘'");
    expect(layoutCodeOnly).not.toContain("'캘린더'");
    expect(layoutCodeOnly).not.toContain('"오늘"');
    expect(layoutCodeOnly).not.toContain('"캘린더"');
  });

  it('Test 7: tabBarActiveTintColor가 colors.textPrimary, tabBarInactiveTintColor가 colors.textMuted다 (iOS 기본 파란 틴트 회귀 가드)', () => {
    expect(layoutCodeOnly).toMatch(/tabBarActiveTintColor:\s*colors\.textPrimary/);
    expect(layoutCodeOnly).toMatch(/tabBarInactiveTintColor:\s*colors\.textMuted/);
  });

  it('Test 8: tabBarStyle이 colors.surface 배경과 colors.line 상단 보더를 쓴다', () => {
    const match = layoutCodeOnly.match(/tabBarStyle:\s*\{[^}]*\}/s);
    expect(match).not.toBeNull();
    const block = match ? match[0] : '';
    expect(block).toMatch(/backgroundColor:\s*colors\.surface/);
    expect(block).toMatch(/borderTopColor:\s*colors\.line/);
  });

  it('Test 9: tabBarIcon이 등장하지 않는다', () => {
    expect(layoutCodeOnly).not.toMatch(/tabBarIcon/);
  });

  it('Test 10: colors.accent가 등장하지 않는다 (accent 예산 확장 금지)', () => {
    expect(layoutCodeOnly).not.toMatch(/\bcolors\.accent\b/);
  });
});

describe('캘린더 홈 라우트 계약 (2026-09-01 갱신, D-07 경계 반전 — 06-03-PLAN.md)', () => {
  it('Test 11 (Phase 4 D-07 경계를 Phase 6이 의도적으로 반전): calendar/index.tsx가 CalendarGridScreen에 위임하는 얇은 래퍼이고 StyleSheet/useState를 갖지 않는다', () => {
    expect(calendarIndexCodeOnly).toMatch(/CalendarGridScreen/);
    expect(calendarIndexCodeOnly).not.toMatch(/\bStyleSheet\b/);
    expect(calendarIndexCodeOnly).not.toMatch(/\buseState\b/);
  });

  it('Test 12 (Phase 4 D-07 경계를 Phase 6이 의도적으로 반전): CalendarGridScreen.tsx가 colors.accent를 정확히 1회만 참조한다(오늘 밑줄 전용, accent 예산)', () => {
    const accentMatches = calendarGridScreenCodeOnly.match(/colors\.accent\b/g) ?? [];
    expect(accentMatches.length).toBe(1);
  });

  it('Test 13 (Phase 4 D-07 경계를 Phase 6이 의도적으로 반전 — 이제는 반대로 존재를 확인한다): CalendarGridScreen.tsx가 Pressable과 buildMonthGrid를 포함한다', () => {
    expect(calendarGridScreenCodeOnly).toMatch(/\bPressable\b/);
    expect(calendarGridScreenCodeOnly).toMatch(/\bbuildMonthGrid\b/);
  });
});

describe('스코프 경계 계약 (D-08 → 06-01~06-03 D-01/D-03이 의도적으로 반전, 06-06-PLAN.md Task 3)', () => {
  // Phase 4 D-08은 "설정 진입점은 이 phase에서 만들지 않는다"는 경계를 fence로
  // 심어둔 테스트였다. 06-CONTEXT.md D-01(햄버거+설정 화면을 이번 phase에 전체
  // 포함)/D-03(햄버거 위치는 Today 뷰 상단 전용, 탭으로 승격하지 않음)가 그 경계를
  // 이번 phase에 의도적으로 반전했으므로, 이 테스트는 "부재 단언"에서 "존재 단언"으로
  // 바뀐다 — 단, 설정이 세 번째 탭이 아니라는 부분(탭 레이아웃 자체는 여전히
  // settings를 모른다)은 그대로 부재 단언을 유지한다.
  it('Test 14: (tabs)/index/index.tsx는 햄버거 진입점을 SF Symbol 이름으로 렌더하고, (tabs)/_layout.tsx는 여전히 설정을 세 번째 탭으로 승격하지 않는다', () => {
    // (tabs)/index/index.tsx — 진입점 존재 단언(D-01/D-03 반전).
    expect(todayIndexCodeOnly).toMatch(/line\.3\.horizontal/);
    expect(todayIndexCodeOnly).toMatch(/router\.push\('\/settings'\)/);
    // 유니코드 문자를 코드에 직접 쓰지 않는다 — SF Symbol 이름으로만 렌더한다는
    // 저장소 아이콘 규약은 그대로 유지된다.
    expect(todayIndexCodeOnly).not.toContain('≡');

    // (tabs)/_layout.tsx(탭바 자체) — 설정은 세 번째 탭으로 승격되지 않는다는
    // 원본 제품 원칙은 이번 phase에도 그대로 유지된다(부재 단언 유지).
    expect(layoutCodeOnly).not.toMatch(/headerRight/);
    expect(layoutCodeOnly).not.toMatch(/\bsettings\b/i);
    expect(layoutCodeOnly).not.toContain('≡');
  });
});

describe('문구 단일 출처 계약', () => {
  it('Test 15 (2026-09-01 갱신, 06-03-PLAN.md — Phase 4 D-07 경계를 Phase 6이 의도적으로 반전: 소비자가 사라진 플레이스홀더 키 제거): src/today/content.ts가 TODAY_COPY를 as const로 export하고 tabToday/tabCalendar 키를 가지며 플레이스홀더 키는 더 이상 갖지 않는다', () => {
    expect(contentSource).toMatch(/export const TODAY_COPY = \{/);
    expect(contentSource).toMatch(/\}\s*as const;/);
    expect(contentSource).toMatch(/tabToday:\s*'오늘'/);
    expect(contentSource).toMatch(/tabCalendar:\s*'캘린더'/);
    const removedPlaceholderKey = ['calendar', 'Placeholder'].join('');
    expect(contentSource).not.toMatch(new RegExp(`${removedPlaceholderKey}:`));
  });
});
