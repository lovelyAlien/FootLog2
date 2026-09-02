/**
 * @jest-environment node
 */
// src/db/migrations.test.ts
// Plan 01-03 Task 1 (RED) — 실제 SQLite 엔진(node:sqlite)에 대해
// `migrateDbIfNeeded`의 마이그레이션 계약을 검증한다.
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { createTestDb } from './testing/nodeSqliteAdapter';
import { DATABASE_VERSION, migrateDbIfNeeded } from './migrations';
import {
  CREATE_CHECKINS_INDEXES_SQL,
  CREATE_CHECKINS_TABLE_SQL,
  CREATE_DAILY_REFLECTIONS_TABLE_SQL,
  CREATE_DRAFTS_TABLE_SQL,
} from './schema';
import { stripComments } from '../test-utils/stripComments';

const CHECKINS_COLUMNS = [
  'id',
  'timestamp_utc',
  'local_date_key',
  'timezone_at_capture',
  'lat',
  'lng',
  'accuracy_meters',
  'location_source',
  'note',
  'photo_path',
  'created_at',
  'updated_at',
  'schema_version',
];

const DAILY_REFLECTIONS_COLUMNS = [
  'id',
  'date',
  'new_place_answer',
  'free_reflection',
  'created_at',
  'updated_at',
];

const DRAFTS_COLUMNS = [
  'id',
  'lat',
  'lng',
  'accuracy_meters',
  'location_source',
  'local_date_key',
  'timezone_at_capture',
  'created_at',
  'updated_at',
];

const APP_SETTINGS_COLUMNS = [
  'id',
  'checkin_frequency',
  'daily_reflection_enabled',
  'updated_at',
];

