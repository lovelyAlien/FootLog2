package com.footlog.backend

import com.footlog.backend.checkin.Checkin
import com.footlog.backend.checkin.CheckinRepository
import com.footlog.backend.dailyreflection.DailyReflection
import com.footlog.backend.dailyreflection.DailyReflectionRepository
import com.footlog.backend.user.UserRepository
import jakarta.persistence.EntityManager
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.context.annotation.Import
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate
import java.time.OffsetDateTime
import java.time.temporal.ChronoUnit
import java.util.UUID

// 09-04-PLAN.md Task 1 — JPA 엔티티 3종(User/Checkin/DailyReflection)이 09-02가 만든
// 실제 스키마(Flyway V1~V3)와 정합하고, 클라이언트가 발급한 UUID가 서버 왕복에서
// 재발급되지 않음(09-RESEARCH.md Pitfall 5)을 고정하는 계약 테스트.
// 09-02의 FlywayMigrationTest와 동일하게 TestcontainersConfiguration을 재사용한다.

// V1__create_users_table.sql이 심어둔 D-02 플레이스홀더 사용자 UUID.
private val PLACEHOLDER_USER_ID = UUID.fromString("00000000-0000-0000-0000-000000000001")

@Import(TestcontainersConfiguration::class)
@SpringBootTest
@Transactional
class EntityPersistenceTest {

    @Autowired
    lateinit var userRepository: UserRepository

    @Autowired
    lateinit var checkinRepository: CheckinRepository

    @Autowired
    lateinit var dailyReflectionRepository: DailyReflectionRepository

    @Autowired
    lateinit var entityManager: EntityManager

    // Test 1: 플레이스홀더 사용자를 findById로 조회하면 존재한다(V1이 넣은 로우)
    @Test
    fun `플레이스홀더 사용자를 findById로 조회할 수 있다`() {
        val found = userRepository.findById(PLACEHOLDER_USER_ID)
        assertTrue(found.isPresent, "V1이 삽입한 플레이스홀더 사용자가 조회돼야 한다")
    }

    // Test 2 + Test 3: 호출부가 만든 UUID로 Checkin을 저장·flush·clear 후 재조회하면
    // id가 그대로 보존되고(서버가 재발급하지 않음), 모든 필드가 왕복에서 그대로 보존된다.
    @Test
    fun `Checkin을 저장하면 클라이언트 발급 UUID와 모든 필드가 왕복 조회에서 보존된다`() {
        val user = userRepository.findById(PLACEHOLDER_USER_ID).orElseThrow()
        val checkinId = UUID.randomUUID()
        val now = OffsetDateTime.now().truncatedTo(ChronoUnit.MICROS)

        val checkin = Checkin(
            id = checkinId,
            user = user,
            timestampUtc = now,
            localDateKey = "2026-09-02",
            timezoneAtCapture = "Asia/Seoul",
            lat = 37.5665,
            lng = 126.9780,
            accuracyMeters = 12.5,
            locationSource = "gps",
            note = "테스트 메모",
            photoPath = "photos/test.jpg",
            createdAt = now,
            updatedAt = now,
            schemaVersion = 1,
        )
        checkinRepository.save(checkin)
        entityManager.flush()
        entityManager.clear()

        val found = checkinRepository.findById(checkinId).orElseThrow()

        // Test 2: id가 저장 시 넘긴 UUID와 정확히 같다(서버가 ID를 재발급하지 않음 — Pitfall 5)
        assertEquals(checkinId, found.id)

        // Test 3: 모든 필드(널 허용 필드 포함)가 저장 값과 일치한다.
        // PostgreSQL timestamptz는 오프셋을 보존하지 않고 인스턴트만 저장하므로(JDBC 드라이버가
        // UTC 오프셋으로 되돌려줌), OffsetDateTime.equals(오프셋까지 비교)가 아니라 isEqual
        // (같은 인스턴트인지)로 비교한다 — 값 자체는 정확히 보존됨을 그대로 검증한다.
        assertTrue(now.isEqual(found.timestampUtc), "timestampUtc는 같은 인스턴트로 보존돼야 한다")
        assertEquals("2026-09-02", found.localDateKey)
        assertEquals("Asia/Seoul", found.timezoneAtCapture)
        assertEquals(37.5665, found.lat)
        assertEquals(126.9780, found.lng)
        assertEquals(12.5, found.accuracyMeters)
        assertEquals("gps", found.locationSource)
        assertEquals("테스트 메모", found.note)
        assertEquals("photos/test.jpg", found.photoPath)
        assertTrue(now.isEqual(found.createdAt), "createdAt은 같은 인스턴트로 보존돼야 한다")
        assertTrue(now.isEqual(found.updatedAt), "updatedAt은 같은 인스턴트로 보존돼야 한다")
        assertEquals(1, found.schemaVersion)
    }

