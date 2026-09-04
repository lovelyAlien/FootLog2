package com.footlog.backend.auth

import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatusCode
import org.springframework.stereotype.Component
import org.springframework.web.client.RestClient

// 카카오 사용자정보 조회를 인터페이스로 분리하는 이유: 이 저장소는 목킹 프레임워크 대신
// "좁힌 의존성 계약 + 손수 작성한 인메모리 더블"을 쓴다(src/notifications/deps.ts +
// src/notifications/testing/fakeNotifications.ts와 동일 원칙). 테스트가 Mockito 없이
// FakeKakaoUserInfoClient를 이 인터페이스 자리에 주입할 수 있게 하기 위함이다.
interface KakaoUserInfoClient {
    fun fetchUserInfo(kakaoAccessToken: String): KakaoUserInfoResponse
}

// 카카오 사용자정보 조회 엔드포인트 URL을 상수로 하드코딩해도 되는 이유: 카카오
// 엔드포인트는 안정적인 공식 REST API이며(10-RESEARCH.md Don't Hand-Roll 마지막 행), 이
// 프로젝트가 다중 환경/화이트라벨을 지원할 계획이 없어 설정으로 뽑아낼 이유가 없다.
@Component
class KakaoUserInfoRestClient(
    restClientBuilder: RestClient.Builder,
) : KakaoUserInfoClient {

    // 빌더의 build() 호출로 만든다 — 정적 팩토리로 직접 생성하지 않는 이유: 그러면
    // Boot의 자동설정 커스터마이저(로깅/인터셉터 등)를 우회하게 되고, MockRestServiceServer
    // 바인딩도 불가능해진다(10-RESEARCH.md/10-PLAN.md Pitfall 5).
    private val restClient: RestClient = restClientBuilder.build()

    override fun fetchUserInfo(kakaoAccessToken: String): KakaoUserInfoResponse {
        return restClient.get()
            .uri("https://kapi.kakao.com/v2/user/me")
            .header(HttpHeaders.AUTHORIZATION, "Bearer $kakaoAccessToken")
            .retrieve()
            // 카카오가 4xx/5xx를 반환하면 RestClient의 기본 예외 계열
            // (RestClientResponseException)이 그대로 새어 나오지 않도록 여기서 잡아
            // KakaoAuthException 하나로 변환한다 — 10-05가 이 예외 하나만 보고 401을
            // 반환할 수 있게 하기 위해서다. 메시지에 kakaoAccessToken 값은 절대 포함하지
            // 않는다(로그로 새어 나감, T-10-16).
            .onStatus(HttpStatusCode::isError) { _, response ->
                throw KakaoAuthException("카카오 사용자정보 조회 실패(status=${response.statusCode.value()})")
            }
            .body(KakaoUserInfoResponse::class.java)
            ?: throw KakaoAuthException("카카오 사용자정보 응답이 비어있음")
    }
}
