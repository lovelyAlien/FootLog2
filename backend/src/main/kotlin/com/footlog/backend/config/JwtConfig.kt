package com.footlog.backend.config

import org.springframework.boot.context.properties.ConfigurationProperties
import org.springframework.boot.context.properties.EnableConfigurationProperties
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.context.annotation.Primary
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator
import org.springframework.security.oauth2.core.OAuth2Error
import org.springframework.security.oauth2.core.OAuth2TokenValidator
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult
import org.springframework.security.oauth2.jose.jws.MacAlgorithm
import org.springframework.security.oauth2.jwt.Jwt
import org.springframework.security.oauth2.jwt.JwtDecoder
import org.springframework.security.oauth2.jwt.JwtEncoder
import org.springframework.security.oauth2.jwt.JwtValidators
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder
import java.time.Duration
import javax.crypto.spec.SecretKeySpec

// jwt.* 프로퍼티(issuer/secret/access-token-ttl/refresh-token-ttl) 바인딩(10-RESEARCH.md
// Open Questions #3 절충안). BackendApplication에 @ConfigurationPropertiesScan이 없으므로
// @EnableConfigurationProperties로 이 config 클래스가 명시적으로 등록한다.
@ConfigurationProperties("jwt")
data class JwtProperties(
    val issuer: String,
    val secret: String,
    val accessTokenTtl: Duration,
    val refreshTokenTtl: Duration,
)

// Spring Security 7 + NimbusJwtEncoder/Decoder로 자체 access/refresh JWT를 HS256으로
// 발급·검증하는 빈 정의(10-RESEARCH.md Pattern 4). D-01(stateless, 세션 스토어 없음) /
// D-02(access+refresh 이중 토큰)를 코드로 고정한다.
@Configuration
@EnableConfigurationProperties(JwtProperties::class)
class JwtConfig(private val jwtProperties: JwtProperties) {

    // HS256은 최소 256비트(32바이트) 키를 요구한다 — 짧은 시크릿을 넣으면 Nimbus가 기동
    // 시점에 "signing key's size is X bits which is not secure enough" 예외를 던진다
    // (10-RESEARCH.md Pitfall 2). application.yml의 기본값 문자열이 32바이트 이상인 것도
    // 같은 이유다.
    private val secretKey: SecretKeySpec
        get() = SecretKeySpec(jwtProperties.secret.toByteArray(), "HmacSHA256")

    // NimbusJwtEncoder(JWKSource) 공개 생성자를 직접 쓰면 defaultJwsHeader가 RS256으로
    // 고정돼(Nimbus 내부 상수), HS256 전용 키만 있는 JWKSet에서 서명 키를 못 찾아 매 호출이
    // "Failed to select a JWK signing key"로 실패한다(실행 중 실제로 재현해 발견, RESEARCH.md
    // Pattern 4 코드 스니펫을 그대로 옮기면 걸리는 함정 — Rule 1 버그 수정). withSecretKey
    // 빌더를 쓰면 내부적으로 JWK의 실제 알고리즘(HS256)을 기본 헤더에 반영한다.
    @Bean
    fun jwtEncoder(): JwtEncoder = NimbusJwtEncoder.withSecretKey(secretKey).algorithm(MacAlgorithm.HS256).build()

    // Primary 지정이 필요한 이유: JwtDecoder 타입 빈이 이 파일에 2개(access용/refresh용)
    // 존재하는데, oauth2ResourceServer 자동설정은 JwtDecoder 빈을 정확히 1개만 기대한다.
    // Primary 지정이 없으면 필터 체인 자동설정이 모호성 오류로 기동 실패한다. token_use
    // 구분 클레임이 없으면 탈취된 refresh 토큰으로 보호된 API를 직접 호출할 수 있게 된다
    // (T-10-09) — 이 디코더가 그걸 막는다.
    @Bean
    @Primary
    fun jwtDecoder(): JwtDecoder {
        val decoder = NimbusJwtDecoder.withSecretKey(secretKey).macAlgorithm(MacAlgorithm.HS256).build()
        decoder.setJwtValidator(
            DelegatingOAuth2TokenValidator(
                JwtValidators.createDefault(),
                tokenUseValidator("access"),
            ),
        )
        return decoder
    }

    // 10-05의 POST /api/auth/refresh 전용 디코더 — refresh 토큰만 통과시킨다. access 전용
    // 디코더(Primary 지정 빈)를 재사용할 수 없는 이유: 그 디코더는 token_use=access만
    // 허용하므로 refresh 토큰을 넣으면 항상 실패한다.
    @Bean
    fun refreshTokenDecoder(): JwtDecoder {
        val decoder = NimbusJwtDecoder.withSecretKey(secretKey).macAlgorithm(MacAlgorithm.HS256).build()
        decoder.setJwtValidator(
            DelegatingOAuth2TokenValidator(
                JwtValidators.createDefault(),
                tokenUseValidator("refresh"),
            ),
        )
        return decoder
    }

    // 두 디코더의 검증기 중복을 줄이는 헬퍼. 실패 시 OAuth2TokenValidatorResult.failure로
    // "invalid_token" 에러를 반환해 Security의 표준 401 변환 경로를 그대로 탄다.
    private fun tokenUseValidator(expected: String): OAuth2TokenValidator<Jwt> =
        OAuth2TokenValidator { jwt ->
            if (jwt.getClaimAsString("token_use") == expected) {
                OAuth2TokenValidatorResult.success()
            } else {
                OAuth2TokenValidatorResult.failure(
                    OAuth2Error("invalid_token", "token_use가 \"$expected\"가 아님", null),
                )
            }
        }
}
