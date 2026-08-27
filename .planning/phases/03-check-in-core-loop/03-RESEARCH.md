# Phase 3: Check-in Core Loop - Research

**Researched:** 2026-08-27
**Domain:** iOS 위치 캡처(GPS) + react-native-maps 드래그 가능 핀 + SQLite 즉시 쓰기(+재시도) + 카메라/사진 라이브러리 액션시트 + 포그라운드 전용 위치 권한 거부 플로우
**Confidence:** MEDIUM-HIGH (라이브러리 API는 공식 문서로 검증됨 HIGH, 제품 스펙 내 일부 세부 규칙 — `location_source` enum 5개 값의 정확한 트리거 조건, 저장 재시도 타이밍 — 은 산문 스펙에서 추론한 MEDIUM/LOW 항목이 섞여 있음, Assumptions Log 참고)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**사진 입력의 Phase 3 범위**
- **D-01:** Phase 3에서 사진 첨부 UI를 액션시트(촬영/앨범에서 선택) + 카메라·사진 라이브러리 권한 요청까지 구현한다. 리사이징과 `documentDirectory` 최종 저장 규약(REQ-photo-resize)은 Phase 4로 남긴다.
- **D-02:** 아직 리사이징 전인 원본 사진은 `cacheDirectory`가 아닌 `documentDirectory`에 복사해 임시 보관한다. PROJECT.md의 "사진 저장은 반드시 documentDirectory, cacheDirectory 사용 금지" 원칙을 Phase 3부터 지킨다 — `cacheDirectory`에 두면 OS가 디스크 공간 부족 시 백그라운드 상태의 앱 몰래 파일을 지울 수 있어, `checkins.photo_path` 컬럼이 참조하는 파일이 조용히 사라지는(에러 없이) 위험이 있기 때문.

**드래프트 영속화 저장 방식**
- **D-03:** 확인 핀이 뜬 시점(GPS 캡처 완료 ~ "확인" 탭 사이)의 드래프트는 AsyncStorage가 아닌 **SQLite `drafts` 테이블**로 영속화한다. Phase 1의 기존 마이그레이션 프레임워크(`src/db/migrations.ts`, `PRAGMA user_version`)에 테이블 하나를 추가하는 방식 — 새 저장 엔진(AsyncStorage)을 도입하지 않고 이미 source of truth인 SQLite 안에서 드래프트와 실제 체크인을 같은 트랜잭션 경계로 다룰 수 있게 한다.
- **D-04:** 드래프트는 스펙상 항상 최대 1개만 존재(다중 드래프트 관리 안 함, REQUIREMENTS.md REQ-checkin-confirm-pin 참고)하므로, 고정 PK(예: `id = 'draft'`)를 쓰는 단일 row 패턴으로 구현한다.

**저장 실패 재시도 중 앱 종료 시 동작**
- **D-05:** "확인" 탭 이후 SQLite 쓰기가 자동 재시도 중이거나 "다시 시도" 버튼이 떠있는 상태에서 앱이 강제종료되면, 별도의 "저장 실패" 상태 플래그를 새로 만들지 않고 **기존 드래프트 복구 메커니즘에 통합**한다. `checkins` insert가 성공하기 전까지는 D-03의 드래프트 row가 계속 살아있으므로, 재실행 시 이미 정의된 "이어서 체크인하시겠어요?" 복구 프롬프트가 이 케이스도 자동으로 커버한다 — insert 성공 직후에만 드래프트 row를 삭제한다.

**Phase 3의 임시 UI 호스팅**
- **D-06:** Today view(지도+바텀시트, Phase 4)가 아직 없으므로, Phase 3의 체크인 버튼/확인 핀 플로우는 **최소 지도 화면 + 체크인 버튼**에 놓는다 — `react-native-maps`로 전체화면 지도를 바로 띄우고(미니맵/바텀시트 없이) 그 위에 체크인 알약버튼만 얹는다. Phase 4에서 이 지도 위에 바텀시트/리스트를 씌우면 되므로, 지도 렌더링·GPS 캡처·확인 핀 드래그 로직을 그대로 재사용할 수 있다. 화면이 실제로 존재하므로 사용자가 직접 탭하며 확인하는 수동 QA도 가능하다.

**위치 완전 실패 시 최종 폴백 좌표**
- **D-07:** 위치 권한도 없고 최근 체크인도 없고(즉 최초 실행) 지도 마지막 표시 좌표도 없는 상황(3단계 폴백 체인이 모두 실패)에서 쓸 "고정 기본 좌표"는 **창업자 본인의 집/자주 가는 고정 장소 좌표**로 하드코딩한다. 1단계가 창업자 1인용 로컬 앱이므로, 의미 없는 임의 좌표(0,0 등)보다 실제 생활권 좌표를 쓰는 게 최초 실행 시 지도 경험에 낫다는 판단. **정확한 좌표값은 계획/구현 단계에서 창업자에게 확인 — 이 리서치는 임의 좌표를 만들어내지 않는다.**

### Claude's Discretion
- 확인 핀 드래그 제스처와 지도 팬 제스처 간의 우선순위 충돌 처리 방식 — 기술 구현 세부사항으로 연구/계획 단계에서 판단 (아래 Architecture Patterns / Common Pitfalls 참고).
- GPS 저정확도/폴백 상태를 나타내는 핀 색상/아웃라인의 정확한 시각적 차이값 — DESIGN.md 토큰 범위 내에서 UI-SPEC 또는 구현 단계에서 결정.
- `drafts` 테이블의 정확한 컬럼 스키마(체크인과 동일 필드를 얼마나 재사용할지) — 아래 Architecture Patterns에서 스키마 설계안 제시.

### Deferred Ideas (OUT OF SCOPE)
None — 논의가 phase 스코프 안에 머물렀음(사진 리사이징 자체는 이미 REQ-photo-resize로 Phase 4에 배정된 기존 스코프 경계이며, 이번 논의는 그 경계를 재확인했을 뿐 새로 옮긴 게 아님).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| REQ-checkin-core | 체크인을 탭하면 위치를 캡처해 즉시 SQLite에 저장한 뒤, 선택적으로 사진/메모 입력을 허용한다 | Architecture Patterns (state machine, `checkins` insert helper), Code Examples (위치 캡처 레이스, 사진 액션시트+`documentDirectory` 복사), Don't Hand-Roll (UUID, 날짜/타임존 포맷) |
| REQ-checkin-write-failure-ui | 저장이 실패하면 앱이 자동으로 한 번 재시도한 뒤 "저장하지 못했어요" + 재시도 버튼을 표시하며, 저장이 성공할 때까지 메모/사진 입력을 막는다 | Architecture Patterns (state machine 저장 상태 전이), Common Pitfalls (SQLite 쓰기 실패 감지 방법, 재시도 타이밍 미확정 — Open Questions) |
| REQ-checkin-confirm-pin | 앱은 항상 드래그 가능한 확인 핀을 보여주며 5초 타임아웃 시 마지막으로 알려진 위치로 폴백하고, `drafts` 테이블로 확인 핀 구간 드래프트가 영속화된다(날짜 경계 만료·저장 시 삭제·단일 드래프트·권한 변경 강건성 포함) | Architecture Patterns (`drafts` 스키마안, state machine, 마이그레이션 확장 패턴), Common Pitfalls (`getCurrentPositionAsync`엔 timeout 옵션이 없음 — 직접 race 필요, Marker `draggable`과 MapView pan 충돌) |
| REQ-location-denied-flow | 위치 권한이 거부되면 사용자는 알림 거부와 동일한 조용한 배너+설정 딥링크 패턴을 보며, OS 캐시가 아닌 앱 소유의 폴백 위치가 뒷받침한다 | Architecture Patterns (3단계 폴백 체인, 알림 배너 컴포넌트 재사용/복제 패턴), Code Examples (권한 재확인 훅), Open Questions (D-07 좌표값, Phase 3/4 권한 요청 시점 경계) |
</phase_requirements>

## Summary

Phase 3는 4개의 새 Expo SDK 네이티브 모듈(`expo-location`, `expo-image-picker`, `expo-file-system`, `react-native-maps`)을 이 프로젝트에 처음 도입한다 — 전부 npm 레지스트리·slopcheck 검증을 통과했고 Expo SDK 57과 호환되는 버전이 존재한다(Standard Stack 참고). 이 4개는 전부 **네이티브 모듈**이라 설치 후 **새 EAS Dev Client 빌드가 필요**하다(기존 dev client 바이너리에는 링크돼 있지 않음) — 이건 이미 PROJECT.md에 문서화된 "EAS Dev Client 필수" 제약의 연장선이다.

