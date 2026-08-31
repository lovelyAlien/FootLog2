# Phase 5: Check-in Detail & Edit - Research

**Researched:** 2026-08-31
**Domain:** expo-router 네비게이션 셸 확장(push+탭바유지), react-native-maps 정적 미리보기, react-native-gesture-handler 스와이프 삭제, expo-file-system 사진 교체/삭제, AppState 백그라운드 flush
**Confidence:** HIGH (모든 핵심 API는 설치된 `node_modules` 소스 코드 직접 확인 또는 공식 Expo 문서로 검증됨. 유일한 MEDIUM/LOW 항목은 `BottomSheetFlatList` 안에 스와이프 제스처를 중첩할 때의 실기기/시뮬레이터 상호작용 — 커뮤니티 이슈로만 확인됨)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** 상세화면의 메모 편집은 자동저장이 아니라 **명시적 미저장 경고 방식**을 쓴다 —
  `product-design.md` T13 원문 스펙 그대로. 사용자가 메모를 수정한 뒤 화면을 나가려
  하면(뒤로가기 등) 저장되지 않은 변경 사항이 있을 경우 경고를 보여주고, 확인 없이는
  저장하지 않는다. Day-end 회고(Phase 7)의 "5초 디바운스 자동저장, 경고 없음" 패턴과는
  의도적으로 다른 모델이다. `AppState` background 강제 flush(D-02, 딥링크 유실
  방지용)는 이 결정과 별개로 그대로 유지 — "인앱에서 뒤로가기"는 경고, "OS가 앱을
  백그라운드로 보냄(딥링크 등)"은 조용히 flush, 두 경로가 다르게 동작한다.
- **D-02:** "지도 앱에서 열기" 딥링크로 인한 백그라운드 전환 시에는 D-01의 경고 UI가
  발동하지 않고 `day-end-reflection-map.md`에서 이미 확정된 "`AppState`가 background로
  바뀌는 순간 즉시 저장 실행" 패턴을 그대로 재사용해 조용히 flush한다(DRY). D-01과
  D-02는 서로 다른 트리거(인앱 이탈 vs OS 백그라운드 전환)에 대한 서로 다른 처리이며
  모순이 아니다.
- **D-03:** 상세화면에서 이미 첨부된 사진이 있을 때, 사용자는 교체와 삭제 둘 다 할 수
  있다. 사진을 탭하면 기존 첨부 흐름과 동일한 액션시트(촬영/앨범에서 선택)로 새
  사진으로 교체 가능하고, 별도의 삭제 액션으로 사진을 완전히 제거해 "사진 없음 + 추가
  버튼" 상태로 되돌릴 수 있다.
- **D-04:** 사진 삭제는 확인 없이 즉시 삭제되며, 되돌림(undo)을 제공하지 않는다 —
  체크인 전체 삭제(REQ-checkin-swipe-delete, 4초 undo 스낵바)와는 별개의 가벼운 편집
  액션으로 취급한다. 새 undo UI를 만들지 않는다.
- **D-05:** 체크인 전체 삭제(REQ-checkin-swipe-delete)는 리스트 스와이프로만
  제공한다 — 상세화면에는 별도의 삭제 버튼을 두지 않는다.

### Claude's Discretion

- 정적 지도 미리보기의 정확한 렌더링 방식(MapView `scrollEnabled=false` vs 스냅샷 API).
- 사진 교체 시 기존 파일 삭제 타이밍(새 파일 저장 성공 후 삭제 vs 즉시 삭제).
- "저장 전 화면 이탈 시 미저장 경고" UI의 정확한 형태(네이티브 Alert vs 커스텀
  다이얼로그, 정확한 문구) — UI-SPEC이 이미 네이티브 `Alert.alert` 3버튼으로 확정함
  (아래 UI-SPEC 인용 참고), 연구는 이 결정을 그대로 따른다.
- 메모 저장 실패 재시도 UI를 최초 저장 실패 UI(`CheckinActionCard.tsx` 패턴)와 얼마나
  재사용/공유할지.

### Deferred Ideas (OUT OF SCOPE)

None — 논의가 phase 스코프 안에 머물렀음(05-CONTEXT.md `<deferred>` 참고).

### UI-SPEC.md 추가 확정 사항 (연구가 반드시 따라야 함)

- **레이아웃 순서(고정):** 시간(모노스페이스) → 정적 지도 미리보기(160px 고정 높이,
  radius.md, 인터랙션 전부 비활성) → "지도 앱에서 열기"(텍스트 버튼, `colors.textMuted`,
  accent 아님) → 사진(있으면 최대 240px, 없으면 160px 빈 슬롯) → 메모(`journalEntry`,
  multiline, minHeight 96px).
- **색상:** 스와이프 삭제 어포던스 배경 `colors.pin`(2026-09-01 accent에서 전환, DESIGN.md
  Decisions Log 참고) + 아이콘 `colors.surface`(폭 72px). 정적 지도 마커는
  `colors.pinSoft`(저장된 체크인 규칙과 동일). `Alert.alert`의
  "저장하지 않고 나가기" 버튼은 `style: 'destructive'` 금지 — 전부 `default`.
- **미저장 경고 다이얼로그(신규 카피, 3버튼):** 제목 "저장하지 않은 변경사항이 있어요",
  "계속 편집"(default) / "저장하지 않고 나가기"(default) / "저장하고 나가기"(default).
- **저장 트리거 매트릭스:** 인앱 뒤로가기·스와이프백 → 경고(dirty할 때만) / 딥링크·기타
  AppState background 전환 → 조용히 flush / 텍스트필드 blur(포커스만 이탈) → 아무 것도
  안 함(dirty 상태만 유지) / 사진 삭제·교체 → 즉시 저장(경고 대상 아님).
- **CheckinListRow 탭 전환:** Phase 4가 의도적으로 비활성화(`View`, D-03)했던 것을
  `Pressable`로 뒤집는다. chevron/화살표 등 새 시각 요소 추가하지 않음 — iOS 표준 탭
  하이라이트만.
- **스와이프 삭제:** 왼쪽 스와이프 → 오른쪽에서 삭제 어포던스, 임계값 초과 시 별도
  확인 없이 확정 → 리스트에서 즉시 사라짐 + 4초 undo 스낵바(`colors.textPrimary` 배경,
  `motion.saveStateCrossfadeMs` 180ms 크로스페이드). DB 삭제는 스와이프 즉시가 아니라
  "4초 타이머 만료 시점"에 실행하는 지연 삭제 패턴을 UI-SPEC이 이미 권장함 — 정확한
  구현은 이 문서(RESEARCH)가 확정.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| REQ-checkin-detail-base | 완료된 체크인 행을 탭하면 언제든 메모/사진을 편집할 수 있는 상세화면이 열린다 | Architecture Patterns §1(라우트 구조), §4(beforeRemove 미저장 경고), Code Examples "체크인 단건 조회" |
| REQ-checkin-detail-layout | 시간 → 정적 지도 미리보기 → "지도 앱에서 열기" → 사진 → 메모, 고정 레이아웃 | Architecture Patterns §2(정적 지도 미리보기), Don't Hand-Roll(날짜 포맷), UI-SPEC 레이아웃 인용 |
| REQ-checkin-detail-flush | 저장되지 않은 메모 수정 내용은 AppState 백그라운드 전환 시 강제 flush | Architecture Patterns §5(기존 AppState flush 패턴 재사용), Code Examples "AppState 배경 flush" |
| REQ-maps-deeplink | "지도 앱에서 열기"는 저장되지 않은 수정 내용을 잃지 않고 지도 앱으로 딥링크 | Architecture Patterns §5 + §6(딥링크 URL/Linking), Code Examples "Maps 딥링크" |
| REQ-checkin-swipe-delete | 스와이프 삭제는 Pin(테라코타) 어포던스 + 4초 undo 스낵바, 메모/사진 유무 무관 전부 적용 | Architecture Patterns §3(ReanimatedSwipeable), §7(지연 삭제 패턴), Common Pitfalls "BottomSheetFlatList 제스처 충돌" |
</phase_requirements>

## Summary

