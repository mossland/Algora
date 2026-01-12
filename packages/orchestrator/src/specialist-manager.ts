// ===========================================
// Specialist Manager for Algora v2.0
// ===========================================

import type {
  SpecialistCode,
  SpecialistDefinition,
  SpecialistTask,
  SpecialistOutput,
  WorkflowState,
  OrchestratorConfig,
} from './types.js';
import { SPECIALISTS, DEFAULT_ORCHESTRATOR_CONFIG } from './types.js';

/**
 * Event emitted by the specialist manager.
 */
export interface SpecialistEvent {
  type:
    | 'task:assigned'
    | 'task:started'
    | 'task:completed'
    | 'task:failed'
    | 'task:timeout'
    | 'output:validated'
    | 'output:rejected';
  taskId: string;
  specialistCode: SpecialistCode;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Listener for specialist events.
 */
export type SpecialistEventListener = (event: SpecialistEvent) => void;

/**
 * LLM provider interface for specialist execution.
 */
export interface LLMProvider {
  /**
   * Generate a completion from the LLM.
   */
  generate(options: {
    prompt: string;
    maxTokens: number;
    systemPrompt?: string;
    temperature?: number;
  }): Promise<{
    content: string;
    model: string;
    tokenCount: number;
    costUsd: number;
  }>;
}

/**
 * Quality gate for validating specialist outputs.
 */
export interface QualityGate {
  /**
   * Validate the output against quality criteria.
   */
  validate(
    output: string,
    specialistCode: SpecialistCode,
    context: Record<string, unknown>
  ): Promise<{
    passed: boolean;
    confidence: number;
    issues?: string[];
  }>;
}

/**
 * Default quality gate implementation.
 */
export class DefaultQualityGate implements QualityGate {
  constructor(private minConfidenceScore: number = 70) {}

  async validate(
    output: string,
    specialistCode: SpecialistCode,
    _context: Record<string, unknown>
  ): Promise<{
    passed: boolean;
    confidence: number;
    issues?: string[];
  }> {
    const issues: string[] = [];
    let confidence = 100;

    // Basic length check based on specialist type
    const spec = SPECIALISTS[specialistCode];
    const minLength = this.getMinLength(specialistCode);
    if (output.length < minLength) {
      issues.push(`Output too short (${output.length} < ${minLength})`);
      confidence -= 30;
    }

    // Check max tokens (approximate)
    const estimatedTokens = output.split(/\s+/).length * 1.3;
    if (estimatedTokens > spec.maxTokens * 1.2) {
      issues.push(`Output may exceed token limit`);
      confidence -= 10;
    }

    // Check for common issues
    if (output.includes('[TODO]') || output.includes('[PLACEHOLDER]')) {
      issues.push('Output contains placeholder text');
      confidence -= 20;
    }

    if (output.trim().length === 0) {
      issues.push('Output is empty');
      confidence = 0;
    }

    return {
      passed: confidence >= this.minConfidenceScore && issues.length === 0,
      confidence: Math.max(0, confidence),
      issues: issues.length > 0 ? issues : undefined,
    };
  }

  private getMinLength(code: SpecialistCode): number {
    const minLengths: Record<SpecialistCode, number> = {
      RES: 500,    // Research brief
      ANA: 800,    // Analysis report
      DRA: 1000,   // Document draft
      REV: 300,    // Review report
      RED: 400,    // Adversarial analysis
      SUM: 100,    // Executive summary
      TRN: 200,    // Translation
      ARC: 100,    // Registry entry
    };
    return minLengths[code] || 100;
  }
}

/**
 * Task queue for managing specialist assignments.
 */
export interface TaskQueue {
  enqueue(task: SpecialistTask): Promise<void>;
  dequeue(): Promise<SpecialistTask | null>;
  peek(): Promise<SpecialistTask | null>;
  getByStatus(status: SpecialistTask['status']): Promise<SpecialistTask[]>;
  update(taskId: string, updates: Partial<SpecialistTask>): Promise<void>;
  get(taskId: string): Promise<SpecialistTask | null>;
}

/**
 * In-memory task queue implementation.
 */
export class InMemoryTaskQueue implements TaskQueue {
  private tasks: Map<string, SpecialistTask> = new Map();
  private queue: string[] = [];

