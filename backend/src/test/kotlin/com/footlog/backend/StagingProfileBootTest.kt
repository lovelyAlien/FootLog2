package com.footlog.backend

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.resttestclient.TestRestTemplate
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureTestRestTemplate
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.context.SpringBootTest.WebEnvironment
import org.springframework.http.HttpStatus
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.context.DynamicPropertyRegistry
import org.springframework.test.context.DynamicPropertySource
import org.testcontainers.junit.jupiter.Container
import org.testcontainers.junit.jupiter.Testcontainers
import org.testcontainers.postgresql.PostgreSQLContainer
import org.testcontainers.utility.DockerImageName

// 09-05-PLAN.md Task 2 — staging 프로파일이 application-staging.yml의 ${DATABASE_URL} 등
// 플레이스홀더를 통해 "환경변수만으로" DataSource를 구성하고 실제로 기동됨을 증명한다.
//
// 09-RESEARCH.md Pitfall 3 경고: spring-boot-docker-compose는 developmentOnly 스코프라
// staging처럼 패키징된 실행 가능 jar에는 아예 포함되지 않는다. "로컬(compose.yaml 자동 감지)에서
// 됐으니 staging도 되겠지"라고 가정하면 위험하다 — 로컬 프로파일과 달리 staging은 DataSource를
// 명시적으로 설정해야만 기동된다. 그래서 이 테스트는 TestcontainersConfiguration의 자동
// 커넥션 주입 애너테이션(DataSource를 자동으로 연결해주는 Spring Boot Testcontainers 기능)
// 경로를 의도적으로 쓰지 않는다 — 그걸 쓰면 이 테스트가 검증하려는 "staging의 명시적
// DataSource 설정 경로"가 우회되어 검증이 무의미해진다.
// 대신 컨테이너를 이 클래스 안에서 직접 선언하고, @DynamicPropertySource로 DATABASE_URL/
// DATABASE_USERNAME/DATABASE_PASSWORD를 실제 배포 환경의 환경변수 주입과 동일한 방식으로
// 등록해 application-staging.yml의 ${DATABASE_URL} 플레이스홀더가 실제로 해석되는지 검증한다.
@Testcontainers
@ActiveProfiles("staging")
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
@AutoConfigureTestRestTemplate
class StagingProfileBootTest {

    companion object {
        @Container
        @JvmStatic
        val postgres: PostgreSQLContainer = PostgreSQLContainer(DockerImageName.parse("postgres:latest"))

        @DynamicPropertySource
        @JvmStatic
        fun registerDataSourceProperties(registry: DynamicPropertyRegistry) {
            registry.add("DATABASE_URL") { postgres.jdbcUrl }
            registry.add("DATABASE_USERNAME") { postgres.username }
            registry.add("DATABASE_PASSWORD") { postgres.password }
            // staging 프로파일이 기본값 없는 ${JWT_SECRET}을 요구한다(10-03-PLAN.md) — 이
            // 등록이 없으면 컨텍스트 로딩이 실패한다. 그리고 그 실패는 의도된 설계의 증거다:
            // JWT_SECRET이 실제 배포 환경변수로 주입되지 않으면 staging이 아예 기동되지
            // 않아야 하고, 이 테스트는 "환경변수만으로 기동됨"을 증명하는 것이지 그 요구를
            // 우회하는 것이 아니다. 32바이트 이상(HS256 최소 256비트, Pitfall 2)인 테스트
            // 전용 문자열을 쓴다.
            registry.add("JWT_SECRET") { "staging-boot-test-only-jwt-secret-32bytes-min" }
        }
    }

    @Autowired
    lateinit var jdbcTemplate: JdbcTemplate

    @Autowired
    lateinit var restTemplate: TestRestTemplate

    // Test 1: staging 프로파일 활성 상태에서 애플리케이션 컨텍스트가 정상 기동된다 —
    // DataSource가 DATABASE_URL/DATABASE_USERNAME/DATABASE_PASSWORD만으로 구성된다.
    // (컨텍스트가 로딩되지 않으면 @Autowired 필드 주입 자체가 실패해 이 테스트 클래스의
    // 모든 테스트가 실패하므로, 별도 단언 없이 jdbcTemplate이 정상 주입됐는지만 확인한다.)
    @Test
    fun `staging 프로파일에서 애플리케이션 컨텍스트가 환경변수 DataSource로 기동된다`() {
        val currentDatabase = jdbcTemplate.queryForObject("SELECT current_database()", String::class.java)
        assertTrue(!currentDatabase.isNullOrBlank(), "DataSource가 실제로 연결돼야 한다")
    }

    // Test 2: staging 프로파일에서도 Flyway가 V1~V3를 적용해 checkins 테이블 조회가 성공한다
    @Test
    fun `staging 프로파일에서도 Flyway가 V1~V3를 적용해 checkins 테이블을 조회할 수 있다`() {
        val rows = jdbcTemplate.queryForList(
            "SELECT version, success FROM flyway_schema_history WHERE version IN ('1', '2', '3') ORDER BY version",
        )
        assertEquals(3, rows.size, "V1~V3 마이그레이션 이력 3건이 staging 프로파일에서도 존재해야 한다")
        rows.forEach { row ->
            assertTrue(row["success"] as Boolean, "version ${row["version"]} 마이그레이션이 success=true여야 한다")
        }

        val checkinsCount = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM checkins", Int::class.javaObjectType)
        assertEquals(0, checkinsCount, "checkins 테이블이 조회 가능해야 한다(V2가 만든 빈 테이블)")
    }

    // Test 3: staging 프로파일에서도 GET /actuator/health가 200이고 /actuator/env는 404다
    // (노출 잠금이 프로파일과 무관하게 유지됨 — application.yml 공통 설정이 상속됨을 검증)
    @Test
    fun `staging 프로파일에서도 actuator 노출 잠금이 유지된다`() {
        val health = restTemplate.getForEntity("/actuator/health", String::class.java)
        assertEquals(HttpStatus.OK, health.statusCode)
        assertTrue(health.body?.contains("\"status\":\"UP\"") == true)

        val env = restTemplate.getForEntity("/actuator/env", String::class.java)
        assertEquals(HttpStatus.NOT_FOUND, env.statusCode)
    }
}
