/**
 * @jest-environment node
 */
// src/today/trajectory.test.ts
// 04-01-PLAN.md Task 3 — buildTrajectoryCoordinates 순수 함수 검증.
// CheckinRow → Polyline 좌표 파생. 정렬/네이티브 모듈 의존 없음(04-UI-SPEC.md §이동 궤적선).
import type { CheckinRow } from '../db/schema';
import { buildTrajectoryCoordinates } from './trajectory';

function makeRow(overrides: Partial<CheckinRow> = {}): CheckinRow {
  return {
    id: 'checkin-1',
    timestamp_utc: '2026-08-27T00:00:00.000Z',
    local_date_key: '2026-08-27',
    timezone_at_capture: 'Asia/Seoul',
    lat: 37.5665,
    lng: 126.978,
    accuracy_meters: 5,
    location_source: 'gps_auto',
    note: null,
    photo_path: null,
    created_at: '2026-08-27T00:00:00.000Z',
    updated_at: '2026-08-27T00:00:00.000Z',
    schema_version: 1,
    ...overrides,
  };
}

describe('buildTrajectoryCoordinates', () => {
  it('빈 배열 입력 → []를 반환한다', () => {
    expect(buildTrajectoryCoordinates([])).toEqual([]);
  });

  it('체크인 1건 입력 → []를 반환한다(선을 그릴 수 없음, REQ-trajectory-line)', () => {
    const rows = [makeRow({ id: 'only-one' })];
    expect(buildTrajectoryCoordinates(rows)).toEqual([]);
  });

  it('체크인 2건 이상 입력 → 같은 길이/순서의 { latitude, longitude } 배열을 반환한다', () => {
    const rows = [
      makeRow({ id: 'a', lat: 10, lng: 20 }),
      makeRow({ id: 'b', lat: 30, lng: 40 }),
      makeRow({ id: 'c', lat: 50, lng: 60 }),
    ];
    expect(buildTrajectoryCoordinates(rows)).toEqual([
      { latitude: 10, longitude: 20 },
      { latitude: 30, longitude: 40 },
      { latitude: 50, longitude: 60 },
    ]);
  });

  it('입력 순서를 재정렬하지 않는다(timestamp 역순 배열도 입력 순서 그대로 매핑)', () => {
    const rows = [
      makeRow({ id: 'later', timestamp_utc: '2026-08-27T05:00:00.000Z', lat: 99, lng: 99 }),
      makeRow({ id: 'earlier', timestamp_utc: '2026-08-27T01:00:00.000Z', lat: 1, lng: 1 }),
    ];
    expect(buildTrajectoryCoordinates(rows)).toEqual([
      { latitude: 99, longitude: 99 },
      { latitude: 1, longitude: 1 },
    ]);
  });
});
