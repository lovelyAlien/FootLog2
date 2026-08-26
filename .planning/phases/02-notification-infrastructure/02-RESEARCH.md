# Phase 2: Notification Infrastructure - Research

**Researched:** 2026-08-27
**Domain:** Expo local notifications (iOS), repeating calendar triggers, permission priming/denied-flow UX
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**알림 빈도 UI 경계 (Phase 2 vs Phase 6)**
- **D-01:** Phase 2는 빈도 선택 UI(설정 화면)를 만들지 않는다. `scheduleNotifications(frequency)`류 함수를 매시간/3시간마다/끔 3개 값으로 파라미터화해 통합 테스트로만 검증한다. 실제 설정 화면 UI는 Phase 6(Calendar tab, 햄버거 메뉴 → 설정 화면)에서 구현한다.
- **D-02:** Phase 2 동안 앱이 실제로 동작할 때 쓰는 하드코딩 기본 빈도는 **매시간**이다.

**권한 프롬프트 문구 (Info.plist)**
- **D-03:** 위치/카메라/사진 라이브러리 3개의 Info.plist usage description은 PROJECT.md 전제 #6(담담한 톤)에 맞춰 아래 초안으로 작성한다. 창업자가 나중에 확인/수정 가능하며 지금 확정은 아니다.
  - `NSLocationWhenInUseUsageDescription`: "체크인 위치를 기록하려면 위치 정보가 필요해요."
  - `NSCameraUsageDescription`: "체크인에 사진을 남기려면 카메라 접근이 필요해요."
  - `NSPhotoLibraryUsageDescription`: "체크인에 사진을 첨부하려면 사진 보관함 접근이 필요해요."
- **D-04:** 문구는 한국어만 작성한다(영어 병기 없음) — 1단계 유일 사용자(창업자)는 한국어 로케일을 사용한다.
- **D-05:** '알림' 권한 프롬프트 문구는 iOS에 Info.plist 키가 없어(OS가 커스텀 문구를 지원하지 않음) 이미 확정된 priming 화면 문구("매시간 알림으로 지금 어디 있는지 잠깐 기록해요")로 REQ-permission-copy를 충족한 것으로 간주한다. 별도 작업 불필요.

**시간대 변경 검증**
- **D-06:** 반복 캘린더 트리거가 기기 시간대 변경 시 올바르게 재정렬되는지에 대한 실기기 검증은 Phase 2 범위에서 **제외**한다. 실기기(창업자 iPhone)는 Phase 1에서 이미 확보됐지만, 사용자가 지금 당장은 다루지 않기로 결정 — TODOS.md에 계속 유예.

**자가진단 상태 가시성**
- **D-07:** 자가진단(포그라운드 복귀 시 트리거 존재 확인 및 재생성)의 동작 확인은 개발 빌드의 콘솔 로그(`console.log`)만으로 충분하다. 사용자에게 보이는 UI 신호는 만들지 않는다 — 문서의 "조용히 재생성" 원칙을 그대로 유지.

### Claude's Discretion

논의된 4개 영역 모두 구체적 결정으로 마무리됨 — 별도로 위임된 재량 영역 없음. 단, 레지스트리 내부 자료구조(배열 스키마 `[{id, kind, recreate()}, ...]`)의 정확한 구현 방식은 product-design.md의 설명을 기반으로 연구/계획 단계에서 자유롭게 판단.

### Deferred Ideas (OUT OF SCOPE)

- **시간대 변경 시 반복 트리거 재정렬 실기기 검증** (D-06) — Phase 2에서 제외, TODOS.md에 계속 유예. 실기기는 이미 확보되어 있으므로 창업자가 원할 때 언제든 별도로 확인 가능.
- Phase 2가 만들지 않는 것: 빈도(매시간/3시간마다/끔)를 사용자가 직접 바꾸는 설정 화면 UI — Phase 6(Calendar tab) 소관.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| REQ-notification-scheduling | `checkin`과 `daily_reflection` 두 종류 모두에 대해 반복 캘린더 트리거(방법 A, minute 컴포넌트만, `repeats:true`)를 스케줄링하며, "설정으로 꺼짐"과 "예기치 않게 사라짐"을 구분하고, 다중 트리거 부분 실패를 감지하며, 빈도 변경 시 고아 트리거를 정리하는 자가진단 레지스트리 | Code Examples §1–4, Architecture Patterns §Pattern 1–2, Don't Hand-Roll, Common Pitfalls §1–4 — `CalendarNotificationTrigger`의 모든 date 컴포넌트가 optional임을 expo/expo 소스에서 직접 확인, 결정론적 identifier 기반 self-diagnosis 패턴 |
| REQ-permission-copy | iOS 권한 프롬프트 4종(위치/카메라/사진 라이브러리/알림) 전부에 대해 OS 다이얼로그 전에 표시되는 확정 문구 | Architecture Patterns §Pattern 3(app.json infoPlist vs 향후 phase 플러그인 충돌), Common Pitfalls §5 |
| REQ-notification-denied-flow | 알림 권한 거부 시 priming → OS 프롬프트 → 조용한 상태 배너 + 설정 딥링크, 앱 복귀 시 `AppState` 기반 재확인 | Code Examples §5–7, Don't Hand-Roll, Common Pitfalls §6 |
</phase_requirements>

## Summary

Phase 2는 순수 클라이언트(Expo/iOS) 로컬 알림 인프라다. 서버도, 새 UI 화면 프레임워크도 필요 없다 — `expo-notifications`(로컬 알림 스케줄링·조회·취소·권한) 하나만 신규 설치하면 되고, 설정 딥링크는 이미 설치된 `expo-linking`의 `openSettings()`로 해결된다. 핵심은 라이브러리 사용법이 아니라 **정확한 트리거 스펙과 자가진단 아키텍처**다.

