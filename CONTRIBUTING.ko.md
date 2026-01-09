# Algora 기여 가이드

Algora에 관심을 가져주셔서 감사합니다! 이 문서는 기여자를 위한 가이드라인과 정보를 제공합니다.

[English Documentation](./CONTRIBUTING.md)

---

## 목차

- [행동 강령](#행동-강령)
- [시작하기](#시작하기)
- [개발 워크플로우](#개발-워크플로우)
- [코딩 표준](#코딩-표준)
- [문서화 요구사항](#문서화-요구사항)
- [커밋 가이드라인](#커밋-가이드라인)
- [Pull Request 프로세스](#pull-request-프로세스)
- [이슈 가이드라인](#이슈-가이드라인)

---

## 행동 강령

우리는 환영하고 포용적인 환경을 제공하기 위해 노력합니다. 모든 상호작용에서 존중하고 건설적인 태도를 유지해 주세요.

---

## 시작하기

### 사전 요구사항

- Node.js 20+
- pnpm 8+
- Git
- Ollama (로컬 LLM 테스트용)

### 설정

```bash
# 저장소 포크 및 클론
git clone https://github.com/YOUR_USERNAME/Algora.git
cd Algora

# 의존성 설치
pnpm install

# 환경 파일 복사
cp .env.example .env

# 데이터베이스 초기화
pnpm db:init

# 개발 시작
pnpm dev
```

---

## 개발 워크플로우

### 브랜치 명명

설명적인 브랜치 이름을 사용하세요:

```
feature/agent-summoning
fix/websocket-reconnection
docs/architecture-update
refactor/budget-manager
```

### 개발 명령어

```bash
# 모든 서비스를 개발 모드로 시작
pnpm dev

# 모든 패키지 빌드
pnpm build

# 테스트 실행
pnpm test

# 린터 실행
pnpm lint

# 타입 체크
pnpm typecheck
```

---

## 코딩 표준

### 언어

- **코드**: TypeScript만 사용
- **주석**: 영어만 사용
- **변수명**: 영어, camelCase
- **상수**: UPPER_SNAKE_CASE

### 스타일 가이드

코드 포맷팅을 위해 ESLint와 Prettier를 사용합니다:

```bash
# 코드 포맷
pnpm format

# 포맷 확인
pnpm format:check
```

### TypeScript 가이드라인

```typescript
// 함수 매개변수와 반환값에 명시적 타입 사용
function calculateBudget(usage: BudgetUsage): number {
  // ...
}

// 객체 형태에 인터페이스 사용
interface AgentConfig {
  id: string;
  name: string;
  tier: 'tier1' | 'tier2';
}

// 런타임 검증에 Zod 사용
const AgentSchema = z.object({
  id: z.string(),
  name: z.string(),
  tier: z.enum(['tier1', 'tier2']),
});
```

### 파일 구성

```
src/
├── components/       # React 컴포넌트 (PascalCase)
│   ├── AgentAvatar.tsx
│   └── AgentAvatar.test.tsx
├── hooks/            # React hooks (use 접두사가 붙은 camelCase)
│   └── useAgentState.ts
├── utils/            # 유틸리티 함수 (camelCase)
│   └── formatDate.ts
├── types/            # 타입 정의
│   └── agent.types.ts
└── constants/        # 상수 (UPPER_CASE)
    └── AGENT_GROUPS.ts
```

---

## 문서화 요구사항

### 필수 문서 업데이트

**중요**: 모든 커밋에서 모든 문서가 업데이트되어야 합니다.

변경 사항이 있을 때:

1. 관련 `.md` 파일을 영어로 업데이트
2. 해당 `.ko.md` 파일을 한국어로 업데이트
3. 사용자에게 영향을 주는 변경이면 `CHANGELOG.md` 업데이트

### 문서 파일

| 파일 | 설명 |
|------|------|
| `README.md` / `README.ko.md` | 프로젝트 개요 |
| `ARCHITECTURE.md` / `ARCHITECTURE.ko.md` | 시스템 아키텍처 |
| `CONTRIBUTING.md` / `CONTRIBUTING.ko.md` | 기여 가이드 |
| `ALGORA_PROJECT_SPEC.md` / `ALGORA_PROJECT_SPEC.ko.md` | 전체 사양 |
| `CHANGELOG.md` | 버전 히스토리 |
| `CLAUDE.md` | AI 어시스턴트 컨텍스트 |

### API 문서

API 엔드포인트를 추가/수정할 때:

1. OpenAPI/Swagger 문서 업데이트
2. 핸들러 함수에 JSDoc 주석 추가
3. 예시 요청/응답 포함

```typescript
/**
 * 현재 아고라 세션에 에이전트를 소환합니다
 * @param sessionId - 아고라 세션의 ID
 * @param agentId - 소환할 에이전트의 ID
 * @returns 업데이트된 세션 상태
 */
async function summonAgent(sessionId: string, agentId: string): Promise<Session> {
  // ...
}
```

---

## 커밋 가이드라인

### 커밋 메시지 형식

[Conventional Commits](https://www.conventionalcommits.org/) 규격을 따릅니다:

```
<type>(<scope>): <description>

[선택적 본문]

[선택적 푸터]
```

### 타입

- `feat`: 새로운 기능
- `fix`: 버그 수정
- `docs`: 문서만 변경
- `style`: 포맷팅, 세미콜론 누락 등
- `refactor`: 버그 수정이나 기능 추가가 아닌 코드 변경
- `perf`: 성능 개선
- `test`: 테스트 추가 또는 업데이트
- `chore`: 빌드 프로세스 또는 보조 도구 변경

### 예시

```
feat(agents): 보안 이슈에 대한 동적 소환 추가

fix(budget): 일일 한도 계산 수정

docs(readme): 설치 지침 업데이트

refactor(agora): 세션 상태 관리 간소화
```

### 커밋 모범 사례

1. 커밋을 원자적으로 유지 (커밋당 하나의 논리적 변경)
2. 명확하고 설명적인 커밋 메시지 작성
3. 해당되는 경우 이슈 번호 참조 (`fixes #123`)
4. 커밋하기 전에 모든 테스트가 통과하는지 확인

---

## Pull Request 프로세스

### 제출 전 확인사항

1. [ ] 코드가 스타일 가이드라인을 따름
2. [ ] 모든 테스트 통과 (`pnpm test`)
3. [ ] 린팅 통과 (`pnpm lint`)
4. [ ] 문서가 업데이트됨 (한국어 번역 포함)
5. [ ] `CHANGELOG.md`가 업데이트됨 (사용자에게 영향을 주는 변경의 경우)
6. [ ] 커밋 메시지가 규칙을 따름

### PR 템플릿

PR을 생성할 때 포함할 내용:

```markdown
## 설명
변경 사항에 대한 간략한 설명

## 변경 유형
- [ ] 버그 수정
- [ ] 새로운 기능
- [ ] 호환성을 깨는 변경
- [ ] 문서 업데이트

## 테스트
변경 사항을 어떻게 테스트했는지 설명

## 스크린샷 (해당되는 경우)
UI 변경에 대한 스크린샷 추가

## 체크리스트
- [ ] 코드가 스타일 가이드라인을 따름
- [ ] 테스트 통과
- [ ] 문서 업데이트됨
- [ ] 한국어 번역 업데이트됨
```

### 리뷰 프로세스

1. `main` 브랜치에 PR 제출
2. 자동화된 검사 실행 (테스트, 린팅, 타입 체킹)
3. 최소 한 명의 메인테이너가 코드 리뷰
4. 리뷰 피드백 처리
5. 승인 후 PR 병합

---

## 이슈 가이드라인

### 버그 리포트

포함할 내용:
- 버그에 대한 명확한 설명
- 재현 단계
- 예상 동작
- 실제 동작
- 환경 세부 정보 (OS, Node 버전 등)
- 해당되는 경우 스크린샷

### 기능 요청

포함할 내용:
- 기능에 대한 명확한 설명
- 사용 사례 / 동기
- 제안된 솔루션 (있는 경우)
- 고려한 대안

### 이슈 라벨

- `bug`: 뭔가 작동하지 않음
- `enhancement`: 새로운 기능 또는 요청
- `documentation`: 문서 개선
- `good first issue`: 신규 기여자에게 적합
- `help wanted`: 추가 주의가 필요함
- `priority: high`: 긴급 이슈

---

## 질문이 있으신가요?

기여에 대해 질문이 있으시면:

1. 기존 문서 확인
2. 기존 이슈 검색
3. 질문과 함께 새 이슈 열기
4. 커뮤니티 토론에 참여

---

**Algora에 기여해 주셔서 감사합니다!**
