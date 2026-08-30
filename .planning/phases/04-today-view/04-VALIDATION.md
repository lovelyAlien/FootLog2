---
phase: 4
slug: today-view
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-08-30
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 29.7.0 + jest-expo ~57.0.4 |
| **Config file** | 별도 config 없음 — `package.json`의 `test` 스크립트(`NODE_OPTIONS=--experimental-sqlite jest`)로 구동 |
| **Quick run command** | `NODE_OPTIONS=--experimental-sqlite npx jest <해당 파일>.test.ts` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** 해당 태스크가 건드린 테스트 파일 개별 실행
- **After every plan wave:** `npm test`(전체 스위트)
- **Before `/gsd:verify-work`:** 전체 스위트 green + Manual-Only 항목(실기기 확인) 수동 확인 필요
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

*Task ID/Plan/Wave는 아직 확정되지 않음 — `/gsd:plan-phase 4`의 planner가 PLAN.md를 작성한 뒤 채워진다. 아래는 RESEARCH.md의 "Phase Requirements → Test Map"을 요구사항 단위로 옮겨 둔 초안이다.*

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | TBD | TBD | REQ-today-view | — | `getTodayCheckins`이 `local_date_key` 기준으로 필터링하고 `timestamp_utc` 오름차순 정렬 | unit | `npx jest src/checkin/checkinRepo.test.ts -t getTodayCheckins` | ❌ Wave 0(기존 파일 확장) | ⬜ pending |
| TBD | TBD | TBD | REQ-today-view | — | 체크인 진행 중(D-04)일 때 바텀시트가 언마운트되고 `showActionCard`와 정확히 배타적으로 렌더링 | unit/component | `npx jest src/app/__tests__/checkin-wiring.test.ts`(확장) | ❌ Wave 0(기존 파일 확장) | ⬜ pending |
| TBD | TBD | TBD | REQ-photo-resize | — | 리사이징된 사진의 긴 변이 가로/세로 원본 모두에서 1600px 이하 | unit | `npx jest src/checkin/photos.test.ts -t resize` | ❌ Wave 0(기존 파일 확장) | ⬜ pending |
| TBD | TBD | TBD | REQ-photo-resize | — | 리사이징 실패 시 기존 인라인 실패 문구(`PHOTO_FAILED`)를 그대로 재사용 | unit | `npx jest src/checkin/checkinFlow.test.ts`(확장) | ❌ Wave 0(기존 파일 확장) | ⬜ pending |
| TBD | TBD | TBD | REQ-onboarding-empty-state | — | 위치 권한이 `undetermined`일 때 Today 화면 마운트 시점이 아니라 첫 체크인 탭 시점에만 요청됨(`(tabs)/index.tsx`로 이전 후에도 회귀 없음) | unit | `npx jest src/checkin/permissions.test.ts` | ✅(Phase 3에서 이미 테스트됨, 이전 후 회귀 확인 필요) | ⬜ pending |
| TBD | TBD | TBD | REQ-trajectory-line | — | 오늘 체크인이 0/1건이면 폴리라인 좌표 없음, 2건 이상이면 timestamp 순으로 정렬됨 | unit | 신규 `src/today/trajectory.test.ts` | ❌ Wave 0(신규 파일) | ⬜ pending |
| E2E (manual) | TBD | 마지막 | 전체 | — | 실기기에서 바텀시트 3단 스냅, 체크인 진행 중 탭바 유지, 저장된 핀 색상 구분 확인 | manual-only — 실기기 필요, CI 자동화 불가 | — | manual | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/checkin/checkinRepo.test.ts` — `getTodayCheckins` 커버리지 추가(REQ-today-view), 리스트/지도 핀이 공유하는 쿼리
- [ ] `src/db/migrations.ts`의 `MigratableDb`에 `getAllAsync` 추가 — `getTodayCheckins`이 여러 row를 조회하려면 필요(현재 없음)
- [ ] `src/db/testing/nodeSqliteAdapter.ts`에도 `getAllAsync` 구현 추가 — 실제 SQLite 엔진 대상 테스트 가능하게
- [ ] `src/checkin/photos.test.ts` — 1600px 리사이징 커버리지 추가(REQ-photo-resize), `PhotoStorageDeps`/`ImagePickerDeps`와 동일 패턴의 `resizeDeps` 포트 추가(`config.ts`는 타입만, `deps.ts`가 런타임 구현 격리)
- [ ] `src/today/trajectory.test.ts` — 폴리라인 좌표 파생 로직(순수 함수) 신규 테스트 파일
- [ ] 새 프레임워크 설치 불필요 — Jest/jest-expo 이미 구성돼 있음

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|--------------------|
| 바텀시트 CLOSED/DRAGGING/OPEN 3단 스냅 실제 제스처 동작 | REQ-today-view | react-native-maps + gorhom/bottom-sheet 제스처 상호작용은 시뮬레이터에서 신뢰도가 낮음(RESEARCH.md 명시) | 실기기에서 시트를 드래그해 3단계가 자연스럽게 스냅되는지, 지도 팬과 충돌 없는지 확인 |
| 체크인 진행 중 탭바 전환(D-09) 실제 동작 | REQ-today-view | 탭 전환 + 드래프트 유지/소실 경계는 실기기 네비게이션 스택에서 확인 필요 | 확인 핀이 뜬 상태에서 캘린더 탭으로 전환 → 다시 오늘 탭으로 복귀 시 드래프트 상태 확인 |
| 저장된 체크인 핀(accentSoft) vs 확인 핀(accent) 색상 구분 실제 조도에서의 시인성 | REQ-today-view | 색상 대비는 실제 화면/조도에서 확인이 정확 | 실기기에서 오늘 체크인 2건 이상 저장 후 지도에서 두 핀 색상이 시각적으로 구분되는지 확인 |
| 사진 리사이징 진행 시 체감 속도 | REQ-photo-resize | 리사이징 성능은 실기기 CPU/메모리에 의존 | 실기기에서 고해상도 사진 첨부 시 UI가 멈추지 않고 반응하는지 확인 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending — planner가 PLAN.md를 작성하고 gsd-plan-checker가 검증한 뒤 확정
