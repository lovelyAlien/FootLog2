package com.footlog.backend.auth

import jakarta.validation.constraints.NotBlank

// POST /api/auth/kakao/login 요청 본문. 필드는 이것 하나뿐이다 — 인가 코드 교환에 쓰이는
// 나머지 OAuth2/PKCE 파라미터는 이 DTO에 없다(D-14 수정, 10-PATTERNS.md CRITICAL 절).
// 클라이언트가 카카오 네이티브 SDK로부터 이미 받은 액세스 토큰을 그대로 전달한다.
//
// Kotlin에서 `@NotBlank`만 쓰면(사이트 타깃 생략) 애노테이션이 생성자 파라미터에만 붙어
// Bean Validation이 조용히 무시할 수 있다 — 이 저장소 최초 사용례이므로 반드시
// `@field:` 사이트 타깃을 명시한다(T-10-23).
data class KakaoLoginRequest(
    @field:NotBlank
    val kakaoAccessToken: String,
)
