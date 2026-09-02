# 재센터 버튼 + 나침반 배지 분리 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 오늘 뷰의 재센터 버튼이 겸하던 "북쪽 리셋"을 별도의 나침반 배지로 분리하고, 두 컨트롤을 애플 지도 스타일(흰 배경/시스템 블루, 짙은 배지+빨간 삼각형)로 렌더링한다.

**Architecture:** `src/app/(tabs)/index/index.tsx`의 기존 `handleRecenterPress`/`handlePanDrag`/`orientationMode` 상태는 그대로 두고, (1) 북쪽 리셋 로직을 `resetHeadingToNorth`라는 공유 콜백으로 추출하고, (2) `orientationMode === 'compass'`일 때만 조건부 렌더되는 나침반 배지 컴포넌트를 재센터 버튼 바로 위에 추가하고, (3) 두 컨트롤의 색상을 새 `theme/tokens.ts` 토큰으로 교체한다. 새 화면/새 상태 관리 없이 기존 컴포넌트 안에서의 추가·리컬러링.

**Tech Stack:** React Native (Expo), `expo-symbols`(SymbolView), `react-native-reanimated`(FadeIn/FadeOut), Jest(정적 소스 정규식 검사 — 이 파일의 기존 테스트 관례, RN 렌더 불필요).

## Global Constraints
- 색상 값은 `docs/designs/recenter-compass-badge.md`(커밋 a9d6f35, a0f67d4)에 확정된 값을 그대로 쓴다: `mapControlButtonBackground` `#FFFFFF`, `mapControlIcon` `#007AFF`, `mapControlBadgeBackground` `#2C2C2C`, `mapControlBadgeNeedle` `#FF3B30`.
- `src/theme/tokens.ts`의 `colors` 객체는 반드시 대문자 6자리 hex만 허용된다(`tokens.test.ts`의 정규식 회귀 가드) — rgba/HSL 등 다른 형식 금지.
- 새 모션 값을 추가하지 않는다 — 배지 페이드는 기존 `motion.saveStateCrossfadeMs`(180ms) 재사용.
- 배지 탭은 `hasCenteredOnceRef`를 건드리지 않는다(follow 자체는 해제하지 않고 회전만 리셋).
- 커밋 메시지는 한글, Conventional Commits 형식(`type(scope): 설명`), AI 서명 트레일러 없음(전역 CLAUDE.md 규칙).

---

## File Structure

- **Modify: `src/theme/tokens.ts`** — 새 색상 토큰 4개 추가.
- **Modify: `src/theme/tokens.test.ts`** — 토큰 정확 일치 테스트에 새 키 4개 반영.
- **Modify: `src/app/(tabs)/index/index.tsx`** — `resetHeadingToNorth` 추출, 재센터 버튼 리컬러링, 나침반 배지 JSX/스타일/상수 추가.
- **Modify: `src/app/__tests__/checkin-wiring.test.ts`** — Test 31/37/49 갱신, Test 78~83 신규 추가.

---

### Task 1: 새 지도 컨트롤 색상 토큰 추가

**Files:**
- Modify: `src/theme/tokens.ts`
- Modify: `src/theme/tokens.test.ts`

**Interfaces:**
- Produces: `colors.mapControlButtonBackground`(`#FFFFFF`), `colors.mapControlIcon`(`#007AFF`), `colors.mapControlBadgeBackground`(`#2C2C2C`), `colors.mapControlBadgeNeedle`(`#FF3B30`) — Task 3/4가 이 4개 키를 그대로 소비한다.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/theme/tokens.test.ts`의 `describe('tokens.colors', ...)` 블록 첫 `it`을 아래로 교체:

```ts
  it('DESIGN.md Color 표의 18개 키와 hex 값이 정확히 일치한다 (2026-09-01: 애플 지도 스타일 예외 4개 추가)', () => {
    expect(colors).toEqual({
      background: '#F4F1EA',
      surface: '#FBFAF6',
      surfaceSoft: '#ECE8DF',
      textPrimary: '#2F302C',
      textMuted: '#79786F',
      textFaint: '#A7A49A',
      accent: '#7C8660',
      accentSoft: '#D8DDC9',
      pin: '#B85C38',
      pinSoft: '#DDC0AC',
      line: '#DDD8CD',
      mapLand: '#E9E4D8',
      mapRoad: '#D2CDC1',
      mapWater: '#DDE3DF',
      mapControlButtonBackground: '#FFFFFF',
      mapControlIcon: '#007AFF',
      mapControlBadgeBackground: '#2C2C2C',
      mapControlBadgeNeedle: '#FF3B30',
    });
    expect(Object.keys(colors)).toHaveLength(18);
  });
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

