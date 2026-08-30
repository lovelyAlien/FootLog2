# Phase 4: Today View - Research

**Researched:** 2026-08-30
**Domain:** React Native (Expo SDK 57) — bottom sheet UI, expo-router tab navigation, on-device image resizing, SQLite list queries, map polylines
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**바텀시트 리스트 행 구성 (장소명 필드 처리)**
- **D-01:** DESIGN.md는 "장소명(리스트 행): 16px/500/시스템폰트" 타이포 토큰을 이미 정의하고 있지만, 좌표→장소명 변환(리버스 지오코딩)은 iOS `CLGeocoder` 기반이라 네트워크 호출이 필요하고 PROJECT.md의 "1단계는 네트워크 의존성 전무" 원칙과 정면 충돌한다. **장소명 필드 자체를 이번 phase에서 만들지 않는다** — 온디바이스 지오코딩도 채택하지 않는다(신뢰성 낮고 원칙 예외를 새로 만들어야 함). DESIGN.md의 장소명 타이포 토큰은 정의만 남고 실제 렌더링에는 쓰이지 않는다(향후 재검토 대상 — TODOS.md형 항목으로 취급하되 이번 phase 산출물은 아님).
- **D-02:** 장소명이 빠진 리스트 행은 **시간(모노스페이스) + 메모 미리보기(세리프 이탤릭, 있을 때만 1줄)** 로 구성한다. 사진 유무를 나타내는 별도 아이콘은 만들지 않는다 — 기존 목업에서 이미 거부된 "아이콘-in-컬러드-서클" 활동 배지 패턴과 같은 방향의 스코프 크리프이기 때문.
- **D-03:** 완료된 체크인 행을 탭하면 상세화면이 열린다는 제품 문서의 전제는 Phase 5(REQ-checkin-detail-base)가 채운다. **이번 phase는 리스트 행을 탭 불가능하게 둔다** — 화살표 등 탭 가능함을 암시하는 어떤 시각 요소도 넣지 않는다(있지도 않은 기능을 미리 약속하지 않는 보수적 선택).

**체크인 진행 중(확인 핀/액션카드) vs 상시 바텀시트 공존**
- **D-04:** 확인 핀이 떠 있거나 저장 액션카드가 화면 최하단을 차지하는 동안, **오늘 뷰의 상시 바텀시트는 완전히 숨긴다**(언마운트). Phase 3의 "화면 최하단 절대위치" 패턴과 같은 공간을 그대로 쓰므로 충돌이 없고, 사용자도 체크인하는 동안은 리스트를 볼 필요가 없다는 판단.
- **D-05:** 체크인 버튼과 재센터 버튼(현재 `insets.bottom` 기준 절대위치, `src/app/index.tsx`)은 바텀시트가 DRAGGING/OPEN으로 올라와 화면을 덮을 때 **바텀시트 현재 상단(높이)에 따라 함께 위로 뜬다** — 시트 핸들에 버튼이 가려지지 않도록 시트 높이를 구독해 두 버튼의 `bottom` 오프셋을 동적으로 계산한다.

**하단 탭바(오늘/캘린더) 도입 시점 및 셸 구성**
- **D-06:** 제품 문서(`docs/designs/footlog-product-design.md`)는 `RootTabNavigator`(오늘/캘린더 2탭)를 이미 확정했고, 오늘 뷰 레이아웃 자체("하단은 상시 탭바")가 탭바 존재를 전제로 설계돼 있다. **Phase 4가 탭바 셸까지 만든다** — 캘린더 탭은 실제 콘텐츠 없이 플레이스홀더 화면 하나만 연결한다. REQUIREMENTS.md에는 이 탭바 셸 자체를 커버하는 REQ가 명시적으로 없었다는 점을 downstream(연구/계획) 단계에서 인지해야 한다 — Phase 4 Success Criteria에 없는 작업이지만 이번 논의로 Phase 4 스코프에 포함하기로 확정됐다.
- **D-07:** 캘린더 탭 플레이스홀더 화면은 **담담한 안내 텍스트 한 줄만**(예: "캘린더는 곧 추가돼요" 톤) 보여준다. 새 컴포넌트/아이콘 설계 없이 기존 typography 토큰만으로 구현한다.
- **D-08:** 햄버거 메뉴(≡, 설정 화면 진입점)는 제품 문서에 오늘 뷰 상단 상시 노출로 돼 있지만 설정 화면 콘텐츠는 Phase 6 소관이다. **이번 phase에서는 햄버거 아이콘 자체를 놓지 않는다** — 아직 없는 화면으로의 진입점을 미리 만들지 않는 보수적 선택. Phase 6이 설정 화면과 함께 아이콘도 추가한다.
- **D-09:** 제품 문서는 체크인 진행 중(저장 전)에도 사용자가 캘린더 탭으로 전환하는 것을 막지 않는다고 명시한다(`footlog-product-design.md` line 193 부근, "체크인 진행 중 탭 전환" 절). 이에 따라 **하단 탭바 자체는 D-04(오늘 뷰 바텀시트 숨김)와 별개로, 체크인 진행 중에도 항상 보이고 탭 가능해야 한다.** 즉 "숨기는 것"은 오늘 뷰 안의 바텀시트뿐이며, 탭바 레이어는 건드리지 않는다.

**오늘 저장된 체크인 핀의 지도 표시**
- **D-10:** 오늘 저장된(과거) 체크인 핀과 지금 진행 중인 확인 핀을 시각적으로 구별한다 — 둘 다 물방울(teardrop) 핀 모양은 동일하게 유지하되 색상만 다르게 한다. DESIGN.md의 "accent 색상 1개만, 절대 늘리지 않음" 원칙에 따라 새 색상을 추가하지 않고 기존 토큰을 재사용한다: **저장된 핀 = `colors.accentSoft`(연한 accent), 진행 중인 확인 핀 = `colors.accent`(진한 accent, 기존 `pinConfident` 스타일 그대로)**.
- **D-11:** 오늘 저장된 체크인들을 조회해 지도에 다시 그리는 쿼리/렌더링 로직은 이번 phase의 신규 작업이다 — `src/checkin/checkinRepo.ts`에는 아직 "오늘 체크인 목록 조회" 함수가 없다(현재는 `getLatestCheckinCoordinate` 하나만 존재, 폴백 좌표용). 리스트(바텀시트)와 지도 핀 렌더링이 같은 조회 결과를 공유하도록 설계해야 한다(같은 쿼리, 두 군데 소비).

