package com.footlog.backend.user

import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface UserRepository : JpaRepository<User, UUID> {
    // kakao_id UNIQUE 제약(V4, D-08) 덕분에 결과가 0 또는 1건임이 DB 제약으로 보장되어
    // 단일 반환 타입(User?)이 안전하다.
    fun findByKakaoId(kakaoId: Long): User?
}
