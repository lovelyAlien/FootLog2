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

  it('Test 2: 설정 화면 3개 행 라벨이 D-02가 확정한 문구와 정확히 같다', () => {
    expect(SETTINGS_COPY.rowFrequency).toBe('알림 빈도');
    expect(SETTINGS_COPY.rowDailyReflection).toBe('하루 마무리 알림');
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
