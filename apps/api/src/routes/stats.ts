import { Router } from 'express';
import type Database from 'better-sqlite3';

export const statsRouter: Router = Router();

// GET /api/stats - Get dashboard statistics
statsRouter.get('/', (req, res) => {
  const db: Database.Database = req.app.locals.db;

  try {
    // Count active agents (status !== 'idle')
    const activeAgents = (db.prepare(`
      SELECT COUNT(*) as count FROM agent_states
      WHERE status != 'idle' AND status IS NOT NULL
    `).get() as any)?.count || 0;

    // Count active agora sessions
    const activeSessions = (db.prepare(`
      SELECT COUNT(*) as count FROM agora_sessions
      WHERE status = 'active'
    `).get() as any)?.count || 0;

    // Count signals today
    const signalsToday = (db.prepare(`
      SELECT COUNT(*) as count FROM signals
      WHERE date(created_at) = date('now')
    `).get() as any)?.count || 0;

    // Count open issues
    const openIssues = (db.prepare(`
      SELECT COUNT(*) as count FROM issues
      WHERE status IN ('open', 'in_progress')
    `).get() as any)?.count || 0;

    // Calculate trends (compare to yesterday)
    const agentsTrend = 0; // TODO: implement trend calculation
    const sessionsTrend = 0;
    const signalsTrend = 0;

    res.json({
      activeAgents,
      activeSessions,
      signalsToday,
      openIssues,
      agentsTrend,
      sessionsTrend,
      signalsTrend,
    });
  } catch (error) {
    console.error('Failed to fetch stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});