describe('migrateDbIfNeeded', () => {
  it('Test 1: 빈 DB에서 checkins/daily_reflections/drafts/app_settings 테이블을 생성하고 user_version을 3으로 올린다', async () => {
    const { db, raw, close } = createTestDb();
    try {
      await migrateDbIfNeeded(db);

      const tables = raw
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
        .all() as { name: string }[];
      const tableNames = tables.map((t) => t.name);
      expect(tableNames).toContain('checkins');
      expect(tableNames).toContain('daily_reflections');
      expect(tableNames).toContain('drafts');
      expect(tableNames).toContain('app_settings');

      const versionRow = raw.prepare('PRAGMA user_version').get() as {
        user_version: number;
      };
      expect(versionRow.user_version).toBe(DATABASE_VERSION);
      expect(DATABASE_VERSION).toBe(3);
    } finally {
      close();
    }
  });

  it('Test 2: checkins 테이블이 정확히 13개 컬럼을 계약대로 갖는다', async () => {
    const { db, raw, close } = createTestDb();
    try {
      await migrateDbIfNeeded(db);

      const columns = raw
        .prepare('PRAGMA table_info(checkins)')
        .all() as { name: string }[];
      expect(columns).toHaveLength(13);

      const columnNames = new Set(columns.map((c) => c.name));
      expect(columnNames).toEqual(new Set(CHECKINS_COLUMNS));

      expect(columnNames.has('local_date_key')).toBe(true);
      expect(columnNames.has('timezone_at_capture')).toBe(true);
      expect(columnNames.has('location_source')).toBe(true);
      expect(columnNames.has('photo_path')).toBe(true);
      expect(columnNames.has('schema_version')).toBe(true);
    } finally {
      close();
    }
  });

  it('Test 3: daily_reflections 테이블이 정확히 6개 컬럼을 계약대로 갖는다', async () => {
    const { db, raw, close } = createTestDb();
    try {
      await migrateDbIfNeeded(db);

      const columns = raw
        .prepare('PRAGMA table_info(daily_reflections)')
        .all() as { name: string }[];
      expect(columns).toHaveLength(6);

      const columnNames = new Set(columns.map((c) => c.name));
      expect(columnNames).toEqual(new Set(DAILY_REFLECTIONS_COLUMNS));
    } finally {
      close();
    }
  });

  it('Test 4: NOT NULL / UNIQUE 제약이 실제로 강제된다', async () => {
    const { db, raw, close } = createTestDb();
    try {
      await migrateDbIfNeeded(db);

      raw
        .prepare(
          `INSERT INTO daily_reflections (id, date, created_at, updated_at)
           VALUES (?, ?, ?, ?)`
        )
        .run('r1', '2026-08-26', '2026-08-26T00:00:00Z', '2026-08-26T00:00:00Z');

      expect(() => {
        raw
          .prepare(
            `INSERT INTO daily_reflections (id, date, created_at, updated_at)
             VALUES (?, ?, ?, ?)`
          )
          .run('r2', '2026-08-26', '2026-08-26T00:00:00Z', '2026-08-26T00:00:00Z');
      }).toThrow();

      expect(() => {
        raw
          .prepare(
            `INSERT INTO checkins (
               id, timestamp_utc, local_date_key, timezone_at_capture,
               lat, lng, location_source, created_at, updated_at
             ) VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?)`
          )
          .run(
            'c1',
            '2026-08-26T00:00:00Z',
            '2026-08-26',
            'Asia/Seoul',
            126.978,
            'gps_auto',
            '2026-08-26T00:00:00Z',
            '2026-08-26T00:00:00Z'
          );
      }).toThrow();
    } finally {
      close();
    }
  });

  it('Test 5: 재실행해도 idempotent하고 기존 데이터가 보존된다 (핵심)', async () => {
    const { db, raw, close } = createTestDb();
    try {
      await migrateDbIfNeeded(db);

      await db.runAsync(
        `INSERT INTO checkins (
           id, timestamp_utc, local_date_key, timezone_at_capture,
           lat, lng, accuracy_meters, location_source, note, photo_path,
           created_at, updated_at, schema_version
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        'c1',
        '2026-08-26T00:00:00Z',
        '2026-08-26',
        'Asia/Seoul',
        37.5665,
        126.978,
        5.0,
        'gps_auto',
        '노트',
        null,
        '2026-08-26T00:00:00Z',
        '2026-08-26T00:00:00Z',
        1
      );

      await db.runAsync(
        `INSERT INTO daily_reflections (id, date, new_place_answer, free_reflection, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        'r1',
        '2026-08-26',
        'yes',
        '오늘 하루',
        '2026-08-26T00:00:00Z',
        '2026-08-26T00:00:00Z'
      );

      await migrateDbIfNeeded(db);

      const checkins = raw.prepare('SELECT * FROM checkins').all();
      const reflections = raw.prepare('SELECT * FROM daily_reflections').all();
      expect(checkins).toHaveLength(1);
      expect(reflections).toHaveLength(1);

      const versionRow = raw.prepare('PRAGMA user_version').get() as {
        user_version: number;
      };
      // DATABASE_VERSION 3(Plan 06-01)으로 갱신 — 빈 DB에서 시작한 첫 migrateDbIfNeeded
      // 호출이 이미 최신 버전까지 연쇄 실행하므로 재실행 후에도 3이다.
      expect(versionRow.user_version).toBe(DATABASE_VERSION);
    } finally {
      close();
    }
  });

  it('Test 6: user_version이 이미 DATABASE_VERSION보다 크면 execAsync를 호출하지 않고 즉시 반환한다', async () => {
    const { db, raw, close } = createTestDb();
    try {
      raw.exec('PRAGMA user_version = 99');

      const execSpy = jest.fn(db.execAsync);
      const spiedDb = { ...db, execAsync: execSpy };

      await migrateDbIfNeeded(spiedDb);

      expect(execSpy).not.toHaveBeenCalled();
    } finally {
      close();
    }
  });

  it('Test 7: 마이그레이션 이후 컬럼을 추가해도 기존 데이터가 지워지지 않는다 (Success Criteria 3)', async () => {
    const { db, raw, close } = createTestDb();
    try {
      await migrateDbIfNeeded(db);

      await db.runAsync(
        `INSERT INTO checkins (
           id, timestamp_utc, local_date_key, timezone_at_capture,
           lat, lng, location_source, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        'c1',
        '2026-08-26T00:00:00Z',
        '2026-08-26',
        'Asia/Seoul',
        37.5665,
        126.978,
        'gps_auto',
        '2026-08-26T00:00:00Z',
        '2026-08-26T00:00:00Z'
      );

      raw.exec('ALTER TABLE checkins ADD COLUMN test_future_col TEXT');
      raw.exec('PRAGMA user_version = 2');

      const checkins = raw.prepare('SELECT * FROM checkins').all();
      expect(checkins).toHaveLength(1);
    } finally {
      close();
    }
  });

  it('Test 8: PRAGMA user_version 한 줄을 제외하고 SQL 문자열 보간이 사용되지 않는다 (T-1-01)', () => {
    const migrationsSource = fs.readFileSync(
      path.join(__dirname, 'migrations.ts'),
      'utf-8'
    );

    const codeLines = stripComments(migrationsSource).split('\n');
    const interpolatedLines = codeLines.filter((line) => line.includes('${'));

    expect(interpolatedLines).toHaveLength(1);
    expect(interpolatedLines[0]).toMatch(/PRAGMA user_version/);
  });

  it('Test 9: 실제 파일 기반 DB에서 journal_mode가 WAL로 설정된다 (:memory:는 WAL을 조용히 무시하므로 검증 불가)', async () => {
    const tmpPath = path.join(
      os.tmpdir(),
      `footlog-wal-test-${Date.now()}-${Math.random().toString(36).slice(2)}.db`
    );
    const { db, raw, close } = createTestDb(tmpPath);
    try {
      await migrateDbIfNeeded(db);

      const row = raw.prepare('PRAGMA journal_mode').get() as { journal_mode: string };
      expect(row.journal_mode.toLowerCase()).toBe('wal');
    } finally {
      close();
      for (const suffix of ['', '-wal', '-shm', '-journal']) {
        fs.rmSync(`${tmpPath}${suffix}`, { force: true });
      }
    }
  });

  it('Test 10: CREATE_DRAFTS_TABLE_SQL 실행 후 drafts 테이블이 sqlite_master에 존재한다', () => {
    const { raw, close } = createTestDb();
    try {
      raw.exec(CREATE_DRAFTS_TABLE_SQL);

      const tables = raw
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
        .all() as { name: string }[];
      const tableNames = tables.map((t) => t.name);
      expect(tableNames).toContain('drafts');
    } finally {
      close();
    }
  });

  it('Test 11: drafts 테이블이 정확히 9개 컬럼을 계약대로 갖는다', () => {
    const { raw, close } = createTestDb();
    try {
      raw.exec(CREATE_DRAFTS_TABLE_SQL);

      const columns = raw.prepare('PRAGMA table_info(drafts)').all() as { name: string }[];
      expect(columns).toHaveLength(9);

      const columnNames = new Set(columns.map((c) => c.name));
      expect(columnNames).toEqual(new Set(DRAFTS_COLUMNS));
    } finally {
      close();
    }
  });

  it('Test 12: id가 PRIMARY KEY이고 NOT NULL이다 (id 없이 insert하면 실패한다)', () => {
    const { raw, close } = createTestDb();
    try {
      raw.exec(CREATE_DRAFTS_TABLE_SQL);

      expect(() => {
        raw
          .prepare(
            `INSERT INTO drafts (
               lat, lng, location_source, local_date_key, timezone_at_capture,
               created_at, updated_at
             ) VALUES (?, ?, ?, ?, ?, ?, ?)`
          )
          .run(
            37.5665,
            126.978,
            'gps_auto',
            '2026-08-26',
            'Asia/Seoul',
            '2026-08-26T00:00:00Z',
            '2026-08-26T00:00:00Z'
          );
      }).toThrow();
    } finally {
      close();
    }
  });

  it('Test 13: lat/lng/location_source/local_date_key/timezone_at_capture/created_at/updated_at에 NULL을 넣으면 실패한다', () => {
    const { raw, close } = createTestDb();
    try {
      raw.exec(CREATE_DRAFTS_TABLE_SQL);

      const baseRow: Record<string, unknown> = {
        id: 'draft',
        lat: 37.5665,
        lng: 126.978,
        location_source: 'gps_auto',
        local_date_key: '2026-08-26',
        timezone_at_capture: 'Asia/Seoul',
        created_at: '2026-08-26T00:00:00Z',
        updated_at: '2026-08-26T00:00:00Z',
      };

      const notNullColumns = [
        'lat',
        'lng',
        'location_source',
        'local_date_key',
        'timezone_at_capture',
        'created_at',
        'updated_at',
      ];

      for (const column of notNullColumns) {
        const row = { ...baseRow, [column]: null };
        const columns = Object.keys(row);
        const placeholders = columns.map(() => '?').join(', ');
        expect(() => {
          raw
            .prepare(`INSERT INTO drafts (${columns.join(', ')}) VALUES (${placeholders})`)
            .run(...columns.map((c) => row[c] as never));
        }).toThrow();
      }
    } finally {
      close();
    }
  });

  it('Test 14: accuracy_meters에는 NULL을 넣을 수 있다', () => {
    const { raw, close } = createTestDb();
    try {
      raw.exec(CREATE_DRAFTS_TABLE_SQL);

      expect(() => {
        raw
          .prepare(
            `INSERT INTO drafts (
               id, lat, lng, accuracy_meters, location_source, local_date_key,
               timezone_at_capture, created_at, updated_at
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .run(
            'draft',
            37.5665,
            126.978,
            null,
            'gps_auto',
            '2026-08-26',
            'Asia/Seoul',
            '2026-08-26T00:00:00Z',
            '2026-08-26T00:00:00Z'
          );
      }).not.toThrow();

      const rows = raw.prepare('SELECT * FROM drafts').all();
      expect(rows).toHaveLength(1);
    } finally {
      close();
    }
  });

  it('Test 15: user_version=1 기기를 업그레이드해도 기존 checkins 데이터가 보존되고 drafts가 추가된다', async () => {
    const { db, raw, close } = createTestDb();
    try {
      // v1 기기 재현: migrateDbIfNeeded 대신 v1 시점의 DDL을 직접 실행하고
      // user_version을 1로 세팅한다 (drafts 테이블은 아직 없는 상태).
      raw.exec(CREATE_CHECKINS_TABLE_SQL);
      raw.exec(CREATE_DAILY_REFLECTIONS_TABLE_SQL);
      raw.exec(CREATE_CHECKINS_INDEXES_SQL);
      raw.exec('PRAGMA user_version = 1');

      await db.runAsync(
        `INSERT INTO checkins (
           id, timestamp_utc, local_date_key, timezone_at_capture,
           lat, lng, location_source, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        'c1',
        '2026-08-26T00:00:00Z',
        '2026-08-26',
        'Asia/Seoul',
        37.5665,
        126.978,
        'gps_auto',
        '2026-08-26T00:00:00Z',
        '2026-08-26T00:00:00Z'
      );

      await migrateDbIfNeeded(db);

      const tables = raw
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
        .all() as { name: string }[];
      expect(tables.map((t) => t.name)).toContain('drafts');

      const checkins = raw.prepare('SELECT * FROM checkins').all();
      expect(checkins).toHaveLength(1);

      const versionRow = raw.prepare('PRAGMA user_version').get() as {
        user_version: number;
      };
      // DATABASE_VERSION 3(Plan 06-01)으로 갱신 — v1에서 시작한 migrateDbIfNeeded 호출이
      // 이미 최신 버전까지 연쇄 실행한다.
      expect(versionRow.user_version).toBe(DATABASE_VERSION);
    } finally {
      close();
    }
  });

  it('Test 16: migrateDbIfNeeded를 연속 2회 실행해도 결과가 동일하다 (idempotent, v2)', async () => {
    const { db, raw, close } = createTestDb();
    try {
      await migrateDbIfNeeded(db);
      await migrateDbIfNeeded(db);

      const tables = raw
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
        .all() as { name: string }[];
      const tableNames = tables.map((t) => t.name);
      expect(tableNames).toContain('checkins');
      expect(tableNames).toContain('daily_reflections');
      expect(tableNames).toContain('drafts');

      const versionRow = raw.prepare('PRAGMA user_version').get() as {
        user_version: number;
      };
      // DATABASE_VERSION 3(Plan 06-01)으로 갱신.
      expect(versionRow.user_version).toBe(DATABASE_VERSION);
    } finally {
      close();
    }
  });

  it('Test A: 마이그레이션 후 app_settings 테이블이 sqlite_master에 존재한다', async () => {
    const { db, raw, close } = createTestDb();
    try {
      await migrateDbIfNeeded(db);

      const tables = raw
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
        .all() as { name: string }[];
      expect(tables.map((t) => t.name)).toContain('app_settings');
    } finally {
      close();
    }
  });

  it('Test B: app_settings 테이블이 정확히 4개 컬럼을 계약대로 갖는다', async () => {
    const { db, raw, close } = createTestDb();
    try {
      await migrateDbIfNeeded(db);

      const columns = raw
        .prepare('PRAGMA table_info(app_settings)')
        .all() as { name: string }[];
      expect(columns).toHaveLength(4);

      const columnNames = new Set(columns.map((c) => c.name));
      expect(columnNames).toEqual(new Set(APP_SETTINGS_COLUMNS));
    } finally {
      close();
    }
  });

  it('Test C: id 없이 insert하면 실패하고, 필수 컬럼에 NULL을 넣으면 실패한다', async () => {
    const { db, raw, close } = createTestDb();
    try {
      await migrateDbIfNeeded(db);

      expect(() => {
        raw
          .prepare(
            `INSERT INTO app_settings (checkin_frequency, daily_reflection_enabled, updated_at)
             VALUES (?, ?, ?)`
          )
          .run('hourly', 1, '2026-09-01T00:00:00Z');
      }).toThrow();

      const baseRow: Record<string, unknown> = {
        id: 'settings',
        checkin_frequency: 'hourly',
        daily_reflection_enabled: 1,
        updated_at: '2026-09-01T00:00:00Z',
      };
      const notNullColumns = ['checkin_frequency', 'daily_reflection_enabled', 'updated_at'];

      for (const column of notNullColumns) {
        const row = { ...baseRow, [column]: null };
        const columns = Object.keys(row);
        const placeholders = columns.map(() => '?').join(', ');
        expect(() => {
          raw
            .prepare(`INSERT INTO app_settings (${columns.join(', ')}) VALUES (${placeholders})`)
            .run(...columns.map((c) => row[c] as never));
        }).toThrow();
      }
    } finally {
      close();
    }
  });

  it('Test D: user_version=2 기기를 업그레이드해도 기존 checkins/drafts 데이터가 보존되고 app_settings만 추가된다', async () => {
    const { db, raw, close } = createTestDb();
    try {
      // v2 기기 재현: v2 시점의 DDL을 직접 실행하고 user_version을 2로 세팅한다
      // (app_settings 테이블은 아직 없는 상태).
      raw.exec(CREATE_CHECKINS_TABLE_SQL);
      raw.exec(CREATE_DAILY_REFLECTIONS_TABLE_SQL);
      raw.exec(CREATE_CHECKINS_INDEXES_SQL);
      raw.exec(CREATE_DRAFTS_TABLE_SQL);
      raw.exec('PRAGMA user_version = 2');

      await db.runAsync(
        `INSERT INTO checkins (
           id, timestamp_utc, local_date_key, timezone_at_capture,
           lat, lng, location_source, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        'c1',
        '2026-08-26T00:00:00Z',
        '2026-08-26',
        'Asia/Seoul',
        37.5665,
        126.978,
        'gps_auto',
        '2026-08-26T00:00:00Z',
        '2026-08-26T00:00:00Z'
      );

      await db.runAsync(
        `INSERT INTO drafts (
           id, lat, lng, location_source, local_date_key, timezone_at_capture,
           created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        'draft',
        37.0,
        127.0,
        'gps_auto',
        '2026-08-26',
        'Asia/Seoul',
        '2026-08-26T00:00:00Z',
        '2026-08-26T00:00:00Z'
      );

      await migrateDbIfNeeded(db);

      const tables = raw
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
        .all() as { name: string }[];
      expect(tables.map((t) => t.name)).toContain('app_settings');

      const checkins = raw.prepare('SELECT * FROM checkins').all();
      const drafts = raw.prepare('SELECT * FROM drafts').all();
      expect(checkins).toHaveLength(1);
      expect(drafts).toHaveLength(1);

      const versionRow = raw.prepare('PRAGMA user_version').get() as {
        user_version: number;
      };
      expect(versionRow.user_version).toBe(3);
    } finally {
      close();
    }
  });

  it('Test E: 마이그레이션 직후 app_settings는 0행이다 (기본 row를 시드하지 않는다)', async () => {
    const { db, raw, close } = createTestDb();
    try {
      await migrateDbIfNeeded(db);

      const rows = raw.prepare('SELECT COUNT(*) as c FROM app_settings').get() as { c: number };
      expect(rows.c).toBe(0);
    } finally {
      close();
    }
  });
});