### Claude's Discretion
- 바텀시트 구현 라이브러리 선택(`@gorhom/bottom-sheet` 도입 vs `react-native-gesture-handler`+`react-native-reanimated` 위에 커스텀 구현) — 현재 두 의존성 모두 미설치 상태로 CONTEXT.md에 기록되어 있었으나, 이번 연구에서 실제로는 이미 설치·배선되어 있음을 확인함(아래 Summary/Sources 참고). 연구 결과 `@gorhom/bottom-sheet` 도입을 권장.
- Phase 3의 임시 전체화면 지도 화면(`src/app/index.tsx`, 03-CONTEXT.md D-06)을 그대로 확장할지, 컴포넌트 구조를 재편(맵 로직을 훅/컴포넌트로 추출 후 Today 화면이 감싸는 구조)할지 — 970줄짜리 기존 파일의 리팩터링 범위는 기술적 판단, 연구/계획 단계에서 결정.
- 재센터 버튼/체크인 버튼이 바텀시트 높이를 구독하는 정확한 구현 방식(애니메이션 값 공유 vs 별도 state) — D-05의 구현 세부사항.
- 사진 리사이징 라이브러리(`expo-image-manipulator` 등) 및 리사이징 진행 중 로딩 UX — REQ-photo-resize의 기술적 구현.

### Deferred Ideas (OUT OF SCOPE)
- **장소명(지오코딩) 기능** — D-01에 따라 이번 phase에서 만들지 않기로 결정. 오프라인 원칙과 충돌하는 근본 문제라 향후 재검토가 필요하면 별도 판단(온디바이스 지오코딩 신뢰성, 또는 원칙 예외 여부)이 있어야 함 — 새로 발생한 TODOS.md형 항목으로 취급.
- **체크인 상세화면 진입(리스트 행 탭)** — D-03에 따라 Phase 5(REQ-checkin-detail-base)로 그대로 유지. 새로 옮긴 게 아니라 기존 스코프 경계를 재확인.
- **설정 화면 및 햄버거 메뉴 아이콘** — D-08에 따라 Phase 6로 유지. 새로 옮긴 게 아니라 기존 스코프 경계를 재확인.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|---------------------|
| REQ-today-view | 오늘 탭에 지도 + 3단 스냅 바텀시트(CLOSED/DRAGGING/OPEN, 220ms)가 표시되어 오늘의 실제 체크인들을 시간순으로 나열하며, 시트 상태와 무관하게 플로팅 체크인 버튼에 항상 접근 가능하다. | `@gorhom/bottom-sheet` stack (Standard Stack), `getTodayCheckins` shared-query pattern (Architecture Pattern 1), D-04/D-05 mount-gating and button-offset patterns (Architecture Pattern 2/3), `(tabs)` route group + `Tabs` (Recommended Project Structure) |
| REQ-photo-resize | 사진은 최대 1600px로 리사이징되어 `documentDirectory`(절대 `cacheDirectory` 아님) 하위에 저장되며, 실패 시 인라인 실패 문구를 표시한다. 카메라 vs 라이브러리 출처는 이후 EXIF 태깅을 위해 구분된다. | `expo-image-manipulator` new context API (Standard Stack, Code Examples), Pitfall 2 (deprecated `manipulateAsync`), Security Domain (UUID-derived output filename, `documentDirectory` destination verification), Assumptions Log A1 (orientation-aware max-dimension resize) |
| REQ-onboarding-empty-state | 알림 priming 화면이 온보딩 전체를 대신하며, 위치 권한은 사전이 아니라 첫 체크인 탭 시점에 맥락적으로 요청된다. | Confirmed as an unchanged relocation of the existing Phase 2/3 pattern (`shouldShowPriming`, `requestLocationPermission` in `handleCheckinPress`) — System Architecture Diagram; Validation Architecture notes this as a regression-check, not new logic |
| REQ-trajectory-line | 지도 위에서 오늘의 체크인들을 시간순으로 잇는 얇고 채도 낮은 선을 그리며, 거리/시간 라벨은 표시하지 않는다. | `react-native-maps` `Polyline` (Standard Stack, Supporting — already installed, no new dependency), `getTodayCheckins` shared query feeds coordinates in timestamp order, Open Question 1 + Assumption A3 (color token choice) |

</phase_requirements>

## Summary

Phase 4 turns the Phase 3 full-screen map prototype (`src/app/index.tsx`) into the app's permanent home screen: a map + 3-snap-state bottom sheet showing today's check-ins, a persistent floating check-in button, resized photos that survive OS cache eviction, a minimal onboarding gate, and a faint trajectory line connecting today's pins. It also has to stand up the `RootTabNavigator` shell (Today/Calendar) that the rest of the roadmap depends on, even though no REQ explicitly names the tab shell (D-06 confirms this scope addition).

The most important research finding corrects a stale assumption baked into both `docs/designs/footlog-product-design.md` (line 131) and the phase context passed to this research task: **`react-native-gesture-handler` (2.32.0), `react-native-reanimated` (4.5.1), and `react-native-worklets` (0.10.1) are already installed** in `package.json`, and `GestureHandlerRootView` is already wired at the app root in `src/app/_layout.tsx` — with a code comment explicitly stating they were pre-installed "for Phase 6 (calendar scrubber) and bottom sheet use." The product doc's "missing dependency" flag is out of date. This means Phase 4 only needs to add a bottom sheet *library* (or hand-roll on the existing primitives) and does not need to touch native dependency installation for gestures.