핵심 기술 리스크 3가지: (1) `expo-location`의 `getCurrentPositionAsync()`는 **공식 API에 `timeout` 옵션이 없다** — 5초 타임아웃은 `Promise.race`로 직접 구현해야 하며, GitHub 이슈들이 구버전 `timeout` 필드가 예외를 던지는 사례를 보고하고 있어 이 옵션에 의존하면 안 된다. (2) `expo-file-system`은 SDK 54+부터 **새 클래스 기반 API(`File`/`Directory`/`Paths`)가 기본**이고 예전 `FileSystem.documentDirectory` + `copyAsync()` 스타일은 `expo-file-system/legacy`로 이동했다 — 신규 Phase 3 코드는 새 API(`Paths.document`, `file.copy()`)로 작성해야 한다. (3) `react-native-maps`의 `Marker draggable`은 네이티브(MapKit) 레벨에서 지도 팬과 핀 드래그 제스처를 자체적으로 중재하므로 **iOS 전용 프로젝트에서는 커스텀 `react-native-gesture-handler` 배선이 필요 없다** — 다만 드래그 종료 직후 다른 버튼이 일시적으로 터치에 반응하지 않는 커뮤니티 이슈가 존재해 QA 시 확인이 필요하다.

기존 코드베이스는 이미 강한 DI(의존성 주입) 관례를 확립해뒀다: `config.ts`(타입 전용 import) + `deps.ts`(런타임 import, 유일한 진입점) + `testing/fake*.ts`(테스트 더블) 3파일 분리 패턴(Phase 2 알림 모듈)과, `MigratableDb`처럼 SDK 타입에서 필요한 메서드만 `Pick`하는 관례(Phase 1 DB 모듈)가 그것이다. Phase 3는 위치 캡처·사진 선택·체크인 insert에도 **동일한 패턴을 그대로 복제**해야 한다 — 새 패턴을 발명하지 말 것.

**Primary recommendation:** `npx expo install expo-location expo-image-picker expo-file-system expo-crypto react-native-maps`로 SDK 호환 버전을 설치하고, 새 EAS Dev Client를 먼저 빌드한 뒤, `drafts` 테이블을 `migrations.ts`의 `currentDbVersion === 1` 분기로 추가하고, 위치/사진 캡처 로직은 Phase 2와 동일한 `config.ts`/`deps.ts` DI 분리로 작성한다.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| GPS 위치 캡처(+5초 타임아웃 레이스) | Browser/Client (디바이스 네이티브 API) | — | `expo-location`은 온디바이스 네이티브 모듈 호출, 서버 왕복 없음 |
| 확인 핀 드래그 UI + 지도 렌더링 | Browser/Client | — | `react-native-maps`는 순수 클라이언트 렌더링, MapKit 네이티브 뷰 |
| 위치/카메라/사진 라이브러리 권한 요청·상태 판정 | Browser/Client | — | OS 권한 API, 서버 개념 없음(1단계는 백엔드 없음) |
| 체크인/드래프트 SQLite 쓰기(+재시도) | Database/Storage | Browser/Client(호출부) | `expo-sqlite`가 곧 이 앱의 "DB 계층" — 별도 백엔드 없음, 클라이언트 프로세스 안에서 로컬 파일 DB에 직접 씀 |
| 사진 원본 `documentDirectory` 복사 | Database/Storage (파일시스템도 영속 계층으로 취급) | Browser/Client(호출부) | `expo-file-system`은 로컬 영속 저장소에 대한 파일 I/O — SQLite와 동급의 "저장" 책임 |
| 위치 권한 거부 배너 + 설정 딥링크 | Browser/Client | — | `NotificationDeniedBanner`(Phase 2)와 동일 계층, 순수 UI+`Linking` 호출 |
| 드래프트 만료 판정(날짜 경계) | Database/Storage(데이터 규칙) | Browser/Client(호출 시점) | SQLite에 저장된 `created_at`/`local_date_key`를 기준으로 한 순수 데이터 규칙 — UI는 그 결과만 소비 |

이 앱은 클라이언트 단일 프로세스(백엔드 없음, PROJECT.md 확정)이므로 "Frontend Server(SSR)"/"API 백엔드"/"CDN" 티어는 이 phase는 물론 프로젝트 전체에 존재하지 않는다. 오분류 위험이 있는 지점은 "SQLite 쓰기 실패 재시도 로직을 UI 컴포넌트 안에 직접 넣는 것" — 이건 Database/Storage 책임(재시도 가능한 insert 함수)과 Browser/Client 책임(재시도 버튼 표시)을 분리하지 않는 흔한 실수이므로, Common Pitfalls에서 별도로 다룬다.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `expo-location` | `~57.0.14` [VERIFIED: npm registry] | 포그라운드 위치 권한 요청/판정, `getCurrentPositionAsync`(1회성 GPS 캡처), `getLastKnownPositionAsync`(OS 캐시 위치) | Expo 공식 SDK 모듈, `expo/expo` 모노레포 소속(2018년부터 존재, 이미 CEO/Eng 리뷰에서 확정된 1단계 의존성) |
| `react-native-maps` | `1.29.0`(`latest` dist-tag) [VERIFIED: npm registry] | 전체화면 지도(D-06) + 드래그 가능 확인 핀(`Marker draggable`) | 이미 product-design.md Recommended Approach + Dependencies 섹션에서 확정된 1단계 의존성, iOS Apple Maps 기본 provider는 API 키 불필요 |
| `expo-image-picker` | `~57.0.14` [VERIFIED: npm registry] | 사진 액션시트(D-01) — 카메라 촬영(`launchCameraAsync`)/앨범 선택(`launchImageLibraryAsync`) + 권한 요청 | Expo 공식 SDK 모듈, 카메라+라이브러리 두 경로 모두 표준 API로 커버 |
| `expo-file-system` | `~57.0.6` [VERIFIED: npm registry] | 원본 사진을 `documentDirectory`로 복사(D-02) — 새 클래스 기반 API(`File`/`Directory`/`Paths`) 사용 | Expo 공식 SDK 모듈, SDK 54+부터 새 API가 기본값(State of the Art 참고) |
| `expo-crypto` | `~57.0.2` [VERIFIED: npm registry] | `checkins`/`drafts` row `id` 생성용 UUID(`Crypto.randomUUID()`) | Hermes는 `crypto.randomUUID()`를 네이티브로 제공하지 않음(폴리필 필요) — Expo SDK가 이미 네이티브 모듈로 제공하므로 별도 폴리필 불필요 |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `react-native-gesture-handler` | 이미 설치됨(`~2.32.0`) | (아마 불필요, 확인용) 확인 핀 드래그가 네이티브 MapKit 레벨에서 처리되지 않는 예외 상황 발생 시 대체 제스처 구현 | 커뮤니티 이슈(드래그 후 버튼 무반응 등)가 iOS 실기기에서도 재현되면 폴백 옵션으로만 고려 — 기본 경로는 `Marker draggable` prop만으로 충분 (Common Pitfalls 참고) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `react-native-maps` | `@rnmapbox/maps`, `expo-maps`(SDK 실험적) | `react-native-maps`는 이미 product-design.md에서 확정된 의존성이자 가장 성숙한 커뮤니티 표준 — 재검토 대상 아님(CONTEXT.md 범위 밖) |
| `expo-crypto`의 `randomUUID()` | `react-native-get-random-values` + `uuid` npm 패키지 | Expo 관리형 프로젝트에서는 네이티브 모듈 직접 호출 방식(`expo-crypto`)이 전역 폴리필 주입 방식보다 이미 설치된 Expo 모듈 관례(모든 기존 의존성이 `expo-*`)와 일치해 더 단순함 |
| 새 클래스 기반 `expo-file-system` API | `expo-file-system/legacy`(`FileSystem.documentDirectory` + `copyAsync`) | 레거시 API는 SDK 57에서 여전히 동작하지만 문서가 "will throw in runtime for direct import" 경고를 명시 — 신규 코드에 레거시 경로를 쓸 이유가 없음, State of the Art 참고 |

