-- (a) 대응 클라이언트 DDL: src/db/schema.ts CREATE_DAILY_REFLECTIONS_TABLE_SQL(id/date/
--     new_place_answer/free_reflection/created_at/updated_at). 서버는 여기에 user_id(D-02)를
--     추가한다.
-- (b) 규율: 이 파일은 한 번 적용되면 절대 수정하지 않는다. 스키마 변경이 필요하면 이 파일을
--     고치지 말고 새 V{n+1}__*.sql 파일을 추가한다(V1/V2 주석과 동일한 append-only 규율).
-- (c) id에 기본값 생성기를 붙이지 않는다 — checkins와 동일한 이유로, 클라이언트가 발급한
--     UUID를 서버가 절대 재발급하지 않는다(09-RESEARCH.md Pitfall 5).
-- 의도된 divergence(09-RESEARCH.md Assumption A4): 클라이언트는 date 단일 컬럼 UNIQUE만
-- 갖지만(단일 사용자 전제), 서버는 다중 사용자를 전제하므로 아래 UNIQUE 제약을 user_id +
-- date 조합으로 넓힌다. 클라이언트와 맞추겠다고 date 단일 컬럼으로 되돌리지 않는다 —
-- Phase 10(다중 사용자 인증) 이후 이 제약이 없으면 서로 다른 사용자의 같은 날짜 회고가
-- 서로를 덮어써야 정상인데도 막히는 정합성 버그가 된다.
CREATE TABLE daily_reflections (
    id UUID PRIMARY KEY,                  -- 클라이언트 발급(crypto.randomUUID()) — 서버 기본값 없음
    user_id UUID NOT NULL REFERENCES users(id),
    date DATE NOT NULL,
    new_place_answer TEXT,
    free_reflection TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, date)
);
