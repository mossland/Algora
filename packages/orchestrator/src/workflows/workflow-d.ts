// ===========================================
// Workflow D: Mossland Ecosystem Expansion
// ===========================================
// Evaluate and onboard ecosystem expansion opportunities
// (partnerships, new projects, acquisitions)

import type {
  WorkflowContext,
  AgentOpinion,
} from '../types.js';
import type { LLMProvider } from '../specialist-manager.js';

// ============================================
// Types for Ecosystem Expansion Workflow
// ============================================

/**
 * Origin type for expansion opportunities.
 */
export type ExpansionOrigin = 'call_based' | 'always_on';

/**
 * Opportunity categories.
 */
export type OpportunityCategory =
  | 'partnership'
  | 'integration'
  | 'acquisition'
  | 'investment'
  | 'collaboration'
  | 'ecosystem_project'
  | 'market_expansion';

/**
 * Opportunity status values.
 */
export type OpportunityStatus =
  | 'detected'
  | 'under_review'
  | 'qualified'
  | 'proposal_draft'
  | 'negotiation'
  | 'approved'
  | 'rejected'
  | 'on_hold';

/**
 * Partnership status values.
 */
export type PartnershipStatus =
  | 'draft'
  | 'proposed'
  | 'negotiating'
  | 'pending_approval'
  | 'approved'
  | 'active'
  | 'paused'
  | 'terminated';

/**
 * Signal source for always-on intake.
 */
export type SignalSource =
  | 'rss:partnerships'
  | 'blockchain:dex_listings'
  | 'social:twitter_mentions'
  | 'github:new_integrations'
  | 'news:industry'
  | 'competitor:announcements';

/**
 * An ecosystem expansion opportunity.
 */
export interface ExpansionOpportunity {
  id: string;
  title: string;
  description: string;
  origin: ExpansionOrigin;
  category: OpportunityCategory;
  status: OpportunityStatus;

  // Source info
  sourceSignal?: string;
  sourceUrl?: string;
  escalatedFromScan?: boolean;

  // Counterparty info
  counterpartyName?: string;
  counterpartyType?: string;
  counterpartyWebsite?: string;

  // Assessment
  significanceScore: number; // 0-100
  strategicFitScore: number; // 0-100
  riskScore: number; // 0-100

  // Metadata
  detectedAt: Date;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Opportunity assessment output.
 */
export interface OpportunityAssessment {
  id: string;
  opportunityId: string;

  // Assessment scores
  scores: {
    strategicAlignment: number; // 0-100
    marketPotential: number; // 0-100
    technicalFeasibility: number; // 0-100
    financialViability: number; // 0-100
    riskLevel: number; // 0-100
    urgency: number; // 0-100
  };
  overallScore: number; // 0-100

  // Analysis
  strengthsAnalysis: string[];
  weaknessesAnalysis: string[];
  opportunitiesAnalysis: string[];
  threatsAnalysis: string[];

  // Recommendation
  recommendation: 'pursue' | 'defer' | 'reject' | 'needs_more_info';
  recommendationReasoning: string;

  // Next steps
  suggestedActions: string[];
  requiredDueDiligence: string[];

  // Provenance
  assessedBy: string;
  modelUsed: string;
  assessedAt: Date;
}

/**
 * Partnership proposal.
 */
export interface PartnershipProposal {
  id: string;
  opportunityId: string;
  title: string;

  // Parties
  proposingParty: string;
  counterparty: {
    name: string;
    type: string;
    contact?: string;
  };

  // Terms
  proposedTerms: {
    type: 'technical_integration' | 'marketing_collaboration' | 'investment' | 'joint_venture' | 'licensing';
    duration: string;
    scope: string[];
    deliverables: string[];
    milestones: PartnershipMilestone[];
  };

  // Financials
  financials: {
    estimatedValue: number;
    currency: string;
    paymentTerms?: string;
    revenueShare?: number;
  };

  // Risk assessment
  risks: {
    description: string;
    severity: 'low' | 'medium' | 'high';
    mitigation: string;
  }[];

  // Status
  status: PartnershipStatus;

  // Approvals
  requiredApprovals: {
    mossCoinHouse: boolean;
    openSourceHouse: boolean;
    director3: boolean;
  };
  approvalStatus: {
    mossCoinHouse?: boolean;
    openSourceHouse?: boolean;
    director3?: boolean;
  };