Phase 5는 새 npm 패키지를 **하나도 설치하지 않는다** — 필요한 4개 능력(정적 지도,
스와이프 삭제, 사진 파일 삭제, Maps 딥링크)이 이미 설치된 `react-native-maps`,
`react-native-gesture-handler`, `expo-file-system`, `expo-linking`으로 전부
해결된다(설치 여부는 `package.json`/`node_modules` 직접 확인, HIGH). 대신 이 phase의
진짜 난이도는 배선(wiring)에 있다: (1) expo-router에서 "push하면서 탭바를 유지"하려면
`(tabs)/index.tsx`를 **폴더로 재구성**(`(tabs)/index/_layout.tsx` + `index.tsx` +
`[id].tsx`)해야 하고, 이는 기존 배선 회귀 가드 테스트 5개 파일의 경로 상수를 함께
고쳐야 한다(공식 Expo 문서로 검증, HIGH). (2) `beforeRemove` 이벤트는 React
Navigation의 표준 pop 액션 파이프라인에 물려 있어 하드웨어 스와이프백과 헤더 뒤로가기
버튼 둘 다에서 동일하게 발동한다 — expo-router가 벤더링한 react-navigation 코어
소스코드로 직접 확인했다(HIGH, UI-SPEC의 "구현 시 확인 필요" 항목 해소). (3)
"`AppState` 배경전환 강제 flush"는 Phase 5가 처음 만드는 패턴이 아니라 이미
`src/app/(tabs)/index.tsx`(918~939줄)에 정확히 이 모양으로 존재한다 — 상세화면은
자신의 로컬 dirty-note state에 대해 같은 패턴을 한 번 더 구독하면 된다(HIGH).

유일하게 확신도가 낮은 지점은 `BottomSheetFlatList`(`@gorhom/bottom-sheet`) 안에
`ReanimatedSwipeable`(가로 팬)을 중첩할 때의 제스처 경합이다 — GitHub에 문서화된
알려진 이슈이나(MEDIUM, 커뮤니티 소스), 이 저장소에서 직접 검증된 적은 없다.
`activeOffsetX`/`failOffsetY`로 완화 가능하나 실기기·시뮬레이터 확인이 필요하다.

**Primary recommendation:** 새 의존성 설치 없이, (a) `(tabs)/index.tsx`를
`(tabs)/index/{_layout,index,[id]}.tsx`로 재구성해 push+탭바유지를 얻고, (b)
상세화면은 `useNavigation().addListener('beforeRemove', ...)` + 3버튼 `Alert`로
D-01을 구현하고, (c) `AppState` 리스너로 D-02/REQ-checkin-detail-flush를 구현하되
`index.tsx`의 기존 리스너와 동일한 관용구를 그대로 복제하고, (d) 정적 지도는 스냅샷
API가 아니라 인터랙션을 잠근 `MapView`를 재사용하고, (e) 스와이프 삭제는
`ReanimatedSwipeable`(구 `Swipeable` 클래스는 deprecated)로 구현하되 지연 삭제(4초
타이머) 패턴으로 실제 `DELETE`를 늦춘다.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| 체크인 상세 라우팅(push, 탭바 유지) | Frontend Client (expo-router Stack) | — | 순수 클라이언트 사이드 네비게이션, 서버 없음(1단계 로컬 전용) |
| 정적 지도 미리보기 렌더링 | Frontend Client (react-native-maps MapView) | CDN(지도 타일, OS 네이티브 MapKit) | 타일 자체는 애플 지도 서비스가 제공(이미 Phase 3/4가 이 의존성을 확립), 앱은 상호작용만 잠금 |
| 메모/사진 편집 상태(dirty 추적) | Frontend Client (화면 로컬 state) | — | 자동저장 없음(D-01) — 서버/DB는 명시적 flush 시점에만 관여 |
| 체크인 단건 조회/수정/삭제 | Database/Storage (SQLite, `checkinRepo.ts`) | Frontend Client(호출) | 03-RESEARCH.md 이래 확립된 원칙 — SQL은 repo 파일에만 존재, 화면은 호출만 |
| 사진 파일 저장/삭제 | Database/Storage (`documentDirectory`, expo-file-system) | Frontend Client(트리거) | `PROJECT.md` Constraints — 사진은 반드시 `documentDirectory` |
| Maps 앱 딥링크 | Frontend Client (`expo-linking` → iOS 시스템 Maps 앱) | OS(외부 앱) | 앱 경계 밖으로 나가는 URL scheme 호출, 서버 관여 없음 |
| AppState 백그라운드 flush | Frontend Client (React 컴포넌트 effect) | Database/Storage(실제 쓰기) | 트리거는 클라이언트 생명주기 이벤트, 실행은 repo 함수 |

## Standard Stack

### Core

