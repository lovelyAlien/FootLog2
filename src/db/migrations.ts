// src/db/migrations.ts
// Plan 01-03 Task 2 — PRAGMA user_version 기반 마이그레이션 러너.
// Source: https://docs.expo.dev/versions/latest/sdk/sqlite/ (공식 마이그레이션 레시피)
//
// 배선 규칙(RESEARCH.md Pitfall 3, migration_discipline #3): 이 함수는 절대 컴포넌트
// body나 맨 useEffect에서 직접 호출하지 않는다 — 반드시 `SQLiteProvider`의 `onInit` prop
// 으로만 전달한다(Plan 01-04가 배선을 담당한다).
import { type SQLiteDatabase } from 'expo-sqlite';
import {
  CREATE_APP_SETTINGS_TABLE_SQL,
  CREATE_CHECKINS_INDEXES_SQL,
  CREATE_CHECKINS_TABLE_SQL,
  CREATE_DAILY_REFLECTIONS_TABLE_SQL,
  CREATE_DRAFTS_TABLE_SQL,
} from './schema';

export const DATABASE_NAME = 'footlog.db';
export const DATABASE_VERSION = 4;

export type MigratableDb = Pick<SQLiteDatabase, 'getFirstAsync' | 'execAsync' | 'runAsync' | 'getAllAsync'>;

export async function migrateDbIfNeeded(db: MigratableDb): Promise<void> {
  const result = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let currentDbVersion = result?.user_version ?? 0;

  if (currentDbVersion >= DATABASE_VERSION) {
    return;
  }

  if (currentDbVersion === 0) {
    await db.execAsync("PRAGMA journal_mode = 'wal';");
    await db.execAsync(CREATE_CHECKINS_TABLE_SQL);
    await db.execAsync(CREATE_DAILY_REFLECTIONS_TABLE_SQL);
    await db.execAsync(CREATE_CHECKINS_INDEXES_SQL);
    currentDbVersion = 1;
  }

  if (currentDbVersion === 1) {
    await db.execAsync(CREATE_DRAFTS_TABLE_SQL);
    currentDbVersion = 2;
  }

  if (currentDbVersion === 2) {
    await db.execAsync(CREATE_APP_SETTINGS_TABLE_SQL);
    currentDbVersion = 3;
  }

  if (currentDbVersion === 3) {
    // Plan 07-01(D-05): CREATE문이 아니라 ALTER문으로만 컬럼을 추가한다 — 이미 출하된 v3
    // DDL(CREATE_APP_SETTINGS_TABLE_SQL)을 사후 수정하지 않기 위함(migration_discipline #2,
    // 07-RESEARCH.md Pitfall 5). `DEFAULT 21`은 SQLite가 기존 row(있다면)에도 자동으로
    // 채워주므로, D-05 Discretion("21시가 반드시 포함돼야 창업자 현재 설정이 깨지지
    // 않는다")을 별도 백필 스크립트 없이 이 한 문장으로 보장한다(07-RESEARCH.md Pattern 7 /
    // Assumptions Log A3).
    await db.execAsync(
      'ALTER TABLE app_settings ADD COLUMN daily_reflection_hour INTEGER NOT NULL DEFAULT 21'
    );
    currentDbVersion = 4;
  }

  // 다음 phase에서 컬럼/테이블 추가가 필요하면 여기에 새 블록을 append한다:
  // if (currentDbVersion === 4) { await db.execAsync('ALTER TABLE ...'); currentDbVersion = 5; }
  // 이전 버전 블록들(위쪽 if문들)은 절대 사후 수정하지 않는다 — 이미 그 버전을 통과한
  // 기기는 변경분을 받지 못한다(migration_discipline #2).

  // 보안 주석(T-1-01): SQLite PRAGMA는 바인딩 파라미터를 받지 않으므로, 이 한 줄만
  // 템플릿 보간을 사용한다. 보간되는 값(currentDbVersion)은 이 모듈 내부에서 정수
  // 리터럴로만 갱신되는 지역 변수이며 함수 인자나 외부 입력에서 오지 않는다. 이후
  // phase의 모든 DML은 반드시 runAsync의 `?` 플레이스홀더 + 파라미터 바인딩을 사용할 것.
  await db.execAsync(`PRAGMA user_version = ${currentDbVersion}`);
}
