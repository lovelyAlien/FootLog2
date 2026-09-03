package com.footlog.backend.auth

import com.footlog.backend.TestcontainersConfiguration
import com.footlog.backend.user.UserRepository
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNotEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.beans.factory.annotation.Qualifier
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.context.annotation.Import
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.security.oauth2.jwt.JwtDecoder
import org.springframework.transaction.annotation.Transactional

// 10-04-PLAN.md Task 2 — 카카오 로그인 서버 본체(find-or-create + 자체 JWT 발급)의 12개
// 계약을 고정하는 RED 테스트. FakeKakaoUserInfoClient로 실제 카카오 API 호출 없이 로그인
// 경로 전체를 돈다(TestcontainersConfiguration으로 실제 Postgres 사용).
@Import(TestcontainersConfiguration::class, FakeKakaoUserInfoClientConfiguration::class)
@SpringBootTest
@Transactional
class KakaoAuthServiceTest {

    @Autowired
    lateinit var kakaoAuthService: KakaoAuthService

    @Autowired
    lateinit var userRepository: UserRepository

    @Autowired
    lateinit var fakeKakaoUserInfoClient: FakeKakaoUserInfoClient

    @Autowired
    lateinit var jwtIssuerService: JwtIssuerService

    // @Primary 지정 — access 전용 디코더.
    @Autowired
    lateinit var jwtDecoder: JwtDecoder

    @Autowired
    @Qualifier("refreshTokenDecoder")
    lateinit var refreshTokenDecoder: JwtDecoder

    @Autowired
    lateinit var jdbcTemplate: JdbcTemplate

    // FakeKakaoUserInfoClient는 싱글턴 빈이라 테스트 간 상태가 새어나갈 수 있다 —
    // @Transactional 롤백은 DB에만 적용되므로 더블의 필드는 매 테스트 시작 전 직접 초기화한다.
    @BeforeEach
    fun resetFake() {
        fakeKakaoUserInfoClient.nextResponse = null
        fakeKakaoUserInfoClient.nextError = null
        fakeKakaoUserInfoClient.lastToken = null
        fakeKakaoUserInfoClient.callCount = 0
    }

    private fun profileResponse(kakaoId: Long, nickname: String?, profileImageUrl: String?): KakaoUserInfoResponse =
        KakaoUserInfoResponse(
            id = kakaoId,
            kakaoAccount = KakaoUserInfoResponse.KakaoAccount(
                profile = KakaoUserInfoResponse.KakaoAccount.Profile(
                    nickname = nickname,
                    profileImageUrl = profileImageUrl,
                ),
            ),
        )

    // Test 1: 처음 보는 kakaoId로 로그인하면 findByKakaoId가 새 로우를 반환하고
    // nickname/profileImageUrl이 응답값과 같으며, user.id가 kakaoId와 다른 UUID다
    // (카카오 회원번호가 PK로 승격되지 않음 — T-10-17).
    @Test
    fun `처음 보는 kakaoId로 로그인하면 새 User가 생성되고 id는 kakaoId가 아닌 UUID다`() {
        val kakaoId = 1234567890L
        fakeKakaoUserInfoClient.nextResponse = profileResponse(kakaoId, "테스터1", "https://k.kakaocdn.net/1.jpg")

        kakaoAuthService.loginWithKakao("t")

        val found = userRepository.findByKakaoId(kakaoId)
        assertNotNull(found, "새 User가 생성돼 findByKakaoId로 조회돼야 한다")
        assertEquals("테스터1", found!!.nickname)
        assertEquals("https://k.kakaocdn.net/1.jpg", found.profileImageUrl)
        assertNotEquals(kakaoId.toString(), found.id.toString())
    }

    // Test 2: 같은 kakaoId로 두 번 로그인하면 count 증가분이 정확히 1이다(find-or-create, D-08).
    @Test
    fun `같은 kakaoId로 두 번 로그인하면 count 증가분이 정확히 1이다`() {
        val kakaoId = 2222222222L
        fakeKakaoUserInfoClient.nextResponse = profileResponse(kakaoId, "테스터2", "https://k.kakaocdn.net/2.jpg")
        val before = userRepository.count()

        kakaoAuthService.loginWithKakao("t1")
        kakaoAuthService.loginWithKakao("t2")

        val after = userRepository.count()
        assertEquals(1, after - before, "같은 kakaoId로 두 번 로그인해도 계정은 1건만 늘어야 한다")
    }

