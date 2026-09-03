package com.footlog.backend.auth

import com.footlog.backend.TestcontainersConfiguration
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotEquals
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.beans.factory.annotation.Qualifier
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.context.annotation.Import
import org.springframework.security.oauth2.jwt.JwtClaimsSet
import org.springframework.security.oauth2.jwt.JwtDecoder
import org.springframework.security.oauth2.jwt.JwtEncoder
import org.springframework.security.oauth2.jwt.JwtEncoderParameters
import org.springframework.security.oauth2.jwt.JwtValidationException
import java.time.Duration
import java.time.Instant
import java.util.UUID

// 10-03-PLAN.md Task 2 — 토큰 발급 계약(클레임/TTL/오용 차단)을 고정하는 RED 테스트.
// @Import(TestcontainersConfiguration::class) + @SpringBootTest로 실제 애플리케이션
// 컨텍스트를 띄워 JwtConfig가 만든 빈들을 그대로 검증한다(컨테이너를 새로 선언하지 않음).
@Import(TestcontainersConfiguration::class)
@SpringBootTest
class JwtIssuerServiceTest {

    @Autowired
    lateinit var jwtIssuerService: JwtIssuerService

    // @Primary 지정 — access 전용 디코더(oauth2ResourceServer가 자동 주입받는 것과 동일 빈).
    @Autowired
    lateinit var jwtDecoder: JwtDecoder

    @Autowired
    @Qualifier("refreshTokenDecoder")
    lateinit var refreshTokenDecoder: JwtDecoder

    @Autowired
    lateinit var jwtEncoder: JwtEncoder

    // Test 1: access 토큰의 subject/issuer/token_use 클레임이 계약대로 채워진다(D-01/D-02).
    @Test
    fun `issueAccessToken이 발급한 토큰은 subject issuer token_use 클레임이 정확하다`() {
        val userId = UUID.randomUUID()
        val token = jwtIssuerService.issueAccessToken(userId)

        val jwt = jwtDecoder.decode(token)

        assertEquals(userId.toString(), jwt.subject)
        // jwt.issuer(getIssuer())는 iss 클레임을 URL로 강제 변환하려 시도해 "footlog-backend"
        // 같은 비-URL 문자열에서 IllegalArgumentException을 던진다 — getClaimAsString으로
        // 원본 문자열 클레임을 그대로 비교한다(발견: 실행 중 실제 예외로 확인).
        assertEquals("footlog-backend", jwt.getClaimAsString("iss"))
        assertEquals("access", jwt.getClaimAsString("token_use"))
    }

    // Test 2: access 토큰 TTL이 정확히 30분이다(D-03, 오차 허용 ±2초).
    @Test
    fun `issueAccessToken의 TTL은 30분이다`() {
        val token = jwtIssuerService.issueAccessToken(UUID.randomUUID())
        val jwt = jwtDecoder.decode(token)

        val actualTtl = Duration.between(jwt.issuedAt, jwt.expiresAt)
        val diff = (actualTtl - Duration.ofMinutes(30)).abs()

        assertTrueTtlWithinTolerance(diff)
    }

    // Test 3: refresh 토큰의 token_use가 "refresh"이고 TTL이 정확히 30일이다(D-03).
    @Test
    fun `issueRefreshToken은 token_use=refresh이고 TTL은 30일이다`() {
        val userId = UUID.randomUUID()
        val token = jwtIssuerService.issueRefreshToken(userId)

        val jwt = refreshTokenDecoder.decode(token)

        assertEquals("refresh", jwt.getClaimAsString("token_use"))
        val actualTtl = Duration.between(jwt.issuedAt, jwt.expiresAt)
        val diff = (actualTtl - Duration.ofDays(30)).abs()
        assertTrueTtlWithinTolerance(diff)
    }

    // Test 4: refresh 토큰을 access 전용 디코더로 디코드하면 검증 예외가 발생한다 — T-10-09
    // (탈취된 refresh 토큰으로 보호된 API를 통과할 수 없음의 증명).
    @Test
    fun `refresh 토큰은 access 전용 디코더를 통과하지 못한다`() {
        val refreshToken = jwtIssuerService.issueRefreshToken(UUID.randomUUID())

        assertThrows(JwtValidationException::class.java) {
            jwtDecoder.decode(refreshToken)
        }
    }

    // Test 5: access 토큰을 refresh 전용 디코더로 디코드하면 검증 예외가 발생한다 — 반대
    // 방향 오용도 차단됨(T-10-09).
    @Test
    fun `access 토큰은 refresh 전용 디코더를 통과하지 못한다`() {
        val accessToken = jwtIssuerService.issueAccessToken(UUID.randomUUID())

        assertThrows(JwtValidationException::class.java) {
            refreshTokenDecoder.decode(accessToken)
        }
    }

    // Test 6: refresh 토큰을 refresh 전용 디코더로 디코드하면 성공하고 subject가 동일하다
    // (10-05의 리프레시 경로가 실제로 쓸 수 있음).
    @Test
    fun `refresh 토큰은 refreshTokenDecoder를 통과하고 subject가 동일하다`() {
        val userId = UUID.randomUUID()
        val refreshToken = jwtIssuerService.issueRefreshToken(userId)

        val jwt = refreshTokenDecoder.decode(refreshToken)

        assertEquals(userId.toString(), jwt.subject)
    }

    // Test 7: 서로 다른 두 userId로 발급한 access 토큰의 tokenValue가 서로 다르다 — 토큰이
    // 상수로 하드코딩되지 않았음의 증명.
    @Test
    fun `서로 다른 userId의 access 토큰은 서로 다르다`() {
        val tokenA = jwtIssuerService.issueAccessToken(UUID.randomUUID())
        val tokenB = jwtIssuerService.issueAccessToken(UUID.randomUUID())

        assertNotEquals(tokenA, tokenB)
    }

    // Test 8: jwtEncoder로 직접 만든 "서명은 유효하지만 이미 만료된" access 토큰을
    // jwtDecoder로 디코드하면 검증 예외가 발생한다 — JwtValidators.createDefault()의 exp
    // 검증이 실제로 활성화되어 있음의 증명. 시계 조작이나 플레이키 대기 없이 과거 시각을 직접
    // 클레임에 넣는다.
    @Test
    fun `이미 만료된 토큰은 jwtDecoder에서 검증 예외가 발생한다`() {
        val now = Instant.now()
        val claims = JwtClaimsSet.builder()
            .issuer("footlog-backend")
            .subject(UUID.randomUUID().toString())
            .issuedAt(now.minus(Duration.ofHours(2)))
            .expiresAt(now.minus(Duration.ofHours(1)))
            .claim("token_use", "access")
            .build()
        val expiredToken = jwtEncoder.encode(JwtEncoderParameters.from(claims)).tokenValue

        assertThrows(JwtValidationException::class.java) {
            jwtDecoder.decode(expiredToken)
        }
    }

    // Test 9: accessTokenTtlSeconds가 1800이다 — 10-05의 TokenResponse.expiresIn이
    // 하드코딩이 아니라 설정에서 파생됨을 증명.
    @Test
    fun `accessTokenTtlSeconds는 1800이다`() {
        assertEquals(1800L, jwtIssuerService.accessTokenTtlSeconds)
    }

    private fun assertTrueTtlWithinTolerance(diff: Duration) {
        assertEquals(true, diff <= Duration.ofSeconds(2), "TTL 오차가 ±2초를 초과함: $diff")
    }
}
