/**
 * Quality Gate Service - LLM Output Validation for Governance
 *
 * Provides:
 * - LLM response validation (format, length, safety)
 * - Decision packet structure checking
 * - Agent response coherence validation
 * - Quality metrics tracking
 */

import type Database from 'better-sqlite3';
import type { Server as SocketServer } from 'socket.io';
import {
  QualityGate,
  createQualityGate,
  createDecisionPacketGate,
  type QualityCheckOptions,
  type QualityCheckResult,
  type QualityValidator,
} from '@algora/model-router';
import { v4 as uuidv4 } from 'uuid';

// ============================================
// Types
// ============================================

export type QualityCheckType =
  | 'agent_chatter'
  | 'agora_message'
  | 'decision_packet'
  | 'summary'
  | 'analysis'
  | 'general';

export interface QualityCheckLog {
  id: string;
  type: QualityCheckType;
  passed: boolean;
  confidence: number;
  issueCount: number;
  issues: string[];
  contentLength: number;
  latencyMs: number;
  timestamp: Date;
}

export interface QualityStats {
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  passRate: number;
  averageConfidence: number;
  averageLatencyMs: number;
  byType: Record<QualityCheckType, {
    total: number;
    passed: number;
    passRate: number;
  }>;
  recentIssues: Array<{
    type: QualityCheckType;
    message: string;
    severity: string;
    timestamp: string;
  }>;
}

// ============================================
// Custom Validators for Governance
// ============================================

/**
 * Validator for agent chatter (casual conversation)
 */
const agentChatterValidator: QualityValidator = {
  name: 'agent_chatter',
  validate: (content: string) => {
    // Chatter should be conversational, not too formal
    if (content.length > 500) {
      return {
        type: 'length',
        severity: 'low',
        message: 'Chatter too long for casual conversation',
      };
    }

    // Check for out-of-character responses
    const outOfCharacterPatterns = [
      /\bI am an AI\b/i,
      /\bAs an AI\b/i,
      /\bI cannot\b.*\bpersonal\b/i,
      /\bI don't have\b.*\bopinions\b/i,
    ];

    for (const pattern of outOfCharacterPatterns) {
      if (pattern.test(content)) {
        return {
          type: 'content',
          severity: 'medium',
          message: 'Agent broke character in chatter',
        };
      }
    }

    return null;
  },
};

/**
 * Validator for Agora deliberation messages
 */
const agoraMessageValidator: QualityValidator = {
  name: 'agora_message',
  validate: (content: string) => {
    // Agora messages should have substance
    if (content.length < 50) {
      return {
        type: 'length',
        severity: 'medium',
        message: 'Deliberation message too brief',
      };
    }

    // Check for argumentative structure
    const argumentPatterns = [
      /\bbecause\b/i,
      /\btherefore\b/i,
      /\bhowever\b/i,
      /\bfurthermore\b/i,
      /\bin my view\b/i,
      /\bi believe\b/i,
      /\bthe evidence\b/i,
      /\bconsidering\b/i,
    ];

    const hasArgument = argumentPatterns.some(p => p.test(content));
    if (content.length > 100 && !hasArgument) {
      return {
        type: 'content',
        severity: 'low',
        message: 'Message lacks argumentative structure',
      };
    }

    return null;
  },
};

/**
 * Validator for governance summaries
 */
const summaryValidator: QualityValidator = {
  name: 'summary',
  validate: (content: string) => {
    // Summaries should be concise
    if (content.length > 2000) {
      return {
        type: 'length',
        severity: 'medium',
        message: 'Summary exceeds recommended length',
      };
    }

    // Check for summary structure indicators
    const summaryPatterns = [
      /\bkey points?\b/i,
      /\bsummary\b/i,
      /\bin conclusion\b/i,
      /\boverall\b/i,
      /\bmain\b.*\bfindings?\b/i,
    ];

    const hasSummaryStructure = summaryPatterns.some(p => p.test(content));
    if (content.length > 500 && !hasSummaryStructure) {
      return {
        type: 'content',
        severity: 'low',
        message: 'Summary lacks structural indicators',
      };
    }

    return null;
  },
};

// ============================================
// Quality Gate Service
// ============================================

export class QualityGateService {
  private db: Database.Database;
  private io: SocketServer;

  // Specialized gates
  private generalGate: QualityGate;
  private decisionPacketGate: QualityGate;
  private chatterGate: QualityGate;
  private agoraGate: QualityGate;

  // Stats tracking
  private stats = {
    totalChecks: 0,
    passedChecks: 0,
    failedChecks: 0,
    confidenceSum: 0,
    latencySum: 0,
    byType: {} as Record<QualityCheckType, { total: number; passed: number }>,
    recentIssues: [] as Array<{
      type: QualityCheckType;
      message: string;
      severity: string;
      timestamp: string;
    }>,
  };