  async enqueue(task: SpecialistTask): Promise<void> {
    this.tasks.set(task.id, task);
    this.queue.push(task.id);
  }

  async dequeue(): Promise<SpecialistTask | null> {
    const taskId = this.queue.shift();
    if (!taskId) return null;
    return this.tasks.get(taskId) || null;
  }

  async peek(): Promise<SpecialistTask | null> {
    const taskId = this.queue[0];
    if (!taskId) return null;
    return this.tasks.get(taskId) || null;
  }

  async getByStatus(status: SpecialistTask['status']): Promise<SpecialistTask[]> {
    return Array.from(this.tasks.values()).filter((t) => t.status === status);
  }

  async update(taskId: string, updates: Partial<SpecialistTask>): Promise<void> {
    const task = this.tasks.get(taskId);
    if (task) {
      this.tasks.set(taskId, { ...task, ...updates });
    }
  }

  async get(taskId: string): Promise<SpecialistTask | null> {
    return this.tasks.get(taskId) || null;
  }
}

/**
 * Options for the specialist manager.
 */
export interface SpecialistManagerOptions {
  config: OrchestratorConfig;
  llmProvider: LLMProvider;
  qualityGate?: QualityGate;
  taskQueue?: TaskQueue;
}

/**
 * System prompts for each specialist type.
 */
const SPECIALIST_SYSTEM_PROMPTS: Record<SpecialistCode, string> = {
  RES: `You are a Researcher specialist agent for the Algora governance system.
Your role is to gather, synthesize, and present research from multiple sources.
Your deliverable is a Research Brief with 5-10 cited sources.
Be thorough, cite sources accurately, and present information objectively.`,

  ANA: `You are an Analyst specialist agent for the Algora governance system.
Your role is to analyze information and produce detailed analysis reports.
Your deliverable includes pros, cons, and risk assessments.
Be balanced, consider multiple perspectives, and identify non-obvious risks.`,

  DRA: `You are a Drafter specialist agent for the Algora governance system.
Your role is to draft official documents following templates and standards.
Your deliverable is a polished document ready for review.
Follow the provided template exactly and ensure all required fields are complete.`,

  REV: `You are a Reviewer specialist agent for the Algora governance system.
Your role is to review documents and identify issues or improvements.
Your deliverable is a Review Report with actionable feedback.
Be constructive, specific, and prioritize critical issues.`,

  RED: `You are a Red Team specialist agent for the Algora governance system.
Your role is to provide adversarial analysis and identify attack vectors.
Your deliverable identifies potential weaknesses and failure modes.
Think like an adversary, challenge assumptions, and identify edge cases.`,

  SUM: `You are a Summarizer specialist agent for the Algora governance system.
Your role is to distill complex information into concise summaries.
Your deliverable is an Executive Summary with 3 key bullet points.
Be concise, highlight the most important points, and use clear language.`,

  TRN: `You are a Translator specialist agent for the Algora governance system.
Your role is to translate documents between English and Korean.
Your deliverable is an accurate, natural-sounding translation.
Preserve meaning, tone, and technical terms accurately.`,

  ARC: `You are an Archivist specialist agent for the Algora governance system.
Your role is to create registry entries for official documents.
Your deliverable is a properly formatted registry entry.
Follow the exact format requirements and ensure all metadata is accurate.`,
};

/**
 * Specialist Manager for coordinating specialist subagents.
 *
 * Each specialist has a fixed, narrow deliverable and operates
 * within token limits defined in the spec.
 */
export class SpecialistManager {
  private config: OrchestratorConfig;
  private llmProvider: LLMProvider;
  private qualityGate: QualityGate;
  private taskQueue: TaskQueue;
  private listeners: SpecialistEventListener[] = [];
  private activeTaskCount: number = 0;

