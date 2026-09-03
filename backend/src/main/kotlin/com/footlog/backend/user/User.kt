package com.footlog.backend.user

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.OffsetDateTime
import java.util.UUID

// V1__create_users_table.sql + V4__add_kakao_fields_to_users_table.sql 매핑. users.id에는
// DB 기본값 gen_random_uuid()가 있는 유일한 테이블이지만(FlywayMigrationTest Test 10),
// JPA ID 자동생성 애노테이션을 여전히 붙이지 않는 이유는 호출부가 UUID.randomUUID()로 서버
// 소유 UUID를 직접 지정하기 때문이다(Phase 10부터는 카카오 로그인으로 서버가 새 사용자를
// 생성한다 — 09-CONTEXT.md D-02 플레이스홀더 사용자만 다루던 이전 전제가 바뀌었다). 카카오
// 회원번호(kakaoId)는 절대 PK가 아니라 별도 컬럼이다(10-PATTERNS.md "Client-owned vs
// server-owned ID distinction").
@Entity
@Table(name = "users")
class User(
    @Id
    val id: UUID,

    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: OffsetDateTime,

    // BIGINT, UNIQUE(V4 제약), nullable — 계정 생성 시 한 번 정해지고 이후 바뀌지 않는다(val).
    @Column(name = "kakao_id")
    val kakaoId: Long? = null,

    // 매 로그인마다 카카오 프로필로 갱신될 수 있어야 하므로 var다(D-06).
    // 글자수 제한 속성을 붙이지 않는다 — V4가 TEXT(무제한)로 정의했고, 붙이면
    // ddl-auto=validate가 어긋남을 잡을 수도, 조용히 통과할 수도 있는 모호한 상태가 된다.
    @Column(name = "nickname")
    var nickname: String? = null,

    // 같은 이유로 var다(D-06 매 로그인 갱신).
    @Column(name = "profile_image_url")
    var profileImageUrl: String? = null,
)
