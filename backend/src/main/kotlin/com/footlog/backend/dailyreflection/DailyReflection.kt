package com.footlog.backend.dailyreflection

import com.footlog.backend.user.User
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.Id
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table
import java.time.LocalDate
import java.time.OffsetDateTime
import java.util.UUID

// V3__create_daily_reflections_table.sql 매핑. 클라이언트 DailyReflectionRow
// (src/db/schema.ts)의 필드 구성을 1:1로 매핑하고, 서버 전용 user_id FK(D-02)를 추가한다.
// date는 Postgres DATE 컬럼이므로 OffsetDateTime이 아니라 java.time.LocalDate를 쓴다.
//
// id에는 Checkin과 동일한 이유로 JPA ID 자동생성 애노테이션을 붙이지 않는다 — 클라이언트가
// 발급한 UUID를 서버가 절대 재발급하지 않는다(09-RESEARCH.md Pitfall 5).
@Entity
@Table(name = "daily_reflections")
class DailyReflection(
    @Id
    val id: UUID,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    val user: User,

    @Column(nullable = false)
    var date: LocalDate,

    @Column(name = "new_place_answer")
    var newPlaceAnswer: String? = null,

    @Column(name = "free_reflection")
    var freeReflection: String? = null,

    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: OffsetDateTime,

    @Column(name = "updated_at", nullable = false)
    var updatedAt: OffsetDateTime,
)
