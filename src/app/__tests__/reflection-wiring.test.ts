/**
 * @jest-environment node
 */
// src/app/__tests__/reflection-wiring.test.ts
// 07-04-PLAN.md Task 3 — 회고 공유 조각(ReflectionPrompts.tsx / useReflectionDraft.ts /
// content.ts / autosaveController.ts) 계약 회귀 가드. settings-wiring.test.ts와 동일
// 기법(정적 소스 분석, fs.readFileSync + stripComments)을 그대로 재사용한다. content.ts는
// 런타임 import가 없는 순수 상수 모듈이라 직접 import해 값 자체를 단언한다.
//
// 07-05가 ReflectionModal 단언을, 07-07이 라우트/레이아웃 단언을 이 파일에 이어 붙인다
// (06-04가 06-06을 위해 남긴 관용구와 동일).
import fs from 'fs';
import path from 'path';
import { stripComments } from '../../test-utils/stripComments';
import { REFLECTION_COPY } from '../../reflection/content';
import { TODAY_COPY } from '../../today/content';

const REFLECTION_DIR = path.join(__dirname, '..', '..', 'reflection');

function readReflectionSource(fileName: string): string {
  return fs.readFileSync(path.join(REFLECTION_DIR, fileName), 'utf-8');
}

const contentSource = readReflectionSource('content.ts');
const promptsSource = readReflectionSource('ReflectionPrompts.tsx');
const promptsCodeOnly = stripComments(promptsSource);
const draftSource = readReflectionSource('useReflectionDraft.ts');
const draftCodeOnly = stripComments(draftSource);
const autosaveSource = readReflectionSource('autosaveController.ts');
const autosaveCodeOnly = stripComments(autosaveSource);

describe('REFLECTION_COPY 문구 단일 출처 계약 (07-UI-SPEC.md §Copywriting Contract)', () => {
  it('Test 1: content.ts가 REFLECTION_COPY를 as const로 export한다', () => {
    expect(contentSource).toMatch(/export const REFLECTION_COPY = \{/);
    expect(contentSource).toMatch(/\}\s*as const;/);
  });

  it('Test 2: REFLECTION_COPY 8개 키의 값이 07-UI-SPEC.md §Copywriting Contract와 정확히 일치한다', () => {
    expect(REFLECTION_COPY.promptNewPlace).toBe('새로 가본 곳이 있었나요?');
    expect(REFLECTION_COPY.promptFreeReflection).toBe('오늘에 대해');
    expect(REFLECTION_COPY.sectionTitle).toBe('오늘의 흔적');
    expect(REFLECTION_COPY.emptyState).toBe('아직 기록이 없어요');
    expect(REFLECTION_COPY.saveFailed).toBe('저장하지 못했어요');
    expect(REFLECTION_COPY.retryCta).toBe('다시 시도');
    expect(REFLECTION_COPY.closeLabel).toBe('닫기');
    expect(REFLECTION_COPY.todayEntryRow).toBe('오늘 돌아보기');
  });
});

describe('empty state 의도적 차별화 게이트 (06-UI-SPEC.md 과거 날짜 뷰 원칙과 동일)', () => {
  it('Test 3: REFLECTION_COPY.emptyState가 TODAY_COPY.emptyState와 다르다', () => {
    expect(REFLECTION_COPY.emptyState).not.toBe(TODAY_COPY.emptyState);
  });
});

describe('ReflectionPrompts.tsx 프레젠테이셔널 계약 (색상/문구/placeholder)', () => {
  it('Test 4: colors.accent가 등장하지 않는다(이 phase의 accent 예산은 0)', () => {
    expect(promptsCodeOnly).not.toMatch(/colors\.accent/);
  });

  it('Test 5: 한글 문자열 리터럴이 등장하지 않는다(전부 REFLECTION_COPY 경유)', () => {
    expect(promptsCodeOnly).not.toMatch(/[가-힣]/);
  });

  it('Test 6: placeholder=""가 정확히 2회 등장한다(두 입력칸 모두)', () => {
    const matches = promptsCodeOnly.match(/placeholder=""/g) ?? [];
    expect(matches).toHaveLength(2);
  });
});

describe('ReflectionPrompts.tsx 프레젠테이셔널 경계 계약 (db/router/AppState 미사용)', () => {
  it('Test 7: MigratableDb/useSQLiteContext/AppState가 등장하지 않는다', () => {
    expect(promptsCodeOnly).not.toMatch(/MigratableDb/);
    expect(promptsCodeOnly).not.toMatch(/useSQLiteContext/);
    expect(promptsCodeOnly).not.toMatch(/AppState/);
  });
});

