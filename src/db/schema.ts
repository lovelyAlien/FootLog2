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

// Plan 03-03 Task 1 — 확인 핀 구간(GPS 캡처 완료 ~ 확인 탭)의 드래프트를 SQLite에 두기
// 위한 DDL + 행 타입. 03-CONTEXT.md D-03(AsyncStorage가 아닌 SQLite에 영속화)의 구현체.
export interface DraftRow {
  id: string;
  lat: number;
  lng: number;
  accuracy_meters: number | null;
  location_source: LocationSource;
  local_date_key: string;
  timezone_at_capture: string;
  created_at: string;
  updated_at: string;
}

// (1) id는 항상 'draft' 고정값이다 — 03-CONTEXT.md D-04("항상 최대 1개")를 스키마 레벨의
// PRIMARY KEY 제약으로 강제하는 방식이며, 호출부는 항상 INSERT OR REPLACE ... VALUES
// ('draft', ...)로 이 단일 row를 덮어쓴다(구현은 03-04).
// (2) local_date_key는 날짜 경계 만료 판정(product-design.md T24 edge case 1)에 쓰인다 —
// 드래프트가 생성된 날짜와 확인 시점의 날짜가 다르면 만료된 것으로 간주한다.
// (3) note/photo_path 컬럼이 없다 — 드래프트 구간은 "GPS 캡처 완료 ~ 확인 탭" 사이이며,
// 메모/사진 입력은 저장 성공 이후 화면이라 드래프트에 담길 일이 없다(03-RESEARCH.md
// Pattern 4). 인덱스도 만들지 않는다 — 단일 row 테이블이라 PK만으로 충분하다.
export const CREATE_DRAFTS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS drafts (
    id TEXT PRIMARY KEY NOT NULL,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    accuracy_meters REAL,
    location_source TEXT NOT NULL,
    local_date_key TEXT NOT NULL,
    timezone_at_capture TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`;

// Plan 06-01 Task 1 — 설정 화면(D-01/D-02)이 읽고 쓰는 알림 설정을 담는 단일 row 테이블.
// `drafts`(위 블록)와 동일한 고정 PK 패턴이다.
export interface AppSettingsRow {
  id: string;
  checkin_frequency: string; // NotificationFrequency 유니온 — 쓰기 시점에 settingsRepo가 검증
  daily_reflection_enabled: number; // SQLite에는 boolean 타입이 없다 — 0/1
  daily_reflection_hour: number; // Plan 07-01 — D-05로 컬럼화(마이그레이션 v4, ALTER TABLE 전용). 아래 CREATE문에는 절대 추가하지 않는다.
  updated_at: string;
}

// (1) id는 항상 'settings' 고정값이다 — DRAFT_ROW_ID와 동일한 근거로, PRIMARY KEY 제약이
//     "단일 row만 존재"를 스키마 레벨에서 강제한다(구현은 06-01 Task 2, SETTINGS_ROW_ID).
// (2) daily_reflection_hour는 이 CREATE문에 없다 — Plan 07-01(D-05)에서 마이그레이션 v4의
//     `ALTER TABLE app_settings ADD COLUMN daily_reflection_hour ...`로만 추가된다
//     (src/db/migrations.ts `currentDbVersion === 3` 블록). 이미 출하된 v3 DDL을 사후
//     수정하면 안 되므로(migration_discipline #2, 07-RESEARCH.md Pitfall 5) 새 컬럼은
//     반드시 ALTER TABLE 경로로만 도착해야 한다. day-end-reflection-map.md Premises #4의
//     "시각 변경 UI는 스코프 밖" 전제는 2026-09-02 창업자 논의(D-05)로 뒤집혔다.
// (3) 인덱스는 만들지 않는다 — drafts와 동일하게 단일 row 테이블이라 PK만으로 충분하다.
export const CREATE_APP_SETTINGS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS app_settings (
    id TEXT PRIMARY KEY NOT NULL,
    checkin_frequency TEXT NOT NULL,
    daily_reflection_enabled INTEGER NOT NULL,
    updated_at TEXT NOT NULL
  );
`;
