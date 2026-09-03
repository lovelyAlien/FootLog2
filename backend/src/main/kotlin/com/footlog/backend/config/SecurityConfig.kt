package com.footlog.backend.config

import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.security.config.Customizer
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity
import org.springframework.security.config.http.SessionCreationPolicy
import org.springframework.security.web.SecurityFilterChain

// Spring Security 7 Lambda DSL 필수(10-RESEARCH.md Pattern 5, Pitfall 1 — 구버전 체이닝
// 스타일 메서드가 완전히 제거돼 컴파일 자체가 안 된다). REQ-auth-session-token의 stateless
// JWT 필터 체인.
@Configuration
@EnableWebSecurity
class SecurityConfig {

    @Bean
    fun securityFilterChain(http: HttpSecurity): SecurityFilterChain {
        http
            // stateless JWT API이고 쿠키 기반 세션이 없다 — 브라우저가 자동 첨부하는
            // 자격증명이 존재하지 않으므로 CSRF 공격 벡터 자체가 성립하지 않는다
            // (10-RESEARCH.md Security Domain V3, T-10-13).
            .csrf { it.disable() }
            .sessionManagement { it.sessionCreationPolicy(SessionCreationPolicy.STATELESS) }
            .authorizeHttpRequests { auth ->
                auth
                    // /actuator/**를 permitAll로 두는 이유(중요): Phase 9의
                    // management.endpoints.web.exposure.include: health가 health 외
                    // 엔드포인트를 아예 매핑하지 않으므로(404) permitAll이어도 노출되는 정보가
                    // 없다. 여기를 authenticated로 바꾸면 HealthCheckSmokeTest/
                    // StagingProfileBootTest의 404 단언이 401로 바뀌어 "노출 목록이 유일한
                    // 제어"라는 T-9-02 회귀 게이트가 무력화된다(T-10-12).
                    //
                    // /error도 permitAll인 이유(실행 중 발견, Rule 1 버그 수정): 노출되지
                    // 않은 actuator 엔드포인트(/actuator/env, /actuator/beans)에 접근하면
                    // DispatcherServlet이 404를 렌더링하기 위해 서블릿 컨테이너 내부에서
                    // /error로 ERROR 디스패치를 한다. Spring Security는 기본적으로 이 내부
                    // 디스패치도 원본 요청과 마찬가지로 필터 체인을 다시 통과시키는데, /error가
                    // permitAll 목록에 없으면 anyRequest().authenticated()에 걸려
                    // ExceptionTranslationFilter가 401(Bearer 챌린지)로 응답을 덮어써버린다 —
                    // 그러면 HealthCheckSmokeTest/StagingProfileBootTest가 기대하는 404
                    // 대신 401을 받게 된다. permitAll로 두어도 /error 자체가 별도 정보를
                    // 노출하지 않으므로(원래 상태 코드/에러 메시지만 그대로 전달) 안전하다.
                    .requestMatchers("/actuator/**", "/api/auth/**", "/error").permitAll()
                    .anyRequest().authenticated()
            }
            .oauth2ResourceServer { it.jwt(Customizer.withDefaults()) }
        return http.build()
    }
}
