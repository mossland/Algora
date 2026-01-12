// ===========================================
// Task Difficulty Classifier for Algora v2.0
// ===========================================

import type {
  Task,
  TaskType,
  TaskClassification,
  DifficultyLevel,
  DifficultyRules,
} from './types.js';
import { DEFAULT_DIFFICULTY_RULES } from './types.js';

/**
 * Classification criteria for a task.
 */
export interface ClassificationCriteria {
  /** Prompt length in characters */
  promptLength: number;
  /** Estimated token count */
  estimatedTokens: number;
  /** Task type */
  taskType: TaskType;
  /** Required capabilities count */
  requiredCapabilitiesCount: number;
  /** Is high-stakes decision */
  isHighStakes: boolean;
  /** Requires external data */
  requiresExternalData: boolean;
  /** Is multi-step reasoning */
  isMultiStep: boolean;
  /** Language other than English */
  isNonEnglish: boolean;
}

/**
 * Keyword patterns for difficulty detection.
 */
const DIFFICULTY_KEYWORDS: Record<DifficultyLevel, string[]> = {
  trivial: [
    'hello',
    'hi',
    'thanks',
    'status',
    'check',
    'ping',
    'test',
    'simple',
    'quick',
  ],
  simple: [
    'summarize',
    'list',
    'format',
    'tag',
    'translate',
    'short',
    'brief',
    'overview',
  ],
  moderate: [
    'analyze',
    'compare',
    'research',
    'evaluate',
    'assess',
    'review',
    'investigate',
    'options',
  ],
  complex: [
    'decision',
    'strategy',
    'deliberate',
    'architecture',
    'design',
    'recommend',
    'proposal',
    'synthesis',
  ],
  critical: [
    'treasury',
    'partnership',
    'security',
    'audit',
    'critical',
    'high-risk',
    'agreement',
    'contract',
    'fund',
    'allocation',
  ],
};

/**
 * Task type to base difficulty mapping.
 */
const TASK_TYPE_BASE_DIFFICULTY: Record<TaskType, DifficultyLevel> = {
  chatter: 'trivial',
  scouting: 'simple',
  summarization: 'simple',
  translation: 'simple',
  embedding: 'trivial',
  reranking: 'trivial',
  debate: 'moderate',
  research: 'moderate',
  coding: 'moderate',
  vision: 'moderate',
  korean: 'moderate',
  core_decision: 'complex',
  complex_analysis: 'critical',
};

/**
 * High-stakes indicators in prompts.
 */
const HIGH_STAKES_PATTERNS = [
  /treasury/i,
  /fund\s*(transfer|allocation|disbursement)/i,
  /partnership\s*(agreement|proposal)/i,
  /security\s*(audit|review|vulnerability)/i,
  /contract\s*(deploy|execution)/i,
  /high[-\s]?risk/i,
  /critical\s*(decision|issue)/i,
  /\$\d+[,\d]*[kKmM]?/,  // Dollar amounts
  /\d+\s*(MOC|ETH|BTC|USD)/i,  // Cryptocurrency amounts
];

/**
 * Multi-step reasoning indicators.
 */
const MULTI_STEP_PATTERNS = [
  /first.*then.*finally/i,
  /step\s*\d/i,
  /analyze.*evaluate.*recommend/i,
  /consider.*compare.*decide/i,
  /research.*synthesize.*propose/i,
  /multiple\s*(options|approaches|factors)/i,
];

/**
 * Options for the classifier.
 */
export interface ClassifierOptions {
  difficultyRules?: Record<DifficultyLevel, DifficultyRules>;
  customKeywords?: Record<DifficultyLevel, string[]>;
  tokenEstimationRatio?: number;
}

/**
 * Task Difficulty Classifier.
 *
 * Classifies tasks by difficulty to determine appropriate model selection.
 */
export class TaskDifficultyClassifier {
  private difficultyRules: Record<DifficultyLevel, DifficultyRules>;
  private keywords: Record<DifficultyLevel, string[]>;
  private tokenEstimationRatio: number;

  constructor(options?: ClassifierOptions) {
    this.difficultyRules = options?.difficultyRules || DEFAULT_DIFFICULTY_RULES;
    this.keywords = {
      ...DIFFICULTY_KEYWORDS,
      ...options?.customKeywords,
    };
    // Rough estimate: 1 token ≈ 4 characters
    this.tokenEstimationRatio = options?.tokenEstimationRatio || 4;
  }

