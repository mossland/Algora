# Algora 멀티에이전트 업그레이드 제안서

> oh-my-opencode의 멀티에이전트 오케스트레이션 패턴에서 영감을 받음

## 요약

oh-my-opencode는 $24,000 상당의 토큰 실험을 통해 얻은 "계획과 실행의 분리(Separation of Planning and Execution)" 철학을 기반으로 한 멀티에이전트 오케스트레이션 시스템입니다. 이 문서는 oh-my-opencode의 핵심 아이디어를 Algora의 거버넌스 시스템에 적용하여 효율성과 투명성을 크게 향상시키는 방안을 제안합니다.

---

## 1. 현재 Algora 시스템 분석

### 현재 구조
- **30개 에이전트**: 7개 클러스터 (비저너리, 빌더, 투자자, 가디언, 오퍼레이티브, 모더레이터, 어드바이저)
- **라운드 로빈 참여**: 무작위 선택 기반
- **단일 세션 처리**: 순차적 라운드 진행 (30-120초/턴)
- **3단계 LLM**: Tier 0 (무료), Tier 1 (로컬), Tier 2 (외부 API)

### 현재 한계점
1. 명시적 합의 메커니즘 부재
2. 에이전트 간 역할 경계 모호
3. 세션 간 컨텍스트 미보존
4. 비동기 태스크 관리 미흡
5. 구조화된 출력 포맷 부재

---

## 2. oh-my-opencode 핵심 아이디어

### 2.1 분리된 전문 에이전트 (관심사의 분리)

```
┌─────────────────────────────────────────────────────────────┐
│                    oh-my-opencode 구조                        │
├─────────────────────────────────────────────────────────────┤
│  Sisyphus (오케스트레이터)                                    │
│     ├── Prometheus (기획자) ─── 계획만 작성, 실행 안함         │
│     ├── Oracle (디버거) ────── 고수준 분석                    │
│     ├── Librarian (연구자) ─── 증거 기반 조사                 │
│     ├── Explore (탐색) ────── 코드베이스 탐색                 │
│     └── Frontend Engineer ─── 실행 권한 보유                  │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 핵심 패턴

| 패턴 | 설명 | 효과 |
|------|------|------|
| **Background Task Manager** | 모델별/프로바이더별 동시성 제한 | 비용 최적화, 안정성 |
| **Todo Continuation Enforcer** | 완료까지 에이전트 진행 강제 | 작업 품질 향상 |
| **sisyphus_task Tool** | 카테고리+스킬 기반 위임 | 정확한 라우팅 |
| **Structured Output Format** | XML 태그 기반 응답 | 파싱 용이, 일관성 |
| **Evidence-Based Claims** | GitHub 퍼머링크 필수 | 신뢰성 향상 |

---

## 3. Algora 업그레이드 제안

### 3.1 아키텍처 재설계: 7개 핵심 에이전트 시스템

기존 30개 에이전트를 7개 핵심 역할로 재편:

```
┌─────────────────────────────────────────────────────────────┐
│                  Algora 2.0 에이전트 아키텍처                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌─────────────┐                                           │
│   │   HERMES    │  마스터 오케스트레이터 (Claude Opus)        │
│   │ 오케스트레이터│  - 세션 관리, 에이전트 위임, 합의 조율       │
│   └──────┬──────┘                                           │
│          │                                                  │
│   ┌──────┼──────────────────────────────────────────┐       │
│   │      │  1단계: 분석 및 기획                       │       │
│   │      ├──────────────────────────────────────────┤       │
│   │      ▼                                          │       │
│   │ ┌─────────┐  ┌─────────┐  ┌─────────┐          │       │
│   │ │ ATHENA  │  │ ARGUS   │  │ MNEMOSYNE│          │       │
│   │ │ 분석가   │  │ 가디언  │  │ 기록관  │          │       │
│   │ │ (Sonnet)│  │ (Sonnet)│  │ (Haiku)  │          │       │
│   │ │신호분석 │  │위험평가 │  │역사조회  │          │       │
│   │ └─────────┘  └─────────┘  └─────────┘          │       │
│   └─────────────────────────────────────────────────┘       │
│                                                             │
│   ┌─────────────────────────────────────────────────┐       │
│   │      2단계: 숙의 및 토론                          │       │
│   │      ├──────────────────────────────────────────┤       │
│   │      ▼                                          │       │
│   │ ┌─────────┐  ┌─────────┐                        │       │
│   │ │ DELPHI  │  │PROMETHEUS│                       │       │
│   │ │ 의회    │  │ 옹호자   │                        │       │
│   │ │ (로컬)  │  │ (Opus)   │                       │       │
│   │ │다관점토론│  │제안작성 │                        │       │
│   │ └─────────┘  └─────────┘                        │       │
│   └─────────────────────────────────────────────────┘       │
│                                                             │
│   ┌─────────────────────────────────────────────────┐       │
│   │      3단계: 종합 및 문서화                        │       │
│   │      ├──────────────────────────────────────────┤       │
│   │      ▼                                          │       │
│   │ ┌─────────┐                                     │       │
│   │ │ CALLIOPE│                                     │       │
│   │ │ 서기    │                                     │       │
│   │ │ (Sonnet)│                                     │       │
│   │ │결정문서화│                                     │       │
│   │ └─────────┘                                     │       │
│   └─────────────────────────────────────────────────┘       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### 에이전트 역할 상세

