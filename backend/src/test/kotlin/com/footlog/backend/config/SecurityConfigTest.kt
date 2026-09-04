package com.footlog.backend.config

import com.footlog.backend.TestcontainersConfiguration
import com.footlog.backend.auth.JwtIssuerService
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotEquals
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.resttestclient.TestRestTemplate
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureTestRestTemplate
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.context.SpringBootTest.WebEnvironment
import org.springframework.context.annotation.Import
import org.springframework.http.HttpEntity
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpMethod
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.oauth2.jwt.JwtClaimsSet
import org.springframework.security.oauth2.jwt.JwtEncoder
import org.springframework.security.oauth2.jwt.JwtEncoderParameters
import java.time.Duration
import java.time.Instant
import java.util.UUID

// 10-05-PLAN.md Task 1 — 10-03이 만든 Spring Security 필터 체인(SecurityConfig)이 실제로
// 의도대로 보호/개방하는지 HTTP 레벨에서 고정하는 회귀 게이트. 이 테스트가 실패하면 이
// 테스트가 아니라 SecurityConfig/JwtConfig를 고친다 — 이미 확정된 설계를 서술한 것이다.
//
// HealthCheckSmokeTest와 동일한 3종 클래스 레벨 애노테이션을 그대로 쓰고 컨테이너를 새로
// 선언하지 않는다. Boot 4.1부터 TestRestTemplate 관련 타입의 패키지 경로가 이동했다
// (HealthCheckSmokeTest 주석의 임포트 경로 함정 그대로 재사용 — 아래 import 문 참고).
@Import(TestcontainersConfiguration::class)
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
@AutoConfigureTestRestTemplate
class SecurityConfigTest {

    @Autowired
    lateinit var restTemplate: TestRestTemplate

    @Autowired
    lateinit var jwtIssuerService: JwtIssuerService

    @Autowired
    lateinit var jwtEncoder: JwtEncoder

    // Bearer 헤더가 붙은 요청은 getForEntity로 보낼 수 없다(헤더를 넣을 방법이 없음) —
    // exchange로 HttpEntity<Void>를 넘기는 헬퍼로 반복을 없앤다.
    private fun getWithToken(path: String, token: String?): ResponseEntity<String> {
        val headers = HttpHeaders()
        if (token != null) {
            headers.setBearerAuth(token)
        }
        return restTemplate.exchange(path, HttpMethod.GET, HttpEntity<Void>(headers), String::class.java)
    }

    // Test 1: 핸들러가 없는 /api/protected-probe를 토큰 없이 호출하면 401이다 — 핸들러가
    // 없어도 필터가 먼저 막는다는 것이 "보호가 실재함"의 증명이다(T-10-22).
    @Test
    fun `핸들러 없는 api 경로도 토큰 없이 호출하면 401이다`() {
        val response = getWithToken("/api/protected-probe", null)

        assertEquals(HttpStatus.UNAUTHORIZED, response.statusCode)
    }

    // Test 2: 유효한 access 토큰을 붙이면 같은 경로가 401이 아니라 404다 — 필터를
    // 통과했고 단지 핸들러가 없을 뿐이라는 뜻이다. **200이 아니라 "401이 아니고 404"를
    // 단언한다** — 나중에 누군가 /api/protected-probe 핸들러를 만들면 이 테스트가 200
    // 기대로 바뀌어야 하며 그때 기대값을 200으로 바꾸면 된다.
    @Test
    fun `유효한 access 토큰을 붙이면 같은 경로가 401이 아니라 404다`() {
        val accessToken = jwtIssuerService.issueAccessToken(UUID.randomUUID())

        val response = getWithToken("/api/protected-probe", accessToken)

        assertEquals(HttpStatus.NOT_FOUND, response.statusCode)
        assertNotEquals(HttpStatus.UNAUTHORIZED, response.statusCode)
    }

    // Test 3: refresh 토큰을 Bearer로 붙이면 401이다 — oauth2ResourceServer가 자동
    // 주입하는 @Primary 디코더는 token_use=access만 통과시키므로, 탈취된 refresh 토큰으로
    // 보호된 API를 호출할 수 없음의 HTTP 레벨 증명이다(10-03 T-10-09, T-10-21).
    @Test
    fun `refresh 토큰을 Bearer로 붙이면 401이다`() {
        val refreshToken = jwtIssuerService.issueRefreshToken(UUID.randomUUID())

        val response = getWithToken("/api/protected-probe", refreshToken)

        assertEquals(HttpStatus.UNAUTHORIZED, response.statusCode)
    }