  // Provenance
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Partnership milestone.
 */
export interface PartnershipMilestone {
  id: string;
  title: string;
  description: string;
  dueDate: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  deliverables: string[];
}

/**
 * Partnership agreement (LOCKED until approved).
 */
export interface PartnershipAgreement {
  id: string;
  proposalId: string;

  // Parties
  parties: {
    mossland: {
      representative: string;
      role: string;
    };
    counterparty: {
      name: string;
      representative: string;
      role: string;
    };
  };

  // Terms
  terms: {
    effectiveDate: Date;
    expirationDate?: Date;
    autoRenewal: boolean;
    terminationClause: string;
    scope: string[];
    obligations: {
      mossland: string[];
      counterparty: string[];
    };
  };

  // Financials
  financials: {
    totalValue: number;
    currency: string;
    paymentSchedule?: string;
    revenueShare?: number;
  };

  // Legal
  governingLaw?: string;
  disputeResolution?: string;
  confidentiality: boolean;

  // Status
  status: 'draft' | 'pending_signatures' | 'signed' | 'active' | 'expired' | 'terminated';

  // LOCK status
  isLocked: boolean;
  lockReason?: string;
  unlockRequirements: string[];

  // Signatures
  signatures: {
    mossland?: {
      signedBy: string;
      signedAt: Date;
    };
    counterparty?: {
      signedBy: string;
      signedAt: Date;
    };
  };

  // Provenance
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Ecosystem report output.
 */
export interface EcosystemReport {
  id: string;
  reportPeriod: {
    start: Date;
    end: Date;
  };

  // Summary
  executiveSummary: string;

  // Opportunities
  opportunitiesDetected: number;
  opportunitiesQualified: number;
  opportunitiesRejected: number;

  // Partnerships
  activePartnerships: number;
  newPartnerships: number;
  partnershipValue: number;

  // Metrics
  metrics: {
    signalsProcessed: number;
    assessmentsCompleted: number;
    proposalsCreated: number;
    agreementsSigned: number;
  };

  // Key insights
  keyInsights: string[];
  emergingTrends: string[];
  recommendations: string[];

  // Provenance
  generatedBy: string;
  generatedAt: Date;
}

/**
 * Always-on scanner configuration.
 */
export interface AlwaysOnConfig {
  enabled: boolean;
  scanInterval: string; // e.g., '1h'
  signalSources: SignalSource[];
  autoCreateIssue: boolean;
  significanceThreshold: number; // 0-100
}

/**
 * Anti-abuse guardrails configuration.
 */
export interface AntiAbuseConfig {
  maxSignalsPerHour: number;
  maxIssuesPerDay: number;
  deduplicationWindow: string;
  similarityThreshold: number;
  minimumSignalQuality: number;
  requireMultipleSources: boolean;
  minimumSourceCount: number;
  cooldownAfterRejection: string;
  cooldownBetweenSimilar: string;
  humanEscalationThreshold: number;
  blockedDomains: string[];
  blockedPatterns: string[];
}

/**
 * Detected signal from always-on scanner.
 */
export interface DetectedSignal {
  id: string;
  source: SignalSource;
  title: string;
  description: string;
  url?: string;
  detectedAt: Date;
  qualityScore: number; // 0-100
  similarSignals: string[];
  processedAt?: Date;
  resultingOpportunityId?: string;
}

/**
 * Workflow D configuration.
 */
export interface WorkflowDConfig {
  // Always-on settings
  alwaysOn: AlwaysOnConfig;

  // Anti-abuse settings
  antiAbuse: AntiAbuseConfig;

  // Assessment thresholds
  qualificationThreshold: number; // Minimum score to qualify opportunity
  proposalThreshold: number; // Minimum score to create proposal

  // Approval thresholds
  dualHouseRequired: number; // Value threshold requiring dual-house
  director3Required: number; // Value threshold requiring Director 3

