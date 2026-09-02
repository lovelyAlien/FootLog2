package com.footlog.backend.user

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.OffsetDateTime
import java.util.UUID

// V1__create_users_table.sql 매핑. users.id에는 DB 기본값 gen_random_uuid()가 있는
// 유일한 테이블이지만(FlywayMigrationTest Test 10), 이번 phase에서 서버가 새 사용자를
// 만들지 않고 09-CONTEXT.md D-02 플레이스홀더 사용자만 다루므로 JPA ID 자동생성 애노테이션은
// 붙이지 않고 호출부(테스트/미래 Phase 10 인증)가 지정한 UUID를 그대로 쓴다.
@Entity
@Table(name = "users")
class User(
    @Id
    val id: UUID,

    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: OffsetDateTime,
)
