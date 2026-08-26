/**
 * @jest-environment node
 */
// src/notifications/registry.test.ts
// Plan 02-05 Task 1 (RED) — 자가진단 레지스트리 계약을 검증한다.
//
// migrations.test.ts / scheduling.test.ts와 동일 규약: 실제 의존성 대신 인메모리 더블을
// 직접 인자로 주입한다(jest.mock() 미사용, 'expo-notifications'를 로드하는 경로 자체가
// 생기면 안 된다).
import { createFakeNotifications } from './testing/fakeNotifications';
import { PHASE2_NOTIFICATION_SETTINGS } from './config';
import type { NotificationSettings } from './config';
import { CHECKIN_HOURLY_ID, EVERY_3H_HOURS, DAILY_REFLECTION_ID, checkin3hId } from './scheduling';
import { buildNotificationRegistry, selfHeal, runForegroundNotificationCheck } from './registry';

function settings(overrides: Partial<NotificationSettings> = {}): NotificationSettings {
  return {
    checkinFrequency: 'hourly',
    dailyReflectionEnabled: true,
    dailyReflectionHour: 21,
    ...overrides,
  };
}

describe('buildNotificationRegistry', () => {
  it('Test 1: [registry] 매시간 빈도 + 회고 켜짐 설정에서 항목 2개(checkin kind 1 + daily_reflection kind 1)를 반환한다', () => {
    const registry = buildNotificationRegistry(
      settings({ checkinFrequency: 'hourly', dailyReflectionEnabled: true, dailyReflectionHour: 21 })
    );

    expect(registry).toHaveLength(2);
    expect(registry.find((e) => e.id === CHECKIN_HOURLY_ID)?.kind).toBe('checkin');
    expect(registry.find((e) => e.id === DAILY_REFLECTION_ID)?.kind).toBe('daily_reflection');
  });

  it('Test 2: [registry] 3시간마다 빈도면 항목이 9개(체크인 8 + 회고 1)다 — 트리거 종류가 늘어도 자가진단 로직을 안 건드리는 배열 확장 구조임을 고정', () => {
    const registry = buildNotificationRegistry(settings({ checkinFrequency: 'every3h' }));

    expect(registry).toHaveLength(9);
    const checkinIds = registry.filter((e) => e.kind === 'checkin').map((e) => e.id);
    expect(new Set(checkinIds)).toEqual(new Set(EVERY_3H_HOURS.map(checkin3hId)));
  });

  it('Test 3: [registry] 체크인 빈도가 꺼짐이면 체크인 kind 항목의 isEnabled가 전부 false를 반환한다', () => {
    // 체크인 후보가 0개로 사라지는 대신 CHECKIN_HOURLY_ID 하나를 비활성 상태로 남긴다 —
    // 자가진단 리포트가 "체크인 알림은 꺼져 있어서 건너뜀"을 표현할 수 있어야 하기 때문
    // (registry.ts 구현 노트, Test 8과 짝을 이룸).
    const registry = buildNotificationRegistry(settings({ checkinFrequency: 'off' }));

    const checkinEntries = registry.filter((e) => e.kind === 'checkin');
    expect(checkinEntries.length).toBeGreaterThan(0);
    for (const entry of checkinEntries) {
      expect(entry.isEnabled()).toBe(false);
    }
  });

  it('Test 4: [registry] 회고가 꺼짐이면 daily_reflection 항목의 isEnabled가 false를 반환한다', () => {
    const registry = buildNotificationRegistry(settings({ dailyReflectionEnabled: false }));

    const reflectionEntry = registry.find((e) => e.kind === 'daily_reflection');
    expect(reflectionEntry?.isEnabled()).toBe(false);
  });
});

