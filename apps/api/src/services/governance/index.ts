import type Database from 'better-sqlite3';
import { Server as SocketServer } from 'socket.io';
import { ProposalService } from './proposal';
import { VotingService } from './voting';
import { DecisionPacketService } from './decision-packet';

export class GovernanceService {
  public readonly proposals: ProposalService;
  public readonly voting: VotingService;
  public readonly decisionPackets: DecisionPacketService;

  constructor(db: Database.Database, io: SocketServer) {
    this.proposals = new ProposalService(db, io);
    this.voting = new VotingService(db, io);
    this.decisionPackets = new DecisionPacketService(db, io);

    console.log('[Governance] Service initialized');
  }

  // === Convenience Methods ===

  async createProposalFromIssue(issueId: string, proposer: string): Promise<any> {
    const proposal = this.proposals.createFromIssue(issueId, proposer);
    return proposal;
  }

  async submitForVoting(proposalId: string, submittedBy: string): Promise<any> {
    // Move through workflow stages
    let proposal = this.proposals.submit(proposalId, submittedBy);
    proposal = this.proposals.startDiscussion(proposalId, 'system');
    proposal = this.proposals.startVoting(proposalId);

    // Generate decision packet
    await this.decisionPackets.generatePacket(proposalId, 'system');

    return proposal;
  }

  async getProposalWithDetails(proposalId: string): Promise<any> {
    const proposal = this.proposals.getById(proposalId);
    if (!proposal) return null;

    const votes = this.voting.getVotesForProposal(proposalId);
    const tally = this.voting.calculateTally(proposalId);
    const endorsements = this.proposals.getEndorsements(proposalId);
    const comments = this.proposals.getComments(proposalId);
    const decisionPacket = this.decisionPackets.getPacket(proposalId);

    return {
      proposal,
      votes,
      tally,
      endorsements,
      comments,
      decisionPacket,
    };
  }

  getGovernanceStats(): any {
    const proposalStats = this.proposals.getStats();
    const votingStats = this.voting.getVotingStats();

    return {
      proposals: proposalStats,
      voting: votingStats,
    };
  }
}

export { ProposalService } from './proposal';
export { VotingService } from './voting';
export { DecisionPacketService } from './decision-packet';
export type { ProposalStatus, Proposal, ProposalCreateInput } from './proposal';
export type { Vote, VoteChoice, VoteTally, Delegation } from './voting';
export type { DecisionPacket, DecisionOption, AgentAnalysis, RiskAssessment } from './decision-packet';
