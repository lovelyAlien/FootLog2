// src/app/dev-login.tsx
// 10-07-PLAN.md Task 1 — 개발자 전용 카카오 로그인 검증 화면.
//
// D-16(스코프 경계): 이 화면은 Phase 10 백엔드 검증용으로만 존재하며 1단계(Phase 1~8)
// 앱 UI에는 통합하지 않는다. footlog://dev-login 딥링크로만 도달하고, (tabs)/settings
// 어디에도 진입점을 두지 않는다(dev-login-wiring.test.ts Test 6/7이 이 경계를 고정한다).
// DESIGN.md를 따를 의무가 없다(UI-SPEC.md 없음, 기능 정확성 우선) — 다만 저장소 전역
// 규약(hex 리터럴 금지, foundation-wiring.test.ts Test 5)은 그대로 지킨다. 색상/간격/
// 타이포는 전부 @/theme/tokens에서 가져온다.
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { signInWithKakao } from '../auth/kakaoLogin';
import { clearTokens, loadTokens } from '../auth/tokenStore';
import { defaultSecureStoreDeps } from '../auth/deps';
import { AuthError } from '../auth/config';
import type { AuthTokens } from '../auth/config';
import { DEV_LOGIN_COPY } from '../auth/devLoginContent';
import { colors, radius, spacing, typography } from '../theme/tokens';

type ScreenState = 'checking' | 'signed-out' | 'signing-in' | 'signed-in' | 'error';
type ErrorKind = 'network' | 'rejected' | 'no-session';

// 전체 토큰을 화면에 렌더하지 않는다(어깨너머/스크린샷 유출, T-10-34) — 앞 8자 + '...'
// 형태로만 보여준다.
function maskToken(token: string): string {
  return `${token.slice(0, 8)}...`;
}

function formatExpiry(expiresAtMs: number): string {
  return new Date(expiresAtMs).toLocaleString();
}

export default function DevLoginScreen() {
  const [state, setState] = useState<ScreenState>('checking');
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [errorKind, setErrorKind] = useState<ErrorKind>('rejected');

  // 마운트 시 기존 세션을 복원한다 — "앱 재실행 후에도 세션 유지"의 관측 지점.
  useEffect(() => {
    let isMounted = true;
    loadTokens(defaultSecureStoreDeps)
      .then((loaded) => {
        if (!isMounted) return;
        if (loaded) {
          setTokens(loaded);
          setState('signed-in');
        } else {
          setState('signed-out');
        }
      })
      .catch((error) => {
        // 프로미스를 조용히 삼키지 않는다(저장소 규약) — 복원 실패 시 로그인되지 않은
        // 상태로 안전하게 폴백한다.
        console.error('[dev-login] failed to restore session', error);
        if (!isMounted) return;
        setState('signed-out');
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogin = useCallback(() => {
    setState('signing-in');
    signInWithKakao()
      .then((newTokens) => {
        setTokens(newTokens);
        setState('signed-in');
      })
      .catch((error) => {
        const kind: ErrorKind = error instanceof AuthError ? error.kind : 'rejected';
        setErrorKind(kind);
        setState('error');
      });
  }, []);

  // 재검증을 반복하기 위한 개발자 도구 — 서버측 로그아웃이 아니다(로그아웃/연결끊기는
  // 이 phase 스코프 밖, 10-CONTEXT.md Phase Boundary).
  const handleClearSession = useCallback(() => {
    clearTokens(defaultSecureStoreDeps)
      .then(() => {
        setTokens(null);
        setState('signed-out');
      })
      .catch((error) => {
        console.error('[dev-login] failed to clear session', error);
      });
  }, []);

  const errorMessage = (() => {
    if (errorKind === 'network') return DEV_LOGIN_COPY.errorNetwork;
    if (errorKind === 'no-session') return DEV_LOGIN_COPY.errorNoSession;
    return DEV_LOGIN_COPY.errorRejected;
  })();

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>{DEV_LOGIN_COPY.screenTitle}</Text>

      {state === 'checking' ? <ActivityIndicator color={colors.textPrimary} /> : null}

      {state === 'signed-out' || state === 'signing-in' ? (
        <View style={styles.section}>
          <Pressable
            style={styles.button}
            onPress={handleLogin}
            disabled={state === 'signing-in'}
            accessibilityRole="button"
            accessibilityLabel={DEV_LOGIN_COPY.kakaoLoginButton}
          >
            <Text style={styles.buttonLabel}>{DEV_LOGIN_COPY.kakaoLoginButton}</Text>
          </Pressable>
          {state === 'signing-in' ? (
            <View style={styles.statusRow}>
              <ActivityIndicator color={colors.textPrimary} />
              <Text style={styles.statusText}>{DEV_LOGIN_COPY.signingInStatus}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {state === 'signed-in' && tokens ? (
        <View style={styles.section}>
          <Text style={styles.statusText}>{DEV_LOGIN_COPY.signedInStatus}</Text>
          <Text style={styles.detailText}>{maskToken(tokens.accessToken)}</Text>
          <Text style={styles.detailText}>{maskToken(tokens.refreshToken)}</Text>
          <Text style={styles.detailText}>{formatExpiry(tokens.accessTokenExpiresAtMs)}</Text>
          <Pressable
            style={styles.button}
            onPress={handleClearSession}
            accessibilityRole="button"
            accessibilityLabel={DEV_LOGIN_COPY.clearSessionButton}
          >
            <Text style={styles.buttonLabel}>{DEV_LOGIN_COPY.clearSessionButton}</Text>
          </Pressable>
        </View>
      ) : null}

      {state === 'error' ? (
        <View style={styles.section}>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <Pressable
            style={styles.button}
            onPress={handleLogin}
            accessibilityRole="button"
            accessibilityLabel={DEV_LOGIN_COPY.retryButton}
          >
            <Text style={styles.buttonLabel}>{DEV_LOGIN_COPY.retryButton}</Text>
          </Pressable>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.md,
    gap: spacing.md,
  },
  title: {
    ...typography.screenTitle,
    color: colors.textPrimary,
  },
  section: {
    gap: spacing.sm,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statusText: {
    ...typography.placeName,
    color: colors.textPrimary,
  },
  detailText: {
    ...typography.helperText,
    color: colors.textMuted,
  },
  errorText: {
    ...typography.helperText,
    color: colors.textMuted,
  },
  button: {
    backgroundColor: colors.surfaceSoft,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  buttonLabel: {
    ...typography.placeName,
    color: colors.textPrimary,
  },
});
