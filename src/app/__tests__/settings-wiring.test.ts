/**
 * @jest-environment node
 */
// src/app/__tests__/settings-wiring.test.ts
// 06-04-PLAN.md Task 3 — 설정 화면 계약 회귀 가드. tabs-wiring.test.ts /
// notification-wiring.test.ts와 동일한 기법(정적 소스 분석, fs.readFileSync +
// stripComments)을 그대로 재사용한다. content.ts는 런타임 import가 없어 직접
// import해 값 자체를 단언한다(settingsRepo.test.ts와 동일 접근) — SettingsScreen.tsx는
// react-native/expo 런타임 모듈을 import하므로 정적 소스 분석으로만 검증한다.
//
// 라우트 배선/햄버거 진입점 관련 단언은 06-06이 이 파일에 append 한다(06-04-PLAN.md
// 명시).
import fs from 'fs';
import path from 'path';
import { stripComments } from '../../test-utils/stripComments';
import {
  FREQUENCY_ACTION_SHEET_CANCEL_INDEX,
  FREQUENCY_ACTION_SHEET_OPTIONS,
  FREQUENCY_BY_ACTION_SHEET_INDEX,
  FREQUENCY_LABEL_BY_VALUE,
  REFLECTION_HOUR_BY_ACTION_SHEET_INDEX,
  REFLECTION_HOUR_CANCEL_INDEX,
  REFLECTION_HOUR_LABEL_BY_VALUE,
  REFLECTION_HOUR_OPTIONS,
  SETTINGS_COPY,
} from '../../settings/content';

const SETTINGS_DIR = path.join(__dirname, '..', '..', 'settings');

function readSource(fileName: string): string {
  return fs.readFileSync(path.join(SETTINGS_DIR, fileName), 'utf-8');
}

const contentSource = readSource('content.ts');
const screenSource = readSource('SettingsScreen.tsx');
const screenCodeOnly = stripComments(screenSource);

describe('SETTINGS_COPY 문구 단일 출처 계약 (D-01/D-02)', () => {
  it('Test 1: content.ts가 SETTINGS_COPY를 as const로 export한다', () => {
    expect(contentSource).toMatch(/export const SETTINGS_COPY = \{/);
    expect(contentSource).toMatch(/\}\s*as const;/);
  });

  it('Test 2: 설정 화면 4개 행 라벨이 D-02/D-05가 확정한 문구와 정확히 같다', () => {
    // 06-04-PLAN.md 시절엔 "정확히 3개 행"이었으나, 07-UI-SPEC.md §Component
    // Contracts 4가 "회고 알림 시각" 행을 추가하며 예산을 4개로 명시적으로
    // 확장했다(D-05). 기존 3개 단언은 그대로 유지하고 신규 라벨만 추가한다.
    expect(SETTINGS_COPY.rowFrequency).toBe('알림 빈도');
    expect(SETTINGS_COPY.rowDailyReflection).toBe('하루 마무리 알림');
    expect(SETTINGS_COPY.rowReflectionHour).toBe('회고 알림 시각');
    expect(SETTINGS_COPY.rowVersion).toBe('버전');
  });
});

describe('스코프 제외 계약 (D-02 — 전체 데이터를 지우는 4번째 행 제외)', () => {
  it('Test 3: content.ts에 그 행의 문구가 등장하지 않는다', () => {
    expect(contentSource).not.toMatch(/전체 데이터 삭제/);
  });

  it('Test 4: SettingsScreen.tsx에도 그 행의 문구가 등장하지 않는다', () => {
    expect(screenSource).not.toMatch(/전체 데이터 삭제/);
  });
});

describe('알림 빈도 액션시트 상수 계약 (D-01, photos.ts 패턴 복제)', () => {
  it('Test 5: FREQUENCY_ACTION_SHEET_OPTIONS가 4개 원소(3옵션 + 취소)다', () => {
    expect(FREQUENCY_ACTION_SHEET_OPTIONS).toHaveLength(4);
  });

  it('Test 6: FREQUENCY_ACTION_SHEET_CANCEL_INDEX가 3이다(마지막 인덱스 = 취소)', () => {
    expect(FREQUENCY_ACTION_SHEET_CANCEL_INDEX).toBe(3);
  });

  it('Test 7: FREQUENCY_BY_ACTION_SHEET_INDEX 길이가 옵션 배열과 같고 마지막 원소가 null이다', () => {
    expect(FREQUENCY_BY_ACTION_SHEET_INDEX).toHaveLength(FREQUENCY_ACTION_SHEET_OPTIONS.length);
    expect(FREQUENCY_BY_ACTION_SHEET_INDEX[FREQUENCY_BY_ACTION_SHEET_INDEX.length - 1]).toBeNull();
  });

  it('Test 8: FREQUENCY_LABEL_BY_VALUE가 3개 빈도값 전부를 매핑한다', () => {
    expect(FREQUENCY_LABEL_BY_VALUE.hourly).toBe(SETTINGS_COPY.frequencyHourly);
    expect(FREQUENCY_LABEL_BY_VALUE.every3h).toBe(SETTINGS_COPY.frequencyEvery3h);
    expect(FREQUENCY_LABEL_BY_VALUE.off).toBe(SETTINGS_COPY.frequencyOff);
  });
});