  constructor(options: SpecialistManagerOptions) {
    this.config = options.config || DEFAULT_ORCHESTRATOR_CONFIG;
    this.llmProvider = options.llmProvider;
    this.qualityGate = options.qualityGate || new DefaultQualityGate(this.config.minConfidenceScore);
    this.taskQueue = options.taskQueue || new InMemoryTaskQueue();
  }

  /**
   * Get specialist definition.
   */
  getSpecialist(code: SpecialistCode): SpecialistDefinition {
    return SPECIALISTS[code];
  }

  /**
   * Create and queue a specialist task.
   */
  async createTask(
    specialistCode: SpecialistCode,
    workflowStateId: string,
    prompt: string,
    context: Record<string, unknown> = {}
  ): Promise<SpecialistTask> {
    const spec = this.getSpecialist(specialistCode);
    const task: SpecialistTask = {
      id: this.generateId(),
      specialistCode,
      prompt,
      context,
      maxTokens: spec.maxTokens,
      status: 'pending',
      createdAt: new Date(),
    };

    await this.taskQueue.enqueue(task);
    this.emit({
      type: 'task:assigned',
      taskId: task.id,
      specialistCode,
      timestamp: new Date(),
      metadata: { workflowStateId },
    });

    return task;
  }

  /**
   * Execute a specialist task.
   */
  async executeTask(taskId: string): Promise<SpecialistOutput> {
    const task = await this.taskQueue.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    if (this.activeTaskCount >= this.config.maxConcurrentTasks) {
      throw new Error('Max concurrent tasks reached');
    }

    // Update status
    await this.taskQueue.update(taskId, { status: 'executing' });
    this.activeTaskCount++;

    this.emit({
      type: 'task:started',
      taskId,
      specialistCode: task.specialistCode,
      timestamp: new Date(),
    });

    try {
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Task timeout')), this.config.taskTimeoutMs);
      });

      // Execute with timeout
      const result = await Promise.race([
        this.runSpecialist(task),
        timeoutPromise,
      ]);

      // Validate output
      const validation = await this.qualityGate.validate(
        result.content,
        task.specialistCode,
        task.context
      );

      const output: SpecialistOutput = {
        id: this.generateId(),
        specialistCode: task.specialistCode,
        agentId: `${task.specialistCode}-agent`,
        workflowStateId: (task.context.workflowStateId as string) || '',
        outputType: SPECIALISTS[task.specialistCode].deliverable,
        content: result.content,
        contentHash: this.hashContent(result.content),
        modelUsed: result.model,
        tokenCount: result.tokenCount,
        costUsd: result.costUsd,
        confidenceScore: validation.confidence,
        qualityGatePassed: validation.passed,
        createdAt: new Date(),
      };

      // Update task
      await this.taskQueue.update(taskId, {
        status: 'completed',
        output,
        completedAt: new Date(),
      });

      this.emit({
        type: 'task:completed',
        taskId,
        specialistCode: task.specialistCode,
        timestamp: new Date(),
        metadata: {
          tokenCount: result.tokenCount,
          costUsd: result.costUsd,
          confidence: validation.confidence,
        },
      });

      if (validation.passed) {
        this.emit({
          type: 'output:validated',
          taskId,
          specialistCode: task.specialistCode,
          timestamp: new Date(),
        });
      } else {
        this.emit({
          type: 'output:rejected',
          taskId,
          specialistCode: task.specialistCode,
          timestamp: new Date(),
          metadata: { issues: validation.issues },
        });
      }

      return output;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const isTimeout = errorMessage === 'Task timeout';

      await this.taskQueue.update(taskId, { status: 'failed' });

      this.emit({
        type: isTimeout ? 'task:timeout' : 'task:failed',
        taskId,
        specialistCode: task.specialistCode,
        timestamp: new Date(),
        metadata: { error: errorMessage },
      });

