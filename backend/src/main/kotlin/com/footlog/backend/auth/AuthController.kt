package com.footlog.backend.auth

import jakarta.validation.Valid
import org.springframework.beans.factory.annotation.Qualifier
import org.springframework.security.oauth2.jwt.JwtDecoder
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

// 10-04까지 만든 서비스 계층에 HTTP 표면을 얹는 이 저장소 최초의 컨트롤러(REQ-auth-kakao-oauth,
// REQ-auth-session-token). 두 경로 모두 SecurityConfig의 permitAll 목록에 포함된
// "/api/auth/**" 패턴 안에 들어온다.
@RestController
@RequestMapping("/api/auth")
class AuthController(
    private val kakaoAuthService: KakaoAuthService,
    private val jwtIssuerService: JwtIssuerService,
    // refresh 전용 디코더를 반드시 한정자로 지정해 받는다 — 한정자 없이 JwtDecoder를
    // 주입받으면 oauth2ResourceServer가 자동 주입하는 Primary(access 전용) 디코더가
    // 들어와 모든 refresh 요청이 401이 된다(T-10-21).
    @Qualifier("refreshTokenDecoder") private val refreshTokenDecoder: JwtDecoder,
) {

    // 카카오 액세스 토큰 → 사용자정보 조회 → find-or-create → 자체 access/refresh JWT
    // 발급까지 전부 KakaoAuthService에 위임한다. KakaoAuthException은 잡지 않고 그대로
    // 전파해 AuthExceptionHandler가 401로 매핑한다. 요청 본문의 토큰 값을 로그로 남기지
    // 않는다.
    @PostMapping("/kakao/login")
    fun kakaoLogin(@Valid @RequestBody request: KakaoLoginRequest): TokenResponse =
        kakaoAuthService.loginWithKakao(request.kakaoAccessToken)

    // refresh 토큰을 refresh 전용 디코더로 검증한다. 검증 실패 시 디코더가 던지는
    // JwtException(하위 타입 포함)은 여기서 잡지 않고 그대로 전파해 AuthExceptionHandler가
    // 401로 매핑하게 한다. subject가 UUID로 파싱되지 않는 경우(IllegalArgumentException)도
    // 같은 핸들러가 401로 매핑한다.
    //
    // 아래 응답에서 refresh 토큰 자리를 비워두는 것이 회전 없음(A8)의 코드상 표현이다 —
    // 여기서 새 refresh 토큰을 함께 발급하도록 바꾸면 D-01의 stateless 원칙(서버가 마지막
    // 발급 토큰을 기억하지 않음)과 재사용 탐지 부재가 정면 충돌한다(T-10-25 후속 인계 참고).
    @PostMapping("/refresh")
    fun refresh(@Valid @RequestBody request: RefreshTokenRequest): TokenResponse {
        val jwt = refreshTokenDecoder.decode(request.refreshToken)
        val userId = UUID.fromString(jwt.subject)
        return TokenResponse(
            accessToken = jwtIssuerService.issueAccessToken(userId),
            refreshToken = null,
            expiresIn = jwtIssuerService.accessTokenTtlSeconds,
        )
    }
}
