// src/notifications/scheduling.ts
// Plan 02-03 — 반복 캘린더 트리거(방법 A) 스케줄링 모듈.
// migrations.ts의 "라이브 상태를 먼저 읽고 → 델타를 계산하고 → 델타만 적용한다" 형태를
// 그대로 따른다(모듈 상수 + 가드절 + "왜 이 줄이 존재하는지" pitfall 인용 주석 규약).
import { CALENDAR_TRIGGER_TYPE, PHASE2_NOTIFICATION_SETTINGS } from './config';
import type { NotificationDeps, NotificationFrequency, NotificationSettings } from './config';
import { NOTIFICATION_CONTENT } from './content';

export const CHECKIN_HOURLY_ID = 'checkin-hourly';
// 3시간마다 빈도의 발화 시각 8개. iOS UNCalendarNotificationTrigger에는 "N시간마다" 개념이
// 없어(02-RESEARCH.md Pattern 2) hour를 고정한 개별 트리거 8개를 등록해야 한다.
export const EVERY_3H_HOURS = [0, 3, 6, 9, 12, 15, 18, 21] as const;
export const DAILY_REFLECTION_ID = 'daily_reflection';

// id 생성 규칙 결정: 02-RESEARCH.md Summary 문단은 `checkin-3h-0`~`checkin-3h-7`(배열
// 인덱스)로, Pattern 2 코드 예시는 `checkin-3h-${hour}`(시각 값)로 서로 다르게 적혀 있다.
// 이 프로젝트는 Pattern 2(실제 코드 예시)를 정본으로 채택한다 — id에 발화 시각이 그대로
// 드러나야 디버깅 로그가 읽히기 때문이다(예: `checkin-3h-15` = 15시 발화, 인덱스라면 어느
// 시각인지 매번 배열을 다시 찾아봐야 함).
export function checkin3hId(hour: number): string {
  return `checkin-3h-${hour}`;
}

// 이 앱이 소유해 취소할 권한이 있는 identifier의 전체 우주(10개) — 취소 로직은 절대 이
// 집합 밖의 id를 건드리지 않는다(T-02-07, Pitfall 4 "관리 대상 우주 밖 id 불가침").
export const ALL_MANAGED_IDS: readonly string[] = [
  CHECKIN_HOURLY_ID,
  ...EVERY_3H_HOURS.map(checkin3hId),
  DAILY_REFLECTION_ID,
];

// NotificationFrequency가 닫힌 유니온이므로 런타임 검증 라이브러리를 도입하지 않는다
// (02-RESEARCH.md Security Domain V5).
export function expectedCheckinIds(frequency: NotificationFrequency): string[] {
  switch (frequency) {
    case 'hourly':
      return [CHECKIN_HOURLY_ID];
    case 'every3h':
      return EVERY_3H_HOURS.map(checkin3hId);
    case 'off':
      return [];
  }
}

export function expectedNotificationIds(settings: NotificationSettings): string[] {
  return [
    ...expectedCheckinIds(settings.checkinFrequency),
    ...(settings.dailyReflectionEnabled ? [DAILY_REFLECTION_ID] : []),
  ];
}

// 캘린더 트리거 입력을 id별로 만든다(모듈 내부).
function triggerFor(id: string, settings: NotificationSettings) {
  if (id === CHECKIN_HOURLY_ID) {
    // hour 키를 넣지 않는다 — iOS UNCalendarNotificationTrigger는 지정하지 않은 컴포넌트를
    // 와일드카드로 매칭하므로 minute만 지정하면 매시간 정각에 반복 발화한다(방법 A의 핵심
    // 메커니즘, 02-RESEARCH.md Summary). `hour: undefined`를 명시적으로 넣는 것도 금지 —
    // 테스트가 toEqual로 키 부재를 검증한다.
    return { type: CALENDAR_TRIGGER_TYPE, minute: 0, repeats: true };
  }
  const hourMatch = /^checkin-3h-(\d+)$/.exec(id);
  if (hourMatch) {
    return {
      type: CALENDAR_TRIGGER_TYPE,
      hour: Number(hourMatch[1]),
      minute: 0,
      repeats: true,
    };
  }
  // DAILY_REFLECTION_ID
  return {
    type: CALENDAR_TRIGGER_TYPE,
    hour: settings.dailyReflectionHour,
    minute: 0,
    repeats: true,
  };
}