| 에이전트 | 역할 | 티어 | 권한 | 설명 |
|---------|------|------|------|------|
| **HERMES** | 오케스트레이터 | 2 (Opus) | 읽기/쓰기 | 마스터 오케스트레이터. 태스크 위임, 세션 관리, 최종 합의 조율 |
| **ATHENA** | 분석가 | 2 (Sonnet) | 읽기 전용 | 신호 분석, 이슈 분류, 영향도 평가 |
| **ARGUS** | 가디언 | 2 (Sonnet) | 읽기 전용 | 보안/규정 위험 평가, 컴플라이언스 체크 |
| **MNEMOSYNE** | 기록관 | 1 (Haiku) | 읽기 전용 | 과거 결정 조회, 유사 사례 검색, 맥락 제공 |
| **DELPHI** | 의회 | 1 (로컬) | 읽기 전용 | 다관점 토론 시뮬레이션 (30개 페르소나 통합) |
| **PROMETHEUS** | 옹호자 | 2 (Opus) | 쓰기 (제안서만) | 제안서 작성, 옵션 제시, 트레이드오프 분석 |
| **CALLIOPE** | 서기 | 2 (Sonnet) | 쓰기 (문서만) | Decision Packet 작성, 요약, 문서화 |

### 3.2 Background Task Manager 도입

```typescript
// 신규: packages/agentic-consensus/src/orchestrator/BackgroundTaskManager.ts

interface TaskLimits {
  perModel: {
    'claude-opus': 2,      // 동시 2개까지
    'claude-sonnet': 4,
    'claude-haiku': 8,
    'ollama-local': 10
  },
  perProvider: {
    'anthropic': 5,        // 전체 Anthropic 동시 5개
    'google': 8,
    'ollama': 15
  }
}

interface BackgroundTask {
  id: string;
  agentId: string;
  category: 'analysis' | 'deliberation' | 'synthesis';
  status: 'queued' | 'running' | 'completed' | 'failed';
  parentTaskId?: string;  // 계층 구조 지원
  context: AgentContext;
  result?: AgentResult;
}

class BackgroundTaskManager {
  private tasks: Map<string, BackgroundTask>;
  private queue: PriorityQueue<BackgroundTask>;
  private limits: TaskLimits;

  async enqueue(task: BackgroundTask): Promise<string>;
  async getResult(taskId: string, timeout?: number): Promise<AgentResult>;
  async cancelTask(taskId: string): Promise<void>;

  // 세션 영속성 (boulder.json 패턴)
  async saveSession(sessionId: string): Promise<void>;
  async restoreSession(sessionId: string): Promise<BackgroundTask[]>;
}
```