  constructor(db: Database.Database, io: SocketServer) {
    this.db = db;
    this.io = io;

    // Initialize gates
    this.generalGate = createQualityGate();
    this.decisionPacketGate = createDecisionPacketGate();

    // Chatter gate - more lenient
    this.chatterGate = new QualityGate({
      defaultConfig: {
        enabled: true,
        minConfidence: 50,
        requiresReview: false,
        escalateOnFailure: false,
      },
    });
    this.chatterGate.addValidator(agentChatterValidator);

    // Agora gate - moderate strictness
    this.agoraGate = new QualityGate({
      defaultConfig: {
        enabled: true,
        minConfidence: 60,
        requiresReview: false,
        escalateOnFailure: false,
      },
    });
    this.agoraGate.addValidator(agoraMessageValidator);
    this.agoraGate.addValidator(summaryValidator);

    this.initTable();
    this.loadStats();
  }

  private initTable(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS quality_checks (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        passed INTEGER NOT NULL,
        confidence INTEGER NOT NULL,
        issue_count INTEGER NOT NULL,
        issues TEXT,
        content_length INTEGER NOT NULL,
        latency_ms INTEGER NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_quality_type ON quality_checks(type);
      CREATE INDEX IF NOT EXISTS idx_quality_passed ON quality_checks(passed);
      CREATE INDEX IF NOT EXISTS idx_quality_created ON quality_checks(created_at);
    `);
  }

  private loadStats(): void {
    // Load aggregate stats from database
    const today = new Date().toISOString().split('T')[0];

    const totals = this.db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN passed = 1 THEN 1 ELSE 0 END) as passed,
        AVG(confidence) as avg_confidence,
        AVG(latency_ms) as avg_latency
      FROM quality_checks
      WHERE created_at >= ?
    `).get(`${today}T00:00:00`) as {
      total: number;
      passed: number;
      avg_confidence: number | null;
      avg_latency: number | null;
    } | undefined;

    if (totals) {
      this.stats.totalChecks = totals.total;
      this.stats.passedChecks = totals.passed;
      this.stats.failedChecks = totals.total - totals.passed;
      this.stats.confidenceSum = (totals.avg_confidence || 0) * totals.total;
      this.stats.latencySum = (totals.avg_latency || 0) * totals.total;
    }

    // Load by-type stats
    const byType = this.db.prepare(`
      SELECT
        type,
        COUNT(*) as total,
        SUM(CASE WHEN passed = 1 THEN 1 ELSE 0 END) as passed
      FROM quality_checks
      WHERE created_at >= ?
      GROUP BY type
    `).all(`${today}T00:00:00`) as Array<{
      type: string;
      total: number;
      passed: number;
    }>;

    for (const row of byType) {
      this.stats.byType[row.type as QualityCheckType] = {
        total: row.total,
        passed: row.passed,
      };
    }
  }

  /**
   * Check content quality
   */
  check(
    content: string,
    type: QualityCheckType,
    options?: QualityCheckOptions
  ): QualityCheckResult {
    const startTime = Date.now();

    // Select appropriate gate
    const gate = this.getGate(type);

    // Run quality check
    const result = gate.check(content, options);
    const latencyMs = Date.now() - startTime;

    // Log check
    this.logCheck(type, result, content.length, latencyMs);

    // Emit event for monitoring
    if (!result.passed) {
      this.io.emit('quality:check:failed', {
        type,
        confidence: result.confidence,
        issues: result.issues.map(i => i.message),
        timestamp: new Date().toISOString(),
      });
    }

    return result;
  }

  /**
   * Check agent chatter
   */
  checkChatter(content: string): QualityCheckResult {
    return this.check(content, 'agent_chatter', {
      maxLength: 500,
      minConfidence: 50,
    });
  }

  /**
   * Check Agora deliberation message
   */
  checkAgoraMessage(content: string): QualityCheckResult {
    return this.check(content, 'agora_message', {
      minLength: 30,
      maxLength: 2000,
      minConfidence: 60,
    });
  }

  /**
   * Check decision packet
   */
  checkDecisionPacket(content: string): QualityCheckResult {
    return this.check(content, 'decision_packet', {
      minLength: 200,
      requiredKeywords: ['issue', 'options', 'recommendation', 'risk'],
      minConfidence: 80,
    });
  }

  /**
   * Check summary
   */
  checkSummary(content: string): QualityCheckResult {
    return this.check(content, 'summary', {
      maxLength: 2000,
      minConfidence: 70,
    });
  }

