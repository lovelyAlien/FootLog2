/**
 * @jest-environment node
 */
// src/settings/settingsRepo.test.ts
// 06-01-PLAN.md Task 2 (RED) — 설정 값 단일 row upsert/read + 빈도 런타임 가드 계약을
// 실제 SQLite 엔진(node:sqlite)에 대해 검증한다.

import { createTestDb } from '../db/testing/nodeSqliteAdapter';
import { migrateDbIfNeeded } from '../db/migrations';
import type { AppSettingsRow } from '../db/schema';
import { PHASE2_NOTIFICATION_SETTINGS } from '../notifications/config';
import {
  isNotificationFrequency,
  resolveNotificationSettings,
  getSettingsRow,
  upsertSettings,
} from './settingsRepo';

describe('isNotificationFrequency', () => {
  it('Test 1: hourly/every3h/off는 true다', () => {
    expect(isNotificationFrequency('hourly')).toBe(true);
    expect(isNotificationFrequency('every3h')).toBe(true);
    expect(isNotificationFrequency('off')).toBe(true);
  });

  it('Test 2: 유니온 밖 값(daily/빈 문자열/null/undefined/숫자)은 false다', () => {
    expect(isNotificationFrequency('daily')).toBe(false);
    expect(isNotificationFrequency('')).toBe(false);
    expect(isNotificationFrequency(null)).toBe(false);
    expect(isNotificationFrequency(undefined)).toBe(false);
    expect(isNotificationFrequency(1)).toBe(false);
  });
});

describe('resolveNotificationSettings', () => {
  it('Test 3: row가 null이면 PHASE2_NOTIFICATION_SETTINGS와 깊은 동등이다 (신규 설치 경로)', () => {
    expect(resolveNotificationSettings(null)).toEqual(PHASE2_NOTIFICATION_SETTINGS);
  });

  it('Test 4: 정상 row는 checkinFrequency/dailyReflectionEnabled를 그대로 변환한다', () => {
    const row: AppSettingsRow = {
      id: 'settings',
      checkin_frequency: 'every3h',
      daily_reflection_enabled: 0,
      updated_at: '2026-09-01T00:00:00Z',
    };
    expect(resolveNotificationSettings(row)).toEqual({
      checkinFrequency: 'every3h',
      dailyReflectionEnabled: false,
      dailyReflectionHour: 21,
    });
  });

  it('Test 5: checkin_frequency가 유니온 밖이면 throw하지 않고 hourly로 폴백한다 (T-06-01 fail-safe)', () => {
    const row = {
      id: 'settings',
      checkin_frequency: 'garbage',
      daily_reflection_enabled: 1,
      updated_at: '2026-09-01T00:00:00Z',
    } as AppSettingsRow;

    let result: ReturnType<typeof resolveNotificationSettings> | undefined;
    expect(() => {
      result = resolveNotificationSettings(row);
    }).not.toThrow();
    expect(result?.checkinFrequency).toBe('hourly');
  });
});

describe('upsertSettings / getSettingsRow', () => {
  it('Test 6: upsertSettings 후 getSettingsRow가 저장한 값을 그대로 돌려준다', async () => {
    const { db, close } = createTestDb();
    try {
      await migrateDbIfNeeded(db);

      await upsertSettings(
        db,
        { checkinFrequency: 'every3h', dailyReflectionEnabled: false, dailyReflectionHour: 21 },
        '2026-09-01T00:00:00.000Z'
      );

      const row = await getSettingsRow(db);
      expect(row).not.toBeNull();
      expect(row?.checkin_frequency).toBe('every3h');
      expect(row?.daily_reflection_enabled).toBe(0);
      expect(row?.updated_at).toBe('2026-09-01T00:00:00.000Z');
    } finally {
      close();
    }
  });

  it('Test 7: upsertSettings를 서로 다른 값으로 두 번 호출해도 1행만 남고 마지막 값이 남는다', async () => {
    const { db, raw, close } = createTestDb();
    try {
      await migrateDbIfNeeded(db);

      await upsertSettings(
        db,
        { checkinFrequency: 'hourly', dailyReflectionEnabled: true, dailyReflectionHour: 21 },
        '2026-09-01T00:00:00.000Z'
      );
      await upsertSettings(
        db,
        { checkinFrequency: 'off', dailyReflectionEnabled: false, dailyReflectionHour: 21 },
        '2026-09-01T00:01:00.000Z'
      );

      const countRow = raw.prepare('SELECT COUNT(*) as c FROM app_settings').get() as {
        c: number;
      };
      expect(countRow.c).toBe(1);

      const row = await getSettingsRow(db);
      expect(row?.checkin_frequency).toBe('off');
      expect(row?.daily_reflection_enabled).toBe(0);
      expect(row?.updated_at).toBe('2026-09-01T00:01:00.000Z');
    } finally {
      close();
    }
  });

  it('Test 8: checkinFrequency가 유니온 밖 값이면 쓰기 시점에 rejects한다 (T-06-01)', async () => {
    const { db, raw, close } = createTestDb();
    try {
      await migrateDbIfNeeded(db);

      await expect(
        upsertSettings(
          db,
          {
            checkinFrequency: 'garbage' as unknown as 'hourly',
            dailyReflectionEnabled: true,
            dailyReflectionHour: 21,
          },
          '2026-09-01T00:00:00.000Z'
        )
      ).rejects.toThrow();

      const countRow = raw.prepare('SELECT COUNT(*) as c FROM app_settings').get() as {
        c: number;
      };
      expect(countRow.c).toBe(0);
    } finally {
      close();
    }
  });

  it('Test 9: 설정 row가 없으면 getSettingsRow는 null을 반환한다', async () => {
    const { db, close } = createTestDb();
    try {
      await migrateDbIfNeeded(db);

      const row = await getSettingsRow(db);
      expect(row).toBeNull();
    } finally {
      close();
    }
  });
});
