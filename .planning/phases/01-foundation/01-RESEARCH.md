# Phase 1: Foundation - Research

**Researched:** 2026-08-25
**Domain:** Expo/React Native (EAS Dev Client) 프로젝트 스캐폴딩, 디자인 토큰 상수화, expo-sqlite 스키마 마이그레이션
**Confidence:** HIGH

<user_constraints>
## User Constraints

> 이 phase에는 `/gsd:discuss-phase`를 통한 CONTEXT.md가 존재하지 않는다(사용자가 이 기계적/인프라 phase에 대해 discuss-phase를 건너뛰기로 결정). 아래는 PROJECT.md/REQUIREMENTS.md — 이 프로젝트에서 CONTEXT.md에 가장 가까운, 이미 LOCKED된 프로젝트 전역 결정 — 에서 이 phase에 적용되는 항목만 발췌한 것이다. 플래너는 이것을 CONTEXT.md의 `## Decisions`와 동일한 권위로 취급해야 한다.

### Locked Decisions (PROJECT.md/REQUIREMENTS.md에서 발췌)

- 플랫폼: 네이티브 iOS 전용, Expo/React Native, **EAS Dev Client 필수(Expo Go 불가)** — `react-native-maps`가 향후 phase에서 네이티브 모듈을 필요로 하기 때문(기술적 제약, 재검토 대상 아님).
- 타겟 기기: 창업자 본인 소유 iPhone 1대, 390×844pt 기준, 세로모드 전용, 시스템 Dynamic Type만 지원.
- Apple Developer Program은 유료 등급($99/년, 창업자가 이미 보유) — 무료 등급의 7일 프로비저닝 만료 리스크는 해소됨.
- 오프라인 우선: 네트워크 의존성 전무 — 백엔드도, 외부 API도, CDN 런타임 fetch도 없음(Newsreader 폰트를 포함해 모든 에셋은 번들에 포함).
- 스키마: `Checkin`과 `DailyReflection` 두 테이블, **`PRAGMA user_version` + 마이그레이션 함수**로 버전 관리 — 스키마는 빌드 도중 이미 한 번 변경된 적 있으므로 고정된 것으로 취급하지 말 것.
- 디자인 시스템(DESIGN.md)은 모든 시각적 결정의 단일 진실 소스 — 명시적 사용자 승인 없이 벗어나지 않음. 핵심 값: 3단 타이포(SF Pro / SF Mono·모노스페이스 / Newsreader 이탤릭 세리프), 단일 accent `#7C8660`(정확히 6개 승인된 용도만), 8px 스페이싱 스케일(4/8/12/16/24/32/48/64), bounce/spring 모션 금지, 44×44px 터치 타겟, 4.5:1 이상 명도 대비, 진행률/완료 수치 UI 노출 전면 금지.
- Success Criteria(변경 불가, roadmap에 고정):
  1. 창업자가 EAS Dev Client 빌드를 자신의 iPhone에 설치하고 실행할 수 있다.
  2. 앱 화면들이 DESIGN.md와 일치하는 단일 상수 파일에서 공유 디자인 토큰(컬러/타입/스페이싱/모션)을 import할 수 있다.
  3. SQLite 데이터베이스가 마이그레이션 프레임워크(`PRAGMA user_version` + 마이그레이션 함수)를 통해 초기화되며, 이후 기존 데이터를 지우지 않고 테이블/컬럼을 추가할 수 있다.

### Claude's Discretion

- 정확한 iOS 번들 식별자, EAS 프로젝트 슬러그, 패키지 매니저(npm 유지 권장) 선택.
- TypeScript `strict` 모드 활성화 여부(공식 기본값은 off, 이 연구는 on을 권장하되 확정은 플래너/사용자 몫).
- `expo-router` 설치 시점에 실제 탭 네비게이션 구조까지 만들지, 아니면 최소 골격만 둘지(요구사항상으로는 후자로 충분).
- 테스트 프레임워크(jest-expo) 도입을 Foundation phase 자체에 포함할지, Wave 0으로 다음 phase 착수 직전에 미룰지.

### Deferred Ideas (OUT OF SCOPE — 이 phase에서 다루지 않음)

- 알림 스케줄링, 권한 프롬프트 문구, 체크인 캡처, 오늘 뷰, 캘린더, 회고, 내보내기 등 Phase 2~8의 모든 기능적 요구사항.
- 백엔드/인증/클라우드(Spring Boot/Kotlin, 카카오 OAuth2, S3, 동기화) — 2단계 제품 마일스톤으로 완전히 연기됨, 이 roadmap에 phase로 존재하지 않음.
- 다크 모드(DESIGN.md에서 1단계 스코프 아님으로 명시).
- 하단 탭바 등 실제 네비게이션 셸 구현(그 자체는 Phase 4 이후 화면 작업의 일부).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-------------------|
| REQ-foundation-setup | Expo 프로젝트가 초기화되고, 창업자의 iPhone에 설치·실행되는 EAS Dev Client를 빌드한다. | `npx create-expo-app` → `expo-dev-client` 설치 → `eas build --profile development --platform ios` 공식 워크플로우(Architecture Patterns 다이어그램, Code Examples `eas.json`). EAS 계정 로그인 확인됨(Environment Availability). 실물 기기 설치 확인은 자동화 불가 — human-verify 필요(Validation Architecture 참고) |
| REQ-design-tokens | DESIGN.md의 타이포그래피/컬러/스페이싱/모션 토큰이 모든 화면에서 import 가능한 단일 상수 파일로 export된다. | Pattern 1(`src/theme/tokens.ts`) — DESIGN.md 값을 그대로 옮긴 `as const` 객체. `ui-monospace`+`tabular-nums`(RN 공식 문서 검증)로 SF Mono 대체, `@expo-google-fonts/newsreader`로 이탤릭 세리프 번들링 |
| REQ-sqlite-migrations | 스키마를 쓰는 태스크가 실행되기 전에 SQLite 마이그레이션 프레임워크(`PRAGMA user_version` + 마이그레이션 함수)가 먼저 존재한다. | Pattern 2(`migrateDbIfNeeded` + `SQLiteProvider onInit`) — expo-sqlite 공식 레시피, `Checkin`/`DailyReflection` 스키마는 constraints.md에서 그대로 이식(Standard Stack, Code Examples) |
</phase_requirements>

