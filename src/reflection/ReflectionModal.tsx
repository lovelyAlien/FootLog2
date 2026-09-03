// src/reflection/ReflectionModal.tsx
// 07-05-PLAN.md Task 1/2 — 회고 화면 본체: 닫기 버튼 / 정적 지도 / 읽기전용 체크인
// 리스트 / 프롬프트 2칸(공유 컴포넌트) / 닫기 시 강제 저장.
//
// 라우트 파일이 아니라 화면 본체다(CheckinDetailScreen.tsx와 동일 계약) — 라우트 등록
// (src/app/reflection.tsx, _layout.tsx presentation: 'modal', 알림 탭 딥링크)은
// 07-07-PLAN.md 몫이다.
//
// 이 화면은 새 조회 함수를 만들지 않는다 — 오늘 뷰가 이미 쓰는 getTodayCheckins +
// buildTrajectoryCoordinates를 그대로 재사용한다(07-UI-SPEC.md, 07-PATTERNS.md).
// 프롬프트 UI/자동저장 로직도 07-04가 만든 공유 훅/컴포넌트를 소비하기만 한다 — 이
// 파일은 데이터 로직을 소유하지 않는다.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { getTodayCheckins } from '../checkin/checkinRepo';
import { formatLocalTime, resolveLocalDateKey } from '../checkin/localDate';
import { MAP_REGION_DELTA } from '../checkin/config';
import { buildTrajectoryCoordinates } from '../today/trajectory';
import { useReflectionDraft } from './useReflectionDraft';
import { ReflectionPrompts } from './ReflectionPrompts';
import { REFLECTION_COPY } from './content';
import { colors, radius, spacing, typography } from '../theme/tokens';
import type { MigratableDb } from '../db/migrations';
import type { CheckinRow } from '../db/schema';

// 작은 아이콘 버튼 터치 영역 확장 — src/settings/SettingsScreen.tsx의 관용구를 그대로
// 재사용한다(07-UI-SPEC.md §Spacing Scale Exceptions 44×44pt).
const SMALL_ICON_HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };

// 07-UI-SPEC.md §Spacing Scale Exceptions — 이 화면 리스트 행 전용 사진 썸네일 크기.
// Today/과거 날짜 뷰 리스트에는 적용하지 않는다.
const REFLECTION_THUMBNAIL_SIZE = 40;

// 정적 지도 블록 고정 높이 — 스크롤 컬럼 안의 절대 채움이 아닌 고정 높이 블록으로 둔다
// (05-CONTEXT.md Claude's Discretion 선례, 이 문서가 정확한 값을 계획 단계 재량으로 위임).
const MAP_BLOCK_HEIGHT = 200;

// 궤적선 두께 — PastDateScreen.tsx의 TRAJECTORY_STROKE_WIDTH와 동일 값.
const TRAJECTORY_STROKE_WIDTH = 2;

export type ReflectionModalProps = {
  db: MigratableDb;
};

// typography.timestamp.fontVariant readonly 튜플 브리징 — 리스트 행/상세화면이 이미
// 쓰는 얕은 복사 관용구를 그대로 복제한다.
const timestampStyle = {
  ...typography.timestamp,
  fontVariant: [...typography.timestamp.fontVariant],
};

// 신규 read-only 행 컴포넌트 — 기존 리스트 행 컴포넌트는 탭 진입과 스와이프 삭제를
// 전제하고 사진 썸네일 슬롯이 없어 이 화면의 계약과 정면으로 다르다(재사용하지 않는다).
function ReflectionCheckinRow({ checkin }: { checkin: CheckinRow }) {
  const time = formatLocalTime(checkin.timestamp_utc);
  return (
    <View style={styles.row}>
      <Text style={[timestampStyle, styles.rowTime]}>{time}</Text>
      {checkin.note ? (
        <Text style={[typography.journalEntry, styles.notePreview]} numberOfLines={1}>
          {checkin.note}
        </Text>
      ) : null}
      {checkin.photo_path ? (
        <Image source={{ uri: checkin.photo_path }} style={styles.thumbnail} contentFit="cover" />
      ) : null}
    </View>
  );
}

