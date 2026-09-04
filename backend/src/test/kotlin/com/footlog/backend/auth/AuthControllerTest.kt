package com.footlog.backend.auth

import com.footlog.backend.TestcontainersConfiguration
import com.footlog.backend.user.UserRepository
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.beans.factory.annotation.Qualifier
import org.springframework.boot.resttestclient.TestRestTemplate
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureTestRestTemplate
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.context.SpringBootTest.WebEnvironment
import org.springframework.context.annotation.Import
import org.springframework.http.HttpEntity
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.security.oauth2.jwt.JwtDecoder
import tools.jackson.databind.ObjectMapper
import java.util.concurrent.atomic.AtomicLong

// 10-05-PLAN.md Task 2 — POST /api/auth/kakao/login과 POST /api/auth/refresh의 HTTP 계약
// 13개를 고정하는 RED 테스트. 컨트롤러(AuthController)가 아직 없으므로 이 시점에는 전부
// 실패한다(RED 로그는 10-05-SUMMARY.md에 인용).
//
// 10-04의 FakeKakaoUserInfoClientConfiguration을 그대로 @Import해서 재사용한다 — 실제
// 카카오 사용자정보 조회 엔드포인트를 절대 호출하지 않는다.
//
// 트랜잭션 애노테이션을 붙이지 않는다 — RANDOM_PORT 실제 HTTP 요청은 별도 스레드/
// 트랜잭션에서 처리되어 테스트 트랜잭션 롤백이 적용되지 않는다. 카운트 단언은 절대값이
// 아니라 호출 전후 증가분으로 한다.
@Import(TestcontainersConfiguration::class, FakeKakaoUserInfoClientConfiguration::class)
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
@AutoConfigureTestRestTemplate
class AuthControllerTest {

    @Autowired
    lateinit var restTemplate: TestRestTemplate

    @Autowired
    lateinit var fakeKakaoUserInfoClient: FakeKakaoUserInfoClient

    @Autowired
    lateinit var userRepository: UserRepository

    @Autowired
    lateinit var jwtIssuerService: JwtIssuerService

    // @Primary 지정 — access 전용 디코더.
    @Autowired
    lateinit var jwtDecoder: JwtDecoder

    @Autowired
    @Qualifier("refreshTokenDecoder")
    lateinit var refreshTokenDecoder: JwtDecoder

    @Autowired
    lateinit var objectMapper: ObjectMapper

    // kakaoId 발급용 — 테스트마다 서로 다른 값을 쓰기 위한 카운터. Test 2("같은 kakaoId로
    // 두 번 로그인")만 이 카운터 대신 자신만의 고유 값을 명시적으로 세팅한다.
    private val kakaoIdSeq = AtomicLong(500_000_000_000L)
    private fun nextKakaoId(): Long = kakaoIdSeq.incrementAndGet()

    // FakeKakaoUserInfoClient는 싱글턴 빈이라 테스트 간 상태가 샌다 — 매 테스트 시작 전
    // 직접 초기화한다(10-04-KakaoAuthServiceTest와 동일 규율).
    @BeforeEach
    fun resetFake() {
        fakeKakaoUserInfoClient.nextResponse = null
        fakeKakaoUserInfoClient.nextError = null
        fakeKakaoUserInfoClient.lastToken = null
        fakeKakaoUserInfoClient.callCount = 0
    }

    private fun profileResponse(kakaoId: Long, nickname: String? = "테스터"): KakaoUserInfoResponse =
        KakaoUserInfoResponse(
            id = kakaoId,
            kakaoAccount = KakaoUserInfoResponse.KakaoAccount(
                profile = KakaoUserInfoResponse.KakaoAccount.Profile(
                    nickname = nickname,
                    profileImageUrl = null,
                ),
            ),
        )

    // 401/400 응답에서 TokenResponse로 바로 역직렬화하면 실패 원인 파악이 어려워지므로
    // 항상 String으로 받고, 200 응답의 필드 확인만 objectMapper로 파싱해 수행한다.
    private fun postJson(path: String, body: Map<String, Any?>): ResponseEntity<String> {
        val headers = HttpHeaders()
        headers.contentType = MediaType.APPLICATION_JSON
        val bodyJson = objectMapper.writeValueAsString(body)
        return restTemplate.postForEntity(path, HttpEntity(bodyJson, headers), String::class.java)
    }

