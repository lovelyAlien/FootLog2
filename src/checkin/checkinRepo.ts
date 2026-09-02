// src/checkin/checkinRepo.ts
// 03-04-PLAN.md Task 3 — 체크인 insert 1회 자동 재시도 + insert 성공 후에만 드래프트 삭제.
//
// SQL문은 이 파일에만 존재한다 — 화면 컴포넌트에 절대 등장하지 않는다
// (03-RESEARCH.md Pitfall 4). 재시도 카운터도 `useState`가 아니라 이 파일 내부
// 지역 변수(runWithSingleRetry 클로저)로만 존재한다.
//
// 드래프트 삭제(drafts DELETE)는 반드시 INSERT INTO checkins 성공 이후, 같은
// 트랜잭션 안에서만 실행된다 — 순서를 뒤집으면 D-05가 요구하는 "insert 실패/재시도
// 중 강제종료 시 드래프트로 복구" 보장이 깨진다(03-RESEARCH.md Pitfall 5).
import type { MigratableDb } from '../db/migrations';
import type { CheckinRow, LocationSource } from '../db/schema';
import { isValidCoordinate } from './fallbackLocation';
import { DRAFT_ROW_ID } from './config';

export type NewCheckinParams = {
  id: string;
  timestampUtc: string;
  localDateKey: string;
  timezoneAtCapture: string;
  lat: number;
  lng: number;
  accuracyMeters: number | null;
  locationSource: LocationSource;
};

export type SaveResult =
  | { ok: true; id: string }
  | { ok: false; reason: 'invalid_coordinate' | 'write_failed' };

// 범용 재시도 헬퍼 — checkins에 종속되지 않는다. Phase 5(T13 상세화면 메모 저장 실패)가
// 그대로 재사용할 수 있도록 설계됐다. `attempt()`를 1회 실행하고 throw하면 정확히
// 1회만 더 실행한다. 지연/backoff/jitter를 넣지 않는다 — 요구사항이 "정확히 1회"로
// 고정돼 있어 범용 재시도 라이브러리 도입은 과설계다(03-RESEARCH.md Don't Hand-Roll).
export async function runWithSingleRetry<T>(
  attempt: () => Promise<T>
): Promise<{ ok: true; value: T } | { ok: false }> {
  try {
    const value = await attempt();
    return { ok: true, value };
  } catch {
    try {
      const value = await attempt();
      return { ok: true, value };
    } catch {
      return { ok: false };
    }
  }
}