## Summary

Phase 1은 순수 인프라 phase다 — 화면 로직은 전혀 없고, (1) iPhone에 설치 가능한 EAS Dev Client 빌드, (2) DESIGN.md 토큰을 그대로 옮긴 단일 TypeScript 상수 파일, (3) `PRAGMA user_version` 기반 SQLite 마이그레이션 러너, 이 세 가지 산출물만 존재하면 된다. 세 요구사항 모두 이 저장소가 완전히 빈 상태(package.json조차 없음)에서 시작한다는 전제를 깔고 있으므로, 첫 태스크는 항상 `npx create-expo-app`으로 시작해야 한다.

세 영역 모두 커스텀 프레임워크를 만들 필요가 없는, Expo 공식 문서가 정확히 요구사항 문구와 일치하는 패턴을 이미 제공하는 영역이다: `react-native-maps`가 네이티브 모듈을 요구하므로 Expo Go가 아닌 EAS Dev Client가 필수라는 제약은 이미 PROJECT.md에 LOCKED로 박혀 있고, 공식 문서의 "Development builds" 워크플로우가 그대로 적용된다. 디자인 토큰은 라이브러리 없이 `as const` TypeScript 객체 하나로 충분하다(테마 엔진 도입은 과설계). SQLite 마이그레이션은 expo-sqlite 공식 문서의 `migrateDbIfNeeded(db)` + `SQLiteProvider onInit` 레시피가 요구사항 문구("PRAGMA user_version + 마이그레이션 함수")와 토씨 하나까지 일치한다.

한 가지 실행 시 유의할 기술적 간극이 있다: DESIGN.md는 Newsreader 폰트가 "Google Fonts CDN(fonts.googleapis.com)에서 로드"된다고 적어놨는데, 이는 웹 사고방식이다. React Native/Expo에서는 런타임에 CDN을 fetch하지 않고 `@expo-google-fonts/newsreader` npm 패키지(폰트 파일을 번들에 포함, `useFonts` 훅으로 로드)를 쓰는 것이 표준이다. 시각적 결과는 동일(동일 폰트 파일)하므로 DESIGN.md의 디자인 의도를 벗어나지 않지만, "CDN 로드"라는 문구 자체는 기술적으로 부정확하므로 플래너가 이 차이를 인지해야 한다.

**Primary recommendation:** `npx create-expo-app@latest FootLog --template default`(TypeScript + Expo Router 내장)로 시작 → `expo-dev-client` 설치 후 `eas build --profile development --platform ios`로 첫 빌드 → `src/theme/tokens.ts` 단일 파일로 디자인 토큰 export → `expo-sqlite`의 `SQLiteProvider onInit={migrateDbIfNeeded}` 공식 패턴으로 마이그레이션 프레임워크 구현.

## Architectural Responsibility Map

