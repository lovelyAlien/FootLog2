/**
 * @jest-environment node
 */
// src/notifications/testing/fakeNotifications.test.ts
// 02-VALIDATION.md Wave 0 gap(테스트 더블 부재)을 닫는 계약 테스트.
// 이 파일은 'expo-notifications'를 전혀 참조하지 않는다 — createFakeNotifications()가
// NotificationDeps(../config.ts, 타입 전용 import) 계약만 만족하면 되기 때문이다.
import { createFakeNotifications } from './fakeNotifications';
import type { NotificationDeps } from '../config';

// CalendarTriggerInput의 `type` 필드는 nominal string enum(SchedulableTriggerInputTypes)이라
// 리터럴 `'calendar'`를 캐스트 없이 대입할 수 없다(deps.ts의 컴파일타임 단언과 동일한
// 이유) — 이 테스트 파일에서만, 'expo-notifications'를 직접 import하지 않고
// NotificationDeps에서 트리거 입력 타입을 유도해 캐스트한다.
type ScheduleTrigger = Parameters<NotificationDeps['scheduleNotificationAsync']>[0]['trigger'];
const calendarTrigger = { type: 'calendar', minute: 0, repeats: true } as ScheduleTrigger;

describe('createFakeNotifications', () => {
  it('Test 1: 반환된 객체를 NotificationDeps에 대입해도 타입 에러가 없다 (컴파일타임 계약)', () => {
    const deps: NotificationDeps = createFakeNotifications();
    expect(deps).toBeDefined();
  });

  it('Test 2: schedule 후 getAll이 identifier로 조회 가능한 항목 1개를 반환하고 content/trigger가 입력과 동일하다', async () => {
    const fake = createFakeNotifications();
    const content = { title: '체크인할 시간이에요' };
    const trigger = calendarTrigger;

    await fake.scheduleNotificationAsync({ identifier: 'a', content, trigger });
    const all = await fake.getAllScheduledNotificationsAsync();

    const found = all.filter((n) => n.identifier === 'a');
    expect(found).toHaveLength(1);
    expect(found[0].content).toEqual(content);
    expect(found[0].trigger).toEqual(trigger);
  });

  it('Test 3: 같은 identifier로 두 번 스케줄하면 항목이 2개가 되지 않고 1개로 덮어써진다', async () => {
    const fake = createFakeNotifications();
    await fake.scheduleNotificationAsync({
      identifier: 'a',
      content: { title: '첫 번째' },
      trigger: null,
    });
    await fake.scheduleNotificationAsync({
      identifier: 'a',
      content: { title: '두 번째' },
      trigger: null,
    });

    const all = await fake.getAllScheduledNotificationsAsync();
    const matches = all.filter((n) => n.identifier === 'a');
    expect(matches).toHaveLength(1);
    expect(matches[0].content).toEqual({ title: '두 번째' });
  });

  it('Test 4: identifier를 생략하고 스케줄하면 자동 생성된 고유 id가 부여되고 반환된다', async () => {
    const fake = createFakeNotifications();
    const id1 = await fake.scheduleNotificationAsync({ content: { title: 'x' }, trigger: null });
    const id2 = await fake.scheduleNotificationAsync({ content: { title: 'y' }, trigger: null });

    expect(typeof id1).toBe('string');
    expect(id1.length).toBeGreaterThan(0);
    expect(id1).not.toBe(id2);

    const all = await fake.getAllScheduledNotificationsAsync();
    expect(all.map((n) => n.identifier)).toEqual(expect.arrayContaining([id1, id2]));
  });

  it('Test 5: cancelScheduledNotificationAsync 후 getAllScheduledNotificationsAsync에 해당 id가 없다', async () => {
    const fake = createFakeNotifications();
    await fake.scheduleNotificationAsync({
      identifier: 'a',
      content: { title: 'x' },
      trigger: null,
    });

    await fake.cancelScheduledNotificationAsync('a');
    const all = await fake.getAllScheduledNotificationsAsync();
    expect(all.find((n) => n.identifier === 'a')).toBeUndefined();
  });

  it('Test 6: 존재하지 않는 id를 cancel 해도 throw 하지 않는다', async () => {
    const fake = createFakeNotifications();
    await expect(fake.cancelScheduledNotificationAsync('never-scheduled')).resolves.not.toThrow();
  });

  it('Test 7: __setPermission(\'denied\') 후 getPermissionsAsync가 { status: \'denied\', granted: false, canAskAgain: false }를 반환한다', async () => {
    const fake = createFakeNotifications();
    fake.__setPermission('denied');

    const status = await fake.getPermissionsAsync();
    expect(status.status).toBe('denied');
    expect(status.granted).toBe(false);
    expect(status.canAskAgain).toBe(false);
  });

  it('Test 8: __setPermission(\'undetermined\') 상태에서 requestPermissionsAsync 호출 시 \'granted\'로 전이되고 granted: true를 반환한다', async () => {
    const fake = createFakeNotifications();
    fake.__setPermission('undetermined');

    const result = await fake.requestPermissionsAsync();
    expect(result.status).toBe('granted');
    expect(result.granted).toBe(true);

    const recheck = await fake.getPermissionsAsync();
    expect(recheck.status).toBe('granted');
  });

  it('Test 9: __setPermission(\'denied\') 상태에서 requestPermissionsAsync를 호출해도 상태가 바뀌지 않고 granted: false를 그대로 반환한다', async () => {
    const fake = createFakeNotifications();
    fake.__setPermission('denied');

    const result = await fake.requestPermissionsAsync();
    expect(result.status).toBe('denied');
    expect(result.granted).toBe(false);
  });

  it('Test 10: __seed([\'x\',\'y\'])가 두 개의 예약 항목을 만들고 __ids()가 [\'x\',\'y\']를 반환하며 __scheduleCallCount()는 증가하지 않는다', async () => {
    const fake = createFakeNotifications();
    const before = fake.__scheduleCallCount();

    fake.__seed(['x', 'y']);

    expect(fake.__ids()).toEqual(['x', 'y']);
    expect(fake.__scheduleCallCount()).toBe(before);

    const all = await fake.getAllScheduledNotificationsAsync();
    expect(all.map((n) => n.identifier)).toEqual(['x', 'y']);
  });
});