describe('알림 재구성 재사용 계약 (Don\'t Hand-Roll, 06-RESEARCH.md)', () => {
  it('Test 9: SettingsScreen.tsx가 applyNotificationSettings를 참조한다(재구현 아님)', () => {
    expect(screenCodeOnly).toMatch(/applyNotificationSettings/);
  });

  it('Test 10: SettingsScreen.tsx가 저수준 취소/등록 API를 직접 호출하지 않는다(재구현 금지)', () => {
    expect(screenCodeOnly).not.toMatch(/cancelScheduledNotificationAsync/);
    expect(screenCodeOnly).not.toMatch(/scheduleNotificationAsync/);
  });

  it('Test 11: SettingsScreen.tsx가 upsertSettings와 resolveNotificationSettings를 참조한다', () => {
    expect(screenCodeOnly).toMatch(/upsertSettings/);
    expect(screenCodeOnly).toMatch(/resolveNotificationSettings/);
  });
});

describe('색상/컴포넌트 예산 계약 (Pitfall 4, accent 예산 확정)', () => {
  it('Test 12: colors.accent가 등장하지 않는다(섹션 헤더는 textMuted, accent 예산 확장 금지)', () => {
    expect(screenCodeOnly).not.toMatch(/colors\.accent/);
  });

  it('Test 13: @expo/ui import가 없다(06-RESEARCH.md 명시 반려 — 네이티브 시스템 색 충돌)', () => {
    expect(screenCodeOnly).not.toMatch(/@expo\/ui/);
  });

  it('Test 14: tabBarStyle이 등장하지 않는다(설정 화면은 탭바 유지, Pitfall 1)', () => {
    expect(screenCodeOnly).not.toMatch(/tabBarStyle/);
  });
});

describe('버전 표시 계약 (Don\'t Hand-Roll — app.json 단일 출처)', () => {
  it('Test 15: SettingsScreen.tsx가 expoConfig를 참조한다', () => {
    expect(screenCodeOnly).toMatch(/expoConfig/);
  });

  it('Test 16: 버전 문자열 리터럴(예: 1.0.0)을 하드코딩하지 않는다', () => {
    expect(screenCodeOnly).not.toMatch(/\d+\.\d+\.\d+/);
  });
});

describe('하루 마무리 토글 기본값 경로 계약 (D-02)', () => {
  it('Test 17: SettingsScreen.tsx가 Switch를 렌더한다', () => {
    expect(screenCodeOnly).toMatch(/<Switch\b/);
  });

  it('Test 18: 기본값 경로가 resolveNotificationSettings를 경유한다(PHASE2_NOTIFICATION_SETTINGS 폴백)', () => {
    expect(screenCodeOnly).toMatch(/resolveNotificationSettings/);
    expect(screenCodeOnly).toMatch(/PHASE2_NOTIFICATION_SETTINGS/);
  });
});

describe('SQL 격리 계약 (저장소 규약 — SQL은 repo 파일에만 존재)', () => {
  it('Test 19: SettingsScreen.tsx에 SQL 키워드/테이블명이 등장하지 않는다', () => {
    expect(screenCodeOnly).not.toMatch(/\bSELECT\b/);
    expect(screenCodeOnly).not.toMatch(/\bINSERT\b/);
    expect(screenCodeOnly).not.toMatch(/app_settings/);
  });
});

// 06-06-PLAN.md Task 3(B) — 라우트 배선/햄버거 진입점/자가진단 배선 회귀 가드.
// 06-04-PLAN.md 헤더 주석이 예고한 대로 이 파일에 append한다(위 Test 1~19는 수정하지
// 않는다).
const APP_DIR = path.join(__dirname, '..');
const TODAY_ROUTE_DIR = path.join(APP_DIR, '(tabs)', 'index');
const CALENDAR_SRC_DIR = path.join(__dirname, '..', '..', 'calendar');