describe('useReflectionDraft.ts AppState 백그라운드 flush 계약 (T-07-12)', () => {
  it('Test 8: nextAppState === \'active\' 가드가 존재한다(포그라운드 복귀 시 불필요한 쓰기 방지)', () => {
    expect(draftCodeOnly).toMatch(/nextAppState === 'active'/);
  });
});

describe('이중 재시도 래핑 금지 계약 (D-01 — 1회 자동 재시도)', () => {
  it('Test 9: useReflectionDraft.ts에 runWithSingleRetry가 등장하지 않는다', () => {
    expect(draftCodeOnly).not.toMatch(/runWithSingleRetry/);
  });
});

describe('SQL 격리 계약 (저장소 규약 — SQL은 repo 파일에만 존재)', () => {
  it('Test 10: useReflectionDraft.ts에 SQL 키워드가 등장하지 않는다', () => {
    expect(draftCodeOnly).not.toMatch(/INSERT |SELECT |UPDATE |DELETE /);
  });
});

describe('디바운스 상수 단일 출처 계약 (autosaveController.ts만 5000을 안다)', () => {
  it('Test 11: useReflectionDraft.ts에 숫자 리터럴 5000이 등장하지 않는다', () => {
    expect(draftCodeOnly).not.toMatch(/5000/);
  });
});

describe('autosaveController.ts 의미 역전 게이트 (pendingDelete와 반대 — 취소 불가능한 지연 저장)', () => {
  it('Test 12: autosaveController.ts에 undo가 등장하지 않는다', () => {
    expect(autosaveCodeOnly).not.toMatch(/undo/);
  });
});

// 07-05-PLAN.md Task 3 — ReflectionModal.tsx 배선 회귀 가드. 위 Test 1~12(07-04)는
// 수정하지 않고 이 블록만 append한다.
const modalSource = readReflectionSource('ReflectionModal.tsx');
const modalCodeOnly = stripComments(modalSource);

