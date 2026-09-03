// src/reflection/content.ts
// 07-02-PLAN.md Task 1 — 회고 화면 문구 단일 출처.
// 여기서 문구를 발명하지 않는다(src/today/content.ts / src/settings/content.ts와 동일
// 규약): 값은 07-UI-SPEC.md §Copywriting Contract에서 그대로 전사한다.
//
// 이 파일은 런타임 import를 두지 않는다 — 순수 상수 모듈이다(src/settings/content.ts와
// 동일 규약). `@jest-environment node`에서 네이티브 모듈 로드 없이 안전하게 읽을 수 있다.
export const REFLECTION_COPY = {
  // 07-UI-SPEC.md §Copywriting Contract "프롬프트1 라벨" — 고정 프롬프트, 로테이션 없음.
  promptNewPlace: '새로 가본 곳이 있었나요?',
  // 07-UI-SPEC.md §Copywriting Contract "프롬프트2 라벨" — 질문형이 아닌 짧은 초대 문구.
  promptFreeReflection: '오늘에 대해',
  // 07-UI-SPEC.md §Copywriting Contract "'오늘의 흔적' 섹션 헤더" (REQ-reflection-copy-fix).
  sectionTitle: '오늘의 흔적',
  // 07-UI-SPEC.md §Copywriting Contract "리스트 empty state". TODAY_COPY.emptyState
  // ("아직 기록이 없어요 · 체크인하면 지도가 채워져요")와 의도적으로 다르다 — 이 화면은
  // 체크인 유도 CTA가 목적이 아니라 회고이므로 "체크인하면 채워져요" 꼬리를 재사용하지
  // 않는다(06-UI-SPEC.md 과거 날짜 뷰 empty state 차별화와 동일 원칙).
  emptyState: '아직 기록이 없어요',
  // 07-UI-SPEC.md §Copywriting Contract "저장 실패 인라인 문구". SETTINGS_COPY.saveFailed와
  // 동일 문구를 재사용하되(D-01, 어휘 통일), 순수 상수 모듈 규약(런타임 import 없음)을
  // 지키기 위해 import가 아니라 값을 그대로 여기에 리터럴로 전사한다.
  saveFailed: '저장하지 못했어요',
  // 07-UI-SPEC.md §Copywriting Contract "저장 실패 재시도 CTA". SETTINGS_COPY.retryCta와
  // 동일 문구 재사용(리터럴 전사, 위와 같은 이유).
  retryCta: '다시 시도',
  // 07-UI-SPEC.md §Copywriting Contract "모달 닫기 버튼" accessibility label.
  closeLabel: '닫기',
  // 07-UI-SPEC.md §Copywriting Contract "'오늘 돌아보기' 행" — 완료 여부와 무관하게 항상
  // 동일한 라벨(체크마크/숫자 접미사 없음, D-02).
  todayEntryRow: '오늘 돌아보기',
} as const;