| Library | Version(설치됨) | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `react-native-maps` | 1.27.2 `[VERIFIED: package.json]` | 정적 지도 미리보기(인터랙션 잠금) | Phase 3/4가 이미 지도 렌더링에 쓰고 있음 — 같은 컴포넌트를 잠긴 상태로 재사용, 새 네트워크 의존성 없음 |
| `react-native-gesture-handler` | 2.32.0 `[VERIFIED: package.json]` | 스와이프 삭제(`ReanimatedSwipeable`) | 이미 루트에 `GestureHandlerRootView`로 설치돼 있음(Phase 3부터, Phase 6 캘린더 스크러버용으로 미리 배치). `Swipeable`(구 클래스형)은 소스 상 `@deprecated` — `ReanimatedSwipeable` 사용 `[VERIFIED: node_modules 소스코드, react-native-gesture-handler/src/components/Swipeable.tsx:226]` |
| `expo-file-system` | ~57.0.6 `[VERIFIED: package.json]` | 사진 교체/삭제(`File.delete()`) | 이미 `deps.ts`가 새 클래스 API(`File`/`Paths`)로 사진 복사를 구현 중 — 삭제도 같은 API 계열(`new File(uri).delete()`) `[VERIFIED: node_modules/expo-file-system/build/legacyWarnings.d.ts:19]` |
| `expo-linking` | ~57.0.7 `[VERIFIED: package.json]` | "지도 앱에서 열기" 딥링크(`Linking.openURL`) | 이미 `permissions.ts`가 `openSettings()`에 쓰는 중 — 같은 모듈의 `openURL`/`canOpenURL` 재사용 `[VERIFIED: node_modules/expo-linking/build/Linking.d.ts:59,69]` |
| `expo-router` | ~57.0.16 `[VERIFIED: package.json]` | 신규 push 라우트(`[id].tsx`) + `useNavigation`/`useLocalSearchParams` | 이미 프로젝트의 유일한 네비게이션 프레임워크. React Navigation을 직접 의존성으로 노출하지 않고 자체 벤더링(`expo-router/build/react-navigation/core/...`)해 재구현함 `[VERIFIED: node_modules 소스코드 직접 확인]` |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (신규 없음) | — | — | 이 phase는 신규 패키지를 설치하지 않는다 |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `MapView` 인터랙션 잠금(scrollEnabled 등 false) | Google Static Maps API 스냅샷 이미지 | **채택 안 함** — 이미지 URL을 매 렌더 네트워크로 fetch해야 해 API 키 발급 + 네트워크 의존성이 새로 생김. `PROJECT.md` Out of Scope 표의 "네트워크 호출 필요 기능은 1단계 무네트워크 원칙 위반" 원칙과 정면 충돌. `react-native-maps`도 애플 지도 타일을 받으려면 네트워크가 필요하지만 이는 Phase 3/4에서 이미 확립된 기존 의존성이라 "새로운" 충돌이 아님(05-CONTEXT.md Claude's Discretion 절이 이미 이 구분을 명시) |
| `ReanimatedSwipeable` | 구 `Swipeable`(class 컴포넌트) | **채택 안 함** — 소스 코드에 `@deprecated use Reanimated version of Swipeable instead` 명시. 신규 코드에 deprecated API를 도입할 이유 없음 |
| `expo-router`의 `useNavigation().addListener('beforeRemove', ...)` | `usePreventRemove` 내부 훅 직접 사용 | **채택 안 함** — `usePreventRemove`는 `expo-router/build/react-navigation/core/`에만 존재하는 내부 구현이며 패키지 공개 API(`expo-router` 최상위 export)로 노출되지 않는다(`grep`으로 export 목록 확인, `usePreventRemove` 없음). 공개 API인 `useNavigation` + `addListener`를 쓰는 것이 안전 |
| 지연 삭제(setTimeout + ref) | 낙관적 즉시 DB DELETE 후 undo 시 재삽입(INSERT) | **채택 안 함** — UI-SPEC이 이미 "지연 삭제 패턴 채택 권장"으로 명시. 재삽입 방식은 원래 row의 `created_at`/`id` 등 메타데이터를 그대로 복원해야 하는 추가 로직이 필요해 더 복잡함 |

**Installation:**
```bash
# 설치할 것 없음 — 4개 필요 능력 전부 기존 dependencies로 커버됨
```

**Version verification:** 아래 명령으로 확인함(2026-08-31 실행):
```bash
$ cat package.json | grep -E "react-native-maps|react-native-gesture-handler|expo-file-system|expo-linking|expo-router"
"expo-file-system": "~57.0.6"
"expo-linking": "~57.0.7"
"expo-router": "~57.0.16"
"react-native-gesture-handler": "~2.32.0"
"react-native-maps": "1.27.2"
```
전부 이미 `node_modules`에 실치 확인됨(별도 `npm install` 불필요).

## Package Legitimacy Audit

> 이 phase는 신규 외부 패키지를 설치하지 않는다 — Package Legitimacy Gate(slopcheck)가
> 적용 대상이 없다. 아래는 근거만 기록한다.

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| (해당 없음) | — | — | — | — | — | N/A — 신규 설치 없음 |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
[오늘 뷰 바텀시트: TodayBottomSheet → CheckinListRow]
        │ (탭, D-03 뒤집기: View→Pressable)
        ▼
[expo-router push] ──▶ (tabs)/index/[id].tsx (신규 Stack 라우트, 탭바 유지)
        │
        ▼
[체크인 단건 조회] getCheckinById(db, id) ── SQLite: SELECT * FROM checkins WHERE id=?
        │
        ▼
┌─────────────────────────── 상세화면 렌더 ───────────────────────────┐
│ 1. 시간(모노스페이스, 단순 표시)                                     │
│ 2. 정적 지도(MapView, scroll/zoom/rotate/pitch=false, pinSoft 마커)  │
│ 3. "지도 앱에서 열기" ──▶ [flushNoteAndPhoto() 선행] ──▶ Linking.openURL │
│                              (http://maps.apple.com/?ll=lat,lng)     │
│ 4. 사진(교체=액션시트 재사용 / 삭제=즉시 DB반영+구파일 delete)        │
│ 5. 메모(TextInput, 로컬 dirty state만, 자동저장 없음)                │
└──────────────────────────────────────────────────────────────────────┘
        │                                          │
        │ 인앱 이탈(뒤로가기/스와이프백)              │ AppState 'active'→그외 전환
        ▼                                          ▼
useNavigation().addListener('beforeRemove')   AppState.addEventListener('change')
   dirty? → e.preventDefault() + Alert 3버튼      dirty? → flushNoteAndPhoto() 조용히
   확인 시 → navigation.dispatch(e.data.action)    (경고 없음, D-02)

[바텀시트 리스트 행 스와이프 삭제 — 별도 흐름]
CheckinListRow(ReanimatedSwipeable, renderRightActions)
        │ onSwipeableOpen('right')
        ▼
부모(오늘 화면)의 pendingDelete state: 리스트에서 즉시 숨김 + 4초 setTimeout 시작
        │                                   │
        │ "실행취소" 탭                       │ 4초 경과
        ▼                                   ▼
clearTimeout + 리스트 복원                deleteCheckin(db, id) 실제 DB DELETE 실행
```

### Recommended Project Structure

**필수 재구성 (아래 Pitfall 1 참고 — 회귀 가드 테스트 5개 파일에 영향):**

```
src/app/(tabs)/
├── _layout.tsx            # 변경 없음(Tabs, name="index"/"calendar")
├── index/                 # 신규 폴더 — 기존 index.tsx를 이 폴더 안으로 이동
│   ├── _layout.tsx        # 신규 — <Stack> (오늘 탭 전용 nested stack)
│   ├── index.tsx          # 이동됨 — 기존 (tabs)/index.tsx 내용 그대로(로직 변경 없음)
│   └── [id].tsx            # 신규 — 체크인 상세화면 라우트(얇은 래퍼)
└── calendar.tsx            # 변경 없음(Phase 6이 같은 패턴으로 폴더화할 것)

src/checkin/
├── checkinRepo.ts          # getCheckinById, deleteCheckin 추가
└── checkinDetailFlow.ts    # (신규, 선택) 상세화면 dirty-state 리듀서 — checkinFlow.ts와 동일 원칙

src/today/
├── CheckinListRow.tsx      # Pressable로 전환 + ReanimatedSwipeable 래핑
└── UndoSnackbar.tsx        # 신규 — 4초 undo 스낵바 프레젠테이셔널 컴포넌트
```

**Phase 6 재사용을 위한 사전 정지 작업(과설계 아님, 최소 조치):** 상세화면의 실제 JSX는
`src/app/(tabs)/index/[id].tsx` 라우트 파일 안에 직접 두지 말고 `src/checkin/` 또는
`src/components/`의 프레젠테이셔널 컴포넌트(예: `CheckinDetailScreen.tsx`)로 뽑아
라우트 파일은 `useLocalSearchParams`로 `id`를 읽어 그 컴포넌트에 전달하는 얇은
래퍼로만 유지할 것. 05-UI-SPEC.md가 이미 "Phase 6이 이 상세화면을 재사용은 하되
배선은 자신이 추가"라고 명시했고, Phase 6은 `(tabs)/calendar/...`라는 **다른 탭의
다른 nested stack**에서 진입하므로 같은 파일 경로를 그대로 `push`할 수 없다 — 반드시
별도 라우트 파일에서 같은 컴포넌트를 import해야 한다. 이 분리를 Phase 5에서
해두면 Phase 6이 라우트 파일 하나만 추가하면 된다.

### Pattern 1: expo-router — push하면서 탭바 유지 (nested Stack)

**What:** 특정 탭 안에서 목록→상세로 push하면서 탭바를 계속 보이게 하려면, 그 탭의
폴더 자체를 `_layout.tsx`(Stack)를 가진 서브 디렉토리로 만들어야 한다. 탭 밖(형제
스크린)으로 push하면 Tabs 네비게이터 전체가 화면에서 사라져 탭바도 함께 사라진다.
**When to use:** REQ-checkin-detail-base/layout — "push, 탭바 노출 유지"가 명시적
요구사항(product-design.md 네비게이션 셸 다이어그램, "설정과 동급").
**Example:**
```tsx
// Source: https://docs.expo.dev/router/basics/common-navigation-patterns/
//   ("nesting a stack navigator inside of a tab" 패턴, 2026-08-31 WebFetch로 확인)
// src/app/(tabs)/index/_layout.tsx
import { Stack } from 'expo-router';

export default function TodayStackLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="[id]" options={{ headerShown: true }} />
    </Stack>
  );
}
```
`(tabs)/_layout.tsx`의 `<Tabs.Screen name="index" .../>`는 변경할 필요가 없다 —
expo-router는 `(tabs)/index/index.tsx`를 여전히 "index" 세그먼트로 매칭한다(폴더명이
파일명 대신 세그먼트를 대표).

### Pattern 2: 정적 지도 미리보기 — 스냅샷 API가 아니라 잠긴 MapView

**What:** `MapView`에 `scrollEnabled={false}` `zoomEnabled={false}` `rotateEnabled={false}`
`pitchEnabled={false}`를 주고 `region`을 체크인 좌표로 고정하면 인터랙션 없는 정적
미리보기가 된다. 마커는 Phase 4가 이미 확립한 teardrop 기법(View+회전, SVG 없음)을
`colors.pinSoft`로 그대로 재사용한다.
**When to use:** REQ-checkin-detail-layout §2 — "정적 지도 미리보기(160px, 인터랙션
없음, 마커 1개)".
**Example:**
```tsx
// Source: src/app/(tabs)/index.tsx의 기존 저장된 핀 렌더링(1022~1032줄)을
// 그대로 참고 — 이 phase는 같은 pinWrapper/pinDrop 스타일을 재사용한다.
import MapView, { Marker } from 'react-native-maps';

const MAP_REGION_DELTA = 0.01; // src/app/(tabs)/index.tsx와 동일 상수 재사용

<MapView
  style={{ width: '100%', height: 160, borderRadius: radius.md }}
  region={{
    latitude: checkin.lat,
    longitude: checkin.lng,
    latitudeDelta: MAP_REGION_DELTA,
    longitudeDelta: MAP_REGION_DELTA,
  }}
  scrollEnabled={false}
  zoomEnabled={false}
  rotateEnabled={false}
  pitchEnabled={false}
  pointerEvents="none" // 탭해도 아무 동작 없음(UI-SPEC) — 제스처/onPress 자체를 무력화
>
  <Marker coordinate={{ latitude: checkin.lat, longitude: checkin.lng }} anchor={{ x: 0.5, y: 1 }}>
    <View style={styles.pinWrapper}>
      <View style={[styles.pinDrop, styles.pinSaved]} />
    </View>
  </Marker>
