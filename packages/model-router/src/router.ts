// ===========================================
// Model Router for Algora v2.0
// ===========================================

import type {
  Task,
  TaskClassification,
  ModelSelection,
  ModelRouterConfig,
  GenerationResult,
  DifficultyLevel,
  LLMTier,
  ModelEntry,
  ModelRouterStats,
  ModelRouterEvents,
} from './types.js';
import { DEFAULT_MODEL_ROUTER_CONFIG, DEFAULT_MODEL_SELECTIONS } from './types.js';
import { ModelRegistry } from './registry.js';
import { TaskDifficultyClassifier } from './classifier.js';
import { QualityGate } from './quality-gate.js';

/**
 * LLM Provider interface for generating completions.
 */
export interface LLMProvider {
  generate(
    model: string,
    prompt: string,
    options?: {
      systemPrompt?: string;
      maxTokens?: number;
      temperature?: number;
    }
  ): Promise<GenerationResult>;
}

/**
 * Mock LLM provider for testing.
 */
export class MockLLMProvider implements LLMProvider {
  async generate(
    model: string,
    prompt: string,
    options?: {
      systemPrompt?: string;
      maxTokens?: number;
      temperature?: number;
    }
  ): Promise<GenerationResult> {
    // Simulate generation delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    const content = `[Mock response from ${model}]\n\nPrompt: ${prompt.substring(0, 100)}...`;
    const promptTokens = Math.ceil(prompt.length / 4);
    const completionTokens = Math.ceil(content.length / 4);

    return {
      content,
      model,
      provider: 'ollama',
      usage: {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
      },
      latencyMs: 100 + Math.random() * 200,
      costUsd: 0,
      finishReason: 'stop',
      metadata: {
        maxTokens: options?.maxTokens,
        temperature: options?.temperature,
      },
    };
  }
}

/**
 * Options for the model router.
 */
export interface ModelRouterOptions {
  config?: Partial<ModelRouterConfig>;
  registry?: ModelRegistry;
  classifier?: TaskDifficultyClassifier;
  qualityGate?: QualityGate;
  llmProvider?: LLMProvider;
}

/**
 * Model Router for intelligent task-to-model routing.
 *
 * Routes tasks to appropriate LLM models based on difficulty,
 * capabilities, cost, and availability.
 */
