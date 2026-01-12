// ===========================================
// Workflow B: Agentic AI Free Debate
// ===========================================
// Open-ended deliberation on strategic questions,
// community proposals, or exploratory topics

import type {
  WorkflowContext,
  AgentOpinion,
} from '../types.js';
import type { LLMProvider } from '../specialist-manager.js';

// ============================================
// Types for Free Debate Workflow
// ============================================

/**
 * Debate topic source types.
 */
export type DebateSource =
  | 'community'
  | 'agent_initiated'
  | 'strategic_query'
  | 'governance_proposal'
  | 'external_event';

/**
 * Debate topic categories.
 */
export type DebateCategory =
  | 'strategy'
  | 'technology'
  | 'governance'
  | 'ecosystem'
  | 'community'
  | 'tokenomics'
  | 'partnerships'
  | 'open';

/**
 * Debate phase types.
 */
export type DebatePhase =
  | 'opening'
  | 'arguments'
  | 'rebuttals'
  | 'synthesis'
  | 'conclusion';

/**
 * A debate topic to discuss.
 */
export interface DebateTopic {
  id: string;
  title: string;
  description: string;
  source: DebateSource;
  category: DebateCategory;
  proposedBy: string;
  backgroundContext?: string;
  relatedIssues?: string[];
  createdAt: Date;
}

/**
 * An argument made during debate.
 */
export interface DebateArgument {
  id: string;
  debateId: string;
  agentId: string;
  agentName: string;
  phase: DebatePhase;
  position: 'for' | 'against' | 'neutral' | 'alternative';
  content: string;
  supportingPoints: string[];
  counterTo?: string; // ID of argument this counters
  confidence: number;
  timestamp: Date;
}

/**
 * A debate thread containing multiple arguments.
 */
export interface DebateThread {
  id: string;
  topicId: string;
  title: string;
  arguments: DebateArgument[];
  participants: string[];
  startedAt: Date;
  lastActivityAt: Date;
  status: 'active' | 'concluded' | 'stalled';
}

/**
 * Consensus assessment for a debate.
 */
export interface ConsensusAssessment {
  debateId: string;
  consensusReached: boolean;
  consensusScore: number; // 0-100
  majorityPosition?: string;
  dissenting: string[];
  keyAgreements: string[];
  unresolvedPoints: string[];
  assessedAt: Date;
}

/**
 * A debate summary document.
 */
export interface DebateSummary {
  id: string;
  debateId: string;
  topicId: string;
  title: string;
  executiveSummary: string;
  backgroundContext: string;
  keyPositions: {
    position: string;
    supporters: string[];
    mainArguments: string[];
    strength: number;
  }[];
  counterarguments: {
    target: string;
    content: string;
    raisedBy: string;
    addressed: boolean;
  }[];
  synthesis: {
    commonGround: string[];
    keyDivergences: string[];
    emergingConsensus?: string;
    openQuestions: string[];
  };
  conclusion: string;
  recommendations: string[];
  consensus: ConsensusAssessment;
  provenance: {
    contentHash: string;
    createdBy: string;
    modelUsed: string;
    generatedAt: Date;
  };
}

/**
 * Configuration for Workflow B.
 */
export interface WorkflowBConfig {
  minParticipants: number;
  maxDebateDurationHours: number;
  consensusThreshold: number;
  requireRedTeam: boolean;
  autoGenerateSummary: boolean;
  phases: DebatePhase[];
}

/**
 * Default configuration.
 */
export const DEFAULT_WORKFLOW_B_CONFIG: WorkflowBConfig = {
  minParticipants: 3,
  maxDebateDurationHours: 72,
  consensusThreshold: 70,
  requireRedTeam: true,
  autoGenerateSummary: true,
  phases: ['opening', 'arguments', 'rebuttals', 'synthesis', 'conclusion'],
};

// ============================================
// Workflow B Handler
// ============================================

/**
 * Handler for Workflow B: Agentic AI Free Debate.
 *
 * This workflow handles open-ended deliberation on strategic questions,
 * community proposals, or exploratory topics. It facilitates structured
 * debate between agents and synthesizes results.
 */