FootLog 1단계는 순수 클라이언트 전용 앱이다 — 백엔드/API 계층이 존재하지 않으므로 전통적인 다계층 매핑은 단순화된다.

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| 앱 스캐폴드/빌드 파이프라인 | Build tooling (EAS) | Native iOS (Xcode/CocoaPods) | EAS Build가 클라우드에서 네이티브 iOS 바이너리를 컴파일·서명; 로컬 Xcode는 시뮬레이터 디버깅용 보조 |
| 디자인 토큰 | JS/TS 모듈 (앱 번들 내부) | — | 런타임 설정이 아니라 컴파일타임 상수 — 별도 계층 없음, 모든 화면 컴포넌트가 import |
| SQLite 마이그레이션 | Database / Storage (기기 로컬) | App 초기화 로직 (React 루트) | 스키마 버전 관리는 DB 계층의 책임이지만, "언제 실행할지"는 앱 부팅 시퀀스(React tree 루트)가 소유 |
| 폰트 로딩 (Newsreader) | App 초기화 로직 (React 루트) | — | `useFonts` + 스플래시 스크린 게이팅은 네비게이션 진입 전에 처리되어야 함 |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `expo` | 57.0.16 [VERIFIED: npm registry] | Expo SDK 코어 | 공식 Expo 문서가 2026년 현재 SDK 57을 권장 버전으로 명시; `npx create-expo-app`이 자동으로 이 버전을 pin |
| `expo-dev-client` | 57.0.15 [VERIFIED: npm registry] | Expo Go 대신 커스텀 네이티브 모듈(react-native-maps)을 포함한 개발용 빌드를 가능하게 함 | 공식 문서: "Libraries with native modules need a development build" — 이 프로젝트의 PROJECT.md에 LOCKED 제약으로 이미 명시됨 |
| `expo-router` | 57.0.16 [VERIFIED: npm registry] | 파일 기반 라우팅 | `create-expo-app`의 `default` 템플릿이 2026년 기준 기본 포함 — 이후 phase(탭바, 화면 전환)를 위한 표준 토대. Phase 1에서는 라우터만 설치되고 실제 탭 구조는 만들지 않음(요구사항 범위 밖) |
| `typescript` | 7.0.2 [VERIFIED: npm registry] (템플릿이 자체 pin하는 버전을 따르는 것을 권장 — 아래 Pitfall 참고) | 정적 타입 | Expo 공식 TypeScript 가이드가 `expo/tsconfig.base` extend를 표준으로 문서화 |
| `expo-sqlite` | 57.0.1 [VERIFIED: npm registry] | 로컬 SQLite 저장소 + 마이그레이션 API(`PRAGMA user_version`, `execAsync`, `runAsync`, `getFirstAsync`) | 공식 Expo 문서가 정확히 이 요구사항 문구와 일치하는 `migrateDbIfNeeded` 레시피를 제공 |
| `expo-font` | 57.0.1 [VERIFIED: npm registry] | 커스텀 폰트(Newsreader) 로딩 | `useFonts` 훅의 기반 라이브러리, 공식 문서 표준 패턴 |
| `@expo-google-fonts/newsreader` | 0.4.1 [VERIFIED: npm registry] | Newsreader 이탤릭 세리프 웨이트(400 Regular Italic 등) 번들 | Expo 공식 조직(`github.com/expo/google-fonts`, 메인테이너 brentvatne는 Expo 창립자)이 배포하는 공식 패키지군 — `@expo-google-fonts/*` 네이밍 컨벤션 자체가 Expo 공식 문서(`docs.expo.dev/develop/user-interface/fonts`)에 기술된 표준 패턴 |
| `expo-splash-screen` | (템플릿 기본 포함, 버전은 `npx expo install`이 SDK 57에 맞춰 자동 pin) | 폰트 로딩 완료 전 스플래시 유지 | 공식 `useFonts` 예제 코드에 필수 짝 패키지로 등장 |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `jest-expo` | 57.0.4 [VERIFIED: npm registry] | Expo 전용 Jest 프리셋/모킹 | Wave 0 테스트 인프라 구축 시(아래 Validation Architecture 참고) |
| `jest` | 30.4.2 [VERIFIED: npm registry] | 테스트 러너 | jest-expo와 함께 |
| `@testing-library/react-native` | 14.0.1 [VERIFIED: npm registry] | 컴포넌트/훅 테스트 | 마이그레이션 함수·토큰 export 유닛테스트에 사용 가능(단, Phase 1은 UI 컴포넌트가 거의 없어 마이그레이션 로직 테스트가 주 용도) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| 순수 TS 상수 파일 디자인 토큰 | Tamagui / react-native-unistyles 같은 테마 엔진 | 단일 accent, 정적 3단 타이포만 있는 이 프로젝트 규모에는 과설계. REQ-design-tokens 문구 자체가 "단일 상수 파일"을 명시 — 라이브러리 도입은 요구사항을 벗어남 |
| `expo-sqlite`의 공식 `PRAGMA user_version` 레시피 | Drizzle ORM (+ `drizzle-orm/expo-sqlite`) | Drizzle은 스키마 코드젠·타입세이프 쿼리를 제공하지만, 별도 마이그레이션 CLI(`drizzle-kit`)와 빌드 스텝을 요구. 요구사항이 정확히 "PRAGMA user_version + 마이그레이션 함수"를 지목하므로 공식 raw 레시피가 더 직접적으로 일치. 테이블이 2개(`Checkin`, `DailyReflection`)뿐이라 ORM의 이점이 크지 않음 — 단, 이후 phase에서 쿼리가 복잡해지면 재검토 가능 |
| `npm` | `pnpm`/`yarn` | 환경에 npm 10.9.4가 이미 설치되어 있고 Expo 공식 문서 예제가 기본적으로 npm 명령을 사용 — 전환 이유 없음 |

**Installation:**
```bash
npx create-expo-app@latest FootLog --template default
cd FootLog
npx expo install expo-dev-client expo-sqlite expo-font expo-splash-screen
npx expo install @expo-google-fonts/newsreader
```

**Version verification:** 위 모든 버전은 `npm view <package> version`으로 2026-08-25 기준 실측 확인함(레지스트리 최신 배포 버전). `expo-splash-screen`은 템플릿이 자동으로 SDK 57 호환 버전을 pin하므로 별도 버전 고정 불필요.

## Package Legitimacy Audit

| Package | Registry | Age | Downloads (주간) | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| `expo` | npm | 13년 (2013-05) | 8,510,309 | github.com/expo/expo | OK | Approved |
| `expo-dev-client` | npm | 5년 (2021-05) | 3,887,427 | github.com/expo/expo | OK (info: "-client" 접미사가 LLM-bait 네이밍 패턴과 유사하다는 정보성 플래그, 그러나 "package is established"로 자체 판정 — 실사용에 문제 없음) | Approved |
| `expo-router` | npm | 4년 (2022-09) | 5,710,195 | github.com/expo/expo | OK | Approved |
| `expo-sqlite` | npm | 7년 (2019-02) | 1,016,572 | github.com/expo/expo | OK | Approved |
| `expo-font` | npm | 8년 (2018-08) | 8,427,603 | github.com/expo/expo | OK | Approved |
| `@expo-google-fonts/newsreader` | npm | 5년 (2021-06) | 32,669 | github.com/expo/google-fonts | OK | Approved |
| `typescript` | npm | 14년 (2012-10) | 269,606,477 | github.com/microsoft/TypeScript | OK | Approved |
| `jest-expo` | npm | (Expo 공식, expo/expo 모노레포) | — | github.com/expo/expo | OK | Approved |
| `jest` | npm | (Meta 공식) | — | github.com/jestjs/jest | OK | Approved |
| `@testing-library/react-native` | npm | (커뮤니티 표준, testing-library 조직) | — | github.com/callstack/react-native-testing-library | OK | Approved |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none — `expo-dev-client`는 slopcheck의 정보성(`info`) 네이밍 플래그만 받았으며(status는 `OK`), Expo 공식 문서에 명시된 필수 패키지이므로 그대로 승인.

slopcheck 0.6.1을 로컬 설치(`pip3 install slopcheck`)해 실행함 — 모든 후보 패키지가 npm 레지스트리에서 `OK` 판정을 받았고, 위 표의 각 패키지는 Expo 공식 문서(docs.expo.dev) 또는 TypeScript/Jest 공식 저장소에서 직접 인용 확인됨 → `[VERIFIED: npm registry]` 태그 부여 기준 충족.