expo/expo 공식 저장소 소스(`NotificationScheduler.types.ts`, `scheduleNotificationAsync.ts`)를 직접 읽어 확인한 결과, iOS `CalendarNotificationTrigger`(`type: 'calendar'`)는 `year/month/day/hour/minute/second` 등 모든 날짜 컴포넌트가 **전부 optional**이며 DAILY/WEEKLY/MONTHLY/YEARLY 트리거 타입과 달리 `hour`+`minute` 필수 검증(`validateDateComponentsInTrigger`)을 거치지 않는다. 즉 `{ type: 'calendar', minute: 0, repeats: true }`처럼 `minute`만 지정하면 iOS `UNCalendarNotificationTrigger`의 네이티브 동작(지정 안 한 컴포넌트는 와일드카드) 그대로 "매시간 정각"에 반복 발화한다 — PROJECT.md가 "가정"으로만 적어뒀던 방법 A의 핵심 메커니즘이 이번 연구로 소스 레벨 사실로 격상됐다. 3시간마다는 이 방식으로 단일 트리거가 안 되므로(캘린더 트리거는 "매 X시간마다" 반복 개념이 없다), `hour: 0,3,6,...,21 / minute: 0` 조합의 트리거 8개를 개별 등록해야 한다 — PROJECT.md의 "3시간마다 최대 8개"와 정확히 일치.

또 하나의 소스 레벨 발견은 `scheduleNotificationAsync({ identifier, content, trigger })`가 `request.identifier ?? uuid.v4()`로 **커스텀 identifier를 그대로 존중**한다는 점이다(웹 검색 결과는 "커스텀 identifier 불가"라고 잘못 안내했으나, 실제 소스 코드는 이를 지원함을 확인). 이 사실이 자가진단 레지스트리 설계를 크게 단순화한다: 매번 예측 불가능한 UUID를 저장해 뒀다가 비교하는 대신, `checkin-hourly`, `checkin-3h-0`~`checkin-3h-7`, `daily_reflection`처럼 **결정론적 문자열 ID**를 직접 지정해 스케줄링하면, 포그라운드 복귀 시 `getAllScheduledNotificationsAsync()`가 반환한 identifier 집합과 "현재 설정에서 기대되는 identifier 집합"을 단순 Set 비교만으로 자가진단할 수 있다 — 이는 D-07("영속 저장 불필요, 매 포그라운드 복귀마다 즉시 조회")과 정확히 맞아떨어지며 AsyncStorage 등 별도 영속 계층이 전혀 필요 없다.

권한 상태 판별은 `getPermissionsAsync()`/`requestPermissionsAsync()`가 반환하는 크로스플랫폼 표준 `PermissionResponse`(`status: 'granted'|'denied'|'undetermined'`, `granted: boolean`, `canAskAgain: boolean`)를 쓰면 되고, iOS 전용 세부 상태(`ios.status` enum)는 이번 phase의 판단 로직(배너 노출 여부)에는 불필요하다.

**Primary recommendation:** `expo-notifications`(신규 설치) + 기존 `expo-linking`만으로 구현. 결정론적 identifier 배열 기반 레지스트리로 자가진단하고, `CalendarNotificationTrigger`는 `type: SchedulableTriggerInputTypes.CALENDAR`에 필요한 컴포넌트만(매시간=`minute`만, 3시간마다=`hour`+`minute` 8세트) 지정한다.

## Architectural Responsibility Map

이 앱은 서버가 없는 순수 로컬 iOS 앱이므로 표준 티어(Browser/SSR/API/CDN/DB)를 모바일 맥락으로 치환했다.

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| 반복 캘린더 트리거 스케줄링/취소/조회 | Native (iOS `UNUserNotificationCenter`, `expo-notifications` 브릿지) | Client (JS 모듈이 어떤 트리거를 요청할지 결정) | 실제 스케줄 저장/발화는 iOS 시스템이 소유 — 앱이 꺼져 있어도 발화해야 하므로 |
| 자가진단 레지스트리(존재 확인 + 재생성) | Client (JS, 앱 부팅/AppState 리스너 내부) | Native (조회 대상은 `getAllScheduledNotificationsAsync()`) | 판단 로직(기대 vs 실제 비교, 설정값 확인)은 JS 레벨 순수 로직이라 영속 저장소 불필요 |
| 권한 프롬프트 문구(Info.plist) | Client (`app.json` `ios.infoPlist`, 빌드 타임) | — | iOS 빌드 산출물의 정적 설정, 런타임 로직 없음 |
| 알림 거부 배너 + 설정 딥링크 | Client (UI 레이어, `src/app` 화면) | Native (`Linking.openSettings()`가 iOS 설정 앱으로 전환) | UI 표시/판단은 앱 책임, 실제 전환은 OS가 수행 |
| 포그라운드 복귀 감지 | Client (`AppState.addEventListener('change', ...)`, `src/app/_layout.tsx`) | — | React Native 표준 API, 서버/네이티브 모듈 불필요 |
| 알림 설정값(빈도/토글) | Client (Phase 2는 하드코딩 상수, Phase 6/7이 영속화) | Local Storage (SQLite, Phase 6/7에서 도입) | Phase 2는 D-01에 따라 설정 UI/영속화 없음 — 함수 파라미터로만 존재 |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `expo-notifications` | `~57.0.14` (SDK 57과 매칭) | 로컬 알림 스케줄링/조회/취소, 알림 권한 요청·조회 | Expo 공식 알림 모듈 — bare 네이티브 모듈 없이 `UNUserNotificationCenter`를 완전히 감쌈. 이미 SDK 57로 고정된 프로젝트의 다른 `expo-*` 패키지들과 동일한 `~57.x` 라인 [VERIFIED: npm registry, 2020-03-30 최초 배포, 주간 다운로드 ~436만, 공식 `expo/expo` 모노레포, postinstall 스크립트 없음] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `expo-linking` | `~57.0.7` (이미 설치됨) | `Linking.openSettings()`로 iOS 설정 앱의 이 앱 설정 화면으로 딥링크 | 알림 거부 배너 탭 핸들러 — 신규 설치 불필요, 기존 의존성 재사용 [CITED: docs.expo.dev/versions/latest/sdk/linking] |
| React Native core `AppState` | RN `0.86.2`에 포함 | 포그라운드 복귀 감지 → 권한 재확인 + 자가진단 트리거 | `src/app/_layout.tsx`에 이미 있는 루트 레이아웃에 리스너 추가 — 별도 패키지 불필요 |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `expo-notifications`의 `CalendarTriggerInput`(방법 A) | `expo-task-manager` + 매일 재스케줄링(방법 B) | PROJECT.md에서 이미 방법 A로 확정·잠금된 결정 — 재검토 대상 아님. 방법 B는 백그라운드 태스크 신뢰성 이슈(iOS가 백그라운드 실행 시간을 보장하지 않음)와 64개 한도 관리 복잡도가 추가로 필요해 개인용 도구 규모에 과함 |
| Expo 공식 `expo-notifications` | 서드파티 `react-native-notifications`, `notifee` 등 | 둘 다 bare 네이티브 모듈이라 Expo Dev Client의 관리형 워크플로 이점을 깨뜨림. Expo가 SDK 57까지 공식 유지하는 동등 기능 모듈이 있으므로 불필요 |
| 결정론적 커스텀 identifier | `scheduleNotificationAsync()`가 반환하는 자동 UUID를 별도 저장(AsyncStorage 등)해 비교 | 커스텀 identifier 방식이 D-07(영속 저장 불필요)과 정확히 부합하고 코드도 더 단순함 — UUID 저장 방식은 불필요한 영속 계층을 추가하고 "앱 재설치/스토리지 초기화 시 저장된 ID를 잃어버려 orphan 트리거를 놓치는" 새로운 실패 모드를 만듦 |

