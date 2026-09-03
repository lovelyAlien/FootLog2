package com.footlog.backend

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.context.annotation.Import
import org.springframework.jdbc.core.JdbcTemplate

// 09-02-PLAN.md Task 1 — 서버 DB 스키마(Flyway V1~V3)가 클라이언트 src/db/schema.ts와
// 필드 단위로 대응하는지 실제 PostgreSQL(Testcontainers) 위에서 검증하는 계약 테스트.
// 새 컨테이너를 정의하지 않고 09-01이 만든 TestcontainersConfiguration을 그대로 가져온다.

// V1__create_users_table.sql에 동일한 값으로 INSERT되는 D-02 플레이스홀더 사용자 UUID.
private const val PLACEHOLDER_USER_ID = "00000000-0000-0000-0000-000000000001"

@Import(TestcontainersConfiguration::class)
@SpringBootTest
class FlywayMigrationTest {

    @Autowired
    lateinit var jdbcTemplate: JdbcTemplate

    // Phase 10(V4)이 추가한 카카오 프로필 3개 컬럼을 포함한다(D-08/D-11).
    private val usersColumns = setOf("id", "created_at", "kakao_id", "nickname", "profile_image_url")

    private val checkinsColumns = setOf(
        "id", "user_id", "timestamp_utc", "local_date_key", "timezone_at_capture",
        "lat", "lng", "accuracy_meters", "location_source", "note", "photo_path",
        "created_at", "updated_at", "schema_version",
    )

    private val dailyReflectionsColumns = setOf(
        "id", "user_id", "date", "new_place_answer", "free_reflection", "created_at", "updated_at",
    )

    private fun columnNames(table: String): Set<String> {
        return jdbcTemplate.queryForList(
            "SELECT column_name FROM information_schema.columns WHERE table_name = ?",
            String::class.java,
            table,
        ).filterNotNull().toSet()
    }

    private fun dataType(table: String, column: String): String {
        return jdbcTemplate.queryForObject(
            "SELECT data_type FROM information_schema.columns WHERE table_name = ? AND column_name = ?",
            String::class.java,
            table,
            column,
        )!!
    }

    private fun charMaxLength(table: String, column: String): Int? {
        return jdbcTemplate.queryForObject(
            "SELECT character_maximum_length FROM information_schema.columns WHERE table_name = ? AND column_name = ?",
            Int::class.javaObjectType,
            table,
            column,
        )
    }

    private fun isNullable(table: String, column: String): Boolean {
        val value: String? = jdbcTemplate.queryForObject(
            "SELECT is_nullable FROM information_schema.columns WHERE table_name = ? AND column_name = ?",
            String::class.java,
            table,
            column,
        )
        return value == "YES"
    }

    private fun columnDefault(table: String, column: String): String? {
        return jdbcTemplate.queryForObject(
            "SELECT column_default FROM information_schema.columns WHERE table_name = ? AND column_name = ?",
            String::class.java,
            table,
            column,
        )
    }

    // Test 1: flyway_schema_history에 version 1, 2, 3, 4가 각각 success = true로 기록된다
    // (Phase 10 V4 추가로 목록 확장)
    @Test
    fun `flyway_schema_history에 V1 V2 V3 V4가 success로 기록된다`() {
        val rows = jdbcTemplate.queryForList(
            "SELECT version, success FROM flyway_schema_history WHERE version IN ('1', '2', '3', '4') ORDER BY version",
        )
        assertEquals(4, rows.size, "V1~V4 마이그레이션 이력 4건이 존재해야 한다")
        assertEquals(listOf("1", "2", "3", "4"), rows.map { it["version"] as String })
        rows.forEach { row ->
            assertTrue(row["success"] as Boolean, "version ${row["version"]} 마이그레이션이 success=true여야 한다")
        }
    }

