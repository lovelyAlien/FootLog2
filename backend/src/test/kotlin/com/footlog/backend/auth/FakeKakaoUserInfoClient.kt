package com.footlog.backend.auth

import org.springframework.boot.test.context.TestConfiguration
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Primary

// 손수 작성한 인메모리 테스트 더블(src/notifications/testing/fakeNotifications.ts와 동일
// 규약) — 이 저장소는 목킹 프레임워크 대신 좁힌 의존성 계약(KakaoUserInfoClient
// 인터페이스) + 더블을 쓴다. Mockito 좌표가 테스트 클래스패스에 있는지 여부에 의존하지
// 않아 실행이 결정적이다.
//
// 실제 구현(KakaoUserInfoRestClient)과 다르게 동작하는 지점(nodeSqliteAdapter.ts /
// fakeNotifications.ts 규율과 동일하게 명시):
// 1. 이 더블은 네트워크 지연/타임아웃/재시도를 재현하지 않는다.
// 2. 이 더블은 카카오의 실제 에러 응답 형태(4xx/5xx 본문)를 재현하지 않는다 — 그건
//    KakaoUserInfoRestClientTest가 MockRestServiceServer로 별도 검증한다.
class FakeKakaoUserInfoClient : KakaoUserInfoClient {

    var nextResponse: KakaoUserInfoResponse? = null
    var nextError: RuntimeException? = null

    // 관측용 — 백엔드가 클라이언트가 준 카카오 토큰을 그대로 사용자정보 조회에만 쓰는지
    // (D-14) 테스트가 확인할 수 있게 한다.
    var lastToken: String? = null
    var callCount: Int = 0

    override fun fetchUserInfo(kakaoAccessToken: String): KakaoUserInfoResponse {
        callCount += 1
        lastToken = kakaoAccessToken

        nextError?.let { throw it }

        return nextResponse
            ?: throw IllegalStateException(
                "FakeKakaoUserInfoClient.nextResponse(또는 nextError)가 설정되지 않았음 " +
                    "— 테스트가 스텁 설정을 빠뜨렸다",
            )
    }
}

// KakaoUserInfoRestClient가 이미 @Component로 등록돼 있어 같은 타입 빈이 두 개가 되므로,
// 테스트 컨텍스트에서 이 더블을 대신 주입하려면 @Primary가 필요하다. 10-05의
// AuthControllerTest가 이 @TestConfiguration을 그대로 @Import해서 재사용한다.
@TestConfiguration
class FakeKakaoUserInfoClientConfiguration {
    @Bean
    @Primary
    fun fakeKakaoUserInfoClient(): FakeKakaoUserInfoClient = FakeKakaoUserInfoClient()
}
