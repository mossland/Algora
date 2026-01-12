import { Router } from 'express';
import type Database from 'better-sqlite3';

export const agentsRouter: Router = Router();

// GET /api/agents - List all agents
agentsRouter.get('/', (req, res) => {
  const db: Database.Database = req.app.locals.db;

  try {
    const agents = db.prepare(`
      SELECT a.*, s.status, s.current_activity, s.last_chatter, s.last_active
      FROM agents a
      LEFT JOIN agent_states s ON a.id = s.agent_id
      WHERE a.is_active = 1
      ORDER BY a.group_name, a.name
    `).all();

    res.json({ agents });
  } catch (error) {
    console.error('Failed to fetch agents:', error);
    res.status(500).json({ error: 'Failed to fetch agents' });
  }
});

// GET /api/agents/:id - Get single agent
agentsRouter.get('/:id', (req, res) => {
  const db: Database.Database = req.app.locals.db;
  const { id } = req.params;

  try {
    const agent = db.prepare(`
      SELECT a.*, s.status, s.current_activity, s.last_chatter, s.last_active
      FROM agents a
      LEFT JOIN agent_states s ON a.id = s.agent_id
      WHERE a.id = ?
    `).get(id);

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    res.json({ agent });
  } catch (error) {
    console.error('Failed to fetch agent:', error);
    res.status(500).json({ error: 'Failed to fetch agent' });
  }
});

// GET /api/agents/group/:groupName - Get agents by group
agentsRouter.get('/group/:groupName', (req, res) => {
  const db: Database.Database = req.app.locals.db;
  const { groupName } = req.params;

  try {
    const agents = db.prepare(`
      SELECT a.*, s.status, s.current_activity, s.last_chatter, s.last_active
      FROM agents a
      LEFT JOIN agent_states s ON a.id = s.agent_id
      WHERE a.group_name = ? AND a.is_active = 1
      ORDER BY a.name
    `).all(groupName);

    res.json({ agents });
  } catch (error) {
    console.error('Failed to fetch agents by group:', error);
    res.status(500).json({ error: 'Failed to fetch agents' });
  }
});

// PATCH /api/agents/:id/state - Update agent state
agentsRouter.patch('/:id/state', (req, res) => {
  const db: Database.Database = req.app.locals.db;
  const { id } = req.params;
  const { status, currentActivity } = req.body;

  try {
    const result = db.prepare(`
      UPDATE agent_states
      SET status = COALESCE(?, status),
          current_activity = COALESCE(?, current_activity),
          last_active = CURRENT_TIMESTAMP
      WHERE agent_id = ?
    `).run(status, currentActivity, id);

    if (result.changes === 0) {
      // Create state if it doesn't exist
      db.prepare(`
        INSERT INTO agent_states (agent_id, status, current_activity, last_active)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      `).run(id, status || 'idle', currentActivity);
    }

    // Emit socket event
    const io = req.app.locals.io;
    io.emit('agent:state_changed', { agentId: id, status, currentActivity });

    res.json({ success: true });
  } catch (error) {
    console.error('Failed to update agent state:', error);
    res.status(500).json({ error: 'Failed to update agent state' });
  }
});

// GET /api/chatter/recent - Get recent chatter
agentsRouter.get('/chatter/recent', (req, res) => {
  const db: Database.Database = req.app.locals.db;
  const limit = parseInt(req.query.limit as string) || 50;

  try {
    const chatter = db.prepare(`
      SELECT c.*, a.name as agent_name, a.display_name, a.color
      FROM agent_chatter c
      JOIN agents a ON c.agent_id = a.id
      ORDER BY c.created_at DESC
      LIMIT ?
    `).all(limit);

    res.json({ chatter });
  } catch (error) {
    console.error('Failed to fetch chatter:', error);
    res.status(500).json({ error: 'Failed to fetch chatter' });
  }
});
