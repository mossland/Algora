import type Database from 'better-sqlite3';
import { Server as SocketServer } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { llmService, type ModelComplexity } from '../llm';

export interface DecisionPacket {
  id: string;
  proposal_id: string;
  version: number;
  summary: string;
  background: string;
  options: DecisionOption[];
  agent_analysis: AgentAnalysis[];
  risk_assessment: RiskAssessment;
  recommendation: string;
  supporting_evidence: string[];
  generated_at: string;
  generated_by: string;
  model_used?: string;
}

export interface DecisionOption {
  id: string;
  label: string;
  description: string;
  pros: string[];
  cons: string[];
  estimated_impact: 'high' | 'medium' | 'low';
}

export interface AgentAnalysis {
  agent_id: string;
  agent_name: string;
  agent_group: string;
  stance: 'support' | 'oppose' | 'neutral';
  confidence: number;
  reasoning: string;
  key_concerns: string[];
}

export interface RiskAssessment {
  overall_risk: 'high' | 'medium' | 'low';
  risks: {
    category: string;
    description: string;
    likelihood: 'high' | 'medium' | 'low';
    impact: 'high' | 'medium' | 'low';
    mitigation?: string;
  }[];
}

export class DecisionPacketService {
  private db: Database.Database;
  private io: SocketServer;

  constructor(db: Database.Database, io: SocketServer) {
    this.db = db;
    this.io = io;
    this.initializeTables();
  }

  private initializeTables(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS decision_packets (
        id TEXT PRIMARY KEY,
        proposal_id TEXT NOT NULL,
        version INTEGER DEFAULT 1,
        content TEXT NOT NULL,
        summary TEXT,
        generated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        generated_by TEXT NOT NULL,
        model_used TEXT,
        FOREIGN KEY (proposal_id) REFERENCES proposals(id)
      );

      CREATE INDEX IF NOT EXISTS idx_decision_packets_proposal ON decision_packets(proposal_id);
    `);
  }

  // === Generate Decision Packet ===

  async generatePacket(proposalId: string, requestedBy: string): Promise<DecisionPacket> {
    const proposal = this.db.prepare('SELECT * FROM proposals WHERE id = ?').get(proposalId) as any;
    if (!proposal) throw new Error('Proposal not found');

    // Get related issue if exists
    const issue = proposal.issue_id
      ? this.db.prepare('SELECT * FROM issues WHERE id = ?').get(proposal.issue_id) as any
      : null;

    // Get related signals
    const signals = issue
      ? this.db.prepare(`
          SELECT s.* FROM signals s
          JOIN issue_signals iss ON s.id = iss.signal_id
          WHERE iss.issue_id = ?
          ORDER BY s.timestamp DESC
          LIMIT 10
        `).all(issue.id)
      : [];

    // Get agent endorsements
    const endorsements = this.db.prepare(`
      SELECT pe.*, a.display_name, a.group_name
      FROM proposal_endorsements pe
      JOIN agents a ON pe.agent_id = a.id
      WHERE pe.proposal_id = ?
    `).all(proposalId) as any[];

    // Get discussion comments
    const comments = this.db.prepare(`
      SELECT * FROM proposal_comments
      WHERE proposal_id = ?
      ORDER BY created_at ASC
      LIMIT 20
    `).all(proposalId);

    // Generate packet using LLM
    const packet = await this.generateWithLLM(proposal, issue, signals, endorsements, comments);

    // Save to database
    const packetId = uuidv4();
    const currentVersion = this.getLatestVersion(proposalId) + 1;

    this.db.prepare(`
      INSERT INTO decision_packets (id, proposal_id, version, content, summary, generated_by, model_used)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      packetId,
      proposalId,
      currentVersion,
      JSON.stringify(packet),
      packet.summary,
      requestedBy,
      packet.model_used
    );

    // Update proposal with decision packet reference
    this.db.prepare(`
      UPDATE proposals SET decision_packet = ?, updated_at = ? WHERE id = ?
    `).run(packetId, new Date().toISOString(), proposalId);