**Installation:**
```bash
npx expo install expo-notifications
```
(`npx expo install`은 현재 SDK 57과 호환되는 버전을 자동 선택 — `npm install expo-notifications`로 직접 설치하면 SDK 불일치 버전이 잡힐 수 있으므로 반드시 `expo install` 사용)

**Version verification:** `npm view expo-notifications version` → `57.0.14` (2026-08-27 확인, 최신 SDK 57 라인, `latest`/`next` dist-tag 모두 이 버전). `npm view expo-notifications time.created` → `2020-03-30` (6년 이상 유지된 공식 패키지).

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| `expo-notifications` | npm | ~6년 (2020-03-30 최초 배포) | ~436만/주 | `github.com/expo/expo` (공식 모노레포) | [OK] | Approved |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

`slopcheck install expo-notifications`를 실행해 검증했으며 `[OK]` 판정을 받았다. 참고: `slopcheck install` 서브커맨드는 실제로 `npm install`을 실행해 프로젝트 `package.json`/`package-lock.json`을 변경하는 부작용이 있음을 이번 연구 중 확인했다 — 연구 단계에서는 실행 후 즉시 `git checkout -- package.json package-lock.json` + `npm install`로 되돌려 실제 설치는 실행(Plan) 단계로 미뤘다. **플래너 주의사항:** 실행 태스크가 `expo-notifications`를 실제로 설치할 때는 `npx expo install expo-notifications`를 사용할 것(SDK 버전 호환 보장), `slopcheck install`이나 `npm install`을 직접 쓰지 말 것 — 둘 다 SDK 불일치 버전을 잡을 위험이 있다.

## Architecture Patterns

### System Architecture Diagram

```
[앱 콜드스타트 / 포그라운드 복귀 (AppState: background → active)]
                    |
                    v
        [알림 권한 상태 조회: getPermissionsAsync()]
                    |
          granted? ---- no ----> [배너 표시: "알림이 꺼져있어요 · 설정에서 켜기"]
                    |                          |
                   yes                  탭 시 Linking.openSettings()
                    |                          |
                    v                          v (설정 화면에서 사용자가 직접 켬)
        [배너 숨김 (이미 떠 있었다면)]      (다음 포그라운드 복귀 때 재평가)
                    |
                    v
        [자가진단 레지스트리 순회: [{id, kind, recreate}, ...]]
                    |
        각 항목마다: 현재 설정에서 이 트리거가 "켜져 있어야 하는가"?
                    |
        아니오(빈도=끔 / 회고 토글=off) ----> [스킵, 재생성 안 함]
                    |
                   예
                    |
                    v
        [getAllScheduledNotificationsAsync()로 실제 등록된 identifier 집합 조회]
                    |
        기대 identifier 집합 ⊆ 실제 집합? ---- yes ----> [정상, 아무 것도 안 함]
                    |
                   no (일부/전체 누락 — 조용한 실패 감지)
                    |
                    v
        [누락된 것만 recreate() 호출 → scheduleNotificationAsync({identifier, ...})]
                    |
                    v
        [console.log로 재생성 사실 기록 (D-07: UI 신호 없음)]


[사용자가 빈도를 매시간 → 3시간마다로 변경 (Phase 2 시점: 파라미터 변경 = 통합 테스트 트리거)]
                    |
                    v
        [기존 빈도의 identifier들을 cancelScheduledNotificationAsync로 전부 취소]
        [새 빈도의 identifier 세트로 scheduleNotificationAsync 재등록]
                    |
        (중간 실패 시 고아 트리거 발생 가능 — 다음 포그라운드 자가진단이
         "기대 집합 밖의 identifier"를 찾아 취소해야 함, Common Pitfall #4 참고)
```

### Recommended Project Structure

