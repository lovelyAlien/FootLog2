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
