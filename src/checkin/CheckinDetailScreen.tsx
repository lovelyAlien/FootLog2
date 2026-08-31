// src/checkin/CheckinDetailScreen.tsx
// 05-03-PLAN.md Task 2 — 체크인 상세화면 본체(표시 계층).
//
// 이 화면이 src/app/의 라우트 파일이 아니라 src/checkin/ 아래에 있는 이유: Phase 6
// (캘린더 과거 날짜 뷰)이 (tabs)/calendar/...라는 다른 탭의 다른 nested stack에서
// 진입하므로 같은 라우트 파일을 그대로 push할 수 없고, 반드시 별도 라우트 파일에서
// 같은 화면 컴포넌트를 import해야 한다 — 화면 본체가 라우트 파일 안에 있으면 Phase 6이
// 전체를 복제하게 된다(05-RESEARCH.md §Recommended Project Structure).
//
// 재사용 가능한 프레젠테이셔널 컴포넌트 계약(CheckinActionCard.tsx와 동일): 배치
// (position: 'absolute' 등)는 항상 부모(라우트 파일 → Stack.Screen)가 결정한다 — 이
// 컴포넌트 내부에서는 절대 위치를 쓰지 않는다.
//
// 이 plan(05-03)은 표시 계층(시각 → 정적 지도 미리보기 → 사진, 고정 순서)까지만
// 책임진다. 메모 입력·저장·미저장 경고·AppState background flush·"지도 앱에서 열기"
// 딥링크는 05-04-PLAN.md가, 사진 교체/삭제 인터랙션은 05-06-PLAN.md가 이 파일에
// 이어서 추가한다 — 지금은 그 슬롯에 동작 없는 껍데기도 렌더하지 않는다.
//
// D-05: 이 화면에 체크인 전체 삭제 진입점을 두지 않는다 — 삭제는 오늘 뷰 리스트
// 스와이프로만 제공되며(05-05-PLAN.md), 상세화면은 편집 전용 공간으로 유지한다.
import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { formatLocalTime, formatLocalMonthDay } from './localDate';
import { CHECKIN_COPY } from './checkinFlow';
import { MAP_REGION_DELTA } from './config';
import MapView, { Marker } from 'react-native-maps';
import { useNavigation } from 'expo-router';
import { getCheckinById } from './checkinRepo';
import { colors, radius, spacing, typography } from '../theme/tokens';
import type { MigratableDb } from '../db/migrations';
import type { CheckinRow } from '../db/schema';

export type CheckinDetailScreenProps = {
  db: MigratableDb;
  checkinId: string;
};

// typography.timestamp.fontVariant readonly 튜플 브리징 — src/today/CheckinListRow.tsx의
// 얕은 복사 관용구를 그대로 복제한다(`as` 캐스트로 우회하지 않는다).
const timestampStyle = {
  ...typography.timestamp,
  fontVariant: [...typography.timestamp.fontVariant],
};

export function CheckinDetailScreen({ db, checkinId }: CheckinDetailScreenProps) {
  const navigation = useNavigation();
  const [checkin, setCheckin] = useState<CheckinRow | null>(null);
  // 언마운트 후 setState를 막는 가드 — (tabs)/index/index.tsx의 handlePickPhoto가
  // 이미 쓰는 관용구와 동일.
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    getCheckinById(db, checkinId).then((row) => {
      if (!isMountedRef.current) return;
      setCheckin(row);
    });
  }, [db, checkinId]);

  useEffect(() => {
    if (!checkin) return;
    navigation.setOptions({ title: formatLocalMonthDay(checkin.timestamp_utc) });
  }, [checkin, navigation]);

  // 로드 전(state 초기값) + 존재하지 않는 id(getCheckinById가 null 반환) 둘 다 같은
  // 빈 렌더로 처리한다 — 이 화면은 "이미 존재하는 체크인 1건"에 대한 화면이라 빈
  // 상태 개념이 없다(05-UI-SPEC.md §Copywriting Contract "Empty state: 해당 없음").
  if (!checkin) return null;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={[timestampStyle, styles.time]}>{formatLocalTime(checkin.timestamp_utc)}</Text>

      {/* 정적 지도 미리보기 — 스크롤/줌/회전/틸트/탭 모두 비활성. 터치 이벤트 자체를
          완전히 무시하는 속성까지 더해 개별 제스처 플래그를 다 잠가도 남을 수 있는
          제스처 인식을 원천 차단한다(05-UI-SPEC.md §정적 지도 미리보기, 05-RESEARCH.md
          Pattern 2). */}
      <MapView
        style={styles.map}
        region={{
          latitude: checkin.lat,
          longitude: checkin.lng,
          latitudeDelta: MAP_REGION_DELTA,
          longitudeDelta: MAP_REGION_DELTA,
        }}
        scrollEnabled={false}
        zoomEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
        pointerEvents="none"
      >
        {/* 마커 색은 반드시 "저장된 핀" 토큰(pinSaved 스타일)이어야 한다 — 이 화면이
            보여주는 체크인은 항상 이미 저장이 끝난 과거 기록이라 오늘 뷰의 "저장된 핀"
            규칙과 같아야 한다("진행 중 확인 핀" 토큰은 이 화면에 등장하지 않는다).
            teardrop 기하는 (tabs)/index/index.tsx의 pinWrapper/pinDrop/pinSaved를
            그대로 복제한다(재도출하지 않는다). */}
        <Marker
          coordinate={{ latitude: checkin.lat, longitude: checkin.lng }}
          anchor={{ x: 0.5, y: 1 }}
        >
          <View style={styles.pinWrapper}>
            <View style={[styles.pinDrop, styles.pinSaved]} />
          </View>
        </Marker>
      </MapView>

      {/* "지도 앱에서 열기" 버튼과 메모 TextInput은 05-04-PLAN.md가 이 지점(지도와
          사진 사이) 그리고 사진 아래 슬롯에 추가한다 — 이 plan은 표시 전용 상단 3요소
          (시각/지도/사진)만 책임지므로 동작 없는 껍데기 버튼을 미리 렌더하지 않는다. */}

      {checkin.photo_path ? (
        <Image source={{ uri: checkin.photo_path }} style={styles.photo} contentFit="contain" />
      ) : (
        <View style={styles.photoEmpty}>
          <SymbolView name="camera" tintColor={colors.textMuted} />
          <Text style={[typography.helperText, styles.photoEmptyLabel]}>
            {CHECKIN_COPY.photoPlaceholderLabel}
          </Text>
        </View>
      )}
      {/* 사진 교체/제거 인터랙션(D-03/D-04, 기존 첨부를 없애는 가벼운 편집 액션)은
          05-06-PLAN.md가 추가한다 — 여기서는 표시 전용이라 Pressable로 감싸지 않는다
          (중복 구현 방지 주석). */}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  time: {
    color: colors.textPrimary,
  },
  map: {
    width: '100%',
    height: 160,
    borderRadius: radius.md,
    marginTop: spacing.lg,
  },
  // teardrop 핀 기하 — (tabs)/index/index.tsx:1186-1207의 pinWrapper/pinDrop/pinSaved
  // 스타일을 그대로 복제한 것(값을 재도출하지 않는다).
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
  },
  pinSaved: {
    backgroundColor: colors.pinSoft,
  },
  photo: {
    width: '100%',
    height: 240,
    borderRadius: radius.md,
    marginTop: spacing.lg,
  },
  photoEmpty: {
    height: 160,
    marginTop: spacing.lg,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoEmptyLabel: {
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
});