**Installation:**
```bash
npx expo install expo-location expo-image-picker expo-file-system expo-crypto react-native-maps
```
`npx expo install`을 쓰는 이유: 기존 `package.json`의 모든 `expo-*` 의존성이 `~57.x.x` 범위로 고정돼 있고(예: `"expo-font": "~57.0.1"`), 이 명령이 Expo SDK 57과 실제로 검증된 버전 조합을 자동 계산해 동일 관례를 유지한다. `npm install`로 직접 설치하면 SDK 57과 맞지 않는 최신 버전이 깔릴 위험이 있다(예: 위 registry 조회 시점에 SDK 58 canary 버전도 같이 배포돼 있었음).

**Version verification:** 위 4개 SDK 모듈 버전은 `npm view <pkg> versions`로 2026-08-27에 직접 조회해 확인함(Bash 실행 결과, Standard Stack 표의 `[VERIFIED: npm registry]` 태그 근거). `react-native-maps`는 `npm view react-native-maps dist-tags`로 `latest: 1.29.0`을 확인했고, peerDependencies(`react-native >= 0.76.0`, `react >= 18.3.1`)가 현재 프로젝트의 `react-native@0.86.2`/`react@19.2.3`을 만족함을 확인함.

## Package Legitimacy Audit

slopcheck 0.6.1이 환경에 이미 설치돼 있어 실제로 실행함(`slopcheck scan --pkg npm <pkg>` — 설치 부작용 없는 스캔 전용 모드로 재실행, 최초 `slopcheck install` 호출이 의도치 않게 `npm install`을 실행해 `package.json`을 수정한 것을 발견해 `git checkout`으로 즉시 되돌리고 `npm install`로 `node_modules`를 원복함 — 리서치 단계에서 실제 의존성 설치는 plan/execute 단계 소관).

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| `expo-location` | npm | ~8년(2018-08) | 매우 높음(Expo 공식 SDK 모듈) | github.com/expo/expo | [OK] | Approved |
| `expo-image-picker` | npm | ~7.5년(2019-02) | 매우 높음 | github.com/expo/expo | [OK] | Approved |
| `expo-file-system` | npm | ~8년(2018-07) | 매우 높음 | github.com/expo/expo | [OK] | Approved |
| `react-native-maps` | npm | ~10년(2016-01) | 매우 높음(커뮤니티 표준 지도 라이브러리) | github.com/react-native-maps/react-native-maps | [OK] | Approved |
| `expo-crypto` | npm | ~7년(2019-02) | 높음 | github.com/expo/expo | [OK] | Approved |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

모든 패키지가 slopcheck [OK] 판정 + `expo/expo` 공식 모노레포 또는 `react-native-maps` 캐노니컬 리포로 확인됨 — Package name provenance rule에 따라 이 패키지명들은 CEO/Eng 리뷰 문서(`docs/designs/footlog-product-design.md` Recommended Approach 섹션, 이미 창업자가 확정한 1단계 의존성 목록)에서 최초로 언급된 것이며 이 리서치는 그 이름을 npm 레지스트리로 존재 확인 + slopcheck로 안전성 확인한 것 — Standard Stack 표에는 이를 반영해 `[VERIFIED: npm registry]`로 표기함(레지스트리 존재만으로는 `[VERIFIED]`를 못 받는다는 프로토콜과 별개로, 이 패키지들은 공식 문서(docs.expo.dev)로도 동시에 교차 확인됨 — Sources 섹션 참고).

## Architecture Patterns

### System Architecture Diagram

```
[사용자가 "체크인" 알약버튼 탭 (D-06: 최소 지도 화면)]
              |
              v
   [위치 권한 상태 확인] ---- undetermined ----> [requestForegroundPermissionsAsync 호출]
              |                                              |
       granted|                                       거부/취소|          허용|
              v                                              v            |
   [getCurrentPositionAsync                         [자체 폴백 체인 진입]<--+
     vs 5초 타임아웃 Promise.race]                    (아래 폴백 체인 참고)
              |                    |
         5초 내 성공|          5초 타임아웃|
              |                    v
              |         [getLastKnownPositionAsync(OS 캐시)]
              |                    |            |
              |               성공|         null|
              |                    |            v
              |                    |    [자체 폴백 체인 진입]
              v                    v
       +---------------------------------------+
       |  drafts 테이블에 즉시 UPSERT           |  <- D-03/D-04: 고정 PK 'draft'
       |  (lat, lng, accuracy, location_source) |     단일 row, 화면 이탈/강제종료 생존
       +---------------------------------------+
              |
              v
   [지도 위 드래그 가능 확인 핀 렌더링 (react-native-maps Marker draggable)]
              |
       onDragEnd 시마다 drafts row UPDATE (location_source -> gps_dragged)
              |
       사용자가 "확인" 탭
              |
              v
   [checkins INSERT 시도] --실패--> [자동 재시도 1회] --실패--> [에러 UI: "저장하지 못했어요" + 다시 시도]
              |성공                                                    | 사용자가 "다시 시도" 탭
              v                                                        |
   [drafts row DELETE (D-05: insert 성공 직후에만 삭제)]<-----------------+ (성공 시)
              |
              v
   [메모/사진 입력 화면 (선택) — 사진은 액션시트 -> documentDirectory 복사]

  === 위치 권한 거부/실패 시 자체 폴백 체인 (D-07, OS 캐시 사용 불가) ===
  [가장 최근 checkins row의 lat/lng] --없으면--> [지도 마지막 표시 좌표(인메모리)] --없으면--> [하드코딩 기본 좌표(창업자 확인 필요)]
```

### Recommended Project Structure
```
src/
├── checkin/                    # 신규 — Phase 3
│   ├── config.ts                # 타입 전용: LocationDeps, ImagePickerDeps 타입 정의 (Notifications config.ts 패턴 복제)
│   ├── deps.ts                  # 런타임 import 유일 지점: expo-location/expo-image-picker/expo-file-system/expo-crypto
│   ├── location.ts               # captureLocationWithFallback(deps): 5초 race + getLastKnownPositionAsync + 자체 폴백 체인
│   ├── permissions.ts            # 위치 권한 판정/요청/배너 훅 — notifications/permissions.ts와 동일 구조로 복제
│   ├── photos.ts                  # 액션시트 핸들러 + documentDirectory 복사(D-02)
│   ├── checkinRepo.ts             # checkins INSERT(+재시도 1회) — DB 계층, UI에서 분리
│   ├── draftRepo.ts               # drafts UPSERT/DELETE/조회(단일 row) — DB 계층
│   └── testing/
│       ├── fakeLocation.ts        # notifications/testing/fakeNotifications.ts 패턴 복제
│       └── fakeImagePicker.ts
├── components/
│   └── LocationDeniedBanner.tsx  # NotificationDeniedBanner.tsx 복제/재사용 후보 (아래 Pattern 3 참고)
├── db/
│   ├── schema.ts                 # CREATE_DRAFTS_TABLE_SQL 추가 (기존 파일 확장)
│   └── migrations.ts             # currentDbVersion === 1 분기 추가 (기존 파일 확장, DATABASE_VERSION 2로 증가)
└── app/
    └── index.tsx (또는 신규 checkin 화면) # D-06: react-native-maps MapView + 체크인 버튼, 기존 부팅 placeholder 대체
```

### Pattern 1: DI 3파일 분리 (Phase 2 알림 모듈에서 이미 확립된 관례, 그대로 복제)

**What:** 네이티브 SDK 타입은 `config.ts`에서 타입 전용(`import type`)으로만 참조하고, 실제 런타임 함수 객체는 `deps.ts` 한 파일에서만 조립해 기본값으로 export한다. 로직 함수는 `deps: XxxDeps = defaultXxxDeps` 형태로 주입받는다.

**When to use:** 위치 캡처, 사진 선택, 권한 요청 등 네이티브 모듈을 호출하는 모든 함수.