### 3.3 hermes_task 도구 (sisyphus_task 적용)

```typescript
// 신규: packages/agentic-consensus/src/tools/hermes_task.ts

interface HermesTaskParams {
  category: 'signal-analysis' | 'risk-assessment' | 'history-lookup' |
            'deliberation' | 'proposal-writing' | 'documentation';
  skills?: ('blockchain' | 'defi' | 'security' | 'legal' | 'community')[];
  context?: {
    issueId?: string;
    relatedProposals?: string[];
    urgencyLevel?: 'low' | 'medium' | 'high' | 'critical';
  };
  run_in_background: boolean;  // 필수: true여야 함
}

// 카테고리별 에이전트 라우팅
const CATEGORY_ROUTING = {
  'signal-analysis': { agent: 'ATHENA', model: 'claude-sonnet', temp: 0.3 },
  'risk-assessment': { agent: 'ARGUS', model: 'claude-sonnet', temp: 0.1 },
  'history-lookup': { agent: 'MNEMOSYNE', model: 'claude-haiku', temp: 0.2 },
  'deliberation': { agent: 'DELPHI', model: 'ollama-local', temp: 0.7 },
  'proposal-writing': { agent: 'PROMETHEUS', model: 'claude-opus', temp: 0.5 },
  'documentation': { agent: 'CALLIOPE', model: 'claude-sonnet', temp: 0.4 }
};
```

### 3.4 Todo Continuation Enforcer (작업 완료 강제기)

```typescript
// 신규: packages/agentic-consensus/src/enforcer/TodoContinuationEnforcer.ts

class TodoContinuationEnforcer {
  private idleThresholdMs = 2000;  // 2초 유휴 감지

  async monitor(sessionId: string): Promise<void> {
    // 세션 활동 모니터링
    while (this.isSessionActive(sessionId)) {
      const lastActivity = await this.getLastActivity(sessionId);
      const idleTime = Date.now() - lastActivity;

      if (idleTime > this.idleThresholdMs) {
        const pendingTodos = await this.getPendingTodos(sessionId);

        if (pendingTodos.length > 0) {
          // 중단 방지: 계속 진행 프롬프트 주입
          await this.injectContinuationPrompt(sessionId, pendingTodos);
        }
      }

      await sleep(500);
    }
  }

  private async injectContinuationPrompt(
    sessionId: string,
    pendingTodos: Todo[]
  ): Promise<void> {
    const prompt = `
<system-reminder>
완료해야 할 작업이 ${pendingTodos.length}개 남아있습니다:
${pendingTodos.map((t, i) => `${i + 1}. ${t.content}`).join('\n')}

이 작업들을 계속 진행하세요. 모두 완료될 때까지 멈추지 마세요.
</system-reminder>`;

    await this.sendToSession(sessionId, prompt);
  }
}
```

### 3.5 구조화된 출력 포맷

기존 자유 형식 응답을 구조화된 XML 포맷으로 변경:

