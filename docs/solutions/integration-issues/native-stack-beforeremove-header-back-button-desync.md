---
title: 네이티브 헤더 뒤로가기 버튼이 beforeRemove 리스너의 JS 취소를 우회해 native-stack 상태 불일치를 재현하던 버그
date: 2026-09-01
category: integration-issues
module: checkin-detail-exit-guard
problem_type: integration_issue
component: frontend_stimulus
symptoms:
  - "실기기에서 메모를 수정해 dirty 상태를 만든 뒤 네이티브 헤더의 뒤로가기 버튼을 탭하면 \"The screen '[id]' was removed natively but didn't get removed from JS state. This can happen if the action was prevented in a 'beforeRemove' listener, which is not fully supported in native-stack.\" 콘솔 에러가 재현됨"
  - "edge-swipe 제스처 dismiss 경로는 이미 gestureEnabled: false로 차단된 상태였는데도 동일한 경고가 재현되어, 헤더 뒤로가기 버튼이 별도의 여전히 열려 있는 네이티브 dismiss 트리거였음이 드러남"
  - "navigation.addListener('beforeRemove', ...) 안에서 호출한 e.preventDefault()는 JS 쪽 pop 액션만 막을 뿐, native-stack의 네이티브 스크린 컴포넌트(react-native-screens)가 확인하는 preventNativeDismiss 플래그는 설정하지 않아 네이티브 pop 애니메이션이 JS 리스너와 무관하게 시작·완료될 수 있었음"
root_cause: wrong_api
resolution_type: code_fix
severity: medium
related_components: [expo-router, react-navigation, react-native-screens, CheckinDetailScreen]
tags: [beforeremove, native-stack, react-navigation, preventremove, header-back-button, gesture-disabled, expo-router, navigation-desync]
---

# 네이티브 헤더 뒤로가기 버튼이 beforeRemove 리스너의 JS 취소를 우회해 native-stack 상태 불일치를 재현하던 버그

## Problem

`src/checkin/CheckinDetailScreen.tsx` implemented an unsaved-changes exit guard using the standard React Navigation "preventing going back" idiom — `navigation.addListener('beforeRemove', (e) => { if (isDirtyRef.current) { e.preventDefault(); Alert.alert(...) } })`. On a real device, editing the memo and then tapping the *native header's* back button reproduced this console error even after an earlier, separate fix had already disabled the edge-swipe-back gesture while the screen was dirty:

> "The screen '[id]' was removed natively but didn't get removed from JS state. This can happen if the action was prevented in a 'beforeRemove' listener, which is not fully supported in native-stack. Consider using a 'usePreventRemove' hook with 'headerBackButtonMenuEnabled: false' to prevent users from natively going back multiple screens."

This matters beyond log noise: it signals JS navigation state and the native view stack have desynced — React Navigation's own docs class this as a state-desync condition capable of producing confusing or broken navigation behavior (stale screens reappearing, back gestures acting on the wrong route), not merely a cosmetic warning.

## Symptoms

- Console error "The screen '[id]' was removed natively but didn't get removed from JS state..." appearing on real device (iOS) after editing the memo field and tapping the native header back button.
- The error reproduced specifically via the header back button — NOT via the edge-swipe gesture, which a prior fix (commit `01ca584`) had already closed off by disabling `gestureEnabled` while the screen was dirty.
- The unsaved-changes `Alert.alert` guard worked correctly in most manual testing (swipe path, and cases where JS had time to intercept), making this a narrow, trigger-specific race rather than a total feature failure.

## What Didn't Work

