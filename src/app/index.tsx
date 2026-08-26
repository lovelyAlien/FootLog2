// src/app/index.tsx
// 부팅 확인용 임시 플레이스홀더 화면 — 제품 UI가 아니다.
// Phase 4(REQ-today-view)가 이 화면을 오늘 뷰로 완전히 대체한다.
//
// 목적: Foundation phase(Plan 01-02 디자인 토큰, 01-03 SQLite 마이그레이션)의 산출물이
// 실제 화면 계층에서 소비됨을 실기기에서 육안으로 확인할 수 있게 한다 — SF Pro / SF Mono
// (ui-monospace) / Newsreader 이탤릭 세리프 3계층 타이포와 DB 스키마 버전을 동시에 표시한다.
// 표시하는 유일한 숫자는 DB 스키마 버전(진단값)이며, 진행률/완료 수치가 아니다
// (PROJECT.md CRITICAL 원칙).
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { colors, spacing, typography } from '../theme/tokens';

export default function Index() {
  const db = useSQLiteContext();
  const [schemaVersion, setSchemaVersion] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;
    db.getFirstAsync<{ user_version: number }>('PRAGMA user_version').then((row) => {
      if (isMounted) {
        setSchemaVersion(row?.user_version ?? null);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [db]);

  return (
    <View style={styles.container}>
      <Text style={[typography.screenTitle, styles.textPrimary]}>FootLog</Text>
      <Text style={[styles.timestampText, schemaVersion === null ? styles.textFaint : styles.textMuted]}>
        {schemaVersion === null ? '···' : `schema v${schemaVersion}`}
      </Text>
      <Text style={[typography.journalEntry, styles.textPrimary]}>
        오늘도 걸었던 길을 조용히 남겨둔다.
      </Text>
      <Text style={[typography.helperText, styles.textMuted]}>
        이 화면은 Foundation phase의 부팅 확인용 임시 화면입니다.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  // typography.timestamp의 fontVariant는 `as const`로 readonly 배열이라 RN의
  // TextStyle(mutable FontVariant[])에 그대로 넣으면 타입 에러가 난다 — 캐스트 대신
  // fontVariant만 얕은 복사해 스타일 시트에 고정한다(01-04 Task 2, tsconfig strict 대응).
  timestampText: {
    ...typography.timestamp,
    fontVariant: [...typography.timestamp.fontVariant],
  },
  textPrimary: {
    color: colors.textPrimary,
  },
  textMuted: {
    color: colors.textMuted,
  },
  textFaint: {
    color: colors.textFaint,
  },
});