</MapView>
```
`pointerEvents="none"`을 추가로 얹으면 `scrollEnabled` 등 개별 플래그를 다 잠가도
혹시 남아있을 수 있는 제스처 인식 자체를 원천 차단해 "탭해도 아무 동작 없음" 계약을
가장 확실하게 지킨다(react-native-maps 자체 문서화된 옵션은 아니지만 RN 표준
View prop이라 항상 동작).

### Pattern 3: 스와이프 삭제 — `ReanimatedSwipeable`

**What:** 구 `Swipeable`(class, deprecated) 대신 `ReanimatedSwipeable`을 쓴다.
**When to use:** REQ-checkin-swipe-delete.
**Example:**
```tsx
// Source: node_modules/react-native-gesture-handler/src/components/ReanimatedSwipeable/
//   ReanimatedSwipeableProps.ts 직접 확인(2026-08-31)
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { SwipeDirection } from 'react-native-gesture-handler';

<ReanimatedSwipeable
  friction={2}
  rightThreshold={40}
  overshootRight={false}
  renderRightActions={() => (
    <View style={styles.deleteAffordance /* width:72, backgroundColor: colors.pin */}>
      <SymbolView name="trash" tintColor={colors.surface} />
    </View>
  )}
  onSwipeableOpen={(direction) => {
    if (direction === SwipeDirection.RIGHT) onDeleteRequest(checkin);
  }}
>
  <CheckinListRowContent checkin={checkin} />
</ReanimatedSwipeable>
```
**주의(Pitfall 3 참고):** `BottomSheetFlatList` 안에서 가로 팬 제스처가 시트의 세로
팬과 경합할 수 있다 — `activeOffsetX={[-10, 10]}`류로 가로 우세 제스처만 활성화하는
완화책이 있으나 이 저장소에서 직접 검증되지 않았다(MEDIUM, 아래 Pitfall 참고).

### Pattern 4: `beforeRemove` — 인앱 이탈 미저장 경고(D-01)

**What:** `useNavigation().addListener('beforeRemove', ...)`는 화면이 네비게이션
스택에서 제거되기 직전에 발동하며, **하드웨어/제스처 스와이프백과 헤더 뒤로가기 버튼
둘 다** 내부적으로 동일한 "pop 액션"을 디스패치하므로 트리거 경로와 무관하게 똑같이
발동한다.
**검증 근거(HIGH, node_modules 소스 직접 확인):**
`expo-router/build/react-navigation/core/useOnPreventRemove.js`의 `shouldPreventRemove`는
네비게이터의 액션 디스패치 파이프라인(`useNavigationBuilder`) 레벨에서
`beforeRemove`를 emit한다 — UI 트리거(제스처 vs 버튼탭)가 아니라 "액션이 실행되기
전"이라는 시점 자체에 물려 있다. 즉 헤더 백버튼 탭이든 엣지 스와이프 제스처든
동일하게 POP 액션을 만들고, 그 액션이 실제 상태에 반영되기 전에 이 리스너가 항상
먼저 불린다.
**When to use:** REQ-checkin-detail-base(D-01 미저장 경고).
**Example:**
```tsx
// Source: expo-router가 익스포트하는 공개 API(useNavigation)만 사용
// — expo-router/build/react-navigation/core/useOnPreventRemove.js로 동작 검증(2026-08-31)
import { useNavigation } from 'expo-router';
import { Alert } from 'react-native';
import { useEffect } from 'react';

useEffect(() => {
  const sub = navigation.addListener('beforeRemove', (e) => {
    if (!isDirtyRef.current) return; // dirty 아니면 그냥 나가게 둔다
    e.preventDefault();
    Alert.alert(
      '저장하지 않은 변경사항이 있어요',
      undefined,
      [
        { text: '계속 편집', style: 'default' },
        {
          text: '저장하지 않고 나가기',
          style: 'default', // UI-SPEC: destructive 금지(빨강 회피)
          onPress: () => navigation.dispatch(e.data.action),
        },
        {
          text: '저장하고 나가기',
          style: 'default',
          onPress: () => {
            flushNoteAndPhoto();
            navigation.dispatch(e.data.action);
          },
        },
      ]
    );
  });
  return sub;
}, [navigation]);
```
`e.data.action`을 나중에 그대로 `navigation.dispatch`하면 원래 막았던 pop이 그대로
재실행된다 — 이는 React Navigation의 표준 "preventing going back" 관용구이며 이
저장소가 발명한 패턴이 아니다.

### Pattern 5: `AppState` 백그라운드 강제 flush — 이미 존재하는 패턴 재사용

**What:** Phase 5는 이 패턴을 "처음 만드는" 것이 아니다 — `src/app/(tabs)/index.tsx`
918~939줄에 정확히 이 모양의 리스너가 **이미 프로덕션 코드에 존재**한다(SAVED 상태의
메모/사진을 background 전환 시 flush). 상세화면은 자신의 로컬 dirty-note state에
대해 같은 관용구를 한 번 더(별도 컴포넌트 스코프로) 구독하면 된다 — 기존 리스너를
공유하거나 재사용하는 게 아니라 **같은 패턴을 복제**한다(각 화면이 각자의 state를
안다).
**검증 근거(HIGH, 코드 직접 읽음):**
```tsx
// Source: src/app/(tabs)/index.tsx:918-939 (기존 코드, 그대로 인용)
useEffect(() => {
  const subscription = AppState.addEventListener('change', (nextAppState) => {
    if (nextAppState === 'active') {
      // ... 포그라운드 복귀 처리
      return;
    }
    const current = stateRef.current;
    // ... background 전환 시 조용히 flush
    if (canEditNoteAndPhoto(current)) {
      flushNoteAndPhoto();
    }
  });
  return () => subscription.remove();
}, [flushNoteAndPhoto, reloadTodayCheckins]);
```
**When to use:** REQ-checkin-detail-flush, REQ-maps-deeplink(D-02).
**적용 시 차이점:** 상세화면에서는 `nextAppState === 'active'` 분기에서 알림 배너류
로직을 반복할 필요가 없다 — 단순히 "그 외 모든 전환(active가 아닌 상태로)"에서
dirty한 메모가 있으면 조용히 flush하면 된다. `stateRef` 패턴(최신 state를 ref로
미러링해 리스너 재구독 없이 최신값을 읽는 기법)도 그대로 재사용할 것 — 이 리스너는
`[flushNoteAndPhoto]`에만 의존해야 매 렌더 재구독을 피한다(기존 코드의 주석 그대로
적용 가능).

### Pattern 6: Maps 딥링크 — iOS 표준 URL scheme

**What:** 서드파티 지도 SDK 불필요. iOS 표준 Apple Maps URL scheme을 그대로 연다.
**검증 근거(HIGH):** `docs/designs/footlog-product-design.md` 874번째 줄이 이미 이
값을 확정 문서화함: `http://maps.apple.com/?ll=lat,lng` `[CITED:
docs/designs/footlog-product-design.md:874]`.
**Example:**
```tsx
// Source: expo-linking는 이미 permissions.ts가 openSettings()에 쓰는 중
//   (node_modules/expo-linking/build/Linking.d.ts:59 확인)
import * as Linking from 'expo-linking';

async function openInMaps(lat: number, lng: number) {
  flushNoteAndPhoto(); // D-02가 별도로도 AppState 배경전환에서 flush하지만,
                        // 딥링크 호출 직전에도 명시적으로 한 번 flush해 두 경로가
                        // 모두 안전망이 되게 한다(day-end-reflection-map.md의
                        // "여러 트리거가 같은 저장 함수를 부른다" DRY 원칙과 동일).
  await Linking.openURL(`http://maps.apple.com/?ll=${lat},${lng}`);
}
```
`canOpenURL` 사전 체크는 iOS에서 이 scheme이 시스템 앱이라 항상 존재하므로
생략 가능(product-design.md 943번째 줄: "T26 Maps 딥링크 | (해당 없음 — iOS 시스템
앱, 항상 존재)").

### Pattern 7: 지연 삭제(delayed-commit) + 4초 undo

**What:** 스와이프가 임계값을 넘으면 (1) 부모 state에서 해당 id를 "숨김" 처리해 즉시
리스트에서 사라지게 하고, (2) `setTimeout(4000)`을 시작하고, (3) 실제 `DELETE FROM
checkins`는 타이머가 만료된 시점에만 실행한다. "실행취소" 탭 시 타이머를 취소하고
숨김을 해제한다.
**When to use:** REQ-checkin-swipe-delete.
**설계 근거(ASSUMED — 이 저장소의 기존 관용구에서 유추, 외부 검증 없음):**
```tsx
// 부모(오늘 화면, 향후 (tabs)/index/index.tsx)가 소유
const pendingDeleteRef = useRef<{ id: string; timer: ReturnType<typeof setTimeout> } | null>(null);