Run: `npm test -- src/theme/tokens.test.ts`
Expected: FAIL — `colors`에 새 키 4개가 없어 `toEqual` 불일치.

- [ ] **Step 3: 토큰 추가**

`src/theme/tokens.ts`의 `mapWater: '#DDE3DF', // 지도 전용` 다음 줄에 추가:

```ts
  mapControlButtonBackground: '#FFFFFF', // 재센터 버튼 배경 — 애플 지도 스타일 예외(2026-09-01, DESIGN.md Color 섹션 참고)
  mapControlIcon: '#007AFF', // 재센터 버튼 아이콘(시스템 블루) — 위와 동일 예외
  mapControlBadgeBackground: '#2C2C2C', // 나침반 배지 배경(짙은 단색) — 위와 동일 예외
  mapControlBadgeNeedle: '#FF3B30', // 나침반 배지 빨간 삼각형/N 텍스트 — 위와 동일 예외
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

Run: `npm test -- src/theme/tokens.test.ts`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add src/theme/tokens.ts src/theme/tokens.test.ts
git commit -m "feat(theme): 애플 지도 스타일 재센터/나침반 컨트롤 색상 토큰 추가"
```

---

### Task 2: `resetHeadingToNorth` 공유 함수 추출

**Files:**
- Modify: `src/app/(tabs)/index/index.tsx` (`handlePanDrag` 정의부, 원본 기준 669~686번 줄)
- Test: `src/app/__tests__/checkin-wiring.test.ts` (Test 49 갱신, Test 78 신규)

**Interfaces:**
- Consumes: 기존 `headingSubscriptionRef`, `orientationModeRef`, `setOrientationMode`, `mapRef` (모두 이미 컴포넌트 내부에 존재).
- Produces: `const resetHeadingToNorth = useCallback(() => {...}, [])` — Task 4의 나침반 배지 `onPress`가 이 함수를 그대로 소비한다.

- [ ] **Step 1: 실패하는 테스트로 교체**

`src/app/__tests__/checkin-wiring.test.ts`에서 기존 Test 49(339~346번 줄)를 아래로 교체:

```ts
  it('Test 49 (2026-09-01 갱신 — resetHeadingToNorth로 추출): handlePanDrag가 orientationMode가 north가 아닐 때 resetHeadingToNorth를 호출한다', () => {
    const match = codeOnly.match(/const handlePanDrag = useCallback\([\s\S]*?\n  \}, \[\]\);/);
    expect(match).not.toBeNull();
    const block = match ? match[0] : '';
    expect(block).toMatch(/if \(orientationModeRef\.current !== 'north'\) \{\s*resetHeadingToNorth\(\);\s*\}/);
    expect(block).not.toMatch(/headingSubscriptionRef\.current\?\.remove\(\)/);
  });
```

그 다음, 같은 `describe` 블록(324~351번 줄) 안 `Test 50` 뒤(닫는 `});` 앞)에 새 테스트 추가:

