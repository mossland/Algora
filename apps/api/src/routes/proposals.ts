import { Router } from 'express';
import type Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';

export const proposalsRouter = Router();

// GET /api/proposals - List proposals
proposalsRouter.get('/', (req, res) => {
  const db: Database.Database = req.app.locals.db;
  const { status, limit = '50', offset = '0' } = req.query;

  try {
    let query = 'SELECT * FROM proposals WHERE 1=1';
    const params: any[] = [];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit as string), parseInt(offset as string));

    const proposals = db.prepare(query).all(...params);

    res.json({ proposals });
  } catch (error) {
    console.error('Failed to fetch proposals:', error);
    res.status(500).json({ error: 'Failed to fetch proposals' });
  }
});

// GET /api/proposals/:id - Get single proposal
proposalsRouter.get('/:id', (req, res) => {
  const db: Database.Database = req.app.locals.db;
  const { id } = req.params;

  try {
    const proposal = db.prepare('SELECT * FROM proposals WHERE id = ?').get(id);

    if (!proposal) {
      return res.status(404).json({ error: 'Proposal not found' });
    }

    // Get votes
    const votes = db.prepare(`
      SELECT * FROM votes WHERE proposal_id = ? ORDER BY created_at DESC
    `).all(id);

    res.json({ proposal, votes });
  } catch (error) {
    console.error('Failed to fetch proposal:', error);
    res.status(500).json({ error: 'Failed to fetch proposal' });
  }
});

// POST /api/proposals - Create proposal
proposalsRouter.post('/', (req, res) => {
  const db: Database.Database = req.app.locals.db;
  const {
    title,
    description,
    proposer,
    issueId,
    decisionPacket,
    votingStarts,
    votingEnds,
  } = req.body;

  try {
    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO proposals (id, title, description, proposer, issue_id, decision_packet, voting_starts, voting_ends, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      title,
      description,
      proposer,
      issueId || null,
      decisionPacket ? JSON.stringify(decisionPacket) : null,
      votingStarts,
      votingEnds,
      now
    );

    const proposal = db.prepare('SELECT * FROM proposals WHERE id = ?').get(id);

    res.status(201).json({ proposal });
  } catch (error) {
    console.error('Failed to create proposal:', error);
    res.status(500).json({ error: 'Failed to create proposal' });
  }
});

// POST /api/proposals/:id/vote - Cast vote
proposalsRouter.post('/:id/vote', (req, res) => {
  const db: Database.Database = req.app.locals.db;
  const { id } = req.params;
  const { voter, choice, weight, reason } = req.body;

  try {
    const voteId = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT OR REPLACE INTO votes (id, proposal_id, voter, choice, weight, reason, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(voteId, id, voter, choice, weight, reason, now);

    // Update tally
    const tally = db.prepare(`
      SELECT choice, SUM(weight) as total_weight, COUNT(*) as vote_count
      FROM votes
      WHERE proposal_id = ?
      GROUP BY choice
    `).all(id);

    db.prepare('UPDATE proposals SET tally = ?, updated_at = ? WHERE id = ?')
      .run(JSON.stringify(tally), now, id);

    res.json({ success: true, tally });
  } catch (error) {
    console.error('Failed to cast vote:', error);
    res.status(500).json({ error: 'Failed to cast vote' });
  }
});

// POST /api/proposals/:id/finalize - Finalize proposal
proposalsRouter.post('/:id/finalize', (req, res) => {
  const db: Database.Database = req.app.locals.db;
  const { id } = req.params;

  try {
    const now = new Date().toISOString();

    // Get final tally
    const tally = db.prepare(`
      SELECT choice, SUM(weight) as total_weight, COUNT(*) as vote_count
      FROM votes
      WHERE proposal_id = ?
      GROUP BY choice
    `).all(id);

    // Determine outcome
    const sortedTally = (tally as any[]).sort((a, b) => b.total_weight - a.total_weight);
    const outcome = sortedTally[0]?.choice || 'no_votes';

    db.prepare(`
      UPDATE proposals
      SET status = 'finalized', tally = ?, updated_at = ?
      WHERE id = ?
    `).run(JSON.stringify({ results: sortedTally, outcome }), now, id);

    const proposal = db.prepare('SELECT * FROM proposals WHERE id = ?').get(id);

    res.json({ proposal, outcome, tally: sortedTally });
  } catch (error) {
    console.error('Failed to finalize proposal:', error);
    res.status(500).json({ error: 'Failed to finalize proposal' });
  }
});
