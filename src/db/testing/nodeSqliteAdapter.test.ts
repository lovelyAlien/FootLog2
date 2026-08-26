/**
 * @jest-environment node
 */
// src/db/testing/nodeSqliteAdapter.test.ts
// 코드 리뷰에서 발견된 두 가지 계약 문제의 회귀 가드:
// 1. runAsync가 expo-sqlite와 동일하게 lastInsertRowId(대문자 I)를 반환하는가.
// 2. 단일 배열 형태의 바인드 파라미터(expo-sqlite의 SQLiteBindParams 관례)를
//    가변인자로 잘못 스프레드하지 않고 올바르게 처리하는가.
import { createTestDb } from './nodeSqliteAdapter';

describe('nodeSqliteAdapter', () => {
  it('runAsync는 lastInsertRowId(대문자 I)를 반환한다 (실제 expo-sqlite 필드명과 일치)', async () => {
    const { db, close } = createTestDb();
    try {
      await db.execAsync('CREATE TABLE t (id INTEGER PRIMARY KEY, v TEXT)');
      const result = await db.runAsync('INSERT INTO t (v) VALUES (?)', 'hello');
      expect(result).toHaveProperty('lastInsertRowId');
      expect((result as { lastInsertRowId: number }).lastInsertRowId).toBe(1);
      expect((result as { changes: number }).changes).toBe(1);
    } finally {
      close();
    }
  });

  it('배열 형태의 바인드 파라미터를 가변인자로 올바르게 풀어서 전달한다', async () => {
    const { db, close } = createTestDb();
    try {
      await db.execAsync('CREATE TABLE t (id INTEGER PRIMARY KEY, a TEXT, b TEXT)');
      await db.runAsync('INSERT INTO t (a, b) VALUES (?, ?)', ['x', 'y']);
      const row = await db.getFirstAsync<{ a: string; b: string }>(
        'SELECT a, b FROM t WHERE id = ?',
        [1]
      );
      expect(row).toEqual({ a: 'x', b: 'y' });
    } finally {
      close();
    }
  });

  it('가변인자 형태의 바인드 파라미터는 기존과 동일하게 동작한다', async () => {
    const { db, close } = createTestDb();
    try {
      await db.execAsync('CREATE TABLE t (id INTEGER PRIMARY KEY, a TEXT, b TEXT)');
      await db.runAsync('INSERT INTO t (a, b) VALUES (?, ?)', 'x', 'y');
      const row = await db.getFirstAsync<{ a: string; b: string }>(
        'SELECT a, b FROM t WHERE id = ?',
        1
      );
      expect(row).toEqual({ a: 'x', b: 'y' });
    } finally {
      close();
    }
  });
});
