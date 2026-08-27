/**
 * @jest-environment node
 */
// src/checkin/checkinRepo.test.ts
// 03-04-PLAN.md Task 3 (RED) — 체크인 insert 1회 자동 재시도 + insert 성공 후에만
// 드래프트 삭제 계약을 검증한다.
//
// 성공 경로/좌표 가드/최근 좌표 조회/메모·사진 갱신은 실제 SQLite 엔진
// (createTestDb + migrateDbIfNeeded)으로 검증한다. 실패/재시도 경로는 실제 엔진으로
// 디스크 실패를 재현할 수 없으므로, MigratableDb를 구조적으로 만족하는 인라인 fake db를
// 이 파일 안에 만들어(호출 카운터를 세고 N번째 runAsync까지 throw) 검증한다
// (03-PATTERNS.md가 지정한 예외 케이스).
import type { MigratableDb } from '../db/migrations';
import { createTestDb } from '../db/testing/nodeSqliteAdapter';
import { migrateDbIfNeeded } from '../db/migrations';
import { upsertDraft, getDraft } from './draftRepo';
import {
  commitCheckin,
  getLatestCheckinCoordinate,
  updateCheckinNoteAndPhoto,
  runWithSingleRetry,
  type NewCheckinParams,
} from './checkinRepo';

function validParams(overrides: Partial<NewCheckinParams> = {}): NewCheckinParams {
  return {
    id: 'checkin-1',
    timestampUtc: '2026-08-27T00:00:00.000Z',
    localDateKey: '2026-08-27',
    timezoneAtCapture: 'Asia/Seoul',
    lat: 37.5665,
    lng: 126.978,
    accuracyMeters: 5,
    locationSource: 'gps_auto',
    ...overrides,
  };
}

async function seedDraft(db: MigratableDb): Promise<void> {
  await upsertDraft(db, {
    lat: 37.5665,
    lng: 126.978,
    accuracyMeters: 5,
    locationSource: 'gps_auto',
    localDateKey: '2026-08-27',
    timezoneAtCapture: 'Asia/Seoul',
    now: '2026-08-27T00:00:00.000Z',
  });
}

describe('runWithSingleRetry', () => {
  it('첫 시도에서 성공하면 attempt를 1회만 실행한다', async () => {
    let attempts = 0;
    const result = await runWithSingleRetry(async () => {
      attempts++;
      return 'ok';
    });
    expect(result).toEqual({ ok: true, value: 'ok' });
    expect(attempts).toBe(1);
  });

  it('첫 시도가 throw하고 두 번째가 성공하면 ok:true를 반환한다', async () => {
    let attempts = 0;
    const result = await runWithSingleRetry(async () => {
      attempts++;
      if (attempts === 1) throw new Error('transient');
      return 'ok';
    });
    expect(result).toEqual({ ok: true, value: 'ok' });
    expect(attempts).toBe(2);
  });

  it('두 번 모두 throw하면 ok:false를 반환하고 정확히 2회만 시도한다', async () => {
    let attempts = 0;
    const result = await runWithSingleRetry(async () => {
      attempts++;
      throw new Error('always fails');
    });
    expect(result).toEqual({ ok: false });
    expect(attempts).toBe(2);
  });
});