    // Test 1: Fake가 정상 사용자정보를 반환하도록 세팅한 뒤 로그인하면 200이고, 응답의
    // accessToken/refreshToken이 빈 문자열이 아니며 expiresIn이 accessTokenTtlSeconds와
    // 같다(D-02). Authorization 헤더 없이 호출하므로 permitAll(Test 13)도 함께 증명한다.
    @Test
    fun `카카오 로그인 성공 시 200과 유효한 토큰이 반환된다`() {
        val kakaoId = nextKakaoId()
        fakeKakaoUserInfoClient.nextResponse = profileResponse(kakaoId)

        val response = postJson("/api/auth/kakao/login", mapOf("kakaoAccessToken" to "t"))

        assertEquals(HttpStatus.OK, response.statusCode)
        val body = objectMapper.readTree(response.body)
        assertTrue(body.get("accessToken").asText().isNotBlank())
        assertTrue(body.get("refreshToken").asText().isNotBlank())
        assertEquals(jwtIssuerService.accessTokenTtlSeconds, body.get("expiresIn").asLong())
    }

    // Test 2: 같은 kakaoId로 두 번 로그인해도 userRepository.count() 증가분이 1이다
    // (D-08의 find-or-create가 HTTP 경로에서도 유지됨).
    @Test
    fun `같은 kakaoId로 두 번 로그인해도 계정 증가분이 1이다`() {
        val kakaoId = 600_000_000_001L
        fakeKakaoUserInfoClient.nextResponse = profileResponse(kakaoId)
        val before = userRepository.count()

        postJson("/api/auth/kakao/login", mapOf("kakaoAccessToken" to "t1"))
        fakeKakaoUserInfoClient.nextResponse = profileResponse(kakaoId)
        postJson("/api/auth/kakao/login", mapOf("kakaoAccessToken" to "t2"))

        val after = userRepository.count()
        assertEquals(1, after - before, "같은 kakaoId로 두 번 로그인해도 계정은 1건만 늘어야 한다")
    }

    // Test 3: 빈 문자열 kakaoAccessToken은 400이다(V5 입력 검증, @field:NotBlank).
    @Test
    fun `빈 문자열 kakaoAccessToken은 400이다`() {
        val response = postJson("/api/auth/kakao/login", mapOf("kakaoAccessToken" to ""))

        assertEquals(HttpStatus.BAD_REQUEST, response.statusCode)
    }

    // Test 4: 필드 자체가 누락된 요청도 400이다.
    @Test
    fun `필드가 누락된 로그인 요청은 400이다`() {
        val response = postJson("/api/auth/kakao/login", emptyMap())

        assertEquals(HttpStatus.BAD_REQUEST, response.statusCode)
    }

    // Test 5: Fake가 KakaoAuthException을 던지면 401이며 500이 아니다.
    @Test
    fun `카카오 인증 실패 시 401이고 500이 아니다`() {
        fakeKakaoUserInfoClient.nextError = KakaoAuthException("카카오 사용자정보 조회 실패(status=401)")

        val response = postJson("/api/auth/kakao/login", mapOf("kakaoAccessToken" to "bad-token"))

        assertEquals(HttpStatus.UNAUTHORIZED, response.statusCode)
    }

    // Test 6: Test 5의 응답 본문에 예외 클래스명/스택트레이스/"trace" 키가 노출되지
    // 않는다(T-10-24 — 내부 정보 미노출).
    @Test
    fun `카카오 인증 실패 응답 본문에 내부 예외 정보가 노출되지 않는다`() {
        fakeKakaoUserInfoClient.nextError = KakaoAuthException("카카오 사용자정보 조회 실패(status=401)")

        val response = postJson("/api/auth/kakao/login", mapOf("kakaoAccessToken" to "bad-token"))

        val body = response.body ?: ""
        assertFalse(body.contains("KakaoAuthException"), "응답 본문에 예외 클래스명이 노출되면 안 된다")
        assertFalse(body.contains("trace"), "응답 본문에 trace 키가 노출되면 안 된다")
        assertFalse(body.contains("at com.footlog"), "응답 본문에 스택트레이스가 노출되면 안 된다")
    }

    // Test 7: Test 1에서 받은 refreshToken으로 리프레시하면 200이고 새 accessToken이
    // 발급된다.
    @Test
    fun `유효한 refreshToken으로 리프레시하면 200과 새 accessToken이 반환된다`() {
        val kakaoId = nextKakaoId()
        fakeKakaoUserInfoClient.nextResponse = profileResponse(kakaoId)
        val loginResponse = postJson("/api/auth/kakao/login", mapOf("kakaoAccessToken" to "t"))
        val loginBody = objectMapper.readTree(loginResponse.body)
        val refreshToken = loginBody.get("refreshToken").asText()

        val response = postJson("/api/auth/refresh", mapOf("refreshToken" to refreshToken))

        assertEquals(HttpStatus.OK, response.statusCode)
        val body = objectMapper.readTree(response.body)
        assertTrue(body.get("accessToken").asText().isNotBlank())
    }