function readAppSource(relativePath: string): string {
  return fs.readFileSync(path.join(APP_DIR, relativePath), 'utf-8');
}

const settingsRouteSource = fs.readFileSync(
  path.join(TODAY_ROUTE_DIR, 'settings.tsx'),
  'utf-8'
);
const settingsRouteCodeOnly = stripComments(settingsRouteSource);
const todayIndexLayoutSource = readAppSource(path.join('(tabs)', 'index', '_layout.tsx'));
const todayIndexLayoutCodeOnly = stripComments(todayIndexLayoutSource);
const rootLayoutSource = readAppSource('_layout.tsx');
const rootLayoutCodeOnly = stripComments(rootLayoutSource);

// src/calendar/ 하위 모든 .ts/.tsx 파일을 재귀 수집한다 — notification-wiring.test.ts
// collectSourceFiles와 동일 기법(테스트 환경 재사용, RN 렌더 불필요).
function collectCalendarSourceFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(collectCalendarSourceFiles(fullPath));
    } else if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\.(ts|tsx)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

describe('설정 라우트 얇은 래퍼 계약 (06-06-PLAN.md Task 1)', () => {
  it('Test 20: (tabs)/index/settings.tsx가 useSQLiteContext와 SettingsScreen을 참조하고 StyleSheet/useState를 갖지 않는다', () => {
    expect(settingsRouteCodeOnly).toMatch(/useSQLiteContext/);
    expect(settingsRouteCodeOnly).toMatch(/SettingsScreen/);
    expect(settingsRouteCodeOnly).not.toMatch(/\bStyleSheet\b/);
    expect(settingsRouteCodeOnly).not.toMatch(/\buseState\b/);
  });
});

describe('설정 스크린 등록 계약 (06-06-PLAN.md Task 1, D-07)', () => {
  it('Test 21: (tabs)/index/_layout.tsx가 name="settings" 스크린을 headerShown: true로 등록한다', () => {
    const match = todayIndexLayoutCodeOnly.match(/<Stack\.Screen\s+name="settings"[^/]*\/>/);
    expect(match).not.toBeNull();
    expect(match ? match[0] : '').toMatch(/headerShown:\s*true/);
  });

  it('Test 22: (tabs)/index/_layout.tsx와 settings.tsx 어디에도 tabBarStyle이 없다(설정 화면은 탭바 유지, 06-RESEARCH.md Pitfall 1)', () => {
    expect(todayIndexLayoutCodeOnly).not.toMatch(/tabBarStyle/);
    expect(settingsRouteCodeOnly).not.toMatch(/tabBarStyle/);
  });
});

describe('포그라운드 자가진단 영속 설정 배선 계약 (06-RESEARCH.md Pitfall 5, T-06-05)', () => {
  it('Test 23: src/app/_layout.tsx에 무인자 runForegroundNotificationCheck() 호출이 등장하지 않고 resolveNotificationSettings를 참조한다', () => {
    expect(rootLayoutCodeOnly).not.toMatch(/runForegroundNotificationCheck\(\)/);
    expect(rootLayoutCodeOnly).toMatch(/resolveNotificationSettings/);
  });

  it('Test 24: src/app/_layout.tsx에 AppState.addEventListener가 등장하지 않는다(리스너 중복 금지)', () => {
    expect(rootLayoutCodeOnly).not.toMatch(/AppState\.addEventListener/);
  });
});

describe('캘린더 탭 햄버거 부재 계약 (D-03)', () => {
  it('Test 25: src/calendar/ 아래 어떤 파일도 line.3.horizontal을 포함하지 않는다(햄버거는 Today 뷰 전용)', () => {
    const offenders: string[] = [];
    for (const filePath of collectCalendarSourceFiles(CALENDAR_SRC_DIR)) {
      const codeOnly = stripComments(fs.readFileSync(filePath, 'utf-8'));
      if (/line\.3\.horizontal/.test(codeOnly)) {
        offenders.push(path.relative(CALENDAR_SRC_DIR, filePath));
      }
    }
    expect(offenders).toEqual([]);
  });
});