**Example (기존 코드, 그대로 재사용할 패턴):**
```typescript
// src/notifications/config.ts — 이미 존재하는 패턴, checkin/config.ts가 복제할 대상
import type * as Notifications from 'expo-notifications';

export type NotificationDeps = Pick<
  typeof Notifications,
  | 'scheduleNotificationAsync'
  | 'cancelScheduledNotificationAsync'
  | 'getAllScheduledNotificationsAsync'
  | 'getPermissionsAsync'
  | 'requestPermissionsAsync'
>;
```
```typescript
// src/notifications/deps.ts — 이 파일에서만 런타임 import 허용
import * as Notifications from 'expo-notifications';
export const defaultNotificationDeps: NotificationDeps = {
  scheduleNotificationAsync: Notifications.scheduleNotificationAsync,
  // ...
};
```
**Phase 3 적용:** `checkin/config.ts`에 `LocationDeps = Pick<typeof Location, 'getForegroundPermissionsAsync' | 'requestForegroundPermissionsAsync' | 'getCurrentPositionAsync' | 'getLastKnownPositionAsync'>` 형태로 정의, `checkin/deps.ts`가 유일한 `import * as Location from 'expo-location'` 지점이 되도록 한다. 이렇게 하면 `@jest-environment node` 유닛 테스트가 `expo-location` 네이티브 모듈을 로드하지 않고도 5초 타임아웃 레이스/폴백 체인 로직을 순수 함수로 검증할 수 있다(Phase 2 `scheduling.test.ts`와 동일한 격리).

### Pattern 2: `getCurrentPositionAsync`에 없는 timeout을 직접 구현

**What:** `expo-location`의 `getCurrentPositionAsync(options)`에는 신뢰 가능한 `timeout` 옵션이 없다(공식 문서에 명시적으로 없음, 구버전 API의 `timeout` 필드는 즉시 예외를 던지는 사례가 보고돼 있음 — GitHub `expo/expo#2226`). 5초 타임아웃은 호출부에서 `Promise.race`로 직접 구현해야 한다.

**Example:**
```typescript
// src/checkin/location.ts (신규 작성 예시 — Source: docs.expo.dev/versions/latest/sdk/location/ API 시그니처 + 자체 구현)
import type { LocationDeps } from './config';

const CAPTURE_TIMEOUT_MS = 5000; // DESIGN.md/product-design.md 확정값(실측 근거 없는 초기 추정치로 명시돼 있음)

function timeoutAfter<T>(ms: number): Promise<T | null> {
  return new Promise((resolve) => setTimeout(() => resolve(null), ms));
}

export async function captureCurrentPosition(deps: LocationDeps) {
  const positionPromise = deps.getCurrentPositionAsync({ accuracy: 3 /* Balanced */ });
  const result = await Promise.race([positionPromise, timeoutAfter<null>(CAPTURE_TIMEOUT_MS)]);
  if (result !== null) {
    return { kind: 'gps_success' as const, position: result };
  }
  // 5초 타임아웃 — positionPromise는 백그라운드에서 계속 진행 중일 수 있으므로 흡수만 하고 버림
  positionPromise.catch(() => {});
  return { kind: 'timeout' as const };
}
```
**Pitfall 주의:** `Promise.race`로 "버려진" `getCurrentPositionAsync` 프로미스가 나중에 resolve/reject될 때 unhandled rejection이 되지 않도록 `.catch(() => {})`로 반드시 흡수한다(repo 규약 — 프로미스를 조용히 삼키지 않되, 여기선 "이미 타임아웃 처리를 끝낸 뒤의 지연 응답"이므로 명시적으로 버리는 것이 의도된 동작).

### Pattern 3: 위치 권한 거부 배너 — `NotificationDeniedBanner` 재사용 vs 복제

**What:** `src/components/NotificationDeniedBanner.tsx`(Phase 2)는 이미 "화면별 로직/위치 지정을 내부에 갖지 않는다, 배치는 항상 부모가 결정한다"는 계약으로 설계됨(파일 헤더 주석에 명시). 위치 권한 배너는 문구·아이콘·톤이 100% 동일한 패턴(`colors.surface` 불투명 배경, `typography.helperText`, `Linking.openSettings()`)이므로 컴포넌트 자체를 제네릭화하거나 `LocationDeniedBanner.tsx`로 얇게 복제한다.

**권장:** 새 컴포넌트 `LocationDeniedBanner.tsx`를 만들되 내부 로직은 `src/checkin/permissions.ts`의 `useLocationPermissionBanner()` 훅(=`notifications/permissions.ts`의 `useNotificationPermissionBanner()`를 위치 권한으로 그대로 복제)에서 가져온다. product-design.md가 "두 배너가 동시에 뜨면 세로로 스택(알림 배너 위, 위치 배너 아래)"을 명시했으므로, 두 배너를 감싸는 부모 컨테이너(예: `index.tsx` 또는 신규 체크인 화면)가 순서를 고정한다 — 배너 컴포넌트 자체는 서로의 존재를 모른 채 독립적으로 렌더링된다.

**차이점(주의):** `shouldShowDeniedBanner`는 알림 권한에서 `permission.status === 'denied'`만 체크했다. 위치 권한은 iOS에서 "Location Services 전역 꺼짐"과 "앱별 거부"를 구분하지 않기로 의도적으로 단순화했으므로(PROJECT.md Context, product-design.md), 판정 함수는 그대로 재사용 가능하되 배너 문구만 "위치 권한이 꺼져 있어요 · 설정에서 켜기"로 바뀐다.

### Pattern 4: `drafts` 테이블 스키마 설계안 (Claude's Discretion — CONTEXT.md D-03/D-04 구조 안에서 결정)

드래프트가 존재하는 구간은 "GPS 캡처 완료(확인 핀 표시) ~ '확인' 탭"이며, 이 시점엔 메모/사진 입력 화면이 아직 열리지 않는다(product-design.md 확정: 메모/사진은 저장 성공 이후 화면). 또한 D-05에 따라 "확인" 탭 이후 저장 재시도 중 강제종료도 **같은 드래프트 row**로 커버해야 하므로, 드래프트는 최종 `checkins` insert에 필요한 컬럼만 들고 있으면 충분하다 — "확인" 탭이 곧 최종 타임스탬프를 확정하는 시점이므로, 복구 시에는 굳이 "저장 중이었다"는 상태를 별도로 구분하지 않고 **항상 확인 핀 화면으로 재진입**시켜 사용자가 다시 "확인"을 누르게 하는 것이 D-05의 "별도 상태 플래그 없이 통합 커버"라는 의도에 가장 부합한다(재시도 몇 초 지연은 개인용 앱에서 무해).

