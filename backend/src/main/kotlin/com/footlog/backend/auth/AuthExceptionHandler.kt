package com.footlog.backend.auth

import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.security.oauth2.jwt.JwtException
import org.springframework.web.bind.MethodArgumentNotValidException
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestControllerAdvice

// AuthController가 던지는 예외를 HTTP 상태로 매핑하는 어드바이스.
// 아래 애노테이션 인자로 범위를 AuthController 하나로 한정한다 — 전역(인자 없는
// @RestControllerAdvice)으로 만들면 이후 phase에서 추가되는 다른 컨트롤러의 예외까지 이
// 핸들러가 401/400으로 삼켜버린다.
//
// **어떤 핸들러도 예외의 메시지나 원인을 응답 본문에 넣지 않는다(T-10-24).** 상수 코드
// 문자열만 반환한다 — 이 규칙은 이 파일의 모든 핸들러에 예외 없이 적용된다.
@RestControllerAdvice(assignableTypes = [AuthController::class])
class AuthExceptionHandler {

    private val logger = LoggerFactory.getLogger(AuthExceptionHandler::class.java)

    // 카카오가 액세스 토큰을 거부했거나 사용자정보 조회가 실패한 경우 → 401.
    @ExceptionHandler(KakaoAuthException::class)
    @ResponseStatus(HttpStatus.UNAUTHORIZED)
    fun handleKakaoAuthException(ex: KakaoAuthException): Map<String, String> {
        // 예외 타입과 요약만 남긴다 — 카카오 액세스 토큰 값이나 원문 응답은 로그에
        // 남기지 않는다(T-10-16과 동일한 제약).
        logger.warn("카카오 인증 실패: ${ex::class.simpleName}")
        return mapOf("error" to "kakao_authentication_failed")
    }

    // refresh 토큰 서명 불일치/만료/token_use 오용(JwtException 하위 타입 포함) 또는
    // subject가 UUID로 파싱되지 않는 경우(IllegalArgumentException) → 401.
    @ExceptionHandler(JwtException::class, IllegalArgumentException::class)
    @ResponseStatus(HttpStatus.UNAUTHORIZED)
    fun handleInvalidToken(ex: Exception): Map<String, String> {
        // 토큰 값 자체는 로그에 남기지 않는다 — 예외 타입만 남긴다.
        logger.warn("유효하지 않은 토큰: ${ex::class.simpleName}")
        return mapOf("error" to "invalid_token")
    }

    // @field:NotBlank 등 Bean Validation 검증 실패 → 400. Spring Boot의 기본
    // MethodArgumentNotValidException 처리도 400을 반환하지만 Problem Details 본문이
    // 필드 정보를 노출할 수 있어 명시적으로 매핑해 응답 형태를 고정한다.
    @ExceptionHandler(MethodArgumentNotValidException::class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    fun handleValidationFailure(ex: MethodArgumentNotValidException): Map<String, String> {
        logger.warn("요청 검증 실패: ${ex::class.simpleName}")
        return mapOf("error" to "invalid_request")
    }
}
