// ===========================================
// Workflow B Tests
// ===========================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  WorkflowBHandler,
  createWorkflowBHandler,
  DEFAULT_WORKFLOW_B_CONFIG,
  type DebateTopic,
  type DebateThread,
  type ConsensusAssessment,
} from '../workflows/workflow-b.js';
import type { WorkflowContext } from '../types.js';
import type { LLMProvider } from '../specialist-manager.js';

// Mock LLM Provider
function createMockLLMProvider(): LLMProvider {
  return {
    generate: vi.fn().mockResolvedValue({
      content: `Position: For

I support this proposal based on the following analysis:

This approach aligns well with Mossland's strategic objectives and represents a reasonable path forward.

Supporting points:
- Point 1: Strong alignment with ecosystem goals
- Point 2: Feasible implementation path
- Point 3: Positive community reception expected

Confidence: 75`,
      model: 'mock-model',
      tokensUsed: 500,
    }),
    isAvailable: vi.fn().mockReturnValue(true),
    getModelInfo: vi.fn().mockReturnValue({
      id: 'mock-model',
      contextWindow: 8000,
      tokensPerSecond: 100,
    }),
  };
}

// Create mock context
function createMockContext(): WorkflowContext {
  return {
    issueId: 'test-issue-002',
    workflowType: 'B',
    currentState: 'DELIBERATION',
    issue: {
      id: 'test-issue-002',
      title: 'Strategic Direction for Q2 2026',
      description: 'Discuss strategic priorities for Mossland ecosystem in Q2 2026',
      category: 'community_governance',
      source: 'community',
      signalIds: ['signal-1'],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    stateHistory: [],
    agentOpinions: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// Create mock debate topic
function createMockTopic(): DebateTopic {
  return {
    id: 'topic-001',
    title: 'Strategic Direction for Q2 2026',
    description: 'Discuss strategic priorities for Mossland ecosystem',
    source: 'community',
    category: 'strategy',
    proposedBy: 'community',
    backgroundContext: 'The ecosystem is at a key decision point.',
    relatedIssues: ['issue-001'],
    createdAt: new Date(),
  };
}

describe('WorkflowBHandler', () => {
  let handler: WorkflowBHandler;
  let mockProvider: LLMProvider;

  beforeEach(() => {
    mockProvider = createMockLLMProvider();
    handler = new WorkflowBHandler(mockProvider);
  });

  describe('createWorkflowBHandler', () => {
    it('should create a handler with default config', () => {
      const h = createWorkflowBHandler(mockProvider);
      expect(h).toBeInstanceOf(WorkflowBHandler);
    });

    it('should create a handler with custom config', () => {
      const h = createWorkflowBHandler(mockProvider, {
        minParticipants: 5,
        consensusThreshold: 80,
      });
      expect(h).toBeInstanceOf(WorkflowBHandler);
    });
  });

  describe('DEFAULT_WORKFLOW_B_CONFIG', () => {
    it('should have reasonable default values', () => {
      expect(DEFAULT_WORKFLOW_B_CONFIG.minParticipants).toBe(3);
      expect(DEFAULT_WORKFLOW_B_CONFIG.maxDebateDurationHours).toBe(72);
      expect(DEFAULT_WORKFLOW_B_CONFIG.consensusThreshold).toBe(70);
      expect(DEFAULT_WORKFLOW_B_CONFIG.requireRedTeam).toBe(true);
      expect(DEFAULT_WORKFLOW_B_CONFIG.autoGenerateSummary).toBe(true);
      expect(DEFAULT_WORKFLOW_B_CONFIG.phases).toContain('opening');
      expect(DEFAULT_WORKFLOW_B_CONFIG.phases).toContain('conclusion');
    });
  });

  describe('initializeDebate', () => {
    it('should create a new debate thread', async () => {
      const context = createMockContext();
      const topic = createMockTopic();

      const thread = await handler.initializeDebate(context, topic);

      expect(thread).toHaveProperty('id');
      expect(thread.id).toMatch(/^debate-/);
      expect(thread.topicId).toBe(topic.id);
      expect(thread.title).toBe(topic.title);
      expect(thread.arguments).toHaveLength(0);
      expect(thread.participants).toHaveLength(0);
      expect(thread.status).toBe('active');
    });
  });

  describe('executeDebatePhase', () => {
    it('should execute a debate phase and gather arguments', async () => {
      const context = createMockContext();
      const topic = createMockTopic();
      const thread = await handler.initializeDebate(context, topic);

      const result = await handler.executeDebatePhase(context, thread, 'opening');

      expect(result.thread.arguments.length).toBeGreaterThan(0);
      expect(result.thread.participants.length).toBeGreaterThan(0);
      expect(result.arguments.length).toBeGreaterThan(0);
      expect(mockProvider.generate).toHaveBeenCalled();
    });

    it('should add red team challenge in rebuttals phase', async () => {
      const context = createMockContext();
      const topic = createMockTopic();
      let thread = await handler.initializeDebate(context, topic);

      // First run arguments phase
      const argsResult = await handler.executeDebatePhase(context, thread, 'arguments');
      thread = argsResult.thread;

      // Then run rebuttals phase
      const rebuttalResult = await handler.executeDebatePhase(context, thread, 'rebuttals');

      // Should include red team argument
      const redTeamArg = rebuttalResult.arguments.find((a) => a.agentId === 'red-team-1');
      expect(redTeamArg).toBeDefined();
      expect(redTeamArg?.agentName).toBe('Red Team Analyst');
    });
  });

  describe('executeFullDeliberation', () => {
    it('should execute full deliberation with all phases', async () => {
      const context = createMockContext();
      const topic = createMockTopic();

      const result = await handler.executeFullDeliberation(context, topic);

      expect(result.thread).toBeDefined();
      expect(result.consensus).toBeDefined();
      expect(result.opinions).toBeDefined();
      expect(result.thread.arguments.length).toBeGreaterThan(0);
      expect(result.opinions.length).toBeGreaterThan(0);
    });

    it('should calculate consensus score', async () => {
      const context = createMockContext();
      const topic = createMockTopic();

      const result = await handler.executeFullDeliberation(context, topic);

      expect(result.consensus.consensusScore).toBeGreaterThanOrEqual(0);
      expect(result.consensus.consensusScore).toBeLessThanOrEqual(100);
      expect(result.consensus).toHaveProperty('consensusReached');
      expect(result.consensus).toHaveProperty('debateId');
    });
  });

  describe('assessConsensus', () => {
    it('should assess consensus from debate thread', async () => {
      const context = createMockContext();
      const topic = createMockTopic();
      const thread = await handler.initializeDebate(context, topic);

      // Add some arguments
      await handler.executeDebatePhase(context, thread, 'arguments');

      const consensus = await handler.assessConsensus(thread);

      expect(consensus.debateId).toBe(thread.id);
      expect(consensus.consensusScore).toBeGreaterThanOrEqual(0);
      expect(consensus.consensusScore).toBeLessThanOrEqual(100);
      expect(consensus).toHaveProperty('keyAgreements');
      expect(consensus).toHaveProperty('unresolvedPoints');
    });
  });

  describe('generateDebateSummary', () => {
    it('should generate a debate summary document', async () => {
      const context = createMockContext();
      const topic = createMockTopic();
      const thread = await handler.initializeDebate(context, topic);

      // Run a phase to get some arguments
      await handler.executeDebatePhase(context, thread, 'arguments');

      const consensus: ConsensusAssessment = {
        debateId: thread.id,
        consensusReached: true,
        consensusScore: 75,
        majorityPosition: 'for',
        dissenting: [],
        keyAgreements: ['Agreement 1', 'Agreement 2'],
        unresolvedPoints: ['Point 1'],
        assessedAt: new Date(),
      };

      const summary = await handler.generateDebateSummary(thread, topic, consensus);

      expect(summary).toHaveProperty('id');
      expect(summary.id).toMatch(/^DS-/);
      expect(summary.debateId).toBe(thread.id);
      expect(summary.topicId).toBe(topic.id);
      expect(summary).toHaveProperty('executiveSummary');
      expect(summary).toHaveProperty('keyPositions');
      expect(summary).toHaveProperty('synthesis');
      expect(summary).toHaveProperty('recommendations');
      expect(summary).toHaveProperty('provenance');
    });
  });

  describe('shouldContinueDebate', () => {
    it('should return true for new debate with few participants', async () => {
      const context = createMockContext();
      const topic = createMockTopic();
      const thread = await handler.initializeDebate(context, topic);

      expect(handler.shouldContinueDebate(thread)).toBe(true);
    });

    it('should return false when all phases complete', async () => {
      const context = createMockContext();
      const topic = createMockTopic();

      // Run full deliberation
      const result = await handler.executeFullDeliberation(context, topic);

      expect(handler.shouldContinueDebate(result.thread)).toBe(false);
    });

    it('should return false when max duration exceeded', async () => {
      const context = createMockContext();
      const topic = createMockTopic();
      const thread = await handler.initializeDebate(context, topic);

      // Simulate old debate
      thread.startedAt = new Date(Date.now() - 100 * 60 * 60 * 1000); // 100 hours ago

      expect(handler.shouldContinueDebate(thread)).toBe(false);
    });
  });
});