function handleDeleteRequest(checkin: CheckinRow) {
  // 이미 대기 중인 삭제가 있으면 먼저 확정(단일 스낵바 원칙 — Open Questions 참고)
  commitPendingDeleteIfAny();
  setHiddenIds((prev) => new Set(prev).add(checkin.id));
  const timer = setTimeout(() => {
    deleteCheckin(db, checkin.id)
      .then(() => reloadTodayCheckins())
      .catch((error) => console.error('Failed to commit swipe delete', error));
    pendingDeleteRef.current = null;
    setSnackbarVisible(false);
  }, 4000);
  pendingDeleteRef.current = { id: checkin.id, timer };
  setSnackbarVisible(true);
}

function handleUndo() {
  if (!pendingDeleteRef.current) return;
  clearTimeout(pendingDeleteRef.current.timer);
  setHiddenIds((prev) => {
    const next = new Set(prev);
    next.delete(pendingDeleteRef.current!.id);
    return next;
  });
  pendingDeleteRef.current = null;
  setSnackbarVisible(false);
}
```
**언마운트 시 주의(Pitfall 참고):** cleanup에서 타이머를 그냥 `clearTimeout`만 하면
안 된다 — 그러면 화면을 떠난 순간 삭제가 조용히 취소돼(사용자가 "실행취소"를 누르지
않았는데도) 다음 로드 시 지워졌어야 할 row가 다시 나타난다. 언마운트 cleanup은 타이머를
취소하는 대신 **즉시 커밋**(`deleteCheckin` 호출)해야 한다.

### Anti-Patterns to Avoid

- **Google Static Maps API로 정적 이미지 fetch:** 네트워크+API키 신규 의존성, 1단계
  무네트워크 원칙 위반. 대신 Pattern 2.
- **구 `Swipeable`(class) import:** deprecated. 대신 `ReanimatedSwipeable`.
- **`(tabs)/checkin/[id].tsx`처럼 탭 폴더 밖에 상세화면을 두는 것:** 탭바가 사라짐(nav
  셸 요구사항 위반). 반드시 `(tabs)/index/[id].tsx`처럼 탭 폴더 **안**에 둘 것.
- **`AppState` 리스너를 `active` 분기 없이 등록:** `active`로 돌아올 때도 콜백이
  불리므로, background 전환 판정(`nextAppState !== 'active'`)을 반드시 넣을 것 —
  기존 `index.tsx` 리스너가 이미 이 실수를 피해가는 방식으로 작성돼 있다(참고).
- **스와이프 즉시 `DELETE` 실행 후 undo 시 재삽입:** UI-SPEC이 이미 반려한 접근 —
  Pattern 7의 지연 삭제를 쓸 것.
- **사진 삭제/교체를 D-01의 dirty-state 경고 대상에 포함시키는 것:** UI-SPEC 저장
  트리거 매트릭스가 "사진 삭제·교체 → 즉시 저장(경고 대상 아님)"으로 명시 — 메모만
  dirty 추적 대상.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 로컬 날짜 헤더 타이틀("8월 31일") | 수동 `Date` 파싱/문자열 슬라이싱 | `Intl.DateTimeFormat('ko-KR', { timeZone, month:'long', day:'numeric' })` | `src/checkin/localDate.ts`가 이미 이 원칙(수동 파싱 금지, Intl 전담)을 확립함 — 새 헬퍼도 같은 파일에 같은 스타일로 추가 |
| 저장 실패 자동 재시도 | 새 재시도 라이브러리/카운터 | `runWithSingleRetry`(`checkinRepo.ts`) | 파일 자체 주석에 "Phase 5(T13 상세화면 메모 저장 실패)가 그대로 재사용할 수 있도록 설계됐다"고 명시됨 — 그대로 재사용 |
| 화면 이탈 가로채기 | 커스텀 `router.back()` 래퍼 + 수동 dirty 체크 훅 | `useNavigation().addListener('beforeRemove', ...)` | React Navigation 표준 API, expo-router가 그대로 노출(Pattern 4) — 커스텀 구현은 하드웨어 제스처 경로를 놓치기 쉬움(정확히 UI-SPEC이 우려한 리스크) |
| 사진 파일 삭제 | 수동 경로 조작 + 네이티브 FS 모듈 직접 호출 | `new File(uri).delete()`(expo-file-system) | `.exists`/`.delete()`가 이미 새 클래스 API에 존재, `deps.ts`가 이미 이 API 계열(`File`/`Paths`)로 사진 복사를 구현 중이라 일관성 유지 |
| 스와이프 제스처 인식 | `PanResponder` 직접 구현 | `ReanimatedSwipeable` | iOS 네이티브 스와이프 삭제의 임계값/오버슛/스프링 물리를 이미 검증된 라이브러리가 제공 — 직접 구현하면 04-06-PLAN.md가 이미 겪은 네이티브 애니메이션 경합류 버그를 새로 만들 위험 |
| Maps URL 구성 | 서드파티 지도 딥링크 SDK | `http://maps.apple.com/?ll=lat,lng` 문자열 템플릿 | 표준 라이브러리 없이도 충분한 단순 URL — product-design.md가 이미 조사해 확정한 값 |

**Key insight:** 이 phase의 5개 "Don't Hand-Roll" 항목 중 4개가 **이미 이 저장소
안에 확립된 패턴의 재사용**이다(신규 라이브러리 리서치가 아니라 기존 코드 재사용
리서치) — Phase 5의 진짜 위험은 "무엇을 새로 만들지"가 아니라 "이미 있는 걸
놓치고 새로 만드는 것"이다.

## Common Pitfalls

### Pitfall 1: 라우트 재구성이 기존 회귀 가드 테스트 5개 파일을 깬다

**What goes wrong:** `(tabs)/index.tsx`를 `(tabs)/index/index.tsx`로 옮기면, 이
파일을 정적 소스 분석(`fs.readFileSync`)으로 검증하는 기존 wiring 테스트들이
`ENOENT`로 실패한다.
**Why it happens:** 5개 테스트 파일이 `path.join('(tabs)', 'index.tsx')` 형태의
하드코딩된 경로 상수를 갖고 있다.
**How to avoid:** 아래 정확한 위치를 전부 `path.join('(tabs)', 'index', 'index.tsx')`로
갱신할 것(직접 grep으로 확인한 전체 목록, 2026-08-31):
- `src/app/__tests__/checkin-wiring.test.ts:13` — `TODAY_SCREEN_PATH` 상수
- `src/app/__tests__/foundation-wiring.test.ts:14` — `TODAY_SCREEN_PATH` 상수
- `src/app/__tests__/notification-wiring.test.ts:14` — `TODAY_SCREEN_PATH` 상수
- `src/app/__tests__/today-wiring.test.ts:16` — `TODAY_SCREEN_PATH` 상수
- `src/app/__tests__/tabs-wiring.test.ts:22` — `todayIndexSource` 읽기 경로
- `src/app/__tests__/tabs-wiring.test.ts:32` — `Test 1`의 `fs.existsSync(...)` 단언(리터럴 경로, 상수 아님 — 직접 갱신 필요)

**Warning signs:** `npm test` 실행 시 이 5개 파일에서 대량의 실패(`ENOENT: no such
file or directory`)가 한꺼번에 나타남 — 파일 이동 직후 반드시 전체 테스트 스위트를
돌려 확인할 것.

### Pitfall 2: 새 nested Stack이 헤더 옵션을 상속하지 않는다

**What goes wrong:** 루트 `_layout.tsx`는 `<Stack screenOptions={{ headerShown: false
}} />`를 쓰지만, `(tabs)/index/_layout.tsx`는 **별도의 Stack 인스턴스**라 이
`headerShown: false`를 자동으로 물려받지 않는다.
**Why it happens:** React Navigation의 nested navigator는 각자 독립적인
`screenOptions` 기본값을 가진다.
**How to avoid:** `(tabs)/index/_layout.tsx`에서 `index` 스크린은 명시적으로
`headerShown: false`(오늘 뷰는 원래 헤더 없음), `[id]` 스크린은 `headerShown: true` +
동적 `title`(로컬 날짜)을 명시적으로 설정할 것(Pattern 1 코드 예시 참고).
**Warning signs:** 오늘 뷰 최상단에 의도치 않은 빈 네비게이션 바가 생기거나, 반대로
상세화면에 헤더/뒤로가기 버튼이 아예 안 보임.

