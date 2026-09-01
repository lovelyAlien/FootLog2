// src/today/trajectory.ts
// 04-01-PLAN.md Task 3 — CheckinRow[] → Polyline 좌표 파생(순수 함수).
//
// 정렬은 getTodayCheckins의 시간순 정렬 쿼리가 단독으로 책임진다 —
// 여기서 다시 정렬하지 않는다(D-11 단일 쿼리 계약).
//
// 이 파일은 지도 렌더링 라이브러리도 네이티브 모듈도 import하지 않는다 —
// src/db/schema.ts의 CheckinRow만 import type으로 가져오는 순수 모듈이라야
// Node 테스트 환경(@jest-environment node)에서 그대로 로드된다(src/checkin/fallbackLocation.ts와
// 동일 성격).
import type { CheckinRow } from '../db/schema';

export type TrajectoryCoordinate = {
  latitude: number;
  longitude: number;
};

export function buildTrajectoryCoordinates(checkins: CheckinRow[]): TrajectoryCoordinate[] {
  if (checkins.length < 2) {
    return [];
  }
  return checkins.map((row) => ({ latitude: row.lat, longitude: row.lng }));
}
