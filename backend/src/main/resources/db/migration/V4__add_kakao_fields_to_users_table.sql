-- (a) 대응 클라이언트 DDL: 없음 — 카카오 프로필 필드는 서버 전용이다(1단계 클라이언트에는
--     인증/계정 개념 자체가 없음, PROJECT.md).
-- (b) 규율: 이 파일은 한 번 적용되면 절대 수정하지 않는다. 변경이 필요하면 V5를 추가한다.
--     Flyway 체크섬이 이를 기동 시점에 강제한다.
-- (c) kakao_id가 INTEGER가 아니라 BIGINT인 이유: 카카오 회원번호는 Long이며 Int 캐스팅
--     오버플로로 값이 음수로 뒤집힌 실사고 보고가 있다(10-RESEARCH.md Pitfall 3). 회원번호가
--     우연히 Int 범위 안에 있는 테스트 계정으로는 이 버그가 절대 드러나지 않는다는 점이 위험하다.
-- (d) nickname/profile_image_url이 VARCHAR(N)이 아니라 TEXT인 이유: 카카오가 두 필드의
--     문자 길이 상한을 공식 문서에 명시하지 않는다(A7). Phase 9의 VARCHAR(N) 관례에서 의도적으로
--     벗어나며, Postgres에서 성능 차이가 없다.
-- (e) 세 컬럼이 nullable이고 UNIQUE가 kakao_id에만 걸리는 이유: Phase 9의 플레이스홀더 로우
--     00000000-0000-0000-0000-000000000001을 지우지 않고 유지하기 위해서다(D-09/D-10). Postgres는
--     NULL을 UNIQUE 위반으로 취급하지 않으므로 NULL 로우 1건과 실사용자 로우들의 유일성이 공존한다(D-11).
-- (f) 이메일 컬럼을 추가하지 않는 이유: D-05(이메일 미저장) / D-07(이메일 미동의자도 로그인 허용).
ALTER TABLE users
    ADD COLUMN kakao_id BIGINT,
    ADD COLUMN nickname TEXT,
    ADD COLUMN profile_image_url TEXT;

ALTER TABLE users
    ADD CONSTRAINT uq_users_kakao_id UNIQUE (kakao_id);