export class ModelRouter {
  private config: ModelRouterConfig;
  private registry: ModelRegistry;
  private classifier: TaskDifficultyClassifier;
  private qualityGate: QualityGate;
  private llmProvider: LLMProvider;
  private eventListeners: Map<string, Set<(data: unknown) => void>> = new Map();
  private stats: ModelRouterStats = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    totalTokens: 0,
    totalCostUsd: 0,
    averageLatencyMs: 0,
    modelUsage: {},
    tierUsage: { 0: 0, 1: 0, 2: 0 },
    qualityPassRate: 0,
  };
  private qualityChecks: { passed: boolean }[] = [];
  private latencies: number[] = [];

  constructor(options?: ModelRouterOptions) {
    this.config = {
      ...DEFAULT_MODEL_ROUTER_CONFIG,
      ...options?.config,
    };
    this.registry = options?.registry || new ModelRegistry();
    this.classifier = options?.classifier || new TaskDifficultyClassifier();
    this.qualityGate = options?.qualityGate || new QualityGate();
    this.llmProvider = options?.llmProvider || new MockLLMProvider();
  }

  /**
   * Route a task to the best available model.
   */
  async route(task: Task): Promise<ModelSelection> {
    // Classify the task
    const classification = this.classifier.classify(task);

    // Get base selection for difficulty level
    const baseSelection = DEFAULT_MODEL_SELECTIONS[classification.difficulty];

    // Find available models
    const availableModels = await this.findAvailableModels(classification);

    // Select primary model
    const primaryModel = await this.selectPrimaryModel(
      classification,
      availableModels,
      baseSelection.primaryModel
    );

    // Build fallback chain
    const fallbackModels = await this.buildFallbackChain(
      classification,
      availableModels,
      primaryModel,
      baseSelection.fallbackModels
    );

    // Check budget constraints
    const tier = this.determineTier(classification, primaryModel);
    if (tier === 2 && !this.checkBudget()) {
      // Force Tier 1 if budget exceeded
      return this.fallbackToTier1(classification, availableModels);
    }

    const selection: ModelSelection = {
      primaryModel,
      fallbackModels,
      tier,
      maxRetries: baseSelection.maxRetries,
      qualityGate: baseSelection.qualityGate,
      reasoning: this.generateSelectionReasoning(classification, primaryModel, tier),
    };

    this.emit('model:selected', { task, selection });
    return selection;
  }

  /**
   * Execute a task with automatic fallback.
   */
  async execute(task: Task): Promise<GenerationResult> {
    const selection = await this.route(task);
    const modelsToTry = [selection.primaryModel, ...selection.fallbackModels];
    const triedModels: string[] = [];
    let lastError: Error | null = null;

    for (const modelId of modelsToTry) {
      if (triedModels.length >= selection.maxRetries) {
        break;
      }

      try {
        this.emit('generation:started', { task, model: modelId });
        this.stats.totalRequests++;

        const result = await this.llmProvider.generate(
          modelId,
          task.prompt,
          {
            systemPrompt: task.systemPrompt,
            maxTokens: task.maxTokens,
            temperature: task.temperature,
          }
        );

        // Track stats
        this.updateStats(result, selection.tier);

        // Quality check if enabled
        if (selection.qualityGate.enabled) {
          const qualityResult = this.qualityGate.check(result.content, {
            minConfidence: selection.qualityGate.minConfidence,
            expectedFormat: task.outputFormat,
          });

          result.qualityCheck = qualityResult;
          this.qualityChecks.push({ passed: qualityResult.passed });

          this.emit('quality:checked', { task, result: qualityResult });

          if (!qualityResult.passed) {
            this.emit('quality:failed', { task, result: qualityResult });

            if (selection.qualityGate.escalateOnFailure) {
              // Try next model
              triedModels.push(modelId);
              continue;
            }
          }
        }

        this.stats.successfulRequests++;
        this.emit('generation:completed', { task, result });
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        triedModels.push(modelId);

        this.emit('generation:failed', {
          task,
          model: modelId,
          error: lastError.message,
        });

        if (modelsToTry[modelsToTry.indexOf(modelId) + 1]) {
          this.emit('model:fallback', {
            task,
            failedModel: modelId,
            nextModel: modelsToTry[modelsToTry.indexOf(modelId) + 1],
            error: lastError.message,
          });
        }
      }
    }

    this.stats.failedRequests++;
    this.emit('model:exhausted', {
      task,
      triedModels,
      error: lastError?.message || 'All models failed',
    });

    throw new Error(
      `All models exhausted. Tried: ${triedModels.join(', ')}. Last error: ${lastError?.message}`
    );
  }

  /**
   * Find available models matching classification requirements.
   */
  private async findAvailableModels(
    classification: TaskClassification
  ): Promise<ModelEntry[]> {
    return this.registry.findModels({
      capabilities: classification.task.requiredCapabilities,
      languages: classification.task.language
        ? [classification.task.language]
        : undefined,
      availableOnly: true,
    });
  }

  /**
   * Select the primary model for a task.
   */
  private async selectPrimaryModel(
    classification: TaskClassification,
    availableModels: ModelEntry[],
    preferredModel: string
  ): Promise<string> {
    // Check if preferred model is available
    const preferred = availableModels.find((m) => m.id === preferredModel);
    if (preferred) {
      return preferredModel;
    }

    // Find best alternative
    const tier = classification.requiresTier2 ? 2 : 1;
    const alternatives = availableModels.filter((m) => m.tier <= tier);

    if (alternatives.length === 0) {
      // Fall back to any available model
      if (availableModels.length > 0) {
        return availableModels[0].id;
      }
      return preferredModel; // Return preferred even if unavailable
    }

    // Sort by cost (prefer cheaper)
    alternatives.sort((a, b) => a.costPer1kTokens - b.costPer1kTokens);
    return alternatives[0].id;
  }

  /**
   * Build fallback chain for a task.
   */
  private async buildFallbackChain(
    _classification: TaskClassification,
    availableModels: ModelEntry[],
    primaryModel: string,
    preferredFallbacks: string[]
  ): Promise<string[]> {
    const fallbacks: string[] = [];

    // Add preferred fallbacks that are available
    for (const fallback of preferredFallbacks) {
      if (availableModels.some((m) => m.id === fallback)) {
        fallbacks.push(fallback);
      }
    }

    // Add additional available models
    for (const model of availableModels) {
      if (
        model.id !== primaryModel &&
        !fallbacks.includes(model.id) &&
        fallbacks.length < 3
      ) {
        fallbacks.push(model.id);
      }
    }

    return fallbacks;
  }

  /**
   * Determine the appropriate tier for a task.
   */
  private determineTier(
    classification: TaskClassification,
    _primaryModel: string
  ): LLMTier {
    if (classification.requiresTier2) {
      return 2;
    }

    // Default to Tier 1 for non-critical tasks
    return 1;
  }

  /**
   * Check if budget allows Tier 2 usage.
   */
  private checkBudget(): boolean {
    const percentUsed =
      (this.config.budgetSpentToday / this.config.dailyBudgetUsd) * 100;

    if (percentUsed >= 80) {
      this.emit('budget:warning', {
        spent: this.config.budgetSpentToday,
        budget: this.config.dailyBudgetUsd,
        percentage: percentUsed,
      });
    }

    if (this.config.budgetSpentToday >= this.config.dailyBudgetUsd) {
      this.emit('budget:exceeded', {
        spent: this.config.budgetSpentToday,
        budget: this.config.dailyBudgetUsd,
      });
      return false;
    }

    return true;
  }

  /**
   * Fall back to Tier 1 models when budget is exceeded.
   */
  private async fallbackToTier1(
    classification: TaskClassification,
    availableModels: ModelEntry[]
  ): Promise<ModelSelection> {
    const tier1Models = availableModels.filter((m) => m.tier === 1);

    if (tier1Models.length === 0) {
      throw new Error('No Tier 1 models available for budget fallback');
    }

    // Sort by capability match and speed
    tier1Models.sort((a, b) => b.tokensPerSecond - a.tokensPerSecond);

    const baseSelection = DEFAULT_MODEL_SELECTIONS[classification.difficulty];

    return {
      primaryModel: tier1Models[0].id,
      fallbackModels: tier1Models.slice(1, 3).map((m) => m.id),
      tier: 1,
      maxRetries: baseSelection.maxRetries,
      qualityGate: baseSelection.qualityGate,
      reasoning: `Budget exceeded. Falling back to Tier 1 model: ${tier1Models[0].id}`,
    };
  }

  /**
   * Generate reasoning for model selection.
   */
  private generateSelectionReasoning(
    classification: TaskClassification,
    primaryModel: string,
    tier: LLMTier
  ): string {
    const parts: string[] = [];

    parts.push(`Task difficulty: ${classification.difficulty}`);
    parts.push(`Selected model: ${primaryModel}`);
    parts.push(`Tier: ${tier}`);

    if (classification.requiresTier2) {
      parts.push('Tier 2 required for critical task');
    }

    if (classification.requiresReview) {
      parts.push('Human review required');
    }

    return parts.join('. ');
  }

  /**
   * Update statistics after a generation.
   */
  private updateStats(result: GenerationResult, tier: LLMTier): void {
    this.stats.totalTokens += result.usage.totalTokens;
    this.stats.totalCostUsd += result.costUsd;
    this.config.budgetSpentToday += result.costUsd;

    this.latencies.push(result.latencyMs);
    this.stats.averageLatencyMs =
      this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length;

    this.stats.modelUsage[result.model] =
      (this.stats.modelUsage[result.model] || 0) + 1;
    this.stats.tierUsage[tier] = (this.stats.tierUsage[tier] || 0) + 1;

    if (this.qualityChecks.length > 0) {
      const passed = this.qualityChecks.filter((q) => q.passed).length;
      this.stats.qualityPassRate = (passed / this.qualityChecks.length) * 100;
    }
  }

  /**
   * Get router statistics.
   */
  getStats(): ModelRouterStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics.
   */
  resetStats(options?: {
    resetBudget?: boolean;
    resetModelUsage?: boolean;
    resetQualityStats?: boolean;
  }): void {
    this.stats.totalRequests = 0;
    this.stats.successfulRequests = 0;
    this.stats.failedRequests = 0;
    this.stats.totalTokens = 0;
    this.latencies = [];
    this.stats.averageLatencyMs = 0;

    if (options?.resetBudget) {
      this.config.budgetSpentToday = 0;
      this.stats.totalCostUsd = 0;
    }

    if (options?.resetModelUsage) {
      this.stats.modelUsage = {};
      this.stats.tierUsage = { 0: 0, 1: 0, 2: 0 };
    }

    if (options?.resetQualityStats) {
      this.qualityChecks = [];
      this.stats.qualityPassRate = 0;
    }
  }

  /**
   * Get the current budget status.
   */
  getBudgetStatus(): {
    spent: number;
    budget: number;
    remaining: number;
    percentUsed: number;
  } {
    const remaining = Math.max(
      0,
      this.config.dailyBudgetUsd - this.config.budgetSpentToday
    );
    const percentUsed =
      (this.config.budgetSpentToday / this.config.dailyBudgetUsd) * 100;

    return {
      spent: this.config.budgetSpentToday,
      budget: this.config.dailyBudgetUsd,
      remaining,
      percentUsed,
    };
  }

  /**
   * Set the daily budget.
   */
  setDailyBudget(budgetUsd: number): void {
    this.config.dailyBudgetUsd = budgetUsd;
  }

  /**
   * Reset daily budget (call at midnight).
   */
  resetDailyBudget(): void {
    this.config.budgetSpentToday = 0;
  }

  /**
   * Get the model registry.
   */
  getRegistry(): ModelRegistry {
    return this.registry;
  }

  /**
   * Get the classifier.
   */
  getClassifier(): TaskDifficultyClassifier {
    return this.classifier;
  }

  /**
   * Get the quality gate.
   */
  getQualityGate(): QualityGate {
    return this.qualityGate;
  }

  /**
   * Subscribe to router events.
   */
  on<K extends keyof ModelRouterEvents>(
    event: K,
    callback: (data: ModelRouterEvents[K]) => void
  ): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback as (data: unknown) => void);
  }

  /**
   * Unsubscribe from router events.
   */
  off<K extends keyof ModelRouterEvents>(
    event: K,
    callback: (data: ModelRouterEvents[K]) => void
  ): void {
    this.eventListeners.get(event)?.delete(callback as (data: unknown) => void);
  }

  /**
   * Emit an event.
   */
  private emit<K extends keyof ModelRouterEvents>(
    event: K,
    data: ModelRouterEvents[K]
  ): void {
    this.eventListeners.get(event)?.forEach((callback) => callback(data));
  }

  /**
   * Classify a task without routing.
   */
  classify(task: Task): TaskClassification {
    return this.classifier.classify(task);
  }

  /**
   * Get recommended model for a difficulty level.
   */
  getRecommendedModel(difficulty: DifficultyLevel): ModelSelection {
    const base = DEFAULT_MODEL_SELECTIONS[difficulty];
    return {
      ...base,
      reasoning: `Default selection for ${difficulty} difficulty`,
    };
  }
}

/**
 * Create a model router with default configuration.
 */
export function createModelRouter(
  options?: ModelRouterOptions
): ModelRouter {
  const router = new ModelRouter(options);
  return router;
}

/**
 * Create a model router with pre-seeded registry.
 */
export async function createModelRouterWithDefaults(
  options?: ModelRouterOptions
): Promise<ModelRouter> {
  const registry = options?.registry || new ModelRegistry();
  await registry.seedDefaultModels();

  return new ModelRouter({
    ...options,
    registry,
  });
}
