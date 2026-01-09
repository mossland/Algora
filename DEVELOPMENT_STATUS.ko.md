# 개발 현황 - Algora

이 파일은 세션 간 개발 연속성을 위해 현재 개발 진행 상황을 추적합니다.

**최종 업데이트**: 2026-01-09
**현재 버전**: 0.1.0

---

## 현재 단계: 기반 구축 완료

### 완료된 기능

#### 인프라 (100%)
- [x] 모노레포 설정 (pnpm workspaces + Turborepo)
- [x] TypeScript 설정
- [x] ESLint + Prettier 설정
- [x] 환경 변수 템플릿 (.env.example)
- [x] Git 저장소 초기화

#### 백엔드 - apps/api (100%)
- [x] Express.js 서버 (포트 3201)
- [x] Socket.IO WebSocket 통합
- [x] SQLite 데이터베이스 (WAL 모드)
- [x] 전체 엔티티 데이터베이스 스키마
- [x] 30개 AI 에이전트 페르소나 시드
- [x] REST API 엔드포인트:
  - [x] GET /health - 헬스 체크
  - [x] GET /api/stats - 대시보드 통계
  - [x] GET /api/agents - 에이전트 목록
  - [x] GET /api/activity - 활동 피드
  - [x] GET /api/agora/sessions - 아고라 세션
  - [x] GET /api/signals - 신호
  - [x] GET /api/issues - 이슈
  - [x] GET /api/proposals - 제안
  - [x] GET /api/budget - 예산 정보
- [x] ActivityService (10초 간격 하트비트)
- [x] SchedulerService (3-tier LLM)

#### 프론트엔드 - apps/web (90%)
- [x] Next.js 14 (App Router)
- [x] next-intl (영어/한국어 i18n)
- [x] TanStack Query (데이터 fetching)
- [x] Tailwind CSS (커스텀 Algora 테마)
- [x] 대시보드 페이지 (통계 그리드)
- [x] 헤더 (시스템 상태, 언어 토글)
- [x] 사이드바 네비게이션
- [x] ActivityFeed 컴포넌트
- [x] AgentLobbyPreview 컴포넌트
- [x] StatsCard 컴포넌트
- [ ] 에이전트 페이지 (전체 목록)
- [ ] 아고라 페이지 (실시간 토론)
- [ ] 신호 페이지
- [ ] 이슈 페이지
- [ ] 제안 페이지
- [ ] 엔진룸 페이지

#### 공유 패키지
- [x] packages/core - TypeScript 타입
- [ ] packages/reality-oracle - 신호 수집
- [ ] packages/inference-mining - 이슈 탐지
- [ ] packages/agentic-consensus - 에이전트 시스템
- [ ] packages/human-governance - 투표
- [ ] packages/proof-of-outcome - 결과 추적

#### 문서화 (100%)
- [x] README.md / README.ko.md
- [x] ARCHITECTURE.md / ARCHITECTURE.ko.md
- [x] CONTRIBUTING.md / CONTRIBUTING.ko.md
- [x] ALGORA_PROJECT_SPEC.md / ALGORA_PROJECT_SPEC.ko.md
- [x] CLAUDE.md
- [x] CHANGELOG.md
- [x] DEVELOPMENT_STATUS.md (이 파일)

---

## 다음 단계 (우선순위 순)

### 1단계: 프론트엔드 페이지 완성
1. **에이전트 페이지** (`/agents`)
   - 30개 에이전트 그리드 뷰
   - 클러스터/상태별 필터
   - 에이전트 상세 모달
   - 소환/퇴장 기능

2. **아고라 페이지** (`/agora`)
   - 실시간 채팅 인터페이스
   - 활성 세션 표시
   - 메시지 히스토리
   - 에이전트 참여 표시

3. **신호 페이지** (`/signals`)
   - 필터가 있는 신호 목록
   - 소스 표시 (RSS, GitHub 등)
   - 처리 상태

4. **이슈 페이지** (`/issues`)
   - 우선순위가 있는 이슈 카드
   - 상태 워크플로우
   - 관련 신호

### 2단계: 에이전트 시스템
1. 로컬 LLM 통합 구현 (Ollama)
2. 에이전트 잡담 생성
3. 동적 소환 엔진
4. 아고라 세션 관리

### 3단계: 신호 수집
1. RSS 피드 수집기
2. GitHub 웹훅 통합
3. 온체인 데이터 수집기
4. 신호 처리 파이프라인

---

## 프로젝트 실행

```bash
# 의존성 설치
pnpm install

# 프론트엔드와 백엔드 동시 실행
pnpm dev

# 또는 개별 실행:
cd apps/api && pnpm dev   # 백엔드 :3201
cd apps/web && pnpm dev   # 프론트엔드 :3200
```

---

## Git 커밋 히스토리

```
e7354e9 fix(api): Add missing /api/stats and /api/activity endpoints
e413b1b fix(web): Fix API response handling
66e5dda fix(web): Add missing date-fns dependency
211c948 docs: Update CHANGELOG for v0.1.0 release
9dc8d82 feat(core): Add shared types package
01b24e5 feat(web): Add Next.js frontend with i18n
ef79042 feat(api): Add Express + Socket.IO backend
1adbbdb chore: Add root configuration files
0ba33d3 docs: Add project documentation
```

---

## 알려진 이슈

1. Next.js 14.1.0이 구버전임 (경미한 경고)
2. 서버 재시작 시 에이전트 상태가 유지되지 않음 (초기화 필요)
3. 아직 실제 LLM 통합 없음 (하트비트 활동만)

---

## 환경 설정 참고

- Node.js v20.19.6
- pnpm (모노레포용)
- SQLite 데이터베이스: `apps/api/data/algora.db`
- 첫 실행 시 데이터베이스 자동 초기화

---

## AI 어시스턴트를 위한 안내

개발 계속 시:
1. 이 파일을 먼저 읽어 현재 상태 파악
2. CLAUDE.md에서 프로젝트 컨텍스트와 가이드라인 확인
3. `git log --oneline -10`으로 최근 변경사항 확인
4. `pnpm dev`로 개발 서버 시작
5. 중요한 변경 후 이 파일과 CHANGELOG.md 업데이트
