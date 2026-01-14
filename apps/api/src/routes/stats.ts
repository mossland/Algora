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
    // Signals trend: compare today vs yesterday
    const signalsYesterday = (db.prepare(`
      SELECT COUNT(*) as count FROM signals
      WHERE date(created_at) = date('now', '-1 day')
    `).get() as any)?.count || 0;
    const signalsTrend = signalsYesterday > 0
      ? Math.round(((signalsToday - signalsYesterday) / signalsYesterday) * 100)
      : signalsToday > 0 ? 100 : 0;

    // Sessions trend: compare active sessions today vs yesterday
    const sessionsYesterday = (db.prepare(`
      SELECT COUNT(*) as count FROM agora_sessions
      WHERE date(created_at) = date('now', '-1 day')
    `).get() as any)?.count || 0;
    const sessionsToday = (db.prepare(`
      SELECT COUNT(*) as count FROM agora_sessions
      WHERE date(created_at) = date('now')
    `).get() as any)?.count || 0;
    const sessionsTrend = sessionsYesterday > 0
      ? Math.round(((sessionsToday - sessionsYesterday) / sessionsYesterday) * 100)
      : sessionsToday > 0 ? 100 : 0;

    // Agents trend: compare agent activity (messages) today vs yesterday
    const agentMessagesYesterday = (db.prepare(`
      SELECT COUNT(*) as count FROM agent_chatter
      WHERE date(created_at) = date('now', '-1 day')
    `).get() as any)?.count || 0;
    const agentMessagesToday = (db.prepare(`
      SELECT COUNT(*) as count FROM agent_chatter
      WHERE date(created_at) = date('now')
    `).get() as any)?.count || 0;
    const agentsTrend = agentMessagesYesterday > 0
      ? Math.round(((agentMessagesToday - agentMessagesYesterday) / agentMessagesYesterday) * 100)
      : agentMessagesToday > 0 ? 100 : 0;

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

// GET /api/stats/tier-usage - Get tier usage statistics
statsRouter.get('/tier-usage', (req, res) => {
  const db: Database.Database = req.app.locals.db;
  const today = new Date().toISOString().split('T')[0];

  try {
    // Count signals collected today (Tier 0 - free)
    const tier0 = (db.prepare(`
      SELECT COUNT(*) as count FROM signals
      WHERE date(timestamp) = ?
    `).get(today) as any)?.count || 0;

    // Count agent chatter messages today (Tier 1 - local LLM)
    const tier1Chatter = (db.prepare(`
      SELECT COUNT(*) as count FROM agent_chatter
      WHERE date(created_at) = ? AND (tier = 1 OR tier_used LIKE '%local%' OR tier_used LIKE '%ollama%')
    `).get(today) as any)?.count || 0;

    // Count agora messages using local LLM
    const tier1Agora = (db.prepare(`
      SELECT COUNT(*) as count FROM agora_messages
      WHERE date(created_at) = ? AND (tier = 1 OR tier_used LIKE '%local%' OR tier_used LIKE '%ollama%')
    `).get(today) as any)?.count || 0;

    const tier1 = tier1Chatter + tier1Agora;

    // Count external LLM calls (Tier 2)
    const tier2Usage = (db.prepare(`
      SELECT SUM(call_count) as count FROM budget_usage
      WHERE date = ? AND tier = 2
    `).get(today) as any)?.count || 0;

    // Also count agora messages using external LLM
    const tier2Agora = (db.prepare(`
      SELECT COUNT(*) as count FROM agora_messages
      WHERE date(created_at) = ? AND (tier = 2 OR tier_used LIKE '%anthropic%' OR tier_used LIKE '%openai%' OR tier_used LIKE '%google%')
    `).get(today) as any)?.count || 0;

    const tier2 = tier2Usage + tier2Agora;

    res.json({
      tier0,
      tier1,
      tier2,
      date: today,
    });
  } catch (error) {
    console.error('Failed to fetch tier usage:', error);
    res.status(500).json({ error: 'Failed to fetch tier usage' });
  }
});