## Architecture Patterns

### System Architecture Diagram

```
[개발자 로컬 머신]
   npx create-expo-app  ──▶  [Git 저장소: 앱 소스코드]
                                   │
                                   ▼
                          eas build --profile development --platform ios
                                   │  (EAS 클라우드 빌드 서버로 소스 업로드)
                                   ▼
                        [EAS Build: 네이티브 iOS 바이너리 컴파일 + 코드사인]
                                   │  (Apple Developer Program 유료 계정으로 서명)
                                   ▼
                        [QR 코드 / expo.dev 대시보드 다운로드 링크]
                                   │
                                   ▼
                     [창업자 iPhone: Dev Client 앱 설치]
                                   │
                                   ▼
              npx expo start (로컬 Metro 서버) ◀── Dev Client가 연결
                                   │
                                   ▼
                     [앱 부팅 시퀀스 (React 루트, App/_layout.tsx)]
                        │                              │
                        ▼                              ▼
              useFonts({Newsreader_...})      SQLiteProvider
              (스플래시 유지 → 로드 완료 시     onInit={migrateDbIfNeeded}
               hideAsync)                      (PRAGMA user_version 체크
                        │                       → 필요한 마이그레이션만 실행)
                        ▼                              ▼
                   [화면 컴포넌트들] ──import──▶ [src/theme/tokens.ts]
                   (이후 phase에서 작성)         (colors/typography/spacing/motion)
```

### Recommended Project Structure
```
FootLog/
├── app/                     # expo-router 파일 기반 라우트 (Phase 1은 최소 골격만)
│   └── _layout.tsx          # 루트 레이아웃: useFonts + SQLiteProvider 게이팅
├── src/
│   ├── theme/
│   │   └── tokens.ts         # REQ-design-tokens: 단일 디자인 토큰 상수 파일
│   └── db/
│       ├── migrations.ts     # REQ-sqlite-migrations: migrateDbIfNeeded 함수
│       └── schema.ts         # (선택) 테이블 생성 SQL을 마이그레이션과 분리 보관
├── assets/
├── app.json                  # expo 설정 (bundleIdentifier 등)
├── eas.json                  # EAS 빌드 프로필 (development 프로필)
├── tsconfig.json             # extends "expo/tsconfig.base"
└── package.json
```

### Pattern 1: 디자인 토큰 단일 상수 파일
**What:** DESIGN.md의 모든 값(컬러 hex, 타이포그래피 스케일, 8px 스페이싱 스케일, 모션 duration/easing)을 하나의 `as const` TypeScript 객체로 그대로 옮긴다. 라이브러리 없이 순수 값 객체.
**When to use:** 모든 화면 컴포넌트가 이 파일에서 import.
**Example:**
```typescript
// src/theme/tokens.ts
// Source: DESIGN.md 값을 그대로 이식 (2026-08-25 기준)
export const colors = {
  background: '#F4F1EA',
  surface: '#FBFAF6',
  surfaceSoft: '#ECE8DF',
  textPrimary: '#2F302C',
  textMuted: '#79786F',
  textFaint: '#A7A49A',
  accent: '#7C8660',       // 정확히 6개 승인된 용도로만 사용 — DESIGN.md 참고
  accentSoft: '#D8DDC9',
  line: '#DDD8CD',
  mapLand: '#E9E4D8',
  mapRoad: '#D2CDC1',
  mapWater: '#DDE3DF',
} as const;

export const typography = {
  screenTitle: { fontFamily: 'System', fontSize: 22, fontWeight: '600' },
  placeName: { fontFamily: 'System', fontSize: 16, fontWeight: '500' },
  timestamp: {
    fontFamily: 'ui-monospace',           // iOS 시스템 모노스페이스 (SF Mono 계열)
    fontSize: 15,
    fontWeight: '500',
    fontVariant: ['tabular-nums'] as const,
  },
  journalEntry: {
    fontFamily: 'Newsreader_400Regular_Italic', // @expo-google-fonts/newsreader
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 15 * 1.5,
  },
  helperText: { fontFamily: 'System', fontSize: 13, fontWeight: '400' },
} as const;

export const spacing = { '2xs': 4, xs: 8, sm: 12, md: 16, lg: 24, xl: 32, '2xl': 48, '3xl': 64 } as const;

export const motion = {
  bottomSheetSnapMs: 220,
  confirmPinDropMs: 160,
  saveStateCrossfadeMs: 180,
  easing: { enter: 'ease-out', exit: 'ease-in', move: 'ease-in-out' },
} as const;

export const radius = { sm: 4, md: 8, lg: 16, full: 9999 } as const;
```