// content는 id 기준으로만 결정된다(모듈 내부) — 문구 문자열을 이 파일에 인라인으로 쓰지
// 않는다. 위치/메모/회고 텍스트가 알림 본문에 보간될 수 있는 시그니처 자체가 존재하지
// 않는다(T-02-08 — 잠금화면 알림 내용에 민감정보 노출 방지).
function contentFor(id: string) {
  return id === DAILY_REFLECTION_ID
    ? NOTIFICATION_CONTENT.dailyReflection
    : NOTIFICATION_CONTENT.checkin;
}

// scheduleById(id, deps) 계약(Plan 05가 self-heal 재생성에 소비)은 settings 파라미터를
// 받지 않는다 — Phase 2는 빈도 선택 UI가 없어(CONTEXT.md D-01) 런타임에 실제로 쓰이는
// 설정은 PHASE2_NOTIFICATION_SETTINGS 하나뿐이다. applyNotificationSettings는 통합
// 테스트를 위해 임의의 settings를 파라미터로 받아야 하므로(같은 D-01), 이 내부 헬퍼로
// 등록 로직을 공유하되 settings 출처만 분리한다.
async function scheduleWithSettings(
  id: string,
  deps: NotificationDeps,
  settings: NotificationSettings
): Promise<void> {
  // 커스텀 identifier가 그대로 존중된다는 사실이 이 모듈 전체 설계의 전제다(02-RESEARCH.md가
  // expo/expo 소스 `request.identifier ?? uuid.v4()`에서 확인) — 동일 id 재등록은 iOS에서
  // 교체 동작이므로 멱등하다.
  await deps.scheduleNotificationAsync({
    identifier: id,
    content: contentFor(id),
    trigger: triggerFor(id, settings) as Parameters<
      NotificationDeps['scheduleNotificationAsync']
    >[0]['trigger'],
  });
}

export async function scheduleById(id: string, deps: NotificationDeps): Promise<void> {
  await scheduleWithSettings(id, deps, PHASE2_NOTIFICATION_SETTINGS);
}

export async function applyNotificationSettings(
  settings: NotificationSettings,
  deps: NotificationDeps
): Promise<void> {
  // (1) 라이브 상태를 먼저 읽는다 — migrations.ts와 동일하게 "현재 상태를 먼저 읽고 →
  // 델타를 계산하고 → 델타만 적용한다" 순서를 따른다.
  const actual = await deps.getAllScheduledNotificationsAsync();
  const actualIds = new Set(actual.map((n) => n.identifier));

  // (2) 기대 집합을 계산한다.
  const expected = new Set(expectedNotificationIds(settings));

  // (3) 취소 대상 = 실제 집합 ∩ ALL_MANAGED_IDS − expected. 취소를 등록보다 먼저
  // 수행한다 — 그렇지 않으면 빈도 전환 중 이전 빈도 트리거가 고아로 남는다(Pitfall 4).
  // ALL_MANAGED_IDS 밖의 id(다른 코드/라이브러리가 등록한 알림)는 절대 건드리지 않는다
  // (T-02-07 — 취소 권한의 경계).
  const managedSet = new Set(ALL_MANAGED_IDS);
  const toCancel = [...actualIds].filter((id) => managedSet.has(id) && !expected.has(id));
  for (const id of toCancel) {
    // 프로미스를 조용히 삼키지 않는다 — 실패는 호출자에게 전파하고(이 모듈은 catch
    // 하지 않는다), 로깅은 Plan 05의 오케스트레이터가 담당한다.
    await deps.cancelScheduledNotificationAsync(id);
  }

  // (4) 기대 집합의 각 id를 등록한다.
  for (const id of expected) {
    await scheduleWithSettings(id, deps, settings);
  }
}
