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
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import { SQLiteProvider } from 'expo-sqlite';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native';
import { useEffect } from 'react';
import { DATABASE_NAME, migrateDbIfNeeded } from '../db/migrations';
import { newsreaderFonts } from '../theme/fonts';
import { runForegroundNotificationCheck } from '../notifications/registry';
import { subscribeToForegroundActive } from '../notifications/permissions';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(newsreaderFonts);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // 콜드스타트 + 포그라운드 복귀 시 정확히 하나의 경로로 권한 재확인·자가진단을
  // 실행한다. 아래에서 import한 구독 함수가 이미 AppState의 래퍼이므로(Plan 04),
  // 이 파일에서 AppState.addEventListener를 직접 다시 부르지 않는다 — 그러면
  // 리스너가 두 개가 된다.
  //
  // 반드시 아래 `if (!fontsLoaded && !fontError) { return null; }` 조기 반환보다
  // 위쪽에 둔다 — 조기 반환 아래에 훅을 두면 React 훅 호출 순서 규칙이 깨진다.
  useEffect(() => {
    const runCheck = () => {
      // 프로미스를 조용히 삼키지 않는다(repo 규약, T-02-21) — 자가진단 실패를
      // 콘솔에 반드시 남긴다.
      runForegroundNotificationCheck().catch((error) => {
        console.error('[notifications] foreground check failed', error);
      });
    };
    // 마운트 시 1회 호출 — 콜드스타트 경로. 신규 설치 시 최초 트리거 등록도
    // 이 경로가 담당한다.
    runCheck();
    return subscribeToForegroundActive(runCheck);
  }, []);

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
          <StatusBar style="auto" />
          <Stack screenOptions={{ headerShown: false }} />
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