    // Test 2: users 테이블 컬럼 집합이 정확히 {id, created_at, kakao_id, nickname, profile_image_url}이다
    // (Phase 10 V4가 카카오 프로필 3개 컬럼을 추가함, D-08/D-11)
    @Test
    fun `users 테이블 컬럼 집합이 정확히 id created_at kakao_id nickname profile_image_url이다`() {
        assertEquals(usersColumns, columnNames("users"))
    }

    // Test 3: checkins 테이블 컬럼 집합이 클라이언트 CheckinRow에 user_id를 더한 것과 정확히 일치한다
    @Test
    fun `checkins 테이블 컬럼 집합이 계약대로다`() {
        assertEquals(checkinsColumns, columnNames("checkins"))
    }

    // Test 4: daily_reflections 테이블 컬럼 집합이 클라이언트 DailyReflectionRow에 user_id를 더한 것과 정확히 일치한다
    @Test
    fun `daily_reflections 테이블 컬럼 집합이 계약대로다`() {
        assertEquals(dailyReflectionsColumns, columnNames("daily_reflections"))
    }

    // Test 5: 타입 매핑 — timestamptz/double precision/varchar(길이)/integer/date/uuid
    @Test
    fun `타입 매핑이 계약대로다`() {
        assertEquals("timestamp with time zone", dataType("checkins", "timestamp_utc"))
        assertEquals("timestamp with time zone", dataType("checkins", "created_at"))
        assertEquals("timestamp with time zone", dataType("checkins", "updated_at"))

        assertEquals("double precision", dataType("checkins", "lat"))
        assertEquals("double precision", dataType("checkins", "lng"))
        assertEquals("double precision", dataType("checkins", "accuracy_meters"))

        assertEquals("character varying", dataType("checkins", "local_date_key"))
        assertEquals(10, charMaxLength("checkins", "local_date_key"))

        assertEquals("character varying", dataType("checkins", "timezone_at_capture"))
        assertEquals(64, charMaxLength("checkins", "timezone_at_capture"))

        assertEquals("character varying", dataType("checkins", "location_source"))
        assertEquals(32, charMaxLength("checkins", "location_source"))

        assertEquals("integer", dataType("checkins", "schema_version"))

        assertEquals("date", dataType("daily_reflections", "date"))

        assertEquals("uuid", dataType("users", "id"))
        assertEquals("uuid", dataType("checkins", "id"))
        assertEquals("uuid", dataType("checkins", "user_id"))
        assertEquals("uuid", dataType("daily_reflections", "id"))
        assertEquals("uuid", dataType("daily_reflections", "user_id"))
    }

    // Test A(신규): users.kakao_id의 data_type이 bigint다 — INTEGER면 실패해야 한다(Pitfall 3,
    // 카카오 회원번호는 Long이고 Int로 캐스팅하면 overflow로 음수가 되는 실사고 보고가 있다).
    @Test
    fun `users kakao_id의 데이터 타입이 bigint다`() {
        assertEquals("bigint", dataType("users", "kakao_id"), "kakao_id는 BIGINT여야 한다(Pitfall 3)")
    }

    // Test B(신규): users.nickname/profile_image_url의 data_type이 text이고 길이 상한이 없다
    // (A7 — 카카오 공식 문서가 두 필드의 길이 상한을 명시하지 않으므로 VARCHAR(N)으로 임의 추정하지 않음).
    @Test
    fun `users nickname과 profile_image_url의 데이터 타입이 text이고 길이 상한이 없다`() {
        assertEquals("text", dataType("users", "nickname"))
        assertNull(charMaxLength("users", "nickname"), "nickname은 TEXT라 character_maximum_length가 NULL이어야 한다")
        assertEquals("text", dataType("users", "profile_image_url"))
        assertNull(
            charMaxLength("users", "profile_image_url"),
            "profile_image_url은 TEXT라 character_maximum_length가 NULL이어야 한다",
        )
    }