    // Test 4: 서명은 유효하지만 exp가 과거인 access 토큰은 401이다 — JwtValidators.
    // createDefault()의 만료 검증이 실제로 활성화돼 있음의 증명. JwtIssuerServiceTest와
    // 동일하게 issuedAt 2시간 전/expiresAt 1시간 전으로 직접 만든다. 시간 경과를 기다리는
    // 임의 대기 없이 과거 시각을 클레임에 직접 넣는 방식이라 플레이키하지 않다.
    @Test
    fun `만료된 access 토큰은 401이다`() {
        val now = Instant.now()
        val claims = JwtClaimsSet.builder()
            .issuer("footlog-backend")
            .subject(UUID.randomUUID().toString())
            .issuedAt(now.minus(Duration.ofHours(2)))
            .expiresAt(now.minus(Duration.ofHours(1)))
            .claim("token_use", "access")
            .build()
        val expiredToken = jwtEncoder.encode(JwtEncoderParameters.from(claims)).tokenValue

        val response = getWithToken("/api/protected-probe", expiredToken)

        assertEquals(HttpStatus.UNAUTHORIZED, response.statusCode)
    }

    // Test 5: 서명이 변조된 토큰(마지막 서명 세그먼트 문자를 치환)은 401이다 — 다른 키로
    // 인코더를 새로 만들지 않고, 유효한 토큰 문자열을 직접 변조해 서명 불일치를 만든다.
    @Test
    fun `서명이 변조된 토큰은 401이다`() {
        val validToken = jwtIssuerService.issueAccessToken(UUID.randomUUID())
        val lastChar = validToken.last()
        val replacement = if (lastChar == 'A') 'B' else 'A'
        val tamperedToken = validToken.dropLast(1) + replacement

        val response = getWithToken("/api/protected-probe", tamperedToken)

        assertEquals(HttpStatus.UNAUTHORIZED, response.statusCode)
    }

    // Test 6: /actuator/health는 토큰 없이 호출해도 200이다 — permitAll이 유지되고
    // 있음의 증명(Phase 9의 헬스체크 스모크와 동일 계약).
    @Test
    fun `actuator health는 토큰 없이도 200이다`() {
        val response = restTemplate.getForEntity("/actuator/health", String::class.java)

        assertEquals(HttpStatus.OK, response.statusCode)
    }

    // Test 7: /actuator/env는 토큰 없이 호출하면 404다 — **401이 아니다.** actuator
    // 노출 잠금(management.endpoints.web.exposure.include: health)이 여전히 유일한
    // 제어라는 Phase 9의 T-9-02 계약이 Spring Security 도입 후에도 살아 있음을 확인하는
    // 회귀 게이트다. /actuator/**를 authenticated로 바꾸면 이 결과가 401로 바뀌며,
    // "노출 목록이 유일한 제어"라는 전제가 무력화된다 — 그런 변경을 "보안상 조여야 한다"며
    // 되돌리지 말 것.
    @Test
    fun `actuator env는 토큰 없이 호출하면 401이 아니라 404다`() {
        val response = restTemplate.getForEntity("/actuator/env", String::class.java)

        assertEquals(HttpStatus.NOT_FOUND, response.statusCode)
    }

    // Test 8: POST /api/auth/refresh는 토큰 없이 호출해도 401/403이 아니다 —
    // /api/auth/**가 permitAll임의 증명. 본문이 없으므로 400 또는 415가 예상되며, 이
    // 테스트는 그 정확한 값이 아니라 "인증 게이트에 막히지 않는다"만 단언한다.
    @Test
    fun `api auth refresh는 토큰 없이 호출해도 401이 아니다`() {
        val response = restTemplate.postForEntity("/api/auth/refresh", null, String::class.java)

        assertNotEquals(HttpStatus.UNAUTHORIZED, response.statusCode)
        assertNotEquals(HttpStatus.FORBIDDEN, response.statusCode)
    }
}
