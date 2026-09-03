package com.footlog.backend.auth

import com.footlog.backend.config.JwtProperties
import org.springframework.security.oauth2.jwt.JwtEncoder
import org.springframework.stereotype.Service
import java.util.UUID

// 골격만 있는 상태(Task 2, RED) — 본문은 Task 3(GREEN)에서 채운다.
@Service
class JwtIssuerService(
    private val jwtEncoder: JwtEncoder,
    private val jwtProperties: JwtProperties,
) {
    fun issueAccessToken(userId: UUID): String = TODO()

    fun issueRefreshToken(userId: UUID): String = TODO()

    val accessTokenTtlSeconds: Long
        get() = TODO()
}