    // Test 6: NOT NULL 대비 — accuracy_meters/note/photo_path/new_place_answer/free_reflection/
    // kakao_id/nickname/profile_image_url만 nullable(D-11 — 플레이스홀더 로우 공존을 위해 신규
    // 3개 컬럼도 nullable이어야 한다)
    @Test
    fun `nullable 제약이 계약대로다`() {
        assertTrue(isNullable("checkins", "accuracy_meters"))
        assertTrue(isNullable("checkins", "note"))
        assertTrue(isNullable("checkins", "photo_path"))
        assertTrue(isNullable("daily_reflections", "new_place_answer"))
        assertTrue(isNullable("daily_reflections", "free_reflection"))
        assertTrue(isNullable("users", "kakao_id"), "users.kakao_id는 nullable이어야 한다(D-11)")
        assertTrue(isNullable("users", "nickname"), "users.nickname은 nullable이어야 한다(D-11)")
        assertTrue(
            isNullable("users", "profile_image_url"),
            "users.profile_image_url은 nullable이어야 한다(D-11)",
        )

        val notNullColumns = listOf(
            "checkins" to "id",
            "checkins" to "user_id",
            "checkins" to "timestamp_utc",
            "checkins" to "local_date_key",
            "checkins" to "timezone_at_capture",
            "checkins" to "lat",
            "checkins" to "lng",
            "checkins" to "location_source",
            "checkins" to "created_at",
            "checkins" to "updated_at",
            "checkins" to "schema_version",
            "daily_reflections" to "id",
            "daily_reflections" to "user_id",
            "daily_reflections" to "date",
            "daily_reflections" to "created_at",
            "daily_reflections" to "updated_at",
            "users" to "id",
            "users" to "created_at",
        )
        notNullColumns.forEach { (table, column) ->
            assertTrue(!isNullable(table, column), "$table.$column 은 NOT NULL이어야 한다")
        }
    }