**The original `beforeRemove` + `e.preventDefault()` listener (`navigation.addListener('beforeRemove', ...)`).** This is not a broken or incorrectly-used API — it is the standard, documented pattern for JS-only navigators, and in most manual testing it worked: the alert appeared and blocked navigation. The gap is narrower than "wrong API" in the naive sense: `e.preventDefault()` inside a `beforeRemove` listener only stops the JS-side navigation *action* from being dispatched. It does nothing to tell native-stack's UIKit layer to hold off on removing the screen. When the native header's back button is tapped, native-stack calls `onHeaderBackButtonClicked`, which unconditionally dispatches `StackActions.pop()` with no gating on `preventRemove` (`node_modules/expo-router/build/react-navigation/native-stack/views/NativeStackView.native.js:304-309`). The native view can therefore already be torn down before/independent of whatever the JS listener decides, leaving JS state pointing at a route the native stack no longer has. This is a case where a correct, documented API is *insufficient* for one specific native-originated trigger under native-stack, not a case of misuse.

**Deep-importing `usePreventRemove` from expo-router's internal path.** This is literally what the console warning itself recommends, and it would have closed the gap correctly — `usePreventRemove` is the only code path that calls `setPreventRemove(id, routeKey, preventRemove)` on `PreventRemoveContext` (`node_modules/expo-router/build/react-navigation/core/usePreventRemove.js:53-63`), which is what populates the `preventedRoutes` map that `NativeStackView.native.js:148` reads to compute `isRemovePrevented`, in turn passed as the `preventNativeDismiss` prop to the native screen (`NativeStackView.native.js:214`). This was considered and rejected — not because it wouldn't work, but because `usePreventRemove` is confirmed absent from expo-router's public surface (zero matches for `usePreventRemove` in both `node_modules/expo-router/build/exports.d.ts` and `node_modules/expo-router/build/index.d.ts`). Importing it would require reaching into `expo-router/build/react-navigation/core/usePreventRemove` directly — a private, unversioned internal path with no deprecation guarantees, exactly the kind of dependency that can break silently across an expo-router bump.

## Solution

Two-part fix, both already present in the current source (commits `01ca584` and `fbb3f13` on the local `gsd/phase-04-today-view` branch, not yet merged/pushed to `origin/main` as of this writing).

**Part 1 — close the swipe-gesture native-dismiss path.** `gestureEnabled` is set to `false` as soon as an edit makes the screen dirty, and restored to `true` in every success branch that clears dirty state:

```tsx
// src/checkin/CheckinDetailScreen.tsx:159-170 (handleChangeNote)
function handleChangeNote(next: string) {
  setNote(next);
  noteRef.current = next;
  isDirtyRef.current = true;
  navigation.setOptions({ gestureEnabled: false });
}
```

Restored on successful save in the three places that clear `isDirtyRef`/photo state:
- `flushNoteAndPhoto` (line 152): `navigation.setOptions({ gestureEnabled: true });` after `result.ok`
- `handlePickPhoto`'s success callback (line 253)
- `handleDeletePhoto`'s success callback (line 301)

**Part 2 — replace `beforeRemove` with a fully custom `headerLeft`.** The `navigation.addListener('beforeRemove', ...)` block is gone entirely. In its place, `headerLeft` renders a JS `Pressable` whose `onPress` (`handleBackPress`) owns the dirty check itself, before any navigation action is dispatched:

```tsx
// src/checkin/CheckinDetailScreen.tsx:358-379
const handleBackPress = useCallback(() => {
  if (!isDirtyRef.current) {
    navigation.goBack();
    return;
  }
  Alert.alert(CHECKIN_DETAIL_COPY.unsavedTitle, undefined, [
    { text: CHECKIN_DETAIL_COPY.keepEditing, style: 'default' },
    {
      text: CHECKIN_DETAIL_COPY.discardAndLeave,
      style: 'default',
      onPress: () => navigation.goBack(),
    },
    {
      text: CHECKIN_DETAIL_COPY.saveAndLeave,
      style: 'default',
      onPress: () => {
        flushNoteAndPhoto();
        navigation.goBack();
      },
    },
  ]);
}, [navigation, flushNoteAndPhoto]);

useEffect(() => {
  navigation.setOptions({
    headerLeft: () => (
      <Pressable
        onPress={handleBackPress}
        accessibilityRole="button"
        accessibilityLabel={CHECKIN_DETAIL_COPY.goBack}
        hitSlop={SMALL_ICON_HIT_SLOP}
        style={styles.headerBackButton}
      >
        <SymbolView name="chevron.left" tintColor={colors.textPrimary} />
      </Pressable>
    ),
  });
}, [navigation, handleBackPress]);
```

