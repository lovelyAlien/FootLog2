-- (a) 대응 클라이언트 DDL: 없음 — users는 서버 전용 신규 테이블이다(src/db/schema.ts에는
--     User 관련 타입이 존재하지 않는다, 09-PATTERNS.md "No Analog Found" 참고).
-- (b) 규율: 이 파일은 한 번 적용되면 절대 수정하지 않는다. 스키마 변경이 필요하면 이 파일을
--     고치지 말고 새 V{n+1}__*.sql 파일을 추가한다(09-PATTERNS.md "Sequential, append-only
--     schema versioning" — 클라이언트 src/db/migrations.ts의 "이전 버전 블록은 사후
--     수정하지 않는다" 규율과 동일한 원칙, Flyway는 체크섬으로 이를 구조적으로 강제한다).
-- (c) users.id에만 DEFAULT gen_random_uuid()를 둔다 — 이 테이블만 서버가 유일하게 ID를
--     소유한다(Phase 10 인증 도입 전까지의 단일 플레이스홀더 로우). checkins/daily_reflections는
--     클라이언트가 crypto.randomUUID()로 이미 ID를 발급하므로 V2/V3에는 이 기본값을 붙이지
--     않는다(09-RESEARCH.md Pitfall 5).
-- Postgres 13+는 gen_random_uuid()가 core 내장 함수라 pgcrypto 확장이 불필요하다.
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Phase 10 인증 도입 전까지 쓸 단일 플레이스홀더 로우(D-02).
-- 동일 UUID 값이 backend/src/test/kotlin/com/footlog/backend/FlywayMigrationTest.kt의
-- PLACEHOLDER_USER_ID 상수에도 쓰인다.
INSERT INTO users (id) VALUES ('00000000-0000-0000-0000-000000000001');