export class WorkflowBHandler {
  private config: WorkflowBConfig;
  private llmProvider: LLMProvider;

  constructor(llmProvider: LLMProvider, config?: Partial<WorkflowBConfig>) {
    this.llmProvider = llmProvider;
    this.config = { ...DEFAULT_WORKFLOW_B_CONFIG, ...config };
  }

  /**
   * Initialize a debate from a topic.
   */
  async initializeDebate(
    _context: WorkflowContext,
    topic: DebateTopic
  ): Promise<DebateThread> {
    const debateId = `debate-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    return {
      id: debateId,
      topicId: topic.id,
      title: topic.title,
      arguments: [],
      participants: [],
      startedAt: new Date(),
      lastActivityAt: new Date(),
      status: 'active',
    };
  }

  /**
   * Execute the debate phase - gather arguments from participating agents.
   */
  async executeDebatePhase(
    context: WorkflowContext,
    thread: DebateThread,
    phase: DebatePhase
  ): Promise<{
    thread: DebateThread;
    arguments: DebateArgument[];
  }> {
    const agents = this.selectDebateAgents(context);
    const newArguments: DebateArgument[] = [];

    for (const agent of agents) {
      const argument = await this.generateAgentArgument(
        agent,
        thread,
        phase,
        context
      );
      newArguments.push(argument);

      // Add participant if not already in list
      if (!thread.participants.includes(agent.agentId)) {
        thread.participants.push(agent.agentId);
      }
    }

    // Add red team challenge if required
    if (this.config.requireRedTeam && phase === 'rebuttals') {
      const redTeamArgument = await this.generateRedTeamChallenge(
        thread,
        newArguments,
        context
      );
      newArguments.push(redTeamArgument);
    }

    // Update thread
    thread.arguments.push(...newArguments);
    thread.lastActivityAt = new Date();

    return {
      thread,
      arguments: newArguments,
    };
  }

  /**
   * Execute full deliberation with all phases.
   */
  async executeFullDeliberation(
    context: WorkflowContext,
    topic: DebateTopic
  ): Promise<{
    thread: DebateThread;
    consensus: ConsensusAssessment;
    opinions: AgentOpinion[];
  }> {
    // Initialize debate
    let thread = await this.initializeDebate(context, topic);

    // Execute each phase
    for (const phase of this.config.phases) {
      const result = await this.executeDebatePhase(context, thread, phase);
      thread = result.thread;
    }

    // Assess consensus
    const consensus = await this.assessConsensus(thread);

    // Convert to AgentOpinions for compatibility
    const opinions = this.convertToAgentOpinions(thread);

    return {
      thread,
      consensus,
      opinions,
    };
  }

  /**
   * Assess consensus from debate arguments.
   */
  async assessConsensus(thread: DebateThread): Promise<ConsensusAssessment> {
    // Analyze positions
    const positions = this.analyzePositions(thread);

    // Use LLM to assess consensus
    const assessmentPrompt = `Analyze the following debate and assess consensus:

Debate Topic: ${thread.title}

Arguments:
${thread.arguments.map((a) => `- [${a.agentName}] (${a.position}): ${a.content}`).join('\n')}

Provide:
1. Whether consensus was reached (yes/no)
2. Consensus score (0-100)
3. Majority position if any
4. Key agreements
5. Unresolved points`;

    const response = await this.llmProvider.generate({
      prompt: assessmentPrompt,
      systemPrompt: `You are an expert debate moderator assessing consensus.
Provide objective analysis of the debate positions and their alignment.`,
      maxTokens: 1500,
    });

    // Extract consensus score from response
    const consensusScore = this.extractConsensusScore(response.content);
    const consensusReached = consensusScore >= this.config.consensusThreshold;

    // Find majority position
    const majorityPosition = positions.length > 0 ? positions[0].position : undefined;

    // Find dissenting agents
    const dissenting = thread.arguments
      .filter((a) => a.position === 'against')
      .map((a) => a.agentId);

    return {
      debateId: thread.id,
      consensusReached,
      consensusScore,
      majorityPosition,
      dissenting,
      keyAgreements: ['Points of agreement extracted from debate'],
      unresolvedPoints: ['Unresolved points from debate'],
      assessedAt: new Date(),
    };
  }

  /**
   * Generate a debate summary document.
   */
  async generateDebateSummary(
    thread: DebateThread,
    topic: DebateTopic,
    consensus: ConsensusAssessment
  ): Promise<DebateSummary> {
    const summaryPrompt = `Create a comprehensive summary of the following debate:

Topic: ${topic.title}
Description: ${topic.description}
Category: ${topic.category}

Arguments (${thread.arguments.length} total):
${thread.arguments.map((a) => `
[${a.phase}] ${a.agentName} (${a.position}):
${a.content}
Supporting points: ${a.supportingPoints.join('; ')}
`).join('\n')}

Consensus Assessment:
- Consensus Reached: ${consensus.consensusReached}
- Consensus Score: ${consensus.consensusScore}%
- Majority Position: ${consensus.majorityPosition || 'None clear'}

Create a detailed summary including:
1. Executive summary (2-3 sentences)
2. Key positions and their supporters
3. Main counterarguments
4. Synthesis of common ground and divergences
5. Conclusion and recommendations`;

    const response = await this.llmProvider.generate({
      prompt: summaryPrompt,
      systemPrompt: `You are an expert at synthesizing debates into clear, actionable summaries.
Write in a professional, neutral tone that fairly represents all positions.`,
      maxTokens: 3000,
    });

    // Extract key positions
    const keyPositions = this.extractKeyPositions(thread);

    // Extract counterarguments
    const counterarguments = this.extractCounterarguments(thread);

    const contentHash = this.generateContentHash(response.content);

    return {
      id: `DS-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${thread.id.slice(-6)}`,
      debateId: thread.id,
      topicId: topic.id,
      title: `Debate Summary: ${topic.title}`,
      executiveSummary: this.extractExecutiveSummary(response.content),
      backgroundContext: topic.backgroundContext || topic.description,
      keyPositions,
      counterarguments,
      synthesis: {
        commonGround: consensus.keyAgreements,
        keyDivergences: consensus.unresolvedPoints,
        emergingConsensus: consensus.consensusReached ? consensus.majorityPosition : undefined,
        openQuestions: ['Questions requiring further exploration'],
      },
      conclusion: this.extractConclusion(response.content),
      recommendations: this.extractRecommendations(response.content),
      consensus,
      provenance: {
        contentHash,
        createdBy: 'workflow-b-handler',
        modelUsed: response.model || 'unknown',
        generatedAt: new Date(),
      },
    };
  }

  /**
   * Check if debate should continue or conclude.
   */
  shouldContinueDebate(thread: DebateThread): boolean {
    // Check duration
    const durationHours =
      (Date.now() - thread.startedAt.getTime()) / (1000 * 60 * 60);
    if (durationHours >= this.config.maxDebateDurationHours) {
      return false;
    }

    // Check if minimum participants have contributed
    if (thread.participants.length < this.config.minParticipants) {
      return true; // Continue to get more participants
    }

    // Check if all phases have been completed
    const phasesCompleted = new Set(thread.arguments.map((a) => a.phase));
    const allPhasesComplete = this.config.phases.every((p) =>
      phasesCompleted.has(p)
    );

    return !allPhasesComplete;
  }

  // ============================================
  // Private Helper Methods
  // ============================================

  /**
   * Select agents to participate in debate based on context.
   */
  private selectDebateAgents(
    _context: WorkflowContext
  ): { agentId: string; agentName: string; role: string; perspective: string }[] {
    // Default debate participants
    return [
      {
        agentId: 'strategist-1',
        agentName: 'Strategy Prime',
        role: 'Strategic Analyst',
        perspective: 'Focus on long-term strategic implications and alignment with Mossland vision.',
      },
      {
        agentId: 'community-1',
        agentName: 'Community Voice',
        role: 'Community Advocate',
        perspective: 'Represent community interests and grassroots perspectives.',
      },
      {
        agentId: 'builder-1',
        agentName: 'Builder One',
        role: 'Technical Expert',
        perspective: 'Evaluate technical feasibility and implementation considerations.',
      },
      {
        agentId: 'investor-1',
        agentName: 'Market Watch',
        role: 'Economic Analyst',
        perspective: 'Assess economic implications and market dynamics.',
      },
      {
        agentId: 'guardian-1',
        agentName: 'Risk Guardian',
        role: 'Risk Analyst',
        perspective: 'Identify potential risks and mitigation strategies.',
      },
    ];
  }

  /**
   * Generate an argument from an agent.
   */
  private async generateAgentArgument(
    agent: { agentId: string; agentName: string; role: string; perspective: string },
    thread: DebateThread,
    phase: DebatePhase,
    context: WorkflowContext
  ): Promise<DebateArgument> {
    const phaseInstructions = this.getPhaseInstructions(phase, thread);

    const prompt = `${agent.perspective}

Topic: ${thread.title}
Current Phase: ${phase}
${phaseInstructions}

Issue Context:
${context.issue.description}

${thread.arguments.length > 0 ? `
Previous Arguments:
${thread.arguments.slice(-5).map((a) => `- [${a.agentName}] (${a.position}): ${a.content}`).join('\n')}
` : ''}

Provide your argument including:
1. Your position (for/against/neutral/alternative)
2. Main argument (2-3 paragraphs)
3. Supporting points (3-5 bullet points)
4. Confidence level (0-100)`;

    const response = await this.llmProvider.generate({
      prompt,
      systemPrompt: `You are ${agent.agentName}, a ${agent.role} in the Algora governance debate.
Provide a thoughtful, well-reasoned argument from your specialized perspective.
Be constructive and focus on advancing the discussion.`,
      maxTokens: 1200,
    });

    // Extract position and confidence
    const position = this.extractPosition(response.content);
    const confidence = this.extractConfidence(response.content);

    return {
      id: `arg-${Date.now()}-${agent.agentId}`,
      debateId: thread.id,
      agentId: agent.agentId,
      agentName: agent.agentName,
      phase,
      position,
      content: response.content,
      supportingPoints: this.extractSupportingPoints(response.content),
      confidence,
      timestamp: new Date(),
    };
  }

  /**
   * Generate a red team challenge.
   */
  private async generateRedTeamChallenge(
    thread: DebateThread,
    currentArguments: DebateArgument[],
    _context: WorkflowContext
  ): Promise<DebateArgument> {
    // Find the majority position to challenge
    const positions = this.analyzePositions({
      ...thread,
      arguments: [...thread.arguments, ...currentArguments],
    });
    const majorityPosition = positions[0]?.position || 'for';

    const prompt = `As a Red Team analyst, challenge the majority position in this debate.

Topic: ${thread.title}
Majority Position: ${majorityPosition}

Key arguments to challenge:
${currentArguments
  .filter((a) => a.position === majorityPosition)
  .map((a) => `- ${a.agentName}: ${a.content.slice(0, 200)}...`)
  .join('\n')}

Provide:
1. Devil's advocate counterarguments
2. Potential blind spots or assumptions being made
3. Scenarios where the majority position could fail
4. Alternative perspectives that haven't been considered`;

    const response = await this.llmProvider.generate({
      prompt,
      systemPrompt: `You are a Red Team analyst. Your role is to constructively challenge prevailing opinions
and identify potential weaknesses in arguments. Be rigorous but fair.`,
      maxTokens: 1500,
    });

    return {
      id: `arg-${Date.now()}-red-team`,
      debateId: thread.id,
      agentId: 'red-team-1',
      agentName: 'Red Team Analyst',
      phase: 'rebuttals',
      position: 'against',
      content: response.content,
      supportingPoints: ['Challenging majority assumptions', 'Identifying blind spots'],
      confidence: 75,
      timestamp: new Date(),
    };
  }

