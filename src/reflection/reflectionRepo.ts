// src/reflection/reflectionRepo.ts
// 07-02-PLAN.md Task 1 — daily_reflections CRUD/upsert.
//
// SQL은 이 파일에만 존재한다 — 화면 컴포넌트에 절대 등장하지 않는다(checkinRepo.ts와
// 동일 계약). 모든 SQL은 `?` 플레이스홀더 바인딩만 사용하고 템플릿 보간을 쓰지 않는다
// (T-07-04).
//
// runWithSingleRetry는 ../checkin/checkinRepo에서 그대로 import해 재사용한다 — 재구현하지
// 않고, 공용 위치(예: src/shared/)로 옮기지도 않는다. 07-RESEARCH.md Open Question #1의
// 권고를 이 플랜이 확정한다: 아직 소비처가 checkinRepo/reflectionRepo 2곳뿐이라 Rule of
// Three 기준으로 이동 시점이 아니며, checkin/으로의 파일 이동은 이 phase의 변경 표면을
// 불필요하게 넓힌다.
//
// upsertReflection의 본문은 commitCheckin의 셰이프를 그대로 복제한다: runWithSingleRetry
// 안에서 BEGIN → SELECT id, created_at ... → 존재하면 UPDATE, 없으면 INSERT → COMMIT,
// catch에서 ROLLBACK 시도(실패 시 console.error) 후 rethrow. SQLite의 "충돌 시 갱신"
// upsert 전용 구문은 쓰지 않는다 — 이 저장소가 한 번도 쓴 적이 없어 select-then-branch가
// 리뷰 일관성과 검증된 형태 양쪽에서 낫다(07-RESEARCH.md Don't Hand-Roll 표).
import type { MigratableDb } from '../db/migrations';
import type { DailyReflectionRow } from '../db/schema';
import { runWithSingleRetry } from '../checkin/checkinRepo';

export type ReflectionSaveParams = {
  id: string;
  date: string;
  newPlaceAnswer: string;
  freeReflection: string;
  now: string;
};

export async function getReflectionByDate(
  db: MigratableDb,
  date: string
): Promise<DailyReflectionRow | null> {
  const row = await db.getFirstAsync<DailyReflectionRow>(
    'SELECT * FROM daily_reflections WHERE date = ?',
    date
  );
  return row ?? null;
}

export async function upsertReflection(
  db: MigratableDb,
  params: ReflectionSaveParams
): Promise<{ ok: true } | { ok: false }> {
  // 빈 문자열은 NULL로 정규화한다 — 두 필드 모두 빈 문자열이면 두 컬럼 모두 NULL.
  const newPlaceAnswer = params.newPlaceAnswer || null;
  const freeReflection = params.freeReflection || null;

  const result = await runWithSingleRetry(async () => {
    try {
      await db.execAsync('BEGIN');
      const existing = await db.getFirstAsync<{ id: string; created_at: string }>(
        'SELECT id, created_at FROM daily_reflections WHERE date = ?',
        params.date
      );
      if (existing) {
        await db.runAsync(
          'UPDATE daily_reflections SET new_place_answer = ?, free_reflection = ?, updated_at = ? WHERE id = ?',
          newPlaceAnswer,
          freeReflection,
          params.now,
          existing.id
        );
      } else {
        await db.runAsync(
          `INSERT INTO daily_reflections (
             id, date, new_place_answer, free_reflection, created_at, updated_at
           ) VALUES (?, ?, ?, ?, ?, ?)`,
          params.id,
          params.date,
          newPlaceAnswer,
          freeReflection,
          params.now,
          params.now
        );
      }
      await db.execAsync('COMMIT');
    } catch (err) {
      try {
        await db.execAsync('ROLLBACK');
      } catch (rollbackErr) {
        // commitCheckin과 동일한 대응 — ROLLBACK 자체의 실패는 흡수해 원래 에러를
        // 재시도 로직에 그대로 전달하지만, 이 경우 연결이 열린 트랜잭션 상태로 남아
        // 이후 모든 upsertReflection 호출이 연쇄 실패할 위험이 있어 별도 로그를 남긴다.
        console.error(
          'upsertReflection: ROLLBACK failed after a write error — the connection may be left in an open transaction for the rest of this session',
          rollbackErr
        );
      }
      throw err;
    }
  });

  if (!result.ok) {
    return { ok: false };
  }
  return { ok: true };
}