```
src/
├── notifications/
│   ├── registry.ts          # [{id, kind, recreate}] 레지스트리 정의 + selfHeal() 함수
│   ├── scheduling.ts        # scheduleNotifications(frequency), cancel/reschedule 로직
│   ├── permissions.ts       # getPermissionsAsync 래핑, 배너 표시 여부 판단 헬퍼
│   ├── content.ts           # 고정 알림 문구 상수 (checkin/daily_reflection)
│   └── *.test.ts            # 각 모듈 단위 테스트
├── app/
│   ├── _layout.tsx          # AppState 리스너 추가 위치 (기존 SQLiteProvider 배선 옆)
│   └── index.tsx            # 배너 렌더링 후보 위치 (Phase 4 Today view 전까지 임시)
```

### Pattern 1: 결정론적 identifier로 자가진단 단순화

**What:** `scheduleNotificationAsync()`에 커스텀 `identifier`를 지정해, 저장소 없이 문자열 비교만으로 self-heal 판정.
**When to use:** 이 phase의 자가진단 레지스트리 전체.
**Example:**
```typescript
// Source: github.com/expo/expo packages/expo-notifications/src/scheduleNotificationAsync.ts
// (request.identifier ?? uuid.v4() — 커스텀 identifier가 존중됨을 소스에서 확인)
import * as Notifications from 'expo-notifications';

const HOURLY_ID = 'checkin-hourly';

async function ensureHourlyCheckinTrigger() {
  await Notifications.scheduleNotificationAsync({
    identifier: HOURLY_ID,
    content: { title: '체크인', body: '지금 어디 있는지 잠깐 기록해요' },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
      minute: 0, // hour 미지정 = 매시간 정각마다 발화 (iOS UNCalendarNotificationTrigger 와일드카드 매칭)
      repeats: true,
    },
  });
}

// 자가진단: 저장소 없이 매번 라이브 조회
async function selfHeal(expectedIds: string[], isEnabled: () => boolean, recreate: () => Promise<void>) {
  if (!isEnabled()) return; // D-07 / 브레인스토밍 수정: 의도적으로 꺼진 트리거는 되살리지 않음
  const actual = await Notifications.getAllScheduledNotificationsAsync();
  const actualIds = new Set(actual.map((n) => n.identifier));
  const missing = expectedIds.filter((id) => !actualIds.has(id));
  if (missing.length > 0) {
    console.log(`[notifications] self-heal: missing ${missing.join(', ')}, recreating`);
    await recreate();
  }
}
```

### Pattern 2: 3시간마다 = 다중 CALENDAR 트리거 (단일 "간격" 트리거 없음)

**What:** iOS `UNCalendarNotificationTrigger`에는 "N시간마다" 개념이 없다 — `hour`+`minute`을 각각 고정한 개별 트리거를 여러 개 등록해야 한다.
**When to use:** 빈도="3시간마다"일 때.
**Example:**
```typescript
// Source: github.com/expo/expo packages/expo-notifications/src/NotificationScheduler.types.ts
// (NativeCalendarTriggerInput의 모든 date 컴포넌트가 optional, DAILY와 달리 hour+minute 필수 검증 없음)
const EVERY_3H_HOURS = [0, 3, 6, 9, 12, 15, 18, 21]; // 8개, iOS 64개 한도에 여유 있음

async function scheduleEvery3Hours() {
  for (const hour of EVERY_3H_HOURS) {
    await Notifications.scheduleNotificationAsync({
      identifier: `checkin-3h-${hour}`,
      content: { title: '체크인', body: '지금 어디 있는지 잠깐 기록해요' },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
        hour,
        minute: 0,
        repeats: true,
      },
    });
  }
}
```

### Pattern 3: 권한 문구는 app.json의 `ios.infoPlist`에 직접 (Phase 2 시점)

**What:** `expo-location`/`expo-image-picker`가 아직 설치되지 않은 Phase 2 시점에는, 해당 패키지의 config plugin(예: `locationWhenInUsePermission`)이 아니라 `ios.infoPlist`에 키를 직접 써야 한다.
**When to use:** T18 (권한 프롬프트 문구 확정) 태스크.
**Example:**
```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "ITSAppUsesNonExemptEncryption": false,
        "NSLocationWhenInUseUsageDescription": "체크인 위치를 기록하려면 위치 정보가 필요해요.",
        "NSCameraUsageDescription": "체크인에 사진을 남기려면 카메라 접근이 필요해요.",
        "NSPhotoLibraryUsageDescription": "체크인에 사진을 첨부하려면 사진 보관함 접근이 필요해요."
      }
    }
  }
}
```

### Pattern 4: 알림 거부 배너 + AppState 재확인

**What:** 조용한 회색 텍스트 배너, 판단 없는 시스템 상태 표시(DESIGN.md 톤 원칙 준수).
**Example:**
```typescript
// Source: docs.expo.dev/versions/latest/sdk/notifications/ + docs.expo.dev/versions/latest/sdk/linking/
// PermissionResponse 표준 필드 확인: github.com/expo/expo packages/expo-modules-core/src/PermissionsInterface.ts
import { AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Linking from 'expo-linking';

function useNotificationPermissionBanner() {
  const [granted, setGranted] = useState(true); // 초기값: priming 화면 통과 가정, 실제로는 마운트 시 1회 조회

  const recheck = useCallback(async () => {
    const status = await Notifications.getPermissionsAsync();
    setGranted(status.granted); // PermissionResponse.granted: boolean — 표준화된 필드, ios.status enum 불필요
  }, []);

  useEffect(() => {
    recheck();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') recheck();
    });
    return () => sub.remove();
  }, [recheck]);

  return { showBanner: !granted, openSettings: () => Linking.openSettings() };
}
```

### Anti-Patterns to Avoid

