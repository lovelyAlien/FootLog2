---
title: "회귀 가드 테스트와 충돌할 때: 값을 토큰화하거나 단언을 갱신하되, 가드 자체를 약화시키지 않는다"
date: 2026-09-01
category: conventions
module: regression-guard-tests
problem_type: convention
component: testing_framework
severity: medium
applies_when:
  - "플랜/태스크가 지시한 코드 변경이 기존 저장소 전역 회귀 가드 테스트를 깨뜨릴 때"
  - "충돌이 값 문제일 때 — 하드코딩 리터럴이 named registry(예: src/theme/tokens.ts)를 거쳐야 하는데 그러지 않은 경우"
  - "충돌이 단언 문제일 때 — 가드의 매칭 텍스트가, 그 가드의 실제 불변식과 무관한 방향으로 코드가 바뀌어 stale해진 경우"
  - "구현자(사람/에이전트)가 작업 중인 태스크의 선언된 파일 스코프에 그 가드 테스트 파일이 포함돼 있지 않을 때"
related_components:
  - theme_tokens
  - subagent_implementation_workflow
  - code_review_gate
tags: [regression-guard, design-tokens, subagent-workflow, code-review, test-maintenance, escalation]
---

# 회귀 가드 테스트와 충돌할 때: 값을 토큰화하거나 단언을 갱신하되, 가드 자체를 약화시키지 않는다

## Context

FootLog2는 plan-driven, subagent 기반 구현 워크플로우를 쓴다 — 오케스트레이터가 태스크를
쪼개 개별 구현 subagent에게 위임하고, 각 subagent는 선언된 파일 스코프 안에서만 작업한다.
이 저장소에는 배선 계약이나 디자인 시스템 불변식을 지키기 위한 "회귀 가드" 테스트가 여럿
있다 — 예를 들어 `src/app/__tests__/foundation-wiring.test.ts:108-129`("src/ 전체 하드코딩
hex 컬러 회귀 가드")는 `src/theme/tokens.ts` 바깥 어디에도 하드코딩 hex 컬러 리터럴이 없어야
한다고 저장소 전체를 스캔하며, `src/app/__tests__/today-wiring.test.ts:234-239`는
`react-native-reanimated`의 default export가 plain `Animated`로 섀도잉되는 걸 막는
가드다("Plan 03-12"로 문서화된 과거 실버그의 재발 방지).

문제는, 이런 가드가 왜 존재하는지에 대한 전체 맥락을 개별 태스크 구현 subagent는 갖고
있지 않다는 점이다. subagent는 자기 태스크(예: 재센터 버튼에 그림자를 추가하라)만 보고,
그 태스크를 완료하려다 스코프 밖의 공유 가드 테스트에서 막힌다. 이때 "테스트가 막고 있으니
테스트를 고치면 되지 않나"라는 유혹이 생긴다 — 특히 그 테스트가 태스크의 선언된 파일 목록에
없을 때, 그 유혹은 "내 담당 파일이 아니니 최소한으로 건드리고 넘어가자"는 형태로 온다. 같은
세션에서 실제로 벌어진 두 사례(하나는 잘못된 패턴, 하나는 올바른 패턴)를 기록해 같은 상황이
다시 오면 무엇을 해야 하는지 규칙으로 남긴다.

## Guidance

**결정 규칙:** 사전에 존재하는 회귀 가드 테스트가, 다른 관점에서는 올바른 변경을 막고 있을 때 —

1. 먼저 **가드가 지키려는 실제 불변식이 무엇인지** 읽는다(테스트 제목과 주석이 대개 답을
   준다). 지금 만들려는 값이 그 불변식의 "예외 카테고리"에 속하는가, 아니면 가드의 검사
   방식이 지금 상황에 대해 우연히 너무 좁거나 너무 넓게 짜여 있는가를 구분한다.
2. **케이스 A — 값 자체가 정당한 예외인 경우**(예: 하드코딩 hex 색상을 도입해야 하는데
   기존 디자인 예외 카테고리에 들어맞는 경우): 가드를 건드리지 않는다. 대신 그 값을
   시스템에 편입시킨다 — 이 저장소에서는 `src/theme/tokens.ts`에 이름 붙은 토큰을 추가하고
   코드에서 그 토큰을 참조한다. 가드는 원래 형태 그대로, 100% 커버리지를 유지한 채 통과한다.
3. **케이스 B — 가드의 검사 방식이 실제 불변식보다 더 좁게(우발적으로) 짜여 있는 경우**
   (예: 정확한 import 문자열을 통째로 대조하는데, import 목록의 부수적인 항목이 하나
   늘어난 경우): 가드 자체를 절대 혼자 판단해서 고치지 않는다. 작업을 멈추고
   오케스트레이터/컨트롤링 세션에 **정확히 무엇이 충돌했는지(이전 값과 새 값을 인용)와
   왜 이게 단독 결정이 아니라 판단이 필요한 사안이라고 생각하는지**를 보고한다. 승인이
   나면, 그 가드가 실제로 보호하는 핵심 단언(anti-shadowing 같은)은 절대 건드리지 않고,
   불변식과 무관한 딱 그 표현(예: 정확한 import 문자열)만 문자 그대로 새 값으로 갱신한다 —
   패턴을 느슨하게 넓히지 않는다.
4. 어느 케이스든 **가드가 검사하는 대상 범위(스캔하는 파일 집합, 매칭 조건)를 줄이거나
   완화하는 수정은 하지 않는다.** "이번 한 번만" 예외를 정규식에 끼워 넣는 방식은 두 경우
   모두에서 금지된다.

## Why This Matters

가드 테스트를 조용히 약화시키는 건, 그 자리에서 막히는 것보다 늘 더 나빠 보이지 않기
때문에 위험하다:

- **비가시성.** 토큰 기반 수정은 `src/theme/tokens.ts`에 이름 붙은 줄로 남고,
  `tokens.test.ts`의 정확한 키 개수 단언이 "몇 개가 있어야 하는가"를 항상 강제해서
  grep 한 번, diff 한 번으로 드러난다. 반면 가드 테스트 자체에 예외 정규식을 끼워 넣는
  수정은 그 정확한 diff를 주의 깊게 읽는 사람이 아니면 존재 자체를 알아채기 어렵다 —
  가드는 여전히 "통과"하지만, 더 이상 원래 지키던 걸 지키지 않는다.
- **스코프 오판이 실증됐다.** 아래 Example 1의 실제 사례에서, "이 버튼 하나만 예외로
  두려던" 정규식(`codeOnly.replace(/shadowColor:\s*['"]#000['"]/g, '')`)은 실제로는
  `src/` 전체 어느 파일의 어느 `shadowColor: '#000'`이든 무차별로 우회시켰다. 의도한
  스코프와 실제 매칭 스코프가 다르다는 걸 작성 시점에는 알아채기 어렵다.
