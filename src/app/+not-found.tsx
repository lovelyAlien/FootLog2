// src/app/+not-found.tsx
// Expo Router의 매칭되지 않은 경로 처리 화면.
// app.json이 "footlog://" 딥링크 스킴을 선언하고 있어, 오래되었거나 잘못된 링크
// (푸시 알림, 공유 시트, 예전 링크 등)가 아무 화면과도 매칭되지 않을 수 있다 —
// 이 파일이 없으면 라우터의 이름 없는 기본 처리로 떨어진다.
import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../theme/tokens';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: '페이지를 찾을 수 없어요' }} />
      <View style={styles.container}>
        <Text style={[typography.screenTitle, styles.text]}>페이지를 찾을 수 없어요</Text>
        <Link href="/" style={styles.link}>
          <Text style={[typography.helperText, styles.text]}>홈으로 돌아가기</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  text: {
    color: colors.textPrimary,
  },
  link: {
    marginTop: spacing.md,
  },
});