```ts

  it('Test 78: resetHeadingToNorth가 나침반 구독 해제 + north 상태 전환 + animateCamera를 모두 수행한다 (나침반 배지와 handlePanDrag가 공유하는 리셋 로직)', () => {
    const match = codeOnly.match(/const resetHeadingToNorth = useCallback\([\s\S]*?\n  \}, \[\]\);/);
    expect(match).not.toBeNull();
    const block = match ? match[0] : '';
    expect(block).toMatch(/headingSubscriptionRef\.current\?\.remove\(\)/);
    expect(block).toMatch(/headingSubscriptionRef\.current = null/);
    expect(block).toMatch(/orientationModeRef\.current = 'north'/);
    expect(block).toMatch(/setOrientationMode\('north'\)/);
    expect(block).toMatch(/animateCamera\(\{ heading: 0, pitch: 0 \}\)/);
  });
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

Run: `npm test -- src/app/__tests__/checkin-wiring.test.ts -t "Test 49|Test 78"`
Expected: FAIL — `resetHeadingToNorth`가 아직 존재하지 않음.

- [ ] **Step 3: `resetHeadingToNorth` 추출 + `handlePanDrag` 축소**

`src/app/(tabs)/index/index.tsx`에서 기존 `handlePanDrag` 정의(669~686번 줄) 전체를 아래로 교체:

```tsx
  // 나침반 배지 탭과 손 팬(handlePanDrag) 둘 다 "회전만 리셋"하는 로직을 공유한다.
  // hasCenteredOnceRef는 여기서 건드리지 않는다 — 배지 탭은 follow 자체를 해제하지
  // 않는다는 계약이다(docs/designs/recenter-compass-badge.md 설계안 1/4).
  const resetHeadingToNorth = useCallback(() => {
    headingSubscriptionRef.current?.remove();
    headingSubscriptionRef.current = null;
    orientationModeRef.current = 'north';
    setOrientationMode('north');
    mapRef.current?.animateCamera({ heading: 0, pitch: 0 });
  }, []);

  // 사용자가 지도를 손가락으로 직접 움직이면 재센터 버튼의 "팔로우" 상태를 즉시
  // 해제한다(구글맵과 동일 동작). 이게 없으면 예: 재센터 탭(north) → 지도를 다른
  // 곳으로 수동 드래그 → 재센터 버튼을 다시 탭했을 때, 앱이 "사용자가 방금 시선을
  // 옮겼다"는 사실을 모른 채 이전 토글 상태만 보고 곧장 나침반 모드로 건너뛰어
  // 버렸다(hasCenteredOnceRef가 세션 내내 리셋되지 않는 문제). 다음 탭이 다시
  // "북쪽 고정 재센터"부터 시작하도록 hasCenteredOnceRef를 리셋하고, 나침반
  // 모드였다면 resetHeadingToNorth로 구독 정리 + 방향도 북쪽으로 되돌린다.
  const handlePanDrag = useCallback(() => {
    // 재센터 탭이 걸어둔 백그라운드 GPS 보정(resolveInstantPosition의 onRefine)이
    // 아직 안 끝난 상태에서 사용자가 지도를 다시 손으로 옮기면, 그 보정 결과가
    // 뒤늦게 도착해 방금 사용자가 옮긴 화면을 다시 잡아채면 안 된다.
    recenterRequestIdRef.current += 1;

    if (!hasCenteredOnceRef.current) return;

    hasCenteredOnceRef.current = false;

    if (orientationModeRef.current !== 'north') {
      resetHeadingToNorth();
    }
  }, []);
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

Run: `npm test -- src/app/__tests__/checkin-wiring.test.ts`
Expected: PASS (전체 스위트 — 다른 기존 테스트가 이 리팩터로 깨지지 않았는지 함께 확인)

- [ ] **Step 5: 커밋**

```bash
git add "src/app/(tabs)/index/index.tsx" src/app/__tests__/checkin-wiring.test.ts
git commit -m "refactor: 나침반 north 리셋 로직을 resetHeadingToNorth로 추출"
```

---

### Task 3: 재센터 버튼 애플 지도 스타일로 리컬러링

**Files:**
- Modify: `src/app/(tabs)/index/index.tsx` (`recenterButton` 스타일, `<SymbolView>` JSX — 원본 기준 1248~1251번 줄과 1304~1313번 줄)
- Test: `src/app/__tests__/checkin-wiring.test.ts` (Test 31, Test 37 갱신)

**Interfaces:**
- Consumes: Task 1의 `colors.mapControlButtonBackground`, `colors.mapControlIcon`.

