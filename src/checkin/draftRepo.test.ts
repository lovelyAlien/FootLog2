/**
 * @jest-environment node
 */
// src/checkin/draftRepo.test.ts
// 03-04-PLAN.md Task 2 (RED) — drafts 테이블 단일 row upsert/드래그 갱신/삭제/만료 판정
// 계약을 실제 SQLite 엔진(node:sqlite)에 대해 검증한다.

import { createTestDb } from '../db/testing/nodeSqliteAdapter';
import { migrateDbIfNeeded } from '../db/migrations';
import {
  upsertDraft,
  getDraft,
  updateDraftCoordinate,
  deleteDraft,
  loadRecoverableDraft,
} from './draftRepo';

describe('draftRepo', () => {
  it('Test 1: upsertDraft 후 getDraft가 draft row를 반환한다', async () => {
    const { db, close } = createTestDb();
    try {
      await migrateDbIfNeeded(db);

      await upsertDraft(db, {
        lat: 37.5665,
        lng: 126.978,
        accuracyMeters: 5,
        locationSource: 'gps_auto',
        localDateKey: '2026-08-27',
        timezoneAtCapture: 'Asia/Seoul',
        now: '2026-08-27T00:00:00.000Z',
      });

      const draft = await getDraft(db);
      expect(draft).not.toBeNull();
      expect(draft?.id).toBe('draft');
      expect(draft?.lat).toBe(37.5665);
    } finally {
      close();
    }
  });

  it('Test 2: upsertDraft를 서로 다른 좌표로 2회 호출해도 row가 1개만 남고 두 번째 좌표가 남는다', async () => {
    const { db, raw, close } = createTestDb();
    try {
      await migrateDbIfNeeded(db);

      await upsertDraft(db, {
        lat: 37.0,
        lng: 127.0,
        accuracyMeters: 5,
        locationSource: 'gps_auto',
        localDateKey: '2026-08-27',
        timezoneAtCapture: 'Asia/Seoul',
        now: '2026-08-27T00:00:00.000Z',
      });
      await upsertDraft(db, {
        lat: 38.0,
        lng: 128.0,
        accuracyMeters: 5,
        locationSource: 'gps_auto',
        localDateKey: '2026-08-27',
        timezoneAtCapture: 'Asia/Seoul',
        now: '2026-08-27T00:01:00.000Z',
      });

      const countRow = raw.prepare('SELECT COUNT(*) as c FROM drafts').get() as { c: number };
      expect(countRow.c).toBe(1);

      const draft = await getDraft(db);
      expect(draft?.lat).toBe(38.0);
      expect(draft?.lng).toBe(128.0);
    } finally {
      close();
    }
  });

  it('Test 3: updateDraftCoordinate 후 location_source가 gps_dragged로 바뀌고 updated_at만 갱신된다', async () => {
    const { db, close } = createTestDb();
    try {
      await migrateDbIfNeeded(db);

      await upsertDraft(db, {
        lat: 37.0,
        lng: 127.0,
        accuracyMeters: 5,
        locationSource: 'gps_auto',
        localDateKey: '2026-08-27',
        timezoneAtCapture: 'Asia/Seoul',
        now: '2026-08-27T00:00:00.000Z',
      });

      await updateDraftCoordinate(db, {
        lat: 37.1,
        lng: 127.1,
        now: '2026-08-27T00:05:00.000Z',
      });

      const draft = await getDraft(db);
      expect(draft?.lat).toBe(37.1);
      expect(draft?.lng).toBe(127.1);
      expect(draft?.location_source).toBe('gps_dragged');
      expect(draft?.updated_at).toBe('2026-08-27T00:05:00.000Z');
      expect(draft?.created_at).toBe('2026-08-27T00:00:00.000Z');
    } finally {
      close();
    }
  });

  it('Test 4: deleteDraft 후 getDraft가 null을 반환한다', async () => {
    const { db, close } = createTestDb();
    try {
      await migrateDbIfNeeded(db);

      await upsertDraft(db, {
        lat: 37.0,
        lng: 127.0,
        accuracyMeters: 5,
        locationSource: 'gps_auto',
        localDateKey: '2026-08-27',
        timezoneAtCapture: 'Asia/Seoul',
        now: '2026-08-27T00:00:00.000Z',
      });

      await deleteDraft(db);

      const draft = await getDraft(db);
      expect(draft).toBeNull();
    } finally {
      close();
    }
  });

  it('Test 5: loadRecoverableDraft는 날짜가 다른 드래프트를 조용히 삭제하고 null을 반환한다', async () => {
    const { db, close } = createTestDb();
    try {
      await migrateDbIfNeeded(db);

      await upsertDraft(db, {
        lat: 37.0,
        lng: 127.0,
        accuracyMeters: 5,
        locationSource: 'gps_auto',
        localDateKey: '2026-08-27',
        timezoneAtCapture: 'Asia/Seoul',
        now: '2026-08-27T00:00:00.000Z',
      });

      const result = await loadRecoverableDraft(db, '2026-08-28');
      expect(result).toBeNull();

      const draftAfter = await getDraft(db);
      expect(draftAfter).toBeNull();
    } finally {
      close();
    }
  });

  it('Test 6: loadRecoverableDraft는 같은 날짜 드래프트를 그대로 반환하고 삭제하지 않는다', async () => {
    const { db, close } = createTestDb();
    try {
      await migrateDbIfNeeded(db);

      await upsertDraft(db, {
        lat: 37.0,
        lng: 127.0,
        accuracyMeters: 5,
        locationSource: 'gps_auto',
        localDateKey: '2026-08-27',
        timezoneAtCapture: 'Asia/Seoul',
        now: '2026-08-27T00:00:00.000Z',
      });

      const result = await loadRecoverableDraft(db, '2026-08-27');
      expect(result).not.toBeNull();
      expect(result?.local_date_key).toBe('2026-08-27');

      const draftAfter = await getDraft(db);
      expect(draftAfter).not.toBeNull();
    } finally {
      close();
    }
  });

  it('Test 7: getDraft는 드래프트가 없으면 null을 반환한다', async () => {
    const { db, close } = createTestDb();
    try {
      await migrateDbIfNeeded(db);

      const draft = await getDraft(db);
      expect(draft).toBeNull();
    } finally {
      close();
    }
  });
});