describe('commitCheckin', () => {
  it('Test 1: 성공하면 { ok: true, id }를 반환하고 checkins row가 생기며 drafts row가 삭제된다', async () => {
    const { db, raw, close } = createTestDb();
    try {
      await migrateDbIfNeeded(db);
      await seedDraft(db);

      const result = await commitCheckin(db, validParams());

      expect(result).toEqual({ ok: true, id: 'checkin-1' });

      const checkins = raw.prepare('SELECT * FROM checkins').all();
      expect(checkins).toHaveLength(1);

      const draft = await getDraft(db);
      expect(draft).toBeNull();
    } finally {
      close();
    }
  });

  it('Test 2: 첫 시도가 throw하고 두 번째 시도에서 성공하는 fake db에서 정확히 2회 시도 후 성공한다', async () => {
    let insertAttempts = 0;
    const calls: string[] = [];
    const fakeDb: MigratableDb = {
      execAsync: async (sql: string) => {
        calls.push(sql);
      },
      getFirstAsync: async () => null,
      runAsync: async (sql: string, ..._params: unknown[]) => {
        calls.push(sql);
        if (sql.startsWith('INSERT INTO checkins')) {
          insertAttempts++;
          if (insertAttempts === 1) {
            throw new Error('transient disk error');
          }
        }
        return { changes: 1, lastInsertRowId: 1 };
      },
    } as unknown as MigratableDb;

    const result = await commitCheckin(fakeDb, validParams());

    expect(result).toEqual({ ok: true, id: 'checkin-1' });
    expect(insertAttempts).toBe(2);
  });

  it('Test 3: 모든 시도가 throw하는 fake db에서 write_failed를 반환하고 정확히 2회만 시도한다', async () => {
    let insertAttempts = 0;
    const fakeDb: MigratableDb = {
      execAsync: async () => {},
      getFirstAsync: async () => null,
      runAsync: async (sql: string) => {
        if (sql.startsWith('INSERT INTO checkins')) {
          insertAttempts++;
          throw new Error('disk full');
        }
        return { changes: 1, lastInsertRowId: 1 };
      },
    } as unknown as MigratableDb;

    const result = await commitCheckin(fakeDb, validParams());

    expect(result).toEqual({ ok: false, reason: 'write_failed' });
    expect(insertAttempts).toBe(2);
  });

  it('Test 4: insert가 실패한 뒤에도 drafts row가 여전히 존재하고, 이후 수동 재시도로 성공할 수 있다 (D-05)', async () => {
    const { db: realDb, raw, close } = createTestDb();
    try {
      await migrateDbIfNeeded(realDb);
      await seedDraft(realDb);

      let insertAttempts = 0;
      const forcedFailureDb: MigratableDb = {
        execAsync: (sql: string) => realDb.execAsync(sql),
        getFirstAsync: (sql: string, ...params: unknown[]) =>
          realDb.getFirstAsync(sql, ...(params as never[])),
        runAsync: async (sql: string, ...params: unknown[]) => {
          if (sql.startsWith('INSERT INTO checkins')) {
            insertAttempts++;
            throw new Error('forced failure');
          }
          return realDb.runAsync(sql, ...(params as never[]));
        },
      } as unknown as MigratableDb;

      const failResult = await commitCheckin(forcedFailureDb, validParams());
      expect(failResult).toEqual({ ok: false, reason: 'write_failed' });
      expect(insertAttempts).toBe(2);

      const draftAfterFailure = await getDraft(realDb);
      expect(draftAfterFailure).not.toBeNull();

      const checkinsAfterFailure = raw.prepare('SELECT * FROM checkins').all();
      expect(checkinsAfterFailure).toHaveLength(0);

      // 수동 재시도: 같은 params로 실제 db에 대해 다시 호출하면 성공할 수 있다.
      const retryResult = await commitCheckin(realDb, validParams());
      expect(retryResult).toEqual({ ok: true, id: 'checkin-1' });

      const draftAfterRetry = await getDraft(realDb);
      expect(draftAfterRetry).toBeNull();

      const checkinsAfterRetry = raw.prepare('SELECT * FROM checkins').all();
      expect(checkinsAfterRetry).toHaveLength(1);
    } finally {
      close();
    }
  });

  it('Test 5: 범위 밖 좌표를 넘기면 DB를 건드리지 않고 invalid_coordinate를 반환한다', async () => {
    const { db, raw, close } = createTestDb();
    try {
      await migrateDbIfNeeded(db);

      const result = await commitCheckin(db, validParams({ lat: 200 }));

      expect(result).toEqual({ ok: false, reason: 'invalid_coordinate' });

      const checkins = raw.prepare('SELECT * FROM checkins').all();
      expect(checkins).toHaveLength(0);
    } finally {
      close();
    }
  });
});

describe('getLatestCheckinCoordinate', () => {
  it('Test 6: created_at 기준 가장 최근 체크인의 { lat, lng }를 반환한다', async () => {
    const { db, close } = createTestDb();
    try {
      await migrateDbIfNeeded(db);

      await commitCheckin(
        db,
        validParams({ id: 'c1', timestampUtc: '2026-08-27T00:00:00.000Z', lat: 10, lng: 20 })
      );
      await commitCheckin(
        db,
        validParams({ id: 'c2', timestampUtc: '2026-08-27T01:00:00.000Z', lat: 30, lng: 40 })
      );

      const latest = await getLatestCheckinCoordinate(db);
      expect(latest).toEqual({ lat: 30, lng: 40 });
    } finally {
      close();
    }
  });

  it('Test 7: 체크인이 없으면 null을 반환한다', async () => {
    const { db, close } = createTestDb();
    try {
      await migrateDbIfNeeded(db);

      const latest = await getLatestCheckinCoordinate(db);
      expect(latest).toBeNull();
    } finally {
      close();
    }
  });
});

describe('updateCheckinNoteAndPhoto', () => {
  it('Test 8: note/photo_path/updated_at이 갱신된다', async () => {
    const { db, raw, close } = createTestDb();
    try {
      await migrateDbIfNeeded(db);
      await commitCheckin(db, validParams());

      await updateCheckinNoteAndPhoto(db, 'checkin-1', {
        note: '좋은 하루',
        photoPath: 'file:///documents/photo.jpg',
        now: '2026-08-27T02:00:00.000Z',
      });

      const row = raw
        .prepare('SELECT note, photo_path, updated_at FROM checkins WHERE id = ?')
        .get('checkin-1') as { note: string; photo_path: string; updated_at: string };

      expect(row.note).toBe('좋은 하루');
      expect(row.photo_path).toBe('file:///documents/photo.jpg');
      expect(row.updated_at).toBe('2026-08-27T02:00:00.000Z');
    } finally {
      close();
    }
  });
});
