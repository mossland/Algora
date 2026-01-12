// ===========================================
// Workflow D Tests
// ===========================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  WorkflowDHandler,
  createWorkflowDHandler,
  DEFAULT_WORKFLOW_D_CONFIG,
  type ExpansionOpportunity,
  type DetectedSignal,
  type OpportunityAssessment,
  type PartnershipProposal,
  type PartnershipAgreement,
} from '../workflows/workflow-d.js';
import type { WorkflowContext } from '../types.js';
import type { LLMProvider } from '../specialist-manager.js';

// Mock LLM Provider
function createMockLLMProvider(): LLMProvider {
  return {
    generate: vi.fn().mockResolvedValue({
      content: `Strategic Alignment: 80
Market Potential: 75
Technical Feasibility: 85
Financial Viability: 70
Risk Level: 35
Urgency: 60

Strengths:
- Strong technical team
- Market opportunity

Weaknesses:
- Limited track record

Opportunities:
- Market expansion

Threats:
- Competition

Recommendation: Pursue
Reasoning: Good strategic fit for Mossland ecosystem.

Actions:
- Schedule meeting
- Prepare proposal

Due Diligence:
- Background check
- Financial review`,
      model: 'mock-model',
      tokensUsed: 1000,
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
    issueId: 'test-issue-004',
    workflowType: 'D',
    currentState: 'RESEARCH',
    issue: {
      id: 'test-issue-004',
      title: 'Partnership Opportunity: XYZ Protocol',
      description: 'Potential partnership with XYZ Protocol for ecosystem expansion',
      category: 'mossland_expansion',
      source: 'external',
      signalIds: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    stateHistory: [],
    agentOpinions: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// Create mock opportunity
function createMockOpportunity(): Omit<ExpansionOpportunity, 'id' | 'origin' | 'status' | 'detectedAt' | 'createdAt' | 'updatedAt'> {
  return {
    title: 'XYZ Protocol Partnership',
    description: 'Integration partnership with XYZ Protocol for DeFi functionality',
    category: 'partnership',
    counterpartyName: 'XYZ Protocol',
    counterpartyType: 'DeFi Protocol',
    counterpartyWebsite: 'https://xyz-protocol.io',
    significanceScore: 75,
    strategicFitScore: 80,
    riskScore: 30,
  };
}

// Create mock signal
function createMockSignal(): Omit<DetectedSignal, 'id' | 'processedAt' | 'resultingOpportunityId'> {
  return {
    source: 'rss:partnerships',
    title: 'New DeFi Integration Opportunity',
    description: 'XYZ Protocol announces partnership program',
    url: 'https://xyz-protocol.io/partnerships',
    detectedAt: new Date(),
    qualityScore: 80,
    similarSignals: [],
  };
}

describe('WorkflowDHandler', () => {
  let handler: WorkflowDHandler;
  let mockProvider: LLMProvider;

  beforeEach(() => {
    mockProvider = createMockLLMProvider();
    handler = new WorkflowDHandler(mockProvider);
  });

  describe('createWorkflowDHandler', () => {
    it('should create a handler with default config', () => {
      const h = createWorkflowDHandler(mockProvider);
      expect(h).toBeInstanceOf(WorkflowDHandler);
    });

    it('should create a handler with custom config', () => {
      const h = createWorkflowDHandler(mockProvider, {
        qualificationThreshold: 70,
        proposalThreshold: 80,
      });
      expect(h).toBeInstanceOf(WorkflowDHandler);
    });
  });

  describe('DEFAULT_WORKFLOW_D_CONFIG', () => {
    it('should have reasonable default values', () => {
      expect(DEFAULT_WORKFLOW_D_CONFIG.alwaysOn.enabled).toBe(true);
      expect(DEFAULT_WORKFLOW_D_CONFIG.alwaysOn.scanInterval).toBe('1h');
      expect(DEFAULT_WORKFLOW_D_CONFIG.alwaysOn.significanceThreshold).toBe(70);
      expect(DEFAULT_WORKFLOW_D_CONFIG.antiAbuse.maxIssuesPerDay).toBe(10);
      expect(DEFAULT_WORKFLOW_D_CONFIG.qualificationThreshold).toBe(60);
      expect(DEFAULT_WORKFLOW_D_CONFIG.proposalThreshold).toBe(75);
      expect(DEFAULT_WORKFLOW_D_CONFIG.dualHouseRequired).toBe(1000);
      expect(DEFAULT_WORKFLOW_D_CONFIG.director3Required).toBe(10000);
    });
  });

  describe('processCallBasedOpportunity', () => {
    it('should process a call-based opportunity and return assessment', async () => {
      const context = createMockContext();
      const opportunity = createMockOpportunity();

      const result = await handler.processCallBasedOpportunity(context, opportunity);

      expect(result).toHaveProperty('opportunity');
      expect(result).toHaveProperty('assessment');
      expect(result).toHaveProperty('opinions');
      expect(result.opportunity.id).toMatch(/^OPP-CB-/);
      expect(result.opportunity.origin).toBe('call_based');
      expect(result.assessment.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.opinions.length).toBeGreaterThan(0);
    });

    it('should qualify opportunity with high score', async () => {
      const context = createMockContext();
      const opportunity = createMockOpportunity();

      const result = await handler.processCallBasedOpportunity(context, opportunity);

      expect(result.opportunity.status).toBe('qualified');
    });
  });

  describe('processAlwaysOnSignal', () => {
    it('should process a valid signal and create opportunity', async () => {
      const context = createMockContext();
      const signal = createMockSignal();

      const result = await handler.processAlwaysOnSignal(context, signal);

      expect(result.filtered).toBe(false);
      expect(result.opportunity).toBeDefined();
      expect(result.opportunity?.id).toMatch(/^OPP-AO-/);
      expect(result.opportunity?.origin).toBe('always_on');
      expect(result.signal.processedAt).toBeDefined();
    });

    it('should filter signal below quality threshold', async () => {
      const context = createMockContext();
      const signal = createMockSignal();
      signal.qualityScore = 30; // Below threshold

      const result = await handler.processAlwaysOnSignal(context, signal);

      expect(result.filtered).toBe(true);
      expect(result.filterReason).toContain('below minimum');
      expect(result.opportunity).toBeUndefined();
    });

    it('should filter signal below significance threshold', async () => {
      const context = createMockContext();
      const signal = createMockSignal();
      signal.qualityScore = 60; // Above minimum but below significance

      const result = await handler.processAlwaysOnSignal(context, signal);

      expect(result.filtered).toBe(true);
      expect(result.filterReason).toContain('below threshold');
    });
  });

  describe('assessOpportunity', () => {
    it('should assess opportunity and return scores', async () => {
      const context = createMockContext();
      const opportunity: ExpansionOpportunity = {
        ...createMockOpportunity(),
        id: 'OPP-TEST-001',
        origin: 'call_based',
        status: 'under_review',
        detectedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const assessment = await handler.assessOpportunity(context, opportunity);

      expect(assessment.opportunityId).toBe(opportunity.id);
      expect(assessment.scores).toBeDefined();
      expect(assessment.overallScore).toBeGreaterThanOrEqual(0);
      expect(assessment.overallScore).toBeLessThanOrEqual(100);
      expect(assessment.recommendation).toMatch(/^(pursue|defer|reject|needs_more_info)$/);
      expect(assessment.strengthsAnalysis.length).toBeGreaterThan(0);
    });
  });

  describe('createPartnershipProposal', () => {
    it('should create proposal from qualified opportunity', async () => {
      const context = createMockContext();
      const opportunity: ExpansionOpportunity = {
        ...createMockOpportunity(),
        id: 'OPP-TEST-002',
        origin: 'call_based',
        status: 'qualified',
        detectedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const assessment: OpportunityAssessment = {
        id: 'OA-001',
        opportunityId: opportunity.id,
        scores: {
          strategicAlignment: 80,
          marketPotential: 75,
          technicalFeasibility: 85,
          financialViability: 70,
          riskLevel: 35,
          urgency: 60,
        },
        overallScore: 80,
        strengthsAnalysis: ['Strong team'],
        weaknessesAnalysis: ['Limited track record'],
        opportunitiesAnalysis: ['Market expansion'],
        threatsAnalysis: ['Competition'],
        recommendation: 'pursue',
        recommendationReasoning: 'Good fit',
        suggestedActions: ['Schedule meeting'],
        requiredDueDiligence: ['Background check'],
        assessedBy: 'handler',
        modelUsed: 'mock',
        assessedAt: new Date(),
      };

      const proposal = await handler.createPartnershipProposal(
        context,
        opportunity,
        assessment,
        5000
      );

      expect(proposal.id).toMatch(/^PP-/);
      expect(proposal.opportunityId).toBe(opportunity.id);
      expect(proposal.financials.estimatedValue).toBe(5000);
      expect(proposal.status).toBe('draft');
    });

    it('should throw error for low-score opportunity', async () => {
      const context = createMockContext();
      const opportunity: ExpansionOpportunity = {
        ...createMockOpportunity(),
        id: 'OPP-TEST-003',
        origin: 'call_based',
        status: 'under_review',
        detectedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const assessment: OpportunityAssessment = {
        id: 'OA-002',
        opportunityId: opportunity.id,
        scores: {
          strategicAlignment: 40,
          marketPotential: 35,
          technicalFeasibility: 45,
          financialViability: 30,
          riskLevel: 60,
          urgency: 40,
        },
        overallScore: 50, // Below threshold
        strengthsAnalysis: [],
        weaknessesAnalysis: [],
        opportunitiesAnalysis: [],
        threatsAnalysis: [],
        recommendation: 'defer',
        recommendationReasoning: 'Low score',
        suggestedActions: [],
        requiredDueDiligence: [],
        assessedBy: 'handler',
        modelUsed: 'mock',
        assessedAt: new Date(),
      };

      await expect(
        handler.createPartnershipProposal(context, opportunity, assessment, 5000)
      ).rejects.toThrow('below proposal threshold');
    });

    it('should require dual-house approval for high-value proposals', async () => {
      const context = createMockContext();
      const opportunity: ExpansionOpportunity = {
        ...createMockOpportunity(),
        id: 'OPP-TEST-004',
        origin: 'call_based',
        status: 'qualified',
        detectedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const assessment: OpportunityAssessment = {
        id: 'OA-003',
        opportunityId: opportunity.id,
        scores: {
          strategicAlignment: 80,
          marketPotential: 75,
          technicalFeasibility: 85,
          financialViability: 70,
          riskLevel: 35,
          urgency: 60,
        },
        overallScore: 80,
        strengthsAnalysis: [],
        weaknessesAnalysis: [],
        opportunitiesAnalysis: [],
        threatsAnalysis: [],
        recommendation: 'pursue',
        recommendationReasoning: 'Good fit',
        suggestedActions: [],
        requiredDueDiligence: [],
        assessedBy: 'handler',
        modelUsed: 'mock',
        assessedAt: new Date(),
      };

      const proposal = await handler.createPartnershipProposal(
        context,
        opportunity,
        assessment,
        5000 // Above dual-house threshold
      );

      expect(proposal.requiredApprovals.mossCoinHouse).toBe(true);
      expect(proposal.requiredApprovals.openSourceHouse).toBe(true);
    });

    it('should require Director 3 approval for very high-value proposals', async () => {
      const context = createMockContext();
      const opportunity: ExpansionOpportunity = {
        ...createMockOpportunity(),
        id: 'OPP-TEST-005',
        origin: 'call_based',
        status: 'qualified',
        detectedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const assessment: OpportunityAssessment = {
        id: 'OA-004',
        opportunityId: opportunity.id,
        scores: {
          strategicAlignment: 80,
          marketPotential: 75,
          technicalFeasibility: 85,
          financialViability: 70,
          riskLevel: 35,
          urgency: 60,
        },
        overallScore: 80,
        strengthsAnalysis: [],
        weaknessesAnalysis: [],
        opportunitiesAnalysis: [],
        threatsAnalysis: [],
        recommendation: 'pursue',
        recommendationReasoning: 'Good fit',
        suggestedActions: [],
        requiredDueDiligence: [],
        assessedBy: 'handler',
        modelUsed: 'mock',
        assessedAt: new Date(),
      };

      const proposal = await handler.createPartnershipProposal(
        context,
        opportunity,
        assessment,
        15000 // Above Director 3 threshold
      );

      expect(proposal.requiredApprovals.director3).toBe(true);
    });
  });

  describe('createPartnershipAgreement', () => {
    it('should create LOCKED agreement when approvals are missing', () => {
      const proposal: PartnershipProposal = {
        id: 'PP-001',
        opportunityId: 'OPP-001',
        title: 'Test Partnership',
        proposingParty: 'Mossland',
        counterparty: {
          name: 'XYZ Protocol',
          type: 'DeFi',
        },
        proposedTerms: {
          type: 'technical_integration',
          duration: '12 months',
          scope: ['Integration'],
          deliverables: ['SDK', 'Documentation'],
          milestones: [],
        },
        financials: {
          estimatedValue: 5000,
          currency: 'USD',
        },
        risks: [],
        status: 'pending_approval',
        requiredApprovals: {
          mossCoinHouse: true,
          openSourceHouse: true,
          director3: false,
        },
        approvalStatus: {
          mossCoinHouse: true,
          // openSourceHouse not approved yet
        },
        createdBy: 'handler',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const agreement = handler.createPartnershipAgreement(proposal, 'Mossland Rep');

      expect(agreement.isLocked).toBe(true);
      expect(agreement.lockReason).toBe('Pending required approvals');
      expect(agreement.unlockRequirements).toContain('OpenSource House approval received');
    });

    it('should create unlocked agreement when all approvals received', () => {
      const proposal: PartnershipProposal = {
        id: 'PP-002',
        opportunityId: 'OPP-002',
        title: 'Test Partnership',
        proposingParty: 'Mossland',
        counterparty: {
          name: 'XYZ Protocol',
          type: 'DeFi',
        },
        proposedTerms: {
          type: 'technical_integration',
          duration: '12 months',
          scope: ['Integration'],
          deliverables: ['SDK', 'Documentation'],
          milestones: [],
        },
        financials: {
          estimatedValue: 5000,
          currency: 'USD',
        },
        risks: [],
        status: 'approved',
        requiredApprovals: {
          mossCoinHouse: true,
          openSourceHouse: true,
          director3: false,
        },
        approvalStatus: {
          mossCoinHouse: true,
          openSourceHouse: true,
        },
        createdBy: 'handler',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const agreement = handler.createPartnershipAgreement(proposal, 'Mossland Rep');

      expect(agreement.isLocked).toBe(false);
      expect(agreement.status).toBe('pending_signatures');
    });
  });

  describe('generateEcosystemReport', () => {
    it('should generate ecosystem report with metrics', async () => {
      const context = createMockContext();
      const periodStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const periodEnd = new Date();
      const opportunities: ExpansionOpportunity[] = [
        {
          ...createMockOpportunity(),
          id: 'OPP-001',
          origin: 'call_based',
          status: 'qualified',
          detectedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          ...createMockOpportunity(),
          id: 'OPP-002',
          origin: 'always_on',
          status: 'rejected',
          detectedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      const partnerships: PartnershipAgreement[] = [];

      const report = await handler.generateEcosystemReport(
        context,
        periodStart,
        periodEnd,
        opportunities,
        partnerships
      );

      expect(report.id).toMatch(/^ER-/);
      expect(report.opportunitiesDetected).toBe(2);
      expect(report.opportunitiesQualified).toBe(1);
      expect(report.opportunitiesRejected).toBe(1);
      expect(report.keyInsights.length).toBeGreaterThan(0);
    });
  });

  describe('requiresDualHouseApproval', () => {
    it('should return true for values at or above threshold', () => {
      expect(handler.requiresDualHouseApproval(1000)).toBe(true);
      expect(handler.requiresDualHouseApproval(5000)).toBe(true);
    });

    it('should return false for values below threshold', () => {
      expect(handler.requiresDualHouseApproval(999)).toBe(false);
      expect(handler.requiresDualHouseApproval(500)).toBe(false);
    });
  });

  describe('requiresDirector3Approval', () => {
    it('should return true for values at or above threshold', () => {
      expect(handler.requiresDirector3Approval(10000)).toBe(true);
      expect(handler.requiresDirector3Approval(15000)).toBe(true);
    });

    it('should return true for high-risk categories', () => {
      expect(handler.requiresDirector3Approval(1000, 'acquisition')).toBe(true);
      expect(handler.requiresDirector3Approval(1000, 'investment')).toBe(true);
    });

    it('should return false for low values without high-risk category', () => {
      expect(handler.requiresDirector3Approval(5000, 'partnership')).toBe(false);
    });
  });
});
