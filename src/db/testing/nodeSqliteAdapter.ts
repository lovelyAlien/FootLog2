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
      const row = raw.prepare(sql).get(...(params as never[]));
      return (row ?? null) as T | null;
    },
    runAsync: async (sql: string, ...params: unknown[]) => {
      return raw.prepare(sql).run(...(params as never[]));
    },
  };

  return {
    db: adapter as unknown as MigratableDb,
    raw,
    close: () => raw.close(),
  };
}
