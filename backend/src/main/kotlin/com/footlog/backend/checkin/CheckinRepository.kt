package com.footlog.backend.checkin

import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface CheckinRepository : JpaRepository<Checkin, UUID>