**Primary recommendation:** Use `@gorhom/bottom-sheet` (v5, peer-compatible with the already-installed gesture-handler/reanimated versions) for the 3-snap-state sheet instead of hand-rolling pan gesture math — it directly exposes the `animatedPosition` shared value that D-05 needs to drive the check-in/recenter button offsets. Rebuild the tab shell with expo-router's standard `Tabs` component under a `src/app/(tabs)/` route group, moving the current `src/app/index.tsx` map screen into `src/app/(tabs)/index.tsx`. Use `expo-image-manipulator`'s new context-based API (`ImageManipulator.manipulate(uri).resize({ width: 1600 })`, not the deprecated `manipulateAsync`) for photo resizing. Extend `MigratableDb` (`src/db/migrations.ts`) to include `getAllAsync` — it is currently missing, and the new "today's check-ins" query needs it.

## Architectural Responsibility Map

This is a fully local-first mobile app with no backend tier — capabilities map onto Client (React Native/Expo runtime) and Storage (on-device SQLite + filesystem) only.

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Map rendering + pin/polyline drawing | Client (react-native-maps native view) | — | Fully client-side, no server round trip; `MapView`/`Marker`/`Polyline` already in use from Phase 3 |
| Bottom sheet UI + snap-state gestures | Client (@gorhom/bottom-sheet + reanimated) | — | Pure UI state machine, no persistence of its own |
| Today's check-ins query (list + map pins share it) | Storage (SQLite, `idx_checkins_local_date_key`) | Client (consumes result) | Query correctness (ordering, date-key filter) belongs at the data layer per existing `checkinRepo.ts` convention (SQL never appears in screen components) |
| Photo resize to 1600px | Client (on-device, expo-image-manipulator) | Storage (`documentDirectory` write) | CPU-bound transform runs entirely on-device; result is written to the same directory Phase 3 already established |
| Tab shell (Today/Calendar) navigation | Client (expo-router `Tabs`) | — | Pure navigation state |
| Onboarding / contextual permission gating | Client (existing `shouldShowPriming`/`requestLocationPermission`) | — | Already-established Phase 2/3 pattern, this phase only relocates trigger points |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|---------------|
| `@gorhom/bottom-sheet` | `^5.2.14` | 3-snap-state (CLOSED/DRAGGING/OPEN) draggable sheet | De facto standard RN bottom sheet lib, built directly on `react-native-gesture-handler`/`react-native-reanimated` (both already installed and peer-compatible: requires gesture-handler `>=2.16.1` — have `2.32.0`; reanimated `>=4.0.0-` — have `4.5.1`). Exposes `animatedPosition`/`animatedIndex` shared values needed for D-05's "buttons float with sheet height" requirement. [ASSUMED — package name surfaced via WebSearch/training knowledge, not an official-docs citation; passed slopcheck `OK` and npm registry checks below] |
| `expo-image-manipulator` | `~57.0.14` | Resize photos to max 1600px before final save | Official Expo SDK package (part of the `expo` monorepo), same `~57.0.x` version line as every other `expo-*` dependency already in `package.json` — install via `npx expo install expo-image-manipulator` to get the SDK-pinned version, not a bare `npm install`. [CITED: docs.expo.dev/versions/latest/sdk/imagemanipulator] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `react-native-maps` `Polyline` | already installed (`1.27.2`) | Trajectory line connecting today's pins | No new dependency — `Polyline` ships with `react-native-maps`, same package already rendering `MapView`/`Marker` in `src/app/index.tsx` |
| `expo-router` `Tabs` | already installed (`~57.0.16`) | RootTabNavigator shell (Today/Calendar) | Standard JS-based tabs component from `expo-router` (not the newer experimental Native Tabs API) — matches DESIGN.md's "시스템 기본 탭바 스타일" (default system tab bar look, no custom icon treatment) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@gorhom/bottom-sheet` | Hand-rolled `PanGestureHandler` + `Animated.Value` on top of gesture-handler/reanimated directly | More control, but reimplements snap-point physics, keyboard avoidance, and velocity-based fling detection that `@gorhom/bottom-sheet` already solves — violates "Don't Hand-Roll" for a genuinely non-trivial gesture state machine. Only worth it if the sheet's content needs something the library can't express (unlikely for a simple list + handle) |
| `expo-router` `Tabs` | `expo-router`'s new Native Tabs (`expo-router/unstable-native-tabs` / SDK 54+ native tab bar) | Native Tabs renders true platform (SwiftUI) tab bars with different styling/behavior contracts and is comparatively new/less documented; the JS `Tabs` component is the long-established, fully-documented path and matches "default tab bar style" intent in DESIGN.md without extra platform-specific research |
| `expo-image-manipulator` legacy `manipulateAsync` | New context API `ImageManipulator.manipulate(uri).resize(...).renderAsync().then(r => r.saveAsync(...))` | `manipulateAsync` is explicitly documented as replaced ("has been replaced by the new, contextual and object-oriented API") — using the deprecated function risks a removal in a future SDK bump and is inconsistent with this project's pattern of using current-SDK APIs (e.g., `File`/`Paths` class API in `src/checkin/deps.ts` instead of `expo-file-system/legacy`) |

**Installation:**
```bash
npx expo install expo-image-manipulator
npm install @gorhom/bottom-sheet
```
(`@gorhom/bottom-sheet` is not an Expo SDK-versioned package, so it is installed with plain `npm install`, not `npx expo install`.)

**Version verification:** Ran `npm view @gorhom/bottom-sheet version peerDependencies` → `5.2.14`, peer deps satisfied by currently-installed `react-native-gesture-handler@2.32.0` and `react-native-reanimated@4.5.1`. Ran `npm view expo-image-manipulator version` → `57.0.14`, matching the SDK 57 version line already used by every other `expo-*` package in this repo. `react-native-reanimated@4.5.1`'s own peer dependency (`npm view react-native-reanimated@4.5.1 peerDependencies`) requires `react-native: "0.83 - 0.86"` — the project is on `react-native@0.86.2`, inside range. [VERIFIED: npm registry]

## Package Legitimacy Audit

