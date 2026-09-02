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

// 06-05-PLAN.md Task 3 — 과거 날짜 화면 회귀 가드. 06-03이 만든 위 describe 블록/it은
// 건드리지 않고 여기서부터 append한다.
const pastDateRouteSource = readSource(path.join('(tabs)', 'calendar', '[date]', 'index.tsx'));
const pastDateRouteCodeOnly = stripComments(pastDateRouteSource);
const pastDateDetailRouteSource = readSource(path.join('(tabs)', 'calendar', '[date]', '[id].tsx'));
const pastDateDetailRouteCodeOnly = stripComments(pastDateDetailRouteSource);
const pastDateScreenSource = readSrcSource(path.join('calendar', 'PastDateScreen.tsx'));
const pastDateScreenCodeOnly = stripComments(pastDateScreenSource);

// 06-RESEARCH.md Pitfall 1 — tabBarStyle을 만지는 파일이 이 저장소 전체에서
// PastDateScreen.tsx와 (tabs)/_layout.tsx 두 개뿐이어야 한다. .tsx 파일만 재귀
// 순회한다 — .test.ts 파일들은 이 문자열을 검색 패턴/단언 문자열로 포함할 뿐 실제로
// 탭바를 조작하지 않으므로 대상에서 자연스럽게 제외된다.
const SRC_DIR = path.join(APP_DIR, '..');

function collectTsxFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return collectTsxFiles(fullPath);
    }
    return entry.name.endsWith('.tsx') ? [fullPath] : [];
  });
}

describe('과거 날짜 라우트 파라미터 검증(T-06-02 fail-closed)', () => {
  it('Test 8: [date]/index.tsx가 isValidLocalDateKey로 검증하고 실패 시 Redirect한다', () => {
    expect(pastDateRouteCodeOnly).toMatch(/isValidLocalDateKey/);
    expect(pastDateRouteCodeOnly).toMatch(/Redirect/);
  });
});

describe('과거 날짜 라우트 얇은 래퍼 계약', () => {
  it('Test 9: [date]/index.tsx와 [date]/[id].tsx 둘 다 StyleSheet/MapView/useState를 갖지 않는다', () => {
    expect(pastDateRouteCodeOnly).not.toMatch(/\bStyleSheet\b/);
    expect(pastDateRouteCodeOnly).not.toMatch(/\bMapView\b/);
    expect(pastDateRouteCodeOnly).not.toMatch(/\buseState\b/);
    expect(pastDateDetailRouteCodeOnly).not.toMatch(/\bStyleSheet\b/);
    expect(pastDateDetailRouteCodeOnly).not.toMatch(/\bMapView\b/);
    expect(pastDateDetailRouteCodeOnly).not.toMatch(/\buseState\b/);
  });

  it('Test 10 (T-06-09): [date]/[id].tsx가 CheckinDetailScreen을 import한다(화면 본체 복제 금지)', () => {
    expect(pastDateDetailRouteCodeOnly).toMatch(/CheckinDetailScreen/);
  });
});

describe('PastDateScreen 데이터/재사용 계약', () => {
  it('Test 11: getTodayCheckins를 참조하고 날짜별 조회용 새 함수는 참조하지 않는다', () => {
    expect(pastDateScreenCodeOnly).toMatch(/getTodayCheckins/);
    expect(pastDateScreenCodeOnly).not.toMatch(/getCheckinsByDate/);
  });

  it('Test 12: TodayBottomSheet를 참조한다(새 시트 컴포넌트를 만들지 않는다)', () => {
    expect(pastDateScreenCodeOnly).toMatch(/TodayBottomSheet/);
  });

  it('Test 13 (REQ-past-date-view): 체크인 버튼 관련 심볼이 등장하지 않는다', () => {
    expect(pastDateScreenCodeOnly).not.toMatch(
      /CheckinActionCard|checkinCta|checkinFlow|handleCheckinPress/
    );
  });

  it('Test 14: getParent와 tabBarStyle을 참조한다(탭바 숨김 배선 존재)', () => {
    expect(pastDateScreenCodeOnly).toMatch(/getParent/);
    expect(pastDateScreenCodeOnly).toMatch(/tabBarStyle/);
  });

  it('Test 15 (06-RESEARCH.md Pitfall 1): tabBarStyle을 포함하는 .tsx 파일이 PastDateScreen.tsx와 (tabs)/_layout.tsx 둘뿐이다', () => {
    const tsxFiles = collectTsxFiles(SRC_DIR);
    const filesWithTabBarStyle = tsxFiles.filter((filePath) => {
      const codeOnly = stripComments(fs.readFileSync(filePath, 'utf-8'));
      return /tabBarStyle/.test(codeOnly);
    });
    const relativePaths = filesWithTabBarStyle.map((filePath) => path.relative(SRC_DIR, filePath));
    expect(relativePaths.sort()).toEqual(
      [path.join('calendar', 'PastDateScreen.tsx'), path.join('app', '(tabs)', '_layout.tsx')].sort()
    );
  });

  it('Test 16: CALENDAR_COPY.pastDateEmptyState를 참조하고 한글 리터럴을 직접 포함하지 않는다', () => {
    expect(pastDateScreenCodeOnly).toMatch(/CALENDAR_COPY\.pastDateEmptyState/);
    expect(pastDateScreenCodeOnly).not.toContain("'이 날은 기록이 없어요'");
  });

  it('Test 17 (T-06-10): createPendingDeleteController와 dispose를 참조한다(삭제 확정 경로 존재)', () => {
    expect(pastDateScreenCodeOnly).toMatch(/createPendingDeleteController/);
    expect(pastDateScreenCodeOnly).toMatch(/dispose/);
  });
});