describe('selfHeal', () => {
  it('Test 5: [selfHeal] 기대 id가 전부 이미 등록된 상태에서 자가진단을 호출하면 재생성 호출이 0회이고 리포트의 recreated가 빈 배열이다 — 정상 상태에서 아무것도 건드리지 않는다', async () => {
    const fake = createFakeNotifications();
    fake.__seed([CHECKIN_HOURLY_ID, DAILY_REFLECTION_ID]);

    const report = await selfHeal(settings(), fake);

    expect(fake.__scheduleCallCount()).toBe(0);
    expect(report.recreated).toEqual([]);
  });

  it('Test 6: [selfHeal] daily_reflection만 등록된 상태에서 자가진단을 호출하면 checkin-hourly만 재생성되고 재생성 호출이 정확히 1회이며 daily_reflection은 다시 스케줄되지 않는다 (Pitfall 1 — 조용히 사라진 트리거 감지·재생성)', async () => {
    const fake = createFakeNotifications();
    fake.__seed([DAILY_REFLECTION_ID]);

    const report = await selfHeal(settings(), fake);

    expect(report.recreated).toEqual([CHECKIN_HOURLY_ID]);
    expect(fake.__scheduleCallCount()).toBe(1);
  });

  it('Test 7: [selfHeal] 재생성 후 등록된 id 목록에 기대 집합 전체가 존재한다', async () => {
    const fake = createFakeNotifications();
    fake.__seed([DAILY_REFLECTION_ID]);

    await selfHeal(settings(), fake);

    const ids = fake.__ids();
    expect(ids).toContain(CHECKIN_HOURLY_ID);
    expect(ids).toContain(DAILY_REFLECTION_ID);
  });
});

describe('disabledSkip', () => {
  // Pitfall 2 — product-design.md T2가 2026-08-24 브레인스토밍에서 발견해 명시적으로
  // 수정한 버그. "빈도=끔 상태로 포그라운드 전환했는데 알림이 다시 오기 시작하면 이 버그"
  // 라는 경고 신호를 남긴다 — 사용자가 명시적으로 끈 알림을 자가진단이 되살리면 신뢰가
  // 깨진다.
  it('Test 8: [disabledSkip] 체크인 빈도가 꺼짐이고 등록된 게 아무것도 없을 때 자가진단을 호출하면 체크인 트리거를 재생성하지 않고 skippedDisabled에 체크인 id가 담긴다 (Pitfall 2)', async () => {
    const fake = createFakeNotifications();

    const report = await selfHeal(settings({ checkinFrequency: 'off' }), fake);

    expect(fake.__ids().some((id) => id === CHECKIN_HOURLY_ID)).toBe(false);
    expect(report.skippedDisabled).toContain(CHECKIN_HOURLY_ID);
  });

  it('Test 9: [disabledSkip] 회고가 꺼짐이고 등록된 게 없을 때 daily_reflection이 재생성되지 않는다 (Pitfall 2 — T2 동일 계열 버그 경고: 회고 토글을 끈 상태로 포그라운드 전환했는데 회고 알림이 되살아나면 이 버그)', async () => {
    const fake = createFakeNotifications();

    const report = await selfHeal(settings({ dailyReflectionEnabled: false }), fake);

    expect(fake.__ids()).not.toContain(DAILY_REFLECTION_ID);
    expect(report.skippedDisabled).toContain(DAILY_REFLECTION_ID);
  });
});

describe('partialFailure', () => {
  it('Test 10: [partialFailure] 3시간마다 설정에서 8개 중 3개(시각 0/9/21)만 사라진 상태를 만들고 자가진단을 호출하면 그 3개만 재생성되고 재생성 호출이 정확히 3회다 (Pitfall 3 — 단일 id 존재 확인이 아니라 집합 단위 판정)', async () => {
    const fake = createFakeNotifications();
    const missingHours = [0, 9, 21];
    const survivingIds = EVERY_3H_HOURS.filter((h) => !missingHours.includes(h)).map(checkin3hId);
    fake.__seed([...survivingIds, DAILY_REFLECTION_ID]);

    const report = await selfHeal(settings({ checkinFrequency: 'every3h' }), fake);

    expect(new Set(report.recreated)).toEqual(new Set(missingHours.map(checkin3hId)));
    expect(fake.__scheduleCallCount()).toBe(3);
  });

  it('Test 11: [partialFailure] 위 시나리오에서 리포트의 missing이 사라진 3개와 정확히 일치한다 (순서 무관 — 집합 비교, 자가진단의 계약은 "어떤 순서로 처리하는가"가 아니라 "어떤 집합을 처리하는가"이므로 순서를 고정하면 과잉 명세가 된다)', async () => {
    const fake = createFakeNotifications();
    const missingHours = [0, 9, 21];
    const survivingIds = EVERY_3H_HOURS.filter((h) => !missingHours.includes(h)).map(checkin3hId);
    fake.__seed([...survivingIds, DAILY_REFLECTION_ID]);

    const report = await selfHeal(settings({ checkinFrequency: 'every3h' }), fake);

    expect(new Set(report.missing)).toEqual(new Set(missingHours.map(checkin3hId)));
  });
});