    // Test 3: 두 번째 로그인 응답의 nickname/profileImageUrl이 첫 번째와 다르면 저장된
    // 로우가 최신값으로 갱신된다(D-06).
    @Test
    fun `두 번째 로그인의 nickname profileImageUrl이 다르면 최신값으로 갱신된다`() {
        val kakaoId = 3333333333L
        fakeKakaoUserInfoClient.nextResponse = profileResponse(kakaoId, "이전닉네임", "https://k.kakaocdn.net/old.jpg")
        kakaoAuthService.loginWithKakao("t1")

        fakeKakaoUserInfoClient.nextResponse = profileResponse(kakaoId, "새닉네임", "https://k.kakaocdn.net/new.jpg")
        kakaoAuthService.loginWithKakao("t2")

        val found = userRepository.findByKakaoId(kakaoId)
        assertEquals("새닉네임", found!!.nickname)
        assertEquals("https://k.kakaocdn.net/new.jpg", found.profileImageUrl)
    }

    // Test 4: kakaoAccount가 null인 응답(프로필 미동의)으로도 로그인이 성공하고, 저장된
    // nickname/profileImageUrl이 null이다(D-07).
    @Test
    fun `kakaoAccount가 null인 응답으로도 로그인이 성공하고 nickname profileImageUrl은 null이다`() {
        val kakaoId = 4444444444L
        fakeKakaoUserInfoClient.nextResponse = KakaoUserInfoResponse(id = kakaoId, kakaoAccount = null)

        kakaoAuthService.loginWithKakao("t")

        val found = userRepository.findByKakaoId(kakaoId)
        assertNotNull(found)
        assertNull(found!!.nickname)
        assertNull(found.profileImageUrl)
    }

    // Test 5: kakaoAccount.profile이 null인 응답으로도 로그인이 성공한다(D-07 — 중첩 null 경로).
    @Test
    fun `kakaoAccount profile이 null인 응답으로도 로그인이 성공한다`() {
        val kakaoId = 5555555555L
        fakeKakaoUserInfoClient.nextResponse = KakaoUserInfoResponse(
            id = kakaoId,
            kakaoAccount = KakaoUserInfoResponse.KakaoAccount(profile = null),
        )

        kakaoAuthService.loginWithKakao("t")

        val found = userRepository.findByKakaoId(kakaoId)
        assertNotNull(found)
        assertNull(found!!.nickname)
        assertNull(found.profileImageUrl)
    }

    // Test 6: Int 범위(4_294_967_296L)를 초과하는 회원번호로 로그인하면 그 값이 정확히
    // 저장/조회된다(Pitfall 3 회귀 게이트).
    @Test
    fun `Int 범위를 초과하는 kakaoId로 로그인하면 값이 정확히 저장 조회된다`() {
        val largeKakaoId = 4_294_967_296L
        fakeKakaoUserInfoClient.nextResponse = profileResponse(largeKakaoId, "빅유저", null)

        kakaoAuthService.loginWithKakao("t")

        val found = userRepository.findByKakaoId(largeKakaoId)
        assertNotNull(found)
        assertEquals(largeKakaoId, found!!.kakaoId)
    }

    // Test 7: FakeKakaoUserInfoClient.nextError를 KakaoAuthException으로 설정하면
    // loginWithKakao가 그 예외를 전파하고, count가 호출 전과 동일하다(카카오 인증 실패
    // 시 계정이 만들어지지 않음).
    @Test
    fun `카카오 인증 실패 시 예외가 전파되고 계정이 생성되지 않는다`() {
        fakeKakaoUserInfoClient.nextError = KakaoAuthException("카카오 사용자정보 조회 실패(status=401)")
        val before = userRepository.count()

        assertThrows(KakaoAuthException::class.java) {
            kakaoAuthService.loginWithKakao("bad-token")
        }

        assertEquals(before, userRepository.count())
    }