  // Categories requiring special handling
  highRiskCategories: OpportunityCategory[];
}

/**
 * Default configuration for Workflow D.
 */
export const DEFAULT_WORKFLOW_D_CONFIG: WorkflowDConfig = {
  alwaysOn: {
    enabled: true,
    scanInterval: '1h',
    signalSources: [
      'rss:partnerships',
      'blockchain:dex_listings',
      'social:twitter_mentions',
      'github:new_integrations',
      'news:industry',
    ],
    autoCreateIssue: true,
    significanceThreshold: 70,
  },
  antiAbuse: {
    maxSignalsPerHour: 1000,
    maxIssuesPerDay: 10,
    deduplicationWindow: '7d',
    similarityThreshold: 0.85,
    minimumSignalQuality: 50,
    requireMultipleSources: true,
    minimumSourceCount: 2,
    cooldownAfterRejection: '30d',
    cooldownBetweenSimilar: '24h',
    humanEscalationThreshold: 3,
    blockedDomains: [],
    blockedPatterns: [],
  },
  qualificationThreshold: 60,
  proposalThreshold: 75,
  dualHouseRequired: 1000,
  director3Required: 10000,
  highRiskCategories: ['acquisition', 'investment'],
};

// ============================================
// Workflow D Handler
// ============================================

/**
 * Handler for Workflow D: Ecosystem Expansion.
 */
export class WorkflowDHandler {
  private llmProvider: LLMProvider;
  private config: WorkflowDConfig;
  private signalCache: Map<string, DetectedSignal> = new Map();
  private dailyIssueCount: number = 0;
  private lastResetDate: Date = new Date();

  constructor(llmProvider: LLMProvider, config: WorkflowDConfig = DEFAULT_WORKFLOW_D_CONFIG) {
    this.llmProvider = llmProvider;
    this.config = config;
  }