### Pattern 2: SQLite 마이그레이션 프레임워크 (공식 레시피)
**What:** `PRAGMA user_version`을 읽어 현재 스키마 버전을 확인하고, 목표 버전까지 순차적으로 `if (currentDbVersion === N)` 블록을 실행한 뒤 마지막에 `PRAGMA user_version = TARGET`으로 갱신.
**When to use:** 앱 부팅 시 `SQLiteProvider`의 `onInit` 콜백으로 1회 실행. 이후 phase에서 컬럼/테이블을 추가할 때는 새로운 `if (currentDbVersion === N)` 블록만 추가(기존 블록은 절대 수정하지 않음 — 이미 마이그레이션된 기기의 데이터를 보존하기 위함).
**Example:**
```typescript
// src/db/migrations.ts
// Source: https://docs.expo.dev/versions/latest/sdk/sqlite/ (공식 마이그레이션 레시피)
import { type SQLiteDatabase } from 'expo-sqlite';

const DATABASE_VERSION = 1;

export async function migrateDbIfNeeded(db: SQLiteDatabase) {
  const result = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let currentDbVersion = result?.user_version ?? 0;

  if (currentDbVersion >= DATABASE_VERSION) {
    return;
  }

  if (currentDbVersion === 0) {
    await db.execAsync(`
      PRAGMA journal_mode = 'wal';
      CREATE TABLE IF NOT EXISTS checkins (
        id TEXT PRIMARY KEY NOT NULL,
        timestamp_utc TEXT NOT NULL,
        local_date_key TEXT NOT NULL,
        timezone_at_capture TEXT NOT NULL,
        lat REAL NOT NULL,
        lng REAL NOT NULL,
        accuracy_meters REAL,
        location_source TEXT NOT NULL,
        note TEXT,
        photo_path TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        schema_version INTEGER NOT NULL DEFAULT 1
      );
      CREATE TABLE IF NOT EXISTS daily_reflections (
        id TEXT PRIMARY KEY NOT NULL,
        date TEXT NOT NULL UNIQUE,
        new_place_answer TEXT,
        free_reflection TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
    currentDbVersion = 1;
  }

  // 다음 phase에서 컬럼 추가가 필요하면 여기에 새 블록 추가:
  // if (currentDbVersion === 1) { await db.execAsync('ALTER TABLE ...'); currentDbVersion = 2; }

  await db.execAsync(`PRAGMA user_version = ${currentDbVersion}`);
}
```
```typescript
// app/_layout.tsx (루트 레이아웃 — 스플래시 게이팅 + DB 초기화)
// Source: https://docs.expo.dev/develop/user-interface/fonts/ + https://docs.expo.dev/versions/latest/sdk/sqlite/
import { Newsreader_400Regular_Italic, useFonts } from '@expo-google-fonts/newsreader';
import { SQLiteProvider } from 'expo-sqlite';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { migrateDbIfNeeded } from '../src/db/migrations';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ Newsreader_400Regular_Italic });

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SQLiteProvider databaseName="footlog.db" onInit={migrateDbIfNeeded}>
      {/* Slot / 화면 트리 — 이후 phase에서 구성 */}
    </SQLiteProvider>
  );
}
```

### Anti-Patterns to Avoid
- **매일 앱 시작마다 `DROP TABLE` 후 재생성:** 마이그레이션 프레임워크의 존재 이유 자체를 무효화 — 절대 금지.
- **테마 라이브러리(Tamagui 등) 도입:** 요구사항이 명시한 "단일 상수 파일"보다 더 무거운 추상화 — 이 프로젝트 규모(1인, 단일 accent)에 부적합.
- **Newsreader를 "CDN에서 fetch"로 구현 시도:** DESIGN.md 문구를 문자 그대로 해석해 런타임에 `fonts.googleapis.com`을 fetch하려 하면 안 됨 — 오프라인 우선 원칙(PROJECT.md Constraints)과도 정면 충돌. `@expo-google-fonts/newsreader`로 번들링하는 것이 올바른 구현.
- **마이그레이션 블록 수정:** 이미 배포된 버전(`if (currentDbVersion === N)`)의 SQL을 사후에 고치면, 이미 그 버전을 거친 기기는 새 컬럼을 못 받는다. 항상 새 블록을 추가할 것.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SQLite 버전 추적 | 커스텀 `migrations` 테이블 + 자체 버전 비교 로직 | SQLite 내장 `PRAGMA user_version` | SQLite가 이미 정수 하나를 DB 파일 헤더에 영구 저장하는 기능을 제공 — 별도 테이블/락 관리가 불필요해짐. 공식 expo-sqlite 문서가 이 패턴을 정확히 권장 |
| 디자인 토큰 타입 안정성 | 커스텀 테마 context/Provider + 런타임 검증 | 단순 `as const` 객체 + TypeScript 타입 추론 | 다크모드도 없고(1단계 스코프 아님) 런타임 테마 전환도 없으므로 Context/Provider 오버헤드가 불필요. 컴파일타임 상수로 충분 |
| iOS 개발 빌드 배포 | 수동 Xcode Archive → TestFlight/사이드로딩 스크립트 | EAS Build (`eas build --profile development`) | 코드사인·프로비저닝 프로파일 관리를 EAS가 자동화 — 유료 Apple Developer 계정과 결합 시 7일 만료 문제도 없음(PROJECT.md에 이미 해소 명시) |
| SF Mono 폰트 접근 | 커스텀 네이티브 폰트 파일 번들링 | RN 제네릭 폰트 패밀리 `ui-monospace` | iOS에서 RN이 공식 지원하는 제네릭 이름이며 시스템이 알아서 SF Mono/사용자 설정에 맞는 모노스페이스로 해석 — 별도 폰트 파일 불필요 |

**Key insight:** Phase 1의 세 요구사항은 모두 "이미 존재하는 표준 도구를 정확히 그 도구가 설계된 방식대로 쓰면 끝나는" 종류다. 커스텀 코드가 필요한 지점은 오직 `src/theme/tokens.ts`의 값 자체(DESIGN.md에서 그대로 옮겨적기)와 `migrations.ts`의 테이블 스키마(constraints.md에서 그대로 옮겨적기)뿐이다.

## Common Pitfalls

### Pitfall 1: `cacheDirectory`와 `documentDirectory` 혼동 (사진 저장, Phase 4에서 실제 사용되지만 Foundation의 스키마 설계에 영향)
**What goes wrong:** `Checkin.photoPath` 컬럼에 `cacheDirectory` 기반 경로를 저장하면 OS가 캐시를 비울 때 참조가 조용히 깨진다.
**Why it happens:** Expo의 `FileSystem.cacheDirectory`와 `FileSystem.documentDirectory`가 API상 매우 유사해 보임.
**How to avoid:** 스키마 설계 단계(Phase 1)에서부터 `photoPath`는 상대/절대 경로 문자열로만 저장하고, 실제 파일 I/O 규약(반드시 `documentDirectory` 하위)은 이후 phase 문서에 명시 — Foundation phase는 컬럼만 만들면 되고 파일 쓰기 로직은 Phase 4 스코프.
**Warning signs:** 스키마에 `cacheDirectory`를 암시하는 경로 패턴이 하드코딩되어 있으면 안 됨.

### Pitfall 2: SDK 57 + jest-expo 피어 의존성 충돌 (Wave 0 테스트 인프라 구축 시)
**What goes wrong:** `jest-expo@57.0.0`이 `@react-native/jest-preset@^0.85.0`을 피어 의존성으로 선언하는데, SDK 57의 `react-native@0.86.0`은 `@react-native/jest-preset@0.86.0`을 peerOptional로 요구 — `npm install` 시 경고 또는 실패 가능.
**Why it happens:** Expo SDK 릴리스와 jest-expo 패키지 릴리스 사이의 버전 핀 타이밍 어긋남(GitHub Issue expo/expo#47435에서 확인됨).
**How to avoid:** `package.json`에 `"overrides": { "@react-native/jest-preset": "0.86.0" }` 추가.
**Warning signs:** `npm install jest-expo jest` 실행 시 peer dependency 경고가 뜨거나 `npm test` 실행 시 preset을 찾지 못한다는 에러.

### Pitfall 3: 마이그레이션 함수를 컴포넌트 렌더 중에 직접 호출
**What goes wrong:** `migrateDbIfNeeded`를 컴포넌트 body에서 직접 `await`하거나 `useEffect` 밖에서 호출하면 React 렌더 사이클과 충돌하거나 중복 실행될 수 있다.
**Why it happens:** 비동기 DB 초기화와 React 렌더 타이밍을 혼동.
**How to avoid:** 반드시 `SQLiteProvider`의 `onInit` prop으로 전달 — 이 prop은 Provider가 내부적으로 정확히 1회, DB 연결 직후에 실행하도록 보장된 공식 API.
**Warning signs:** 앱 재시작마다 콘솔에 `CREATE TABLE` 에러(이미 존재하는 테이블)가 반복적으로 찍힘.

### Pitfall 4: TypeScript 버전 임의 고정
**What goes wrong:** `npm view typescript version`이 알려주는 최신 버전(7.0.2, 네이티브 Go 기반 재작성 컴파일러)을 그대로 강제 설치하면 `create-expo-app` 템플릿이 내부적으로 검증한 TypeScript 버전과 어긋나 타입 에러가 발생할 수 있다.
**Why it happens:** TypeScript 7.x는 5.x 계열과 컴파일러 아키텍처가 크게 다른(네이티브 포팅) 메이저 릴리스 — Expo 생태계 전체가 아직 이 버전으로 완전히 검증되지 않았을 수 있음.
**How to avoid:** `npx create-expo-app`이 pin한 `typescript` 버전을 그대로 두고, 업그레이드가 필요하면 `npx expo install --check`로 Expo 호환성 검증을 거칠 것.
**Warning signs:** `npx tsc --noEmit` 실행 시 템플릿 생성 직후인데도 타입 에러가 발생.

## Code Examples

위 Architecture Patterns 섹션의 두 코드 블록(`migrations.ts`, `app/_layout.tsx`)이 이 phase의 핵심 코드 예시다. 추가로 `eas.json` 최소 구성:

```json
// eas.json
// Source: https://docs.expo.dev/build/eas-json/ (development 프로필 표준 구조)
{
  "cli": {
    "version": ">= 20.5.1"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "resourceClass": "m-medium"
      }
    }
  }
}
```

빌드/설치 커맨드:
```bash
eas build --platform ios --profile development
# 빌드 완료 후 CLI가 QR 코드/expo.dev 링크 제공 → iPhone에서 스캔 설치
npx expo start
# Dev Client가 이 Metro 서버에 연결되어 JS 번들을 로드
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| `expo-cli` (classic) | `eas-cli` + `npx expo`(로컬 CLI는 `expo` 패키지에 내장) | SDK 46 전후(2022) 이후 고착화 | classic `expo-cli`는 더 이상 사용되지 않음 — 반드시 `eas-cli`(빌드/제출용)와 `npx expo`(로컬 개발 서버용) 조합 사용 |
| React Navigation 수동 설치 | `expo-router`(파일 기반 라우팅)가 기본 템플릿에 내장 | SDK 50~57 사이 기본값으로 굳어짐 | 새 프로젝트는 네비게이션 보일러플레이트를 직접 짤 필요가 없음 — Phase 1에서는 라우터만 설치되고 실제 라우트 구조는 이후 phase 스코프 |
| `expo-sqlite`의 콜백 기반 구API(`Sqlite.openDatabase`) | `openDatabaseAsync`/`openDatabaseSync` + Promise 기반 API(`execAsync`, `runAsync`, `getFirstAsync`) | SDK 51(2024) 전후 신 API로 전환 완료 | 구 API 문서/예제를 참고할 경우 마이그레이션 코드가 동작하지 않음 — 반드시 신 Promise 기반 API 사용 |

