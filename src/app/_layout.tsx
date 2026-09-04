// src/app/_layout.tsx
// 루트 레이아웃 — 앱 부팅 시퀀스의 진입점.
// 배선 순서: 폰트 로딩 게이팅(스플래시 유지) → SQLite 마이그레이션(onInit) → 화면 트리(Stack).
// Source: 01-PATTERNS.md `src/app/_layout.tsx` "Full pattern to copy verbatim" +
//         01-RESEARCH.md Architecture Patterns Pattern 2.
//
// Pitfall 3 (01-RESEARCH.md / migration_discipline #3): migrateDbIfNeeded는 절대
// 컴포넌트 body나 별도 useEffect에서 직접 호출하지 않는다 — 반드시 SQLiteProvider의
// onInit prop으로만 전달한다. onInit은 DB 연결 직후 정확히 1회 실행을 보장하는 공식 API다.
//
// 배선 규칙(Plan 02-07): 알림 자가진단 오케스트레이터 함수(아래 두 번째 useEffect가
// import해서 호출하는 그 함수 하나)와 알림 권한 재확인 로직은 이 파일의 단일
// AppState 리스너에서만 호출한다. 화면 컴포넌트나 다른 useEffect에서 중복
// 호출하면 포그라운드 전환마다 자가진단이 N배로 돌아 불필요한 네이티브 왕복이
// 생긴다(T-02-19). 배너의 권한 재조회는 알림 권한 배너 훅이 자체 구독으로
// 처리하며, 그건 UI 표시용 상태라 자가진단과는 별개 관심사다 — 여기서 중복
// 호출하지 않는다.
import { Stack, router } from 'expo-router';
import { useFonts } from 'expo-font';
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native';
import { useEffect, useRef } from 'react';
import { DATABASE_NAME, migrateDbIfNeeded } from '../db/migrations';
import { newsreaderFonts } from '../theme/fonts';
import { runForegroundNotificationCheck } from '../notifications/registry';
import { subscribeToForegroundActive } from '../notifications/permissions';
import { getSettingsRow, resolveNotificationSettings } from '../settings/settingsRepo';
import { DAILY_REFLECTION_ID } from '../notifications/scheduling';

SplashScreen.preventAutoHideAsync();

// 06-06-PLAN.md Task 2 (06-RESEARCH.md Pitfall 5) — 자가진단이 영속 설정을 읽어야
// 하는데, useSQLiteContext()는 SQLiteProvider 자식 트리 안에서만 쓸 수 있다.
// RootLayout 본문(아래)은 SQLiteProvider 바깥이라 여기서 이 훅을 쓸 수 없으므로,
// db 접근이 필요해진 자가진단 오케스트레이션 전체를 이 내부 컴포넌트로 옮겼다 —
// <SQLiteProvider> 자식 트리 최상단에 렌더하고 UI는 그리지 않는다(항상 null).
//
// 배선 규칙(Plan 02-07)은 그대로 유지된다: 자가진단 호출 지점은 앱 전체에서
// 이 컴포넌트 하나뿐이고, 아래에서 import한 구독 함수가 이미 AppState의
// 래퍼이므로 이 파일에서 그 네이티브 API를 직접 다시 부르지 않는다(중복 호출
// 시 리스너가 두 개가 된다, T-02-19).
function NotificationSelfHealGate() {
  const db = useSQLiteContext();

  // 반드시 RootLayout의 `if (!fontsLoaded && !fontError) { return null; }` 조기
  // 반환보다 위쪽 트리에서 마운트된다 — 이 컴포넌트 자체가 그 조기 반환 아래
  // (SQLiteProvider 자식)에 있으므로 훅 순서 문제는 없다.
  useEffect(() => {
    const runCheck = () => {
      (async () => {
        // 설정 읽기 실패가 자가진단 자체를 건너뛰게 만들지 않는다(T-06-11) — 실패
        // 시 row를 null로 두면 resolveNotificationSettings(null)이 Phase 2
        // 기본값("매시간"/하루마무리 켜짐)으로 폴백한다.
        let row = null;
        try {
          row = await getSettingsRow(db);
        } catch (error) {
          console.error('[notifications] failed to read settings for self-heal', error);
        }
        await runForegroundNotificationCheck(resolveNotificationSettings(row));
      })().catch((error) => {
        // 프로미스를 조용히 삼키지 않는다(repo 규약, T-02-21) — 자가진단 실패를
        // 콘솔에 반드시 남긴다.
        console.error('[notifications] foreground check failed', error);
      });
    };
    // 마운트 시 1회 호출 — 콜드스타트 경로. 신규 설치 시 최초 트리거 등록도
    // 이 경로가 담당한다.
    runCheck();
    return subscribeToForegroundActive(runCheck);
  }, [db]);

  return null;
}