describe('orphanCleanup', () => {
  it('Test 12: [orphanCleanup] 3시간마다 설정인데 매시간 id가 남아 있으면 자가진단이 그것을 취소하고 리포트의 cancelled에 담는다 (Pitfall 4 — 빈도 전환 중 실패로 남은 고아)', async () => {
    const fake = createFakeNotifications();
    fake.__seed([...EVERY_3H_HOURS.map(checkin3hId), DAILY_REFLECTION_ID, CHECKIN_HOURLY_ID]);

    const report = await selfHeal(settings({ checkinFrequency: 'every3h' }), fake);

    expect(fake.__ids()).not.toContain(CHECKIN_HOURLY_ID);
    expect(report.cancelled).toContain(CHECKIN_HOURLY_ID);
  });

  it('Test 13: [orphanCleanup] 관리 대상 우주(ALL_MANAGED_IDS) 밖의 id는 어떤 설정에서도 취소되지 않는다', async () => {
    const fake = createFakeNotifications();
    fake.__seed([CHECKIN_HOURLY_ID, DAILY_REFLECTION_ID, 'someone-elses-notification']);

    const report = await selfHeal(settings(), fake);

    expect(fake.__ids()).toContain('someone-elses-notification');
    expect(report.cancelled).not.toContain('someone-elses-notification');
  });
});

describe('foreground', () => {
  let logSpy: jest.SpiedFunction<typeof console.log>;

  beforeEach(() => {
    // jest.config.js의 clearMocks: true가 호출 기록은 지우지만 mockImplementation으로
    // 바꾼 구현 자체는 지우지 않는다 — afterEach에서 명시적으로 mockRestore한다.
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it('Test 14: [foreground] 권한이 거부된 상태에서 포그라운드 체크를 호출하면 null을 반환하고 재생성/취소 호출이 모두 0이다 — 권한이 없으면 스케줄해도 발화하지 않으므로 자가진단 자체를 건너뛴다', async () => {
    const fake = createFakeNotifications();
    fake.__setPermission('denied');

    const result = await runForegroundNotificationCheck(PHASE2_NOTIFICATION_SETTINGS, fake);

    expect(result).toBeNull();
    expect(fake.__scheduleCallCount()).toBe(0);
    expect(fake.__cancelCallCount()).toBe(0);
  });

  it('Test 15: [foreground] 권한이 승인된 상태에서 같은 호출이 리포트를 반환하고 누락분을 재생성한다', async () => {
    const fake = createFakeNotifications();
    fake.__setPermission('granted');

    const result = await runForegroundNotificationCheck(PHASE2_NOTIFICATION_SETTINGS, fake);

    expect(result).not.toBeNull();
    expect(result?.recreated).toEqual(expect.arrayContaining([CHECKIN_HOURLY_ID, DAILY_REFLECTION_ID]));
  });

  it('Test 16: [foreground] 재생성이 발생한 호출에서 console.log가 1회 이상 호출되고 그 인자에 재생성된 id가 포함된다 (D-07 — 콘솔 로그가 유일한 관찰 창구)', async () => {
    const fake = createFakeNotifications();
    fake.__setPermission('granted');

    await runForegroundNotificationCheck(PHASE2_NOTIFICATION_SETTINGS, fake);

    expect(logSpy).toHaveBeenCalled();
    const loggedArgs = logSpy.mock.calls.flat().join(' ');
    expect(loggedArgs).toContain(CHECKIN_HOURLY_ID);
  });

  it('Test 17: [foreground] 재생성이 전혀 없는 정상 상태 호출에서는 console.log가 호출되지 않는다 — 조용한 정상 경로, 로그 노이즈 방지', async () => {
    const fake = createFakeNotifications();
    fake.__setPermission('granted');
    fake.__seed([CHECKIN_HOURLY_ID, DAILY_REFLECTION_ID]);

    await runForegroundNotificationCheck(PHASE2_NOTIFICATION_SETTINGS, fake);

    expect(logSpy).not.toHaveBeenCalled();
  });
});