**Deprecated/outdated:**
- `expo init`: `npx create-expo-app`으로 대체됨.
- `Sqlite.openDatabase(name)` 콜백 API: `openDatabaseAsync`로 대체됨 — 웹 검색 결과에 구버전 예제가 섞여 나올 수 있으니 주의.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|----------------|
| A1 | 앱 슬러그/패키지명(`FootLog` 등)과 iOS 번들 식별자(`com.<founder>.footlog` 형태)는 창업자가 아직 확정하지 않은 상세값 — 연구 중 임의로 예시값을 사용함 | Code Examples, Recommended Project Structure | 실제 EAS 프로젝트 등록/App Store Connect 등록 시 번들 ID를 나중에 바꾸면 재프로비저닝이 필요할 수 있음 — 플래너가 Phase 1 첫 태스크에서 사용자에게 확정값을 확인해야 함 |
| A2 | `eas.json`의 `resourceClass: "m-medium"`은 무료/기본 EAS 플랜에서 사용 가능하다고 가정 — 창업자 EAS 계정의 실제 플랜 등급은 확인하지 않음 | Code Examples | 계정 플랜에 따라 빌드가 큐에서 대기하거나 실패할 수 있음(대형 리소스 클래스는 유료 플랜 필요) — Environment Availability에서 계정 로그인은 확인했으나 플랜 등급은 미확인 |
| A3 | Newsreader 폰트의 정확한 사용 웨이트가 `Newsreader_400Regular_Italic` 하나뿐이라고 가정(DESIGN.md는 "15px, 400"만 명시) — 다른 웨이트(예: 볼드 강조)가 필요할 가능성은 배제하지 않음 | Pattern 1 code example | 이후 phase에서 다른 웨이트가 필요해지면 `useFonts` 호출에 추가 import만 하면 되므로 낮은 리스크 |

