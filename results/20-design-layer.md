# 실험 20 — 디자인 레이어 (Editorial Engineering Lab)

## 문제의식

실험 01~19 는 "품질을 시스템화" 에 집중해 왔다. 그 결과 테스트 83개, Hard 규칙 5개, 자동 게이트 4 경로가 쌓였지만 **UI 자체는 unstyled** 였다 — 폼·링크·리스트가 브라우저 기본 스타일 그대로. 실험 프로젝트의 성격상 "시각적 아이덴티티" 는 품질 요구사항이 아니었지만, 사용자 피드백("너무 UI 가 단조롭다") 을 계기로 디자인을 별도 실험으로 분리.

원칙: **디자인이 프로젝트의 성격(실험 노트 / 활판 인쇄물 / 품질 계측실)을 반영해야 한다.** 제네릭 SaaS UI 를 거부하고 Editorial Engineering Lab 으로 방향을 못 박음.

## 디자인 방향

| 요소 | 선택 |
|---|---|
| 팔레트 | 종이 아이보리 `#f4efe3` · 잉크 블랙 `#0b0b0b` · 버밀리언 `#d84b20` · 메타 그레이 `#6b6257` |
| 디스플레이 타이포 | Fraunces (SOFT / opsz 축 활용) |
| 본문 타이포 | IBM Plex Sans (400/500/600) |
| 메타·라벨 | IBM Plex Mono (400/500) |
| 모티프 | 대괄호 라벨 `[ FOLIO 01 ]` · tabular 번호 `№ 001` · 하이라인 룰 + 틱 마크 · `em` 이탤릭 강조 |
| 버튼 | 솔리드 잉크 primary / ghost secondary / 버밀리언 danger · hover `translate(-1px,-1px)` + `3px 3px 0` 프레스 그림자 |
| 폼 | 라운드 0 · 하이라인 언더라인 inputs · 포커스 시 버밀리언 언더라인 + 4% tint |

## 구현

### 변경된 파일

```
app/globals.css             → 디자인 토큰 + 유틸 클래스 + 모션 keyframes (+393 lines)
app/layout.tsx              → 폰트 로드 · 전역 Header / Footer
app/page.tsx                → Home → /posts redirect
app/login/page.tsx          → 2-column hero + card form
app/posts/page.tsx          → 에디토리얼 인덱스 (tabular 번호 · 하이라인 row)
app/posts/[id]/page.tsx     → 3-column article (Vol./Ref. 메타 · 본문 · 댓글)
app/posts/new/page.tsx      → Composition Desk (메타 aside + input-display)
app/posts/[id]/edit/page.tsx→ Revise (동일 패턴)
components/Alert.tsx        → 좌측 액센트 바 + paper 배경
components/ConfirmDialog.tsx→ 하이라인 프레임 + 10px 오프셋 그림자
components/CommentList.tsx  → 디스플레이 헤더 + 버밀리언 author
```

### 재사용 유틸 (simplify 이후)

실험 19 의 auto-simplify hook 첫 실측에서 **중복 패턴이 14곳 이상** 적발돼 globals.css 유틸로 승격:

| 유틸 | 용도 | 대체한 중복 개수 |
|---|---|---|
| `.page-container` | `mx-auto max-w-6xl px-6 md:px-10` | 11 |
| `.meta-line` | mono 11px / 0.16em / uppercase / meta color | 13 |
| `.meta-line-sm` | 10.5px / 0.2em variant | 4 |
| `.inline-error` | 에러 배너 (좌측 바 + tint + mono) | 10 |
| `.btn-link-danger` | 링크 버튼 danger modifier | 2 (`!important` 누수 제거) |
| `.input-display` | 제목 입력 전용 큰 세리프 | 2 (`!important` 누수 제거) |
| `--overlay` 토큰 | 모달 dim 레이어 | 1 (stringly-typed 제거) |

## 정량 요약

| 지표 | 값 |
|---|---|
| 변경 파일 | 13 (globals.css, layout, 5 pages, 3 components, settings, .gitignore, hook 신규) |
| globals.css 증가 | +393 lines (토큰 + 유틸 + 모션 + prose) |
| 신규 Google Font | 3 (Fraunces, IBM Plex Sans, IBM Plex Mono) |
| Google Font weight 최적화 | Plex Sans `'300'` 미사용 제거 |
| simplify 첫 실측 적발 | 20+ findings → 9 적용 / 7 의도적 skip |
| pr:gate 회귀 | 83/83 tests + 17/17 guard specs green |
| 사용한 실험 도구 | 실험 19 auto-simplify hook (세션 내 첫 실전) |

## 의도된 한계

### 접근성 대비

색상 대비는 시각 검증만. WCAG AA 자동 스캔(axe / lighthouse) 돌리지 않음 — 버밀리언 `#d84b20` 위 화이트 텍스트, 메타 `#6b6257` 위 아이보리 텍스트 등은 측정 필요.

### 모바일 최적화 미측정

`background-attachment: fixed` + 다층 radial gradient 는 iOS Safari 에서 scroll jank 유발 가능성. simplify 가 플래그했지만 실제 기기 측정 전까지는 변경하지 않음.

### 컴포넌트 계층 충돌 없음 확인

실험 13 의 `audit:components` 는 `components/*.tsx` 에 `.stories.tsx` + test 동반 의무. 이번 디자인 변경이 Alert/ConfirmDialog/CommentList 내부 구현만 수정 (API 유지) → audit / 기존 스토리 / 기존 테스트 모두 통과.

### Dark mode 없음

아이보리 종이 질감이 전제이므로 dark mode 는 설계에서 제외. `@media (prefers-color-scheme: dark)` 는 globals.css 에 없음. 의도된 scope.

## 이 실험의 의의

이전까지의 실험이 "Hard 규칙으로 막을 수 있는 것" 에 집중했다면, 이번 실험은 **Hard 로 잡을 수 없는 것(아이덴티티)** 을 어떻게 "자발적 일관성" 으로 유지하는지를 보여준다:

- `.page-container` / `.meta-line` 유틸이 SSOT — 직접 Tailwind 중복을 쓰려 하면 diff 에 튀고 simplify 가 다음 턴에 적발.
- 디자인 토큰(`--paper`, `--ink`, `--vermillion`)이 CSS custom property → 변경 비용 최소화.
- Fraunces / Plex Sans/Mono 는 `layout.tsx` 한 곳에서 로드, `@theme inline` 으로 Tailwind 토큰화.

즉, "디자인 일관성" 도 `.claude/hooks/guard-always-layer.mjs` 처럼 기계 차단까지 가진 않지만, **simplify + CSS 유틸 SSOT** 조합으로 "일관 이탈 → 다음 턴 fixup" 루프가 성립한다.