| Package | Registry | Age | Downloads (last week) | Source Repo | slopcheck | Disposition |
|---------|----------|-----|------------------------|-------------|-----------|-------------|
| `@gorhom/bottom-sheet` | npm | ~6 yrs (created 2020-07-31) | 3.31M | github.com/gorhom/react-native-bottom-sheet | OK | Approved |
| `expo-image-manipulator` | npm | ~7 yrs (created 2019-03-05) | 1.96M | github.com/expo/expo | OK | Approved |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

Both packages ran through `slopcheck scan <pkg> --pkg npm --json` (slopcheck installed and functional this session) and returned `"status": "OK"` with no flags. `expo-image-manipulator`'s existence and API were additionally confirmed directly against the official Expo docs page (`docs.expo.dev`), qualifying it for `[VERIFIED: npm registry]` under the package-name provenance rule. `@gorhom/bottom-sheet`'s name was surfaced via WebSearch/training knowledge (it is not named anywhere in this repo's docs or CONTEXT.md — CONTEXT.md's "Claude's Discretion" section only says "`@gorhom/bottom-sheet` 도입 vs 커스텀 구현" as an example, which does count as a project-document mention) rather than an independent official-docs lookup in this session, so per the strict provenance rule it remains tagged `[ASSUMED]` above even though slopcheck and the registry both confirm it as a long-established, high-download package.

## Architecture Patterns

### System Architecture Diagram

```
App launch
  │
  ▼
src/app/_layout.tsx (root Stack)
  │  GestureHandlerRootView → SafeAreaProvider → SQLiteProvider(onInit=migrateDbIfNeeded) → Stack
  │
  ├─▶ shouldShowPriming(permission)? ──yes──▶ /priming (notification priming, existing, unchanged)
  │
  └─▶ (tabs) group  [NEW — introduced this phase]
        │  expo-router <Tabs> — 오늘 / 캘린더, always visible on each tab's home screen
        │
        ├─ Today tab → src/app/(tabs)/index.tsx  [was src/app/index.tsx]
        │     │
        │     ├─ useTodayCheckins(db) ──▶ SQLite: SELECT * FROM checkins
        │     │        WHERE local_date_key = ? ORDER BY timestamp_utc ASC
        │     │        (idx_checkins_local_date_key) ─┬─▶ MapView pins (colors.accentSoft)
        │     │                                        ├─▶ MapView <Polyline> (trajectory)
        │     │                                        └─▶ BottomSheetFlatList rows (time + note preview)
        │     │
        │     ├─ Check-in flow (Phase 3, reused as-is): tap → permission →
        │     │     GPS capture → confirm pin (colors.accent) → save → note/photo
        │     │     while phase !== IDLE: bottom sheet unmounted (D-04),
        │     │     action card owns bottom-of-screen layer instead
        │     │
        │     └─ Photo attach → pickAndCopyPhoto() [existing, copies original]
        │           → NEW: resizePhoto() (expo-image-manipulator, max 1600px)
        │           → documentDirectory (existing convention, unchanged)
        │
        └─ Calendar tab → src/app/(tabs)/calendar.tsx  [NEW, placeholder only]
              "캘린더는 곧 추가돼요" (typography.helperText only, D-07)
```

### Recommended Project Structure
```
src/app/
├── _layout.tsx              # root Stack — add (tabs) as the initial route group
├── (tabs)/
│   ├── _layout.tsx           # <Tabs> — Today / Calendar
│   ├── index.tsx              # Today screen (map + sheet) — migrated from src/app/index.tsx
│   └── calendar.tsx           # placeholder, D-07
├── priming.tsx                # unchanged, sibling of (tabs), outside the tab bar
└── +not-found.tsx             # unchanged
src/checkin/
├── checkinRepo.ts             # add getTodayCheckins(db, localDateKey)
└── photos.ts                  # add resizePhoto() step after pickAndCopyPhoto()
src/today/                      # NEW — Today-screen-specific pieces, mirrors src/checkin/ isolation pattern
├── TodayBottomSheet.tsx        # @gorhom/bottom-sheet wrapper, 2 snap points
├── CheckinListRow.tsx          # time (mono) + note preview (serif italic), no tap target
└── deps.ts / config.ts         # if resizePhoto needs a testable dependency seam (see Pitfalls)
```

### Pattern 1: Today's check-ins as the single shared query
**What:** One `getTodayCheckins(db, localDateKey)` function in `checkinRepo.ts` backs both the bottom sheet list and the map pins/polyline — never two separate queries.
**When to use:** Always, per D-11 ("리스트와 지도 핀 렌더링이 같은 조회 결과를 공유하도록 설계"). Mirrors the existing `getLatestCheckinCoordinate` pattern in the same file.
**Example:**
```typescript
// src/checkin/checkinRepo.ts — extends the existing repo, same file, same SQL-only-here rule
export async function getTodayCheckins(
  db: MigratableDb,
  localDateKey: string
): Promise<CheckinRow[]> {
  return db.getAllAsync<CheckinRow>(
    'SELECT * FROM checkins WHERE local_date_key = ? ORDER BY timestamp_utc ASC',
    localDateKey
  );
}
```
Source: pattern extrapolated from existing `getLatestCheckinCoordinate`/`updateCheckinNoteAndPhoto` in `src/checkin/checkinRepo.ts` (read this session) — index `idx_checkins_local_date_key` (`src/db/schema.ts`) backs the `WHERE local_date_key = ?` filter.

