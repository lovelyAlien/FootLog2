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

describe('getAllAsync', () => {
  it('결과가 없으면 빈 배열을 반환한다(null 아님)', async () => {
    const { db, close } = createTestDb();
    try {
      await db.execAsync('CREATE TABLE t (id INTEGER PRIMARY KEY, v TEXT)');
      const rows = await db.getAllAsync<{ id: number; v: string }>('SELECT * FROM t');
      expect(rows).toEqual([]);
    } finally {
      close();
    }
  });

  it('여러 row를 SQL이 지정한 순서 그대로 배열로 반환한다', async () => {
    const { db, close } = createTestDb();
    try {
      await db.execAsync('CREATE TABLE t (id INTEGER PRIMARY KEY, v TEXT)');
      await db.runAsync('INSERT INTO t (id, v) VALUES (?, ?)', 1, 'a');
      await db.runAsync('INSERT INTO t (id, v) VALUES (?, ?)', 2, 'b');
      await db.runAsync('INSERT INTO t (id, v) VALUES (?, ?)', 3, 'c');
      const rows = await db.getAllAsync<{ id: number; v: string }>(
        'SELECT * FROM t ORDER BY id ASC'
      );
      expect(rows).toEqual([
        { id: 1, v: 'a' },
        { id: 2, v: 'b' },
        { id: 3, v: 'c' },
      ]);
    } finally {
      close();
    }
  });

  it('배열 형태와 가변인자 형태의 바인드 파라미터 둘 다에서 동일하게 동작한다', async () => {
    const { db, close } = createTestDb();
    try {
      await db.execAsync('CREATE TABLE t (id INTEGER PRIMARY KEY, a TEXT, b TEXT)');
      await db.runAsync('INSERT INTO t (id, a, b) VALUES (?, ?, ?)', 1, 'x', 'y');

      const viaVarargs = await db.getAllAsync<{ a: string; b: string }>(
        'SELECT a, b FROM t WHERE id = ?',
        1
      );
      const viaArray = await db.getAllAsync<{ a: string; b: string }>(
        'SELECT a, b FROM t WHERE id = ?',
        [1]
      );

      expect(viaVarargs).toEqual([{ a: 'x', b: 'y' }]);
      expect(viaArray).toEqual([{ a: 'x', b: 'y' }]);
    } finally {
      close();
    }
  });
});