**참고:** 위 세 항목 모두 이 phase의 3개 요구사항(REQ-foundation-setup/design-tokens/sqlite-migrations)을 완료하는 데 필수적이지 않은 세부 설정값이며, 라이브러리·패턴 선택 자체는 전부 공식 문서로 검증됨(`[VERIFIED]`).

## Open Questions

1. **iOS 번들 식별자(Bundle Identifier)와 EAS 프로젝트 슬러그**
   - What we know: `eas build:configure`가 최초 실행 시 대화형으로 물어보며 자동 생성 가능. 창업자는 이미 유료 Apple Developer 계정 보유.
   - What's unclear: 창업자가 선호하는 도메인 역순 네이밍(`com.jaeseung.footlog` 등)이 아직 문서화되지 않음.
   - Recommendation: 플래너가 첫 태스크(프로젝트 스캐폴딩)에서 `eas build:configure`의 대화형 프롬프트에 맡기거나, 실행 직전 사용자에게 1회 확인.

2. **`typescript: strict` 모드 활성화 여부**
   - What we know: Expo 공식 문서는 기본적으로 strict를 켜지 않지만("user-friendly 기본값"), 켜는 것을 권장 옵션으로 소개.
   - What's unclear: 이 프로젝트(1인 창업자, 빠른 반복)가 strict 모드의 엄격함을 원하는지 CONTEXT.md/PROJECT.md 어디에도 명시 안 됨.
   - Recommendation: 신규 프로젝트이므로 처음부터 `"strict": true`로 시작하는 것을 권장(나중에 켜는 것보다 처음부터 켜는 게 훨씬 저비용) — Claude's Discretion 영역으로 플래너가 결정.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | 전체 빌드 툴체인 | ✓ | v22.21.1 | — |
| npm | 패키지 설치 | ✓ | 10.9.4 | — |
| eas-cli | EAS 빌드/제출 | ✓ | 20.5.1 | — |
| EAS 계정 로그인 | `eas build` 실행 | ✓ | `jaeseungchoun` (Owner role) 로그인 확인됨 | — |
| Xcode | iOS 네이티브 빌드 로컬 검증/시뮬레이터 | ✓ | 26.6 (Build 17F113) | EAS 클라우드 빌드가 있으므로 로컬 Xcode는 필수는 아니나, 시뮬레이터 디버깅에 유용 |
| CocoaPods | iOS 네이티브 의존성 관리(로컬 빌드 시) | ✓ | 1.17.0 | EAS 클라우드 빌드 사용 시 로컬 CocoaPods 불필요 |
| iOS 시뮬레이터 | 실기기 없이 빠른 반복 | ✓ | iOS 26.5 (iPhone 17 Pro 등 다수) | — |
| 창업자 실물 iPhone | Success Criteria 1 (Dev Client 설치·실행) | 미확인(연구 시점에 물리적 기기 접근 불가) | — | 창업자가 직접 iPhone에서 EAS 빌드 링크로 설치해야 함 — 이 부분은 코드로 검증 불가능한 human-verify 단계 |

**Missing dependencies with no fallback:**
- 없음 (핵심 툴체인 전부 사용 가능)

**Missing dependencies with fallback:**
- 창업자 실물 iPhone 설치 확인 — 코드/CI로 검증 불가, 반드시 `checkpoint:human-verify` 태스크로 플랜에 포함되어야 함(Success Criteria 1 자체가 "창업자가 설치·실행할 수 있다"이므로).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | jest-expo 57.0.4 + jest 30.4.2 (신규 설치 필요 — 현재 저장소에 테스트 인프라 전무) |
| Config file | none — Wave 0에서 `jest.config.js`(`preset: 'jest-expo'`) 생성 필요 |
| Quick run command | `npx jest src/db/migrations.test.ts` |
| Full suite command | `npx jest` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| REQ-foundation-setup | EAS Dev Client가 iPhone에 설치·실행됨 | manual (human-verify) | 해당 없음 — 물리적 기기 설치는 자동화 불가 | N/A |
| REQ-design-tokens | `src/theme/tokens.ts`가 DESIGN.md의 모든 값을 정확히 export | unit | `npx jest src/theme/tokens.test.ts -x` | ❌ Wave 0 |
| REQ-sqlite-migrations | `migrateDbIfNeeded`가 (a) 빈 DB에서 테이블을 생성하고 (b) 기존 데이터가 있는 DB에서 재실행 시 데이터를 보존하며 (c) `PRAGMA user_version`을 올바르게 갱신함 | unit/integration | `npx jest src/db/migrations.test.ts -x` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx jest <해당 test 파일>`
- **Per wave merge:** `npx jest`(전체 스위트)
- **Phase gate:** 전체 스위트 green + 창업자의 실물 기기 설치 확인(human-verify) 후 `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `jest.config.js` — `preset: 'jest-expo'` 설정, SDK 57 피어 의존성 오버라이드(`"overrides": { "@react-native/jest-preset": "0.86.0" }`) 포함
- [ ] `src/theme/tokens.test.ts` — DESIGN.md 값과의 스냅샷/값 비교 테스트
- [ ] `src/db/migrations.test.ts` — in-memory 또는 임시 SQLite DB를 열어 마이그레이션 함수의 idempotency(재실행 안전성)와 데이터 보존을 검증하는 테스트. `expo-sqlite`는 Node 환경에서 직접 동작하지 않으므로 `jest-expo`의 Node 플랫폼 프리셋 또는 모킹 전략이 필요 — 태스크 세분화 시 이 스텁 마련이 선행 작업으로 필요
- [ ] Framework install: `npx expo install jest-expo jest @testing-library/react-native` — 현재 미설치