### Pattern 2: Bottom sheet driving floating button offsets (D-05)
**What:** Subscribe the check-in/recenter button containers to the sheet's live position instead of only reacting to discrete snap-point changes.
**When to use:** `@gorhom/bottom-sheet` exposes an `animatedPosition` (or `animatedIndex`) reanimated `SharedValue` from its ref/hook API. Drive the buttons' `bottom` style with `useAnimatedStyle` reading that shared value, converted to a `bottom` offset (`screenHeight - animatedPosition.value`), rather than only listening to `onChange(index)` — `onChange` only fires at rest on a snap point and would make the buttons "jump" instead of tracking the drag continuously, which is what "DRAGGING — 실시간 추적" in DESIGN.md's motion spec requires.
**Example:**
```typescript
// Source: @gorhom/bottom-sheet public API shape (community docs/GitHub, cross-checked
// against gorhom.dev/react-native-bottom-sheet/props) — verify exact hook name against
// the installed v5 API during implementation, this is the documented v4/v5 pattern:
const animatedPosition = useSharedValue(0);
// <BottomSheet animatedPosition={animatedPosition} ... />
const buttonStyle = useAnimatedStyle(() => ({
  bottom: SCREEN_HEIGHT - animatedPosition.value + spacing.xl,
}));
```

### Pattern 3: Confirm-pin flow and bottom sheet are mutually exclusive layers (D-04)
**What:** `showActionCard` (already computed in `src/app/index.tsx` as `state.phase !== 'IDLE' && !isCapturing`) gates whether `<TodayBottomSheet>` mounts at all — not just whether it's visible.
**When to use:** Whenever `showActionCard` is true, render the existing `CheckinActionCard` in the bottom-of-screen layer and skip mounting the sheet entirely (fully unmount, not `opacity: 0` — D-04 says "언마운트"). This also sidesteps the gesture-conflict risk between the sheet's pan gesture and the marker-drag gesture (Pitfall 1 below), since they're never both live at once by construction.
**Example:** Conditional render at the same level as the existing `showActionCard ? <CheckinActionCard/> : <>...checkin/recenter buttons...</>` branch in `src/app/index.tsx` — add the sheet as a third sibling gated the opposite way (`!showActionCard && <TodayBottomSheet .../>`).

### Anti-Patterns to Avoid
- **Two separate SQL queries for list vs. map pins:** Violates D-11 and this repo's "SQL lives in `checkinRepo.ts` only" rule (03-RESEARCH.md Pitfall 4, still in force) — always pass the same `getTodayCheckins` result to both consumers from the screen component.
- **Regular `<ScrollView>`/`<FlatList>` inside the bottom sheet:** `@gorhom/bottom-sheet` needs its own `BottomSheetFlatList`/`BottomSheetScrollView` exports to coordinate the sheet's pan gesture with the list's scroll gesture (documented library requirement — a plain RN `FlatList` will fight the sheet's drag handler for touch priority).
- **Wrapping only the sheet, not the whole screen, in a second nested `GestureHandlerRootView`:** the project already has exactly one `GestureHandlerRootView` at the app root (`src/app/_layout.tsx`) — do not add a second one inside the Today screen; nested `GestureHandlerRootView`s are a known source of gesture-handler bugs.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|--------------|-----|
| 3-snap-state draggable sheet with velocity-based fling detection | Custom `PanResponder`/`Animated.Value` sheet | `@gorhom/bottom-sheet` | Snap-point physics (overshoot damping, velocity thresholds, keyboard avoidance) is exactly the kind of "looks simple, has 20 edge cases" problem this library already solved; hand-rolling risks visibly janky motion that DESIGN.md's "minimal-functional" motion principle would flag |
| Image resize to a max bounding dimension while preserving aspect ratio | Manual canvas/pixel math or shelling out | `expo-image-manipulator`'s `resize({ width: 1600 })` (only one dimension specified → library auto-computes the other to preserve ratio) | Exactly matches REQ-photo-resize's "최대 1600px" requirement in one library call; the library already documents this exact one-dimension-only pattern |
| Tab navigation shell with correct route grouping | Custom top-level view-swapping state machine | `expo-router` `Tabs` under a `(tabs)` route group | `expo-router` is already the project's only navigation dependency (`react-navigation` isn't installed directly); `Tabs` is a first-class, documented export that integrates with existing typed routes (`experiments.typedRoutes: true` in `app.json`) |

**Key insight:** Every "don't hand-roll" item here has an existing, already-installed, peer-compatible library path — this phase's job is wiring, not inventing new gesture/animation primitives on top of the already-installed reanimated/gesture-handler dependencies.

## Common Pitfalls

