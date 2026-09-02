/**
 * @jest-environment node
 */
// src/app/__tests__/calendar-wiring.test.ts
// 06-03-PLAN.md Task 3 — 캘린더 라우트/그리드 정적 소스 분석 회귀 가드.
// tabs-wiring.test.ts와 동일한 기법(정적 소스 분석, fs.readFileSync + stripComments)을
// 그대로 재사용한다 — RN 렌더 환경이 필요 없다. 이 파일이 커버하는 단언은 이 플랜
// 몫이며, 뒤 플랜(06-04 이후)이 같은 파일에 describe 블록을 이어 붙인다.
import fs from 'fs';
import path from 'path';
import { stripComments } from '../../test-utils/stripComments';

const APP_DIR = path.join(__dirname, '..');

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(APP_DIR, relativePath), 'utf-8');
}

function readSrcSource(relativePath: string): string {
  return fs.readFileSync(path.join(APP_DIR, '..', relativePath), 'utf-8');
}

const calendarLayoutSource = readSource(path.join('(tabs)', 'calendar', '_layout.tsx'));
const calendarLayoutCodeOnly = stripComments(calendarLayoutSource);
const calendarIndexSource = readSource(path.join('(tabs)', 'calendar', 'index.tsx'));
const calendarIndexCodeOnly = stripComments(calendarIndexSource);
const calendarGridScreenSource = readSrcSource(path.join('calendar', 'CalendarGridScreen.tsx'));
const calendarGridScreenCodeOnly = stripComments(calendarGridScreenSource);
const calendarContentSource = readSrcSource(path.join('calendar', 'content.ts'));

describe('캘린더 탭 nested Stack 라우트 계약', () => {
  it('Test 1: calendar/_layout.tsx가 expo-router에서 Stack을 import하고 <Stack.Screen name="index"에 headerShown: false를 명시한다', () => {
    expect(calendarLayoutCodeOnly).toMatch(/import\s*\{[^}]*\bStack\b[^}]*\}\s*from\s*['"]expo-router['"]/);
    const match = calendarLayoutCodeOnly.match(/<Stack\.Screen\s+name="index"[^/]*\/>/);
    expect(match).not.toBeNull();
    expect(match ? match[0] : '').toMatch(/headerShown:\s*false/);
  });
});

describe('캘린더 홈 얇은 래퍼 계약', () => {
  it('Test 2: calendar/index.tsx가 useSQLiteContext로 db를 얻어 CalendarGridScreen에 넘기고 StyleSheet/useState/MapView를 포함하지 않는다', () => {
    expect(calendarIndexCodeOnly).toMatch(/useSQLiteContext/);
    expect(calendarIndexCodeOnly).toMatch(/CalendarGridScreen/);
    expect(calendarIndexCodeOnly).not.toMatch(/\bStyleSheet\b/);
    expect(calendarIndexCodeOnly).not.toMatch(/\buseState\b/);
    expect(calendarIndexCodeOnly).not.toMatch(/\bMapView\b/);
  });
});

describe('CalendarGridScreen 데이터/색상 계약', () => {
  it('Test 3: getCheckinDateKeysInRange를 참조하고 getTodayCheckins는 참조하지 않는다(하루씩 N번 조회 금지)', () => {
    expect(calendarGridScreenCodeOnly).toMatch(/getCheckinDateKeysInRange/);
    expect(calendarGridScreenCodeOnly).not.toMatch(/getTodayCheckins/);
  });

  it('Test 4: colors.accent 출현이 정확히 1회다(오늘 밑줄 전용, accent 예산)', () => {
    const accentMatches = calendarGridScreenCodeOnly.match(/colors\.accent\b/g) ?? [];
    expect(accentMatches.length).toBe(1);
  });

  it('Test 5: CALENDAR_COPY.weekdayHeaders/prevMonthLabel/nextMonthLabel을 참조하고 한글 리터럴을 직접 포함하지 않는다', () => {
    expect(calendarGridScreenCodeOnly).toMatch(/CALENDAR_COPY\.weekdayHeaders/);
    expect(calendarGridScreenCodeOnly).toMatch(/CALENDAR_COPY\.prevMonthLabel/);
    expect(calendarGridScreenCodeOnly).toMatch(/CALENDAR_COPY\.nextMonthLabel/);
    expect(calendarGridScreenCodeOnly).not.toContain("'이전 달'");
    expect(calendarGridScreenCodeOnly).not.toContain("'다음 달'");
  });

  it('Test 6 (06-RESEARCH.md Pitfall 1): tabBarStyle이 등장하지 않는다(탭바 조작은 과거 날짜 화면 한 곳에서만)', () => {
    expect(calendarGridScreenCodeOnly).not.toMatch(/tabBarStyle/);
  });
});

describe('CALENDAR_COPY 단일 출처 계약', () => {
  it('Test 7: src/calendar/content.ts가 CALENDAR_COPY를 as const로 export하고 4개 키를 갖는다', () => {
    expect(calendarContentSource).toMatch(/export const CALENDAR_COPY = \{/);
    expect(calendarContentSource).toMatch(/\}\s*as const;/);
    expect(calendarContentSource).toMatch(/weekdayHeaders:/);
    expect(calendarContentSource).toMatch(/prevMonthLabel:\s*'이전 달'/);
    expect(calendarContentSource).toMatch(/nextMonthLabel:\s*'다음 달'/);
    expect(calendarContentSource).toMatch(/pastDateEmptyState:\s*'이 날은 기록이 없어요'/);
    expect(calendarContentSource).toMatch(/scrubberCaption:/);
  });
});
