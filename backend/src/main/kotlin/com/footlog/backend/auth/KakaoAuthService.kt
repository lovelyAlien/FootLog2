package com.footlog.backend.auth

import com.footlog.backend.user.User
import com.footlog.backend.user.UserRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.OffsetDateTime
import java.util.UUID

// 카카오 로그인의 서버측 본체(REQ-auth-kakao-oauth) — 외부 시스템(카카오)의 신원 주장을
// 내부 사용자 계정으로 번역하는 유일한 지점이다.
//
// D-14 수정 반영: 이 서비스는 카카오 토큰 **교환**을 하지 않는다. 클라이언트가 이미 받은
// 액세스 토큰을 사용자정보 조회 1회에만 쓰고 폐기한다. 카카오 인증 서버의 토큰 발급
// 엔드포인트를 호출하는 코드를 나중에 여기 추가하지 말 것 — 필요해지면 D-14를 다시
// 논의해야 한다.
//
// 동시성: 같은 카카오 계정으로 두 요청이 동시에 들어오면 아래 5단계에서 둘 다 "없음"으로
// 판단해 두 번 insert를 시도할 수 있다. 그때 uq_users_kakao_id(10-02)가 두 번째를
// 거부하므로 중복 계정은 생기지 않는다(D-08). 1인 프로젝트 규모에서 그 경합의 재시도
// 처리는 하지 않고, 두 번째 요청은 예외로 실패하는 것을 허용한다 — 사용자가 다시
// 로그인하면 성공한다.
@Service
class KakaoAuthService(
    private val kakaoUserInfoClient: KakaoUserInfoClient,
    private val userRepository: UserRepository,
    private val jwtIssuerService: JwtIssuerService,
) {
    @Transactional
    fun loginWithKakao(kakaoAccessToken: String): TokenResponse {
        // 예외는 잡지 않고 그대로 전파한다(10-05가 401로 매핑). 이 지점 이후
        // kakaoAccessToken 변수를 다시 쓰지 않는다 — 저장하지도, 로그로 남기지도, 다른
        // 객체에 넘기지도 않는다(D-14).
        val info = kakaoUserInfoClient.fetchUserInfo(kakaoAccessToken)

        // 두 단계 모두 안전 호출이다 — 프로필 미동의 사용자도 로그인이 성공해야 한다(D-07).
        val profile = info.kakaoAccount?.profile

        val existing = userRepository.findByKakaoId(info.id)
        val user = if (existing != null) {
            // 카카오 최신값이 진실의 원천이다(D-06) — 기존 값이 있고 새 값이 null일 때
            // 기존 값을 유지하지 않는다. 사용자가 카카오에서 프로필을 지운 상태를 그대로
            // 반영하는 것이 D-06의 취지다.
            existing.nickname = profile?.nickname
            existing.profileImageUrl = profile?.profileImageUrl
            userRepository.save(existing)
        } else {
            // users.id는 서버 소유 UUID이고 kakao_id는 별도 외부 식별자다 — info.id(카카오
            // 회원번호)를 User.id에 넣지 않는다(T-10-17, "Client-owned vs server-owned ID
            // distinction").
            val newUser = User(
                id = UUID.randomUUID(),
                createdAt = OffsetDateTime.now(),
                kakaoId = info.id,
                nickname = profile?.nickname,
                profileImageUrl = profile?.profileImageUrl,
            )
            userRepository.save(newUser)
        }

        return TokenResponse(
            accessToken = jwtIssuerService.issueAccessToken(user.id),
            refreshToken = jwtIssuerService.issueRefreshToken(user.id),
            expiresIn = jwtIssuerService.accessTokenTtlSeconds,
        )
    }
}