describe('ReflectionModal.tsx 단일 쿼리 계약 (T-07-13)', () => {
  it('Test 13: getTodayCheckins(가 정확히 1회 등장한다', () => {
    const matches = modalCodeOnly.match(/getTodayCheckins\(/g) ?? [];
    expect(matches).toHaveLength(1);
  });

  it('Test 14: SQL 키워드가 등장하지 않는다', () => {
    expect(modalCodeOnly).not.toMatch(/INSERT |SELECT |UPDATE |DELETE /);
  });
});

describe('ReflectionModal.tsx 탭바 미조작 계약 (모달은 탭바를 조작하지 않는다)', () => {
  it('Test 15: tabBarStyle이 등장하지 않는다', () => {
    expect(modalCodeOnly).not.toMatch(/tabBarStyle/);
  });
});

describe('ReflectionModal.tsx 색상/재사용 경계 계약', () => {
  it('Test 16: colors.accent가 등장하지 않는다', () => {
    expect(modalCodeOnly).not.toMatch(/colors\.accent/);
  });

  it('Test 17: 기존 리스트 행 컴포넌트를 재사용하지 않는다(신규 read-only 행 사용)', () => {
    expect(modalCodeOnly).not.toMatch(/CheckinListRow/);
  });
});

describe('ReflectionModal.tsx 정적 지도 잠금 계약 (T-07-15)', () => {
  it('Test 18: 지도 잠금 4종 prop이 모두 등장한다', () => {
    expect(modalCodeOnly).toMatch(/scrollEnabled=\{false\}/);
    expect(modalCodeOnly).toMatch(/zoomEnabled=\{false\}/);
    expect(modalCodeOnly).toMatch(/rotateEnabled=\{false\}/);
    expect(modalCodeOnly).toMatch(/pitchEnabled=\{false\}/);
  });
});

describe('ReflectionModal.tsx 공유 조각 소비 계약 (07-04 산출물만 소비, 재구현 없음)', () => {
  it('Test 19: useReflectionDraft(가 정확히 1회 등장한다', () => {
    const matches = modalCodeOnly.match(/useReflectionDraft\(/g) ?? [];
    expect(matches).toHaveLength(1);
  });

  it('Test 20: <ReflectionPrompts가 정확히 1회 등장한다', () => {
    const matches = modalCodeOnly.match(/<ReflectionPrompts/g) ?? [];
    expect(matches).toHaveLength(1);
  });

  it('Test 21: TextInput이 등장하지 않는다(프롬프트 입력칸을 재구현하지 않았다)', () => {
    expect(modalCodeOnly).not.toMatch(/TextInput/);
  });
});

describe('ReflectionModal.tsx 자동저장 모델 게이트 (상세화면의 명시적 flush 모델 혼입 금지)', () => {
  it('Test 22: beforeRemove가 등장하지 않는다', () => {
    expect(modalCodeOnly).not.toMatch(/beforeRemove/);
  });

  it('Test 23: Alert가 등장하지 않는다', () => {
    expect(modalCodeOnly).not.toMatch(/Alert/);
  });
});

describe('ReflectionModal.tsx 닫기 시 강제 저장 순서 계약 (T-07-12)', () => {
  it('Test 24: handleClose 안에서 draft.flush()가 router.back()보다 먼저 나온다', () => {
    const handleCloseMatch = modalCodeOnly.match(
      /const handleClose = useCallback\(\(\) => \{([\s\S]*?)\}, \[draft\]\);/
    );
    expect(handleCloseMatch).not.toBeNull();
    const body = handleCloseMatch ? handleCloseMatch[1] : '';
    const flushIndex = body.indexOf('draft.flush()');
    const backIndex = body.indexOf('router.back()');
    expect(flushIndex).toBeGreaterThanOrEqual(0);
    expect(backIndex).toBeGreaterThan(flushIndex);
  });
});

describe('ReflectionModal.tsx 문구 단일 출처 계약', () => {
  it('Test 25: 한글 문자열 리터럴이 등장하지 않는다(전부 REFLECTION_COPY 경유)', () => {
    expect(modalCodeOnly).not.toMatch(/[가-힣]/);
  });
});

describe('ReflectionModal.tsx 진행률 수치 노출 금지 게이트 (T-07-14)', () => {
  it('Test 26: 섹션 헤더 근처에 개수 보간이 없다', () => {
    const sectionHeaderBlock = modalCodeOnly.match(
      /<Text style=\{\[typography\.helperText, styles\.sectionHeader\]\}>[\s\S]*?<\/Text>/
    );
    expect(sectionHeaderBlock).not.toBeNull();
    const blockText = sectionHeaderBlock ? sectionHeaderBlock[0] : '';
    expect(blockText).not.toMatch(/\{checkins\.length\}/);
    expect(blockText).not.toMatch(/\$\{/);
  });
});

// 07-08-PLAN.md Task 3 — 라우트/딥링크 배선 회귀 가드. 위 Test 1~26(07-04/07-05)은
// 수정하지 않고 이 블록만 append한다.
const APP_DIR = path.join(__dirname, '..');
const NOTIFICATIONS_DIR = path.join(__dirname, '..', '..', 'notifications');

function readAppSource(fileName: string): string {
  return fs.readFileSync(path.join(APP_DIR, fileName), 'utf-8');
}

function readNotificationsSource(fileName: string): string {
  return fs.readFileSync(path.join(NOTIFICATIONS_DIR, fileName), 'utf-8');
}

const reflectionRouteSource = readAppSource('reflection.tsx');
const reflectionRouteCodeOnly = stripComments(reflectionRouteSource);
const rootLayoutSource = readAppSource('_layout.tsx');
const rootLayoutCodeOnly = stripComments(rootLayoutSource);
const notificationContentSource = readNotificationsSource('content.ts');

describe('reflection.tsx 얇은 래퍼 계약 (07-08-PLAN.md Task 1)', () => {
  it('Test 27: StyleSheet/useState가 등장하지 않는다', () => {
    expect(reflectionRouteCodeOnly).not.toMatch(/StyleSheet|useState/);
  });

  it('Test 28: useSQLiteContext를 참조한다', () => {
    expect(reflectionRouteCodeOnly).toMatch(/useSQLiteContext/);
  });
});

describe('_layout.tsx 모달 스크린 등록 계약 (07-08-PLAN.md Task 1)', () => {
  it('Test 29: <Stack.Screen name="reflection" ... presentation: \'modal\' ...>가 같은 요소 안에 함께 등장한다', () => {
    expect(rootLayoutCodeOnly).toMatch(
      /<Stack\.Screen[\s\S]*?name="reflection"[\s\S]*?presentation:\s*'modal'[\s\S]*?\/>/
    );
  });
});

describe('_layout.tsx 알림 탭 딥링크 게이트 계약 (07-08-PLAN.md Task 2)', () => {
  it('Test 30: useLastNotificationResponse를 참조한다', () => {
    expect(rootLayoutCodeOnly).toMatch(/useLastNotificationResponse/);
  });

  it('Test 31: router.push(\'/reflection\')이 정확히 1회 등장하고 상대 경로 표기는 등장하지 않는다(절대 경로 게이트)', () => {
    const absoluteMatches = rootLayoutCodeOnly.match(/router\.push\('\/reflection'\)/g) ?? [];
    expect(absoluteMatches).toHaveLength(1);
    expect(rootLayoutCodeOnly).not.toMatch(/'\.\/reflection'/);
  });

  it('Test 32: addNotificationResponseReceivedListener가 등장하지 않는다(중복 처리 경로 금지)', () => {
    expect(rootLayoutCodeOnly).not.toMatch(/addNotificationResponseReceivedListener/);
  });

  it('Test 33: AppState.addEventListener가 등장하지 않는다(리스너 1개 계약 재확인)', () => {
    expect(rootLayoutCodeOnly).not.toMatch(/AppState\.addEventListener/);
  });

  it('Test 34: tabBarStyle이 등장하지 않는다', () => {
    expect(rootLayoutCodeOnly).not.toMatch(/tabBarStyle/);
  });

  it('Test 35: DAILY_REFLECTION_ID 식별자 비교가 존재한다(체크인 알림 탭에는 반응하지 않는다)', () => {
    expect(rootLayoutCodeOnly).toMatch(/identifier !== DAILY_REFLECTION_ID/);
  });

  it('Test 36: handledRef 중복 처리 가드가 존재한다', () => {
    const matches = rootLayoutCodeOnly.match(/handledRef/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(3);
  });
});

describe('알림 콘텐츠 반복 트리거 고정 함정 게이트 (07-RESEARCH.md Pitfall 2)', () => {
  it('Test 37: src/notifications/content.ts에 data: 필드가 등장하지 않는다', () => {
    expect(notificationContentSource).not.toMatch(/data:/);
  });
});

// 코드 리뷰 발견(PR #8) 회귀 가드 — recordIdRef가 로드 완료 전에는 빈 문자열이거나
// 이전 날짜의 id를 그대로 들고 있어, 로드가 끝나기 전에 입력하면 PRIMARY KEY 충돌로
// 저장이 조용히 실패했다. dateKey마다 즉시 신선한 UUID로 리셋하도록 고쳤다.
describe('useReflectionDraft.ts recordIdRef 레이스 방지 계약 (코드 리뷰 발견 #1)', () => {
  it("Test 38: recordIdRef의 초기값이 빈 문자열이 아니라 defaultCryptoDeps.randomUUID()다", () => {
    expect(draftCodeOnly).toMatch(/useRef<string>\(defaultCryptoDeps\.randomUUID\(\)\)/);
    expect(draftCodeOnly).not.toMatch(/useRef<string>\(''\)/);
  });

  it('Test 39: dateKey에만 의존하는 useEffect가 recordIdRef.current를 리셋한다', () => {
    const resetEffectMatch = draftCodeOnly.match(
      /useEffect\(\(\) => \{\s*recordIdRef\.current = defaultCryptoDeps\.randomUUID\(\);\s*\}, \[dateKey\]\);/
    );
    expect(resetEffectMatch).not.toBeNull();
  });
});

// 코드 리뷰 발견(PR #8) 회귀 가드 — handleClose가 flush() 결과를 기다리지 않고 곧장
// router.back()을 불러, 닫기 직후 저장이 실패해도 화면이 이미 언마운트돼 재시도 UI가
// 뜨지 않고 입력 내용이 조용히 사라졌다. flush()의 성공 여부를 기다린 뒤에만 닫는다.
describe('ReflectionModal.tsx 닫기 시 저장 실패 보존 계약 (코드 리뷰 발견 #2)', () => {
  it('Test 40: handleClose가 router.back()을 draft.flush()의 성공 결과 안에서만 호출한다', () => {
    const handleCloseMatch = modalCodeOnly.match(
      /const handleClose = useCallback\(\(\) => \{([\s\S]*?)\}, \[draft\]\);/
    );
    expect(handleCloseMatch).not.toBeNull();
    const body = handleCloseMatch ? handleCloseMatch[1] : '';
    expect(body).toMatch(/draft\.flush\(\)\.then\(/);
    expect(body).toMatch(/if \(ok/);
    expect(body).toMatch(/router\.back\(\)/);
  });
});