- [ ] **Step 1: 실패하는 테스트로 교체**

Test 31(202~211번 줄)을 아래로 교체:

```ts
  it('Test 31 (2026-09-01 갱신): 재센터링 버튼은 애플 지도 스타일로 흰 배경 + 시스템 블루 아이콘을 쓴다 (2026-08-31 Pin 통일에서 되돌림 — DESIGN.md 2026-09-01 예외)', () => {
    const match = codeOnly.match(/recenterButton:\s*\{[\s\S]*?\n  \},/);
    expect(match).not.toBeNull();
    const block = match ? match[0] : '';
    expect(block).toMatch(/colors\.mapControlButtonBackground/);
    expect(block).not.toMatch(/colors\.accent\b/);
    expect(block).not.toMatch(/colors\.surface\b/);
    expect(codeOnly).toMatch(/tintColor=\{colors\.mapControlIcon\}/);
    expect(codeOnly).not.toMatch(/tintColor=\{colors\.pin\}/);
  });
```

Test 37(244~251번 줄)을 아래로 교체:

```ts
  it('Test 37 (2026-09-01 갱신): 재센터링 버튼 아이콘은 모드와 무관하게 colors.mapControlIcon을 쓰고 accent/pin/textMuted는 쓰지 않는다', () => {
    const match = codeOnly.match(/<SymbolView[\s\S]*?\/>/);
    expect(match).not.toBeNull();
    const block = match ? match[0] : '';
    expect(block).toMatch(/colors\.mapControlIcon\b/);
    expect(block).not.toMatch(/colors\.accent\b/);
    expect(block).not.toMatch(/colors\.pin\b/);
    expect(block).not.toMatch(/colors\.textMuted\b/);
  });
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

Run: `npm test -- src/app/__tests__/checkin-wiring.test.ts -t "Test 31|Test 37"`
Expected: FAIL — 아직 `colors.pin`/`colors.surface`를 쓰고 있음.

- [ ] **Step 3: 버튼 스타일 + 아이콘 색상 교체**

`recenterButton` 스타일(원본 1304~1313번 줄)을 아래로 교체:

```ts
  recenterButton: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.mapControlButtonBackground,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
  },
```

`<SymbolView>`의 `tintColor` prop(원본 1250번 줄)을 교체:

```tsx
              <SymbolView
                name={orientationMode === 'compass' ? 'location.north.line.fill' : 'location.fill'}
                tintColor={colors.mapControlIcon}
              />
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

Run: `npm test -- src/app/__tests__/checkin-wiring.test.ts`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add "src/app/(tabs)/index/index.tsx" src/app/__tests__/checkin-wiring.test.ts
git commit -m "style: 재센터 버튼을 애플 지도 스타일(흰 배경/시스템 블루)로 되돌림"
```

---

### Task 4: 나침반 배지 추가

**Files:**
- Modify: `src/app/(tabs)/index/index.tsx` (import, 상수, `compassBadgeFloatingStyle`, JSX, 스타일)
- Test: `src/app/__tests__/checkin-wiring.test.ts` (Test 79~83 신규)

**Interfaces:**
- Consumes: Task 1의 `colors.mapControlBadgeBackground`/`colors.mapControlBadgeNeedle`, Task 2의 `resetHeadingToNorth`, 기존 `orientationMode`, `motion.saveStateCrossfadeMs`, `spacing`, `radius`.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/app/__tests__/checkin-wiring.test.ts` 파일 맨 끝(603번 줄, 마지막 `});` 뒤)에 새 `describe` 블록 추가:

