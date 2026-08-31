// src/checkin/draftRepo.ts
// 03-04-PLAN.md Task 2 — drafts 테이블 단일 row upsert/드래그 갱신/삭제/만료 판정.
//
// (1) 이 파일이 drafts 테이블 SQL의 유일한 소유자다 — 화면 컴포넌트에 SQL이 등장해선
//     안 된다(03-RESEARCH.md Pitfall 4).
// (2) `deleteDraft`는 checkins insert 성공 이후에만 호출돼야 하며, 그 순서 보장은
//     `checkinRepo.commitCheckin`이 트랜잭션으로 담당한다(03-RESEARCH.md Pitfall 5) —
//     이 파일은 삭제 함수만 제공할 뿐 순서를 스스로 강제하지 않는다.
// (3) 만료된 드래프트(날짜 경계를 넘긴 드래프트)는 복구 프롬프트 없이 조용히
//     삭제된다(product-design.md T24 edge case 1).
// (4) 드래프트는 이미 확정된 lat/lng를 갖고 있으므로, 복구 시 위치 권한을 다시 확인할
//     필요가 없다(T24 edge case 4).
//
// `expo-sqlite`를 직접 import하지 않고 `MigratableDb`를 인자로 받는다
// (src/db/migrations.ts와 동일한 좁힌 타입 관례). 모든 DML은 `?` 플레이스홀더 +
// 파라미터 바인딩만 사용한다 — `'draft'` 고정 PK조차 SQL에 직접 넣지 않고
// DRAFT_ROW_ID를 파라미터로 바인딩한다(T-3-01).
import type { MigratableDb } from '../db/migrations';
import type { DraftRow, LocationSource } from '../db/schema';
import { DRAFT_ROW_ID } from './config';

export type DraftInput = {
  lat: number;
  lng: number;
  accuracyMeters: number | null;
  locationSource: LocationSource;
  localDateKey: string;
  timezoneAtCapture: string;
  now: string;
};

export async function upsertDraft(db: MigratableDb, input: DraftInput): Promise<void> {
  await db.runAsync(
    `INSERT OR REPLACE INTO drafts (
       id, lat, lng, accuracy_meters, location_source, local_date_key,
       timezone_at_capture, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    DRAFT_ROW_ID,
    input.lat,
    input.lng,
    input.accuracyMeters,
    input.locationSource,
    input.localDateKey,
    input.timezoneAtCapture,
    input.now,
    input.now
  );
}

export async function getDraft(db: MigratableDb): Promise<DraftRow | null> {
  const row = await db.getFirstAsync<DraftRow>(
    'SELECT * FROM drafts WHERE id = ?',
    DRAFT_ROW_ID
  );
  return row ?? null;
}

export async function updateDraftCoordinate(
  db: MigratableDb,
  args: { lat: number; lng: number; accuracyMeters?: number | null; now: string }
): Promise<void> {
  if (args.accuracyMeters !== undefined) {
    await db.runAsync(
      `UPDATE drafts SET lat = ?, lng = ?, location_source = ?, accuracy_meters = ?, updated_at = ? WHERE id = ?`,
      args.lat,
      args.lng,
      // 원래 소스와 무관하게 드래그된 드래프트는 항상 'gps_dragged'다
      // (03-UI-SPEC.md §Pin Visual States 확정 매핑).
      'gps_dragged',
      args.accuracyMeters,
      args.now,
      DRAFT_ROW_ID
    );
    return;
  }

  await db.runAsync(
    `UPDATE drafts SET lat = ?, lng = ?, location_source = ?, updated_at = ? WHERE id = ?`,
    args.lat,
    args.lng,
    'gps_dragged',
    args.now,
    DRAFT_ROW_ID
  );
}

export async function deleteDraft(db: MigratableDb): Promise<void> {
  await db.runAsync('DELETE FROM drafts WHERE id = ?', DRAFT_ROW_ID);
}

export async function loadRecoverableDraft(
  db: MigratableDb,
  todayKey: string
): Promise<DraftRow | null> {
  const draft = await getDraft(db);
  if (draft === null) {
    return null;
  }
  if (draft.local_date_key !== todayKey) {
    await deleteDraft(db);
    return null;
  }
  return draft;
}