- **`shouldShowAlert`만 설정한 `setNotificationHandler`:** SDK 57 기준 `shouldShowAlert`는 deprecated — `shouldShowBanner`+`shouldShowList`를 명시적으로 설정할 것. (foreground 알림 표시 설정 자체는 Phase 2에서 필수는 아니지만, 만약 handler를 등록한다면 최신 필드 사용)
- **UUID 자동생성 identifier를 별도 저장소(AsyncStorage 등)에 저장해 비교:** Pattern 1처럼 커스텀 identifier를 직접 지정하면 이 저장 계층 자체가 불필요해진다 — D-07 원칙과도 상충(영속 저장 불필요).
- **`ios.status`(IosAuthorizationStatus enum) 기준으로 배너 표시 여부 판단:** 크로스플랫폼 표준 `status`/`granted` 필드로 충분 — iOS 전용 enum까지 분기할 필요 없음(PROVISIONAL/EPHEMERAL 등은 이 앱이 요청하지 않는 옵션이라 등장하지 않음).
- **`npm install expo-notifications` 직접 사용:** 반드시 `npx expo install expo-notifications`로 설치 — SDK 57과 호환되지 않는 버전이 잡힐 위험을 방지.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 알림 권한 상태 판별(승인/거부/미결정) | 커스텀 네이티브 모듈 또는 `ios.status` enum 수동 매핑 | `Notifications.getPermissionsAsync()`의 표준 `PermissionResponse` (`status`/`granted`/`canAskAgain`) | Expo가 이미 iOS `UNAuthorizationStatus`를 크로스플랫폼 표준 형태로 정규화해 제공 |
| iOS 설정 앱 딥링크 | `Linking.openURL('app-settings:')` 직접 호출 | `expo-linking`의 `Linking.openSettings()` | 내부적으로 동일한 URL 스킴을 쓰지만, 플랫폼 분기(웹에서 `UnavailabilityError` throw 등)를 이미 처리해 둠 |
| "매시간" 반복 알림 | `setInterval`/백그라운드 태스크로 매시간 알림을 직접 재스케줄링 | iOS `CalendarNotificationTrigger`의 minute-only 와일드캅 매칭(`repeats:true`) | iOS는 백그라운드 JS 실행을 보장하지 않음 — 네이티브 OS 트리거만이 앱이 꺼져 있어도 신뢰성 있게 발화 |
| "3시간마다" 반복 | 커스텀 간격 계산 로직 | `hour` 값을 8개로 고정한 CALENDAR 트리거 8개 등록(Pattern 2) | iOS 64개 pending 한도 내에서 안전하고, `repeats:true` 트리거 하나는 몇 번을 발화하든 pending 한도를 1개만 소비(자동 재스케줄되는 트리거는 단일 항목으로 카운트됨) |

**Key insight:** 이 도메인에서 "직접 만들고 싶은 유혹"은 대부분 iOS가 이미 네이티브 레벨에서 해결한 문제(권한 상태 정규화, 설정 딥링크, 반복 발화)를 JS 레벨에서 재구현하려는 시도다. `expo-notifications`/`expo-linking`이 이 모든 것을 이미 감싸고 있으므로, Phase 2의 실제 "새로 짜야 할 코드"는 오직 **자가진단 레지스트리의 비교/판단 로직**뿐이다.

## Common Pitfalls

