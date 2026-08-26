// src/db/schema.ts
// Plan 01-03 Task 2 — Checkin/DailyReflection DDL + 행 타입.
// Source of truth: .planning/intel/constraints.md "Data model / schema" 섹션
// (원본: docs/designs/footlog-product-design.md, docs/designs/day-end-reflection-map.md)
//
// 이 파일은 순수 문자열/타입 상수만 담는다 — expo-sqlite를 값(runtime)으로 import하지
// 않으므로 Node 테스트 환경에서도 그대로 로드 가능하다.

export type LocationSource =
  | 'gps_auto'
  | 'gps_dragged'
  | 'gps_low_accuracy_fallback'
  | 'manual_denied'
  | 'manual_no_signal';

export interface CheckinRow {
  id: string;
  timestamp_utc: string;
  local_date_key: string;
  timezone_at_capture: string;
  lat: number;
  lng: number;
  accuracy_meters: number | null;
  location_source: LocationSource;
  note: string | null;
  photo_path: string | null;
  created_at: string;
  updated_at: string;
  schema_version: number;
}

export interface DailyReflectionRow {
  id: string;
  date: string;
  new_place_answer: string | null;
  free_reflection: string | null;
  created_at: string;
  updated_at: string;
}

// photo_path는 경로 문자열만 저장한다. cacheDirectory/documentDirectory 경로를 여기서
// 하드코딩하거나 DEFAULT 값으로 넣지 않는다 — 파일 I/O 규약은 Phase 4(REQ-photo-resize) 스코프.
export const CREATE_CHECKINS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS checkins (
    id TEXT PRIMARY KEY NOT NULL,
    timestamp_utc TEXT NOT NULL,
    local_date_key TEXT NOT NULL,
    timezone_at_capture TEXT NOT NULL,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    accuracy_meters REAL,
    location_source TEXT NOT NULL,
    note TEXT,
    photo_path TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    schema_version INTEGER NOT NULL DEFAULT 1
  );
`;

export const CREATE_DAILY_REFLECTIONS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS daily_reflections (
    id TEXT PRIMARY KEY NOT NULL,
    date TEXT NOT NULL UNIQUE,
    new_place_answer TEXT,
    free_reflection TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`;

// local_date_key는 Phase 4 오늘 뷰와 Phase 6 캘린더가 "그날의 체크인"을 조회하는 유일한
// 키다. daily_reflections.date는 UNIQUE 제약이 이미 인덱스를 만들므로 별도 인덱스는
// 만들지 않는다.
export const CREATE_CHECKINS_INDEXES_SQL = `
  CREATE INDEX IF NOT EXISTS idx_checkins_local_date_key ON checkins(local_date_key);
`;