// 07-08-PLAN.md Task 2 — 회고 알림 탭 → 모달 딥링크 게이트.
// NotificationSelfHealGate와 동일한 관용구: SQLiteProvider 자식 트리에서 실행되고
// 항상 null을 반환한다. 새 AppState 리스너를 추가하지 않는다 —
// useLastNotificationResponse()만으로 콜드스타트(앱이 완전히 종료된 상태에서 알림
// 탭으로 실행)와 백그라운드 복귀 두 경로를 모두 커버하며(07-RESEARCH.md
// Don't Hand-Roll), 알림 응답 수신 리스너를 별도로 병행 구독하면 같은 탭이 두
// 경로로 처리돼 모달이 두 번 push된다. 그래서 이 게이트를 추가해도
// settings-wiring.test.ts Test 23/24가 지키는 "루트 레이아웃 AppState 리스너
// 1개" 계약은 그대로 유지된다.
function ReflectionNotificationDeepLinkGate() {
  const response = Notifications.useLastNotificationResponse();
  // 같은 알림 응답을 재렌더마다 다시 처리해 모달이 여러 장 쌓이는 것을 막는
  // 중복 처리 가드 — 알림 발화 시각 + actionIdentifier를 키로 비교한다.
  const handledRef = useRef<string | null>(null);

  useEffect(() => {
    if (!response) return;
    // 체크인 리마인더 탭에는 반응하지 않는다 — 이 앱이 스케줄 등록 시 직접 부여한
    // identifier라 외부에서 위조할 수 없다(T-07-22).
    if (response.notification.request.identifier !== DAILY_REFLECTION_ID) return;

    const responseKey = response.notification.date + response.actionIdentifier;
    if (handledRef.current === responseKey) return;
    handledRef.current = responseKey;

    // 절대 경로 '/reflection'을 쓴다 — 현재 스택 기준으로 풀리는 상대 경로 표기는
    // 조용히 실패한다(07-RESEARCH.md Pitfall 3, STATE.md Phase 6 라우트 버그 선례).
    // 이동할 라우트를 알림 페이로드에서 읽지 않는다 — 하드코딩된 문자열 하나뿐이라
    // 딥링크 조작을 통한 URL 인젝션 표면이 존재하지 않는다(T-07-21).
    router.push('/reflection');
  }, [response]);

  return null;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(newsreaderFonts);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    // GestureHandlerRootView: react-native-gesture-handler/reanimated/worklets가 이미
    // Phase 6(캘린더 스크러버)·바텀시트용으로 설치돼 있어, 그 시점에 처음 필요해지기 전에
    // 루트에서 미리 감싸둔다 — 없으면 특히 Android에서 제스처 인식이 예측 불가능하게
    // 깨질 수 있다.
    //
    // 세이프에어리어 provider: GestureHandlerRootView 바로 안쪽, SQLiteProvider
    // 바깥에 둔다. src/app/priming.tsx(Plan 06)가 useSafeAreaInsets()를 쓰는데
    // provider가 없으면 런타임에 값이 0이 되거나 에러가 나므로 이 배선이 필수다.
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrateDbIfNeeded}>
          <NotificationSelfHealGate />
          <ReflectionNotificationDeepLinkGate />
          <StatusBar style="auto" />
          {/* 07-08-PLAN.md Task 1 — "reflection" 스크린은 (tabs) 그룹의 형제로 루트
              Stack에 등록해야 탭 네비게이터 전체를 덮는다(presentation: 'modal').
              이 저장소의 기존 두 화면 전환 패턴 — 같은 탭 nested Stack 안의 push(예:
              체크인 상세/설정), nested Stack 안에서 탭바 표시 스타일을 'none'으로
              숨기는 push(과거 날짜 뷰) — 어느 쪽도 아닌 세 번째 방식이다. 회고 화면
              쪽에 탭바 표시 스타일을 조작하는 코드를 추가하지 않는다 — 모달이 이미
              루트 레벨에서 탭 네비게이터를 통째로 덮으므로 PastDateScreen.tsx의 탭바
              숨김 조작 패턴을 복제하면 불필요한 코드이자 "탭바를 만지는 파일은 한
              개뿐" 계약 위반이다(07-RESEARCH.md Anti-Patterns). 커스텀 전환
              애니메이션(duration/easing)도 지정하지 않는다 — iOS 네이티브 기본
              전환에 위임한다(07-UI-SPEC.md 확정). */}
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen
              name="reflection"
              options={{ presentation: 'modal', headerShown: false }}
            />
          </Stack>
        </SQLiteProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
});
