/**
 * @jest-environment node
 */
// src/reflection/reflectionRepo.test.ts
// 07-02-PLAN.md Task 1 (RED) — daily_reflections CRUD/upsert/재시도 계약을 검증한다.
//
// 성공 경로(조회/upsert/빈문자열 정규화)는 실제 SQLite 엔진(createTestDb +
// migrateDbIfNeeded)으로, 실패/재시도 경로는 checkinRepo.test.ts와 동일하게 인라인
// fake MigratableDb(호출 카운터 + 로그)로 검증한다.
import type { MigratableDb } from '../db/migrations';
import { createTestDb } from '../db/testing/nodeSqliteAdapter';
import { migrateDbIfNeeded } from '../db/migrations';
import {
  getReflectionByDate,
  upsertReflection,
  type ReflectionSaveParams,
} from './reflectionRepo';

function validParams(overrides: Partial<ReflectionSaveParams> = {}): ReflectionSaveParams {
  return {
    id: 'reflection-1',
    date: '2026-09-02',
    newPlaceAnswer: '남산',
    freeReflection: '좋은 하루였다',
    now: '2026-09-02T12:00:00.000Z',
    ...overrides,
  };
}

describe('getReflectionByDate', () => {
  it('행이 없으면 null을 반환한다', async () => {
    const { db, close } = createTestDb();
    try {
      await migrateDbIfNeeded(db);

      const result = await getReflectionByDate(db, '2026-09-02');

      expect(result).toBeNull();
    } finally {
      close();
    }
  });
});

describe('upsertReflection', () => {
  it('저장한 뒤 getReflectionByDate가 같은 답변을 돌려준다', async () => {
    const { db, close } = createTestDb();
    try {
      await migrateDbIfNeeded(db);

      const result = await upsertReflection(db, validParams());
      expect(result).toEqual({ ok: true });

      const row = await getReflectionByDate(db, '2026-09-02');
      expect(row).toMatchObject({
        new_place_answer: '남산',
        free_reflection: '좋은 하루였다',
      });
    } finally {
      close();
    }
  });

  it('같은 date로 두 번 호출하면 행 수가 1이고, 두 번째 값이 남으며 id/created_at은 보존되고 updated_at만 갱신된다', async () => {
    const { db, raw, close } = createTestDb();
    try {
      await migrateDbIfNeeded(db);

      await upsertReflection(
        db,
        validParams({
          id: 'first-id',
          newPlaceAnswer: '첫 답변',
          freeReflection: '첫 회고',
          now: '2026-09-02T09:00:00.000Z',
        })
      );
      await upsertReflection(
        db,
        validParams({
          id: 'second-id',
          newPlaceAnswer: '두 번째 답변',
          freeReflection: '두 번째 회고',
          now: '2026-09-02T09:05:00.000Z',
        })
      );

      const rows = raw.prepare('SELECT * FROM daily_reflections').all() as Array<{
        id: string;
        new_place_answer: string;
        free_reflection: string;
        created_at: string;
        updated_at: string;
      }>;

      expect(rows).toHaveLength(1);
      expect(rows[0].id).toBe('first-id');
      expect(rows[0].new_place_answer).toBe('두 번째 답변');
      expect(rows[0].free_reflection).toBe('두 번째 회고');
      expect(rows[0].created_at).toBe('2026-09-02T09:00:00.000Z');
      expect(rows[0].updated_at).toBe('2026-09-02T09:05:00.000Z');
    } finally {
      close();
    }
  });

  it('두 필드 모두 빈 문자열이면 두 컬럼 모두 NULL로 저장된다', async () => {
    const { db, raw, close } = createTestDb();
    try {
      await migrateDbIfNeeded(db);

      await upsertReflection(
        db,
        validParams({ newPlaceAnswer: '', freeReflection: '' })
      );

      const row = raw
        .prepare('SELECT new_place_answer, free_reflection FROM daily_reflections WHERE date = ?')
        .get('2026-09-02') as { new_place_answer: string | null; free_reflection: string | null };

      expect(row.new_place_answer).toBeNull();
      expect(row.free_reflection).toBeNull();
    } finally {
      close();
    }
  });

  it('runAsync가 항상 throw하는 fake db로 호출하면 attempt가 정확히 2회 실행되고 { ok: false }를 반환하며 예외가 밖으로 새지 않는다', async () => {
    let insertAttempts = 0;
    const calls: string[] = [];
    const fakeDb: MigratableDb = {
      execAsync: async (sql: string) => {
        calls.push(sql);
      },
      getFirstAsync: async () => null,
      runAsync: async (sql: string) => {
        calls.push(sql);
        if (sql.startsWith('INSERT INTO daily_reflections')) {
          insertAttempts++;
          throw new Error('disk full');
        }
        return { changes: 1, lastInsertRowId: 1 };
      },
      getAllAsync: async () => [],
    } as unknown as MigratableDb;

    const result = await upsertReflection(fakeDb, validParams());

    expect(result).toEqual({ ok: false });
    expect(insertAttempts).toBe(2);
  });

  it('INSERT가 실패한 뒤에도 트랜잭션이 열린 채 남지 않는다(ROLLBACK 시도 흔적이 fake db 호출 로그에 있다)', async () => {
    const calls: string[] = [];
    const fakeDb: MigratableDb = {
      execAsync: async (sql: string) => {
        calls.push(sql);
      },
      getFirstAsync: async () => null,
      runAsync: async (sql: string) => {
        calls.push(sql);
        if (sql.startsWith('INSERT INTO daily_reflections')) {
          throw new Error('disk full');
        }
        return { changes: 1, lastInsertRowId: 1 };
      },
      getAllAsync: async () => [],
    } as unknown as MigratableDb;

    await upsertReflection(fakeDb, validParams());

    expect(calls.filter((sql) => sql === 'ROLLBACK')).toHaveLength(2);
  });
});
