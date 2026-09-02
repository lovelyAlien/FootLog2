package com.footlog.backend

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.context.SpringBootTest.WebEnvironment
import org.springframework.boot.resttestclient.TestRestTemplate
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureTestRestTemplate
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.context.annotation.Import
import org.springframework.http.HttpStatus

// 09-05-PLAN.md Task 1 — REQ-backend-scaffold 성공 기준 1(로컬/스테이징 기동)을 사람 눈이
// 아니라 CI가 매번 검증하게 만드는 스모크 테스트 + actuator 노출 잠금(T-9-02)의 회귀 게이트.
//
// Test 2/3은 401/403이 아니라 404를 단언한다 — Spring Boot Actuator는
// management.endpoints.web.exposure.include에 없는 엔드포인트를 아예 매핑하지 않기 때문이다.
// 이 두 단언은 정보 노출(T-9-02) 회귀 게이트다: exposure.include가 실수로 "*"나
// "health,env,beans" 등으로 넓어지면 이 테스트가 즉시 실패해야 한다.
//
// Boot 4.1부터 TestRestTemplate은 org.springframework.boot.test.web.client가 아니라
// org.springframework.boot.resttestclient 패키지(신규 spring-boot-resttestclient 모듈)로
// 이동했고, 빈 자동 주입도 @AutoConfigureTestRestTemplate을 명시해야 활성화된다
// (09-RESEARCH.md에 기록되지 않은 신규 breaking change — 실행 중 발견해 즉시 반영).
@Import(TestcontainersConfiguration::class)
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
@AutoConfigureTestRestTemplate
class HealthCheckSmokeTest {

    @Autowired
    lateinit var restTemplate: TestRestTemplate

    // Test 1: GET /actuator/health가 200을 반환하고 응답 본문에 "status":"UP"이 포함된다
    @Test
    fun `actuator health는 200과 UP 상태를 반환한다`() {
        val response = restTemplate.getForEntity("/actuator/health", String::class.java)

        assertEquals(HttpStatus.OK, response.statusCode)
        assertTrue(
            response.body?.contains("\"status\":\"UP\"") == true,
            "응답 본문에 \"status\":\"UP\"이 포함돼야 한다 — 실제 응답: ${response.body}",
        )
    }

    // Test 2: GET /actuator/env는 404를 반환한다(노출 목록에 없음 — T-9-02 회귀 게이트)
    @Test
    fun `actuator env는 노출되지 않아 404를 반환한다`() {
        val response = restTemplate.getForEntity("/actuator/env", String::class.java)

        assertEquals(HttpStatus.NOT_FOUND, response.statusCode)
    }

    // Test 3: GET /actuator/beans는 404를 반환한다(노출 목록에 없음 — T-9-02 회귀 게이트)
    @Test
    fun `actuator beans는 노출되지 않아 404를 반환한다`() {
        val response = restTemplate.getForEntity("/actuator/beans", String::class.java)

        assertEquals(HttpStatus.NOT_FOUND, response.statusCode)
    }
}