  /**
   * Get appropriate gate for type
   */
  private getGate(type: QualityCheckType): QualityGate {
    switch (type) {
      case 'agent_chatter':
        return this.chatterGate;
      case 'agora_message':
        return this.agoraGate;
      case 'decision_packet':
        return this.decisionPacketGate;
      case 'summary':
      case 'analysis':
        return this.agoraGate;
      default:
        return this.generalGate;
    }
  }

  /**
   * Log quality check to database
   */
  private logCheck(
    type: QualityCheckType,
    result: QualityCheckResult,
    contentLength: number,
    latencyMs: number
  ): void {
    const id = uuidv4();
    const now = new Date().toISOString();

    this.db.prepare(`
      INSERT INTO quality_checks
      (id, type, passed, confidence, issue_count, issues, content_length, latency_ms, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      type,
      result.passed ? 1 : 0,
      result.confidence,
      result.issues.length,
      JSON.stringify(result.issues.map(i => i.message)),
      contentLength,
      latencyMs,
      now
    );

    // Update in-memory stats
    this.stats.totalChecks++;
    if (result.passed) {
      this.stats.passedChecks++;
    } else {
      this.stats.failedChecks++;
    }
    this.stats.confidenceSum += result.confidence;
    this.stats.latencySum += latencyMs;

    // Update by-type stats
    if (!this.stats.byType[type]) {
      this.stats.byType[type] = { total: 0, passed: 0 };
    }
    this.stats.byType[type].total++;
    if (result.passed) {
      this.stats.byType[type].passed++;
    }

    // Track recent issues
    if (result.issues.length > 0) {
      for (const issue of result.issues) {
        this.stats.recentIssues.unshift({
          type,
          message: issue.message,
          severity: issue.severity,
          timestamp: now,
        });
      }
      // Keep only last 50 issues
      if (this.stats.recentIssues.length > 50) {
        this.stats.recentIssues = this.stats.recentIssues.slice(0, 50);
      }
    }
  }

  /**
   * Get quality statistics
   */
  getStats(): QualityStats {
    const passRate = this.stats.totalChecks > 0
      ? (this.stats.passedChecks / this.stats.totalChecks) * 100
      : 100;

    const avgConfidence = this.stats.totalChecks > 0
      ? this.stats.confidenceSum / this.stats.totalChecks
      : 0;

    const avgLatency = this.stats.totalChecks > 0
      ? this.stats.latencySum / this.stats.totalChecks
      : 0;

    const byType: Record<QualityCheckType, { total: number; passed: number; passRate: number }> =
      {} as Record<QualityCheckType, { total: number; passed: number; passRate: number }>;

    for (const [type, stats] of Object.entries(this.stats.byType)) {
      byType[type as QualityCheckType] = {
        total: stats.total,
        passed: stats.passed,
        passRate: stats.total > 0 ? (stats.passed / stats.total) * 100 : 100,
      };
    }

    return {
      totalChecks: this.stats.totalChecks,
      passedChecks: this.stats.passedChecks,
      failedChecks: this.stats.failedChecks,
      passRate,
      averageConfidence: avgConfidence,
      averageLatencyMs: avgLatency,
      byType,
      recentIssues: [...this.stats.recentIssues],
    };
  }

  /**
   * Get check history
   */
  getHistory(options?: {
    type?: QualityCheckType;
    passed?: boolean;
    limit?: number;
    offset?: number;
  }): QualityCheckLog[] {
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;

    let sql = 'SELECT * FROM quality_checks WHERE 1=1';
    const params: unknown[] = [];

    if (options?.type) {
      sql += ' AND type = ?';
      params.push(options.type);
    }

    if (options?.passed !== undefined) {
      sql += ' AND passed = ?';
      params.push(options.passed ? 1 : 0);
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const rows = this.db.prepare(sql).all(...params) as Array<{
      id: string;
      type: string;
      passed: number;
      confidence: number;
      issue_count: number;
      issues: string | null;
      content_length: number;
      latency_ms: number;
      created_at: string;
    }>;

    return rows.map(row => ({
      id: row.id,
      type: row.type as QualityCheckType,
      passed: row.passed === 1,
      confidence: row.confidence,
      issueCount: row.issue_count,
      issues: row.issues ? JSON.parse(row.issues) : [],
      contentLength: row.content_length,
      latencyMs: row.latency_ms,
      timestamp: new Date(row.created_at),
    }));
  }

  /**
   * Add custom validator
   */
  addValidator(type: QualityCheckType, validator: QualityValidator): void {
    const gate = this.getGate(type);
    gate.addValidator(validator);
  }

  /**
   * Clear old quality check logs
   */
  clearOldLogs(retentionDays: number = 30): number {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = this.db.prepare(
      'DELETE FROM quality_checks WHERE created_at < ?'
    ).run(cutoffDate.toISOString());

    return result.changes;
  }
}