### Pitfall 1: iOS 반복 캘린더 트리거가 며칠 뒤 조용히 멈춤
**What goes wrong:** `repeats:true` CALENDAR 트리거가 등록 직후엔 정상 작동하다가, 문서화된 iOS 버그로 인해 며칠 뒤부터 발화하지 않게 됨.
**Why it happens:** [expo/expo#18068](https://github.com/expo/expo/issues/18068), [Apple Developer Forums thread 670622](https://developer.apple.com/forums/thread/670622) — iOS 시스템 레벨 이슈로 알려져 있으며 expo-notifications 자체의 버그가 아님.
**How to avoid:** 이 phase의 핵심 목적인 자가진단 레지스트리(Pattern 1)로 완화 — "며칠 뒤 조용히 사라짐"을 근본적으로 막을 수는 없지만, 다음 포그라운드 복귀 시 반드시 감지·재생성되도록 함.
**Warning signs:** 통합 테스트에서 `cancelScheduledNotificationAsync`로 수동 취소 후 앱을 포그라운드로 전환했을 때 재생성되지 않으면 자가진단 로직 자체의 버그.

### Pitfall 2: 자가진단이 "의도적으로 꺼진" 트리거를 되살림
**What goes wrong:** 사용자가 빈도를 "끔"으로 설정하거나 회고 알림 토글을 껐는데, 자가진단이 "트리거가 없음 = 비정상"으로 오판해 되살림.
**Why it happens:** 재생성 조건을 "존재 여부"로만 판단하고 "현재 설정상 켜져 있어야 하는가"를 확인하지 않음 — product-design.md T2가 2026-08-24 브레인스토밍에서 발견해 명시적으로 수정한 버그.
**How to avoid:** 레지스트리의 각 항목이 `recreate()` 호출 전에 반드시 현재 설정(빈도≠끔 / 회고 토글=on)을 먼저 확인 — Pattern 1의 `isEnabled()` 가드.
**Warning signs:** 빈도="끔" 상태로 앱을 포그라운드로 전환했는데 알림이 다시 오기 시작하면 이 버그.

### Pitfall 3: "3시간마다"에서 일부 트리거만 사라지는 부분 실패를 못 잡음
**What goes wrong:** 8개 트리거 중 1~2개만 조용히 사라졌는데, 자가진단이 "identifier 하나라도 있으면 정상"으로 판정해 부분 실패를 놓침.
**Why it happens:** 단일 id 존재 확인 방식(예: `checkin-3h-0`만 확인)으로 구현하면 나머지 7개의 상태를 검사하지 않음.
**How to avoid:** Pattern 1처럼 "기대 identifier 집합 전체"와 "실제 집합"을 비교(`missing = expectedIds.filter(...)`) — 단일 id가 아니라 집합 단위 판정.
**Warning signs:** 통합 테스트에서 8개 중 3개만 수동 취소했을 때 자가진단이 그 3개만 정확히 재생성하는지 확인.

### Pitfall 4: 빈도 변경 중 실패로 이전 빈도의 트리거가 고아로 남음
**What goes wrong:** 매시간 → 3시간마다로 빈도를 바꾸는 도중 일부만 성공하면, 이전 빈도(`checkin-hourly`)와 새 빈도(`checkin-3h-*`)의 트리거가 동시에 존재하게 되어 알림이 중복 발화됨.
**Why it happens:** "취소 후 재등록"이 원자적 연산이 아님 — 중간에 앱이 죽거나 예외가 나면 절반만 적용된 상태로 남음.
**How to avoid:** 자가진단이 "현재 설정에서 기대되는 identifier 집합 밖에 있는" identifier(예: 빈도가 3시간마다인데 `checkin-hourly`가 남아있음)를 찾아 정리(취소)하는 로직도 함께 필요 — 단순히 "누락된 것만 추가"가 아니라 "기대 집합과 다른 여분도 제거".
**Warning signs:** 빈도를 매시간→3시간마다로 변경한 뒤 `getAllScheduledNotificationsAsync()`를 조회했을 때 `checkin-hourly`가 여전히 남아있으면 이 버그.

### Pitfall 5: 후속 phase의 permission plugin이 Phase 2의 infoPlist 문구를 덮어씀
**What goes wrong:** Phase 3(REQ-checkin-core, `expo-location` 설치)나 Phase 4(`expo-image-picker` 설치)가 각 패키지의 config plugin(`locationWhenInUsePermission`, `photosPermission`, `cameraPermission`)을 app.json에 추가하면서 기본 영어 문구로 덮어써, Phase 2에서 확정한 한국어 문구가 사라질 위험.
**Why it happens:** 두 설정 방식(`ios.infoPlist` 직접 지정 vs config plugin 옵션)이 같은 Info.plist 키를 놓고 경쟁 — 나중에 추가되는 plugin 설정이 우선 적용될 수 있음.
**How to avoid:** Phase 2에서는 `ios.infoPlist`에 직접 문구를 넣어두되(현재로선 가장 단순), Phase 3/4 계획 시 **반드시 이 phase에서 정한 문구를 config plugin 옵션(`locationWhenInUsePermission` 등)으로 이관**하도록 명시하거나, 최소한 plugin 추가 후 실기기에서 프롬프트 문구가 한국어로 유지되는지 재확인하는 검증 스텝을 넣을 것.
**Warning signs:** Phase 3/4 완료 후 실기기에서 위치/카메라/사진 권한 팝업이 영어(`"Allow $(PRODUCT_NAME) to..."`)로 뜨면 이 문제.

### Pitfall 6: 배너를 지도 위에 겹쳐 그려 명도 대비 기준 위반
**What goes wrong:** 알림 거부 배너를 지도 컴포넌트 위에 오버레이로 얹으면, 지도 배경색이 매번 바뀌어 4.5:1 명도 대비를 보장할 수 없음.
**Why it happens:** DESIGN.md Decisions Log(2026-08-23)에 정확히 같은 실수가 온보딩 empty-state 안내 텍스트에서 발견돼 수정된 이력이 있음 — 동일 실수를 배너에서 반복할 위험.
**How to avoid:** 배너는 고정 배경색을 가진 불투명 표면(예: 상단 바로 아래 고정 색상 바)에만 배치, DESIGN.md의 `colors.textMuted`(`#79786F`) + `typography.helperText` 토큰 사용.
**Warning signs:** 배너 텍스트가 지도의 특정 영역(물/도로 색상 등)과 겹칠 때 대비가 부족해 보이면 이 문제.

## Code Examples

### 권한 요청 (priming 화면에서 "허용하기" 탭 시)
```typescript
// Source: docs.expo.dev/versions/latest/sdk/notifications/
// + github.com/expo/expo packages/expo-notifications/src/NotificationPermissions.types.ts
import * as Notifications from 'expo-notifications';

async function requestNotificationPermission() {
  const current = await Notifications.getPermissionsAsync();
  if (current.status === 'undetermined') {
    // iOS는 undetermined 상태에서만 실제 시스템 프롬프트를 띄움 — 이미 거부된 상태에서
    // 재호출해도 프롬프트가 다시 뜨지 않고 즉시 현재 상태를 반환함(재요청 불가, priming 화면이
    // 먼저 필요한 이유).
    return Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowSound: true, allowBadge: true },
    });
  }
  return current;
}
```

### 취소 + 조회
```typescript
// Source: docs.expo.dev/versions/latest/sdk/notifications/
await Notifications.cancelScheduledNotificationAsync('checkin-hourly');
const all = await Notifications.getAllScheduledNotificationsAsync();
// all: NotificationRequest[] — each has `.identifier`, `.content`, `.trigger`
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| `NotificationBehavior.shouldShowAlert` | `shouldShowBanner` + `shouldShowList` | expo-notifications 최근 버전(SDK 57 기준 `shouldShowAlert`는 `@deprecated` 주석 표시) | `setNotificationHandler`를 등록할 계획이라면(Phase 2 필수는 아님) 최신 필드 사용 — 튜토리얼 다수가 여전히 구버전 `shouldShowAlert`만 사용 |
| Android-only `DailyTriggerInput`/`WeeklyTriggerInput` 등을 iOS에도 쓸 수 있다고 오해 | iOS는 `CalendarTriggerInput`(`type:'calendar'`)이 daily/weekly/monthly/yearly 전부를 대체 | 소스 확인 결과 `NativeDailyTriggerInput` 등은 `hour`+`minute` 필수 검증이 있어 "일부만 지정"이 애초에 불가능 — iOS의 유연한 와일드카드 매칭이 필요하면 반드시 `CALENDAR` 타입 사용 | 방법 A(매시간)는 `DAILY` 타입으로는 구현 불가능, 반드시 `CALENDAR` 타입 |

**Deprecated/outdated:**
- `shouldShowAlert`: 여전히 동작은 하지만 `shouldShowBanner`/`shouldShowList`로 대체 권장.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | 3개 Info.plist 문구 초안(위치/카메라/사진 라이브러리)이 최종 확정본이라는 전제 — CONTEXT.md D-03 자체가 "창업자가 나중에 확인/수정 가능하며 지금 확정은 아니다"라고 명시 | User Constraints, Pattern 3 | 낮음 — 문구를 나중에 바꿔도 `app.json` 한 줄 수정 + 리빌드만 필요, 아키텍처 영향 없음 |
| A2 | iOS 시간대 변경 시 `CalendarNotificationTrigger`(minute-only)가 로컬 벽시계 기준으로 자동 재정렬된다는 동작 — D-06에 의해 Phase 2 범위에서 실기기 검증 제외, 소스 코드로도 이 특정 동작(시간대 변경 시 재계산)까지는 확인하지 못함(트리거 optional 필드 구조는 확인했으나 timezone 변경 시 실제 재평가 타이밍은 iOS 런타임 동작이라 코드 레벨 검증 불가) | Summary, PROJECT.md 원본 가정 | 낮음 — Phase 2 Success Criteria에 포함 안 됨, TODOS.md에 별도 유예 이미 확정 |

## Open Questions

1. **Phase 3/4가 설치할 `expo-location`/`expo-image-picker`의 config plugin이 Phase 2의 `ios.infoPlist` 문구를 실제로 덮어쓰는지**
   - What we know: 두 방식(직접 infoPlist vs plugin 옵션) 모두 공식 문서에 나오는 유효한 방법이며, "plugin 방식이 CNG(Continuous Native Generation)에서 권장된다"는 문서 안내가 있음.
   - What's unclear: 두 방식이 동시에 같은 키를 설정할 때의 정확한 우선순위(마지막에 평가되는 plugin이 이기는지, 아니면 merge 시 에러가 나는지)는 공식 문서에 명시적 규칙이 없음.
   - Recommendation: Common Pitfall #5에 따라 Phase 3/4 계획 시 반드시 실기기 확인 스텝을 넣거나, 처음부터 문구를 plugin 옵션으로 이관하는 방식을 채택.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `expo-notifications` | REQ-notification-scheduling 전체 | ✗ (미설치, 신규 설치 필요) | `~57.0.14` (SDK 57 호환) | 없음 — 이 phase의 핵심 의존성이라 대체 불가, `npx expo install`로 즉시 설치 가능 |
| `expo-linking` | REQ-notification-denied-flow (설정 딥링크) | ✓ (이미 설치됨) | `~57.0.7` | — |
| EAS Dev Client / 실기기 (창업자 iPhone) | 실제 알림 발화·자가진단 동작 확인 | ✓ (Phase 1에서 확보) | — | — |

**Missing dependencies with no fallback:**
- `expo-notifications` — 실행 단계에서 `npx expo install expo-notifications`로 설치 필요 (플래너가 Wave 0 태스크로 포함시켜야 함).

**Missing dependencies with fallback:** 없음.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest 29.7.0 + jest-expo 57.0.4 (`jest-expo/ios` preset) |
| Config file | `jest.config.js` (프로젝트 루트) |
| Quick run command | `npm test -- src/notifications` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| REQ-notification-scheduling | `scheduleNotifications('hourly')`가 `checkin-hourly` identifier 1개를 minute-only CALENDAR 트리거로 등록 | unit | `npm test -- src/notifications/scheduling.test.ts -t hourly` | ❌ Wave 0 |
| REQ-notification-scheduling | `scheduleNotifications('every3h')`가 `checkin-3h-0..21` 8개 identifier를 등록 | unit | `npm test -- src/notifications/scheduling.test.ts -t every3h` | ❌ Wave 0 |
| REQ-notification-scheduling | `scheduleNotifications('off')`가 기존 checkin 트리거를 전부 취소 | unit | `npm test -- src/notifications/scheduling.test.ts -t off` | ❌ Wave 0 |
| REQ-notification-scheduling | 빈도 변경 시 이전 빈도 identifier가 고아로 남지 않고 정리됨 | unit | `npm test -- src/notifications/scheduling.test.ts -t orphan` | ❌ Wave 0 |
| REQ-notification-scheduling | 자가진단이 누락된 identifier만 재생성하고, 존재하는 것은 건드리지 않음 | unit | `npm test -- src/notifications/registry.test.ts -t selfHeal` | ❌ Wave 0 |
| REQ-notification-scheduling | 자가진단이 "꺼짐" 설정(빈도=끔/회고 토글=off)인 트리거는 재생성하지 않음 | unit | `npm test -- src/notifications/registry.test.ts -t disabledSkip` | ❌ Wave 0 |
| REQ-notification-scheduling | 3시간마다 8개 중 일부만 사라진 부분 실패를 자가진단이 감지 | unit | `npm test -- src/notifications/registry.test.ts -t partialFailure` | ❌ Wave 0 |
| REQ-permission-copy | app.json의 `ios.infoPlist`에 4개 키(위치/카메라/사진/알림 문구 대체) 검증 | smoke | `npm test -- src/notifications/infoPlist.test.ts` (app.json JSON 파싱 후 키 존재/문구 확인) | ❌ Wave 0 |
| REQ-notification-denied-flow | 권한 미승인 시 `showBanner`가 true, 승인 시 false | unit | `npm test -- src/notifications/permissions.test.ts -t bannerVisibility` | ❌ Wave 0 |
| REQ-notification-denied-flow | AppState `active` 전환 시 권한 재조회 호출됨 | unit | `npm test -- src/notifications/permissions.test.ts -t appStateRecheck` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test -- src/notifications`
- **Per wave merge:** `npm test` (전체 스위트)
- **Phase gate:** 전체 스위트 green + 실기기(EAS Dev Client)에서 수동으로 알림 발화·배너·자가진단 콘솔 로그 확인 후 `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/notifications/__mocks__/expo-notifications.ts` — jest-expo 기본 프리셋에 `expo-notifications` 자동 mock이 포함돼 있지 않음(확인됨: 커뮤니티 패키지 기본 mock 세트에 알림 모듈은 없음) — `jest.mock('expo-notifications', ...)` 수동 모킹 필요(`scheduleNotificationAsync`, `cancelScheduledNotificationAsync`, `getAllScheduledNotificationsAsync`, `getPermissionsAsync`, `requestPermissionsAsync`)
- [ ] `src/notifications/scheduling.test.ts`, `registry.test.ts`, `permissions.test.ts`, `infoPlist.test.ts` — 전부 신규 파일
- [ ] `AppState` 모킹 헬퍼 — RN 코어 API라 jest-expo/RN preset이 기본 제공하는지 확인 필요, 없으면 `jest.spyOn(AppState, 'addEventListener')` 패턴으로 대체

*(없음이 아니라 전부 신규 — 이 phase가 알림 인프라의 그린필드 시작점이므로 예상된 상태)*

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | 인증 없음(1단계는 창업자 단일 사용자, 백엔드 없음) |
| V3 Session Management | no | 세션 개념 없음 |
| V4 Access Control | no | 접근 제어 대상(리소스 공유) 없음 |
| V5 Input Validation | 부분 적용 | `frequency` 파라미터는 `'hourly' | 'every3h' | 'off'` 3개 리터럴로 제한된 내부 함수 인자일 뿐 사용자 자유 입력이 아님 — TypeScript union 타입으로 충분, 별도 검증 라이브러리 불필요 |
| V6 Cryptography | no | 이 phase는 암호화 대상 데이터를 다루지 않음(알림 문구는 공개 텍스트) |

### Known Threat Patterns for this stack

이 phase는 로컬 알림 스케줄링(네트워크 없음, 사용자 입력 없음, 저장소 접근 없음)만 다루므로 STRIDE 관점에서 실질적 공격 표면이 거의 없다. 유일하게 주의할 점:

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Info.plist 권한 문구에 사용자 입력이 섞여 인젝션되는 경우 | Tampering | 해당 없음 — 이 phase의 4개 문구는 전부 개발자가 하드코딩한 정적 문자열, 런타임 사용자 입력이 문구에 반영되지 않음 |

## Sources

### Primary (HIGH confidence)
- `github.com/expo/expo` `packages/expo-notifications/src/NotificationScheduler.types.ts` — `NativeCalendarTriggerInput`의 모든 date 컴포넌트가 optional임을 직접 확인
- `github.com/expo/expo` `packages/expo-notifications/src/scheduleNotificationAsync.ts` — `request.identifier ?? uuid.v4()`로 커스텀 identifier 지원 확인, `parseCalendarTrigger`가 date 컴포넌트 검증을 거치지 않음을 확인, DAILY/WEEKLY/MONTHLY/YEARLY는 `validateDateComponentsInTrigger`로 hour+minute 필수 검증함을 확인
- `github.com/expo/expo` `packages/expo-notifications/src/NotificationPermissions.types.ts` — `NotificationPermissionsStatus`, `IosAuthorizationStatus` enum 구조 확인
- `github.com/expo/expo` `packages/expo-modules-core/src/PermissionsInterface.ts` — 크로스플랫폼 `PermissionResponse`(`status`/`granted`/`canAskAgain`) 표준 필드 확인
- `github.com/expo/expo` `packages/expo-notifications/src/Notifications.types.ts` — `NotificationBehavior.shouldShowAlert` deprecated, `shouldShowBanner`/`shouldShowList` 확인
- `docs.expo.dev/versions/latest/sdk/notifications/` — 설치, config plugin, 스케줄/조회/취소 API, 권한 요청 API
- `docs.expo.dev/versions/latest/sdk/linking/` — `Linking.openSettings()` 시그니처와 fallback 동작
- `npm view expo-notifications` (version/time.created/downloads) — 2026-08-27 확인, `57.0.14`, 2020-03-30 최초 배포, 주간 다운로드 ~436만

### Secondary (MEDIUM confidence)
- [expo/expo#18068 — Notification repeat does not work on iOS after x seconds](https://github.com/expo/expo/issues/18068) — 반복 알림이 iOS에서 며칠 뒤 조용히 멈추는 사례, PROJECT.md가 이미 인용한 것과 동일 이슈
- [Apple Developer Forums thread 670622](https://developer.apple.com/forums/thread/670622) — PROJECT.md 원본 인용, iOS 시스템 레벨 알림 소실 사례
- iOS 64개 pending 로컬 알림 한도 — Apple Developer Forums 여러 스레드에서 일관되게 확인(반복 트리거는 재발화해도 단일 항목으로 카운트됨)
- expo-location/expo-image-picker config plugin 옵션(`locationWhenInUsePermission`/`photosPermission`/`cameraPermission`) — 공식 문서 기반이나 Phase 2 시점엔 아직 설치되지 않아 실제 상호작용은 검증 불가(Open Question #1)

### Tertiary (LOW confidence)
- 없음 — 모든 핵심 주장을 소스 코드 또는 공식 문서로 교차 검증함

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — `expo-notifications` 단일 패키지, npm 레지스트리 + 공식 소스로 완전 검증
- Architecture: HIGH — 자가진단 레지스트리 패턴의 핵심 전제(커스텀 identifier 지원, CALENDAR 트리거 optional 필드)를 공식 소스 코드에서 직접 확인
- Pitfalls: MEDIUM-HIGH — iOS 조용한 실패 사례는 커뮤니티/Apple 포럼 기반(재현 조건이 문서화되지 않음), 자가진단 관련 pitfall(2~4)은 product-design.md의 리뷰 이력에서 이미 발견·확정된 것을 재정리

**Research date:** 2026-08-27
**Valid until:** 2026-09-26 (30일 — Expo SDK/expo-notifications 마이너 릴리스 주기가 비교적 안정적이나, iOS 자체의 알림 조용한 실패 이슈는 OS 버전에 따라 변동 가능)
