// src/calendar/PastDateScreen.tsx
// 06-05-PLAN.md Task 2 — 과거 날짜 화면: 그날의 지도 핀 + 바텀시트 리스트를 읽기전용으로
// 보여준다. 새 조회 함수/새 시트 컴포넌트를 만들지 않고 Phase 4/5 산출물을 그대로
// 재사용하는 것이 이 파일의 핵심 제약이다(06-RESEARCH.md 명시 anti-pattern 회피).
//
// (tabs)/index/index.tsx(오늘 뷰)의 지도+시트 합성, 지연 삭제 배선, undo 스낵바
// 배선을 그대로 옮겨오되 두 가지가 다르다:
// 차이 1 — 체크인 버튼을 렌더하지 않는다(체크인 캡처 관련 컴포넌트/상태머신 미import).
// 차이 2 — 이 화면에서만 탭바를 숨긴다(06-RESEARCH.md Pitfall 1 — 탭바를 조작하는
// 파일은 이 저장소에서 이 파일 하나뿐이어야 한다).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useFocusEffect, useNavigation, router } from 'expo-router';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { useSharedValue } from 'react-native-reanimated';
import { colors, spacing } from '../theme/tokens';
import { TodayBottomSheet } from '../today/TodayBottomSheet';
import { UndoSnackbar } from '../today/UndoSnackbar';
import { buildTrajectoryCoordinates } from '../today/trajectory';
import { createPendingDeleteController } from '../today/pendingDelete';
import type { PendingDeleteItem } from '../today/pendingDelete';
import {
  deleteCheckin,
  getTodayCheckins,
  runWithSingleRetry,
} from '../checkin/checkinRepo';
import { defaultPhotoStorageDeps } from '../checkin/deps';
import { MAP_REGION_DELTA } from '../checkin/config';
import { formatDateKeyTitle } from './monthGrid';
import { CALENDAR_COPY } from './content';
import type { MigratableDb } from '../db/migrations';
import type { CheckinRow } from '../db/schema';

// 지도 위 저장된 체크인 핀 — (tabs)/index/index.tsx의 pinSaved 스타일과 동일한
// 물방울 모양(구글맵/애플맵 관례 차용, 새 색상 발명 없음).
const TRAJECTORY_STROKE_WIDTH = 2;

export type PastDateScreenProps = {
  db: MigratableDb;
  dateKey: string;
};

