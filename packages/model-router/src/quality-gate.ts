// ===========================================
// Quality Gate for Algora v2.0
// ===========================================

import type {
  QualityCheckResult,
  QualityIssue,
  QualityGateConfig,
} from './types.js';

/**
 * Quality check options.
 */
export interface QualityCheckOptions {
  /** Minimum confidence score (0-100) */
  minConfidence?: number;
  /** Expected output format */
  expectedFormat?: 'text' | 'json' | 'markdown';
  /** Minimum content length */
  minLength?: number;
  /** Maximum content length */
  maxLength?: number;
  /** Required keywords */
  requiredKeywords?: string[];
  /** Forbidden patterns */
  forbiddenPatterns?: RegExp[];
  /** Custom validators */
  customValidators?: QualityValidator[];
}

/**
 * Custom quality validator.
 */
export interface QualityValidator {
  name: string;
  validate: (content: string) => QualityIssue | null;
}

/**
 * Quality gate options.
 */
export interface QualityGateOptions {
  defaultConfig?: QualityGateConfig;
  validators?: QualityValidator[];
}

/**
 * Quality Gate validates LLM outputs against quality criteria.
 */
export class QualityGate {
  private defaultConfig: QualityGateConfig;
  private validators: QualityValidator[];

  constructor(options?: QualityGateOptions) {
    this.defaultConfig = options?.defaultConfig || {
      enabled: true,
      minConfidence: 70,
      requiresReview: false,
      escalateOnFailure: false,
    };
    this.validators = options?.validators || [];
  }

  /**
   * Check content quality.
   */
  check(content: string, options?: QualityCheckOptions): QualityCheckResult {
    const issues: QualityIssue[] = [];
    const suggestions: string[] = [];

    // Skip if empty content
    if (!content || content.trim().length === 0) {
      issues.push({
        type: 'content',
        severity: 'critical',
        message: 'Empty content',
      });
      return this.buildResult(issues, suggestions, 0, options);
    }

    // Length checks
    this.checkLength(content, options, issues, suggestions);

    // Format checks
    if (options?.expectedFormat) {
      this.checkFormat(content, options.expectedFormat, issues, suggestions);
    }

    // Keyword checks
    if (options?.requiredKeywords) {
      this.checkKeywords(content, options.requiredKeywords, issues, suggestions);
    }

    // Forbidden pattern checks
    if (options?.forbiddenPatterns) {
      this.checkForbiddenPatterns(content, options.forbiddenPatterns, issues);
    }

    // Safety checks
    this.checkSafety(content, issues);

    // Run custom validators
    for (const validator of this.validators) {
      const issue = validator.validate(content);
      if (issue) {
        issues.push(issue);
      }
    }

    // Run additional custom validators from options
    if (options?.customValidators) {
      for (const validator of options.customValidators) {
        const issue = validator.validate(content);
        if (issue) {
          issues.push(issue);
        }
      }
    }

    // Calculate confidence
    const confidence = this.calculateConfidence(content, issues);

    return this.buildResult(issues, suggestions, confidence, options);
  }

  /**
   * Check content length.
   */
  private checkLength(
    content: string,
    options: QualityCheckOptions | undefined,
    issues: QualityIssue[],
    suggestions: string[]
  ): void {
    const length = content.length;

    if (options?.minLength && length < options.minLength) {
      issues.push({
        type: 'length',
        severity: 'medium',
        message: `Content too short (${length} chars, minimum ${options.minLength})`,
      });
      suggestions.push('Expand the response with more detail');
    }

    if (options?.maxLength && length > options.maxLength) {
      issues.push({
        type: 'length',
        severity: 'low',
        message: `Content too long (${length} chars, maximum ${options.maxLength})`,
      });
      suggestions.push('Consider condensing the response');
    }

    // Default minimum length check
    if (length < 10) {
      issues.push({
        type: 'length',
        severity: 'high',
        message: 'Content suspiciously short',
      });
    }
  }

