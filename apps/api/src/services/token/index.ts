import type Database from 'better-sqlite3';
import { Server as SocketServer } from 'socket.io';
import { TokenService, TokenConfig } from './token';
import { TokenVotingService } from './token-voting';
import { TreasuryService, TreasuryConfig } from './treasury';

export * from './token';
export * from './token-voting';
export * from './treasury';

export interface TokenIntegrationConfig {
  token?: Partial<TokenConfig>;
  treasury?: Partial<TreasuryConfig>;
}

export class TokenIntegrationService {
  public readonly token: TokenService;
  public readonly voting: TokenVotingService;
  public readonly treasury: TreasuryService;

  private db: Database.Database;
  private io: SocketServer;

  constructor(db: Database.Database, io: SocketServer, config?: TokenIntegrationConfig) {
    this.db = db;
    this.io = io;

    // Initialize services
    this.token = new TokenService(db, io, config?.token);
    this.voting = new TokenVotingService(db, io, this.token);
    this.treasury = new TreasuryService(db, io, config?.treasury);

    console.log('[TokenIntegration] All services initialized');
  }

  // === Convenience Methods ===

  /**
   * Full workflow: verify wallet and check voting eligibility
   */
  async verifyAndCheckEligibility(
    walletAddress: string,
    signature: string,
    nonce: string
  ): Promise<{ holder: any; isEligible: boolean; votingPower: number }> {
    const holder = await this.token.verifyWalletSignature(walletAddress, signature, nonce);

    if (!holder) {
      return { holder: null, isEligible: false, votingPower: 0 };
    }

    const isEligible = this.token.isEligibleToVote(walletAddress);

    return {
      holder,
      isEligible,
      votingPower: holder.votingPower,
    };
  }

  /**
   * Start token-weighted voting for a proposal
   */
  async startTokenVoting(
    proposalId: string,
    options?: {
      votingDurationHours?: number;
      quorumThreshold?: number;
      passThreshold?: number;
    }
  ): Promise<any> {
    const voting = await this.voting.initializeVotingForProposal(proposalId, options);
    return voting;
  }

  /**
   * Cast a token-weighted vote
   */
  async castTokenVote(
    proposalId: string,
    walletAddress: string,
    choice: 'for' | 'against' | 'abstain',
    options?: { signature?: string; reason?: string }
  ): Promise<any> {
    return this.voting.castVote(proposalId, walletAddress, choice, options);
  }

  /**
   * Create a budget allocation from a passed proposal
   */
  createBudgetAllocation(
    proposalId: string,
    options: {
      category: string;
      tokenAddress: string;
      amount: string;
      recipient: string;
      description?: string;
    }
  ): any {
    return this.treasury.createAllocation(proposalId, options);
  }

  /**
   * Get comprehensive dashboard data
   */
  async getDashboard(): Promise<any> {
    const [tokenStats, votingStats, treasuryStats, balances, tokenInfo] = await Promise.all([
      this.token.getStats(),
      this.voting.getStats(),
      this.treasury.getStats(),
      this.treasury.getAllBalances(),
      this.token.getTokenInfo(),
    ]);

    return {
      token: tokenStats,
      voting: votingStats,
      treasury: treasuryStats,
      balances,
      tokenInfo,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Get holder's complete profile
   */
  async getHolderProfile(walletAddress: string): Promise<any> {
    const holder = this.token.getHolderByWallet(walletAddress);

    if (!holder) {
      return null;
    }

    // Get voting history
    const votingHistory = this.db.prepare(`
      SELECT
        tv.proposal_id,
        tv.choice,
        tv.voting_power,
        tv.created_at,
        p.title as proposal_title,
        p.status as proposal_status
      FROM token_votes tv
      LEFT JOIN proposals p ON tv.proposal_id = p.id
      WHERE tv.wallet_address = ?
      ORDER BY tv.created_at DESC
      LIMIT 20
    `).all(walletAddress.toLowerCase()) as any[];

    // Get allocations received
    const allocations = this.treasury.listAllocations({ limit: 10 });
    const receivedAllocations = allocations.filter(
      a => a.recipient.toLowerCase() === walletAddress.toLowerCase()
    );

    return {
      holder,
      votingHistory,
      receivedAllocations,
      isEligible: this.token.isEligibleToVote(walletAddress),
    };
  }

  /**
   * Refresh all data for a holder
   */
  async refreshHolderData(holderId: string): Promise<any> {
    const holder = await this.token.refreshHolderBalance(holderId);
    return holder;
  }

  /**
   * Process proposal completion with treasury allocation
   */
  async processProposalWithTreasury(
    proposalId: string,
    allocationOptions?: {
      category: string;
      tokenAddress: string;
      amount: string;
      recipient: string;
      description?: string;
    }
  ): Promise<any> {
    const results: any = {
      proposalId,
      allocation: null,
    };

    if (allocationOptions) {
      results.allocation = this.treasury.createAllocation(proposalId, allocationOptions);
    }

    return results;
  }

  /**
   * Get stats for all services
   */
  getStats(): any {
    return {
      token: this.token.getStats(),
      voting: this.voting.getStats(),
      treasury: this.treasury.getStats(),
    };
  }
}