  /**
   * Classify a task's difficulty.
   */
  classify(task: Task): TaskClassification {
    const criteria = this.extractCriteria(task);
    const difficulty = this.determineDifficulty(criteria, task);
    const rules = this.difficultyRules[difficulty];

    return {
      task,
      difficulty,
      confidence: this.calculateConfidence(criteria, difficulty),
      reasoning: this.generateReasoning(criteria, difficulty),
      suggestedTokens: rules.maxTokens,
      requiresTier2: rules.requiresTier2 || false,
      requiresReview: rules.requiresReview || false,
    };
  }

  /**
   * Extract classification criteria from a task.
   */
  private extractCriteria(task: Task): ClassificationCriteria {
    const prompt = task.prompt + (task.systemPrompt || '');

    return {
      promptLength: prompt.length,
      estimatedTokens: Math.ceil(prompt.length / this.tokenEstimationRatio),
      taskType: task.type,
      requiredCapabilitiesCount: task.requiredCapabilities?.length || 0,
      isHighStakes: this.detectHighStakes(prompt),
      requiresExternalData: this.detectExternalDataNeed(prompt),
      isMultiStep: this.detectMultiStep(prompt),
      isNonEnglish: task.language !== undefined && task.language !== 'en',
    };
  }

  /**
   * Determine the difficulty level based on criteria.
   */
  private determineDifficulty(
    criteria: ClassificationCriteria,
    task: Task
  ): DifficultyLevel {
    // Start with base difficulty from task type
    let baseDifficulty = TASK_TYPE_BASE_DIFFICULTY[criteria.taskType];

    // Check for high-stakes indicators
    if (criteria.isHighStakes) {
      baseDifficulty = this.escalateDifficulty(baseDifficulty, 'critical');
    }

    // Check for multi-step reasoning
    if (criteria.isMultiStep && baseDifficulty !== 'critical') {
      baseDifficulty = this.escalateDifficulty(baseDifficulty, 'complex');
    }

    // Check for keyword matches
    const keywordDifficulty = this.detectKeywordDifficulty(task.prompt);
    if (keywordDifficulty) {
      baseDifficulty = this.maxDifficulty(baseDifficulty, keywordDifficulty);
    }

    // Check token estimation
    const tokenDifficulty = this.difficultyFromTokens(criteria.estimatedTokens);
    baseDifficulty = this.maxDifficulty(baseDifficulty, tokenDifficulty);

    // Multiple required capabilities increases complexity
    if (criteria.requiredCapabilitiesCount > 2) {
      baseDifficulty = this.escalateDifficulty(baseDifficulty, 'complex');
    }

    return baseDifficulty;
  }

  /**
   * Detect if task involves high-stakes decisions.
   */
  private detectHighStakes(prompt: string): boolean {
    return HIGH_STAKES_PATTERNS.some((pattern) => pattern.test(prompt));
  }

  /**
   * Detect if task requires external data/research.
   */
  private detectExternalDataNeed(prompt: string): boolean {
    const patterns = [
      /research/i,
      /find\s*(information|data|sources)/i,
      /look\s*up/i,
      /investigate/i,
      /current\s*(state|status|price|value)/i,
    ];
    return patterns.some((pattern) => pattern.test(prompt));
  }

  /**
   * Detect if task requires multi-step reasoning.
   */
  private detectMultiStep(prompt: string): boolean {
    return MULTI_STEP_PATTERNS.some((pattern) => pattern.test(prompt));
  }

  /**
   * Detect difficulty from keyword matches.
   */
  private detectKeywordDifficulty(prompt: string): DifficultyLevel | null {
    const lowercasePrompt = prompt.toLowerCase();
    const levels: DifficultyLevel[] = [
      'critical',
      'complex',
      'moderate',
      'simple',
      'trivial',
    ];

    for (const level of levels) {
      const keywords = this.keywords[level];
      if (keywords.some((keyword) => lowercasePrompt.includes(keyword))) {
        return level;
      }
    }

    return null;
  }

  /**
   * Determine difficulty based on token count.
   */
  private difficultyFromTokens(tokens: number): DifficultyLevel {
    if (tokens <= 100) return 'trivial';
    if (tokens <= 300) return 'simple';
    if (tokens <= 800) return 'moderate';
    if (tokens <= 2000) return 'complex';
    return 'critical';
  }

  /**
   * Get the maximum of two difficulty levels.
   */
  private maxDifficulty(a: DifficultyLevel, b: DifficultyLevel): DifficultyLevel {
    const order: DifficultyLevel[] = [
      'trivial',
      'simple',
      'moderate',
      'complex',
      'critical',
    ];
    const indexA = order.indexOf(a);
    const indexB = order.indexOf(b);
    return order[Math.max(indexA, indexB)];
  }