Note each Alert button calls `navigation.goBack()` directly rather than `navigation.dispatch(e.data.action)` — there is no longer an intercepted native-originated action to replay, since the JS `Pressable` is now the only thing on this screen that can ever initiate a back action.

## Why This Works

native-stack's screen removal is a **native, UIKit-driven** transition — JS does not own it and can only gate it reactively. There are exactly two levers JS has: (1) intercepting the JS-side navigation action before it dispatches (what `beforeRemove` + `e.preventDefault()` does), and (2) setting the `preventNativeDismiss` prop on the native screen itself, which is populated *exclusively* through `usePreventRemove`'s registration on `PreventRemoveContext` (`usePreventRemove.js:58-63` → `NativeStackView.native.js:148,214`). A plain `addListener('beforeRemove')` interception only ever engages lever (1). That is sufficient when JS is what *initiates* the removal — a JS-rendered button calling `goBack()` always goes through the JS action-dispatch path first, so `preventDefault()` has a chance to run before anything native happens. It is insufficient when a **native control** — the native header chrome's back button, or the OS edge-swipe gesture recognizer — can initiate removal directly at the native layer. In that case native-stack can already be tearing the screen down (or about to, via `onHeaderBackButtonClicked` unconditionally dispatching `StackActions.pop()`, `NativeStackView.native.js:304-309`) before/independent of the JS listener's decision — a race, not a deterministic block.

The fix eliminates the race structurally rather than plugging one instance of it. `gestureEnabled: false` removes the swipe gesture recognizer entirely while dirty, so there is no native gesture path left to race. Replacing the native header with a JS `Pressable` removes the *other* native-originated trigger (`onHeaderBackButtonClicked`) by replacing the native control with a JS one — `handleBackPress` is now a normal JS function that runs to completion (including showing the Alert and deciding whether to call `goBack()` at all) before any navigation action exists to be dispatched. With both native-originated triggers closed off, the only way to initiate back-navigation on this screen is the JS `Pressable`, which makes JS interception no longer a race by construction — there is nothing left for it to race against.

## Prevention

- **Any unsaved-changes / confirm-before-leaving guard on a native-stack screen must audit every native-originated dismiss trigger separately** — the edge-swipe gesture and the native header back button are two independent triggers, not one. Testing and fixing one (as the earlier `gestureEnabled` fix did) does not imply the other is covered; each needs its own verification pass on a real device.
- **Detection technique**: grep device/Metro logs for the literal string `"was removed natively but didn't get removed from JS state"` — this is the exact `console.error` text emitted by `useDismissedRouteError.js` whenever this class of desync occurs, regardless of which native trigger caused it. Treat any occurrence as a signal that some native control on that screen can still bypass the JS guard.
- **Design principle**: prefer making JS the sole initiator of an action you need to gate, over trying to intercept a native-initiated action after the fact. If a native control can start the state change directly (header back button, swipe gesture, OS-level dismiss), a JS listener downstream of it is racing, not gating. Replacing the native control with an equivalent JS-rendered control (as done here with `headerLeft`) is more robust than chasing every native trigger with its own workaround — and does not require depending on expo-router's non-exported `usePreventRemove` internals.

## Related Issues

- [`docs/solutions/logic-errors/today-list-missing-focus-reload-orphans-photo.md`](../logic-errors/today-list-missing-focus-reload-orphans-photo.md) — a different bug (stale list cache / orphaned photo files from a missing `useFocusEffect`) found and fixed the same day in a neighboring screen (`src/app/(tabs)/index/index.tsx`, the Today screen that pushes this detail screen). Noted here only as a same-area pointer — both are React Navigation lifecycle edge cases touching this check-in detail flow — not because they share a root cause or solution; they don't.