### Pitfall 3: `BottomSheetFlatList` 안의 가로 스와이프 제스처 경합 (MEDIUM confidence)

**What goes wrong:** `ReanimatedSwipeable`(가로 팬)을 `@gorhom/bottom-sheet`의
`BottomSheetFlatList`(세로 팬이 이미 지배) 안에 넣으면 제스처 인식기끼리 경합해
스와이프가 씹히거나, 반대로 시트가 리스트 위에서 세로로 안 끌리는 문제가 보고된 바
있다.
**Why it happens:** `@gorhom/bottom-sheet`의 팬 제스처와 `ReanimatedSwipeable`의 팬
제스처가 둘 다 `react-native-gesture-handler` 기반이라 같은 제스처 트리 안에서
우선순위 경쟁이 생긴다.
**Confidence:** MEDIUM `[CITED: github.com/gorhom/react-native-bottom-sheet issues
#1267, #1300 — 커뮤니티에 문서화됨, 이 저장소에서 직접 재현/검증되지 않음]`.
**How to avoid:** `ReanimatedSwipeable`에 `activeOffsetX={[-10, 10]}` (가로 이동이
10px를 넘어야 이 제스처가 활성화)와 필요 시 `failOffsetY={[-5, 5]}`(세로 이동이
먼저 감지되면 이 제스처를 포기하고 부모인 시트의 세로 스크롤에 양보)를 명시적으로
설정해 완화할 것.
**Warning signs:** 시뮬레이터에서 리스트 행을 가로로 스와이프했는데 반응이 없거나,
반대로 시트를 세로로 드래그하려 했는데 행이 옆으로 밀림. **실기기/시뮬레이터
직접 확인이 필요한 항목**(CLAUDE.md의 시뮬레이터 우선 검증 원칙에 따라 구현 단계에서
Xcode Simulator로 먼저 확인할 것 — 네이티브 모듈 구성 변경 없는 JS 레이어 인터랙션
검증이라 시뮬레이터로 충분히 재현 가능).

### Pitfall 4: `PhotoStorageDeps` 포트에 삭제 함수가 없다

**What goes wrong:** 현재 `src/checkin/config.ts`의 `PhotoStorageDeps` 타입은
`copyIntoDocumentDirectory` 하나만 노출한다 — 사진 삭제(D-03/D-04) 또는 교체 시 구
파일 정리를 하려면 이 포트에 삭제 함수가 없어 화면이 `expo-file-system`을 직접
import하게 될 위험이 있다.
**Why it happens:** Phase 3~4는 사진을 "추가"만 했지 "삭제/교체"는 다루지 않았다
(D-03/D-04는 이번 phase의 신규 결정).
**How to avoid:** `PhotoStorageDeps`에 `deleteFile(uri: string): Promise<void>`를
추가하고 `deps.ts`의 `defaultPhotoStorageDeps`에 `new File(uri).delete()` 구현을
더할 것 — 기존 "네이티브 import는 `deps.ts`에만" 격리 규약을 그대로 지킴.
**Warning signs:** 새 화면 파일 안에 `import { File } from 'expo-file-system'`가
직접 등장(격리 위반) — `src/checkin/photos.test.ts` 같은 기존 회귀 가드 스타일로
`checkin-wiring` 계열 테스트가 이 직접 import를 잡아낼 수 있음.

### Pitfall 5: 새 파일 저장 전에 구 파일부터 지우면 실패 시 사진을 완전히 잃는다

**What goes wrong:** 사진 교체 시 "구 파일 삭제 → 새 파일 저장" 순서로 하면, 새 파일
저장(리사이즈/복사)이 실패했을 때 구 파일도 새 파일도 없는 상태가 된다.
**Why it happens:** "먼저 정리하고 새로 쓴다"는 직관적이지만 실패 원자성을 깬다.
**How to avoid:** 반드시 "새 파일 저장 성공 → DB `photo_path` 갱신 성공 → 그 다음에만
구 파일 `delete()`" 순서를 지킬 것(Claude's Discretion 항목의 확정 답). 구 파일
삭제는 non-blocking(실패해도 `console.error`만, 사용자에게 에러 노출 안 함)으로
처리 — 이미 DB는 새 사진을 가리키고 있으므로 구 파일 삭제 실패는 "고아 파일"만
남길 뿐 데이터 유실이 아니다.
**Warning signs:** 사진 교체 도중 앱이 강제 종료됐을 때 사진이 완전히 사라짐(구
파일도 새 파일도 없음) — 이 순서를 안 지켰을 때만 발생.

### Pitfall 6: `setTimeout` 지연 삭제가 AppState 백그라운드 전환 중 정지된다

**What goes wrong:** 스와이프 삭제 후 4초 타이머가 도는 도중 사용자가 홈 버튼을
눌러 앱이 백그라운드로 가면, iOS가 JS 스레드 실행을 정지시켜 `setTimeout`이 정확한
4초에 발동하지 않는다(포그라운드 복귀 시점에 몰아서 발동하거나 즉시 발동).
**Why it happens:** RN의 JS 타이머는 실행 시간 기준이지 벽시계 기준이 아니며, 앱
suspend 중에는 카운트가 진행되지 않는다.
**How to avoid:** 기능적 데이터 유실은 없다(타이머는 언젠가 반드시 발동해 삭제를
커밋한다) — 단지 "정확히 4초"라는 타이밍 보장이 깨질 뿐이다. 이는 기능 버그가
아니라 사소한 타이밍 오차이므로 별도 방어 로직 없이 허용 가능(ASSUMED, Open
Questions 참고).
**Warning signs:** 백그라운드 전환 후 복귀했을 때 스낵바가 이미 사라져 있고 삭제가
이미 커밋돼 있음(정상 — undo 창이 예상보다 짧게 느껴질 뿐).

## Code Examples

### 체크인 단건 조회 + 삭제 — `checkinRepo.ts`에 추가할 함수

```ts
// Source: 기존 checkinRepo.ts의 getTodayCheckins/updateCheckinNoteAndPhoto와
// 동일한 파일·스타일 관례를 따름(이 저장소 안 기존 코드 패턴 재사용)
export async function getCheckinById(
  db: MigratableDb,
  id: string
): Promise<CheckinRow | null> {
  const row = await db.getFirstAsync<CheckinRow>(
    'SELECT * FROM checkins WHERE id = ?',
    id
  );
  return row ?? null;
}

export async function deleteCheckin(db: MigratableDb, id: string): Promise<void> {
  await db.runAsync('DELETE FROM checkins WHERE id = ?', id);
}
```
`getTodayCheckins`/`updateCheckinNoteAndPhoto`의 정확한 기존 시그니처(변경 없이
그대로 재사용):
```ts
// Source: src/checkin/checkinRepo.ts:123-145 (기존 코드 그대로 인용)
export async function getTodayCheckins(
  db: MigratableDb,
  localDateKey: string
): Promise<CheckinRow[]>;

export async function updateCheckinNoteAndPhoto(
  db: MigratableDb,
  id: string,
  args: { note: string | null; photoPath: string | null; now: string }
): Promise<void>;

export async function runWithSingleRetry<T>(
  attempt: () => Promise<T>
): Promise<{ ok: true; value: T } | { ok: false }>;
```

### 로컬 날짜 헤더 포맷 — `localDate.ts`에 추가할 함수