- **선례의 누적 비용.** 가드 테스트를 고쳐서 막힌 걸 뚫는 방식이 한 번 통하면, 다음
  "이번 한 번만"의 심리적 비용이 낮아진다. 이런 카브아웃이 몇 번 반복되면 가드
  테스트는 이름만 남고 실제로는 아무것도 강제하지 않는 상태로 서서히 무너진다 — 반면
  토큰화나 좁은 단언 갱신은 매번 가드의 원래 커버리지를 100% 유지한 채 문제를 해결한다.

## When to Apply

트리거 조건: (사람이든 에이전트든) 구현자가 스코프상 무관하지만 사전에 존재하는 회귀 가드
테스트에서 막혔고, 지금 만들려는 변경 자체는 다른 관점에서 올바르다고 판단될 때. 이 상황을
만나면:

- 먼저 가드가 지키는 실제 불변식을 읽어 이해한다(제목·주석·인접 단언을 본다).
- 지금 만드는 값/구조가 **이미 존재하는 예외 카테고리**에 들어맞으면 → 값을 이름 붙은
  토큰/상수로 편입시켜 가드는 원본 그대로 둔다.
- 가드의 **검사 로직 자체가 우발적으로 너무 좁다**고 판단되면 → 절대 혼자 결정하지 말고
  멈춰서 에스컬레이션하고(정확히 무엇이, 왜 충돌하는지 인용), 승인 후에도 핵심 불변식
  단언은 그대로 둔 채 부수적 디테일 하나만 문자 그대로 갱신한다.
- 두 경로 모두에서 가드가 스캔하는 파일 범위나 매칭 조건을 완화하는 수정은 하지 않는다.

## Examples

### Example 1 — 케이스 A: 토큰화 (처음엔 잘못된 패턴, 이후 올바르게 수정됨)

재센터 버튼에 그림자를 추가하는 태스크에서 `shadowColor: '#000'`을 써야 했는데, 이는
`foundation-wiring.test.ts`의 하드코딩 hex 가드에 걸렸다. 첫 시도는 가드 테스트 자체를
고치는 것이었다 — 태스크 스코프에 없던 파일을, 정확히 그 버튼에만 좁혀지지 않은 전역
정규식으로:

```ts
// src/app/__tests__/foundation-wiring.test.ts (첫 시도 — 되돌려짐)
const source = fs.readFileSync(filePath, 'utf-8');
const codeOnly = stripComments(source);
// 재센터 버튼 shadowColor: '#000' 예외 — Apple Maps 스타일 섀도우는 시멘틱 색상 범주 밖
const codeSansRecenterShadow = codeOnly.replace(/shadowColor:\s*['"]#000['"]/g, '');
if (/#[0-9A-Fa-f]{3,6}\b/.test(codeSansRecenterShadow)) {
  offenders.push(relativePath);
}
```

