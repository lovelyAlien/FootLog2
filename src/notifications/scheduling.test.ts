/**
 * @jest-environment node
 */
// src/notifications/scheduling.test.ts
// Plan 02-03 Task 1 (RED) — 반복 캘린더 트리거(방법 A) 스케줄링 모듈의 계약을 검증한다.
//
// migrations.test.ts와 동일 규약: 실제 의존성 대신 인메모리 더블을 직접 인자로 주입한다
// (jest.mock() 미사용 — NotificationDeps 명시적 파라미터 구조이므로 mock이 불필요하고,
// 'expo-notifications'를 테스트가 로드하는 경로 자체가 생기면 안 된다).
import { createFakeNotifications } from './testing/fakeNotifications';
import { CALENDAR_TRIGGER_TYPE, PHASE2_NOTIFICATION_SETTINGS } from './config';
import type { NotificationSettings } from './config';
import { NOTIFICATION_CONTENT } from './content';
import {
  ALL_MANAGED_IDS,
  CHECKIN_HOURLY_ID,
  DAILY_REFLECTION_ID,
  EVERY_3H_HOURS,
  applyNotificationSettings,
  checkin3hId,
  expectedNotificationIds,
} from './scheduling';

function settings(overrides: Partial<NotificationSettings>): NotificationSettings {
  return {
    checkinFrequency: 'hourly',
    dailyReflectionEnabled: false,
    dailyReflectionHour: 21,
    ...overrides,
  };
}

