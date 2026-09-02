// src/settings/SettingsScreen.tsx
// 06-04-PLAN.md Task 2 — 설정 화면 본체(알림 빈도 / 하루 마무리 알림 / 버전, 정확히 3개
// 항목). 라우트 배선과 햄버거 진입점은 06-06 소관이므로 이 파일은 프레젠테이셔널
// 컴포넌트만 만든다(CheckinDetailScreen.tsx와 동일한 "화면 본체는 route 밖" 계약).
//
// 쓰기 경로는 persist() 하나뿐이다 — settingsRepo 모듈은 네임스페이스로 import해 SQLite
// 저장 함수 호출부가 이 파일에 단 한 곳만 등장하게 한다(06-04-PLAN.md acceptance
// criteria: "쓰기 경로가 하나뿐"). 취소-후-등록 델타 로직은 이 파일에 절대 재구현하지
// 않는다 — 알림 재구성은 기존 scheduling 모듈 함수를 그대로 호출할 뿐이다
// (src/notifications/scheduling.ts, 02-RESEARCH.md가 이미 고아 트리거 버그를 잡아둔 코드).
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActionSheetIOS, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { SymbolView } from 'expo-symbols';
import { useNavigation } from 'expo-router';
import * as settingsRepo from './settingsRepo';
import {
  FREQUENCY_ACTION_SHEET_CANCEL_INDEX,
  FREQUENCY_ACTION_SHEET_OPTIONS,
  FREQUENCY_BY_ACTION_SHEET_INDEX,
  FREQUENCY_LABEL_BY_VALUE,
  SETTINGS_COPY,
} from './content';
import { applyNotificationSettings } from '../notifications/scheduling';
import { defaultNotificationDeps } from '../notifications/deps';
import { PHASE2_NOTIFICATION_SETTINGS } from '../notifications/config';
import type { NotificationSettings } from '../notifications/config';
import { colors, spacing, typography } from '../theme/tokens';
import type { MigratableDb } from '../db/migrations';

// CheckinDetailScreen.tsx 54~57줄과 동일 관용구 — 시각 크기는 작게 유지하되 터치
// 영역은 44×44pt를 채운다. 커스텀 헤더 뒤로가기 버튼이 이 값을 공유한다.
const SMALL_ICON_HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };

export type SettingsScreenProps = {
  db: MigratableDb;
};

