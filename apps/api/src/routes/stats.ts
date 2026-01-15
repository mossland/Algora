import { Router } from 'express';
import type Database from 'better-sqlite3';

export const statsRouter: Router = Router();

// GET /api/stats - Get dashboard statistics (optimized: single consolidated query)
statsRouter.get('/', (req, res) => {
  const db: Database.Database = req.app.locals.db;

  try {
    // Consolidated query - reduces 11 DB round trips to 1
    const stats = db.prepare(`
      SELECT
        -- Current counts
        (SELECT COUNT(*) FROM agent_states WHERE status != 'idle' AND status IS NOT NULL) as activeAgents,
        (SELECT COUNT(*) FROM agora_sessions WHERE status = 'active') as activeSessions,
        (SELECT COUNT(*) FROM signals WHERE date(created_at) = date('now')) as signalsToday,
        (SELECT COUNT(*) FROM issues WHERE status IN ('open', 'in_progress')) as openIssues,
        -- Yesterday counts for trends
        (SELECT COUNT(*) FROM signals WHERE date(created_at) = date('now', '-1 day')) as signalsYesterday,
        (SELECT COUNT(*) FROM agora_sessions WHERE date(created_at) = date('now')) as sessionsToday,
        (SELECT COUNT(*) FROM agora_sessions WHERE date(created_at) = date('now', '-1 day')) as sessionsYesterday,
        (SELECT COUNT(*) FROM agent_chatter WHERE date(created_at) = date('now')) as agentMessagesToday,
        (SELECT COUNT(*) FROM agent_chatter WHERE date(created_at) = date('now', '-1 day')) as agentMessagesYesterday
    `).get() as {
      activeAgents: number;
      activeSessions: number;
      signalsToday: number;
      openIssues: number;
      signalsYesterday: number;
      sessionsToday: number;
      sessionsYesterday: number;
      agentMessagesToday: number;
      agentMessagesYesterday: number;
    };

    // Calculate trends
    const signalsTrend = stats.signalsYesterday > 0
      ? Math.round(((stats.signalsToday - stats.signalsYesterday) / stats.signalsYesterday) * 100)
      : stats.signalsToday > 0 ? 100 : 0;

    const sessionsTrend = stats.sessionsYesterday > 0
      ? Math.round(((stats.sessionsToday - stats.sessionsYesterday) / stats.sessionsYesterday) * 100)
      : stats.sessionsToday > 0 ? 100 : 0;

    const agentsTrend = stats.agentMessagesYesterday > 0
      ? Math.round(((stats.agentMessagesToday - stats.agentMessagesYesterday) / stats.agentMessagesYesterday) * 100)
      : stats.agentMessagesToday > 0 ? 100 : 0;

    res.json({
      activeAgents: stats.activeAgents,
      activeSessions: stats.activeSessions,
      signalsToday: stats.signalsToday,
      openIssues: stats.openIssues,
      agentsTrend,
      sessionsTrend,
      signalsTrend,
    });
  } catch (error) {
    console.error('Failed to fetch stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// GET /api/stats/tier-usage - Get tier usage statistics (optimized: consolidated query)
statsRouter.get('/tier-usage', (req, res) => {
  const db: Database.Database = req.app.locals.db;
  const today = new Date().toISOString().split('T')[0];

  try {
    // Consolidated query - reduces 5 DB round trips to 1
    const usage = db.prepare(`
      SELECT
        -- Tier 0: Signal collection (free)
        (SELECT COUNT(*) FROM signals WHERE date(timestamp) = ?) as tier0,
        -- Tier 1: Local LLM (chatter)
        (SELECT COUNT(*) FROM agent_chatter
         WHERE date(created_at) = ? AND (tier = 1 OR tier_used LIKE '%local%' OR tier_used LIKE '%ollama%')) as tier1Chatter,
        -- Tier 1: Local LLM (agora)
        (SELECT COUNT(*) FROM agora_messages
         WHERE date(created_at) = ? AND (tier = 1 OR tier_used LIKE '%local%' OR tier_used LIKE '%ollama%')) as tier1Agora,
        -- Tier 2: External LLM (budget usage)
        (SELECT COALESCE(SUM(call_count), 0) FROM budget_usage WHERE date = ? AND tier = 2) as tier2Usage,
        -- Tier 2: External LLM (agora messages)
        (SELECT COUNT(*) FROM agora_messages
         WHERE date(created_at) = ? AND (tier = 2 OR tier_used LIKE '%anthropic%' OR tier_used LIKE '%openai%' OR tier_used LIKE '%google%')) as tier2Agora
    `).get(today, today, today, today, today) as {
      tier0: number;
      tier1Chatter: number;
      tier1Agora: number;
      tier2Usage: number;
      tier2Agora: number;
    };

    res.json({
      tier0: usage.tier0,
      tier1: usage.tier1Chatter + usage.tier1Agora,
      tier2: usage.tier2Usage + usage.tier2Agora,
      date: today,
    });
  } catch (error) {
    console.error('Failed to fetch tier usage:', error);
    res.status(500).json({ error: 'Failed to fetch tier usage' });
  }
});
