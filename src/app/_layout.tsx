// src/app/_layout.tsx
// 루트 레이아웃 — 앱 부팅 시퀀스의 진입점.
// 배선 순서: 폰트 로딩 게이팅(스플래시 유지) → SQLite 마이그레이션(onInit) → 화면 트리(Stack).
// Source: 01-PATTERNS.md `src/app/_layout.tsx` "Full pattern to copy verbatim" +
//         01-RESEARCH.md Architecture Patterns Pattern 2.
//
// Pitfall 3 (01-RESEARCH.md / migration_discipline #3): migrateDbIfNeeded는 절대
// 컴포넌트 body나 별도 useEffect에서 직접 호출하지 않는다 — 반드시 SQLiteProvider의
// onInit prop으로만 전달한다. onInit은 DB 연결 직후 정확히 1회 실행을 보장하는 공식 API다.
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import { SQLiteProvider } from 'expo-sqlite';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { DATABASE_NAME, migrateDbIfNeeded } from '../db/migrations';
import { newsreaderFonts } from '../theme/fonts';

SplashScreen.preventAutoHideAsync();

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
    <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrateDbIfNeeded}>
      <Stack screenOptions={{ headerShown: false }} />
    </SQLiteProvider>
  );
}
