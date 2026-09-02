package com.footlog.backend.dailyreflection

import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface DailyReflectionRepository : JpaRepository<DailyReflection, UUID>