export function ReflectionModal({ db }: ReflectionModalProps) {
  const insets = useSafeAreaInsets();
  const isMountedRef = useRef(true);

  // 이 화면은 항상 "오늘"에 대한 것이다(D-03). 반복 캘린더 트리거는 콘텐츠가 등록
  // 시점에 고정돼 알림 페이로드로 날짜를 전달할 수 없으므로, 알림 탭 시점을 포함해
  // 항상 탭/오픈 시점의 로컬 날짜로 판정한다(07-RESEARCH.md Pitfall 2 / Assumptions
  // Log A1).
  const dateKey = useMemo(() => resolveLocalDateKey(new Date()), []);

  const [checkins, setCheckins] = useState<CheckinRow[]>([]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // 이 화면에는 스크러버 같은 날짜 전환 UI가 없다 — 마운트 시 1회만 조회한다
  // (PastDateScreen.tsx의 activeDateKey 재조회 관용구와 다른 이유).
  const loadCheckins = useCallback(() => {
    getTodayCheckins(db, dateKey)
      .then((rows) => {
        if (!isMountedRef.current) return;
        setCheckins(rows);
      })
      .catch((error) => {
        console.error('Failed to load today checkins for reflection modal', error);
      });
  }, [db, dateKey]);

  useEffect(() => {
    loadCheckins();
  }, [loadCheckins]);

  // getTodayCheckins가 이미 timestamp_utc 오름차순 정렬을 보장하므로 여기서 다시
  // 정렬하지 않는다.
  const trajectoryCoordinates = useMemo(() => buildTrajectoryCoordinates(checkins), [checkins]);

  const firstCheckin = checkins[0];
  const region = firstCheckin
    ? {
        latitude: firstCheckin.lat,
        longitude: firstCheckin.lng,
        latitudeDelta: MAP_REGION_DELTA,
        longitudeDelta: MAP_REGION_DELTA,
      }
    : undefined;

  const draft = useReflectionDraft(db, dateKey);

  // 닫기(✕) — draft.flush()의 결과를 기다린 뒤에만 화면을 닫는다. 아래로 스와이프해
  // 닫는 경로는 별도 화면 이탈 리스너를 달지 않는다 — useReflectionDraft가 언마운트
  // cleanup에서 이미 flush하므로, 화면 제거 시점을 다시 구독하면 같은 draft가 두
  // 경로로 저장될 위험이 생긴다(스와이프 닫기는 훅의 언마운트 flush가 커버한다는
  // 판단). 상세화면의 미저장 경고 방식은 여기서 복제하지 않는다 — 05-CONTEXT.md
  // D-01/D-02가 상세화면(명시적 flush 모델)과 회고(자동저장 모델)를 의도적으로 다른
  // 모델로 확정했기 때문이다.
  //
  // 코드 리뷰 발견: 이전에는 flush()를 기다리지 않고 곧장 router.back()을 불러
  // 화면이 언마운트됐다 — 그 직후 저장이 실패해도 useReflectionDraft의
  // isMountedRef 가드 때문에 saveFailed가 갱신되지 않고 재시도 UI도 뜨지 않은 채
  // 입력 내용이 조용히 사라졌다. 이제 flush()가 반환하는 성공 여부를 기다려, 실패
  // 시에는 화면을 닫지 않고 이미 렌더된 ReflectionPrompts의 저장 실패/재시도 UI를
  // 사용자가 보게 둔다(대기 중인 변경이 없으면 flush()는 즉시 true를 반환하므로,
  // 아무것도 입력하지 않고 닫는 흔한 경우는 체감 지연이 없다).
  const handleClose = useCallback(() => {
    draft.flush().then((ok) => {
      if (ok && isMountedRef.current) {
        router.back();
      }
    });
  }, [draft]);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg }]}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
    >
      <Pressable
        onPress={handleClose}
        accessibilityRole="button"
        accessibilityLabel={REFLECTION_COPY.closeLabel}
        hitSlop={SMALL_ICON_HIT_SLOP}
        style={styles.closeButton}
      >
        <SymbolView name="xmark" tintColor={colors.textPrimary} />
      </Pressable>

      <MapView
        style={styles.map}
        region={region}
        scrollEnabled={false}
        zoomEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
        pointerEvents="none"
      >
        {trajectoryCoordinates.length >= 2 && (
          <Polyline
            coordinates={trajectoryCoordinates}
            strokeColor={colors.pinSoft}
            strokeWidth={TRAJECTORY_STROKE_WIDTH}
          />
        )}
        {checkins.map((checkin) => (
          <Marker
            key={checkin.id}
            coordinate={{ latitude: checkin.lat, longitude: checkin.lng }}
            anchor={{ x: 0.5, y: 1 }}
          >
            <View style={styles.pinWrapper}>
              <View style={styles.pinDrop} />
            </View>
          </Marker>
        ))}
      </MapView>

      <Text style={[typography.helperText, styles.sectionHeader]}>
        {REFLECTION_COPY.sectionTitle}
      </Text>

      {checkins.length === 0 ? (
        <Text style={[typography.helperText, styles.emptyState]}>
          {REFLECTION_COPY.emptyState}
        </Text>
      ) : (
        checkins.map((checkin) => <ReflectionCheckinRow key={checkin.id} checkin={checkin} />)
      )}

      <View style={styles.promptsContainer}>
        <ReflectionPrompts
          newPlaceAnswer={draft.newPlaceAnswer}
          freeReflection={draft.freeReflection}
          onChangeNewPlaceAnswer={draft.onChangeNewPlaceAnswer}
          onChangeFreeReflection={draft.onChangeFreeReflection}
          saveFailed={draft.saveFailed}
          onRetry={draft.onRetry}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
  },
  closeButton: {
    alignSelf: 'flex-start',
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  map: {
    width: '100%',
    height: MAP_BLOCK_HEIGHT,
    borderRadius: radius.md,
    marginTop: spacing.lg,
  },
  // 저장된 체크인 핀 — PastDateScreen.tsx의 pinWrapper/pinDrop을 그대로 복제한다
  // (값을 재도출하지 않는다).
  pinWrapper: {
    width: 28,
    height: 34,
    alignItems: 'center',
  },
  pinDrop: {
    width: 28,
    height: 28,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    borderBottomRightRadius: 14,
    borderBottomLeftRadius: 0,
    transform: [{ rotate: '-45deg' }],
    backgroundColor: colors.pinSoft,
  },
  sectionHeader: {
    color: colors.textMuted,
    marginTop: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  rowTime: {
    color: colors.textPrimary,
    marginRight: spacing.xs,
  },
  notePreview: {
    flex: 1,
    color: colors.textPrimary,
  },
  thumbnail: {
    width: REFLECTION_THUMBNAIL_SIZE,
    height: REFLECTION_THUMBNAIL_SIZE,
    borderRadius: radius.md,
    marginLeft: spacing['2xs'],
  },
  emptyState: {
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  // 리스트 아래 프롬프트 블록 위 간격 — 07-UI-SPEC.md §Component Contracts 2.
  promptsContainer: {
    marginTop: spacing.lg,
  },
});
