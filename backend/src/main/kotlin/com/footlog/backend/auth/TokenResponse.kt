package com.footlog.backend.auth

// 로그인(/api/auth/kakao/login)과 리프레시(/api/auth/refresh) 두 엔드포인트가 공유하는
// 응답 DTO(10-05가 소비).
//
// expiresIn은 access 토큰의 남은 수명(초)이며 JwtIssuerService.accessTokenTtlSeconds에서
// 온다 — 리터럴 상수로 하드코딩하지 않는다(설정과 응답이 어긋날 수 없게 하기 위함).
//
// refreshToken이 nullable인 이유: 리프레시 응답에서는 refresh 토큰을 재발급(회전)하지
// 않기 때문이다(A8 — 회전 없음, JwtIssuerService.kt 파일 헤더 주석과 동일한 트레이드오프).
data class TokenResponse(
    val accessToken: String,
    val refreshToken: String?,
    val expiresIn: Long,
)