// 07-03-PLAN.md Task 3 — 설정 4행 계약(회고 알림 시각) 회귀 가드. D-05가
// 07-UI-SPEC.md §Component Contracts 4에서 "정확히 3개 행" 예산을 4개로 명시적으로
// 확장한 지점. content.ts는 런타임 import가 없어 직접 import해 값 자체를
// 단언하고(Test 26~30), SettingsScreen.tsx는 정적 소스 분석으로만 검증한다(Test
// 31~35) — 위 describe 블록들과 동일한 두 갈래 검증 규약을 그대로 따른다.
describe('회고 알림 시각 액션시트 상수 계약 (D-05, FREQUENCY_* 트리오 패턴 복제)', () => {
  it('Test 26: REFLECTION_HOUR_OPTIONS가 정확히 6개 원소이고 마지막이 SETTINGS_COPY.actionSheetCancel이다', () => {
    expect(REFLECTION_HOUR_OPTIONS).toHaveLength(6);
    expect(REFLECTION_HOUR_OPTIONS[REFLECTION_HOUR_OPTIONS.length - 1]).toBe(
      SETTINGS_COPY.actionSheetCancel
    );
  });

  it('Test 27: REFLECTION_HOUR_CANCEL_INDEX가 REFLECTION_HOUR_OPTIONS.length - 1과 같다', () => {
    expect(REFLECTION_HOUR_CANCEL_INDEX).toBe(REFLECTION_HOUR_OPTIONS.length - 1);
  });

  it('Test 28: REFLECTION_HOUR_BY_ACTION_SHEET_INDEX가 [19, 20, 21, 22, 23, null]이고 길이가 REFLECTION_HOUR_OPTIONS와 같다', () => {
    expect(REFLECTION_HOUR_BY_ACTION_SHEET_INDEX).toEqual([19, 20, 21, 22, 23, null]);
    expect(REFLECTION_HOUR_BY_ACTION_SHEET_INDEX).toHaveLength(REFLECTION_HOUR_OPTIONS.length);
  });

  it('Test 29: REFLECTION_HOUR_BY_ACTION_SHEET_INDEX의 non-null 값 전부가 REFLECTION_HOUR_LABEL_BY_VALUE에 키로 존재한다', () => {
    for (const hour of REFLECTION_HOUR_BY_ACTION_SHEET_INDEX) {
      if (hour === null) continue;
      expect(REFLECTION_HOUR_LABEL_BY_VALUE[hour]).toBeDefined();
    }
  });

  it('Test 30: 21이 후보에 포함된다(기존 기본값 PHASE2_NOTIFICATION_SETTINGS.dailyReflectionHour 보존 게이트)', () => {
    expect(REFLECTION_HOUR_BY_ACTION_SHEET_INDEX).toContain(21);
    expect(REFLECTION_HOUR_LABEL_BY_VALUE[21]).toBe('21시');
  });
});

describe('설정 화면 4번째 행 배선 계약 (07-UI-SPEC.md §Component Contracts 4)', () => {
  it('Test 31: SettingsScreen.tsx 코드에 ActionSheetIOS.showActionSheetWithOptions(가 정확히 2회 등장한다', () => {
    const matches = screenCodeOnly.match(/ActionSheetIOS\.showActionSheetWithOptions\(/g) ?? [];
    expect(matches).toHaveLength(2);
  });

  it('Test 32: SettingsScreen.tsx 코드에 settingsRepo.upsertSettings(가 정확히 1회 등장한다(단일 쓰기 경로)', () => {
    const matches = screenCodeOnly.match(/settingsRepo\.upsertSettings\(/g) ?? [];
    expect(matches).toHaveLength(1);
  });

  it('Test 33: SettingsScreen.tsx 코드에 액션시트 인덱스 숫자 리터럴이 하드코딩되어 있지 않다(cancelButtonIndex: 뒤에 상수 식별자만 온다)', () => {
    expect(screenCodeOnly).not.toMatch(/cancelButtonIndex:\s*\d/);
    expect(screenCodeOnly).toMatch(/cancelButtonIndex:\s*FREQUENCY_ACTION_SHEET_CANCEL_INDEX/);
    expect(screenCodeOnly).toMatch(/cancelButtonIndex:\s*REFLECTION_HOUR_CANCEL_INDEX/);
  });

  it('Test 34: SettingsScreen.tsx 코드에 SETTINGS_COPY.rowReflectionHour가 등장하고, 한국어 리터럴 \'회고 알림 시각\'은 등장하지 않는다(문구 단일 출처)', () => {
    expect(screenCodeOnly).toMatch(/SETTINGS_COPY\.rowReflectionHour/);
    expect(screenCodeOnly).not.toMatch(/'회고 알림 시각'/);
  });

  it('Test 35: SettingsScreen.tsx 코드에 disabled가 등장하지 않는다(토글 꺼짐 시 dimmed 금지)', () => {
    expect(screenCodeOnly).not.toMatch(/disabled/);
  });
});