  /**
   * Check content format.
   */
  private checkFormat(
    content: string,
    expectedFormat: 'text' | 'json' | 'markdown',
    issues: QualityIssue[],
    suggestions: string[]
  ): void {
    switch (expectedFormat) {
      case 'json':
        try {
          JSON.parse(content);
        } catch {
          issues.push({
            type: 'format',
            severity: 'high',
            message: 'Invalid JSON format',
          });
          suggestions.push('Ensure output is valid JSON');
        }
        break;

      case 'markdown':
        // Check for basic markdown structure
        if (!this.hasMarkdownStructure(content)) {
          issues.push({
            type: 'format',
            severity: 'low',
            message: 'Missing markdown structure',
          });
          suggestions.push('Add headings or formatting to improve readability');
        }
        break;

      case 'text':
        // No specific format requirements
        break;
    }
  }

  /**
   * Check if content has markdown structure.
   */
  private hasMarkdownStructure(content: string): boolean {
    const markdownPatterns = [
      /^#+\s/m,           // Headings
      /^\*\s/m,           // Unordered lists
      /^\d+\.\s/m,        // Ordered lists
      /\*\*[^*]+\*\*/,    // Bold
      /`[^`]+`/,          // Code
      /\[[^\]]+\]\([^)]+\)/,  // Links
    ];

    return markdownPatterns.some((pattern) => pattern.test(content));
  }

  /**
   * Check for required keywords.
   */
  private checkKeywords(
    content: string,
    requiredKeywords: string[],
    issues: QualityIssue[],
    suggestions: string[]
  ): void {
    const lowercaseContent = content.toLowerCase();
    const missingKeywords: string[] = [];

    for (const keyword of requiredKeywords) {
      if (!lowercaseContent.includes(keyword.toLowerCase())) {
        missingKeywords.push(keyword);
      }
    }

    if (missingKeywords.length > 0) {
      issues.push({
        type: 'content',
        severity: 'medium',
        message: `Missing required keywords: ${missingKeywords.join(', ')}`,
      });
      suggestions.push(`Include: ${missingKeywords.join(', ')}`);
    }
  }

  /**
   * Check for forbidden patterns.
   */
  private checkForbiddenPatterns(
    content: string,
    forbiddenPatterns: RegExp[],
    issues: QualityIssue[]
  ): void {
    for (const pattern of forbiddenPatterns) {
      if (pattern.test(content)) {
        issues.push({
          type: 'content',
          severity: 'high',
          message: `Forbidden pattern detected: ${pattern.toString()}`,
        });
      }
    }
  }

  /**
   * Check content safety.
   */
  private checkSafety(content: string, issues: QualityIssue[]): void {
    const safetyPatterns = [
      { pattern: /\bpassword\s*[:=]\s*\S+/i, message: 'Potential password exposure' },
      { pattern: /\bapi[_-]?key\s*[:=]\s*\S+/i, message: 'Potential API key exposure' },
      { pattern: /\bsecret\s*[:=]\s*\S+/i, message: 'Potential secret exposure' },
      { pattern: /<script\b[^>]*>[\s\S]*?<\/script>/i, message: 'Script tag detected' },
      { pattern: /\b(exec|eval|system)\s*\(/i, message: 'Potential code execution' },
    ];

    for (const { pattern, message } of safetyPatterns) {
      if (pattern.test(content)) {
        issues.push({
          type: 'safety',
          severity: 'critical',
          message,
        });
      }
    }
  }

  /**
   * Calculate confidence score based on content and issues.
   */
  private calculateConfidence(content: string, issues: QualityIssue[]): number {
    let confidence = 85; // Base confidence

    // Reduce confidence based on issues
    for (const issue of issues) {
      switch (issue.severity) {
        case 'critical':
          confidence -= 30;
          break;
        case 'high':
          confidence -= 20;
          break;
        case 'medium':
          confidence -= 10;
          break;
        case 'low':
          confidence -= 5;
          break;
      }
    }

    // Boost confidence for well-structured content
    if (content.length > 100) confidence += 5;
    if (this.hasMarkdownStructure(content)) confidence += 5;
    if (content.split('\n').length > 5) confidence += 3;

    // Clamp between 0 and 100
    return Math.max(0, Math.min(100, confidence));
  }

  /**
   * Build the quality check result.
   */
  private buildResult(
    issues: QualityIssue[],
    suggestions: string[],
    confidence: number,
    options?: QualityCheckOptions
  ): QualityCheckResult {
    const minConfidence = options?.minConfidence ?? this.defaultConfig.minConfidence;
    const passed = confidence >= minConfidence && !issues.some((i) => i.severity === 'critical');
    const hasHighIssues = issues.some((i) => i.severity === 'high');

    return {
      passed,
      confidence,
      issues,
      suggestions,
      requiresReview: this.defaultConfig.requiresReview || hasHighIssues,
      escalated: this.defaultConfig.escalateOnFailure && !passed,
    };
  }

  /**
   * Add a custom validator.
   */
  addValidator(validator: QualityValidator): void {
    this.validators.push(validator);
  }

  /**
   * Remove a custom validator.
   */
  removeValidator(name: string): void {
    this.validators = this.validators.filter((v) => v.name !== name);
  }

  /**
   * Get all validators.
   */
  getValidators(): QualityValidator[] {
    return [...this.validators];
  }

  /**
   * Update default configuration.
   */
  setDefaultConfig(config: Partial<QualityGateConfig>): void {
    this.defaultConfig = {
      ...this.defaultConfig,
      ...config,
    };
  }

  /**
   * Get default configuration.
   */
  getDefaultConfig(): QualityGateConfig {
    return { ...this.defaultConfig };
  }
}

// ============================================
// Built-in Validators
// ============================================

/**
 * Validator for checking response coherence.
 */
export const coherenceValidator: QualityValidator = {
  name: 'coherence',
  validate: (content: string): QualityIssue | null => {
    // Check for repetitive content
    const words = content.toLowerCase().split(/\s+/);
    const wordCounts = new Map<string, number>();

    for (const word of words) {
      if (word.length > 3) {
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
      }
    }

    const totalWords = words.length;
    for (const [word, count] of wordCounts) {
      if (count > 10 && count / totalWords > 0.1) {
        return {
          type: 'content',
          severity: 'medium',
          message: `Repetitive word detected: "${word}" appears ${count} times`,
        };
      }
    }

    return null;
  },
};

/**
 * Validator for checking response completeness.
 */
export const completenessValidator: QualityValidator = {
  name: 'completeness',
  validate: (content: string): QualityIssue | null => {
    // Check for incomplete sentences
    const incompletePatterns = [
      /\.\.\.\s*$/,           // Ends with ...
      /\b(however|but|and|or)\s*$/i,  // Ends with conjunction
      /\b(to be continued)\b/i,
      /\[TODO\]/i,
      /\[INCOMPLETE\]/i,
    ];

    for (const pattern of incompletePatterns) {
      if (pattern.test(content)) {
        return {
          type: 'content',
          severity: 'high',
          message: 'Content appears incomplete',
        };
      }
    }

    return null;
  },
};

/**
 * Validator for decision packet structure.
 */
export const decisionPacketValidator: QualityValidator = {
  name: 'decision_packet',
  validate: (content: string): QualityIssue | null => {
    const requiredSections = [
      'issue',
      'options',
      'recommendation',
      'risk',
    ];

    const lowercaseContent = content.toLowerCase();
    const missingSections = requiredSections.filter(
      (section) => !lowercaseContent.includes(section)
    );

    if (missingSections.length > 0) {
      return {
        type: 'content',
        severity: 'high',
        message: `Decision packet missing sections: ${missingSections.join(', ')}`,
      };
    }

    return null;
  },
};

/**
 * Validator for JSON responses.
 */
export const jsonValidator: QualityValidator = {
  name: 'json',
  validate: (content: string): QualityIssue | null => {
    // Check if content starts with { or [
    const trimmed = content.trim();
    if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
      return null; // Not expected to be JSON
    }

    try {
      JSON.parse(trimmed);
      return null;
    } catch (error) {
      return {
        type: 'format',
        severity: 'high',
        message: 'Invalid JSON structure',
      };
    }
  },
};

/**
 * Create a quality gate with common validators.
 */
export function createQualityGate(
  options?: QualityGateOptions
): QualityGate {
  const gate = new QualityGate(options);

  // Add built-in validators
  gate.addValidator(coherenceValidator);
  gate.addValidator(completenessValidator);
  gate.addValidator(jsonValidator);

  return gate;
}

/**
 * Create a quality gate for decision packets.
 */
export function createDecisionPacketGate(): QualityGate {
  const gate = new QualityGate({
    defaultConfig: {
      enabled: true,
      minConfidence: 80,
      requiresReview: true,
      escalateOnFailure: true,
    },
  });

  gate.addValidator(coherenceValidator);
  gate.addValidator(completenessValidator);
  gate.addValidator(decisionPacketValidator);

  return gate;
}