  /**
   * Process a call-based opportunity (explicit proposal).
   */
  async processCallBasedOpportunity(
    context: WorkflowContext,
    opportunity: Omit<ExpansionOpportunity, 'id' | 'origin' | 'status' | 'detectedAt' | 'createdAt' | 'updatedAt'>
  ): Promise<{
    opportunity: ExpansionOpportunity;
    assessment: OpportunityAssessment;
    opinions: AgentOpinion[];
  }> {
    // Create opportunity record
    const fullOpportunity: ExpansionOpportunity = {
      ...opportunity,
      id: `OPP-CB-${Date.now()}`,
      origin: 'call_based',
      status: 'under_review',
      detectedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Assess the opportunity
    const assessment = await this.assessOpportunity(context, fullOpportunity);

    // Gather agent opinions
    const opinions = await this.gatherAgentOpinions(context, fullOpportunity, assessment);

    // Update status based on assessment
    if (assessment.overallScore >= this.config.qualificationThreshold) {
      fullOpportunity.status = 'qualified';
    } else if (assessment.recommendation === 'reject') {
      fullOpportunity.status = 'rejected';
    } else {
      fullOpportunity.status = 'on_hold';
    }
    fullOpportunity.reviewedAt = new Date();
    fullOpportunity.updatedAt = new Date();

    return {
      opportunity: fullOpportunity,
      assessment,
      opinions,
    };
  }

  /**
   * Process a signal from always-on scanner.
   */
  async processAlwaysOnSignal(
    _context: WorkflowContext,
    signal: Omit<DetectedSignal, 'id' | 'processedAt' | 'resultingOpportunityId'>
  ): Promise<{
    signal: DetectedSignal;
    opportunity?: ExpansionOpportunity;
    filtered: boolean;
    filterReason?: string;
  }> {
    const fullSignal: DetectedSignal = {
      ...signal,
      id: `SIG-${Date.now()}`,
    };

    // Check anti-abuse guardrails
    const filterResult = this.applyAntiAbuseFilters(fullSignal);
    if (filterResult.filtered) {
      return {
        signal: fullSignal,
        filtered: true,
        filterReason: filterResult.reason,
      };
    }

    // Check significance threshold
    if (signal.qualityScore < this.config.alwaysOn.significanceThreshold) {
      return {
        signal: fullSignal,
        filtered: true,
        filterReason: `Quality score ${signal.qualityScore} below threshold ${this.config.alwaysOn.significanceThreshold}`,
      };
    }

    // Check daily issue limit
    this.resetDailyCountIfNeeded();
    if (this.dailyIssueCount >= this.config.antiAbuse.maxIssuesPerDay) {
      return {
        signal: fullSignal,
        filtered: true,
        filterReason: `Daily issue limit (${this.config.antiAbuse.maxIssuesPerDay}) reached`,
      };
    }

    // Create opportunity from signal
    const opportunity: ExpansionOpportunity = {
      id: `OPP-AO-${Date.now()}`,
      title: signal.title,
      description: signal.description,
      origin: 'always_on',
      category: 'ecosystem_project', // Default, can be refined
      status: 'detected',
      sourceSignal: fullSignal.id,
      sourceUrl: signal.url,
      escalatedFromScan: true,
      significanceScore: signal.qualityScore,
      strategicFitScore: 0,
      riskScore: 0,
      detectedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    fullSignal.processedAt = new Date();
    fullSignal.resultingOpportunityId = opportunity.id;
    this.signalCache.set(fullSignal.id, fullSignal);
    this.dailyIssueCount++;

    return {
      signal: fullSignal,
      opportunity,
      filtered: false,
    };
  }

  /**
   * Assess an opportunity.
   */
  async assessOpportunity(
    context: WorkflowContext,
    opportunity: ExpansionOpportunity
  ): Promise<OpportunityAssessment> {
    const prompt = `You are assessing an ecosystem expansion opportunity for Mossland.

Opportunity Details:
- Title: ${opportunity.title}
- Description: ${opportunity.description}
- Category: ${opportunity.category}
- Origin: ${opportunity.origin}
${opportunity.counterpartyName ? `- Counterparty: ${opportunity.counterpartyName}` : ''}

Issue Context:
- Issue Title: ${context.issue.title}
- Issue Description: ${context.issue.description}

Please assess this opportunity on the following dimensions (score 0-100 each):
1. Strategic Alignment: How well does this align with Mossland's mission and goals?
2. Market Potential: What is the market opportunity size and growth potential?
3. Technical Feasibility: How technically feasible is this partnership/project?
4. Financial Viability: What is the financial return potential?
5. Risk Level: What is the overall risk level? (higher = riskier)
6. Urgency: How time-sensitive is this opportunity?

Also provide:
- SWOT Analysis (Strengths, Weaknesses, Opportunities, Threats)
- Recommendation (pursue/defer/reject/needs_more_info)
- Reasoning for your recommendation
- Suggested next actions
- Required due diligence items

Format your response with clear sections for each item.`;

    const response = await this.llmProvider.generate({
      prompt,
      maxTokens: 2500,
    });

    // Parse the LLM response
    const scores = this.parseAssessmentScores(response.content);
    const analysis = this.parseSwotAnalysis(response.content);
    const recommendation = this.parseRecommendation(response.content);

    const overallScore = Math.round(
      (scores.strategicAlignment +
        scores.marketPotential +
        scores.technicalFeasibility +
        scores.financialViability +
        (100 - scores.riskLevel) +
        scores.urgency) / 6
    );

    return {
      id: `OA-${Date.now()}`,
      opportunityId: opportunity.id,
      scores,
      overallScore,
      strengthsAnalysis: analysis.strengths,
      weaknessesAnalysis: analysis.weaknesses,
      opportunitiesAnalysis: analysis.opportunities,
      threatsAnalysis: analysis.threats,
      recommendation: recommendation.decision,
      recommendationReasoning: recommendation.reasoning,
      suggestedActions: recommendation.actions,
      requiredDueDiligence: recommendation.dueDiligence,
      assessedBy: 'workflow-d-handler',
      modelUsed: response.model,
      assessedAt: new Date(),
    };
  }

  /**
   * Create a partnership proposal from a qualified opportunity.
   */
  async createPartnershipProposal(
    _context: WorkflowContext,
    opportunity: ExpansionOpportunity,
    assessment: OpportunityAssessment,
    estimatedValue: number
  ): Promise<PartnershipProposal> {
    if (assessment.overallScore < this.config.proposalThreshold) {
      throw new Error(
        `Opportunity score ${assessment.overallScore} is below proposal threshold ${this.config.proposalThreshold}`
      );
    }

    const prompt = `Based on the opportunity assessment, create a partnership proposal.

Opportunity: ${opportunity.title}
Description: ${opportunity.description}
Counterparty: ${opportunity.counterpartyName || 'TBD'}
Estimated Value: $${estimatedValue}

Assessment Score: ${assessment.overallScore}/100
Recommendation: ${assessment.recommendation}

Please draft:
1. Proposed partnership type (technical_integration/marketing_collaboration/investment/joint_venture/licensing)
2. Proposed duration
3. Scope of partnership (list key areas)
4. Key deliverables (list)
5. Milestones (list with titles and timeframes)
6. Risk assessment (list risks with severity and mitigations)

Format each section clearly.`;

    const response = await this.llmProvider.generate({
      prompt,
      maxTokens: 2000,
    });

    const proposalDetails = this.parseProposalDetails(response.content);

    // Determine approval requirements based on value
    const requiresDualHouse = estimatedValue >= this.config.dualHouseRequired;
    const requiresDirector3 = estimatedValue >= this.config.director3Required ||
      this.config.highRiskCategories.includes(opportunity.category);

    const proposal: PartnershipProposal = {
      id: `PP-${Date.now()}`,
      opportunityId: opportunity.id,
      title: `Partnership Proposal: ${opportunity.title}`,
      proposingParty: 'Mossland',
      counterparty: {
        name: opportunity.counterpartyName || 'TBD',
        type: opportunity.counterpartyType || 'Organization',
      },
      proposedTerms: {
        type: proposalDetails.type,
        duration: proposalDetails.duration,
        scope: proposalDetails.scope,
        deliverables: proposalDetails.deliverables,
        milestones: proposalDetails.milestones,
      },
      financials: {
        estimatedValue,
        currency: 'USD',
      },
      risks: proposalDetails.risks,
      status: 'draft',
      requiredApprovals: {
        mossCoinHouse: requiresDualHouse,
        openSourceHouse: requiresDualHouse,
        director3: requiresDirector3,
      },
      approvalStatus: {},
      createdBy: 'workflow-d-handler',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return proposal;
  }

  /**
   * Create a partnership agreement from an approved proposal.
   */
  createPartnershipAgreement(
    proposal: PartnershipProposal,
    mosslandRepresentative: string
  ): PartnershipAgreement {
    // Verify all required approvals are received
    const missingApprovals: string[] = [];
    if (proposal.requiredApprovals.mossCoinHouse && !proposal.approvalStatus.mossCoinHouse) {
      missingApprovals.push('MossCoin House');
    }
    if (proposal.requiredApprovals.openSourceHouse && !proposal.approvalStatus.openSourceHouse) {
      missingApprovals.push('OpenSource House');
    }
    if (proposal.requiredApprovals.director3 && !proposal.approvalStatus.director3) {
      missingApprovals.push('Director 3');
    }

    // Agreement is LOCKED until all approvals are received
    const isLocked = missingApprovals.length > 0;

    const agreement: PartnershipAgreement = {
      id: `PA-${Date.now()}`,
      proposalId: proposal.id,
      parties: {
        mossland: {
          representative: mosslandRepresentative,
          role: 'Authorized Representative',
        },
        counterparty: {
          name: proposal.counterparty.name,
          representative: '',
          role: '',
        },
      },
      terms: {
        effectiveDate: new Date(),
        autoRenewal: false,
        terminationClause: '30-day written notice',
        scope: proposal.proposedTerms.scope,
        obligations: {
          mossland: proposal.proposedTerms.deliverables.filter((_, i) => i % 2 === 0),
          counterparty: proposal.proposedTerms.deliverables.filter((_, i) => i % 2 === 1),
        },
      },
      financials: {
        totalValue: proposal.financials.estimatedValue,
        currency: proposal.financials.currency,
      },
      confidentiality: true,
      status: isLocked ? 'draft' : 'pending_signatures',
      isLocked,
      lockReason: isLocked ? 'Pending required approvals' : undefined,
      unlockRequirements: missingApprovals.length > 0
        ? missingApprovals.map(a => `${a} approval received`)
        : ['All approvals received'],
      signatures: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return agreement;
  }

  /**
   * Generate an ecosystem report.
   */
  async generateEcosystemReport(
    _context: WorkflowContext,
    periodStart: Date,
    periodEnd: Date,
    opportunities: ExpansionOpportunity[],
    partnerships: PartnershipAgreement[]
  ): Promise<EcosystemReport> {
    const detectedCount = opportunities.length;
    const qualifiedCount = opportunities.filter(o => o.status === 'qualified' || o.status === 'approved').length;
    const rejectedCount = opportunities.filter(o => o.status === 'rejected').length;

    const activePartnerships = partnerships.filter(p => p.status === 'active');
    const newPartnerships = partnerships.filter(
      p => p.createdAt >= periodStart && p.createdAt <= periodEnd
    );
    const totalValue = activePartnerships.reduce((sum, p) => sum + p.financials.totalValue, 0);

    const prompt = `Generate an ecosystem report for Mossland for the period ${periodStart.toISOString().split('T')[0]} to ${periodEnd.toISOString().split('T')[0]}.

Metrics:
- Opportunities Detected: ${detectedCount}
- Opportunities Qualified: ${qualifiedCount}
- Opportunities Rejected: ${rejectedCount}
- Active Partnerships: ${activePartnerships.length}
- New Partnerships: ${newPartnerships.length}
- Total Partnership Value: $${totalValue}

Please provide:
1. Executive Summary (3-5 sentences)
2. Key Insights (3-5 bullet points)
3. Emerging Trends (2-3 bullet points)
4. Recommendations (2-3 bullet points)

Be concise and actionable.`;

    const response = await this.llmProvider.generate({
      prompt,
      maxTokens: 1000,
    });

    const reportContent = this.parseReportContent(response.content);

    return {
      id: `ER-${Date.now()}`,
      reportPeriod: { start: periodStart, end: periodEnd },
      executiveSummary: reportContent.summary,
      opportunitiesDetected: detectedCount,
      opportunitiesQualified: qualifiedCount,
      opportunitiesRejected: rejectedCount,
      activePartnerships: activePartnerships.length,
      newPartnerships: newPartnerships.length,
      partnershipValue: totalValue,
      metrics: {
        signalsProcessed: this.signalCache.size,
        assessmentsCompleted: qualifiedCount + rejectedCount,
        proposalsCreated: partnerships.length,
        agreementsSigned: partnerships.filter(p => p.status === 'signed' || p.status === 'active').length,
      },
      keyInsights: reportContent.insights,
      emergingTrends: reportContent.trends,
      recommendations: reportContent.recommendations,
      generatedBy: 'workflow-d-handler',
      generatedAt: new Date(),
    };
  }

  /**
   * Check if opportunity requires dual-house approval.
   */
  requiresDualHouseApproval(estimatedValue: number): boolean {
    return estimatedValue >= this.config.dualHouseRequired;
  }

  /**
   * Check if opportunity requires Director 3 approval.
   */
  requiresDirector3Approval(estimatedValue: number, category?: OpportunityCategory): boolean {
    if (estimatedValue >= this.config.director3Required) return true;
    if (category && this.config.highRiskCategories.includes(category)) return true;
    return false;
  }

  /**
   * Apply anti-abuse filters to a signal.
   */
  private applyAntiAbuseFilters(signal: DetectedSignal): { filtered: boolean; reason?: string } {
    const config = this.config.antiAbuse;

    // Check blocked domains
    if (signal.url) {
      for (const domain of config.blockedDomains) {
        if (signal.url.includes(domain)) {
          return { filtered: true, reason: `Blocked domain: ${domain}` };
        }
      }
    }

    // Check blocked patterns
    const content = `${signal.title} ${signal.description}`.toLowerCase();
    for (const pattern of config.blockedPatterns) {
      if (content.includes(pattern.toLowerCase())) {
        return { filtered: true, reason: `Blocked pattern: ${pattern}` };
      }
    }

    // Check minimum quality
    if (signal.qualityScore < config.minimumSignalQuality) {
      return { filtered: true, reason: `Quality ${signal.qualityScore} below minimum ${config.minimumSignalQuality}` };
    }

    // Check for duplicates (similarity)
    for (const [, cachedSignal] of this.signalCache) {
      const similarity = this.calculateSimilarity(signal, cachedSignal);
      if (similarity >= config.similarityThreshold) {
        return { filtered: true, reason: `Similar to existing signal ${cachedSignal.id}` };
      }
    }

    return { filtered: false };
  }

  /**
   * Calculate similarity between two signals.
   */
  private calculateSimilarity(a: DetectedSignal, b: DetectedSignal): number {
    const aWords = new Set(`${a.title} ${a.description}`.toLowerCase().split(/\s+/));
    const bWords = new Set(`${b.title} ${b.description}`.toLowerCase().split(/\s+/));

    const intersection = new Set([...aWords].filter(x => bWords.has(x)));
    const union = new Set([...aWords, ...bWords]);

    return intersection.size / union.size; // Jaccard similarity
  }

  /**
   * Reset daily issue count if it's a new day.
   */
  private resetDailyCountIfNeeded(): void {
    const now = new Date();
    if (now.toDateString() !== this.lastResetDate.toDateString()) {
      this.dailyIssueCount = 0;
      this.lastResetDate = now;
    }
  }

  /**
   * Gather agent opinions on an opportunity.
   */
  private async gatherAgentOpinions(
    _context: WorkflowContext,
    opportunity: ExpansionOpportunity,
    assessment: OpportunityAssessment
  ): Promise<AgentOpinion[]> {
    const agentRoles = ['strategist', 'risk_analyst', 'market_researcher'];
    const opinions: AgentOpinion[] = [];

    for (const role of agentRoles) {
      const prompt = `As a ${role}, provide your opinion on this ecosystem expansion opportunity.

Opportunity: ${opportunity.title}
Category: ${opportunity.category}
Assessment Score: ${assessment.overallScore}/100
Recommendation: ${assessment.recommendation}

Provide:
1. Your position (support/oppose/neutral)
2. Confidence level (0-100)
3. Brief reasoning (2-3 sentences)`;

      const response = await this.llmProvider.generate({
        prompt,
        maxTokens: 500,
      });

      const parsed = this.parseAgentOpinion(response.content, role);
      opinions.push({
        agentId: `${role}-agent`,
        agentName: role.charAt(0).toUpperCase() + role.slice(1).replace('_', ' '),
        position: parsed.position,
        confidence: parsed.confidence,
        reasoning: parsed.reasoning,
        timestamp: new Date(),
      });
    }

    return opinions;
  }

  // Parsing helpers
  private parseAssessmentScores(content: string): OpportunityAssessment['scores'] {
    const defaults = {
      strategicAlignment: 70,
      marketPotential: 65,
      technicalFeasibility: 75,
      financialViability: 60,
      riskLevel: 40,
      urgency: 50,
    };

    const patterns: Record<string, RegExp> = {
      strategicAlignment: /strategic\s*alignment[:\s]*(\d+)/i,
      marketPotential: /market\s*potential[:\s]*(\d+)/i,
      technicalFeasibility: /technical\s*feasibility[:\s]*(\d+)/i,
      financialViability: /financial\s*viability[:\s]*(\d+)/i,
      riskLevel: /risk\s*level[:\s]*(\d+)/i,
      urgency: /urgency[:\s]*(\d+)/i,
    };

    const scores = { ...defaults };
    for (const [key, pattern] of Object.entries(patterns)) {
      const match = content.match(pattern);
      if (match) {
        scores[key as keyof typeof scores] = Math.min(100, Math.max(0, parseInt(match[1], 10)));
      }
    }

    return scores;
  }

  private parseSwotAnalysis(content: string): {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  } {
    const extractBullets = (section: string): string[] => {
      const match = content.match(new RegExp(`${section}[:\\s]*([\\s\\S]*?)(?=(?:Weakness|Opportunit|Threat|Recommend|$))`, 'i'));
      if (!match) return ['Analysis not provided'];
      return match[1]
        .split(/[-•\n]/)
        .map(s => s.trim())
        .filter(s => s.length > 0)
        .slice(0, 3);
    };

    return {
      strengths: extractBullets('Strength'),
      weaknesses: extractBullets('Weakness'),
      opportunities: extractBullets('Opportunit'),
      threats: extractBullets('Threat'),
    };
  }

  private parseRecommendation(content: string): {
    decision: OpportunityAssessment['recommendation'];
    reasoning: string;
    actions: string[];
    dueDiligence: string[];
  } {
    let decision: OpportunityAssessment['recommendation'] = 'needs_more_info';
    if (/pursue|approve|proceed/i.test(content)) decision = 'pursue';
    else if (/reject|decline/i.test(content)) decision = 'reject';
    else if (/defer|delay|wait/i.test(content)) decision = 'defer';

    const reasoningMatch = content.match(/reason(?:ing)?[:\s]*([^.]+\.)/i);
    const reasoning = reasoningMatch ? reasoningMatch[1].trim() : 'Based on overall assessment.';

    const actionsMatch = content.match(/action[s]?[:\s]*([\s\S]*?)(?=due\s*diligence|$)/i);
    const actions = actionsMatch
      ? actionsMatch[1].split(/[-•\n]/).map(s => s.trim()).filter(s => s.length > 0).slice(0, 3)
      : ['Conduct further analysis'];

    const ddMatch = content.match(/due\s*diligence[:\s]*([\s\S]*?)$/i);
    const dueDiligence = ddMatch
      ? ddMatch[1].split(/[-•\n]/).map(s => s.trim()).filter(s => s.length > 0).slice(0, 3)
      : ['Background check', 'Financial review'];

    return { decision, reasoning, actions, dueDiligence };
  }

  private parseProposalDetails(content: string): {
    type: PartnershipProposal['proposedTerms']['type'];
    duration: string;
    scope: string[];
    deliverables: string[];
    milestones: PartnershipMilestone[];
    risks: PartnershipProposal['risks'];
  } {
    let type: PartnershipProposal['proposedTerms']['type'] = 'technical_integration';
    if (/marketing/i.test(content)) type = 'marketing_collaboration';
    else if (/invest/i.test(content)) type = 'investment';
    else if (/joint\s*venture/i.test(content)) type = 'joint_venture';
    else if (/licens/i.test(content)) type = 'licensing';

    const durationMatch = content.match(/duration[:\s]*([^.\n]+)/i);
    const duration = durationMatch ? durationMatch[1].trim() : '12 months';

    const scopeMatch = content.match(/scope[:\s]*([\s\S]*?)(?=deliverable|milestone|risk|$)/i);
    const scope = scopeMatch
      ? scopeMatch[1].split(/[-•\n]/).map(s => s.trim()).filter(s => s.length > 0).slice(0, 5)
      : ['Technical integration', 'Joint development'];

    const deliverablesMatch = content.match(/deliverable[s]?[:\s]*([\s\S]*?)(?=milestone|risk|$)/i);
    const deliverables = deliverablesMatch
      ? deliverablesMatch[1].split(/[-•\n]/).map(s => s.trim()).filter(s => s.length > 0).slice(0, 5)
      : ['Integration documentation', 'SDK development'];

    const milestones: PartnershipMilestone[] = [
      {
        id: 'M1',
        title: 'Initial Integration',
        description: 'Complete initial technical integration',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'pending',
        deliverables: ['Integration prototype'],
      },
      {
        id: 'M2',
        title: 'Full Deployment',
        description: 'Deploy to production',
        dueDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        status: 'pending',
        deliverables: ['Production deployment'],
      },
    ];

    const risks: PartnershipProposal['risks'] = [
      {
        description: 'Technical integration complexity',
        severity: 'medium',
        mitigation: 'Phased implementation approach',
      },
      {
        description: 'Market timing risk',
        severity: 'low',
        mitigation: 'Regular progress reviews',
      },
    ];

    return { type, duration, scope, deliverables, milestones, risks };
  }

  private parseReportContent(content: string): {
    summary: string;
    insights: string[];
    trends: string[];
    recommendations: string[];
  } {
    const summaryMatch = content.match(/summary[:\s]*([\s\S]*?)(?=insight|trend|recommend|$)/i);
    const summary = summaryMatch ? summaryMatch[1].trim().substring(0, 500) : 'Report generated successfully.';

    const insightsMatch = content.match(/insight[s]?[:\s]*([\s\S]*?)(?=trend|recommend|$)/i);
    const insights = insightsMatch
      ? insightsMatch[1].split(/[-•\n]/).map(s => s.trim()).filter(s => s.length > 0).slice(0, 5)
      : ['Growing ecosystem engagement'];

    const trendsMatch = content.match(/trend[s]?[:\s]*([\s\S]*?)(?=recommend|$)/i);
    const trends = trendsMatch
      ? trendsMatch[1].split(/[-•\n]/).map(s => s.trim()).filter(s => s.length > 0).slice(0, 3)
      : ['Increasing partnership interest'];

    const recommendationsMatch = content.match(/recommend[ation]*[s]?[:\s]*([\s\S]*)$/i);
    const recommendations = recommendationsMatch
      ? recommendationsMatch[1].split(/[-•\n]/).map(s => s.trim()).filter(s => s.length > 0).slice(0, 3)
      : ['Continue proactive outreach'];

    return { summary, insights, trends, recommendations };
  }

  private parseAgentOpinion(content: string, role: string): {
    position: string;
    confidence: number;
    reasoning: string;
  } {
    let position = 'neutral';
    if (/support|favor|approve/i.test(content)) position = 'support';
    else if (/oppose|against|reject/i.test(content)) position = 'oppose';

    const confidenceMatch = content.match(/confidence[:\s]*(\d+)/i);
    const confidence = confidenceMatch ? Math.min(100, Math.max(0, parseInt(confidenceMatch[1], 10))) : 70;

    const reasoningMatch = content.match(/reason(?:ing)?[:\s]*([^.]+\..*?(?:\.|$))/i);
    const reasoning = reasoningMatch ? reasoningMatch[1].trim() : `Assessment from ${role} perspective.`;

    return { position, confidence, reasoning };
  }
}

/**
 * Factory function to create a WorkflowDHandler.
 */
export function createWorkflowDHandler(
  llmProvider: LLMProvider,
  config?: Partial<WorkflowDConfig>
): WorkflowDHandler {
  const fullConfig = config
    ? {
        ...DEFAULT_WORKFLOW_D_CONFIG,
        ...config,
        alwaysOn: { ...DEFAULT_WORKFLOW_D_CONFIG.alwaysOn, ...config.alwaysOn },
        antiAbuse: { ...DEFAULT_WORKFLOW_D_CONFIG.antiAbuse, ...config.antiAbuse },
      }
    : DEFAULT_WORKFLOW_D_CONFIG;
  return new WorkflowDHandler(llmProvider, fullConfig);
}