  /**
   * Get instructions for each debate phase.
   */
  private getPhaseInstructions(phase: DebatePhase, thread: DebateThread): string {
    const instructions: Record<DebatePhase, string> = {
      opening: `This is the opening phase. Present your initial position on the topic.
State your stance clearly and provide foundational reasoning.`,

      arguments: `This is the main arguments phase. Develop your position with detailed reasoning.
Build on your opening statement with evidence and logical analysis.`,

      rebuttals: `This is the rebuttals phase. Address counterarguments from other participants.
${thread.arguments.length > 0 ? 'Consider the arguments made so far and respond to opposing views.' : ''}`,

      synthesis: `This is the synthesis phase. Look for common ground and potential compromises.
Identify areas of agreement and propose ways to bridge differences.`,

      conclusion: `This is the conclusion phase. Summarize your final position.
State your recommendation and any conditions or caveats.`,
    };

    return instructions[phase];
  }

  /**
   * Analyze positions from debate arguments.
   */
  private analyzePositions(
    thread: DebateThread
  ): { position: string; count: number; supporters: string[] }[] {
    const positionMap = new Map<string, string[]>();

    for (const arg of thread.arguments) {
      const supporters = positionMap.get(arg.position) || [];
      if (!supporters.includes(arg.agentId)) {
        supporters.push(arg.agentId);
      }
      positionMap.set(arg.position, supporters);
    }

    return Array.from(positionMap.entries())
      .map(([position, supporters]) => ({
        position,
        count: supporters.length,
        supporters,
      }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Convert debate arguments to AgentOpinions.
   */
  private convertToAgentOpinions(thread: DebateThread): AgentOpinion[] {
    // Group by agent and take their final position
    const agentFinalArgs = new Map<string, DebateArgument>();

    for (const arg of thread.arguments) {
      agentFinalArgs.set(arg.agentId, arg);
    }

    return Array.from(agentFinalArgs.values()).map((arg) => ({
      agentId: arg.agentId,
      agentName: arg.agentName,
      position: `${arg.position}: ${arg.content.slice(0, 200)}...`,
      reasoning: arg.supportingPoints.join('; '),
      confidence: arg.confidence,
      timestamp: arg.timestamp,
    }));
  }

  /**
   * Extract key positions from debate.
   */
  private extractKeyPositions(
    thread: DebateThread
  ): { position: string; supporters: string[]; mainArguments: string[]; strength: number }[] {
    const positions = this.analyzePositions(thread);

    return positions.map((p) => {
      const supporterArgs = thread.arguments.filter(
        (a) => a.position === p.position
      );
      return {
        position: p.position,
        supporters: supporterArgs.map((a) => a.agentName),
        mainArguments: supporterArgs.slice(0, 3).map((a) => a.content.slice(0, 200)),
        strength: Math.round((p.count / thread.participants.length) * 100),
      };
    });
  }

  /**
   * Extract counterarguments from debate.
   */
  private extractCounterarguments(
    thread: DebateThread
  ): { target: string; content: string; raisedBy: string; addressed: boolean }[] {
    return thread.arguments
      .filter((a) => a.counterTo)
      .map((a) => ({
        target: a.counterTo!,
        content: a.content.slice(0, 300),
        raisedBy: a.agentName,
        addressed: thread.arguments.some(
          (other) => other.counterTo === a.id
        ),
      }));
  }

  /**
   * Extract position from response content.
   */
  private extractPosition(content: string): 'for' | 'against' | 'neutral' | 'alternative' {
    const lowerContent = content.toLowerCase();

    if (lowerContent.includes('position: for') || lowerContent.includes('i support') ||
        lowerContent.includes('in favor')) {
      return 'for';
    }
    if (lowerContent.includes('position: against') || lowerContent.includes('i oppose') ||
        lowerContent.includes('against this')) {
      return 'against';
    }
    if (lowerContent.includes('position: alternative') || lowerContent.includes('alternative approach')) {
      return 'alternative';
    }
    return 'neutral';
  }

  /**
   * Extract confidence from response content.
   */
  private extractConfidence(content: string): number {
    const confidenceMatch = content.match(/confidence[:\s]+(\d+)/i);
    if (confidenceMatch) {
      return Math.min(100, Math.max(0, parseInt(confidenceMatch[1], 10)));
    }

    // Estimate based on language
    const lowerContent = content.toLowerCase();
    if (lowerContent.includes('strongly') || lowerContent.includes('certain')) {
      return 85;
    }
    if (lowerContent.includes('likely') || lowerContent.includes('probably')) {
      return 70;
    }
    if (lowerContent.includes('uncertain') || lowerContent.includes('unclear')) {
      return 50;
    }
    return 65;
  }

  /**
   * Extract consensus score from assessment content.
   */
  private extractConsensusScore(content: string): number {
    const scoreMatch = content.match(/consensus[:\s]+(\d+)/i) ||
                       content.match(/score[:\s]+(\d+)/i);
    if (scoreMatch) {
      return Math.min(100, Math.max(0, parseInt(scoreMatch[1], 10)));
    }

    // Estimate based on keywords
    const lowerContent = content.toLowerCase();
    if (lowerContent.includes('strong consensus') || lowerContent.includes('unanimous')) {
      return 90;
    }
    if (lowerContent.includes('majority agrees') || lowerContent.includes('general agreement')) {
      return 75;
    }
    if (lowerContent.includes('divided') || lowerContent.includes('no consensus')) {
      return 40;
    }
    return 60;
  }

  /**
   * Extract supporting points from content.
   */
  private extractSupportingPoints(content: string): string[] {
    // Look for bullet points or numbered lists
    const bulletMatch = content.match(/[-•*]\s+(.+)/g);
    if (bulletMatch) {
      return bulletMatch.slice(0, 5).map((s) => s.replace(/^[-•*]\s+/, '').trim());
    }

    const numberedMatch = content.match(/\d+[.)]\s+(.+)/g);
    if (numberedMatch) {
      return numberedMatch.slice(0, 5).map((s) => s.replace(/^\d+[.)]\s+/, '').trim());
    }

    // Fall back to sentences
    const sentences = content.split(/[.!?]+/).filter((s) => s.trim().length > 20);
    return sentences.slice(0, 3).map((s) => s.trim());
  }

  /**
   * Extract executive summary from content.
   */
  private extractExecutiveSummary(content: string): string {
    const summaryMatch = content.match(/executive summary[:\s]*(.+?)(?=\n\n|\n[A-Z]|$)/is);
    if (summaryMatch) {
      return summaryMatch[1].trim();
    }

    // Take first paragraph
    const firstParagraph = content.split('\n\n')[0];
    return firstParagraph.slice(0, 500);
  }

  /**
   * Extract conclusion from content.
   */
  private extractConclusion(content: string): string {
    const conclusionMatch = content.match(/conclusion[:\s]*(.+?)(?=\n\n|recommendations|$)/is);
    if (conclusionMatch) {
      return conclusionMatch[1].trim();
    }

    // Take last paragraph
    const paragraphs = content.split('\n\n').filter((p) => p.trim());
    return paragraphs[paragraphs.length - 1]?.slice(0, 500) || 'Debate concluded.';
  }

  /**
   * Extract recommendations from content.
   */
  private extractRecommendations(content: string): string[] {
    const recsMatch = content.match(/recommendations?[:\s]*(.+?)(?=\n\n|$)/is);
    if (recsMatch) {
      const recsContent = recsMatch[1];
      const bullets = recsContent.match(/[-•*\d.]+\s+(.+)/g);
      if (bullets) {
        return bullets.map((b) => b.replace(/^[-•*\d.]+\s+/, '').trim());
      }
      return [recsContent.trim()];
    }

    return ['Further discussion recommended', 'Monitor developments'];
  }

  /**
   * Generate a content hash for provenance.
   */
  private generateContentHash(content: string): string {
    // Simple hash for demonstration - in production use crypto
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `sha256-${Math.abs(hash).toString(16).padStart(16, '0')}`;
  }
}

/**
 * Factory function to create a WorkflowBHandler.
 */
export function createWorkflowBHandler(
  llmProvider: LLMProvider,
  config?: Partial<WorkflowBConfig>
): WorkflowBHandler {
  return new WorkflowBHandler(llmProvider, config);
}
