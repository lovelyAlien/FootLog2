package com.footlog.backend.auth

import jakarta.validation.constraints.NotBlank

// POST /api/auth/refresh 요청 본문. `@field:` 사이트 타깃 이유는 KakaoLoginRequest.kt
// 헤더 주석과 동일(T-10-23).
data class RefreshTokenRequest(
    @field:NotBlank
    val refreshToken: String,
)
