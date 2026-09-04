// src/settings/content.ts
// 06-04-PLAN.md Task 1 — 설정 화면 문구 + 알림 빈도 액션시트 상수 단일 출처.
// 여기서 값을 발명하지 않는다(src/today/content.ts / src/checkin/photos.ts와 동일 규약):
// 문구는 06-UI-SPEC.md §Copywriting Contract에서 그대로 전사한다.
//
// 런타임 import를 두지 않는다 — 이 파일은 순수 상수만 담는다. `NotificationFrequency`는
// 타입 전용 import만 한다(src/notifications/config.ts의 "런타임 import 없음" 규약과 동일 —
// 타입 import는 컴파일 시 지워지므로 `@jest-environment node` 테스트가 네이티브 모듈을
// 로드하지 않는다).
import type { NotificationFrequency } from '../notifications/config';

export const SETTINGS_COPY = {
  screenTitle: '설정',
  backLabel: '뒤로',
  sectionNotifications: '알림',
  sectionInfo: '정보',
  rowFrequency: '알림 빈도',
  rowDailyReflection: '하루 마무리 알림',
  // 07-UI-SPEC.md §Copywriting Contract "설정 — 신규 행: 회고 알림 시각(D-05)" 라벨 원문.
  rowReflectionHour: '회고 알림 시각',
  rowVersion: '버전',
  frequencyHourly: '매시간',
  frequencyEvery3h: '3시간마다',
  frequencyOff: '끔',
  actionSheetCancel: '취소',
  // CHECKIN_COPY.saveFailedHeadline / CHECKIN_COPY.retryCta(src/checkin/checkinFlow.ts)와
  // 의도적으로 같은 문구를 재사용한다 — 앱 전역 저장 실패 어휘를 통일하기 위함
  // (06-UI-SPEC.md §Copywriting Contract "저장 실패" 행).
  saveFailed: '저장하지 못했어요',
  retryCta: '다시 시도',
  // 06-06이 소비하는 햄버거 아이콘(Today 뷰 헤더)의 VoiceOver 라벨. 이 플랜은 화면
  // 본체만 만들고 라우트 배선/진입점은 06-06 소관이지만, 06-UI-SPEC.md §Copywriting
  // Contract가 이 값도 SETTINGS_COPY 단일 출처에 두도록 명시한다.
  settingsEntryLabel: '설정',
} as const;

// photos.ts 20~40줄의 액션시트 옵션/취소인덱스/인덱스→값 3종 세트 소유 패턴을 그대로
// 복제한다 — 화면이 액션시트 인덱스를 직접 하드코딩하지 않도록 이 모듈이 인덱스→값
// 매핑을 소유한다.
export const FREQUENCY_ACTION_SHEET_OPTIONS = [
  SETTINGS_COPY.frequencyHourly,
  SETTINGS_COPY.frequencyEvery3h,
  SETTINGS_COPY.frequencyOff,
  SETTINGS_COPY.actionSheetCancel,
] as const;

export const FREQUENCY_ACTION_SHEET_CANCEL_INDEX = 3;

export const FREQUENCY_BY_ACTION_SHEET_INDEX: readonly (NotificationFrequency | null)[] = [
  'hourly',
  'every3h',
  'off',
  null,
];

// 설정 화면이 현재 선택값을 행 trailing 텍스트로 렌더할 때 쓴다.
export const FREQUENCY_LABEL_BY_VALUE: Readonly<Record<NotificationFrequency, string>> = {
  hourly: SETTINGS_COPY.frequencyHourly,
  every3h: SETTINGS_COPY.frequencyEvery3h,
  off: SETTINGS_COPY.frequencyOff,
};

// D-02(PROJECT.md Out of Scope)가 명시적으로 제외한 항목: 승인된 목업의 4번째 행(전체
// 데이터를 지우는 위험 동작)은 1단계 스코프에서 의도적으로 뺐다. 이 주석은 이후 실수로
// 재도입되지 않도록 근거를 남긴다 — 이 파일에는 그 행의 문구를 절대 추가하지 않는다
// (회귀 가드: settings-wiring.test.ts가 이 단어가 부재함을 정적으로 검증한다).

// D-05(07-UI-SPEC.md §Copywriting Contract) — 설정 화면 4번째 행("회고 알림 시각")이
// 소비하는 액션시트 상수 4종. FREQUENCY_* 트리오와 구조적으로 동일한 세트다(옵션
// 배열/취소 인덱스/인덱스→값/값→라벨). 라벨 리터럴을 REFLECTION_HOUR_OPTIONS와
// REFLECTION_HOUR_LABEL_BY_VALUE 두 곳에 중복 하드코딩하지 않도록, 두 상수 모두
// 아래 REFLECTION_HOURS 단일 리터럴에서 파생시킨다.
const REFLECTION_HOURS = [19, 20, 21, 22, 23] as const;

export const REFLECTION_HOUR_OPTIONS = [
  ...REFLECTION_HOURS.map((hour) => `${hour}시`),
  SETTINGS_COPY.actionSheetCancel,
] as const;

export const REFLECTION_HOUR_CANCEL_INDEX = REFLECTION_HOUR_OPTIONS.length - 1;

// 21시('21시')가 반드시 후보에 포함되어야 한다 — PHASE2_NOTIFICATION_SETTINGS.dailyReflectionHour
// 기본값이자 창업자 본인의 현재 설정(src/notifications/config.ts). 21이 목록에서
// 빠지면 기존 사용자의 설정값이 REFLECTION_HOUR_LABEL_BY_VALUE 조회에서 빠진 값이 되어
// 설정 화면 4번째 행의 trailing 라벨이 빈 문자열로 렌더된다.
export const REFLECTION_HOUR_BY_ACTION_SHEET_INDEX: readonly (number | null)[] = [
  ...REFLECTION_HOURS,
  null,
];

// 설정 화면이 현재 선택된 회고 알림 시각을 행 trailing 텍스트로 렌더할 때 쓴다.
export const REFLECTION_HOUR_LABEL_BY_VALUE: Readonly<Record<number, string>> =
  Object.fromEntries(REFLECTION_HOURS.map((hour) => [hour, `${hour}시`]));