    // Test 3(null 케이스): accuracyMeters/note/photoPath가 null이어도 왕복에서 null로 보존된다
    @Test
    fun `Checkin의 null 허용 필드가 null로 저장돼도 왕복 조회에서 null로 보존된다`() {
        val user = userRepository.findById(PLACEHOLDER_USER_ID).orElseThrow()
        val checkinId = UUID.randomUUID()
        val now = OffsetDateTime.now().truncatedTo(ChronoUnit.MICROS)

        val checkin = Checkin(
            id = checkinId,
            user = user,
            timestampUtc = now,
            localDateKey = "2026-09-02",
            timezoneAtCapture = "Asia/Seoul",
            lat = 37.5665,
            lng = 126.9780,
            accuracyMeters = null,
            locationSource = "manual",
            note = null,
            photoPath = null,
            createdAt = now,
            updatedAt = now,
            schemaVersion = 1,
        )
        checkinRepository.save(checkin)
        entityManager.flush()
        entityManager.clear()

        val found = checkinRepository.findById(checkinId).orElseThrow()

        assertNull(found.accuracyMeters)
        assertNull(found.note)
        assertNull(found.photoPath)
    }

    // Test 4: 호출부가 만든 UUID로 DailyReflection을 저장·조회해도 동일하게 id가 보존된다
    @Test
    fun `DailyReflection을 저장하면 클라이언트 발급 UUID가 왕복 조회에서 보존된다`() {
        val user = userRepository.findById(PLACEHOLDER_USER_ID).orElseThrow()
        val reflectionId = UUID.randomUUID()
        val now = OffsetDateTime.now().truncatedTo(ChronoUnit.MICROS)

        val reflection = DailyReflection(
            id = reflectionId,
            user = user,
            date = LocalDate.of(2026, 9, 2),
            newPlaceAnswer = "새로운 장소",
            freeReflection = "오늘의 회고",
            createdAt = now,
            updatedAt = now,
        )
        dailyReflectionRepository.save(reflection)
        entityManager.flush()
        entityManager.clear()

        val found = dailyReflectionRepository.findById(reflectionId).orElseThrow()

        assertEquals(reflectionId, found.id)
        assertEquals(LocalDate.of(2026, 9, 2), found.date)
        assertEquals("새로운 장소", found.newPlaceAnswer)
        assertEquals("오늘의 회고", found.freeReflection)
    }

    // Test 5: 동일한 (user, date) 조합으로 DailyReflection을 두 번 저장하고 flush하면
    // DataIntegrityViolationException(또는 하위 타입)이 발생한다 — UNIQUE(user_id, date) 제약(A4).
    // 예외가 트랜잭션을 오염시키므로 별도 메서드로 분리한다.
    @Test
    fun `같은 user와 date 조합으로 DailyReflection을 두 번 저장하면 UNIQUE 제약 위반이 발생한다`() {
        val user = userRepository.findById(PLACEHOLDER_USER_ID).orElseThrow()
        val date = LocalDate.of(2026, 9, 3)
        val now = OffsetDateTime.now().truncatedTo(ChronoUnit.MICROS)

        val first = DailyReflection(
            id = UUID.randomUUID(),
            user = user,
            date = date,
            newPlaceAnswer = null,
            freeReflection = null,
            createdAt = now,
            updatedAt = now,
        )
        dailyReflectionRepository.save(first)
        entityManager.flush()

        val duplicate = DailyReflection(
            id = UUID.randomUUID(),
            user = user,
            date = date,
            newPlaceAnswer = null,
            freeReflection = null,
            createdAt = now,
            updatedAt = now,
        )
        dailyReflectionRepository.save(duplicate)

        // entityManager.flush()가 아니라 리포지토리(JpaRepository.flush())를 통해 호출한다 —
        // Spring의 예외 변환(PersistenceExceptionTranslationPostProcessor)은 @Repository로
        // 등록된 프록시 호출에만 적용되므로, 원시 EntityManager.flush() 호출은 Hibernate의
        // ConstraintViolationException을 그대로 던지고 DataIntegrityViolationException으로
        // 변환되지 않는다.
        assertThrows<DataIntegrityViolationException> {
            dailyReflectionRepository.flush()
        }
    }

    // Test 6: Checkin.user 연관을 통해 플레이스홀더 사용자에 도달할 수 있다(FK 매핑 정상)
    @Test
    fun `Checkin user 연관을 통해 플레이스홀더 사용자에 도달할 수 있다`() {
        val user = userRepository.findById(PLACEHOLDER_USER_ID).orElseThrow()
        val checkinId = UUID.randomUUID()
        val now = OffsetDateTime.now().truncatedTo(ChronoUnit.MICROS)

        val checkin = Checkin(
            id = checkinId,
            user = user,
            timestampUtc = now,
            localDateKey = "2026-09-02",
            timezoneAtCapture = "Asia/Seoul",
            lat = 37.5665,
            lng = 126.9780,
            accuracyMeters = null,
            locationSource = "gps",
            note = null,
            photoPath = null,
            createdAt = now,
            updatedAt = now,
            schemaVersion = 1,
        )
        checkinRepository.save(checkin)
        entityManager.flush()
        entityManager.clear()

        val found = checkinRepository.findById(checkinId).orElseThrow()

        assertEquals(PLACEHOLDER_USER_ID, found.user.id)
    }
}