```xml
<!-- 에이전트 응답 표준 포맷 -->
<agent_response agent="ATHENA" timestamp="2026-01-10T12:00:00Z">
  <classification>
    <request_type>signal_analysis</request_type>
    <complexity>medium</complexity>
    <urgency>high</urgency>
  </classification>

  <analysis>
    <literal_request>GitHub 커밋 급증 분석</literal_request>
    <actual_need>보안 취약점 가능성 조사</actual_need>
    <key_findings>
      <finding id="1">지난 24시간 커밋 300% 증가</finding>
      <finding id="2">3개 파일에서 의심스러운 패턴 감지</finding>
    </key_findings>
  </analysis>

  <evidence>
    <source type="github" url="https://github.com/...#L10-L20">
      <code_snippet>실제 코드 조각</code_snippet>
    </source>
    <source type="blockchain" tx="0x...">
      <data>온체인 데이터</data>
    </source>
  </evidence>

  <recommendation>
    <action>ARGUS 에이전트에게 보안 심층 분석 위임</action>
    <confidence>0.85</confidence>
    <reasoning>커밋 패턴이 과거 보안 사고와 유사</reasoning>
  </recommendation>

  <next_steps>
    <step priority="1">보안 분석 실행</step>
    <step priority="2">커뮤니티 알림 준비</step>
  </next_steps>
</agent_response>
```

### 3.6 증거 기반 주장 시스템

```typescript
// 신규: packages/agentic-consensus/src/validation/EvidenceValidator.ts

interface Evidence {
  type: 'github' | 'blockchain' | 'rss' | 'social' | 'document';
  url: string;
  hash?: string;        // 콘텐츠 해시 (변조 방지)
  timestamp: Date;
  excerpt?: string;     // 관련 발췌
  verified: boolean;
}

class EvidenceValidator {
  // 모든 주장에 증거 필수
  async validateClaim(claim: string, evidence: Evidence[]): Promise<{
    valid: boolean;
    confidence: number;
    issues: string[];
  }>;

  // 증거 신선도 체크
  async checkFreshness(evidence: Evidence, maxAgeHours: number): Promise<boolean>;

  // 교차 검증
  async crossReference(evidence: Evidence[]): Promise<{
    corroborating: Evidence[];
    conflicting: Evidence[];
  }>;
}
```

### 3.7 DELPHI 의회: 30개 페르소나를 하나로

기존 30개 에이전트의 페르소나를 DELPHI 내부에서 시뮬레이션:

```typescript
// packages/agentic-consensus/src/agents/delphi.ts

class DelphiCouncil {
  private personas: Persona[] = [
    // 기존 30개 페르소나 정의 유지
    { name: 'Singularity Seeker', bias: 'pro-innovation', weight: 1.0 },
    { name: 'Compliance Officer', bias: 'pro-regulation', weight: 1.2 },
    // ... 28개 더
  ];

  async deliberate(issue: Issue): Promise<CouncilResult> {
    // 1단계: 각 페르소나별 관점 생성
    const perspectives = await this.generatePerspectives(issue);

    // 2단계: 토론 시뮬레이션
    const debate = await this.simulateDebate(perspectives);

    // 3단계: 합의 도출
    const consensus = await this.synthesizeConsensus(debate);

    return {
      perspectives,
      debate,
      consensus,
      dissenting_views: this.extractDissent(debate)
    };
  }
}
```

### 3.8 컨텍스트 주입 시스템

```typescript
// 신규: packages/agentic-consensus/src/context/ContextInjector.ts

const INJECTION_RULES: InjectionRule[] = [
  {
    trigger: 'treasury|budget|funds',
    inject: ['governance/TREASURY_POLICY.md', 'history/treasury_decisions.json'],
    priority: 1
  },
  {
    trigger: 'security|vulnerability|hack',
    inject: ['governance/SECURITY_PROTOCOL.md', 'history/security_incidents.json'],
    priority: 0  // 최우선
  }
];

class ContextInjector {
  async injectContext(issue: Issue, agentId: string): Promise<string> {
    let context = '';

    // 1. 기본 컨텍스트 항상 주입
    context += await this.loadFile('.algora/GOVERNANCE_RULES.md');

    // 2. 이슈 기반 조건부 주입
    for (const rule of INJECTION_RULES) {
      if (new RegExp(rule.trigger, 'i').test(issue.title)) {
        for (const file of rule.inject) {
          context += await this.loadFile(file);
        }
      }
    }

    // 3. 관련 과거 결정 자동 조회
    const relatedDecisions = await this.findRelatedDecisions(issue);
    context += this.formatDecisions(relatedDecisions);

    return context;
  }
}
```