```sql
-- src/db/schema.ts에 추가할 CREATE_DRAFTS_TABLE_SQL 초안
CREATE TABLE IF NOT EXISTS drafts (
  id TEXT PRIMARY KEY NOT NULL,        -- 항상 'draft' 고정값 (D-04 — 스키마 레벨에서 단일 row 강제)
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  accuracy_meters REAL,
  location_source TEXT NOT NULL,       -- checkins.location_source와 동일 enum 재사용 (드래그 시 gps_dragged로 갱신)
  local_date_key TEXT NOT NULL,        -- 드래프트 생성 시점 기준 — 날짜 경계 만료 판정용(T24 edge case 1)
  timezone_at_capture TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL             -- 드래그로 좌표 바뀔 때마다 갱신
);
```
- **저장(upsert) 규약:** GPS 캡처 완료 시 `INSERT OR REPLACE INTO drafts (id, ...) VALUES ('draft', ...)` — 이미 드래프트가 있었다면 "조용히 버림"(T24 edge case 3, 다중 드래프트 관리 안 함)이 `REPLACE` 시맨틱으로 자연스럽게 충족된다.
- **삭제 규약(D-05):** `checkins` insert가 성공한 **직후에만** `DELETE FROM drafts WHERE id = 'draft'`.
- **만료 판정(T24 edge case 1):** 앱 부팅 시 드래프트가 있으면 `drafts.local_date_key`를 오늘의 `local_date_key`(기기 현재 시각 기준, 아래 Don't Hand-Roll 참고)와 비교 — 다르면 복구 프롬프트를 띄우지 않고 조용히 `DELETE`.
- **권한 변경 강건성(T24 edge case 4):** 드래프트는 이미 확정된 `lat`/`lng`를 들고 있으므로 복구 시 위치 권한 재확인이 필요 없다 — 그대로 확인 핀 화면에 그 좌표를 띄운다.
- **마이그레이션 배선:** `migrations.ts`의 `if (currentDbVersion === 0)` 블록은 절대 수정하지 않는다(기존 규약) — 새 `if (currentDbVersion === 1) { ...CREATE_DRAFTS_TABLE_SQL...; currentDbVersion = 2; }` 블록을 추가하고 `DATABASE_VERSION`을 2로 올린다.

### Pattern 5: `Marker draggable` — 별도 제스처 배선 불필요 (iOS 기준)

**What:** `react-native-maps`의 `<Marker draggable onDragEnd={...} />`는 네이티브 MapKit 레벨에서 마커 터치를 감지하면 지도 자체의 팬 제스처 인식기가 양보하도록 이미 구현돼 있다 — 이건 라이브러리 기능이지 앱이 `react-native-gesture-handler`로 우선순위를 직접 조정해야 하는 문제가 아니다.

```jsx
// Source: react-native-maps 공식 예제 패턴 (WebSearch로 확인, 다수 커뮤니티 예제 동일)
<MapView style={styles.map} initialRegion={region}>
  <Marker
    coordinate={pinCoordinate}
    draggable
    onDragStart={() => setIsDragging(true)}
    onDragEnd={(e) => {
      setPinCoordinate(e.nativeEvent.coordinate);
      setIsDragging(false);
      // draftRepo.updateDraftLocation({ ...e.nativeEvent.coordinate, location_source: 'gps_dragged' })
    }}
  />
</MapView>
```
**주의(Common Pitfalls 참고):** Android에서는 드래그 종료 직후 다른 버튼이 일시적으로 터치에 반응하지 않는 커뮤니티 이슈(`react-native-maps#3777`)가 보고돼 있다. 이 프로젝트는 **iOS 전용**(PROJECT.md 확정)이라 직접 해당하지 않을 가능성이 높지만, 실기기 QA 시 "확인 핀 드래그 직후 '확인' 버튼이 눌리는지" 반드시 확인이 필요하다(LOW confidence — iOS에서도 재현되는지 검증된 소스 없음, Assumptions Log 참고).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| UUID(row `id`) 생성 | 커스텀 랜덤 문자열 생성기, `Math.random()` 기반 ID | `expo-crypto`의 `Crypto.randomUUID()` | Hermes는 `crypto.randomUUID()`를 네이티브로 제공하지 않아 폴리필이 필요한데, Expo가 이미 네이티브 모듈로 제공하는 걸 두고 커스텀 구현/추가 폴리필 라이브러리를 넣을 이유가 없음 |
| 로컬 날짜 키(`local_date_key`)/타임존 계산 | 수동 `Date` 파싱 + UTC 오프셋 산수 | `Intl.DateTimeFormat('en-CA', { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }).format(date)` (en-CA 로케일은 `YYYY-MM-DD` 포맷을 표준으로 반환) | Hermes는 Expo SDK 46+부터 풀 ICU/`Intl`을 기본 활성화 — 수동 UTC 오프셋 계산은 서머타임/윤초 경계에서 미묘한 버그를 만들기 쉬움(자정 경계 버그를 막으려고 만든 컬럼인데 계산 자체가 버그면 본말전도) |
| GPS 5초 타임아웃 | 자체 폴링 루프 | `Promise.race([getCurrentPositionAsync(...), timeoutPromise])` | Pattern 2 참고 — 이미 표준 JS 패턴, 별도 라이브러리 불필요 |
| 사진 원본 파일 복사 | `fetch(uri).blob()` 후 수동 바이트 쓰기 | `expo-file-system`의 `File.copy(destination)` (새 클래스 API) | 새 API가 네이티브 파일시스템 호출을 직접 감싸 스트리밍/권한 처리를 대신함 — blob 왕복은 대용량 사진에서 메모리 낭비 |
| SQLite 쓰기 실패 자동 재시도 1회 | 범용 재시도 라이브러리(exponential backoff 등) 도입 | 단순 `try { insert } catch { try { insert again } catch { setError } }` 인라인 로직 | 요구사항이 "정확히 1회 자동 재시도"로 고정돼 있어 backoff/jitter 등 범용 재시도 라이브러리의 복잡도가 전혀 필요 없음 — 오히려 "정확히 1회"라는 계약을 흐릴 위험 |

**Key insight:** 이 phase가 다루는 문제들은 전부 "이미 Expo SDK가 네이티브로 해결해주는 문제를 앱 레벨에서 재구현하지 않기"로 요약된다 — 유일하게 직접 구현해야 하는 로직은 SDK가 제공하지 않는 것(5초 타임아웃 레이스, 3단계 자체 폴백 체인, 정확히 1회 재시도)뿐이며 이들은 전부 표준 JS 제어 흐름으로 충분하다.

## Common Pitfalls

### Pitfall 1: `getCurrentPositionAsync`에 `timeout` 옵션을 넣으면 안 됨
**What goes wrong:** 구버전 API 문서/예제를 참고해 `getCurrentPositionAsync({ timeout: 5000 })`처럼 호출하면 즉시 예외를 던지거나(GitHub `expo/expo#2226`), 아무 효과 없이 무시될 수 있다.
**Why it happens:** 공식 최신 `LocationOptions` 타입에는 `timeout` 필드가 없다(WebFetch로 docs.expo.dev 확인) — 브라우저 Geolocation API의 `timeout` 옵션과 착각하기 쉽다.
**How to avoid:** Pattern 2의 `Promise.race` 방식을 사용한다.
**Warning signs:** TypeScript가 `timeout` 프로퍼티를 허용하지 않는다는 컴파일 에러, 또는 런타임에 5초를 훨씬 넘겨도 함수가 resolve되지 않는 현상.

### Pitfall 2: `expo-file-system` 새 API와 레거시 API를 섞어 씀
**What goes wrong:** 일부 예제 코드는 여전히 `FileSystem.documentDirectory + '/photo.jpg'` 문자열 접합 + `FileSystem.copyAsync({ from, to })`(레거시 API)를 쓴다. SDK 57에서 이 스타일은 `expo-file-system/legacy`에서만 동작하며, 새 기본 export(`import { File, Directory, Paths } from 'expo-file-system'`)와 타입이 다르다.
**Why it happens:** SDK 54+에서 API가 교체됐지만(State of the Art 참고) 웹 검색 결과 상당수가 여전히 이전 스타일을 보여준다.
**How to avoid:** `Paths.document`(Directory 객체)를 쓰고, `new File(sourceUri)` 생성 후 `await sourceFile.copy(new File(Paths.document, filename))`처럼 새 클래스 API로 작성한다. 두 API를 같은 파일에서 혼용하지 않는다.
**Warning signs:** import 경로가 `expo-file-system/legacy`인 코드와 아닌 코드가 같은 모듈에 섞여 있음, 또는 문자열 경로 접합(`+`)이 코드에 등장.

### Pitfall 3: 위치 권한 거부 시 OS 캐시 위치를 요청하려는 시도
**What goes wrong:** "권한이 없어도 마지막으로 알려진 위치 정도는 OS가 내주지 않을까"라고 가정하고 `getLastKnownPositionAsync()`를 권한 거부 상태에서 호출하면 실패하거나 의미 없는 값을 받는다.
**Why it happens:** product-design.md 자체가 한 번 이 실수를 했다가 2026-08-23 Eng 리뷰(Codex 지적)에서 정정한 이력이 있다 — "권한이 없으면 OS가 마지막 캐시 위치도 내주지 않는다"가 확정 사실로 문서에 명시됨.
**How to avoid:** 권한 거부 시엔 `expo-location`을 아예 호출하지 않고 앱 자체 폴백 체인(최근 checkin → 지도 마지막 좌표 → 하드코딩 기본값)으로 바로 진입한다.
**Warning signs:** 권한 거부 상태에서 `expo-location` API를 호출하는 코드 경로가 존재.

### Pitfall 4: SQLite 재시도 로직을 UI 컴포넌트 안에 직접 작성
**What goes wrong:** "자동 재시도 1회 + 수동 재시도 버튼"을 화면 컴포넌트의 `useState`/`useEffect` 안에서 직접 구현하면, Phase 5(T13 상세화면 메모 수정 저장 실패)가 거의 동일한 재시도 UI를 다시 처음부터 구현하게 된다(product-design.md가 이미 "최초 저장과 동일한 패턴"을 명시).
**Why it happens:** 저장 실패 UI 요구사항(REQ-checkin-write-failure-ui)이 화면 단위로 스펙돼 있어 화면 로직으로 착각하기 쉽다.
**How to avoid:** `checkinRepo.ts`에 `insertCheckinWithRetry(db, params): Promise<{ ok: true, id: string } | { ok: false }>` 형태의 재사용 가능한 함수를 만들고(1회 자동 재시도 로직을 이 함수 안에 캡슐화), UI는 이 함수의 결과값(성공/실패)만 보고 "다시 시도" 버튼 탭 시 **같은 함수를 다시 호출**하도록 만든다. Phase 5가 이 함수를 그대로 재사용하거나 최소한의 파라미터만 바꿔 재사용할 수 있게 설계한다.
**Warning signs:** 재시도 카운터(`useState`)가 화면 컴포넌트 안에 있음, SQL문이 컴포넌트 파일에 직접 등장.

### Pitfall 5: `drafts` row를 "확인" 탭 시점에 바로 지워버림
**What goes wrong:** "확인" 탭 = 저장 성공으로 착각해 `checkins` insert를 시도하기 *전에* `drafts` DELETE를 먼저 실행하면, D-05가 요구하는 "insert 실패/재시도 중 강제종료 시 복구" 보장이 깨진다.
**Why it happens:** "확인 탭 → 저장" 흐름을 하나의 트랜잭션처럼 생각하고 순서를 앞뒤로 바꾸기 쉽다.
**How to avoid:** 반드시 `INSERT INTO checkins ...`가 **성공한 이후**에만 `DELETE FROM drafts`를 실행한다(D-05 원문: "insert 성공 직후에만 드래프트 row를 삭제"). 두 문장을 한 SQLite 트랜잭션으로 묶으면(`BEGIN`/`COMMIT`) 순서 실수를 원천 차단할 수 있다.
**Warning signs:** `DELETE FROM drafts`가 `INSERT INTO checkins` 호출보다 코드상 먼저 등장하거나, try/catch 밖에서 무조건 실행됨.

### Pitfall 6: 라이브러리에서 고른 기존 사진을 `documentDirectory`에 복사할 때 원본 EXIF를 건드림
**What goes wrong:** Phase 4(T25 EXIF 지오태깅)가 "카메라로 찍은 사진에만 GPS 지오태그, 라이브러리 사진은 원본 그대로"를 요구하므로, Phase 3에서 `documentDirectory`로 복사하는 로직이 사진 출처(카메라 vs 라이브러리)를 구분할 수 있는 상태로 남겨두지 않으면 Phase 4가 이를 구분할 방법이 없어진다.
**Why it happens:** D-01/D-02는 "복사"만 이 phase 스코프이고 EXIF 처리는 Phase 4라 이 경계가 흐려지기 쉽다.
**How to avoid:** `photos.ts`가 액션시트 선택 결과(`launchCameraAsync` vs `launchImageLibraryAsync`)를 이미 알고 있으므로, 최소한 파일명 컨벤션(예: `camera-<uuid>.jpg` vs `library-<uuid>.jpg`)이나 향후 스키마 필드로 구분 가능하게 **복사 시점에 출처 정보를 유지**한다 — 이 phase가 값을 스키마에 영속화할 필요는 없지만(Phase 4 스코프), 정보 자체를 조용히 버리면 안 된다.
**Warning signs:** 사진 복사 함수의 반환값이 파일 경로 문자열 하나뿐이고 출처 구분 정보가 없음.

## Code Examples

### 위치 캡처 + 5초 타임아웃 + OS 캐시 폴백 (권한 허용 시)
```typescript
// Source: docs.expo.dev/versions/latest/sdk/location/ API 시그니처 확인 + 자체 조합
// (getCurrentPositionAsync/getLastKnownPositionAsync 시그니처는 공식 문서 기준, race 조합은 자체 설계)
import type { LocationDeps } from './config';

type CaptureResult =
  | { kind: 'auto'; lat: number; lng: number; accuracyMeters: number | null }
  | { kind: 'timeout_os_cache'; lat: number; lng: number; accuracyMeters: number | null }
  | { kind: 'need_fallback_chain' }; // 5초 타임아웃 + OS 캐시도 없음

export async function captureWithTimeout(deps: LocationDeps): Promise<CaptureResult> {
  const racePromise = deps.getCurrentPositionAsync({ accuracy: 3 });
  const winner = await Promise.race([
    racePromise.then((pos) => ({ tag: 'gps' as const, pos })),
    new Promise<{ tag: 'timeout' }>((resolve) =>
      setTimeout(() => resolve({ tag: 'timeout' }), 5000)
    ),
  ]);

  if (winner.tag === 'gps') {
    return {
      kind: 'auto',
      lat: winner.pos.coords.latitude,
      lng: winner.pos.coords.longitude,
      accuracyMeters: winner.pos.coords.accuracy,
    };
  }

  racePromise.catch(() => {}); // 지연 응답 흡수(Pitfall 없는 정리)
  const cached = await deps.getLastKnownPositionAsync({ maxAge: 5 * 60 * 1000 });
  if (cached) {
    return {
      kind: 'timeout_os_cache',
      lat: cached.coords.latitude,
      lng: cached.coords.longitude,
      accuracyMeters: cached.coords.accuracy,
    };
  }
  return { kind: 'need_fallback_chain' };
}
```

### 사진 액션시트 → `documentDirectory` 복사 (새 `expo-file-system` API)
```typescript
// Source: docs.expo.dev/versions/latest/sdk/imagepicker/ + docs.expo.dev/versions/latest/sdk/filesystem/
// (두 API 시그니처는 공식 문서 확인, 조합 로직은 자체 설계)
import type { ImagePickerDeps, FileSystemDeps } from './config';

export async function pickAndCopyPhoto(
  source: 'camera' | 'library',
  deps: ImagePickerDeps & FileSystemDeps,
  targetFileName: string
): Promise<string | null> {
  const result =
    source === 'camera'
      ? await deps.launchCameraAsync({ quality: 1 })
      : await deps.launchImageLibraryAsync({ quality: 1 });

  if (result.canceled || !result.assets?.[0]) {
    return null;
  }

  const sourceFile = new deps.File(result.assets[0].uri);
  const destination = new deps.File(deps.Paths.document, targetFileName);
  await sourceFile.copy(destination); // cacheDirectory 아님 — D-02 준수
  return destination.uri;
}
```

### `drafts` 마이그레이션 확장 (기존 `migrations.ts` 패턴 그대로 확장)
```typescript
// src/db/migrations.ts — 기존 파일의 "다음 phase에서 컬럼/테이블 추가" 주석이 가리키는 지점
if (currentDbVersion === 1) {
  await db.execAsync(CREATE_DRAFTS_TABLE_SQL);
  currentDbVersion = 2;
}
// 기존 `if (currentDbVersion === 0)` 블록은 절대 사후 수정하지 않는다(migration_discipline #2, 파일 기존 주석과 동일 규약).
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| `FileSystem.documentDirectory` 문자열 + `FileSystem.copyAsync({ from, to })` | `import { File, Directory, Paths } from 'expo-file-system'`, `new File(uri).copy(new File(Paths.document, name))` | Expo SDK 54 전후로 새 클래스 기반 API가 기본 export가 됨(WebFetch로 docs.expo.dev 확인, "레거시 함수는 `expo-file-system/legacy`에서 import, 직접 호출 시 런타임 예외" 문구 확인) | Phase 3는 SDK 57을 쓰므로 신규 코드는 새 API로 작성해야 함 — 웹 검색 결과의 옛 예제 코드를 그대로 베끼면 안 됨(Pitfall 2) |
| `ImagePicker.MediaTypeOptions.Images`(enum) | `mediaTypes: ['images']`(문자열 배열) | 최근 SDK에서 `MediaTypeOptions` deprecated | Phase 3는 사진만 다루므로(동영상 미지원) `mediaTypes: ['images']`를 명시적으로 지정할 것 — 미지정 시 기본값이 동영상까지 포함할 수 있음(문서 확인 필요, Open Questions) |

**Deprecated/outdated:**
- `expo-file-system` 레거시 함수 스타일(문자열 경로 접합) — 새 클래스 API로 대체됨.
- `getCurrentPositionAsync`의 (일부 구버전 문서/커뮤니티 예제에 등장하는) `timeout` 옵션 — 현재 공식 API 표면에 없음, 쓰면 안 됨.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `location_source` enum 5개 값 중 `gps_low_accuracy_fallback`을 정확히 언제 세팅하는지(5초 타임아웃 폴백 vs 정확도 임계값 미달)는 product-design.md 산문에 명시적 트리거 조건이 없어, "5초 타임아웃으로 OS 캐시 위치를 쓰게 된 경우 = `gps_low_accuracy_fallback`, `gps_auto` 성공 후 드래그하지 않고 그대로 확인 = `gps_auto`, 드래그하면 항상 `gps_dragged`(원래 소스 무관)"로 추론함 | Architecture Patterns 전반, Code Examples | 잘못 추론하면 지도/리스트의 "옅게 다르게 표시" 시각 신호가 스펙 의도와 다른 케이스에 붙을 수 있음 — 데이터 자체는 정확(lat/lng)하지만 신뢰도 표시가 어긋남. 계획 단계에서 창업자 확인 권장 |
| A2 | 자동 재시도 1회의 재시도 전 대기 시간(즉시 vs 수백ms 지연)이 스펙에 명시되지 않아 "즉시 재시도"로 가정함 | Common Pitfalls Pitfall 4, Code Examples | 디스크 I/O 실패 직후 즉시 재시도가 오히려 실패 확률을 높일 수 있음(공간 부족 등 일시적이지 않은 원인이면 큰 문제 없음) — 낮은 리스크 |
| A3 | Phase 3가 `requestForegroundPermissionsAsync()`를 "체크인" 첫 탭 시점에 직접 호출하는 것으로 가정 — REQ-onboarding-empty-state(Phase 4)도 "첫 체크인 탭 시점 맥락적 요청"을 언급해 두 phase의 경계가 문서상 완전히 명확하지 않음 | Open Questions 참고 | 만약 Phase 4가 이 호출 자체를 책임진다고 계획되면 Phase 3의 체크인 버튼이 위치 권한을 영원히 요청 못 하는 반쪽짜리 기능이 됨 — Open Questions에서 명시적 확인 필요 |
| A4 | Android 커뮤니티에 보고된 "마커 드래그 후 버튼 무반응" 이슈(`react-native-maps#3777`)가 iOS에서도 재현되는지는 확인된 소스가 없음 — 이 프로젝트가 iOS 전용이라 해당 없을 가능성이 높다고 가정 | Architecture Patterns Pattern 5 | 실기기 QA에서 재현되면 확인 버튼이 간헐적으로 안 눌리는 버그로 나타날 수 있음 — LOW 리스크지만 QA 체크리스트에 포함 권장 |
| A5 | `mediaTypes: ['images']` 미지정 시 기본값이 사진+동영상을 모두 포함하는지 여부를 공식 문서에서 명시적으로 재확인하지 못함(WebFetch 요약에 누락) — 명시적으로 `['images']`를 지정하는 것을 권장으로만 제시 | State of the Art 표 | 동영상까지 선택 가능한 상태로 방치하면 REQ 스코프(사진만) 밖의 파일이 `documentDirectory`에 복사될 위험 |

**If this table is empty:** 해당 없음 — 위 5개 항목이 실제 존재함.

## Open Questions

1. **`location_source` enum 5개 값의 정확한 트리거 조건 매핑**
   - What we know: enum 자체(`gps_auto`/`gps_dragged`/`gps_low_accuracy_fallback`/`manual_denied`/`manual_no_signal`)는 `schema.ts`에 이미 고정돼 있고, 각 값의 "의미"는 product-design.md 여러 곳에 산재된 산문에서 유추 가능.
   - What's unclear: `gps_low_accuracy_fallback`과 `manual_no_signal`을 정확히 어떤 코드 경로에서 나누는지(둘 다 "위치를 못 잡은 경우"로 읽힐 수 있음) — Assumptions Log A1 참고.
   - Recommendation: 계획 단계에서 아래 매핑을 명시적으로 확정해 PLAN.md에 못박을 것을 권장: `gps_auto`=권한 허용+5초 내 성공+드래그 안 함, `gps_low_accuracy_fallback`=권한 허용+5초 타임아웃+OS 캐시 성공+드래그 안 함, `manual_denied`=권한 거부(자체 폴백 체인 진입)+드래그 안 함, `manual_no_signal`=권한 허용했지만 5초 타임아웃+OS 캐시도 없어 자체 폴백 체인 진입+드래그 안 함, `gps_dragged`=원래 소스 무관하게 사용자가 핀을 드래그한 모든 경우.

2. **Phase 3 vs Phase 4의 위치 권한 요청 호출 책임 경계**
   - What we know: REQ-location-denied-flow(Phase 3)는 권한 거부/배너를 다루고, REQ-onboarding-empty-state(Phase 4)는 "위치 권한은 첫 체크인 탭 시점에 맥락적으로 요청된다"는 문구를 포함한다. D-06에 따라 체크인 버튼 자체는 Phase 3에 존재한다.
   - What's unclear: `requestForegroundPermissionsAsync()`를 실제로 호출하는 코드가 Phase 3 산출물인지, Phase 4가 온보딩 흐름의 일부로 나중에 추가하는지.
   - Recommendation: Phase 3가 이 호출을 소유해야 함(체크인 버튼이 동작하려면 필수) — Phase 4는 그 위에 온보딩 내러티브/empty state 문구만 얹는 것으로 계획할 것을 권장. 계획 단계에서 창업자에게 이 경계를 명시적으로 확인.

3. **D-07 하드코딩 기본 좌표의 정확한 위경도 값**
   - What we know: CONTEXT.md가 "창업자 본인의 집/자주 가는 고정 장소"로 결정했고, 정확한 값은 계획/구현 단계에서 확인하기로 명시함.
   - What's unclear: 실제 lat/lng 숫자.
   - Recommendation: 이 리서치는 값을 임의로 만들어내지 않는다 — 계획 단계에서 `checkpoint:human-verify` 태스크로 창업자에게 직접 확인받을 것을 권장.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `expo-location` | REQ-checkin-core, REQ-checkin-confirm-pin, REQ-location-denied-flow | ✗ (미설치, 이 리서치 중 npm 레지스트리로만 검증) | 설치 시 `~57.0.14` 권장 | 없음 — 필수 설치 |
| `expo-image-picker` | REQ-checkin-core (D-01) | ✗ (미설치) | 설치 시 `~57.0.14` 권장 | 없음 — 필수 설치 |
| `expo-file-system` | REQ-checkin-core (D-02) | ✗ (미설치) | 설치 시 `~57.0.6` 권장 | 없음 — 필수 설치 |
| `expo-crypto` | REQ-checkin-core (UUID 생성) | ✗ (미설치) | 설치 시 `~57.0.2` 권장 | `react-native-get-random-values` + `uuid`(비권장, Alternatives Considered 참고) |
| `react-native-maps` | REQ-checkin-confirm-pin, D-06 | ✗ (미설치) | 설치 시 `1.29.0` 권장 | 없음 — D-06이 명시적으로 요구, 대체 불가 |
| EAS Dev Client(네이티브 리빌드) | 위 5개 전부(네이티브 모듈이라 JS 번들 교체만으로는 반영 안 됨) | 프로젝트에 기존 dev client가 있으나 위 모듈들이 링크되지 않은 상태 | — | 없음 — 새 dev client 빌드 필수(EAS 빌드 1회, PROJECT.md의 유료 Apple Developer Program으로 프로비저닝 만료 리스크는 이미 해소됨) |

**Missing dependencies with no fallback:**
- `expo-location`, `expo-image-picker`, `expo-file-system`, `react-native-maps`, 그리고 이들을 반영한 새 EAS Dev Client 빌드 — 전부 이 phase의 최우선 실행 태스크로 계획돼야 함.

**Missing dependencies with fallback:**
- `expo-crypto`(UUID) — 대체 라이브러리 존재하나 비권장(Alternatives Considered).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest 29.7.0 + `jest-expo/ios` 프리셋 |
| Config file | `jest.config.js` (루트) |
| Quick run command | `NODE_OPTIONS=--experimental-sqlite npx jest src/checkin/<file>.test.ts` |
| Full suite command | `npm test` (= `NODE_OPTIONS=--experimental-sqlite jest`) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| REQ-checkin-core | 5초 타임아웃 레이스가 GPS 성공/타임아웃/OS캐시 3가지 분기를 올바르게 나눔 | unit (`@jest-environment node`, `fakeLocation.ts` 더블) | `npx jest src/checkin/location.test.ts` | ❌ Wave 0 |
| REQ-checkin-core | `checkins` insert 함수가 올바른 컬럼으로 row를 씀 | unit (`node:sqlite` 어댑터, `nodeSqliteAdapter.ts` 재사용) | `npx jest src/checkin/checkinRepo.test.ts` | ❌ Wave 0 |
| REQ-checkin-write-failure-ui | 1회 자동 재시도 후 실패 시 에러 상태 반환, 수동 재시도 시 같은 함수 재호출로 성공 가능 | unit (실패를 강제하는 fake db 더블) | `npx jest src/checkin/checkinRepo.test.ts` | ❌ Wave 0 |
| REQ-checkin-confirm-pin | `drafts` 테이블 CRUD(upsert/delete/조회) + 날짜 경계 만료 판정 | unit (`node:sqlite` 어댑터) | `npx jest src/checkin/draftRepo.test.ts` | ❌ Wave 0 |
| REQ-checkin-confirm-pin | `migrateDbIfNeeded`가 `drafts` 테이블을 생성하고 `user_version`을 2로 올리며 기존 데이터 보존 | unit (`migrations.test.ts` 확장, 기존 Test 5/7 패턴 복제) | `npx jest src/db/migrations.test.ts` | ⚠️ 기존 파일 확장 필요 |
| REQ-location-denied-flow | 3단계 자체 폴백 체인(최근 checkin → 지도 마지막 좌표 → 하드코딩 기본값)이 순서대로 시도됨 | unit (`@jest-environment node`) | `npx jest src/checkin/location.test.ts` | ❌ Wave 0 |
| REQ-location-denied-flow | 위치 권한 배너 표시/해제 판정 + `AppState` 포그라운드 재확인 | unit (`notifications/permissions.test.ts` 패턴 복제) | `npx jest src/checkin/permissions.test.ts` | ❌ Wave 0 |
| 전체(E2E 수동) | 비행기모드에서 체크인 후 앱 재시작해도 기록 유지(product-design.md T3 Verify 기준) | manual-only — 실기기 필요, CI 자동화 불가 | — | manual |

### Sampling Rate
- **Per task commit:** 해당 태스크가 건드린 `src/checkin/*.test.ts` 또는 `src/db/migrations.test.ts` 개별 실행
- **Per wave merge:** `npm test`(전체 스위트)
- **Phase gate:** 전체 스위트 green + 위 manual-only 항목(비행기모드 재시작, 실기기 확인 핀 드래그, EAS Dev Client 재빌드 설치 확인) 수동 확인 후 `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/checkin/testing/fakeLocation.ts` — `notifications/testing/fakeNotifications.ts` 패턴 복제, `getCurrentPositionAsync`/`getLastKnownPositionAsync` 더블
- [ ] `src/checkin/testing/fakeImagePicker.ts` — `launchCameraAsync`/`launchImageLibraryAsync` 더블
- [ ] `src/checkin/config.ts` + `deps.ts` — DI 골격(Pattern 1)
- [ ] `src/db/migrations.test.ts`에 `drafts` 테이블 컬럼/제약 검증 테스트 추가(기존 파일 확장, 새 파일 아님)
- [ ] 프레임워크 설치 불필요 — Jest/`jest-expo`/`node:sqlite` 어댑터 전부 Phase 1에서 이미 구축됨

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | 1단계는 인증/계정 개념 자체가 없음(PROJECT.md 확정, 단일 사용자 로컬 앱) |
| V3 Session Management | No | 동일 이유 |
| V4 Access Control | No | 동일 이유 |
| V5 Input Validation | Yes | 메모 텍스트는 그대로 SQLite 파라미터 바인딩(`?` 플레이스홀더, 기존 `migrations.ts` 규약)으로 저장 — SQL 인젝션 방어는 이미 확립된 패턴 그대로 적용. `lat`/`lng`는 `-90..90`/`-180..180` 범위 검증을 앱 레벨에서 하지 않으면(GPS/드래그 좌표는 항상 유효 범위 안이라 실질 리스크는 낮음) 이론상 잘못된 값이 저장될 수 있음 — LOW 리스크로 판단, 강제 검증은 선택 |
| V6 Cryptography | No (기존 결정 재확인) | SQLite 파일은 암호화하지 않음 — 2026-08-23 Eng 리뷰에서 "기기 로컬 단일 사용자 앱이라 저위험"으로 이미 판정됨(product-design.md Dual Voices 표), 이 phase에서 재검토 대상 아님 |

### Known Threat Patterns for {stack}

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| SQLite 문자열 보간을 통한 인젝션 | Tampering | `runAsync`의 `?` 플레이스홀더 + 파라미터 바인딩만 사용(기존 `migrations.ts` T-1-01 규약 그대로 적용 — `PRAGMA user_version` 한 줄만 예외) |
| 사진 파일 경로 조작(picker가 반환한 `uri`를 검증 없이 파일명으로 사용) | Tampering | 대상 파일명은 항상 앱이 생성한 UUID(`Crypto.randomUUID()`) 기반으로 짓고, picker가 반환한 원본 `uri`/파일명 문자열을 목적지 경로에 그대로 사용하지 않는다 |
| 드래프트/체크인 좌표를 통한 위치 노출(로컬 파일이지만 기기 분실 시) | Information Disclosure | 이미 알려진 수용된 리스크(V6 항목 참고) — 이 phase에서 추가 완화 조치 불필요, PROJECT.md의 "기기 분실 시 전체 기록 소실 리스크 감수" 결정과 동일 범주 |

## Sources

### Primary (HIGH confidence)
- https://docs.expo.dev/versions/latest/sdk/location/ — `getCurrentPositionAsync`/`getLastKnownPositionAsync`/권한 API 시그니처, `Accuracy` enum 값
- https://docs.expo.dev/versions/latest/sdk/imagepicker/ — `launchCameraAsync`/`launchImageLibraryAsync`/권한 API, `mediaTypes` 옵션
- https://docs.expo.dev/versions/latest/sdk/filesystem/ — `File`/`Directory`/`Paths` 새 클래스 API, 레거시 API 위치
- https://docs.expo.dev/versions/latest/sdk/crypto/ — `Crypto.randomUUID()` 동기 API
- npm registry(`npm view <pkg> versions/dist-tags/peerDependencies/time.created/repository.url`, 2026-08-27 직접 조회) — `expo-location@57.0.14`, `expo-image-picker@57.0.14`, `expo-file-system@57.0.6`, `expo-crypto@57.0.2`, `react-native-maps@1.29.0` 존재/버전/피어의존성 확인
- slopcheck 0.6.1(`slopcheck scan --pkg npm <pkg>`, 로컬 실행) — 5개 패키지 전부 `[OK]` 판정
- 프로젝트 기존 코드(`src/notifications/config.ts`, `deps.ts`, `permissions.ts`, `src/db/migrations.ts`, `src/db/schema.ts`, `src/db/testing/nodeSqliteAdapter.ts`, `src/components/NotificationDeniedBanner.tsx`) — DI 패턴, 마이그레이션 규약, 배너 컴포넌트 계약의 1차 소스

### Secondary (MEDIUM confidence)
- WebSearch(`getCurrentPositionAsync` timeout 이슈) 결과 중 GitHub `expo/expo#2226` — 구버전 `timeout` 옵션이 예외를 던진다는 보고, 공식 문서의 "옵션 없음"과 교차 확인됨
- WebSearch(`react-native-maps` draggable Marker) 결과 중 `react-native-maps#3777`, `#2868` — Android 드래그 후 터치 무반응 이슈, iOS 재현 여부는 미확인(Assumptions Log A4)

### Tertiary (LOW confidence)
- `mediaTypes` 미지정 시 기본 동작(사진+동영상 포함 여부) — WebFetch 요약에서 명시적으로 확인하지 못함(Assumptions Log A5)

## Metadata

**Confidence breakdown:**
- Standard Stack(라이브러리 API/버전): HIGH — 공식 문서(docs.expo.dev) + npm 레지스트리 직접 조회로 교차 검증
- Architecture Patterns(DI 구조, 마이그레이션 확장): HIGH — 기존 코드베이스 파일을 직접 읽고 그 관례를 그대로 복제하는 방식이라 추측 요소가 거의 없음
- `drafts` 스키마/`location_source` 트리거 조건: MEDIUM/LOW — CONTEXT.md가 "Claude's Discretion"으로 명시한 영역이라 이 리서치의 제안은 합리적 추론이지 확정 스펙이 아님(Open Questions 1 참고)
- Pitfalls(GPS timeout, file-system API 전환): HIGH — 공식 문서 + 재현 가능한 GitHub 이슈로 뒷받침

**Research date:** 2026-08-27
**Valid until:** 2026-09-26(30일) — Expo SDK가 canary 58 릴리스를 이미 준비 중인 것으로 확인됨(npm 조회 시점 기준), SDK 버전이 바뀌면 `expo-file-system`/`expo-location` API 표면이 다시 바뀔 수 있어 표준 스택 표는 재검증 권장