export async function commitCheckin(
  db: MigratableDb,
  params: NewCheckinParams
): Promise<SaveResult> {
  if (!isValidCoordinate({ lat: params.lat, lng: params.lng })) {
    return { ok: false, reason: 'invalid_coordinate' };
  }

  const result = await runWithSingleRetry(async () => {
    try {
      await db.execAsync('BEGIN');
      // note/photo_path는 insert 시점에 넣지 않는다 — 저장 성공 이후 화면에서
      // updateCheckinNoteAndPhoto로 채운다(03-UI-SPEC.md SAVED 상태 계약).
      await db.runAsync(
        `INSERT INTO checkins (
           id, timestamp_utc, local_date_key, timezone_at_capture,
           lat, lng, accuracy_meters, location_source, created_at, updated_at, schema_version
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        params.id,
        params.timestampUtc,
        params.localDateKey,
        params.timezoneAtCapture,
        params.lat,
        params.lng,
        params.accuracyMeters,
        params.locationSource,
        params.timestampUtc,
        params.timestampUtc,
        1
      );
      // DELETE는 반드시 INSERT 뒤, 같은 트랜잭션 안에 있어야 한다(Pitfall 5).
      await db.runAsync('DELETE FROM drafts WHERE id = ?', DRAFT_ROW_ID);
      await db.execAsync('COMMIT');
      return params.id;
    } catch (err) {
      try {
        await db.execAsync('ROLLBACK');
      } catch (rollbackErr) {
        // WR-03 리뷰 대응 — ROLLBACK 자체의 실패는 여전히 흡수해 원래 에러를
        // 재시도 로직에 그대로 전달하지만, 이 경우 연결이 열린 트랜잭션 상태로
        // 남아 이후 모든 commitCheckin 호출이 "cannot start a transaction within
        // a transaction" 류로 연쇄 실패할 위험이 있다. 일반 쓰기 실패와 구분되는
        // 로그를 남겨 이 세션의 이후 실패들이 이 근본 원인 때문일 수 있음을 추적할
        // 수 있게 한다.
        console.error(
          'commitCheckin: ROLLBACK failed after a write error — the connection may be left in an open transaction for the rest of this session',
          rollbackErr
        );
      }
      throw err;
    }
  });

  if (!result.ok) {
    return { ok: false, reason: 'write_failed' };
  }
  return { ok: true, id: result.value };
}

export async function getLatestCheckinCoordinate(
  db: MigratableDb
): Promise<{ lat: number; lng: number } | null> {
  const row = await db.getFirstAsync<{ lat: number; lng: number }>(
    'SELECT lat, lng FROM checkins ORDER BY created_at DESC LIMIT 1'
  );
  return row ?? null;
}

// 오늘 뷰(지도 핀 + 바텀시트 리스트)가 공유하는 단일 조회 함수 — 04-CONTEXT.md D-11.
// "오늘"이라는 이름이지만 임의의 localDateKey를 받는다: 시각/타임존 판단은 호출자
// (화면)가 resolveLocalDateKey(new Date())로 미리 계산해 넘긴다. 이 함수는 순수
// 조회만 담당하며, Phase 6(캘린더 과거 날짜 뷰)이 동일 시그니처를 재사용한다.
export async function getTodayCheckins(
  db: MigratableDb,
  localDateKey: string
): Promise<CheckinRow[]> {
  return db.getAllAsync<CheckinRow>(
    'SELECT * FROM checkins WHERE local_date_key = ? ORDER BY timestamp_utc ASC',
    localDateKey
  );
}

export async function updateCheckinNoteAndPhoto(
  db: MigratableDb,
  id: string,
  args: { note: string | null; photoPath: string | null; now: string }
): Promise<void> {
  await db.runAsync(
    'UPDATE checkins SET note = ?, photo_path = ?, updated_at = ? WHERE id = ?',
    args.note,
    args.photoPath,
    args.now,
    id
  );
}

// 05-02-PLAN.md Task 1 — 상세화면(05-03-PLAN.md)이 id로 체크인 1건을 조회할 때 쓴다.
// getLatestCheckinCoordinate와 동일하게 `row ?? null` 관용구로 undefined를 null로
// 정규화한다(존재하지 않는 id는 null, 예외 아님).
export async function getCheckinById(
  db: MigratableDb,
  id: string
): Promise<CheckinRow | null> {
  const row = await db.getFirstAsync<CheckinRow>(
    'SELECT * FROM checkins WHERE id = ?',
    id
  );
  return row ?? null;
}

// 05-02-PLAN.md Task 1 — 스와이프 삭제(05-RESEARCH.md Pattern 7 지연 삭제)의 4초 타이머
// 만료 시점에 실제 DB row를 제거하는 데 쓴다. 의도적으로 photo_path 파일 정리를 하지
// 않는다 — 이 함수는 checkins row만 책임진다. 첨부 사진 파일 정리는 호출자(오늘 화면의
// 지연 삭제 커밋 경로, 05-05-PLAN.md)가 PhotoStorageDeps.deleteFile로 별도 수행해야
// 한다(05-RESEARCH.md Assumption A3 / Open Question #2에 대한 이 phase의 확정 답 —
// repo 레이어에 파일 I/O를 밀어 넣지 않는다). 트랜잭션으로 감싸지 않는다: 단일 문장이라
// commitCheckin의 BEGIN/COMMIT 패턴이 필요 없다. 존재하지 않는 id로 호출해도
// `DELETE ... WHERE id = ?`는 매칭 row가 없으면 그냥 0행 영향으로 끝나 throw하지
// 않는다(멱등).
export async function deleteCheckin(db: MigratableDb, id: string): Promise<void> {
  await db.runAsync('DELETE FROM checkins WHERE id = ?', id);
}

// 06-02-PLAN.md Task 1 — 캘린더 탭 월 그리드가 "이 달에 기록이 있는 날짜"를 알아내는 데 쓴다.
// 하루씩 N번 getTodayCheckins를 부르는 루프를 절대 만들지 않는다(06-RESEARCH.md §Don't
// Hand-Roll) — local_date_key가 YYYY-MM-DD 사전식 정렬 = 시간순이라는 점이 이 단일 범위
// 쿼리가 성립하는 근거이며, 기존 idx_checkins_local_date_key 인덱스가 이 접근 패턴을 위해
// 이미 존재한다. DISTINCT로 같은 날 여러 건을 1개로 접는다.
export async function getCheckinDateKeysInRange(
  db: MigratableDb,
  startDateKey: string,
  endDateKey: string
): Promise<string[]> {
  const rows = await db.getAllAsync<{ local_date_key: string }>(
    'SELECT DISTINCT local_date_key FROM checkins WHERE local_date_key BETWEEN ? AND ? ORDER BY local_date_key ASC',
    startDateKey,
    endDateKey
  );
  return rows.map((r) => r.local_date_key);
}

// 06-02-PLAN.md Task 1 — 스크러버 가시성 게이트(기록 있는 날이 0~1일이면 숨김,
// calendar-date-scrubber.md Premise 11)와 스크러버 스크롤 범위의 시작점(첫 체크인 날짜)을
// 한 쿼리로 함께 얻기 위한 함수(06-RESEARCH.md Assumption A4). 빈 테이블에서 MIN(...)은
// NULL을 돌려주므로 ?? null로, COUNT(DISTINCT ...)는 0을 돌려주지만 명시적으로 ?? 0으로
// 정규화한다.
export async function getCheckinHistorySummary(
  db: MigratableDb
): Promise<{ earliestDateKey: string | null; distinctDateCount: number }> {
  const row = await db.getFirstAsync<{
    earliest_date_key: string | null;
    distinct_date_count: number;
  }>(
    'SELECT MIN(local_date_key) AS earliest_date_key, COUNT(DISTINCT local_date_key) AS distinct_date_count FROM checkins'
  );
  return {
    earliestDateKey: row?.earliest_date_key ?? null,
    distinctDateCount: row?.distinct_date_count ?? 0,
  };
}
