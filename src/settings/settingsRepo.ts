// src/settings/settingsRepo.ts
// 06-01-PLAN.md Task 2 — app_settings 단일 row upsert/read + NotificationFrequency
// 런타임 가드.
//
// SQL 문자열은 이 파일에만 존재한다 — SettingsScreen.tsx에 절대 등장하지 않는다
// (src/checkin/draftRepo.ts / src/checkin/checkinRepo.ts 헤더와 동일 계약).
//
// `expo-sqlite`를 직접 import하지 않고 `MigratableDb`를 인자로 받는다
// (src/db/migrations.ts와 동일한 좁힌 타입 관례). 모든 DML은 `?` 플레이스홀더 +
// 파라미터 바인딩만 사용한다 — 문자열 보간 금지(T-06-01).
import type { MigratableDb } from '../db/migrations';
import type { AppSettingsRow } from '../db/schema';
import type { NotificationFrequency, NotificationSettings } from '../notifications/config';
import { PHASE2_NOTIFICATION_SETTINGS } from '../notifications/config';
import { SETTINGS_ROW_ID } from './config';

// zod/joi 등 검증 라이브러리를 도입하지 않는다 — 06-RESEARCH.md Security Domain V5:
// 3값 enum에 검증 라이브러리는 과설계다. 닫힌 리터럴 배열로 판정한다.
const NOTIFICATION_FREQUENCIES: readonly NotificationFrequency[] = ['hourly', 'every3h', 'off'];

export function isNotificationFrequency(value: unknown): value is NotificationFrequency {
  return (
    typeof value === 'string' &&
    (NOTIFICATION_FREQUENCIES as readonly string[]).includes(value)
  );
}

// 순수 함수다(db 인자 없음). row가 null이거나 checkin_frequency가 유니온 밖이면 해당
// 필드만 PHASE2_NOTIFICATION_SETTINGS 값으로 폴백한다(T-06-01 읽기 시점 fail-safe).
// dailyReflectionHour는 컬럼이 없으므로 항상 PHASE2_NOTIFICATION_SETTINGS 값을 쓴다.
export function resolveNotificationSettings(row: AppSettingsRow | null): NotificationSettings {
  if (row === null) {
    return PHASE2_NOTIFICATION_SETTINGS;
  }

  const checkinFrequency = isNotificationFrequency(row.checkin_frequency)
    ? row.checkin_frequency
    : PHASE2_NOTIFICATION_SETTINGS.checkinFrequency;

  return {
    checkinFrequency,
    dailyReflectionEnabled: row.daily_reflection_enabled === 1,
    dailyReflectionHour: PHASE2_NOTIFICATION_SETTINGS.dailyReflectionHour,
  };
}

export async function getSettingsRow(db: MigratableDb): Promise<AppSettingsRow | null> {
  const row = await db.getFirstAsync<AppSettingsRow>(
    'SELECT * FROM app_settings WHERE id = ?',
    SETTINGS_ROW_ID
  );
  return row ?? null;
}

// now는 호출자가 넘긴다 — repo 안에서 new Date()를 부르지 않는다(테스트 결정성,
// NewCheckinParams.timestampUtc 선례와 동일).
export async function upsertSettings(
  db: MigratableDb,
  settings: NotificationSettings,
  now: string
): Promise<void> {
  if (!isNotificationFrequency(settings.checkinFrequency)) {
    throw new Error(
      'upsertSettings: checkinFrequency가 유니온 밖 값입니다: ' +
        String(settings.checkinFrequency)
    );
  }

  await db.runAsync(
    `INSERT OR REPLACE INTO app_settings (
       id, checkin_frequency, daily_reflection_enabled, updated_at
     ) VALUES (?, ?, ?, ?)`,
    SETTINGS_ROW_ID,
    settings.checkinFrequency,
    settings.dailyReflectionEnabled ? 1 : 0,
    now
  );
}