      throw error;
    } finally {
      this.activeTaskCount--;
    }
  }

  /**
   * Execute the next pending task.
   */
  async executeNext(): Promise<SpecialistOutput | null> {
    const task = await this.taskQueue.dequeue();
    if (!task) return null;
    return this.executeTask(task.id);
  }

  /**
   * Get pending tasks count.
   */
  async getPendingCount(): Promise<number> {
    const pending = await this.taskQueue.getByStatus('pending');
    return pending.length;
  }

  /**
   * Get active tasks count.
   */
  getActiveCount(): number {
    return this.activeTaskCount;
  }

  /**
   * Get all tasks for a specialist code.
   */
  async getTasksBySpecialist(code: SpecialistCode): Promise<SpecialistTask[]> {
    const allStatuses: SpecialistTask['status'][] = [
      'pending',
      'assigned',
      'executing',
      'completed',
      'failed',
    ];
    const tasks: SpecialistTask[] = [];
    for (const status of allStatuses) {
      const statusTasks = await this.taskQueue.getByStatus(status);
      tasks.push(...statusTasks.filter((t) => t.specialistCode === code));
    }
    return tasks;
  }

  /**
   * Get specialists needed for a workflow state.
   */
  getSpecialistsForState(state: WorkflowState): SpecialistCode[] {
    const stateSpecialists: Record<WorkflowState, SpecialistCode[]> = {
      INTAKE: [],
      TRIAGE: ['ANA'],
      RESEARCH: ['RES'],
      DELIBERATION: ['ANA', 'RED'],
      DECISION_PACKET: ['DRA', 'ANA', 'RED'],
      REVIEW: ['REV'],
      PUBLISH: ['ARC', 'TRN'],
      EXEC_LOCKED: [],
      OUTCOME_PROOF: ['ANA'],
      COMPLETED: ['SUM', 'ARC'],
      REJECTED: ['ARC'],
      ARCHIVED: [],
    };
    return stateSpecialists[state] || [];
  }

  /**
   * Subscribe to specialist events.
   */
  subscribe(listener: SpecialistEventListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * Run a specialist task using the LLM provider.
   */
  private async runSpecialist(task: SpecialistTask): Promise<{
    content: string;
    model: string;
    tokenCount: number;
    costUsd: number;
  }> {
    const systemPrompt = SPECIALIST_SYSTEM_PROMPTS[task.specialistCode];

    // Build context string
    const contextStr = Object.entries(task.context)
      .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
      .join('\n');

    const fullPrompt = contextStr
      ? `Context:\n${contextStr}\n\nTask:\n${task.prompt}`
      : task.prompt;

    return this.llmProvider.generate({
      prompt: fullPrompt,
      maxTokens: task.maxTokens,
      systemPrompt,
      temperature: 0.7,
    });
  }

  /**
   * Generate a unique ID.
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Hash content for provenance.
   */
  private hashContent(content: string): string {
    // Simple hash for demo - in production use crypto
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return `sha256:${Math.abs(hash).toString(16).padStart(16, '0')}`;
  }

  /**
   * Emit an event to all listeners.
   */
  private emit(event: SpecialistEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in specialist event listener:', error);
      }
    }
  }
}

/**
 * Create a mock LLM provider for testing.
 */
export function createMockLLMProvider(): LLMProvider {
  return {
    async generate(options) {
      // Simulate delay
      await new Promise((resolve) => setTimeout(resolve, 100));

      return {
        content: `[Mock output for prompt: ${options.prompt.substring(0, 50)}...]

This is a mock response generated for testing purposes.
The specialist would normally produce detailed output here.

Key points:
- Point 1: Relevant analysis
- Point 2: Supporting evidence
- Point 3: Recommendations

Sources:
1. Source 1 (mock)
2. Source 2 (mock)
3. Source 3 (mock)`,
        model: 'mock-model-v1',
        tokenCount: Math.min(options.maxTokens, 500),
        costUsd: 0.001,
      };
    },
  };
}