    const savedPacket = { ...packet, id: packetId, version: currentVersion };

    this.io.emit('decision_packet:generated', { proposalId, packet: savedPacket });
    this.logActivity('DECISION_PACKET_GENERATED', 'info', `Decision packet generated for: ${proposal.title}`, {
      proposalId,
      packetId,
      version: currentVersion,
    });

    return savedPacket;
  }

  private async generateWithLLM(
    proposal: any,
    issue: any | null,
    signals: any[],
    endorsements: any[],
    comments: any[]
  ): Promise<DecisionPacket> {
    const context = this.buildContext(proposal, issue, signals, endorsements, comments);

    const prompt = `You are a governance analyst creating a Decision Packet for MOC token holders.
Based on the following information, create a comprehensive decision packet in JSON format.

${context}

Generate a JSON decision packet with this structure:
{
  "summary": "2-3 sentence executive summary",
  "background": "Detailed background context (2-3 paragraphs)",
  "options": [
    {
      "id": "option_1",
      "label": "Option name",
      "description": "What this option means",
      "pros": ["Pro 1", "Pro 2"],
      "cons": ["Con 1", "Con 2"],
      "estimated_impact": "high|medium|low"
    }
  ],
  "agent_analysis": [
    {
      "agent_id": "agent_id",
      "agent_name": "Agent Name",
      "agent_group": "Group",
      "stance": "support|oppose|neutral",
      "confidence": 0.8,
      "reasoning": "Why this stance",
      "key_concerns": ["Concern 1"]
    }
  ],
  "risk_assessment": {
    "overall_risk": "high|medium|low",
    "risks": [
      {
        "category": "Risk category",
        "description": "Risk description",
        "likelihood": "high|medium|low",
        "impact": "high|medium|low",
        "mitigation": "How to mitigate"
      }
    ]
  },
  "recommendation": "Clear recommendation with reasoning",
  "supporting_evidence": ["Evidence point 1", "Evidence point 2"]
}

Respond ONLY with the JSON, no other text.`;

    try {
      const response = await llmService.generate({
        prompt,
        complexity: 'quality' as ModelComplexity,
        maxTokens: 2048,
        temperature: 0.3,
      });

      // Parse JSON from response
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to extract JSON from LLM response');
      }

      const packet = JSON.parse(jsonMatch[0]);

      return {
        ...packet,
        id: '',
        proposal_id: proposal.id,
        version: 0,
        generated_at: new Date().toISOString(),
        generated_by: 'system',
        model_used: response.model,
      };
    } catch (error) {
      console.error('[DecisionPacket] LLM generation failed:', error);

      // Return a basic packet if LLM fails
      return this.generateBasicPacket(proposal, issue, endorsements);
    }
  }

  private buildContext(
    proposal: any,
    issue: any | null,
    signals: any[],
    endorsements: any[],
    comments: any[]
  ): string {
    let context = `## Proposal
Title: ${proposal.title}
Description: ${proposal.description}
Category: ${proposal.category || 'General'}
Status: ${proposal.status}
`;

    if (issue) {
      context += `
## Related Issue
Title: ${issue.title}
Description: ${issue.description}
Priority: ${issue.priority}
`;
    }

    if (signals.length > 0) {
      context += `
## Related Signals (${signals.length})
${signals.map(s => `- [${s.severity}] ${s.source}: ${s.description?.substring(0, 200)}`).join('\n')}
`;
    }

    if (endorsements.length > 0) {
      context += `
## Agent Endorsements (${endorsements.length})
${endorsements.map(e => `- ${e.display_name} (${e.group_name}): ${e.stance} (${(e.confidence * 100).toFixed(0)}% confidence) - ${e.reasoning}`).join('\n')}
`;
    }

    if (comments.length > 0) {
      context += `
## Discussion Points (${comments.length} comments)
${comments.slice(0, 10).map(c => `- ${c.author_type}: ${c.content?.substring(0, 200)}`).join('\n')}
`;
    }

    return context;
  }

  private generateBasicPacket(proposal: any, issue: any | null, endorsements: any[]): DecisionPacket {
    const supportCount = endorsements.filter(e => e.stance === 'support').length;
    const opposeCount = endorsements.filter(e => e.stance === 'oppose').length;

    return {
      id: '',
      proposal_id: proposal.id,
      version: 0,
      summary: `Proposal "${proposal.title}" requires community decision. ${supportCount} agents support, ${opposeCount} oppose.`,
      background: proposal.description,
      options: [
        {
          id: 'approve',
          label: 'Approve Proposal',
          description: 'Accept and implement the proposed changes',
          pros: ['Addresses the identified issue', 'Has agent support'],
          cons: ['May have unforeseen consequences', 'Resource commitment required'],
          estimated_impact: 'medium',
        },
        {
          id: 'reject',
          label: 'Reject Proposal',
          description: 'Decline the proposed changes',
          pros: ['No resource commitment', 'Maintains status quo'],
          cons: ['Issue remains unaddressed', 'May recur'],
          estimated_impact: 'low',
        },
        {
          id: 'defer',
          label: 'Defer Decision',
          description: 'Request more information before deciding',
          pros: ['More time for analysis', 'Better informed decision'],
          cons: ['Delays resolution', 'Issue may escalate'],
          estimated_impact: 'low',
        },
      ],
      agent_analysis: endorsements.map(e => ({
        agent_id: e.agent_id,
        agent_name: e.display_name,
        agent_group: e.group_name,
        stance: e.stance,
        confidence: e.confidence,
        reasoning: e.reasoning || 'No reasoning provided',
        key_concerns: [],
      })),
      risk_assessment: {
        overall_risk: 'medium',
        risks: [
          {
            category: 'Implementation',
            description: 'Proposal may require significant resources to implement',
            likelihood: 'medium',
            impact: 'medium',
            mitigation: 'Phased implementation approach',
          },
        ],
      },
      recommendation: supportCount > opposeCount
        ? 'Based on agent consensus, approval is recommended.'
        : 'Further discussion is recommended before approval.',
      supporting_evidence: issue
        ? [`Related to issue: ${issue.title}`, `Issue priority: ${issue.priority}`]
        : [],
      generated_at: new Date().toISOString(),
      generated_by: 'system',
    };
  }

  // === Query Methods ===

  getPacket(proposalId: string, version?: number): DecisionPacket | null {
    let packet: any;

    if (version) {
      packet = this.db.prepare(`
        SELECT * FROM decision_packets WHERE proposal_id = ? AND version = ?
      `).get(proposalId, version);
    } else {
      packet = this.db.prepare(`
        SELECT * FROM decision_packets WHERE proposal_id = ? ORDER BY version DESC LIMIT 1
      `).get(proposalId);
    }

    if (!packet) return null;

    return {
      ...JSON.parse(packet.content),
      id: packet.id,
      proposal_id: packet.proposal_id,
      version: packet.version,
      generated_at: packet.generated_at,
      generated_by: packet.generated_by,
      model_used: packet.model_used,
    };
  }

  getPacketVersions(proposalId: string): { version: number; generated_at: string; summary: string }[] {
    return this.db.prepare(`
      SELECT version, generated_at, summary FROM decision_packets
      WHERE proposal_id = ?
      ORDER BY version DESC
    `).all(proposalId) as any[];
  }

  private getLatestVersion(proposalId: string): number {
    const result = this.db.prepare(`
      SELECT MAX(version) as max_version FROM decision_packets WHERE proposal_id = ?
    `).get(proposalId) as { max_version: number } | undefined;

    return result?.max_version || 0;
  }

  // === Update Packet ===

  async regeneratePacket(proposalId: string, requestedBy: string): Promise<DecisionPacket> {
    return this.generatePacket(proposalId, requestedBy);
  }

  private logActivity(type: string, severity: string, message: string, details: any): void {
    this.db.prepare(`
      INSERT INTO activity_log (id, type, severity, timestamp, message, details)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(uuidv4(), type, severity, new Date().toISOString(), message, JSON.stringify(details));
  }
}
