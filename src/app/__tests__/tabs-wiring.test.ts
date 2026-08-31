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
const calendarSource = readSource(path.join('(tabs)', 'calendar.tsx'));
const calendarCodeOnly = stripComments(calendarSource);
const todayIndexSource = readSource(path.join('(tabs)', 'index', 'index.tsx'));
const todayIndexCodeOnly = stripComments(todayIndexSource);
const contentSource = fs.readFileSync(
  path.join(APP_DIR, '..', 'today', 'content.ts'),
  'utf-8'
);

describe('라우트 구조 계약', () => {
  it('Test 1: (tabs)/_layout.tsx, (tabs)/index/index.tsx, (tabs)/calendar.tsx가 전부 존재한다', () => {
    expect(fs.existsSync(path.join(APP_DIR, '(tabs)', '_layout.tsx'))).toBe(true);
    expect(fs.existsSync(path.join(APP_DIR, '(tabs)', 'index', 'index.tsx'))).toBe(true);
    expect(fs.existsSync(path.join(APP_DIR, '(tabs)', 'calendar.tsx'))).toBe(true);
  });

  it('Test 2 (이동 완료 회귀 가드): src/app/index.tsx가 더 이상 존재하지 않는다', () => {
    expect(fs.existsSync(path.join(APP_DIR, 'index.tsx'))).toBe(false);
  });

  it('Test 3: src/app/priming.tsx가 (tabs) 밖에 그대로 존재한다', () => {
    expect(fs.existsSync(path.join(APP_DIR, 'priming.tsx'))).toBe(true);
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

describe('캘린더 플레이스홀더 계약 (D-07)', () => {
  it('Test 11: calendar.tsx가 TODAY_COPY.calendarPlaceholder를 참조하고 문구 리터럴을 하드코딩하지 않는다', () => {
    expect(calendarCodeOnly).toMatch(/TODAY_COPY\.calendarPlaceholder/);
    expect(calendarCodeOnly).not.toContain('캘린더는 곧 추가돼요');
  });

  it('Test 12: typography.helperText와 colors.textMuted를 쓴다', () => {
    expect(calendarCodeOnly).toMatch(/typography\.helperText/);
    expect(calendarCodeOnly).toMatch(/colors\.textMuted/);
  });

  it('Test 13: Phase 6 범위 식별자(Pressable/TouchableOpacity/FlatList/SectionList/useState)가 등장하지 않는다', () => {
    expect(calendarCodeOnly).not.toMatch(/\bPressable\b/);
    expect(calendarCodeOnly).not.toMatch(/\bTouchableOpacity\b/);
    expect(calendarCodeOnly).not.toMatch(/\bFlatList\b/);
    expect(calendarCodeOnly).not.toMatch(/\bSectionList\b/);
    expect(calendarCodeOnly).not.toMatch(/\buseState\b/);
  });
});

describe('스코프 경계 계약 (D-08)', () => {
  it('Test 14: (tabs)/index.tsx와 (tabs)/_layout.tsx 어디에도 설정 진입점 관련 식별자와 햄버거 문자가 등장하지 않는다', () => {
    for (const codeOnly of [todayIndexCodeOnly, layoutCodeOnly]) {
      expect(codeOnly).not.toMatch(/headerRight/);
      expect(codeOnly).not.toMatch(/\bsettings\b/i);
      expect(codeOnly).not.toContain('≡');
    }
  });
});

describe('문구 단일 출처 계약', () => {
  it('Test 15: src/today/content.ts가 TODAY_COPY를 as const로 export하고 3개 키를 갖는다', () => {
    expect(contentSource).toMatch(/export const TODAY_COPY = \{/);
    expect(contentSource).toMatch(/\}\s*as const;/);
    expect(contentSource).toMatch(/tabToday:\s*'오늘'/);
    expect(contentSource).toMatch(/tabCalendar:\s*'캘린더'/);
    expect(contentSource).toMatch(/calendarPlaceholder:\s*'캘린더는 곧 추가돼요'/);
  });
});
