package com.footlog.backend.auth

import com.footlog.backend.user.UserRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

// 10-04-PLAN.md Task 2 — 골격만 존재하는 상태(RED 확인용). Task 3에서 실제 구현으로 채운다.
@Service
class KakaoAuthService(
    private val kakaoUserInfoClient: KakaoUserInfoClient,
    private val userRepository: UserRepository,
    private val jwtIssuerService: JwtIssuerService,
) {
    @Transactional
    fun loginWithKakao(kakaoAccessToken: String): TokenResponse {
        TODO()
    }
}
