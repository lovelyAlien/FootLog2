// src/calendar/CalendarGridScreen.tsx
// 06-03-PLAN.md Task 2 — 캘린더 탭 홈: 월 그리드 렌더 + 월 이동(스와이프+화살표) +
// 기록 유무 무채색 톤(D-04) + 오늘 accent 밑줄.
//
// T-06-03(threat_model, mitigate) — 이 화면은 SQL을 갖지 않는다. 문자열은
// checkinRepo.ts에만 존재하고, 이 화면이 넘기는 범위 값은 monthRangeBounds가 만든
// YYYY-MM-DD 두 개뿐이며 파라미터 바인딩으로 전달된다.
// T-06-07(threat_model, mitigate) — 체크인 개수/진행률 수치를 어떤 형태로도 렌더하지
// 않는다(PROJECT.md CRITICAL). 기록 유무는 무채색 2단 톤(textMuted/textFaint)으로만
// 표현한다.
//
// 06-RESEARCH.md §Don't Hand-Roll — "이 달에 기록이 있는 날짜"는 하루씩 N번 단일
// 날짜 조회 함수를 부르는 루프가 아니라 getCheckinDateKeysInRange 단일 범위
// 쿼리로 얻는다(local_date_key가 YYYY-MM-DD 사전식 정렬 = 시간순이라는 전제, 기존
// idx_checkins_local_date_key 인덱스 재사용).
//
// 06-RESEARCH.md Pitfall 1 — 탭바 스타일 오버라이드는 이 화면에 절대 등장하지
// 않는다. 탭바는 nested-stack 기본값으로 항상 보인다 — 숨김은 과거 날짜 화면
// ([date].tsx, 06-04) 한 곳의 책임이다.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MigratableDb } from '../db/migrations';
import { colors, radius, spacing, typography } from '../theme/tokens';
import { getCheckinDateKeysInRange } from '../checkin/checkinRepo';
import { resolveLocalDateKey } from '../checkin/localDate';
import {
  buildMonthGrid,
  formatDateKeyTitle,
  formatMonthHeader,
  monthRangeBounds,
  shiftMonth,
  yearMonthOf,
} from './monthGrid';
import type { YearMonth } from './monthGrid';
import { CALENDAR_COPY } from './content';

export type CalendarGridScreenProps = {
  db: MigratableDb;
};

// D-05 — 좌우 스와이프가 기본 제스처, 헤더 화살표 버튼은 발견성/접근성 보조 경로.
// 가로 이동이 세로 이동보다 크고 40px 이상일 때만 월을 넘긴다(우발적 세로 스크롤/탭과의
// 경합을 줄인다, activeOffsetX와 별개의 2차 방어선).
const SWIPE_THRESHOLD_PX = 40;

const HEADER_ARROW_SIZE = 44;
const CELL_WIDTH_PERCENT = `${100 / 7}%` as const;

