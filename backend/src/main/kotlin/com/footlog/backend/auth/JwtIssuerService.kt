package com.footlog.backend.auth

import com.footlog.backend.config.JwtProperties
import org.springframework.security.oauth2.jwt.JwtClaimsSet
import org.springframework.security.oauth2.jwt.JwtEncoder
import org.springframework.security.oauth2.jwt.JwtEncoderParameters
import org.springframework.stereotype.Service
import java.time.Duration
import java.time.Instant
import java.util.UUID

// A8(10-RESEARCH.md Assumptions Log) — 이 서비스는 refresh 토큰을 회전(rotation)하지
// 않고(재사용 가능한 단일 refresh JWT를 TTL 동안 유지) 서버측 폐기(revocation) 목록도
// 두지 않는다(D-01의 "Redis/세션 스토어 없이" 원칙을 리프레시 토큰에도 그대로 적용).
// 유출된 refresh 토큰은 만료(30일)까지 무효화할 방법이 없다 — 로그아웃/연결끊기 자체가
// 이번 phase 스코프 밖이므로 후속 phase의 threat register가 이 한계를 인계받아야 한다.
@Service
class JwtIssuerService(
    private val jwtEncoder: JwtEncoder,
    private val jwtProperties: JwtProperties,
) {
    // D-02(access+refresh 이중 토큰) — access 토큰은 token_use=access, TTL은 설정에서
    // 주입받은 accessTokenTtl(application.yml의 jwt.access-token-ttl, D-03).
    fun issueAccessToken(userId: UUID): String = issue(userId, "access", jwtProperties.accessTokenTtl)

    // refresh 토큰은 token_use=refresh, TTL은 refreshTokenTtl(D-03).
    fun issueRefreshToken(userId: UUID): String = issue(userId, "refresh", jwtProperties.refreshTokenTtl)

    // 10-05의 TokenResponse.expiresIn이 이 값을 쓴다 — 설정과 응답이 어긋날 수 없다.
    val accessTokenTtlSeconds: Long
        get() = jwtProperties.accessTokenTtl.seconds

    private fun issue(userId: UUID, tokenUse: String, ttl: Duration): String {
        // now를 한 번만 구해 issuedAt/expiresAt 양쪽에 쓴다 — 따로 두 번 부르면 TTL 단언이
        // 간헐적으로 1초 어긋난다.
        val now = Instant.now()
        val claims = JwtClaimsSet.builder()
            .issuer(jwtProperties.issuer)
            // subject는 내부 UUID다. 카카오 회원번호를 subject에 넣지 않는다 — 외부
            // 시스템의 식별자를 세션 주체로 쓰면 카카오 쪽 변경이 곧바로 인증 주체 변경이
            // 된다.
            .subject(userId.toString())
            .issuedAt(now)
            .expiresAt(now.plus(ttl))
            .claim("token_use", tokenUse)
            .build()
        return jwtEncoder.encode(JwtEncoderParameters.from(claims)).tokenValue
    }
}
