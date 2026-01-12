import { Router } from 'express';
import type { GovernanceService } from '../services/governance';

export const proposalsRouter: Router = Router();

// ========================================
// Proposal Endpoints
// ========================================

// GET /api/proposals - List proposals
proposalsRouter.get('/', (req, res) => {
  const governance: GovernanceService = req.app.locals.governance;
  const { status, category, limit = '50', offset = '0' } = req.query;

  try {
    const proposals = governance.proposals.getAll({
      status: status as any,
      category: category as string,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });

    res.json({ proposals });
  } catch (error) {
    console.error('Failed to fetch proposals:', error);
    res.status(500).json({ error: 'Failed to fetch proposals' });
  }
});

// GET /api/proposals/active - Get active proposals
proposalsRouter.get('/active', (req, res) => {
  const governance: GovernanceService = req.app.locals.governance;

  try {
    const proposals = governance.proposals.getActive();
    res.json({ proposals });
  } catch (error) {
    console.error('Failed to fetch active proposals:', error);
    res.status(500).json({ error: 'Failed to fetch active proposals' });
  }
});

// GET /api/proposals/stats - Get proposal statistics
proposalsRouter.get('/stats', (req, res) => {
  const governance: GovernanceService = req.app.locals.governance;

  try {
    const stats = governance.getGovernanceStats();
    res.json({ stats });
  } catch (error) {
    console.error('Failed to get stats:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// GET /api/proposals/:id - Get single proposal with details
proposalsRouter.get('/:id', async (req, res) => {
  const governance: GovernanceService = req.app.locals.governance;
  const { id } = req.params;

  try {
    const result = await governance.getProposalWithDetails(id);

    if (!result) {
      res.status(404).json({ error: 'Proposal not found' });
      return;
    }

    res.json(result);
  } catch (error) {
    console.error('Failed to fetch proposal:', error);
    res.status(500).json({ error: 'Failed to fetch proposal' });
  }
});

// POST /api/proposals - Create proposal
proposalsRouter.post('/', (req, res) => {
  const governance: GovernanceService = req.app.locals.governance;
  const { title, description, proposer, category, priority, issueId, votingDurationHours } = req.body;

  if (!title || !description || !proposer) {
    res.status(400).json({ error: 'title, description, and proposer are required' });
    return;
  }

  try {
    const proposal = governance.proposals.create({
      title,
      description,
      proposer,
      category: category || 'general',
      priority,
      issueId,
      votingDurationHours,
    });

    res.status(201).json({ proposal });
  } catch (error) {
    console.error('Failed to create proposal:', error);
    res.status(500).json({ error: 'Failed to create proposal' });
  }
});

// POST /api/proposals/from-issue/:issueId - Create proposal from issue
proposalsRouter.post('/from-issue/:issueId', (req, res) => {
  const governance: GovernanceService = req.app.locals.governance;
  const { issueId } = req.params;
  const { proposer } = req.body;

  if (!proposer) {
    res.status(400).json({ error: 'proposer is required' });
    return;
  }

  try {
    const proposal = governance.proposals.createFromIssue(issueId, proposer);
    res.status(201).json({ proposal });
  } catch (error: any) {
    console.error('Failed to create proposal from issue:', error);
    res.status(400).json({ error: error.message || 'Failed to create proposal' });
  }
});

// ========================================
// Proposal Workflow Endpoints
// ========================================

// POST /api/proposals/:id/submit - Submit for review
proposalsRouter.post('/:id/submit', (req, res) => {
  const governance: GovernanceService = req.app.locals.governance;
  const { id } = req.params;
  const { submittedBy } = req.body;

  try {
    const proposal = governance.proposals.submit(id, submittedBy || 'anonymous');
    res.json({ proposal });
  } catch (error: any) {
    console.error('Failed to submit proposal:', error);
    res.status(400).json({ error: error.message || 'Failed to submit proposal' });
  }
});

// POST /api/proposals/:id/start-discussion - Start discussion phase
proposalsRouter.post('/:id/start-discussion', (req, res) => {
  const governance: GovernanceService = req.app.locals.governance;
  const { id } = req.params;
  const { approvedBy } = req.body;

  try {
    const proposal = governance.proposals.startDiscussion(id, approvedBy || 'system');
    res.json({ proposal });
  } catch (error: any) {
    console.error('Failed to start discussion:', error);
    res.status(400).json({ error: error.message || 'Failed to start discussion' });
  }
});

// POST /api/proposals/:id/start-voting - Start voting period
proposalsRouter.post('/:id/start-voting', (req, res) => {
  const governance: GovernanceService = req.app.locals.governance;
  const { id } = req.params;

  try {
    const proposal = governance.proposals.startVoting(id);
    res.json({ proposal });
  } catch (error: any) {
    console.error('Failed to start voting:', error);
    res.status(400).json({ error: error.message || 'Failed to start voting' });
  }
});

// POST /api/proposals/:id/cancel - Cancel proposal
proposalsRouter.post('/:id/cancel', (req, res) => {
  const governance: GovernanceService = req.app.locals.governance;
  const { id } = req.params;
  const { cancelledBy, reason } = req.body;

  try {
    const proposal = governance.proposals.cancel(id, cancelledBy || 'anonymous', reason || 'No reason provided');
    res.json({ proposal });
  } catch (error: any) {
    console.error('Failed to cancel proposal:', error);
    res.status(400).json({ error: error.message || 'Failed to cancel proposal' });
  }
});

// ========================================
// Voting Endpoints
// ========================================

// POST /api/proposals/:id/vote - Cast vote
proposalsRouter.post('/:id/vote', (req, res) => {
  const governance: GovernanceService = req.app.locals.governance;
  const { id } = req.params;
  const { voter, voterType = 'human', choice, reason } = req.body;

  if (!voter || !choice) {
    res.status(400).json({ error: 'voter and choice are required' });
    return;
  }

  if (!['for', 'against', 'abstain'].includes(choice)) {
    res.status(400).json({ error: 'choice must be "for", "against", or "abstain"' });
    return;
  }

  try {
    const vote = governance.voting.castVote(id, voter, voterType, choice, reason);
    const tally = governance.voting.calculateTally(id);
    res.json({ vote, tally });
  } catch (error: any) {
    console.error('Failed to cast vote:', error);
    res.status(400).json({ error: error.message || 'Failed to cast vote' });
  }
});

// GET /api/proposals/:id/votes - Get votes for proposal
proposalsRouter.get('/:id/votes', (req, res) => {
  const governance: GovernanceService = req.app.locals.governance;
  const { id } = req.params;

  try {
    const votes = governance.voting.getVotesForProposal(id);
    const tally = governance.voting.calculateTally(id);
    res.json({ votes, tally });
  } catch (error) {
    console.error('Failed to get votes:', error);
    res.status(500).json({ error: 'Failed to get votes' });
  }
});

// POST /api/proposals/:id/finalize - Finalize voting
proposalsRouter.post('/:id/finalize', (req, res) => {
  const governance: GovernanceService = req.app.locals.governance;
  const { id } = req.params;

  try {
    const tally = governance.voting.finalizeVoting(id);
    const proposal = governance.proposals.getById(id);
    res.json({ proposal, tally });
  } catch (error: any) {
    console.error('Failed to finalize voting:', error);
    res.status(400).json({ error: error.message || 'Failed to finalize voting' });
  }
});

// ========================================
// Comments & Endorsements
// ========================================

// POST /api/proposals/:id/comments - Add comment
proposalsRouter.post('/:id/comments', (req, res) => {
  const governance: GovernanceService = req.app.locals.governance;
  const { id } = req.params;
  const { authorId, authorType = 'human', content, parentId } = req.body;

  if (!authorId || !content) {
    res.status(400).json({ error: 'authorId and content are required' });
    return;
  }

  try {
    const comment = governance.proposals.addComment(id, authorId, authorType, content, parentId);
    res.status(201).json({ comment });
  } catch (error) {
    console.error('Failed to add comment:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// GET /api/proposals/:id/comments - Get comments
proposalsRouter.get('/:id/comments', (req, res) => {
  const governance: GovernanceService = req.app.locals.governance;
  const { id } = req.params;

  try {
    const comments = governance.proposals.getComments(id);
    res.json({ comments });
  } catch (error) {
    console.error('Failed to get comments:', error);
    res.status(500).json({ error: 'Failed to get comments' });
  }
});

// POST /api/proposals/:id/endorse - Add agent endorsement
proposalsRouter.post('/:id/endorse', (req, res) => {
  const governance: GovernanceService = req.app.locals.governance;
  const { id } = req.params;
  const { agentId, stance, confidence = 0.5, reasoning } = req.body;

  if (!agentId || !stance) {
    res.status(400).json({ error: 'agentId and stance are required' });
    return;
  }

  if (!['support', 'oppose', 'neutral'].includes(stance)) {
    res.status(400).json({ error: 'stance must be "support", "oppose", or "neutral"' });
    return;
  }

  try {
    const endorsement = governance.proposals.addEndorsement(id, agentId, stance, confidence, reasoning);
    res.status(201).json({ endorsement });
  } catch (error) {
    console.error('Failed to add endorsement:', error);
    res.status(500).json({ error: 'Failed to add endorsement' });
  }
});

// GET /api/proposals/:id/endorsements - Get endorsements
proposalsRouter.get('/:id/endorsements', (req, res) => {
  const governance: GovernanceService = req.app.locals.governance;
  const { id } = req.params;

  try {
    const endorsements = governance.proposals.getEndorsements(id);
    res.json({ endorsements });
  } catch (error) {
    console.error('Failed to get endorsements:', error);
    res.status(500).json({ error: 'Failed to get endorsements' });
  }
});

// ========================================
// Decision Packet Endpoints
// ========================================

// GET /api/proposals/:id/decision-packet - Get decision packet
proposalsRouter.get('/:id/decision-packet', (req, res) => {
  const governance: GovernanceService = req.app.locals.governance;
  const { id } = req.params;
  const { version } = req.query;

  try {
    const packet = governance.decisionPackets.getPacket(id, version ? parseInt(version as string) : undefined);
    if (!packet) {
      res.status(404).json({ error: 'Decision packet not found' });
      return;
    }
    res.json({ packet });
  } catch (error) {
    console.error('Failed to get decision packet:', error);
    res.status(500).json({ error: 'Failed to get decision packet' });
  }
});

// POST /api/proposals/:id/decision-packet/generate - Generate decision packet
proposalsRouter.post('/:id/decision-packet/generate', async (req, res) => {
  const governance: GovernanceService = req.app.locals.governance;
  const { id } = req.params;
  const { requestedBy = 'anonymous' } = req.body;

  try {
    const packet = await governance.decisionPackets.generatePacket(id, requestedBy);
    res.status(201).json({ packet });
  } catch (error: any) {
    console.error('Failed to generate decision packet:', error);
    res.status(400).json({ error: error.message || 'Failed to generate decision packet' });
  }
});

// GET /api/proposals/:id/decision-packet/versions - Get all versions
proposalsRouter.get('/:id/decision-packet/versions', (req, res) => {
  const governance: GovernanceService = req.app.locals.governance;
  const { id } = req.params;

  try {
    const versions = governance.decisionPackets.getPacketVersions(id);
    res.json({ versions });
  } catch (error) {
    console.error('Failed to get versions:', error);
    res.status(500).json({ error: 'Failed to get versions' });
  }
});

// ========================================
// Delegation Endpoints
// ========================================

// POST /api/proposals/delegation - Create delegation
proposalsRouter.post('/delegation', (req, res) => {
  const governance: GovernanceService = req.app.locals.governance;
  const { delegator, delegate, categories, expiresAt } = req.body;

  if (!delegator || !delegate) {
    res.status(400).json({ error: 'delegator and delegate are required' });
    return;
  }

  try {
    const delegation = governance.voting.createDelegation(delegator, delegate, categories, expiresAt);
    res.status(201).json({ delegation });
  } catch (error) {
    console.error('Failed to create delegation:', error);
    res.status(500).json({ error: 'Failed to create delegation' });
  }
});

// DELETE /api/proposals/delegation/:id - Revoke delegation
proposalsRouter.delete('/delegation/:id', (req, res) => {
  const governance: GovernanceService = req.app.locals.governance;
  const { id } = req.params;

  try {
    governance.voting.revokeDelegation(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to revoke delegation:', error);
    res.status(500).json({ error: 'Failed to revoke delegation' });
  }
});

// GET /api/proposals/delegation/:address - Get delegations for address
proposalsRouter.get('/delegation/:address', (req, res) => {
  const governance: GovernanceService = req.app.locals.governance;
  const { address } = req.params;

  try {
    const delegations = governance.voting.getDelegations(address);
    res.json(delegations);
  } catch (error) {
    console.error('Failed to get delegations:', error);
    res.status(500).json({ error: 'Failed to get delegations' });
  }
});
