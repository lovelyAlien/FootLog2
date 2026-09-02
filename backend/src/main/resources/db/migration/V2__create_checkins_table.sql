-- (a) 대응 클라이언트 DDL: src/db/schema.ts CREATE_CHECKINS_TABLE_SQL(id/timestamp_utc/
--     local_date_key/timezone_at_capture/lat/lng/accuracy_meters/location_source/note/
--     photo_path/created_at/updated_at/schema_version) + CREATE_CHECKINS_INDEXES_SQL.
--     서버는 여기에 user_id(D-02)만 추가한다 — 나머지는 필드 단위 1:1 대응.
-- (b) 규율: 이 파일은 한 번 적용되면 절대 수정하지 않는다. 스키마 변경이 필요하면 이 파일을
--     고치지 말고 새 V{n+1}__*.sql 파일을 추가한다(V1 주석과 동일한 append-only 규율).
-- (c) id에 기본값 생성기를 붙이지 않는다 — 클라이언트가 crypto.randomUUID()로 이미 ID를
--     발급한 뒤 서버에 전달한다(src/checkin/photos.ts에서 확인, 09-RESEARCH.md Pitfall 5).
--     서버가 UUID DB 기본값 생성기나 JPA @GeneratedValue로 ID를 재발급하면 Phase 12
--     (클라이언트-서버 동기화)에서 클라이언트/서버 ID가 어긋나는 정합성 버그가 된다.
--     (users.id에만 그 생성기를 붙인다 — V1 참고, 서버가 유일하게 ID를 소유하는 테이블이다.)
-- schema_version은 클라이언트 SQLite 마이그레이션 버전을 담는 메타데이터일 뿐, Flyway 자체
-- 버전 관리(flyway_schema_history)와는 무관하다. 실제로 이 컬럼을 채우는 로직은 Phase 12
-- (클라이언트-서버 동기화) API 계약이 생긴 뒤에 결정된다(09-RESEARCH.md Open Question 2/A3) —
-- 지금은 DEFAULT 1로 컬럼만 만들어둔다.
CREATE TABLE checkins (
    id UUID PRIMARY KEY,                  -- 클라이언트 발급(crypto.randomUUID()) — 서버 기본값 없음
    user_id UUID NOT NULL REFERENCES users(id),
    timestamp_utc TIMESTAMPTZ NOT NULL,
    local_date_key VARCHAR(10) NOT NULL,
    timezone_at_capture VARCHAR(64) NOT NULL,
    lat DOUBLE PRECISION NOT NULL,        -- 클라이언트 SQLite REAL(부동소수점)과 동일 계열 유지
    lng DOUBLE PRECISION NOT NULL,
    accuracy_meters DOUBLE PRECISION,
    location_source VARCHAR(32) NOT NULL,
    note TEXT,
    photo_path TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    schema_version INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX idx_checkins_local_date_key ON checkins (local_date_key);
CREATE INDEX idx_checkins_user_id ON checkins (user_id);