```ts
// Source: src/checkin/localDate.ts의 기존 formatLocalTime과 동일한 관례
// (Intl 전담, 수동 파싱 금지) — 새 함수도 같은 파일에 같은 스타일로 추가
export function formatLocalMonthDay(
  isoTimestamp: string,
  timeZone: string = resolveTimeZone()
): string {
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone,
    month: 'long',
    day: 'numeric',
  }).format(new Date(isoTimestamp));
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| `Swipeable`(class 컴포넌트, `react-native-gesture-handler`) | `ReanimatedSwipeable` | react-native-gesture-handler 최근 버전(설치된 2.32.0 포함)부터 `@deprecated` 표시 | 신규 코드는 반드시 `ReanimatedSwipeable` import 경로(`react-native-gesture-handler/ReanimatedSwipeable`) 사용 |
| `expo-file-system`의 함수형 `deleteAsync(uri)` (legacy) | `new File(uri).delete()` (클래스 기반 새 API) | expo-file-system 새 메이저(SDK 54+, 이 프로젝트가 이미 `deps.ts`에서 채택 중) | `deleteAsync`는 `expo-file-system/legacy`에서만 남아있고 최상위 import에서는 런타임에 throw하는 경고 스텁으로 대체됨 — 반드시 새 클래스 API만 사용 |
| React Navigation 수동 `beforeRemove` 리스너 직접 작성 | 동일 — 이 프로젝트에서는 여전히 표준(`usePreventRemove`는 비공개 내부 API) | — | expo-router가 최신 React Navigation core를 벤더링했지만 편의 훅(`usePreventRemove`)을 공개 API로 노출하지 않으므로, 이 프로젝트에서는 여전히 `useNavigation().addListener('beforeRemove', ...)` 수동 패턴이 맞는 선택 |

**Deprecated/outdated:**
- 구 `Swipeable` class: 위 표 참고, 사용 금지.
- `expo-file-system`의 legacy 문자열 경로 API(`FileSystem.documentDirectory + '...'`
  형태): 이 프로젝트는 이미 처음부터 새 클래스 API(`File`/`Paths`)만 써왔음(03-RESEARCH.md
  Pitfall 2) — Phase 5도 동일 원칙 유지.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | 지연 삭제 언마운트 cleanup은 "취소"가 아니라 "즉시 커밋"해야 한다 | Pattern 7 | 틀리면: 화면 전환 중 스와이프 삭제한 체크인이 조용히 부활(사용자가 undo를 안 눌렀는데도 살아남음) — 데이터 정합성 버그 |
| A2 | 동시에 여러 행을 스와이프하면 "단일 스낵바" 원칙(새 삭제가 이전 pending 삭제를 즉시 확정)을 적용한다 | Pattern 7 | 틀리면: 여러 스낵바가 겹쳐 뜨거나 undo 대상이 모호해짐 — UI-SPEC이 명시하지 않은 gap이라 사용자 확인 필요 |
| A3 | 체크인 전체 삭제(swipe) 시 첨부 사진 파일도 `documentDirectory`에서 함께 정리한다 | Pitfall 4/5 인접 | 틀리면(안 지우면): 고아 사진 파일이 계속 쌓임(기능 버그는 아니나 저장공간 누수) — REQ/CONTEXT 어디에도 명시 안 된 gap, Open Questions 참고 |
| A4 | `setTimeout` 기반 4초 undo 타이머가 AppState 백그라운드 전환 중 지연되는 것은 허용 가능한 사소한 오차다 | Pitfall 6 | 틀리면(제품이 정확한 4초를 요구한다면): 네이티브 타이머(예: 포그라운드 재진입 시 남은 시간 재계산)로 교체 필요 — 별도 구현 비용 발생 |

## Open Questions

> **상태(2026-09-01, `/gsd:plan-phase 5` 계획 단계):** 아래 3건 모두 **RESOLVED**.
> 각 항목의 Recommendation이 그대로 채택돼 특정 PLAN 태스크에 배선됐다 — 미해결 항목은 없다.

1. **지연 삭제의 실제 DB DELETE가 실패하면 어떤 UX를 보여주나?** — ✅ **RESOLVED**
   - What we know: UI-SPEC은 "지연 삭제 패턴 채택 권장"까지만 명시하고, 4초 타이머
     만료 후 실제 `deleteCheckin` 호출이 실패하는 경우(디스크 문제 등)의 UX는
     REQUIREMENTS/CONTEXT/UI-SPEC 어디에도 없다.
   - What's unclear: 이미 스낵바가 사라진 뒤라 사용자에게 재시도 UI를 새로 띄울지,
     조용히 1회 재시도(`runWithSingleRetry` 재사용) 후 실패하면 그냥 로그만 남기고
     다음 `reloadTodayCheckins`가 "여전히 살아있는 row"를 보여주며 자연스럽게
     복구되게 둘지가 결정돼 있지 않다.
   - Recommendation: `runWithSingleRetry`로 조용히 1회 재시도하고, 그래도 실패하면
     별도 UI 없이 `console.error`만 남긴다(다음 목록 새로고침 시 row가 다시 보이는
     것 자체가 암묵적 "실행취소된 것처럼" 자연 복구) — 계획 단계에서 사용자 확인 권장.
   - **Resolution (2026-09-01):** Recommendation 그대로 채택. `05-05-PLAN.md` Task 3의
     `onCommit` 로직이 `runWithSingleRetry(() => deleteCheckin(...))` → 실패 시 새 오류 UI
     없이 `console.error` + `hiddenIds`에서 id 제거(다음 `reloadTodayCheckins`에서 행이 다시
     나타나는 것이 자연스러운 피드백)로 명시돼 있고, 그 판단 근거를 코드 주석에 남기는 것까지
     태스크 범위에 포함됐다. 새 실패 UI를 만들지 않는 것이 이 phase의 확정 스코프다.

2. **체크인 삭제 시 첨부 사진 파일도 함께 삭제해야 하는가?** — ✅ **RESOLVED**
   - What we know: `photo_path`는 `documentDirectory`를 가리키는 단일 필드이고,
     REQ/CONTEXT/UI-SPEC 어디에도 "체크인 삭제 시 사진 정리" 요구사항이 명시돼
     있지 않다(사진 삭제 UX인 D-03/D-04는 상세화면 안에서의 개별 편집만 다룸).
   - What's unclear: 이 phase 스코프가 "체크인 삭제 = 사진 파일까지 정리"를
     포함하는지, 아니면 v1에서는 orphan 파일을 허용하고 나중 phase(예: 설정의 전체
     삭제, 2단계로 연기됨)에서 다룰지.
   - Recommendation: 정리하는 쪽을 권장(Assumption A3) — `deleteCheckin` 성공 후
     `photo_path`가 있었다면 `deleteFile(photoPath)`를 non-blocking으로 호출. 다만
     이 phase의 요구사항 문서에 명시가 없으므로 계획 단계에서 사용자 확인이 필요한
     항목으로 표시.
   - **Resolution (2026-09-01):** 정리하는 쪽으로 확정. `05-02-PLAN.md` Task 3이
     `PhotoStorageDeps.deleteFile` 포트를 추가하고, `05-05-PLAN.md` Task 3이 DB DELETE 성공
     **후에만** non-blocking으로 `deleteFile`을 호출하도록 순서를 계약했다(wiring 테스트가
     줄 번호 인덱스 비교로 순서를 게이트). 고아 파일 누적으로 인한 저장공간 누수를 막는 쪽이
     기본값이며, 파일 삭제 실패는 데이터 유실이 아니므로 사용자에게 노출하지 않는다.

3. **동시에 여러 행을 스와이프 삭제하면 스낵바를 어떻게 처리하나?** — ✅ **RESOLVED**
   - What we know: UI-SPEC은 단일 스낵바 UI만 스펙했고 동시성 케이스는 다루지 않음.
   - What's unclear: 새 스와이프가 이전 pending 삭제를 즉시 확정(Pattern 7의 A2
     가정)할지, 큐잉해 순차 노출할지.
   - Recommendation: 단일 스낵바 + 즉시 확정(A2)이 iOS 네이티브 메일 앱 등의 관례와
     가장 가깝고 구현도 단순 — 계획 단계에서 확정.
   - **Resolution (2026-09-01):** 단일 스낵바 + 즉시 확정으로 확정. `05-05-PLAN.md` Task 1의
     `createPendingDeleteController`가 대기 항목을 **하나만** 유지하고(큐잉하지 않음),
     `request(b)`가 들어오면 `a`를 즉시 커밋한다. 이 동작은 `<behavior>` 케이스
     ("`request(a)` 직후 `request(b)` → `a`가 즉시 커밋되고 `b`만 대기")로 유닛 테스트에
     고정된다.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Apple Maps 앱(URL scheme 대상) | REQ-maps-deeplink | ✓ | iOS 시스템 앱, 항상 존재 | — (제거 불가능한 시스템 앱이라 fallback 불필요) |
| `react-native-maps`, `react-native-gesture-handler`, `expo-file-system`, `expo-linking` | 전체 phase | ✓ | 위 Standard Stack 표 참고 | — |
| iOS Simulator(스와이프 제스처 인터랙션 확인용) | Pitfall 3 검증 | ✓(CLAUDE.md 정책상 우선 활용) | — | 실기기 확인은 시뮬레이터로 재현 불가한 항목(정확한 압력/속도 감지 미세 차이)에 한해서만 |

**Missing dependencies with no fallback:** 없음.
**Missing dependencies with fallback:** 없음 — 이 phase는 전부 이미 확보된 의존성으로 동작.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | `jest` 29.7.0 + `jest-expo/ios` preset `[VERIFIED: package.json, jest.config.js]` |
| Config file | `jest.config.js` (testMatch: `src/**/*.test.{ts,tsx}`) |
| Quick run command | `NODE_OPTIONS=--experimental-sqlite npx jest src/checkin/checkinRepo.test.ts` |
| Full suite command | `npm test` (= `NODE_OPTIONS=--experimental-sqlite jest`) |

이 저장소는 두 가지 테스트 스타일을 병행한다(둘 다 확립된 관례, 새로 발명하지
않음):
1. **Repo/순수함수 테스트** — `@jest-environment node` + 실제 SQLite 엔진
   (`createTestDb` + `migrateDbIfNeeded`), 예: `checkinRepo.test.ts`.
2. **화면 "배선(wiring)" 테스트** — RN 렌더 없이 `fs.readFileSync` + `stripComments`로
   소스 문자열을 정적 분석(정규식 단언), 예: `checkin-wiring.test.ts`.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| REQ-checkin-detail-base | `getCheckinById`/`deleteCheckin` 정상 동작 | unit(SQLite) | `jest src/checkin/checkinRepo.test.ts` | ❌ Wave 0(함수 신규 추가) |
| REQ-checkin-detail-layout | 레이아웃 순서(시간→지도→딥링크→사진→메모) 고정 | wiring(정적 분석) | `jest src/app/__tests__/checkin-detail-wiring.test.ts` | ❌ Wave 0(신규 테스트 파일) |
| REQ-checkin-detail-flush | AppState background 전환 시 flush 호출 | wiring(정적 분석, index.tsx 패턴과 동일 기법) | `jest src/app/__tests__/checkin-detail-wiring.test.ts` | ❌ Wave 0 |
| REQ-maps-deeplink | `Linking.openURL` 호출 전 flush 선행 | wiring(정적 분석) | 동일 파일 | ❌ Wave 0 |
| REQ-checkin-swipe-delete | 지연 삭제(4s) + undo + `deleteCheckin` 최종 실행 | unit(순수 로직 분리 가능하면) + wiring | `jest src/today/*.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** 해당 태스크가 건드린 파일의 개별 테스트만(`jest <file>`).
- **Per wave merge:** `npm test`(전체 스위트) — 특히 Pitfall 1의 5개 wiring 테스트
  파일이 라우트 이동 직후 전부 그린인지 반드시 확인.
- **Phase gate:** `npm test` 전체 그린 + `tsc --noEmit`(이 저장소가 `LOCATION_ACCURACY_BALANCED`류
  컴파일타임 단언에 의존하므로 타입체크도 게이트에 포함할 것).

### Wave 0 Gaps
- [ ] `src/checkin/checkinRepo.test.ts`에 `getCheckinById`/`deleteCheckin` 테스트 케이스 추가.
- [ ] `src/checkin/localDate.test.ts`에 `formatLocalMonthDay` 테스트 케이스 추가.
- [ ] `src/app/__tests__/checkin-detail-wiring.test.ts` 신규 생성(상세화면 레이아웃
      순서/beforeRemove/AppState 배선 정적 분석).
- [ ] 기존 5개 wiring 테스트 파일의 경로 상수 갱신(Pitfall 1 목록).
- [ ] `src/today/__tests__/todayUi.test.ts` 또는 신규 파일에 스와이프 삭제
      지연-커밋 로직 테스트(순수 로직으로 뽑을 수 있다면 유닛, 아니면 wiring).

## Security Domain

> `security_enforcement` 키가 `.planning/config.json`에 없음 — 기본값(활성화)으로 처리.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | 1단계는 단일 사용자, 로컬 전용, 인증 없음(PROJECT.md 확정) |
| V3 Session Management | no | 세션 개념 없음 |
| V4 Access Control | no | 단일 사용자 로컬 앱 |
| V5 Input Validation | yes | 메모 텍스트는 이미 존재하는 자유 입력 필드(신규 입력 표면 아님, SQLite 파라미터 바인딩으로 인젝션 방지 — 기존 `checkinRepo.ts` 관례 그대로 유지). 사진 파일명은 사용자 입력이 아니라 `crypto.randomUUID()` 기반(경로 조작 방어, 기존 `photos.ts` 원칙 유지) |
| V6 Cryptography | no | 해당 없음 |

### Known Threat Patterns for 이 phase

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| 딥링크 URL에 사용자 제어 문자열 삽입 | Tampering | `lat`/`lng`는 항상 DB에 저장된 숫자(`REAL` 컬럼)이지 사용자가 자유 입력한 문자열이 아님 — URL 템플릿에 숫자만 보간, 인젝션 표면 없음 |
| 삭제된 체크인의 사진 파일이 `documentDirectory`에 고아로 남아 저장공간 누수 | (기밀성/무결성보다는 가용성에 가까움, STRIDE 밖 관심사지만 언급) | Open Questions #2 참고 — 삭제 시 사진 파일도 정리 권장 |
| `beforeRemove` 우회로 인한 데이터 유실(경고를 안 보고 초안 소실) | Repudiation에 가까움(사용자가 "몰랐다"고 주장할 수 있는 UX 결함) | Pattern 4가 검증한 대로 `beforeRemove`가 모든 인앱 이탈 경로를 커버 — 우회 경로 없음(검증됨) |

## Sources

### Primary (HIGH confidence)

- `node_modules/react-native-gesture-handler/src/components/Swipeable.tsx` (deprecated 표시 확인)
- `node_modules/react-native-gesture-handler/src/components/ReanimatedSwipeable/ReanimatedSwipeableProps.ts` (API 표면)
- `node_modules/expo-file-system/build/File.d.ts`, `legacyWarnings.d.ts` (`.delete()`/`deleteAsync` deprecated 경고)
- `node_modules/expo-linking/build/Linking.d.ts` (`openURL`/`canOpenURL`)
- `node_modules/expo-router/build/react-navigation/core/usePreventRemove.js`,
  `useOnPreventRemove.js`, `exports.js` (beforeRemove 동작 원리 + `useNavigation` 공개 export 확인)
- 이 저장소의 기존 코드: `src/app/(tabs)/index.tsx`, `src/checkin/checkinRepo.ts`,
  `src/checkin/checkinFlow.ts`, `src/checkin/config.ts`, `src/checkin/deps.ts`,
  `src/checkin/photos.ts`, `src/checkin/localDate.ts`, `src/db/schema.ts`,
  `src/theme/tokens.ts`, `src/today/CheckinListRow.tsx`, `src/today/TodayBottomSheet.tsx`,
  `src/components/CheckinActionCard.tsx`, `src/app/_layout.tsx`, `src/app/(tabs)/_layout.tsx`
- `src/app/__tests__/*.ts`(전체 5개 wiring 테스트 파일, 경로 상수 직접 grep 확인)
- `docs.expo.dev/router/basics/common-navigation-patterns/` (WebFetch, nested Stack
  패턴 확인)
- `docs.expo.dev/router/advanced/native-tabs/` (WebFetch, "Use stacks inside tabs" 확인)
- `docs/designs/footlog-product-design.md` (T13/T26/T11, 네비게이션 셸 다이어그램,
  Maps URL scheme 확정값)

### Secondary (MEDIUM confidence)

- `github.com/gorhom/react-native-bottom-sheet` issues #1267, #1300 — `BottomSheetFlatList`
  안의 가로 제스처 충돌 커뮤니티 보고(Pitfall 3).

### Tertiary (LOW confidence)

- 없음 — 이번 연구는 전부 1차 소스(설치된 패키지 소스코드/공식 문서/이 저장소 자체
  코드) 또는 2차 소스(GitHub 이슈, 명시적으로 MEDIUM 태그)로 검증됨.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — 신규 패키지 없음, 전부 `package.json`/`node_modules` 직접 확인
- Architecture(라우트 재구성, beforeRemove, AppState): HIGH — 소스코드 직접 확인 + 공식 문서 WebFetch
- Pitfalls: HIGH(라우트/헤더/파일삭제 순서) / MEDIUM(제스처 충돌, 커뮤니티 소스만)

**Research date:** 2026-08-31
**Valid until:** 이 프로젝트의 의존성(Expo SDK 57 고정)이 안 바뀌는 한 유효 — 30일
권장(만약 이 사이 `react-native-gesture-handler`/`expo-router`가 업그레이드되면
Swipeable/beforeRemove 관련 항목 재확인 필요)