    // Test 7: checkins.user_id와 daily_reflections.user_id가 users(id)를 참조하는 FOREIGN KEY 제약을 갖는다
    @Test
    fun `checkins와 daily_reflections의 user_id가 users id를 참조하는 FK를 갖는다`() {
        listOf("checkins", "daily_reflections").forEach { table ->
            val fkCount = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*) FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
                JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
                WHERE tc.constraint_type = 'FOREIGN KEY'
                  AND tc.table_name = ?
                  AND kcu.column_name = 'user_id'
                  AND ccu.table_name = 'users'
                """.trimIndent(),
                Int::class.javaObjectType,
                table,
            )
            assertEquals(1, fkCount, "$table.user_id -> users(id) FK가 정확히 1건 존재해야 한다")
        }
    }

    // Test 8: daily_reflections에 (user_id, date) 조합의 UNIQUE 제약이 존재한다
    @Test
    fun `daily_reflections에 user_id date UNIQUE 제약이 존재한다`() {
        val uniqueCount = jdbcTemplate.queryForObject(
            """
            SELECT COUNT(*) FROM (
              SELECT tc.constraint_name
              FROM information_schema.table_constraints tc
              JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
              WHERE tc.constraint_type = 'UNIQUE' AND tc.table_name = 'daily_reflections'
              GROUP BY tc.constraint_name
              HAVING COUNT(*) = 2 AND bool_and(kcu.column_name IN ('user_id', 'date'))
            ) sub
            """.trimIndent(),
            Int::class.javaObjectType,
        )
        assertEquals(1, uniqueCount, "daily_reflections에 UNIQUE(user_id, date) 제약이 정확히 1건 존재해야 한다")
    }

    // Test C(신규): users에 kakao_id 단일 컬럼만 포함하는 UNIQUE 제약이 정확히 1개 존재한다
    // (D-08 — 동일 카카오 계정의 중복 가입을 DB 레벨에서 차단). daily_reflections의 UNIQUE(user_id,
    // date) 단언(Test 8)을 그대로 본떠서 컬럼 1개 버전으로 바꾼 것 — 제약 이름이 아니라 컬럼
    // 구성으로 단언한다(이름은 구현 세부사항).
    @Test
    fun `users에 kakao_id 단일 컬럼 UNIQUE 제약이 존재한다`() {
        val uniqueCount = jdbcTemplate.queryForObject(
            """
            SELECT COUNT(*) FROM (
              SELECT tc.constraint_name
              FROM information_schema.table_constraints tc
              JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
              WHERE tc.constraint_type = 'UNIQUE' AND tc.table_name = 'users'
              GROUP BY tc.constraint_name
              HAVING COUNT(*) = 1 AND bool_and(kcu.column_name = 'kakao_id')
            ) sub
            """.trimIndent(),
            Int::class.javaObjectType,
        )
        assertEquals(1, uniqueCount, "users에 kakao_id 단일 컬럼 UNIQUE 제약이 정확히 1건 존재해야 한다(D-08)")
    }

    // Test D(신규): users 테이블에 email이라는 이름의 컬럼이 존재하지 않는다
    // (D-05 — 이메일 미저장이 스키마 레벨에서 강제됨)
    @Test
    fun `users 테이블에 email 컬럼이 존재하지 않는다`() {
        assertTrue(!columnNames("users").contains("email"), "users 테이블에 email 컬럼이 없어야 한다(D-05)")
    }

    // Test 9: checkins.id와 daily_reflections.id의 column_default가 NULL이다 — 서버가 ID를 생성하지 않음
    @Test
    fun `checkins id와 daily_reflections id에 DB 기본값 생성기가 없다`() {
        assertNull(columnDefault("checkins", "id"), "checkins.id는 클라이언트가 발급하므로 DB 기본값이 없어야 한다")
        assertNull(columnDefault("daily_reflections", "id"), "daily_reflections.id는 클라이언트가 발급하므로 DB 기본값이 없어야 한다")
    }

    // Test 10: users.id의 column_default에 gen_random_uuid가 포함된다 — 서버가 유일하게 ID를 소유하는 테이블
    @Test
    fun `users id에는 gen_random_uuid 기본값이 있다`() {
        val default = columnDefault("users", "id")
        assertTrue(default != null && default.contains("gen_random_uuid"), "users.id는 gen_random_uuid() 기본값을 가져야 한다")
    }

    // Test 11: 인덱스 idx_checkins_local_date_key와 idx_checkins_user_id가 존재한다
    @Test
    fun `idx_checkins_local_date_key와 idx_checkins_user_id 인덱스가 존재한다`() {
        val indexNames = jdbcTemplate.queryForList(
            "SELECT indexname FROM pg_indexes WHERE tablename = 'checkins'",
            String::class.java,
        )
        assertTrue(indexNames.contains("idx_checkins_local_date_key"))
        assertTrue(indexNames.contains("idx_checkins_user_id"))
    }

    // Test 12: users 테이블에 id = 00000000-0000-0000-0000-000000000001 로우가 정확히 1건 존재한다(D-02 플레이스홀더)
    // + 그 로우의 kakao_id/nickname/profile_image_url이 전부 NULL이다(D-10/D-11 — V4가 V1의
    // INSERT문을 수정하지 않으므로 플레이스홀더 로우는 새 컬럼이 전부 NULL인 채로 살아남는다).
    @Test
    fun `users 테이블에 플레이스홀더 로우가 정확히 1건 존재한다`() {
        val count = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM users WHERE id = ?::uuid",
            Int::class.javaObjectType,
            PLACEHOLDER_USER_ID,
        )
        assertEquals(1, count)

        val row = jdbcTemplate.queryForMap(
            "SELECT kakao_id, nickname, profile_image_url FROM users WHERE id = ?::uuid",
            PLACEHOLDER_USER_ID,
        )
        assertNull(row["kakao_id"], "플레이스홀더 로우의 kakao_id는 NULL이어야 한다(D-10/D-11)")
        assertNull(row["nickname"], "플레이스홀더 로우의 nickname은 NULL이어야 한다(D-10/D-11)")
        assertNull(row["profile_image_url"], "플레이스홀더 로우의 profile_image_url은 NULL이어야 한다(D-10/D-11)")
    }
}