## Security Domain

이 phase는 네트워크 호출도, 인증도, 사용자 입력 검증이 필요한 폼도 없는 순수 로컬 인프라 phase다 — ASVS의 대부분 카테고리가 이 시점에서는 해당 없음(N/A). 아래는 그럼에도 짚어야 할 항목만 정리.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-------------------|
| V2 Authentication | No | 1단계는 단일 사용자, 인증 개념 자체가 없음(PROJECT.md Out of Scope) |
| V3 Session Management | No | 세션 없음 — 로컬 전용 |
| V4 Access Control | No | 다중 사용자 없음 |
| V5 Input Validation | Partial | SQLite 마이그레이션 SQL은 `execAsync`(리터럴 DDL, 사용자 입력 없음)로만 실행 — 사용자 데이터 삽입은 이후 phase(`runAsync` + 파라미터 바인딩)에서 발생하므로 이 phase는 리스크 낮음. 단, 마이그레이션 함수 자체에 사용자 입력을 절대 문자열 보간하지 않도록 원칙만 기록 |
| V6 Cryptography | No | 로컬 SQLite 파일은 iOS 표준 파일 보호(File Protection) 수준에 의존 — 이 phase에서 별도 암호화 계층을 만들지 않음(요구사항에 없음, 과설계 위험) |

### Known Threat Patterns for Expo/React Native + expo-sqlite

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|----------------------|
| SQL Injection(향후 phase에서 `runAsync`에 사용자 입력을 문자열 보간할 경우) | Tampering | 이번 phase에서는 발생하지 않지만, 마이그레이션 코드 자체가 이후 phase 개발자에게 "파라미터 바인딩(`?` placeholder) 우선" 관례를 선례로 남겨야 함 — `runAsync('INSERT INTO todos (value, intValue) VALUES (?, ?)', ...)` 패턴을 Code Examples에서부터 일관되게 사용 |
| 서명되지 않은/탈취된 Dev Client 빌드 배포 | Spoofing | EAS Build의 코드사인 + Apple Developer 유료 계정 프로비저닝 프로파일이 기본 방어선 — 배포 링크(QR/expo.dev)를 공개 채널에 공유하지 않는 것이 유일한 추가 통제(단일 사용자 앱이라 리스크 매우 낮음) |

## Sources

### Primary (HIGH confidence)
- https://docs.expo.dev/versions/latest/sdk/sqlite/ — `PRAGMA user_version` 마이그레이션 공식 레시피, `SQLiteProvider onInit` 패턴
- https://docs.expo.dev/develop/development-builds/introduction/ — Dev Client 설치/빌드 워크플로우, Apple Developer 유료 계정 요구사항
- https://docs.expo.dev/develop/user-interface/fonts/ — `@expo-google-fonts/*` 패키지 컨벤션, `useFonts` + 스플래시 게이팅 공식 예제
- https://docs.expo.dev/more/create-expo/ — `create-expo-app` 템플릿 종류, 기본 템플릿 구성(Expo Router + TypeScript)
- https://docs.expo.dev/guides/typescript/ — `expo/tsconfig.base` 표준, strict 모드 옵션 설명
- https://docs.expo.dev/build/eas-json/ — `eas.json` development 프로필 스키마
- https://reactnative.dev/docs/text-style-props — `fontVariant: ['tabular-nums']`, iOS 제네릭 폰트 패밀리(`ui-monospace` 등) 공식 지원 확인
- `npm view <package> version`(직접 실행, 2026-08-25) — 모든 Standard Stack 버전 실측
- `slopcheck scan --pkg npm <package> --json`(직접 실행, 2026-08-25, slopcheck 0.6.1) — 전 패키지 `OK` 판정

### Secondary (MEDIUM confidence)
- https://github.com/expo/expo/issues/47435 — SDK 57 + jest-expo 피어 의존성 충돌(Common Pitfall 2의 근거, GitHub 이슈 트래커이므로 공식 문서보다 한 단계 낮은 신뢰도)
- WebSearch 결과(jest-expo 설치 커맨드, React Native 제네릭 폰트 패밀리 설명) — 공식 문서(reactnative.dev, docs.expo.dev)로 교차검증됨

### Tertiary (LOW confidence)
- 없음 — 이번 연구는 전 항목이 공식 문서 또는 npm 레지스트리 실측으로 검증됨

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — 전 패키지 npm 레지스트리 실측 + 공식 Expo 문서 인용 + slopcheck OK
- Architecture: HIGH — Expo/expo-sqlite 공식 레시피를 그대로 인용, 커스텀 설계 요소 없음
- Pitfalls: MEDIUM — SDK 57/jest-expo 피어 의존성 이슈는 GitHub 이슈 트래커 출처(공식 문서 아님)라 시간이 지나면 해소될 수 있음; 나머지 Pitfall은 공식 문서/RN 공식 문서 기반 HIGH

**Research date:** 2026-08-25
**Valid until:** 2026-09-24(Expo SDK는 몇 달 주기로 메이저 릴리스가 나오는 빠르게 변화하는 생태계 — 30일 기준 적용)
