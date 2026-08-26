// src/notifications/deps.ts
// 계약: 이 파일이 src/notifications/ 안에서 'expo-notifications'를 런타임 import 하는
// 유일한 파일이다. 다른 알림 모듈은 절대 이 패키지를 직접 import 하지 않는다 —
// Plan 03~07이 지켜야 할 규칙이며, config.ts는 타입 전용 import만 허용된다.
import * as Notifications from 'expo-notifications';
import type { NotificationDeps } from './config';
import { CALENDAR_TRIGGER_TYPE } from './config';

export const defaultNotificationDeps: NotificationDeps = {
  scheduleNotificationAsync: Notifications.scheduleNotificationAsync,
  cancelScheduledNotificationAsync: Notifications.cancelScheduledNotificationAsync,
  getAllScheduledNotificationsAsync: Notifications.getAllScheduledNotificationsAsync,
  getPermissionsAsync: Notifications.getPermissionsAsync,
  requestPermissionsAsync: Notifications.requestPermissionsAsync,
};

// 컴파일타임 정합성 단언: CALENDAR_TRIGGER_TYPE 리터럴이 실제 SDK enum과 일치하는지
// 강제한다. 유닛 테스트는 네이티브 모듈을 로드하지 않으므로(config.ts는 타입 전용
// import) 런타임 검증 경로가 없다 — SDK가 이 값을 바꾸면 아래 대입이 타입 에러를 내며
// `tsc --noEmit`이 깨지게 만든다.
const _calendarTriggerTypeAssertion: typeof CALENDAR_TRIGGER_TYPE =
  Notifications.SchedulableTriggerInputTypes.CALENDAR;
void _calendarTriggerTypeAssertion;