describe('applyNotificationSettings / expectedNotificationIds / ALL_MANAGED_IDS', () => {
  it('Test 1: [hourly] \'checkin-hourly\'가 정확히 1개 등록되고 \'checkin-3h-\'로 시작하는 id는 0개다', async () => {
    const fake = createFakeNotifications();

    await applyNotificationSettings(settings({ checkinFrequency: 'hourly' }), fake);

    const ids = fake.__ids();
    expect(ids.filter((id) => id === CHECKIN_HOURLY_ID)).toHaveLength(1);
    expect(ids.filter((id) => id.startsWith('checkin-3h-'))).toHaveLength(0);
  });

  it('Test 2: [hourly] \'checkin-hourly\'의 trigger가 { type: calendar, minute: 0, repeats: true }이고 hour 키가 없다 (방법 A 핵심 메커니즘 — 02-RESEARCH.md Summary)', async () => {
    const fake = createFakeNotifications();

    await applyNotificationSettings(settings({ checkinFrequency: 'hourly' }), fake);

    const all = await fake.getAllScheduledNotificationsAsync();
    const hourly = all.find((n) => n.identifier === CHECKIN_HOURLY_ID);
    expect(hourly).toBeDefined();
    // hour 미지정 = iOS UNCalendarNotificationTrigger 와일드카드 매칭 = 매시간 정각 발화.
    // toEqual로 객체 전체를 비교해 hour 키의 '부재'까지 검증한다(toMatchObject로는 불가).
    expect(hourly!.trigger).toEqual({ type: CALENDAR_TRIGGER_TYPE, minute: 0, repeats: true });
  });

  it('Test 3: [hourly] \'checkin-hourly\'의 content.title이 NOTIFICATION_CONTENT.checkin.title과 동일하다', async () => {
    const fake = createFakeNotifications();

    await applyNotificationSettings(settings({ checkinFrequency: 'hourly' }), fake);

    const all = await fake.getAllScheduledNotificationsAsync();
    const hourly = all.find((n) => n.identifier === CHECKIN_HOURLY_ID);
    expect(hourly!.content.title).toBe(NOTIFICATION_CONTENT.checkin.title);
  });

  it('Test 4: [every3h] 체크인 id가 정확히 8개이며 [0,3,6,9,12,15,18,21].map(checkin3hId)와 동일하다', async () => {
    const fake = createFakeNotifications();

    await applyNotificationSettings(settings({ checkinFrequency: 'every3h' }), fake);

    const ids = fake.__ids();
    const checkinIds = ids.filter((id) => id.startsWith('checkin-'));
    expect(checkinIds).toHaveLength(8);
    expect(new Set(checkinIds)).toEqual(new Set(EVERY_3H_HOURS.map(checkin3hId)));
  });

  it('Test 5: [every3h] 8개 각각의 trigger가 { type: calendar, hour: <해당 시각>, minute: 0, repeats: true }이다 (Pattern 2)', async () => {
    const fake = createFakeNotifications();

    await applyNotificationSettings(settings({ checkinFrequency: 'every3h' }), fake);

    const all = await fake.getAllScheduledNotificationsAsync();
    for (const hour of EVERY_3H_HOURS) {
      const entry = all.find((n) => n.identifier === checkin3hId(hour));
      expect(entry).toBeDefined();
      expect(entry!.trigger).toEqual({
        type: CALENDAR_TRIGGER_TYPE,
        hour,
        minute: 0,
        repeats: true,
      });
    }
  });

  it('Test 6: [off] 빈도가 \'off\'면 체크인 id가 0개다', async () => {
    const fake = createFakeNotifications();

    await applyNotificationSettings(settings({ checkinFrequency: 'off' }), fake);

    const ids = fake.__ids().filter((id) => id.startsWith('checkin-'));
    expect(ids).toHaveLength(0);
  });

  it('Test 7: [off] 빈도가 \'off\'여도 dailyReflectionEnabled: true면 daily_reflection 트리거는 그대로 등록된다 (두 종류가 독립적으로 제어됨)', async () => {
    const fake = createFakeNotifications();

    await applyNotificationSettings(
      settings({ checkinFrequency: 'off', dailyReflectionEnabled: true }),
      fake
    );

    expect(fake.__ids()).toContain(DAILY_REFLECTION_ID);
  });

  it('Test 8: [orphan] 매시간 빈도의 이전 트리거가 남아있는 상태에서 3시간마다로 전환하면 이전 트리거가 사라진다 (Pitfall 4 — 고아 트리거 정리)', async () => {
    const fake = createFakeNotifications();
    fake.__seed([CHECKIN_HOURLY_ID]);

    await applyNotificationSettings(settings({ checkinFrequency: 'every3h' }), fake);

    expect(fake.__ids()).not.toContain(CHECKIN_HOURLY_ID);
  });

  it('Test 9: [orphan] 3시간마다 빈도의 이전 트리거 2개가 남아있는 상태에서 매시간으로 전환하면 두 3h id가 모두 사라지고 매시간 id만 남는다 (Pitfall 4)', async () => {
    const fake = createFakeNotifications();
    fake.__seed([checkin3hId(0), checkin3hId(3)]);

    await applyNotificationSettings(settings({ checkinFrequency: 'hourly' }), fake);

    const ids = fake.__ids();
    expect(ids).not.toContain(checkin3hId(0));
    expect(ids).not.toContain(checkin3hId(3));
    expect(ids.filter((id) => id.startsWith('checkin-'))).toEqual([CHECKIN_HOURLY_ID]);
  });

  it('Test 10: [orphan] __seed([\'someone-elses-notification\']) 상태에서 어떤 설정을 적용해도 그 id는 취소되지 않는다 (관리 대상 우주 밖 id 불가침)', async () => {
    const fake = createFakeNotifications();
    fake.__seed(['someone-elses-notification']);

    await applyNotificationSettings(settings({ checkinFrequency: 'every3h' }), fake);

    expect(fake.__ids()).toContain('someone-elses-notification');
  });

  it('Test 11: [reflection] dailyReflectionEnabled: false로 적용하면 daily_reflection id가 등록되지 않고, 이미 있었다면 취소된다', async () => {
    const fake = createFakeNotifications();
    fake.__seed([DAILY_REFLECTION_ID]);

    await applyNotificationSettings(
      settings({ checkinFrequency: 'off', dailyReflectionEnabled: false }),
      fake
    );

    expect(fake.__ids()).not.toContain(DAILY_REFLECTION_ID);
  });

  it('Test 12: [reflection] dailyReflectionEnabled: true, dailyReflectionHour: 21로 적용하면 daily_reflection의 trigger와 content.title이 계약대로다', async () => {
    const fake = createFakeNotifications();

    await applyNotificationSettings(
      settings({ checkinFrequency: 'off', dailyReflectionEnabled: true, dailyReflectionHour: 21 }),
      fake
    );

    const all = await fake.getAllScheduledNotificationsAsync();
    const reflection = all.find((n) => n.identifier === DAILY_REFLECTION_ID);
    expect(reflection).toBeDefined();
    expect(reflection!.trigger).toEqual({
      type: CALENDAR_TRIGGER_TYPE,
      hour: 21,
      minute: 0,
      repeats: true,
    });
    expect(reflection!.content.title).toBe(NOTIFICATION_CONTENT.dailyReflection.title);
  });

  it('Test 13: [expected] expectedNotificationIds(PHASE2_NOTIFICATION_SETTINGS)가 체크인 트리거 1개(매시간) + 회고 트리거 1개, 총 2개를 반환한다 (D-02 하드코딩 기본값 = 매시간)', () => {
    const ids = expectedNotificationIds(PHASE2_NOTIFICATION_SETTINGS);
    expect(new Set(ids)).toEqual(new Set([CHECKIN_HOURLY_ID, DAILY_REFLECTION_ID]));
    expect(ids).toHaveLength(2);
  });

  it('Test 14: [expected] ALL_MANAGED_IDS가 정확히 10개(매시간 1 + 3시간마다 8 + 회고 1)이고 중복이 없다', () => {
    expect(ALL_MANAGED_IDS).toHaveLength(10);
    expect(new Set(ALL_MANAGED_IDS).size).toBe(10);
  });
});
