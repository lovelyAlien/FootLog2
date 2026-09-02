package com.footlog.backend.checkin

import com.footlog.backend.user.User
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.Id
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table
import java.time.OffsetDateTime
import java.util.UUID

// V2__create_checkins_table.sql 매핑. 클라이언트 CheckinRow(src/db/schema.ts)의 필드
// 구성을 1:1로 매핑하고, 서버 전용 user_id FK(D-02)만 추가한다.
//
// id에는 절대 JPA ID 자동생성 애노테이션을 붙이지 않는다 — 클라이언트가 crypto.randomUUID()로
// 이미 ID를 소유한 채 서버에 전달하며(src/checkin/photos.ts에서 확인), 서버가 ID를
// 재발급하면 Phase 12(클라이언트-서버 동기화) 정합성이 깨진다(09-RESEARCH.md Pitfall 5).
// EntityPersistenceTest의 "저장 시 넘긴 UUID == 조회된 UUID" 단언이 이 규율을 회귀로부터 지킨다.
@Entity
@Table(name = "checkins")
class Checkin(
    @Id
    val id: UUID,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    val user: User,

    @Column(name = "timestamp_utc", nullable = false)
    var timestampUtc: OffsetDateTime,

    @Column(name = "local_date_key", nullable = false, length = 10)
    var localDateKey: String,

    @Column(name = "timezone_at_capture", nullable = false, length = 64)
    var timezoneAtCapture: String,

    @Column(nullable = false)
    var lat: Double,

    @Column(nullable = false)
    var lng: Double,

    @Column(name = "accuracy_meters")
    var accuracyMeters: Double? = null,

    @Column(name = "location_source", nullable = false, length = 32)
    var locationSource: String,

    var note: String? = null,

    @Column(name = "photo_path")
    var photoPath: String? = null,

    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: OffsetDateTime,

    @Column(name = "updated_at", nullable = false)
    var updatedAt: OffsetDateTime,

    @Column(name = "schema_version", nullable = false)
    var schemaVersion: Int = 1,
)