```ts

describe('src/app/(tabs)/index.tsx 나침반 배지 배선 계약 (2026-09-01 추가, 애플 지도 스타일 분리)', () => {
  const indexSource = readSource(TODAY_SCREEN_PATH);
  const codeOnly = stripComments(indexSource);

  it('Test 79: 나침반 배지는 orientationMode가 compass일 때만 조건부 렌더된다', () => {
    expect(codeOnly).toMatch(/\{orientationMode === 'compass' && \(/);
  });

  it('Test 80: 배지 접근성 라벨이 "지도를 북쪽으로 정렬"이고 hitSlop이 등장한다', () => {
    expect(indexSource).toMatch(/accessibilityLabel="지도를 북쪽으로 정렬"/);
    expect(indexSource).toMatch(/\bCOMPASS_BADGE_HIT_SLOP\b/);
  });

  it('Test 81: 배지 onPress가 resetHeadingToNorth로 배선된다', () => {
    const match = codeOnly.match(
      /<Pressable\s+onPress=\{resetHeadingToNorth\}[\s\S]*?accessibilityLabel="지도를 북쪽으로 정렬"/
    );
    expect(match).not.toBeNull();
  });

  it('Test 82: 배지 스타일이 colors.mapControlBadgeBackground/mapControlBadgeNeedle을 쓰고 accent/pin은 쓰지 않는다', () => {
    const bgMatch = codeOnly.match(/compassBadge:\s*\{[\s\S]*?\n  \},/);
    expect(bgMatch).not.toBeNull();
    expect(bgMatch ? bgMatch[0] : '').toMatch(/colors\.mapControlBadgeBackground/);

    const needleMatch = codeOnly.match(/compassBadgeNeedle:\s*\{[\s\S]*?\n  \},/);
    expect(needleMatch).not.toBeNull();
    expect(needleMatch ? needleMatch[0] : '').toMatch(/colors\.mapControlBadgeNeedle/);

    expect(codeOnly).not.toMatch(/compassBadge[\s\S]{0,400}colors\.accent\b/);
  });

  it('Test 83: 배지 등장/소멸 애니메이션이 motion.saveStateCrossfadeMs(180ms)를 재사용한다 (새 모션 값 추가 금지)', () => {
    expect(codeOnly).toMatch(/entering=\{FadeIn\.duration\(motion\.saveStateCrossfadeMs\)\}/);
    expect(codeOnly).toMatch(/exiting=\{FadeOut\.duration\(motion\.saveStateCrossfadeMs\)\}/);
  });
});
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

Run: `npm test -- src/app/__tests__/checkin-wiring.test.ts -t "나침반 배지 배선 계약"`
Expected: FAIL — 배지 자체가 아직 존재하지 않음.

- [ ] **Step 3: import 추가**

`src/app/(tabs)/index/index.tsx` 44번 줄의 Reanimated import를 교체:

```tsx
import Reanimated, { FadeIn, FadeOut, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
```

- [ ] **Step 4: 상수 추가**

`PIN_HIT_SLOP` 정의(원본 125번 줄) 바로 다음 줄에 추가:

```ts
const COMPASS_BADGE_HIT_SLOP = { top: 4, bottom: 4, left: 4, right: 4 }; // 36pt 배지를 44pt 터치 타겟까지 확장
const COMPASS_BADGE_BOTTOM_OFFSET = 44 + spacing.xs; // 재센터 버튼 높이(44, recenterButton 스타일과 동일) + 간격
```

- [ ] **Step 5: `compassBadgeFloatingStyle` 추가**

`floatingButtonStyle` 정의(Task 2 적용 후 기준, 원본 577~582번 줄) 바로 다음에 추가:

```tsx
  // 나침반 배지는 재센터 버튼 바로 위에 스택된다 — floatingButtonStyle과 동일한
  // bottom 계산에 COMPASS_BADGE_BOTTOM_OFFSET만 더한다
  // (docs/designs/recenter-compass-badge.md 설계안 2/4).
  const compassBadgeFloatingStyle = useAnimatedStyle(() => {
    if (containerHeight <= 0) {
      return { bottom: insets.bottom + spacing.xl + COMPASS_BADGE_BOTTOM_OFFSET };
    }
    return { bottom: containerHeight - sheetPosition.value + spacing.lg + COMPASS_BADGE_BOTTOM_OFFSET };
  }, [containerHeight, insets.bottom]);
```

- [ ] **Step 6: JSX 추가**

재센터 버튼의 `</Reanimated.View>` 닫는 태그(Task 3 적용 후에도 원본 기준 1253번 줄 위치 그대로) 바로 다음, `</>`(1254번 줄) 이전에 추가:

```tsx
          {orientationMode === 'compass' && (
            <Reanimated.View
              entering={FadeIn.duration(motion.saveStateCrossfadeMs)}
              exiting={FadeOut.duration(motion.saveStateCrossfadeMs)}
              style={[styles.compassBadgeContainer, compassBadgeFloatingStyle, { right: spacing.lg }]}
            >
              <Pressable
                onPress={resetHeadingToNorth}
                accessibilityRole="button"
                accessibilityLabel="지도를 북쪽으로 정렬"
                hitSlop={COMPASS_BADGE_HIT_SLOP}
                style={styles.compassBadge}
              >
                <View style={styles.compassBadgeNeedle} />
                <Text style={styles.compassBadgeLabel}>N</Text>
              </Pressable>
            </Reanimated.View>
          )}
```

- [ ] **Step 7: 스타일 추가**

`recenterButton` 스타일 블록(Task 3에서 갱신됨) 바로 다음에 추가:

```ts
  compassBadgeContainer: {
    position: 'absolute',
  },
  compassBadge: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.mapControlBadgeBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compassBadgeNeedle: {
    width: 0,
    height: 0,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderBottomWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: colors.mapControlBadgeNeedle,
    marginBottom: 1,
  },
  compassBadgeLabel: {
    fontSize: 9,
    fontWeight: '500',
    color: colors.mapControlButtonBackground,
  },
```

- [ ] **Step 8: 테스트 실행 — 통과 확인**

Run: `npm test -- src/app/__tests__/checkin-wiring.test.ts`
Expected: PASS (전체 스위트)

- [ ] **Step 9: 타입 체크**

Run: `npx tsc --noEmit`
Expected: 이 작업으로 인한 새 에러 없음(기존에 알려진 무관한 expo-router 타입드 라우트 에러 3건은 그대로 남아있어도 무방 — `docs/superpowers/plans/...` 무관 항목, `.planning/debug/resolved/checkin-button-color-label-regression.md` verification 참고).

- [ ] **Step 10: 커밋**

```bash
git add "src/app/(tabs)/index/index.tsx" src/app/__tests__/checkin-wiring.test.ts
git commit -m "feat: 나침반 north 리셋 배지를 재센터 버튼 위에 추가"
```

---

## Self-Review

**1. 스펙 커버리지** — `docs/designs/recenter-compass-badge.md`의 각 Premise를 확인:
- Premise 1(동작 모델 유지) → Task 2에서 `handleRecenterPress` 변경 없음, `handlePanDrag`만 리팩터.
- Premise 2(배치, 우하단 스택) → Task 4 Step 5의 `compassBadgeFloatingStyle` + `right: spacing.lg`.
- Premise 3(가시성, 조건부 렌더+페이드) → Task 4 Step 6, Test 79/83.
- Premise 4(배지 탭 = resetHeadingToNorth 공유) → Task 2 + Task 4 Step 6.
- Premise 5(색상 예외) → Task 1, Task 3.
- Premise 6(접근성) → Task 4 Step 4/6, Test 80.
- DESIGN.md 갱신 3항목 → 이미 브레인스토밍 단계에서 커밋 완료(a9d6f35, a0f67d4), 이 플랜의 범위 밖.

**2. Placeholder 스캔** — TBD/TODO 없음, 모든 스텝에 실제 코드 포함 확인.

**3. 타입/시그니처 일관성** — `resetHeadingToNorth`(Task 2에서 정의) 이름이 Task 4의 `onPress={resetHeadingToNorth}`와 정확히 일치. `COMPASS_BADGE_HIT_SLOP`/`COMPASS_BADGE_BOTTOM_OFFSET` 상수명이 정의(Task 4 Step 4)와 사용처(Step 5, 6) 간 일치. `colors.mapControlButtonBackground`/`mapControlIcon`/`mapControlBadgeBackground`/`mapControlBadgeNeedle` 4개 토큰명이 Task 1 정의와 Task 3/4 사용처에서 동일.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-09-01-recenter-compass-badge.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
