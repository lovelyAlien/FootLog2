package com.footlog.backend.auth

import com.fasterxml.jackson.annotation.JsonIgnoreProperties
import com.fasterxml.jackson.annotation.JsonProperty

// 카카오 GET /v2/user/me 응답(10-RESEARCH.md Pattern 2, 공식 REST API 문서 인용) 매핑.
//
// id는 반드시 Long이다 — Int로 받으면 회원번호가 큰 계정에서 값이 음수로 뒤집혀 다른
// 사용자로 오매핑되는 실제 사고 사례가 보고됐다(10-RESEARCH.md Pitfall 3).
//
// kakaoAccount/profile은 둘 다 nullable이다 — 닉네임/프로필사진 동의를 하지 않은
// 사용자는 이 객체 자체가 응답에서 통째로 빠질 수 있다(D-07, 미동의자도 로그인 허용).
//
// 이메일(kakao_account.email) 필드는 여기에 선언하지 않는다. 카카오가 응답에 이메일을
// 담아 보내더라도 이 DTO가 파싱하지 않으므로 저장 경로 자체가 존재하지 않는다(D-05).
// 절대 이메일 필드를 여기에 추가하지 말 것.
@JsonIgnoreProperties(ignoreUnknown = true)
data class KakaoUserInfoResponse(
    val id: Long,
    @JsonProperty("kakao_account") val kakaoAccount: KakaoAccount?,
) {
    @JsonIgnoreProperties(ignoreUnknown = true)
    data class KakaoAccount(
        val profile: Profile?,
    ) {
        @JsonIgnoreProperties(ignoreUnknown = true)
        data class Profile(
            val nickname: String?,
            @JsonProperty("profile_image_url") val profileImageUrl: String?,
        )
    }
}