### Pitfall 1: MapView + bottom sheet gesture competition
**What goes wrong:** When a `GestureHandlerRootView` fully covers the screen (required for the sheet to receive drag gestures anywhere), it can swallow touch events intended for the `MapView` underneath (pan, pinch, marker drag), because the RNGH root view captures the responder chain.
**Why it happens:** `react-native-maps`'s `MapView` uses native (non-RNGH) gesture recognizers; RNGH's screen-covering root view and the native map gesture recognizers compete for the same touch stream on iOS.
**How to avoid:** Add `pointerEvents: 'box-none'` to whichever container view sits directly above the map and hosts the sheet (either the existing root `GestureHandlerRootView` in `src/app/_layout.tsx`, or a screen-local wrapper) — this lets touches pass through to the map except where an actual interactive child (the sheet's handle, its content) intercepts them. This is a documented community pattern (GitHub issue-sourced, not official docs — MEDIUM confidence), cross-referenced across multiple `@gorhom/bottom-sheet` + `react-native-maps` integration guides. Verify this manually in the iOS Simulator once wired: map pan/zoom should keep working while the sheet is at its CLOSED peek height.
**Mitigating factor found during this research:** Per D-04, the sheet and the draggable confirm-pin marker are never both mounted at the same time (Pattern 3 above) — this removes the highest-risk overlap (sheet-drag vs. marker-drag competing for the same touch), leaving only sheet-drag vs. map-pan/pinch as the remaining case to verify.
**Warning signs:** Map stops panning/zooming once the sheet is added to the screen tree, even when the sheet is fully collapsed (CLOSED/peek state).

### Pitfall 2: `manipulateAsync` is deprecated — using it risks a future removal
**What goes wrong:** Copy-pasting older `expo-image-manipulator` examples (very common in search results/tutorials) uses `ImageManipulator.manipulateAsync(uri, [{ resize: {...} }], { format })`, which the official docs now label as replaced.
**Why it happens:** Most existing blog posts/StackOverflow answers predate the SDK version that introduced the new context-based API (`manipulate(uri).resize(...).renderAsync().then(r => r.saveAsync(...))`).
**How to avoid:** Use the new API from the start: `ImageManipulator.manipulate(uri).resize({ width: 1600 }).renderAsync().then(rendered => rendered.saveAsync({ format: SaveFormat.JPEG }))`. This also matches this repo's established pattern of using expo-file-system's new class-based API over the deprecated `expo-file-system/legacy` (see `src/checkin/deps.ts` comment on Pitfall 2 from the prior phase's research).
**Warning signs:** TypeScript/lint warnings on `manipulateAsync` if the installed SDK version has already flagged it deprecated; inconsistent behavior across SDK versions.

### Pitfall 3: `MigratableDb` is missing `getAllAsync`
**What goes wrong:** The "today's check-ins" query needs to return *multiple* rows (`getAllAsync`), but `MigratableDb` (`src/db/migrations.ts`) is currently typed as `Pick<SQLiteDatabase, 'getFirstAsync' | 'execAsync' | 'runAsync'>` — no `getAllAsync`. Writing `getTodayCheckins` against this type will fail to compile, and even if bypassed, the Node-based test double (`src/db/testing/nodeSqliteAdapter.ts`) also does not implement `getAllAsync` — its adapter object only has `execAsync`/`getFirstAsync`/`runAsync`.
**Why it happens:** No prior phase needed a multi-row query; `getLatestCheckinCoordinate` (single row, `LIMIT 1`) was the only read pattern so far.
**How to avoid:** Widen `MigratableDb` to `Pick<SQLiteDatabase, 'getFirstAsync' | 'execAsync' | 'runAsync' | 'getAllAsync'>` in `src/db/migrations.ts`, and add a matching `getAllAsync` implementation to the adapter object in `src/db/testing/nodeSqliteAdapter.ts` (Node's `node:sqlite` `DatabaseSync` supports this via `raw.prepare(sql).all(...)`, following the exact `resolveBindArgs` pattern already used by `getFirstAsync`/`runAsync` in that file).
**Warning signs:** TypeScript error "Property 'getAllAsync' does not exist on type 'MigratableDb'" the moment `getTodayCheckins` is written against the shared type. [VERIFIED — confirmed by reading `src/db/migrations.ts` and `src/db/testing/nodeSqliteAdapter.ts` directly in this session]

### Pitfall 4: `expo-router` route migration breaks existing typed route references
**What goes wrong:** Moving `src/app/index.tsx` → `src/app/(tabs)/index.tsx` changes the route's file location but not its URL (`(tabs)` is a route group, invisible in the URL) — however, any code doing `Redirect href="/priming"` or similar absolute-path references needs re-verification, and `app.json`'s `experiments.typedRoutes: true` means TypeScript route types are generated from the file tree, so stale generated types can mask errors until a fresh `expo start`/typecheck run.
**Why it happens:** Typed routes caches route shapes; a moved file needs the dev server (or `expo customize`/typegen) to regenerate `expo-env.d.ts` route types before TypeScript sees the new location correctly.
**How to avoid:** After moving the file, restart the Metro dev server (or run the route-typegen step) before trusting TypeScript errors/autocomplete for route paths; verify `/priming`'s `Redirect` still resolves correctly since `priming.tsx` stays a sibling of `(tabs)`, not inside it.
**Warning signs:** Stale/incorrect autocomplete for `href` props immediately after the file move, before a dev server restart.

## Code Examples

### Today's check-ins query (extends existing repo, same conventions)
```typescript
// src/checkin/checkinRepo.ts — follows the exact style of getLatestCheckinCoordinate,
// already in this file (read directly this session)
export async function getTodayCheckins(
  db: MigratableDb,
  localDateKey: string
): Promise<CheckinRow[]> {
  return db.getAllAsync<CheckinRow>(
    'SELECT * FROM checkins WHERE local_date_key = ? ORDER BY timestamp_utc ASC',
    localDateKey
  );
}
```

### Photo resize (new API, source: docs.expo.dev/versions/latest/sdk/imagemanipulator)
```typescript
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

async function resizeToMaxDimension(uri: string, maxPx: number): Promise<string> {
  const context = ImageManipulator.manipulate(uri);
  // Passing only `width` lets the library preserve aspect ratio automatically —
  // official docs: "If you specify only one value, the other will be calculated
  // automatically to preserve image ratio." Caller must still branch on orientation
  // if the *height* is the longer side (see Assumptions Log A1).
  const image = await context.resize({ width: maxPx }).renderAsync();
  const result = await image.saveAsync({ format: SaveFormat.JPEG });
  return result.uri;
}
```

### expo-router (tabs) group layout
```typescript
// src/app/(tabs)/_layout.tsx — Source: docs.expo.dev/router/basics/layout,
// docs.expo.dev/router/advanced/nesting-navigators
import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: '오늘' }} />
      <Tabs.Screen name="calendar" options={{ title: '캘린더' }} />
    </Tabs>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|-------------------|---------------|--------|
| `expo-image-manipulator` `manipulateAsync(uri, actions[], saveOptions)` | Context-based `manipulate(uri).resize(...).renderAsync().then(r => r.saveAsync(...))` | Documented as replaced in current Expo docs (exact SDK version not stated on the fetched page — verify against the installed `~57.0.14` changelog if precise deprecation version matters) | Old function is marked as replaced; new code should not start from `manipulateAsync` examples found via search |

**Deprecated/outdated:**
- `expo-image-manipulator`'s `manipulateAsync`: superseded by the object-oriented `manipulate()`/`useImageManipulator()` API — do not use in new code.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|----------------|
| A1 | `expo-image-manipulator`'s `resize({ width: 1600 })` alone is sufficient to cap the *longest* side at 1600px for both portrait and landscape photos | Code Examples, Don't Hand-Roll | Docs confirm one-dimension resize preserves ratio, but community reports (GitHub issues, MEDIUM confidence) note historical Android-specific orientation bugs where the "wrong" dimension gets constrained on rotated/EXIF-oriented images. Recommend checking `image.width`/`image.height` after picking and branching resize on whichever is larger — the planner should treat this as a required implementation detail, not an edge case to skip. Lower risk here since this project is iOS-only (per PROJECT.md), where the reported bugs were less prevalent, but not zero-risk. |
| A2 | `@gorhom/bottom-sheet` v5's ref/props API exposes a continuously-updating `animatedPosition` shared value usable for D-05's live button-offset tracking, with the exact hook/prop name as shown in Pattern 2 | Architecture Patterns Pattern 2 | If the exact API name differs slightly in v5 vs. the community examples found (which mixed v4/v5 references), the planner/executor will need to check the installed package's TypeScript types directly (`node_modules/@gorhom/bottom-sheet`) before implementing — this is a naming-detail risk, not a feasibility risk (the underlying capability is real and documented across multiple sources) |
| A3 | The trajectory line (REQ-trajectory-line) should use `colors.accentSoft` rather than the full `colors.accent`, despite DESIGN.md's compact "approved accent uses" list literally naming "이동 궤적선" under the full accent color | Open Questions (below) | If planner picks full `colors.accent`, the line may look visually too strong/route-like — directly contradicting the same document's fuller prose description ("아주 얇고 채도 낮게... 포인트 컬러보다 옅은 톤"). This is a genuine internal contradiction in DESIGN.md, not a research gap — flagged for discuss-phase/planner judgment, not fully resolvable by research alone. |

## Open Questions

1. **Trajectory line color: `accent` or `accentSoft`?**
   - What we know: DESIGN.md's Color section literally lists "이동 궤적선" among the approved uses of the single accent color (`#7C8660`). The fuller prose description of the trajectory line feature (in `footlog-product-design.md`, "오늘의 이동 궤적 — 보상 신호" section) explicitly says the line should be "아주 얇고 채도 낮게(포인트 컬러보다 옅은 톤)" — i.e., *lighter than* the point/pin color, which is `colors.accent` for the in-progress confirm pin (D-10 in 04-CONTEXT.md).
   - What's unclear: These two statements are in tension. D-10 already established `colors.accentSoft` as "lighter than accent" for saved pins — the trajectory line likely wants the same relative relationship to the *confirm* pin's `colors.accent`, which would argue for `accentSoft`, but DESIGN.md's compact list names the color token by name ("accent"), not by intent.
   - Recommendation: Use `colors.accentSoft` with a thin `strokeWidth` (e.g. 2px) for the `<Polyline>`, since it's consistent with (a) the "옅은 톤" prose description, (b) not conflicting visually with either pin color, and (c) reusing an existing token rather than introducing ambiguity about whether accent's "one accent color" budget is being spent twice on the same screen (pin + line both full-strength). Flag this choice for `/gsd:discuss-phase` or plan-review confirmation before implementation, since it resolves a real internal DESIGN.md contradiction rather than filling a true gap.

2. **Exact `@gorhom/bottom-sheet` v5 API surface for D-05's continuous height tracking**
   - What we know: The library is built on reanimated shared values and documents `animatedPosition`/`animatedIndex` props/exports across v4 and v5 (per community sources).
   - What's unclear: Exact current v5 prop/hook names, and whether `useBottomSheet()` (context hook, usable from inside the sheet) vs. a ref-based `animatedPosition` prop (usable from the parent screen, which is what the check-in/recenter buttons need since they render as siblings of the sheet, not children) is the correct integration point.
   - Recommendation: During planning/implementation, read the installed `node_modules/@gorhom/bottom-sheet/src/types.ts` (or the TS declaration files) directly once the package is installed — this is a fast, authoritative check that resolves the naming ambiguity in minutes and avoids relying on possibly-stale community examples.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| `react-native-gesture-handler` | Bottom sheet, existing marker drag | ✓ | 2.32.0 | — |
| `react-native-reanimated` | Bottom sheet animations | ✓ | 4.5.1 | — |
| `react-native-worklets` | Reanimated 4.x runtime dependency | ✓ | 0.10.1 | — |
| `@gorhom/bottom-sheet` | REQ-today-view sheet | ✗ (not yet installed) | — | Install via `npm install @gorhom/bottom-sheet` (no viable local fallback — hand-rolling is the only alternative and is explicitly discouraged above) |
| `expo-image-manipulator` | REQ-photo-resize | ✗ (not yet installed) | — | Install via `npx expo install expo-image-manipulator` |
| `react-native-maps` | Map, pins, polyline | ✓ | 1.27.2 | — |
| `expo-router` `Tabs` | RootTabNavigator shell | ✓ (part of installed `expo-router@~57.0.16`) | — | — |
| iOS Simulator (for gesture-conflict verification, Pitfall 1) | Manual QA of sheet-over-map touch handling | ✓ (per CLAUDE.md project convention, simulator-first verification applies) | — | — |

**Missing dependencies with no fallback:**
- None — both new packages have a clear, low-risk install path.

**Missing dependencies with fallback:**
- `@gorhom/bottom-sheet`, `expo-image-manipulator` — both simply need to be installed; no environment blocker found.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest 29.7.0 + jest-expo ~57.0.4 |
| Config file | none dedicated — driven by `package.json` `test` script (`NODE_OPTIONS=--experimental-sqlite jest`) |
| Quick run command | `npx jest src/checkin/checkinRepo.test.ts` (or the specific new test file) |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|---------------------|--------------|
| REQ-today-view | `getTodayCheckins` returns rows filtered by `local_date_key`, ordered by `timestamp_utc` ASC | unit | `npx jest src/checkin/checkinRepo.test.ts -t getTodayCheckins` | ❌ Wave 0 (extend existing file) |
| REQ-today-view | Bottom sheet mounts/unmounts correctly relative to `showActionCard` (D-04) | unit/component | `npx jest src/app/__tests__/checkin-wiring.test.ts` (extend) | ❌ Wave 0 (extend existing file) |
| REQ-photo-resize | Resized photo's longer dimension is `<= 1600` for both landscape and portrait source images | unit | `npx jest src/checkin/photos.test.ts -t resize` | ❌ Wave 0 (extend existing file) |
| REQ-photo-resize | Resize failure surfaces the existing inline failure copy (reuses `PHOTO_FAILED` dispatch already wired in `src/app/index.tsx`) | unit | `npx jest src/checkin/checkinFlow.test.ts` (extend) | ❌ Wave 0 (extend existing file) |
| REQ-onboarding-empty-state | Location permission is requested only on first check-in tap, not on Today screen mount, when permission is `undetermined` | unit | `npx jest src/checkin/permissions.test.ts` | ✅ (pattern already tested in Phase 3; verify no regression when relocating to `(tabs)/index.tsx`) |
| REQ-trajectory-line | Polyline coordinates are omitted when today has 0 or 1 check-ins, and are timestamp-ordered when 2+ | unit | new test file, e.g. `src/today/trajectory.test.ts` | ❌ Wave 0 (new file) |

### Sampling Rate
- **Per task commit:** the relevant quick-run command above
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/checkin/checkinRepo.test.ts` — extend with `getTodayCheckins` coverage (REQ-today-view)
- [ ] `src/checkin/photos.test.ts` — extend with resize-to-1600px coverage (REQ-photo-resize), including a fake `resizeDeps` port following the existing `PhotoStorageDeps`/`ImagePickerDeps` pattern in `src/checkin/config.ts` + `src/checkin/deps.ts` (type-only import in `config.ts`, runtime import isolated to `deps.ts`)
- [ ] `src/db/testing/nodeSqliteAdapter.ts` — add `getAllAsync` (Pitfall 3) before any test can exercise `getTodayCheckins` against a real SQLite engine
- [ ] `src/today/trajectory.test.ts` — new file for polyline coordinate derivation logic (pure function, no native deps, easy to unit test)
- [ ] No new framework install needed — Jest/jest-expo already configured and working

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|----------------|---------|--------------------|
| V2 Authentication | No | Single local user, no auth system (per PROJECT.md, Phase 1 has no accounts) |
| V3 Session Management | No | No sessions — local-only app |
| V4 Access Control | No | No multi-user access boundaries |
| V5 Input Validation | Yes | Photo picker results (`asset.uri`) are never used to construct destination filenames — already enforced in `src/checkin/photos.ts` (`buildPhotoFileName` always uses a `crypto.randomUUID()`-derived name, not picker-supplied data) — the new resize step must preserve this: write the *resized* output to a new UUID-derived filename too, not overwrite in place using picker-derived paths |
| V6 Cryptography | No | No cryptographic operations in this phase |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|------------------------|
| Path traversal via picker/EXIF-controlled filename reaching filesystem write | Tampering | Continue the existing pattern (`crypto.randomUUID()`-based destination filenames, never derived from `asset.fileName`/`asset.uri`) for the *resized* photo's output path, not just the original copy |
| Resized photo silently written to `cacheDirectory` instead of `documentDirectory` | Tampering / Information Disclosure (data loss) | REQ-photo-resize explicitly requires `documentDirectory` (never `cacheDirectory`, which iOS can purge under storage pressure) — the resize step's `saveAsync()` destination must be verified to land in `documentDirectory`, same as the existing `copyIntoDocumentDirectory` step in `src/checkin/deps.ts` |

## Sources

### Primary (HIGH confidence)
- `docs.expo.dev/versions/latest/sdk/imagemanipulator/` — new context-based resize API, deprecation of `manipulateAsync`, save format options
- `docs.expo.dev/router/basics/layout`, `docs.expo.dev/router/advanced/nesting-navigators` — `(tabs)` route group pattern, `Tabs` component
- Direct repo reads this session: `package.json`, `src/app/_layout.tsx`, `src/app/index.tsx`, `src/checkin/checkinRepo.ts`, `src/checkin/photos.ts`, `src/checkin/deps.ts`, `src/checkin/draftRepo.ts`, `src/db/migrations.ts`, `src/db/schema.ts`, `src/db/testing/nodeSqliteAdapter.ts`, `src/theme/tokens.ts`, `src/components/NotificationDeniedBanner.tsx`, `src/components/CheckinActionCard.tsx`, `DESIGN.md`, `docs/designs/footlog-product-design.md` — establishes the "already installed" gesture-handler/reanimated finding, the missing `getAllAsync` finding, and all reused patterns
- `npm view @gorhom/bottom-sheet version peerDependencies`, `npm view expo-image-manipulator version`, `npm view react-native-reanimated@4.5.1 peerDependencies` — version/compatibility verification
- `slopcheck scan <pkg> --pkg npm --json` — legitimacy check for both new packages, both `OK`

### Secondary (MEDIUM confidence)
- GitHub issue `gorhom/react-native-bottom-sheet#1828` — MapView + bottom sheet gesture conflict and `pointerEvents: 'box-none'` fix, corroborated across multiple independent WebSearch results/community guides

### Tertiary (LOW confidence)
- Community blog posts on `@gorhom/bottom-sheet`'s exact `animatedPosition` API naming for v5 (Pattern 2, Open Question 2) — pattern is real and multiply-sourced, but exact prop/hook names should be re-verified against the installed package's TypeScript types before implementation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — both new packages verified against npm registry, official docs (image manipulator), and slopcheck; existing gesture-handler/reanimated already-installed finding verified by direct file reads
- Architecture: HIGH — tab shell and query-sharing patterns extrapolate directly from established, already-working conventions in this same codebase (checkinRepo.ts, deps.ts isolation pattern)
- Pitfalls: MEDIUM-HIGH — the `getAllAsync` gap and route-migration/typed-routes pitfalls are HIGH confidence (verified by direct code read); the MapView/bottom-sheet gesture conflict fix is MEDIUM confidence (community-sourced, not official docs, needs simulator verification)

**Research date:** 2026-08-30
**Valid until:** 2026-09-13 (14 days — fast-moving area: bottom sheet library major-version APIs and Expo SDK image manipulator API surface both change between SDK releases)
