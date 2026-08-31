// src/today/TodayBottomSheet.tsx
// 04-04-PLAN.md Task 3 — 오늘 뷰의 3단 스냅(CLOSED/DRAGGING/OPEN) 바텀시트.
//
// 재사용 가능한 독립 컴포넌트 계약(CheckinActionCard.tsx/NotificationDeniedBanner.tsx와
// 동일): 이 컴포넌트는 화면별 로직이나 위치 지정(absolute positioning)을 내부에 갖지
// 않는다 — 배치는 항상 부모(오늘 화면)가 결정한다. `animatedPosition`은 부모가 소유하는
// reanimated SharedValue다 — 시트는 자신의 현재 상단 y좌표를 여기에 계속 써 넣기만
// 하고, 부모가 플로팅 체크인/재센터 버튼의 bottom 오프셋 계산에 이 값을 읽는다(D-05).
// `onChange(index)` 콜백에만 의존하지 않는 이유: 그건 스냅 도달 시점에만 발화해
// 드래그 중 버튼이 실시간으로 따라오지 못하고 튀게 만든다 — DRAGGING 상태의
// "손가락을 실시간으로 따라간다" 요구(04-UI-SPEC.md)와 배치된다.
import { useMemo } from 'react';
import { StyleSheet, Text } from 'react-native';
import BottomSheet, { BottomSheetFlatList, useBottomSheetTimingConfigs } from '@gorhom/bottom-sheet';
import type { SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, motion, radius, spacing, typography } from '../theme/tokens';
import { CheckinListRow, LIST_ROW_MIN_HEIGHT } from './CheckinListRow';
import { TODAY_COPY } from './content';
import type { CheckinRow } from '../db/schema';

// 핸들 바 두께(4px) — 04-UI-SPEC.md §바텀시트: "36×4px 바". CLOSED 피크 높이 계산에
// 재사용하므로 별도 상수로 뺀다(리터럴 4를 두 곳에 중복하지 않는다).
const SHEET_HANDLE_HEIGHT = 4;

export type TodayBottomSheetProps = {
  checkins: CheckinRow[];
  // 부모가 onLayout으로 잰 오늘 화면 콘텐츠 영역 높이(탭바 제외).
  containerHeight: number;
  // 부모가 소유하는 reanimated SharedValue — 시트가 계속 써 넣고, 부모가 읽는다(D-05).
  animatedPosition: SharedValue<number>;
};

export function TodayBottomSheet({
  checkins,
  containerHeight,
  animatedPosition,
}: TodayBottomSheetProps) {
  const insets = useSafeAreaInsets();

  // 3개 스냅포인트 전환 모두 motion.bottomSheetSnapMs(220ms) — 새 모션 토큰을
  // 발명하지 않는다(04-UI-SPEC.md §바텀시트 "애니메이션").
  const animationConfigs = useBottomSheetTimingConfigs({
    duration: motion.bottomSheetSnapMs,
  });

  // 스냅 지점 배열은 useMemo로 안정화한다 — 매 렌더 새 배열을 넘기면 시트가
  // 불필요하게 재계산된다.
  const snapPoints = useMemo(() => {
    // CLOSED 피크 = 핸들 영역(상하 spacing.sm 여백 + 핸들 바) + 리스트 행 1개 높이.
    // 04-UI-SPEC.md §Spacing Scale Exceptions: "핸들 영역 + 리스트 행 1개 = 약 80px" —
    // 리터럴 80을 하드코딩하지 않고 토큰/상수에서 그대로 파생한다.
    const closedPeak = spacing.sm * 2 + SHEET_HANDLE_HEIGHT + LIST_ROW_MIN_HEIGHT;
    // OPEN = 화면 대부분이되 100% 풀스크린은 아니다 — 상단에 insets.top + spacing.xl만큼
    // 지도가 항상 보이도록 남긴다(04-UI-SPEC.md §바텀시트 "OPEN").
    const openPeak = containerHeight - insets.top - spacing.xl;
    return [closedPeak, openPeak];
  }, [containerHeight, insets.top]);

  // 레이아웃 측정 전(또는 유효하지 않은 높이)에는 렌더를 피한다.
  if (containerHeight <= 0) {
    return null;
  }

  return (
    <BottomSheet
      snapPoints={snapPoints}
      animatedPosition={animatedPosition}
      animationConfigs={animationConfigs}
      enableDynamicSizing={false}
      backgroundStyle={styles.background}
      handleStyle={styles.handle}
      handleIndicatorStyle={styles.handleIndicator}
    >
      {checkins.length === 0 ? (
        <Text style={[typography.helperText, styles.emptyText]}>{TODAY_COPY.emptyState}</Text>
      ) : (
        <BottomSheetFlatList
          data={checkins}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <CheckinListRow checkin={item} />}
        />
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  background: {
    backgroundColor: colors.surface,
    // 상단 모서리만 radius.lg — 하단 모서리 없음(탭바에 맞닿는다).
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
  },
  handle: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingTop: spacing.sm,
    // 핸들 드래그 히트 영역은 44pt 이상 확보한다(04-UI-SPEC.md §Spacing Scale
    // Exceptions) — 시각적 인디케이터는 36×4px로 작지만, 컨테이너 자체를 44pt로
    // 키워 히트 영역을 넓힌다.
    minHeight: 44,
  },
  handleIndicator: {
    width: 36,
    height: SHEET_HANDLE_HEIGHT,
    backgroundColor: colors.line,
    borderRadius: radius.full,
  },
  emptyText: {
    color: colors.textMuted,
    paddingHorizontal: spacing.lg,
    minHeight: LIST_ROW_MIN_HEIGHT,
    textAlignVertical: 'center',
  },
});