    // Test 8: 리프레시 응답의 refreshToken이 null이다 — 회전하지 않는다(A8).
    @Test
    fun `리프레시 응답의 refreshToken은 null이다`() {
        val kakaoId = nextKakaoId()
        fakeKakaoUserInfoClient.nextResponse = profileResponse(kakaoId)
        val loginBody = objectMapper.readTree(
            postJson("/api/auth/kakao/login", mapOf("kakaoAccessToken" to "t")).body,
        )
        val refreshToken = loginBody.get("refreshToken").asText()

        val response = postJson("/api/auth/refresh", mapOf("refreshToken" to refreshToken))

        val body = objectMapper.readTree(response.body)
        assertNull(body.get("refreshToken")?.takeIf { !it.isNull }, "회전 없음(A8) — refreshToken은 null이어야 한다")
    }

    // Test 9: 리프레시로 받은 새 access 토큰을 @Primary JwtDecoder로 디코드하면 subject가
    // Test 1(로그인)의 access 토큰과 동일한 사용자 UUID다 — 리프레시가 다른 사용자로
    // 바뀌지 않음.
    @Test
    fun `리프레시로 발급된 새 access 토큰의 subject가 로그인 시점과 동일하다`() {
        val kakaoId = nextKakaoId()
        fakeKakaoUserInfoClient.nextResponse = profileResponse(kakaoId)
        val loginBody = objectMapper.readTree(
            postJson("/api/auth/kakao/login", mapOf("kakaoAccessToken" to "t")).body,
        )
        val originalAccessToken = loginBody.get("accessToken").asText()
        val refreshToken = loginBody.get("refreshToken").asText()
        val originalSubject = jwtDecoder.decode(originalAccessToken).subject

        val refreshResponseBody = objectMapper.readTree(
            postJson("/api/auth/refresh", mapOf("refreshToken" to refreshToken)).body,
        )
        val newAccessToken = refreshResponseBody.get("accessToken").asText()
        val newSubject = jwtDecoder.decode(newAccessToken).subject

        assertEquals(originalSubject, newSubject)
    }

    // Test 10: refresh 엔드포인트에 access 토큰을 넣으면 401이다(token_use 검증, T-10-21).
    @Test
    fun `refresh 엔드포인트에 access 토큰을 넣으면 401이다`() {
        val accessToken = jwtIssuerService.issueAccessToken(java.util.UUID.randomUUID())

        val response = postJson("/api/auth/refresh", mapOf("refreshToken" to accessToken))

        assertEquals(HttpStatus.UNAUTHORIZED, response.statusCode)
    }

    // Test 11: refresh 엔드포인트에 서명이 변조된 문자열을 넣으면 401이다.
    @Test
    fun `refresh 엔드포인트에 변조된 토큰을 넣으면 401이다`() {
        val validRefreshToken = jwtIssuerService.issueRefreshToken(java.util.UUID.randomUUID())
        val lastChar = validRefreshToken.last()
        val replacement = if (lastChar == 'A') 'B' else 'A'
        val tamperedToken = validRefreshToken.dropLast(1) + replacement

        val response = postJson("/api/auth/refresh", mapOf("refreshToken" to tamperedToken))

        assertEquals(HttpStatus.UNAUTHORIZED, response.statusCode)
    }

    // Test 12: refresh 엔드포인트에 빈 문자열 refreshToken을 보내면 400이다(V5 입력 검증).
    @Test
    fun `refresh 엔드포인트에 빈 문자열을 보내면 400이다`() {
        val response = postJson("/api/auth/refresh", mapOf("refreshToken" to ""))

        assertEquals(HttpStatus.BAD_REQUEST, response.statusCode)
    }

    // Test 13: POST /api/auth/kakao/login은 Authorization 헤더 없이 호출됐는데도 401이
    // 아니다(permitAll 확인). Test 1이 이미 Authorization 헤더 없이 postJson으로 호출하고
    // 200을 받으므로 그 사실 자체가 이 계약을 증명한다 — 별도 단언을 추가하지 않는다.
    @Test
    fun `api auth kakao login은 permitAll이라 헤더 없이도 401로 막히지 않는다(Test 1 참고)`() {
        // Test 1이 이미 Authorization 헤더를 전혀 세팅하지 않고 200을 받는 것으로 증명됨.
        // 여기서는 잘못된 자격증명(빈 토큰)에도 401이 아니라 400이 나옴을 한 번 더 확인해
        // "인증 게이트가 아니라 검증 게이트"라는 점을 명시한다.
        val response = postJson("/api/auth/kakao/login", mapOf("kakaoAccessToken" to ""))

        assertEquals(HttpStatus.BAD_REQUEST, response.statusCode)
    }
}