export function SettingsScreen({ db }: SettingsScreenProps) {
  const navigation = useNavigation();
  const [settings, setSettings] = useState<NotificationSettings>(PHASE2_NOTIFICATION_SETTINGS);
  const [saveFailed, setSaveFailed] = useState(false);
  // 마지막으로 시도한(그러나 실패한) 값을 기억해 "다시 시도" 버튼이 같은 값으로 재시도할
  // 수 있게 한다. 화면 표시용 settings state와는 별개다 — 실패 시 settings는 바뀌지
  // 않아야 하므로(저장되지 않은 값이 켜진 것처럼 보이면 안 됨) 재시도용 값을 ref로
  // 따로 보관한다.
  const lastAttemptRef = useRef<NotificationSettings | null>(null);
  // CheckinDetailScreen.tsx의 언마운트 후 setState 방지 가드와 동일 관용구.
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // row가 아직 없어도(마이그레이션 직후) 기본값(매시간 / 하루마무리 켜짐)이 즉시
  // 보이므로 별도 로딩 상태를 두지 않는다 — useState 초기값이 이미
  // PHASE2_NOTIFICATION_SETTINGS다.
  useEffect(() => {
    settingsRepo
      .getSettingsRow(db)
      .then((row) => {
        if (!isMountedRef.current) return;
        setSettings(settingsRepo.resolveNotificationSettings(row));
      })
      .catch((error) => {
        // 프로미스를 조용히 삼키지 않는다 — CheckinDetailScreen.tsx의 로드 실패
        // 핸들링과 동일 규약.
        console.error('Failed to load settings', error);
      });
  }, [db]);

  // 두 행(빈도 액션시트 / 하루 마무리 토글)이 공유하는 단 하나의 쓰기 함수.
  // 순서: (1) SQLite 업서트 → (2) 성공 시 기존 알림 재구성 함수 호출 → (3) 성공 시
  // 화면 state 반영. 어느 단계든 실패하면 saveFailed만 켜고 settings는 바꾸지 않는다.
  const persist = useCallback(
    async (next: NotificationSettings) => {
      lastAttemptRef.current = next;
      try {
        await settingsRepo.upsertSettings(db, next, new Date().toISOString());
        await applyNotificationSettings(next, defaultNotificationDeps);
        if (!isMountedRef.current) return;
        setSettings(next);
        setSaveFailed(false);
      } catch (error) {
        console.error('Failed to persist settings', error);
        if (!isMountedRef.current) return;
        setSaveFailed(true);
      }
    },
    [db]
  );

  const handleRetry = useCallback(() => {
    const lastAttempt = lastAttemptRef.current;
    if (lastAttempt) {
      persist(lastAttempt);
    }
  }, [persist]);

  // 인덱스 숫자를 화면에 직접 하드코딩하지 않는다 — content.ts가 소유한
  // FREQUENCY_BY_ACTION_SHEET_INDEX 매핑을 그대로 소비한다. 강조(경고) 버튼 스타일
  // 옵션은 절대 지정하지 않는다 — iOS가 빨간 텍스트로 렌더해 DESIGN.md의 시맨틱 색상
  // 금지 원칙을 깬다(CheckinDetailScreen.tsx의 Alert 버튼 스타일 주석과 동일 근거).
  const handleFrequencyPress = useCallback(() => {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: [...FREQUENCY_ACTION_SHEET_OPTIONS],
        cancelButtonIndex: FREQUENCY_ACTION_SHEET_CANCEL_INDEX,
      },
      (buttonIndex) => {
        const next = FREQUENCY_BY_ACTION_SHEET_INDEX[buttonIndex];
        if (!next) return;
        persist({ ...settings, checkinFrequency: next });
      }
    );
  }, [persist, settings]);

  const handleToggleDailyReflection = useCallback(
    (value: boolean) => {
      persist({ ...settings, dailyReflectionEnabled: value });
    },
    [persist, settings]
  );

  // CheckinDetailScreen.tsx 381~395줄과 동일한 커스텀 헤더 뒤로가기 패턴. 미저장
  // 경고 로직은 없다 — 이 화면은 변경 즉시 저장이라 이탈 시 잃을 상태가 없다.
  useEffect(() => {
    navigation.setOptions({
      title: SETTINGS_COPY.screenTitle,
      headerLeft: () => (
        <Pressable
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel={SETTINGS_COPY.backLabel}
          hitSlop={SMALL_ICON_HIT_SLOP}
        >
          <SymbolView name="chevron.left" tintColor={colors.textPrimary} />
        </Pressable>
      ),
    });
  }, [navigation]);

  return (
    <View style={styles.container}>
      <Text style={styles.sectionHeader}>{SETTINGS_COPY.sectionNotifications}</Text>
      <View style={styles.section}>
        <Pressable
          style={styles.row}
          onPress={handleFrequencyPress}
          accessibilityRole="button"
          accessibilityLabel={SETTINGS_COPY.rowFrequency}
        >
          <Text style={styles.rowLabel}>{SETTINGS_COPY.rowFrequency}</Text>
          <View style={styles.rowTrailing}>
            <Text style={styles.rowValue}>
              {FREQUENCY_LABEL_BY_VALUE[settings.checkinFrequency]}
            </Text>
            <SymbolView name="chevron.right" tintColor={colors.textMuted} />
          </View>
        </Pressable>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.rowLabel}>{SETTINGS_COPY.rowDailyReflection}</Text>
          {/* Phase 7의 회고 기능이 아직 없어도 이 토글은 지금 동작한다 — Phase 2가 이미
              daily_reflection 타입 스케줄링을 지원한다(D-02). trackColor/thumbColor에
              테마의 강조 톤(accent 예산 위반)을 지정하지 않는다 — iOS 기본 스위치 색을
              그대로 둔다. */}
          <Switch
            value={settings.dailyReflectionEnabled}
            onValueChange={handleToggleDailyReflection}
          />
        </View>
      </View>

      <Text style={styles.sectionHeader}>{SETTINGS_COPY.sectionInfo}</Text>
      <View style={styles.section}>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>{SETTINGS_COPY.rowVersion}</Text>
          {/* app.json의 expo.version이 단일 출처다 — 버전 문자열을 하드코딩하지 않는다.
              읽기 전용 행이라 Pressable로 감싸지 않고 chevron도 없다. */}
          <Text style={styles.rowValue}>{Constants.expoConfig?.version ?? ''}</Text>
        </View>
      </View>

      {saveFailed ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{SETTINGS_COPY.saveFailed}</Text>
          <Pressable onPress={handleRetry} accessibilityRole="button">
            <Text style={styles.retryText}>{SETTINGS_COPY.retryCta}</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: spacing.lg,
  },
  sectionHeader: {
    ...typography.helperText,
    color: colors.textMuted,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
  },
  section: {
    backgroundColor: colors.surface,
    marginBottom: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    paddingHorizontal: spacing.md,
  },
  rowTrailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  rowLabel: {
    ...typography.placeName,
    color: colors.textPrimary,
  },
  rowValue: {
    ...typography.placeName,
    fontWeight: '400',
    color: colors.textMuted,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.line,
    marginHorizontal: spacing.md,
  },
  errorContainer: {
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  errorText: {
    ...typography.helperText,
    color: colors.textMuted,
  },
  retryText: {
    ...typography.helperText,
    color: colors.textMuted,
    textDecorationLine: 'underline',
  },
});
