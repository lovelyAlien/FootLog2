// src/notifications/config.ts
// Phase 2 알림 인프라 — 타입/상수 단일 출처. 여기서 값을 발명하지 않는다(tokens.ts와 동일
// 규약) — 값이 바뀌면 출처 문서를 먼저 갱신하고 이 파일에 반영한다.
//
// 런타임 import를 두지 않는다 — expo-notifications는 타입 전용 import로만 참조한다.
// 타입 import는 컴파일 시 지워지므로 `@jest-environment node` 테스트가 네이티브 모듈을
// 로드하지 않는다(02-RESEARCH.md Wave 0 Gap 회피).
import type * as Notifications from 'expo-notifications';

export type NotificationFrequency = 'hourly' | 'every3h' | 'off';

export type NotificationSettings = {
  checkinFrequency: NotificationFrequency;
  dailyReflectionEnabled: boolean;
  dailyReflectionHour: number;
};

// migrations.ts의 MigratableDb 패턴과 동일 — 프로덕션이 실제로 쓰는 5개 메서드만 좁혀서
// 노출한다. 테스트 더블(fakeNotifications.ts)이 이 타입을 그대로 만족시켜야 한다.
export type NotificationDeps = Pick<
  typeof Notifications,
  | 'scheduleNotificationAsync'
  | 'cancelScheduledNotificationAsync'
  | 'getAllScheduledNotificationsAsync'
  | 'getPermissionsAsync'
  | 'requestPermissionsAsync'
>;

// SDK의 SchedulableTriggerInputTypes.CALENDAR 값과 반드시 일치해야 한다 — 정합성 단언은
// deps.ts에 있다(유닛 테스트가 네이티브 모듈을 로드하지 않으므로 런타임 검증 경로가 없음).
export const CALENDAR_TRIGGER_TYPE = 'calendar' as const;

export const PHASE2_NOTIFICATION_SETTINGS: NotificationSettings = {
  // CONTEXT.md D-02: Phase 2 동안 앱이 실제로 동작할 때 쓰는 하드코딩 기본 빈도는 매시간.
  checkinFrequency: 'hourly',
  // docs/designs/day-end-reflection-map.md Premises #4: 기본값 확정(2026-08-23
  // /plan-design-review) — 기본 켜짐.
  dailyReflectionEnabled: true,
  // 같은 문서 Premises #4: 1단계는 시각 자체를 하드코딩(21:00), 사용자가 조정 가능한 건
  // 켜기/끄기 토글뿐(시각 변경 UI는 스코프 밖).
  dailyReflectionHour: 21,
} as const;

// 규칙: Phase 2는 이 값을 영속화하지 않는다 — 설정 UI와 영속화는 Phase 6(빈도)/Phase 7
// (회고 토글) 소관, CONTEXT.md D-01.
