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
