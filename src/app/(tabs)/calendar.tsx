// src/app/(tabs)/calendar.tsx
// Phase 4(04-03-PLAN.md Task 1) — 캘린더 탭 플레이스홀더 화면(D-07). 월 그리드·
// 과거 날짜 뷰·플로팅 날짜 스크러버는 Phase 6 소관이라 이 phase는 담담한 안내
// 텍스트 한 줄만 렌더한다. 새 컴포넌트/아이콘/버튼/인터랙션을 만들지 않는다.
import { StyleSheet, Text, View } from 'react-native';
import { colors, typography } from '../../theme/tokens';
import { TODAY_COPY } from '../../today/content';

export default function CalendarScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.placeholder}>{TODAY_COPY.calendarPlaceholder}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  placeholder: {
    ...typography.helperText,
    color: colors.textMuted,
  },
});
