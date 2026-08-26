// src/app/index.tsx
// 부팅 확인용 임시 플레이스홀더 화면 — 제품 UI가 아니다.
// Phase 4(REQ-today-view)가 이 화면을 오늘 뷰로 완전히 대체한다.
//
// 목적: Foundation phase(Plan 01-02 디자인 토큰, 01-03 SQLite 마이그레이션)의 산출물이
// 실제 화면 계층에서 소비됨을 실기기에서 육안으로 확인할 수 있게 한다 — SF Pro / SF Mono
// (ui-monospace) / Newsreader 이탤릭 세리프 3계층 타이포와 DB 스키마 버전을 동시에 표시한다.
// 표시하는 유일한 숫자는 DB 스키마 버전(진단값)이며, 진행률/완료 수치가 아니다
// (PROJECT.md CRITICAL 원칙).
//
// 임시 배선(Plan 02-07): 알림 거부 배너를 이 화면 상단에 임시로 렌더링한다.
// 02-UI-SPEC.md가 확정한 대로, Phase 4가 오늘 뷰를 만들 때 배너를 지도 상단
// (탭바 위, 세이프에어리어 아래)으로 이관해야 하며, 그때 이 파일의 배너 렌더링은
// 제거된다. 권한이 아직 결정되지 않은 상태(undetermined)면 priming 화면으로
// 리다이렉트하는 게이트도 함께 배선한다.
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { Redirect } from 'expo-router';
import { colors, spacing, typography } from '../theme/tokens';
import { fetchNotificationPermission, shouldShowPriming } from '../notifications/permissions';
import type { PermissionSnapshot } from '../notifications/permissions';
import { NotificationDeniedBanner } from '../components/NotificationDeniedBanner';

export default function Index() {
  const db = useSQLiteContext();
  const [schemaVersion, setSchemaVersion] = useState<number | null>(null);
  const [permission, setPermission] = useState<PermissionSnapshot | null>(null);

  useEffect(() => {
    let isMounted = true;
    db.getFirstAsync<{ user_version: number }>('PRAGMA user_version')
      .then((row) => {
        if (isMounted) {
          setSchemaVersion(row?.user_version ?? null);
        }
      })
      .catch((error) => {
        // 진단 화면이라 UI를 별도 에러 상태로 분기하지 않지만, 쿼리 실패를 조용히
        // 삼키면 unhandled promise rejection이 되므로 최소한 로그는 남긴다.
        if (isMounted) {
          console.error('Failed to read PRAGMA user_version', error);
        }
      });
    return () => {
      isMounted = false;
    };
  }, [db]);

  // priming 리다이렉트 게이트 — 위 이펙트와 동일한 isMounted 가드 형태를 따른다.
  useEffect(() => {
    let isMounted = true;
    fetchNotificationPermission()
      .then((snapshot) => {
        if (isMounted) {
          setPermission(snapshot);
        }
      })
      .catch((error) => {
        if (isMounted) {
          console.error('Failed to fetch notification permission', error);
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // permission이 아직 null인 초기 프레임에는 아래 판정 함수가 false를 반환하므로
  // (Plan 04 Test 16) 화면이 깜빡이며 리다이렉트되지 않는다. router.replace()를
  // 이펙트 안에서 명령형으로 호출하지 않는다 — 마운트 타이밍에 따라 네비게이션
  // 준비 전 호출로 경고가 나며, 선언형 <Redirect>가 expo-router의 권장 형태다.
  if (shouldShowPriming(permission)) {
    return <Redirect href="/priming" />;
  }

  return (
    <View style={styles.screen}>
      <NotificationDeniedBanner />
      <View style={styles.content}>
        <Text style={[typography.screenTitle, styles.textPrimary]}>FootLog</Text>
        <Text style={[styles.timestampText, schemaVersion === null ? styles.textFaint : styles.textMuted]}>
          {schemaVersion === null ? '···' : `schema v${schemaVersion}`}
        </Text>
        {/* 예외(DESIGN.md 타이포그래피 규칙): 저널체(이탤릭 세리프)는 원래 "사용자가 직접
            쓴 텍스트"에만 쓰는 게 원칙이지만, 이 화면은 Foundation phase의 임시 부팅
            확인용 진단 화면(Phase 4에서 완전히 대체·삭제됨)이라 Newsreader 번들 폰트
            로딩 성공 여부를 육안으로 확인하기 위해 의도적으로 하드코딩된 예시 문장에
            적용했다. 실제 제품 화면에는 이 예외를 적용하지 않는다. */}
        <Text style={[typography.journalEntry, styles.textPrimary]}>
          오늘도 걸었던 길을 조용히 남겨둔다.
        </Text>
        <Text style={[typography.helperText, styles.textMuted]}>
          이 화면은 Foundation phase의 부팅 확인용 임시 화면입니다.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // 배너는 화면 상단 고정, 기존 부팅 확인 내용은 세로 중앙 — 컨테이너를 두 겹으로
  // 나눈다. 배경색은 바깥 screen으로 옮기고 안쪽 content에서는 중복 지정하지 않는다.
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
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
