// src/db/testing/nodeSqliteAdapter.ts
// 테스트 전용 어댑터 — Plan 01-03 Task 1
//
// expo-sqlite는 순수 Node 환경에서 동작하지 않는다. 이 프로젝트의 Node v22.21.1은
// `--experimental-sqlite` 플래그(package.json의 `test` 스크립트가 NODE_OPTIONS로 이미
// 전달) 뒤에 내장 `node:sqlite` 모듈을 제공하며, `DatabaseSync`가
// `exec`/`prepare().get()`/`prepare().run()`과 `PRAGMA user_version`을 실제로 지원한다.
// 따라서 가짜 DB를 만들지 않고 실제 SQLite 엔진에 대해 마이그레이션을 검증한다.
//
// 이 파일은 테스트 전용이며 프로덕션 코드(`app/`, 다른 `src/` 모듈)에서 import되어서는
// 안 된다. 단일 캐스트(export 경계, 아래 return 문)만 존재하며 밖으로 새어 나가지 않는다.
import { DatabaseSync } from 'node:sqlite';
import type { MigratableDb } from '../migrations';

// expo-sqlite의 실제 bindParams 관례(SQLiteBindParams)는 세 가지 호출 형태를 전부
// 허용한다 — 가변인자(a, b), 단일 배열([a, b]), 단일 named-param 객체({ $a: a }).
// 이 어댑터가 가변인자 형태만 지원하면, 이후 phase가 배열/객체 형태로 파라미터를 넘기는
// 순간 테스트 어댑터와 실제 expo-sqlite가 조용히 다르게 동작하게 된다.
function resolveBindArgs(params: unknown[]): unknown[] {
  if (params.length === 1) {
    const [only] = params;
    if (Array.isArray(only)) {
      return only;
    }
    if (only !== null && typeof only === 'object') {
      return [only];
    }
  }
  return params;
}

export function createTestDb(path: string = ':memory:'): {
  db: MigratableDb;
  raw: DatabaseSync;
  close: () => void;
} {
  const raw = new DatabaseSync(path);

  const adapter = {
    execAsync: async (sql: string): Promise<void> => {
      raw.exec(sql);
    },
    getFirstAsync: async <T>(sql: string, ...params: unknown[]): Promise<T | null> => {
      const row = raw.prepare(sql).get(...(resolveBindArgs(params) as never[]));
      return (row ?? null) as T | null;
    },
    runAsync: async (sql: string, ...params: unknown[]) => {
      // node:sqlite의 StatementSync.run()은 `{ changes, lastInsertRowid }`(소문자 d)를
      // 반환하지만, 실제 expo-sqlite의 SQLiteRunResult는 `lastInsertRowId`(대문자 I)다.
      // 필드명을 그대로 통과시키면 이 테스트 어댑터에서만 undefined가 나오는 코드가
      // 실기기에서는 정상 동작하는 테스트-실기기 불일치가 생긴다 — 여기서 이름을 맞춘다.
      const result = raw.prepare(sql).run(...(resolveBindArgs(params) as never[]));
      return {
        changes: Number(result.changes),
        lastInsertRowId: Number(result.lastInsertRowid),
      };
    },
    getAllAsync: async <T>(sql: string, ...params: unknown[]): Promise<T[]> => {
      const rows = raw.prepare(sql).all(...(resolveBindArgs(params) as never[]));
      return rows as T[];
    },
  };

  return {
    db: adapter as unknown as MigratableDb,
    raw,
    close: () => raw.close(),
  };
}
