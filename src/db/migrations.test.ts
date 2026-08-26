/**
 * @jest-environment node
 */
// src/db/migrations.test.ts
// Plan 01-03 Task 1 (RED) — 실제 SQLite 엔진(node:sqlite)에 대해
// `migrateDbIfNeeded`의 마이그레이션 계약을 검증한다.
import * as fs from 'node:fs';
import * as path from 'node:path';
import { createTestDb } from './testing/nodeSqliteAdapter';
import { DATABASE_VERSION, migrateDbIfNeeded } from './migrations';

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

describe('migrateDbIfNeeded', () => {
  it('Test 1: 빈 DB에서 checkins/daily_reflections 테이블을 생성하고 user_version을 1로 올린다', async () => {
    const { db, raw, close } = createTestDb();
    try {
      await migrateDbIfNeeded(db);

      const tables = raw
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
        .all() as { name: string }[];
      const tableNames = tables.map((t) => t.name);
      expect(tableNames).toContain('checkins');
      expect(tableNames).toContain('daily_reflections');

      const versionRow = raw.prepare('PRAGMA user_version').get() as {
        user_version: number;
      };
      expect(versionRow.user_version).toBe(DATABASE_VERSION);
      expect(DATABASE_VERSION).toBe(1);
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
      expect(versionRow.user_version).toBe(1);
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

    const codeLines = migrationsSource
      .split('\n')
      .filter((line) => !line.trim().startsWith('//') && !line.trim().startsWith('*'));

    const interpolatedLines = codeLines.filter((line) => line.includes('${'));

    expect(interpolatedLines).toHaveLength(1);
    expect(interpolatedLines[0]).toMatch(/PRAGMA user_version/);
  });
});