export function CalendarGridScreen({ db }: CalendarGridScreenProps) {
  // headerRow는 이 화면 최상단 절대 위치라 (tabs)/index/index.tsx의 bannerStack과
  // 동일한 이유로 insets.top이 필요하다 — 없으면 월 이동 화살표가 상태바/Dynamic
  // Island 아래 깔려 탭이 닿지 않는다(06-08 Task 2 시뮬레이터 확인으로 발견).
  const insets = useSafeAreaInsets();
  const [visibleMonth, setVisibleMonth] = useState<YearMonth>(() =>
    yearMonthOf(resolveLocalDateKey(new Date()))
  );
  const todayKey = useMemo(() => resolveLocalDateKey(new Date()), []);
  const [recordedDateKeys, setRecordedDateKeys] = useState<Set<string>>(new Set());
  const isMountedRef = useRef(true);
  // reloadMonthPresence의 클로저가 호출 시점의 visibleMonth를 캡처하므로, 응답이
  // 돌아온 "현재" visibleMonth는 별도 ref로 추적해야 비교할 수 있다
  // (PastDateScreen.tsx의 activeDateKeyRef와 동일한 이유 — T-06-14류 완화).
  const visibleMonthRef = useRef(visibleMonth);
  useEffect(() => {
    visibleMonthRef.current = visibleMonth;
  }, [visibleMonth]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // (tabs)/index/index.tsx의 reloadTodayCheckins 관용구를 그대로 복제한다 — 프로미스를
  // 조용히 삼키지 않고 실패해도 console.error만 남긴다(화면은 계속 동작해야 한다).
  const reloadMonthPresence = useCallback(() => {
    // 클로저가 호출 시점의 visibleMonth를 캡처한다 — 응답이 돌아왔을 때 이 값이
    // visibleMonthRef.current(그 시점의 "현재" 값)와 같은지 비교해, 빠른 연속
    // 월 이동 중 이전 달의 늦은 응답이 최신 화면을 덮어쓰지 않도록 가드한다.
    const requestedMonth = visibleMonth;
    const { startDateKey, endDateKey } = monthRangeBounds(requestedMonth);
    getCheckinDateKeysInRange(db, startDateKey, endDateKey)
      .then((dateKeys) => {
        if (isMountedRef.current && requestedMonth === visibleMonthRef.current) {
          setRecordedDateKeys(new Set(dateKeys));
        }
      })
      .catch((error) => {
        console.error('Failed to load month checkin presence', error);
      });
  }, [db, visibleMonth]);

  useEffect(() => {
    reloadMonthPresence();
  }, [reloadMonthPresence]);

  // 다른 탭에서 체크인을 남기고 돌아왔을 때 그리드가 갱신돼야 한다.
  useFocusEffect(
    useCallback(() => {
      reloadMonthPresence();
    }, [reloadMonthPresence])
  );

  const gridCells = useMemo(() => buildMonthGrid(visibleMonth), [visibleMonth]);

  const handleCellPress = useCallback((dateKey: string) => {
    // 미래 날짜도 특별 처리 없이 동일하게 탭 가능하다(D-01 canonical_refs).
    router.push({ pathname: '/calendar/[date]', params: { date: dateKey } });
  }, []);

  const handleSwipeMonthChange = useCallback((delta: number) => {
    setVisibleMonth((current) => shiftMonth(current, delta));
  }, []);

  // 드래그로 여러 날짜를 함께 고르는 기능은 구현하지 않는다(Phase 2 유예 경계) —
  // 이 파일에 롱프레스/드래그 선택 코드는 등장하지 않는다. 순수 스와이프 종료
  // (onEnd) 임계값 판정만 있다.
  const monthSwipeGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-10, 10])
        .onEnd((event) => {
          'worklet';
          const isHorizontalSwipe =
            Math.abs(event.translationX) >= SWIPE_THRESHOLD_PX &&
            Math.abs(event.translationX) > Math.abs(event.translationY);
          if (!isHorizontalSwipe) return;
          const delta = event.translationX < 0 ? 1 : -1;
          runOnJS(handleSwipeMonthChange)(delta);
        }),
    [handleSwipeMonthChange]
  );

  return (
    <View style={styles.container}>
      <View style={[styles.headerRow, { paddingTop: insets.top }]}>
        <Pressable
          onPress={() => setVisibleMonth((current) => shiftMonth(current, -1))}
          accessibilityRole="button"
          accessibilityLabel={CALENDAR_COPY.prevMonthLabel}
          style={styles.headerArrowButton}
        >
          <SymbolView name="chevron.left" tintColor={colors.textPrimary} />
        </Pressable>
        <Text style={styles.monthLabel}>{formatMonthHeader(visibleMonth)}</Text>
        <Pressable
          onPress={() => setVisibleMonth((current) => shiftMonth(current, 1))}
          accessibilityRole="button"
          accessibilityLabel={CALENDAR_COPY.nextMonthLabel}
          style={styles.headerArrowButton}
        >
          <SymbolView name="chevron.right" tintColor={colors.textPrimary} />
        </Pressable>
      </View>

      <View style={styles.weekdayRow}>
        {CALENDAR_COPY.weekdayHeaders.map((label, index) => (
          <Text key={`weekday-${index}`} style={styles.weekdayLabel}>
            {label}
          </Text>
        ))}
      </View>

      <GestureDetector gesture={monthSwipeGesture}>
        <View style={styles.grid}>
          {gridCells.map((cell) => {
            const isToday = cell.dateKey === todayKey;
            const hasRecord = recordedDateKeys.has(cell.dateKey);
            // D-04 — 무채색 2단 톤 재사용(기존 calendar-multiselect-view.md 색상
            // 스킴), 새 색상 토큰을 추가하지 않는다. accent는 아래 오늘 밑줄 한
            // 곳에서만 등장한다 — 셀 배경/선택 원 등 다른 용도로 절대 쓰지 않는다.
            const numberColor = !cell.inCurrentMonth
              ? colors.textFaint
              : isToday
                ? colors.textPrimary
                : hasRecord
                  ? colors.textMuted
                  : colors.textFaint;

            const cellContent = (
              <View style={styles.cellContent}>
                <Text style={[styles.dayNumber, { color: numberColor }]}>{cell.dayOfMonth}</Text>
                {cell.inCurrentMonth && isToday ? <View style={styles.todayUnderline} /> : null}
                {/* 기록 유무를 무채색 톤 차이만으로 전달하지 않기 위한 2차(색맹 무관)
                    단서(06-08 코드 리뷰 WR-05) — 오늘 셀은 이미 accent 밑줄로 충분히
                    구분되므로 중복 표시하지 않는다. */}
                {cell.inCurrentMonth && !isToday && hasRecord ? (
                  <View style={styles.recordDot} />
                ) : null}
              </View>
            );

            // 접근성 라벨은 날짜 제목(formatDateKeyTitle)에 오늘/기록 유무 접미사를
            // 이어 붙인다 — 무채색 톤 차이만으로는 스크린리더 사용자에게 전달되지
            // 않는다(06-08 코드 리뷰 WR-05).
            const accessibilityLabel =
              formatDateKeyTitle(cell.dateKey) +
              (isToday ? CALENDAR_COPY.todayLabelSuffix : '') +
              (hasRecord ? CALENDAR_COPY.hasRecordLabelSuffix : '');

            // 월 밖 패딩 셀은 그리드 정렬용일 뿐 인터랙션 대상이 아니다 — Pressable로
            // 감싸지 않는다.
            if (!cell.inCurrentMonth) {
              return (
                <View key={cell.dateKey} style={styles.cell}>
                  {cellContent}
                </View>
              );
            }

            return (
              <Pressable
                key={cell.dateKey}
                style={styles.cell}
                onPress={() => handleCellPress(cell.dateKey)}
                accessibilityRole="button"
                accessibilityLabel={accessibilityLabel}
              >
                {cellContent}
              </Pressable>
            );
          })}
        </View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
  },
  headerArrowButton: {
    width: HEADER_ARROW_SIZE,
    height: HEADER_ARROW_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: {
    ...typography.screenTitle,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  weekdayRow: {
    flexDirection: 'row',
  },
  weekdayLabel: {
    ...typography.helperText,
    color: colors.textFaint,
    width: CELL_WIDTH_PERCENT,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: CELL_WIDTH_PERCENT,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNumber: {
    fontFamily: 'System',
    fontSize: 15,
    fontWeight: '400',
  },
  todayUnderline: {
    marginTop: spacing['2xs'],
    width: 16,
    height: 2,
    borderRadius: radius.sm,
    backgroundColor: colors.accent,
  },
  recordDot: {
    marginTop: spacing['2xs'],
    width: 3,
    height: 3,
    borderRadius: radius.full,
    backgroundColor: colors.textMuted,
  },
});