export function PastDateScreen({ db, dateKey }: PastDateScreenProps) {
  const navigation = useNavigation();
  const isMountedRef = useRef(true);
  const [checkins, setCheckins] = useState<CheckinRow[]>([]);
  const [containerHeight, setContainerHeight] = useState(0);
  // (tabs)/index/index.tsx의 05-05-PLAN.md 지연 삭제 관용구와 동일 — 대기 중인
  // 삭제 항목을 리스트/지도 핀/궤적선 세 곳에서 함께 숨긴다.
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // getTodayCheckins는 이름만 "Today"일 뿐 임의의 localDateKey를 받는다
  // (checkinRepo.ts 헤더 주석이 Phase 6 재사용을 명시) — 날짜별 조회용 새 함수를
  // 별도로 만들지 않는다.
  const reloadCheckins = useCallback(() => {
    getTodayCheckins(db, dateKey)
      .then((rows) => {
        if (isMountedRef.current) {
          setCheckins(rows);
        }
      })
      .catch((error) => {
        console.error('Failed to load past-date check-ins', error);
      });
  }, [db, dateKey]);

  useEffect(() => {
    reloadCheckins();
  }, [reloadCheckins]);

  // 상세화면에서 메모/사진을 편집하거나 삭제하고 뒤로가기로 돌아왔을 때 이 화면을
  // 갱신하는 경로 ((tabs)/index/index.tsx CR-01과 동일한 이유).
  useFocusEffect(
    useCallback(() => {
      reloadCheckins();
    }, [reloadCheckins])
  );

  const filteredCheckins = useMemo(
    () => checkins.filter((checkin) => !hiddenIds.has(checkin.id)),
    [checkins, hiddenIds]
  );

  // getTodayCheckins가 이미 timestamp_utc 오름차순으로 정렬해 반환하므로 여기서
  // 다시 정렬하지 않는다(D-11 단일 쿼리 계약).
  const trajectoryCoordinates = useMemo(
    () => buildTrajectoryCoordinates(filteredCheckins),
    [filteredCheckins]
  );

  // (tabs)/index/index.tsx commitPendingDelete와 동일한 순서: 단일 재시도 삭제 →
  // 성공 시 사진 파일 정리(non-blocking) + 목록 재조회, 실패 시 hiddenIds에서
  // 제거해 다음 reload에서 행이 자연스럽게 다시 나타나게 한다.
  const commitPendingDelete = useCallback(
    (item: PendingDeleteItem) => {
      const unhide = () => {
        setHiddenIds((prev) => {
          if (!prev.has(item.id)) return prev;
          const next = new Set(prev);
          next.delete(item.id);
          return next;
        });
      };
      runWithSingleRetry(() => deleteCheckin(db, item.id))
        .then((result) => {
          if (!result.ok) {
            console.error('Failed to commit swipe delete after retry', item.id);
            unhide();
            return;
          }
          if (item.photoPath) {
            defaultPhotoStorageDeps.deleteFile(item.photoPath).catch((error) => {
              console.error('Failed to delete photo file for swiped-away checkin', error);
            });
          }
          reloadCheckins();
          unhide();
        })
        .catch((error) => {
          console.error('Unexpected error while committing swipe delete', error);
          unhide();
        });
    },
    [db, reloadCheckins]
  );

  const commitPendingDeleteRef = useRef(commitPendingDelete);
  useEffect(() => {
    commitPendingDeleteRef.current = commitPendingDelete;
  }, [commitPendingDelete]);

  const pendingDeleteController = useState(() =>
    createPendingDeleteController({
      onCommit: (item) => commitPendingDeleteRef.current(item),
      onChange: (id) => setPendingId(id),
    })
  )[0];

  // 언마운트 시 대기 중인 삭제를 취소가 아니라 즉시 확정한다 — dispose()는 취소가
  // 아니라 확정이라는 pendingDelete.ts 계약(T-06-10, T-05-13 선례)을 그대로 따른다.
  // 사용자가 "실행취소"를 누르지 않은 채 화면을 떠났다는 이유로 삭제가 조용히
  // 취소되면, 다음 로드에서 지워졌어야 할 행이 부활한다.
  useEffect(() => {
    return () => {
      pendingDeleteController.dispose();
    };
  }, [pendingDeleteController]);

  const handleDeleteRequest = useCallback(
    (checkin: CheckinRow) => {
      setHiddenIds((prev) => new Set(prev).add(checkin.id));
      pendingDeleteController.request({ id: checkin.id, photoPath: checkin.photo_path });
    },
    [pendingDeleteController]
  );

  const handleUndoDelete = useCallback(() => {
    setHiddenIds((prev) => {
      if (pendingId === null || !prev.has(pendingId)) return prev;
      const next = new Set(prev);
      next.delete(pendingId);
      return next;
    });
    pendingDeleteController.undo();
  }, [pendingDeleteController, pendingId]);

  // 행 탭 → 캘린더 스택 전용 체크인 상세 라우트. pathname+params 객체 형태를 써
  // expo-router가 동적 세그먼트를 직접 인코딩하게 한다(T-06-09, T-05-15 선례).
  const handleRowPress = useCallback(
    (id: string) => {
      router.push({ pathname: '/calendar/[date]/[id]', params: { date: dateKey, id } });
    },
    [dateKey]
  );

  const handleContainerLayout = useCallback(
    (event: { nativeEvent: { layout: { height: number } } }) => {
      const nextHeight = event.nativeEvent.layout.height;
      setContainerHeight((prev) => (prev === nextHeight ? prev : nextHeight));
    },
    []
  );

  // 시트 상단 y좌표 — 이 화면에 체크인 버튼이 없어 floatingButtonStyle 같은
  // 소비자가 없지만, TodayBottomSheet가 요구하는 animatedPosition 계약을
  // 만족시키기 위해 이 화면이 소유한다(부모 소유 SharedValue 계약).
  const sheetPosition = useSharedValue(0);

  // 헤더 타이틀 — 데이터 로드와 무관하게 dateKey만으로 즉시 확정 가능하므로 별도
  // 로딩 분기 없이 마운트 시 1회 설정한다.
  useEffect(() => {
    navigation.setOptions({ title: formatDateKeyTitle(dateKey) });
  }, [navigation, dateKey]);

  // 06-RESEARCH.md Pitfall 1 — 탭바를 조작하는 파일은 이 저장소에서 이 파일
  // 하나뿐이어야 한다. useFocusEffect(useLayoutEffect가 아니라)를 쓰는 이유:
  // 이 화면 위로 체크인 상세화면이 push되면 blur가 발생해 탭바가 복원되므로,
  // "과거 날짜 뷰는 탭바 숨김 / 체크인 상세화면은 탭바 유지"라는
  // footlog-product-design.md 네비게이션 계약 두 줄을 이 한 훅으로 동시에
  // 만족한다 — 상세화면으로 push해 blur되면 cleanup이 돌아 탭바가 복원되고,
  // 뒤로 돌아와 focus를 다시 얻으면 effect가 재실행돼 다시 숨긴다.
  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({ tabBarStyle: { display: 'none' } });
      return () => {
        navigation.getParent()?.setOptions({ tabBarStyle: { display: 'flex' } });
      };
    }, [navigation])
  );

  const firstCheckin = checkins[0];
  const initialRegion = firstCheckin
    ? {
        latitude: firstCheckin.lat,
        longitude: firstCheckin.lng,
        latitudeDelta: MAP_REGION_DELTA,
        longitudeDelta: MAP_REGION_DELTA,
      }
    : undefined;

  return (
    <View style={styles.screen} onLayout={handleContainerLayout}>
      {/* 과거 날짜를 보는 화면이라 showsUserLocation을 켜지 않는다 — 현재 위치
          점은 이 화면의 맥락과 무관하다. */}
      <MapView style={StyleSheet.absoluteFill} initialRegion={initialRegion}>
        {trajectoryCoordinates.length >= 2 && (
          <Polyline
            coordinates={trajectoryCoordinates}
            strokeColor={colors.pinSoft}
            strokeWidth={TRAJECTORY_STROKE_WIDTH}
          />
        )}

        {filteredCheckins.map((checkin) => (
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

      {/* 체크인 버튼/재센터 버튼을 두지 않는다 — 이 화면은 읽기전용이다. 빈 상태
          문구는 시트 표면에만 렌더한다(지도 위에 절대 겹쳐 그리지 않는다 —
          대비 안전 규칙). */}
      <TodayBottomSheet
        checkins={filteredCheckins}
        containerHeight={containerHeight}
        animatedPosition={sheetPosition}
        onRowPress={handleRowPress}
        onDeleteRequest={handleDeleteRequest}
        emptyText={CALENDAR_COPY.pastDateEmptyState}
      />

      <View style={styles.undoSnackbarContainer} pointerEvents="box-none">
        <UndoSnackbar visible={pendingId !== null} onUndo={handleUndoDelete} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  // (tabs)/index/index.tsx의 undoSnackbarContainer와 동일한 배치(화면 하단, 탭바는
  // 이 View 바깥이라 이미 제외됨).
  undoSnackbarContainer: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
  },
  // 저장된 체크인 핀 — (tabs)/index/index.tsx의 pinWrapper/pinDrop/pinSaved와
  // 동일한 물방울 모양(구글맵/애플맵 관례 차용). 원본 location_source 구분은
  // 저장 이후 유지하지 않는다(04-UI-SPEC.md §저장된 체크인 핀).
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
});
