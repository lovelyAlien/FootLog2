package com.footlog.backend.auth

// 카카오 사용자정보 조회(KakaoUserInfoClient.fetchUserInfo)가 실패했을 때 던지는 단일
// 예외 타입. 10-05(AuthController)가 이 예외 하나만 보고 401로 매핑한다 — RestClient가
// 던지는 여러 하위 예외 타입을 컨트롤러가 개별적으로 알 필요가 없게 하기 위한 경계다.
//
// message에는 절대 카카오 액세스 토큰 값이나 카카오 원문 응답 본문을 담지 않는다
// (T-10-16 — 로그로 새어 나가는 경로를 차단).
class KakaoAuthException(
    message: String,
    cause: Throwable? = null,
) : RuntimeException(message, cause)