  /**
   * Escalate difficulty to at least the target level.
   */
  private escalateDifficulty(
    current: DifficultyLevel,
    target: DifficultyLevel
  ): DifficultyLevel {
    return this.maxDifficulty(current, target);
  }

  /**
   * Calculate confidence score for the classification.
   */
  private calculateConfidence(
    criteria: ClassificationCriteria,
    difficulty: DifficultyLevel
  ): number {
    let confidence = 70; // Base confidence

    // Higher confidence if task type matches expected difficulty
    const expectedDifficulty = TASK_TYPE_BASE_DIFFICULTY[criteria.taskType];
    if (expectedDifficulty === difficulty) {
      confidence += 15;
    }

    // Higher confidence for clear high-stakes indicators
    if (criteria.isHighStakes && difficulty === 'critical') {
      confidence += 10;
    }

    // Lower confidence for ambiguous cases
    if (criteria.isMultiStep && difficulty === 'trivial') {
      confidence -= 20;
    }

    // Cap confidence at 95%
    return Math.min(95, Math.max(30, confidence));
  }

  /**
   * Generate reasoning for the classification.
   */
  private generateReasoning(
    criteria: ClassificationCriteria,
    difficulty: DifficultyLevel
  ): string {
    const reasons: string[] = [];

    reasons.push(`Task type '${criteria.taskType}' suggests ${TASK_TYPE_BASE_DIFFICULTY[criteria.taskType]} difficulty`);

    if (criteria.isHighStakes) {
      reasons.push('High-stakes indicators detected');
    }

    if (criteria.isMultiStep) {
      reasons.push('Multi-step reasoning required');
    }

    if (criteria.estimatedTokens > 1000) {
      reasons.push(`Large prompt (${criteria.estimatedTokens} estimated tokens)`);
    }

    if (criteria.requiredCapabilitiesCount > 1) {
      reasons.push(`Multiple capabilities required (${criteria.requiredCapabilitiesCount})`);
    }

    if (criteria.isNonEnglish) {
      reasons.push('Non-English language task');
    }

    return `Classified as ${difficulty}: ${reasons.join('; ')}`;
  }

  /**
   * Batch classify multiple tasks.
   */
  classifyBatch(tasks: Task[]): TaskClassification[] {
    return tasks.map((task) => this.classify(task));
  }

  /**
   * Get difficulty rules.
   */
  getDifficultyRules(): Record<DifficultyLevel, DifficultyRules> {
    return { ...this.difficultyRules };
  }

  /**
   * Update difficulty rules.
   */
  setDifficultyRules(rules: Partial<Record<DifficultyLevel, DifficultyRules>>): void {
    this.difficultyRules = {
      ...this.difficultyRules,
      ...rules,
    };
  }

  /**
   * Add custom keywords for difficulty detection.
   */
  addKeywords(level: DifficultyLevel, keywords: string[]): void {
    this.keywords[level] = [...(this.keywords[level] || []), ...keywords];
  }

  /**
   * Get classification statistics.
   */
  getClassificationStats(classifications: TaskClassification[]): {
    byDifficulty: Record<DifficultyLevel, number>;
    averageConfidence: number;
    requiresTier2Count: number;
    requiresReviewCount: number;
  } {
    const byDifficulty: Record<DifficultyLevel, number> = {
      trivial: 0,
      simple: 0,
      moderate: 0,
      complex: 0,
      critical: 0,
    };

    let totalConfidence = 0;
    let tier2Count = 0;
    let reviewCount = 0;

    for (const classification of classifications) {
      byDifficulty[classification.difficulty]++;
      totalConfidence += classification.confidence;
      if (classification.requiresTier2) tier2Count++;
      if (classification.requiresReview) reviewCount++;
    }

    return {
      byDifficulty,
      averageConfidence: classifications.length > 0
        ? totalConfidence / classifications.length
        : 0,
      requiresTier2Count: tier2Count,
      requiresReviewCount: reviewCount,
    };
  }
}

/**
 * Create a quick classification for a prompt string.
 */
export function quickClassify(
  prompt: string,
  taskType: TaskType = 'core_decision'
): DifficultyLevel {
  const classifier = new TaskDifficultyClassifier();
  const task: Task = {
    id: 'quick-' + Date.now(),
    type: taskType,
    prompt,
    createdAt: new Date(),
  };
  return classifier.classify(task).difficulty;
}

/**
 * Estimate token count from text.
 */
export function estimateTokens(text: string, ratio: number = 4): number {
  return Math.ceil(text.length / ratio);
}