    // Test 8: 로그인 성공 시 반환된 TokenResponse.accessToken을 @Primary JwtDecoder로
    // 디코드하면 subject가 새로 생성된 user.id.toString()이고 token_use가 "access"다.
    @Test
    fun `발급된 accessToken의 subject는 새로 생성된 user id이고 token_use는 access다`() {
        val kakaoId = 8888888880L
        fakeKakaoUserInfoClient.nextResponse = profileResponse(kakaoId, "테스터8", null)

        val tokenResponse = kakaoAuthService.loginWithKakao("t")
        val user = userRepository.findByKakaoId(kakaoId)!!

        val jwt = jwtDecoder.decode(tokenResponse.accessToken)
        assertEquals(user.id.toString(), jwt.subject)
        assertEquals("access", jwt.getClaimAsString("token_use"))
    }

    // Test 9: 반환된 TokenResponse.refreshToken이 null이 아니고, refreshTokenDecoder로
    // 디코드하면 같은 subject를 갖는다.
    @Test
    fun `발급된 refreshToken은 null이 아니고 같은 subject를 갖는다`() {
        val kakaoId = 9999999990L
        fakeKakaoUserInfoClient.nextResponse = profileResponse(kakaoId, "테스터9", null)

        val tokenResponse = kakaoAuthService.loginWithKakao("t")
        val user = userRepository.findByKakaoId(kakaoId)!!

        assertNotNull(tokenResponse.refreshToken)
        val jwt = refreshTokenDecoder.decode(tokenResponse.refreshToken!!)
        assertEquals(user.id.toString(), jwt.subject)
    }

    // Test 10: TokenResponse.expiresIn이 jwtIssuerService.accessTokenTtlSeconds와 같다
    // (하드코딩이 아님).
    @Test
    fun `TokenResponse expiresIn은 accessTokenTtlSeconds와 같다`() {
        val kakaoId = 1010101010L
        fakeKakaoUserInfoClient.nextResponse = profileResponse(kakaoId, "테스터10", null)

        val tokenResponse = kakaoAuthService.loginWithKakao("t")

        assertEquals(jwtIssuerService.accessTokenTtlSeconds, tokenResponse.expiresIn)
    }

    // Test 11: FakeKakaoUserInfoClient.lastToken이 loginWithKakao에 넘긴 문자열과 같다 —
    // 백엔드가 클라이언트가 준 카카오 토큰을 그대로 사용자정보 조회에만 쓴다(D-14).
    @Test
    fun `백엔드는 클라이언트가 준 카카오 토큰을 그대로 사용자정보 조회에 사용한다`() {
        val kakaoId = 1111011110L
        fakeKakaoUserInfoClient.nextResponse = profileResponse(kakaoId, "테스터11", null)
        val suppliedToken = "kakao-access-token-do-not-persist"

        kakaoAuthService.loginWithKakao(suppliedToken)

        assertEquals(suppliedToken, fakeKakaoUserInfoClient.lastToken)
    }

    // Test 12: 로그인 후 users 테이블 어디에도 카카오 액세스 토큰 문자열이 저장되어 있지
    // 않다 — SELECT로 전 컬럼을 훑어 그 문자열이 등장하지 않음을 단언한다(D-14의 "토큰
    // 폐기"를 관측 가능한 형태로 고정).
    @Test
    fun `로그인 후 users 테이블 어디에도 카카오 액세스 토큰 문자열이 저장되지 않는다`() {
        val kakaoId = 1212121212L
        fakeKakaoUserInfoClient.nextResponse = profileResponse(kakaoId, "테스터12", "https://k.kakaocdn.net/12.jpg")
        val suppliedToken = "kakao-access-token-do-not-persist-12"

        kakaoAuthService.loginWithKakao(suppliedToken)

        val rows = jdbcTemplate.queryForList(
            "SELECT id::text AS id, kakao_id::text AS kakao_id, nickname, profile_image_url FROM users",
        )
        for (row in rows) {
            for (value in row.values) {
                assertFalse(
                    value?.toString()?.contains(suppliedToken) ?: false,
                    "users 테이블의 어떤 컬럼도 카카오 토큰 문자열을 담고 있으면 안 된다",
                )
            }
        }
        assertTrue(rows.isNotEmpty(), "이 테스트가 최소 방금 만든 로우를 포함해야 한다")
    }
}