---

## 4. 구현 로드맵

### 1단계: 핵심 오케스트레이션 (1-2주)

```
[ ] BackgroundTaskManager 구현
    - 동시성 제한 로직
    - 세션 영속성 (boulder.json 패턴)
    - 우선순위 큐

[ ] HermesOrchestrator 구현
    - hermes_task 도구
    - 카테고리 라우팅
    - 에이전트 위임 로직

[ ] 기존 AgoraService 리팩토링
    - Hermes 통합
    - 비동기 태스크 지원
```

### 2단계: 전문 에이전트 (2-3주)

```
[ ] 7개 핵심 에이전트 구현
    - ATHENA (신호 분석)
    - ARGUS (위험 평가)
    - MNEMOSYNE (역사 조회)
    - DELPHI (다관점 토론)
    - PROMETHEUS (제안 작성)
    - CALLIOPE (문서화)

[ ] 30개 페르소나 → DELPHI 통합
    - 페르소나 가중치 시스템
    - 토론 시뮬레이션 엔진
```

### 3단계: 품질 보증 (1-2주)

```
[ ] TodoContinuationEnforcer 구현
[ ] EvidenceValidator 구현
[ ] Structured Output Parser
[ ] ContextInjector 시스템
```

### 4단계: 통합 및 테스트 (1주)

```
[ ] 기존 API 호환성 유지
[ ] WebSocket 이벤트 업데이트
[ ] UI 컴포넌트 조정
[ ] 성능 테스트
```

---

## 5. 예상 효과

### 5.1 효율성 향상

| 메트릭 | 현재 | 개선 후 | 향상률 |
|--------|------|---------|--------|
| 세션당 LLM 호출 | ~15회 | ~8회 | -47% |
| 합의 도달 시간 | 5-10분 | 2-4분 | -50% |
| Tier 2 비용 | $10/일 | $6/일 | -40% |
| 컨텍스트 활용률 | 40% | 85% | +112% |

### 5.2 품질 향상

- **명확한 책임 분리**: 각 에이전트의 역할과 권한이 명확
- **증거 기반 의사결정**: 모든 주장에 검증 가능한 출처 필수
- **완전한 태스크 완료**: 중단 없는 진행 보장
- **구조화된 출력**: 파싱 및 분석 용이
- **과거 결정 활용**: 일관성 있는 거버넌스

### 5.3 투명성 향상

- **계층적 태스크 추적**: 누가 무엇을 위임했는지 명확
- **증거 체인**: 결정의 근거 명시
- **세션 영속성**: 진행 상황 저장 및 복구 가능

---

## 6. 결론

oh-my-opencode의 핵심 철학인 **"계획과 실행의 분리"**와 **"전문화된 에이전트 협업"**을 Algora에 적용하면:

1. **30개 에이전트 → 7개 핵심 에이전트 + DELPHI 의회**로 단순화
2. **Background Task Manager**로 비동기 처리 및 비용 최적화
3. **Todo Continuation Enforcer**로 완전한 작업 수행 보장
4. **구조화된 출력**으로 합의 추적 및 분석 용이
5. **증거 기반 시스템**으로 투명성과 신뢰성 향상

이를 통해 Algora는 더욱 효율적이고 투명한 24/7 AI 거버넌스 플랫폼으로 진화할 수 있습니다.

---

## 참고 자료

- [oh-my-opencode](https://github.com/code-yeongyu/oh-my-opencode)
- [Algora 아키텍처](./ARCHITECTURE.ko.md)
- [에이전트 시스템 스펙](./ALGORA_PROJECT_SPEC.ko.md)

---

**문서 버전**: 1.0.0
**작성일**: 2026-01-10
**작성자**: Claude (AI 어시스턴트)