이 `replace`는 `codeOnly`(스캔 중인 파일 전체 소스) 위에서 동작하므로, `src/` 아래 어떤
파일이든 `shadowColor: '#000'`을 쓰면 그 즉시 가드를 우회한다 — 재센터 버튼 하나로 스코프가
좁혀져 있지 않았다. 태스크 단위 코드 리뷰 subagent가 이를 Important(must-fix)로 지적했다:
(a) 태스크 선언 스코프 밖의 파일을 건드렸고, (b) 예외가 전역적이라 이후 무관한
`shadowColor: '#000'`도 전부 조용히 통과하게 된다는 점.

수정(이 기능 브랜치의 로컬 커밋 `23406aa` — 아직 PR/머지 전이라 스쿼시·리베이스 시 SHA가 바뀔 수 있음)은 기존에 이미 있던 애플 지도 스타일 예외 토큰 4개
(`mapControlButtonBackground`, `mapControlIcon`, `mapControlBadgeBackground`,
`mapControlBadgeNeedle`, `src/theme/tokens.ts:25-28`)와 정확히 같은 패턴으로 다섯 번째
토큰을 추가하고, 가드 테스트를 원본 그대로 되돌렸다:

```ts
// src/theme/tokens.ts (추가된 토큰)
mapControlButtonShadow: '#000000', // 재센터 버튼 그림자 색상 — 위와 동일 예외(애플 지도 스타일, 2026-09-01)
```

```ts
// src/app/(tabs)/index/index.tsx
shadowColor: colors.mapControlButtonShadow,
```

```ts
// src/app/__tests__/foundation-wiring.test.ts (되돌림 — 가드가 다시 원본과 byte-identical)
const source = fs.readFileSync(filePath, 'utf-8');
const codeOnly = stripComments(source);
if (/#[0-9A-Fa-f]{3,6}\b/.test(codeOnly)) {
  offenders.push(relativePath);
}
```

`src/theme/tokens.test.ts`의 정확한 키 개수 단언(18개 → 19개)도 함께 갱신돼, 새 토큰이
"몰래 늘어난" 게 아니라 셀 수 있게 등록됐다는 것까지 테스트가 강제한다.

### Example 2 — 케이스 B: 단언 값만 갱신, 패턴은 그대로

같은 세션의 다른 태스크에서, 나침반 north-리셋 배지를 추가하며 import 줄이 바뀌었다:

```diff
- import Reanimated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
+ import Reanimated, { FadeIn, FadeOut, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
```

이번엔 `today-wiring.test.ts:234-239`의 "RN Animated 섀도잉 회귀 가드"가 정확한 import
문자열을 정규식으로 통째 대조하고 있어서 깨졌다. 구현 subagent는 가드를 조용히 고치는
대신 상태 `NEEDS_CONTEXT`로 멈추고, 충돌한 이전/이후 import 줄을 그대로 인용하며 왜 이걸
스스로 판단하지 않고 에스컬레이션하는지 — Example 1의 교훈을 명시적으로 근거로 들며 —
보고했다. 오케스트레이터는 이 가드의 정규식이 실제 불변식(default export가 `Animated`로
섀도잉되지 않는 것)이 아니라 부수적 디테일(정확한 named import 목록)을 과하게 좁게
지정하고 있다고 판단하고, 딱 그 한 줄의 기대값만 좁게 갱신하는 걸 승인했다:

```ts
// src/app/__tests__/today-wiring.test.ts (이 기능 브랜치의 로컬 커밋 1bec218 — 위와 동일하게 아직 PR/머지 전)
it('react-native-reanimated default import가 Animated가 아니라 Reanimated로 바인딩된다 (RN Animated 섀도잉 회귀 가드)', () => {
  expect(codeOnly).toMatch(
-   /import Reanimated, \{ useAnimatedStyle, useSharedValue \} from 'react-native-reanimated';/
+   /import Reanimated, \{ FadeIn, FadeOut, useAnimatedStyle, useSharedValue \} from 'react-native-reanimated';/
  );
  expect(codeOnly).not.toMatch(/import Animated,[\s\S]{0,5}\{[\s\S]*?\} from 'react-native-reanimated';/);
});
```

두 번째 줄 — 실제 anti-shadowing 단언 — 은 한 글자도 바뀌지 않았다. 바뀐 건 "지금 정확히
어떤 import 줄이어야 하는가"라는 부수적 사실 하나뿐이고, "default export가 `Animated`라는
이름으로 섀도잉되면 안 된다"는 가드의 본질은 그대로 유지됐다.

## Related

- [`docs/solutions/logic-errors/today-list-missing-focus-reload-orphans-photo.md`](../logic-errors/today-list-missing-focus-reload-orphans-photo.md) — 무관한 버그지만, Prevention 섹션이 같은 `*-wiring.test.ts` 계열 정적 소스분석 회귀 가드 컨벤션을 다룬다.
- [`docs/designs/recenter-compass-badge.md`](../../designs/recenter-compass-badge.md) — 이 학습을 낳은 실제 구현 세션의 설계 문서. `src/theme/tokens.ts`의 하드코딩 hex 가드를 이유로 배지 색상을 반투명 대신 단색으로 정한 결정(설계안 5, 2026-09-01)이 담겨 있다.
