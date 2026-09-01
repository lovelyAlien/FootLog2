## Design System
Always read DESIGN.md before making any visual or UI decisions.
All font choices, colors, spacing, and aesthetic direction are defined there.
Do not deviate without explicit user approval.
In QA mode, flag any code that doesn't match DESIGN.md.

## 실기기 확인이 필요한 검증 단계

GSD 실행 중 `checkpoint:human-verify` 같은 사용자 확인 게이트나, QA/디자인 리뷰에서
"실기기에서 확인" 항목을 만나면 무조건 사용자에게 넘기지 않는다.

1. 먼저 iOS Simulator(iOS Simulator 도구)로 확인 가능한 항목인지 판단한다.
   네이티브 모듈 구성이 최근 빌드와 동일하고(패키지 변경 없음), 검증 대상이
   JS 레이어(화면 상태 전환, 애니메이션, 텍스트/색상 렌더링, 배선 동작 등)라면
   시뮬레이터로 먼저 직접 확인한다.
2. 순서: 시뮬레이터 패널 attach → 가장 최근 DerivedData 빌드 launch(없으면 빌드) →
   이미 실행 중인 Metro dev server(`--dev-client`)에 연결 → 스크린샷/탭으로 항목별 검증.
3. 실제 GPS 좌표, 카메라 촬영 결과물 품질, 실제 조도/화면에서의 색 인지, 실기기
   고유 성능 특성(프레임 드랍 등)처럼 시뮬레이터로 원천 재현 불가능한 항목만
   사용자에게 넘긴다.
4. 결과 보고(SUMMARY.md 등)에는 어느 항목을 Claude가 시뮬레이터로 직접 확인했고
   어느 항목이 사용자 확인이 필요한지 구분해서 명시한다.

## OS 캐시/마지막 값을 "즉시 반응" 최적화에 쓸 때 확인할 것

체크인 재센터 버튼에서 "빠르게 반응하도록 캐시를 먼저 쓰게 고쳤더니, 그 캐시가
부정확해서 여러 번 눌러야 실제 위치로 수렴하는" 회귀가 있었다(2026-08-28). 속도
문제만 보고 정확도 트레이드오프를 검토하지 않아 생긴 문제였다 — 아래 기준으로
재발을 막는다.

1. **정확도 파라미터를 먼저 확인한다.** OS 캐시/마지막 값을 반환하는 API를 쓸 때
   신선도(`maxAge` 류)만 보고 넘어가지 않는다 — 정확도 파라미터가 있으면
   (예: expo-location `getLastKnownPositionAsync`의 `requiredAccuracy`) 반드시
   검토하고, 쓰지 않기로 했다면 그 이유를 코드 주석에 남긴다.
2. **"빠른 값"이 틀렸을 때 사용자 재시도 없이 스스로 보정되는 경로를 함께 설계한다.**
   캐시/추정치를 즉시 보여주는 패턴을 쓸 때마다 "이 값이 틀렸으면 사용자가 뭘
   다시 해야 하나?"를 묻는다. 답이 "버튼을 다시 눌러야 한다"이면 설계 미완성 —
   백그라운드 재조회로 자동 수렴시키는 경로를 넣는다.
3. **시뮬레이터로 검증 불가능한 범주를 스스로 표시한다.** 시뮬레이터의 위치
   시뮬레이션(`simctl location set`)은 정확도가 시간에 따라 변하지 않는 고정값이라
   "정확도가 점점 개선되며 수렴하는" 계열 버그는 구조적으로 재현/검증이 안 된다.
   이런 요청은 시뮬레이터 검증을 시도하고 끝내지 말고, API 문서/시맨틱을 먼저
   깊이 검토하거나 실기기에서의 관찰이 필요하다고 명시적으로 알린다.

## 버그 수정 후 자동 문서화 (ce-compound)

자체 버그든, 사용자와 소통하며 드러난 기대-결과 불일치든, **버그를 고치고
검증까지 끝나면** 별도 요청 없이 `/ce-compound`(compound-engineering 플러그인)를
실행해 `solutions/`에 학습을 남긴다. 사소한 오타 수준은 제외 — 원인 조사가
필요했던 버그만 대상으로 한다. 한 번 실행에 학습 하나만 담는다(여러 건이면
순차 실행). 문서를 쓴 뒤에는 무엇을 어떤 이유로 담았는지 채팅에 짧게
설명한다 — 조용히 파일만 쓰고 넘어가지 않는다.

`docs/solutions/[카테고리]/*.md` — 과거에 조사·해결한 문제들의 기록. module/tags/problem_type이
달린 YAML frontmatter로 검색 가능. 이 저장소의 문서화된 영역에서 구현하거나 디버깅할 때
참고할 만하다.

`CONCEPTS.md` — 이 프로젝트의 공유 도메인 용어집(엔티티/프로세스/상태 개념). 코드베이스를
파악하거나 도메인 개념을 논의할 때 참고할 만하다.

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool. When in doubt, invoke the skill.

Key routing rules:
- Product ideas/brainstorming → invoke /office-hours
- Strategy/scope → invoke /plan-ceo-review
- Architecture → invoke /plan-eng-review
- Design system/plan review → invoke /design-consultation or /plan-design-review
- Full review pipeline → invoke /autoplan
- Bugs/errors → invoke /investigate
- QA/testing site behavior → invoke /qa or /qa-only
- Code review/diff check → invoke /review
- Visual polish → invoke /design-review
- Ship/deploy/PR → invoke /ship or /land-and-deploy
- Save progress → invoke /context-save
- Resume context → invoke /context-restore
- Author a backlog-ready spec/issue → invoke /spec
