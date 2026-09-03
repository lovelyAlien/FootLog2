package com.footlog.backend.auth

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Test
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpMethod
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.test.web.client.MockRestServiceServer
import org.springframework.test.web.client.match.MockRestRequestMatchers.header
import org.springframework.test.web.client.match.MockRestRequestMatchers.method
import org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo
import org.springframework.test.web.client.response.MockRestResponseCreators.withStatus
import org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess
import org.springframework.web.client.RestClient

// 10-04-PLAN.md Task 2 — KakaoUserInfoRestClient의 HTTP 계약 5개를 고정하는 순수 JUnit
// 테스트. @SpringBootTest를 붙이지 않는다 — 컨테이너 기동 시간을 낭비할 이유가 없다.
// MockRestServiceServer를 RestClient.builder()에 수동 바인딩한다 — 관련 자동설정
// 애노테이션은 Boot 4에서 패키지 경로가 불확실하므로 쓰지 않는다. 수동 바인딩은 결정적이다.
class KakaoUserInfoRestClientTest {

    private fun buildClient(): Pair<KakaoUserInfoRestClient, MockRestServiceServer> {
        val builder = RestClient.builder()
        val server = MockRestServiceServer.bindTo(builder).build()
        val client = KakaoUserInfoRestClient(builder)
        return client to server
    }

    // Test A: fetchUserInfo가 https://kapi.kakao.com/v2/user/me로 GET 요청을 보내고
    // Authorization: Bearer abc 헤더를 포함한다.
    @Test
    fun `fetchUserInfo는 GET으로 v2 user me를 호출하고 Bearer 헤더를 포함한다`() {
        val (client, server) = buildClient()
        server.expect(requestTo("https://kapi.kakao.com/v2/user/me"))
            .andExpect(method(HttpMethod.GET))
            .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer abc"))
            .andRespond(withSuccess("""{"id": 1}""", MediaType.APPLICATION_JSON))

        client.fetchUserInfo("abc")

        server.verify()
    }

    // Test B: 카카오 실제 응답 형태의 JSON(최상위 id, 중첩 kakao_account.profile.nickname /
    // profile_image_url, 그리고 kakao_account.email을 일부러 포함)을 반환하면, DTO가 정상
    // 역직렬화되고 id/nickname/profileImageUrl이 매핑되며 미지 필드(email)가 역직렬화를
    // 깨뜨리지 않는다(D-05).
    @Test
    fun `email이 포함된 실제 형태 응답도 미지 필드로 무시되고 나머지가 정상 매핑된다`() {
        val (client, server) = buildClient()
        val json = """
            {
                "id": 123456789,
                "kakao_account": {
                    "email": "user@example.com",
                    "profile": {
                        "nickname": "테스터",
                        "profile_image_url": "https://k.kakaocdn.net/x.jpg"
                    }
                }
            }
        """.trimIndent()
        server.expect(requestTo("https://kapi.kakao.com/v2/user/me"))
            .andRespond(withSuccess(json, MediaType.APPLICATION_JSON))

        val result = client.fetchUserInfo("abc")

        assertEquals(123456789L, result.id)
        assertEquals("테스터", result.kakaoAccount?.profile?.nickname)
        assertEquals("https://k.kakaocdn.net/x.jpg", result.kakaoAccount?.profile?.profileImageUrl)
    }

    // Test C: kakao_account가 아예 없는 최소 JSON({"id": 1})도 정상 역직렬화되고
    // kakaoAccount가 null이다(D-07).
    @Test
    fun `kakao_account가 없는 최소 응답도 정상 역직렬화되고 kakaoAccount는 null이다`() {
        val (client, server) = buildClient()
        server.expect(requestTo("https://kapi.kakao.com/v2/user/me"))
            .andRespond(withSuccess("""{"id": 1}""", MediaType.APPLICATION_JSON))

        val result = client.fetchUserInfo("abc")

        assertEquals(1L, result.id)
        assertNull(result.kakaoAccount)
    }

    // Test D: 카카오가 401을 반환하면 KakaoAuthException이 던져진다(RestClient 기본 예외가
    // 그대로 새어 나오지 않음).
    @Test
    fun `카카오가 401을 반환하면 KakaoAuthException이 던져진다`() {
        val (client, server) = buildClient()
        server.expect(requestTo("https://kapi.kakao.com/v2/user/me"))
            .andRespond(withStatus(HttpStatus.UNAUTHORIZED).body("""{"msg": "invalid token"}"""))

        assertThrows(KakaoAuthException::class.java) {
            client.fetchUserInfo("abc")
        }
    }

    // Test E: 던져진 KakaoAuthException의 message에 요청에 쓴 액세스 토큰 문자열이
    // 포함되지 않는다(T-10-16 — 로그 유출 차단).
    @Test
    fun `KakaoAuthException의 message에 액세스 토큰 문자열이 포함되지 않는다`() {
        val (client, server) = buildClient()
        val secretToken = "super-secret-kakao-access-token"
        server.expect(requestTo("https://kapi.kakao.com/v2/user/me"))
            .andRespond(withStatus(HttpStatus.UNAUTHORIZED).body("""{"msg": "invalid token"}"""))

        val exception = assertThrows(KakaoAuthException::class.java) {
            client.fetchUserInfo(secretToken)
        }

        assertFalse(exception.message?.contains(secretToken) ?: false)
    }
}
