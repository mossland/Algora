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

// GET /api/stats/llm-usage - Detailed LLM usage statistics
statsRouter.get('/llm-usage', (req, res) => {
  const db: Database.Database = req.app.locals.db;
  const days = parseInt(req.query.days as string) || 7;

  try {
    // Get usage by tier and provider for the last N days
    const usage = db.prepare(`
      SELECT
        date,
        provider,
        tier,
        SUM(call_count) as calls,
        SUM(output_tokens) as tokens,
        SUM(estimated_cost_usd) as cost
      FROM budget_usage
      WHERE date >= date('now', '-' || ? || ' days')
      GROUP BY date, provider, tier
      ORDER BY date DESC, provider
    `).all(days) as Array<{
      date: string;
      provider: string;
      tier: number;
      calls: number;
      tokens: number;
      cost: number;
    }>;

    // Get today's summary
    const today = new Date().toISOString().split('T')[0];
    const todaySummary = db.prepare(`
      SELECT
        provider,
        tier,
        SUM(call_count) as calls,
        SUM(output_tokens) as tokens,
        SUM(estimated_cost_usd) as cost
      FROM budget_usage
      WHERE date = ?
      GROUP BY provider, tier
    `).all(today) as Array<{
      provider: string;
      tier: number;
      calls: number;
      tokens: number;
      cost: number;
    }>;

    // Calculate tier 1 ratio
    const tier1Calls = todaySummary.filter(u => u.tier === 1).reduce((sum, u) => sum + u.calls, 0);
    const tier2Calls = todaySummary.filter(u => u.tier === 2).reduce((sum, u) => sum + u.calls, 0);
    const totalCalls = tier1Calls + tier2Calls;
    const tier1Ratio = totalCalls > 0 ? (tier1Calls / totalCalls) * 100 : 100;

    res.json({
      today: {
        date: today,
        summary: todaySummary,
        tier1Calls,
        tier2Calls,
        tier1Ratio: Math.round(tier1Ratio * 10) / 10,
        totalCost: todaySummary.reduce((sum, u) => sum + u.cost, 0),
      },
      history: usage,
      period: `${days} days`,
    });
  } catch (error) {
    console.error('Failed to fetch LLM usage:', error);
    res.status(500).json({ error: 'Failed to fetch LLM usage' });
  }
});

// GET /api/stats/data-growth - Data growth trends
statsRouter.get('/data-growth', (req, res) => {
  const db: Database.Database = req.app.locals.db;
  const days = parseInt(req.query.days as string) || 7;

  try {
    // Get row counts by table
    const tableCounts = db.prepare(`
      SELECT
        'activity_log' as table_name, COUNT(*) as count FROM activity_log
      UNION ALL SELECT 'agent_chatter', COUNT(*) FROM agent_chatter
      UNION ALL SELECT 'agora_messages', COUNT(*) FROM agora_messages
      UNION ALL SELECT 'signals', COUNT(*) FROM signals
      UNION ALL SELECT 'issues', COUNT(*) FROM issues
      UNION ALL SELECT 'proposals', COUNT(*) FROM proposals
      UNION ALL SELECT 'agora_sessions', COUNT(*) FROM agora_sessions
    `).all() as Array<{ table_name: string; count: number }>;

    // Get daily growth for key tables
    const dailyGrowth = db.prepare(`
      SELECT
        date(created_at) as date,
        'activity_log' as table_name,
        COUNT(*) as new_rows
      FROM activity_log
      WHERE created_at >= date('now', '-' || ? || ' days')
      GROUP BY date(created_at)
      UNION ALL
      SELECT date(created_at), 'agent_chatter', COUNT(*)
      FROM agent_chatter
      WHERE created_at >= date('now', '-' || ? || ' days')
      GROUP BY date(created_at)
      UNION ALL
      SELECT date(created_at), 'signals', COUNT(*)
      FROM signals
      WHERE created_at >= date('now', '-' || ? || ' days')
      GROUP BY date(created_at)
      ORDER BY date DESC, table_name
    `).all(days, days, days) as Array<{ date: string; table_name: string; new_rows: number }>;

    // Calculate daily averages
    const dailyAverages: Record<string, number> = {};
    const tableGroups: Record<string, number[]> = {};

    for (const row of dailyGrowth) {
      if (!tableGroups[row.table_name]) {
        tableGroups[row.table_name] = [];
      }
      tableGroups[row.table_name].push(row.new_rows);
    }

    for (const [table, counts] of Object.entries(tableGroups)) {
      dailyAverages[table] = counts.length > 0
        ? Math.round(counts.reduce((a, b) => a + b, 0) / counts.length)
        : 0;
    }

    // Estimate database size (rough calculation)
    const totalRows = tableCounts.reduce((sum, t) => sum + t.count, 0);
    const estimatedSizeMB = Math.round(totalRows * 500 / 1024 / 1024); // ~500 bytes per row avg

    res.json({
      current: tableCounts.reduce((acc, t) => ({ ...acc, [t.table_name]: t.count }), {}),
      dailyAverages,
      dailyGrowth,
      totalRows,
      estimatedSizeMB,
      period: `${days} days`,
    });
  } catch (error) {
    console.error('Failed to fetch data growth:', error);
    res.status(500).json({ error: 'Failed to fetch data growth' });
  }
});

// GET /api/stats/system-health - System health metrics
statsRouter.get('/system-health', (req, res) => {
  const db: Database.Database = req.app.locals.db;
  const schedulerService = req.app.locals.schedulerService;

  try {
    const today = new Date().toISOString().split('T')[0];

    // Get error counts from activity log
    const errors = db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM activity_log WHERE severity = 'error' AND date(timestamp) = ?) as todayErrors,
        (SELECT COUNT(*) FROM activity_log WHERE severity = 'error' AND date(timestamp) = date('now', '-1 day')) as yesterdayErrors,
        (SELECT COUNT(*) FROM activity_log WHERE severity = 'warning' AND date(timestamp) = ?) as todayWarnings
    `).get(today, today) as { todayErrors: number; yesterdayErrors: number; todayWarnings: number };

    // Get LLM timeout/error counts (look for Tier 1 fallback messages)
    const llmErrors = db.prepare(`
      SELECT COUNT(*) as count
      FROM activity_log
      WHERE date(timestamp) = ?
      AND (message LIKE '%Tier 1 failed%' OR message LIKE '%timeout%' OR message LIKE '%LLM.*error%')
    `).get(today) as { count: number };

    // Get budget status
    const budgetUsage = db.prepare(`
      SELECT
        SUM(estimated_cost_usd) as totalSpent
      FROM budget_usage
      WHERE date = ? AND tier = 2
    `).get(today) as { totalSpent: number | null };

    const budgetConfig = db.prepare(`
      SELECT SUM(daily_budget_usd) as totalBudget
      FROM budget_config
      WHERE enabled = 1 AND provider != 'ollama'
    `).get() as { totalBudget: number };

    const todaySpent = budgetUsage?.totalSpent || 0;
    const budgetRemaining = budgetConfig.totalBudget - todaySpent;
    const budgetPercent = (todaySpent / budgetConfig.totalBudget) * 100;

    // Get scheduler status
    let schedulerStatus = null;
    let dataSizes = null;
    let retentionConfig = null;

    if (schedulerService) {
      const status = schedulerService.getStatus();
      schedulerStatus = {
        isRunning: status.isRunning,
        activeIntervals: status.activeIntervals,
      };
      dataSizes = status.dataSizes;
      retentionConfig = schedulerService.getRetentionConfig();
    }

    // Calculate health score (0-100)
    let healthScore = 100;
    if (errors.todayErrors > 10) healthScore -= 20;
    else if (errors.todayErrors > 5) healthScore -= 10;
    if (llmErrors.count > 20) healthScore -= 15;
    else if (llmErrors.count > 10) healthScore -= 5;
    if (budgetPercent > 90) healthScore -= 20;
    else if (budgetPercent > 70) healthScore -= 10;
    if (!schedulerStatus?.isRunning) healthScore -= 30;

    res.json({
      health: {
        score: Math.max(0, healthScore),
        status: healthScore >= 80 ? 'healthy' : healthScore >= 50 ? 'degraded' : 'critical',
      },
      errors: {
        today: errors.todayErrors,
        yesterday: errors.yesterdayErrors,
        warnings: errors.todayWarnings,
        llmTimeouts: llmErrors.count,
      },
      budget: {
        totalBudget: budgetConfig.totalBudget,
        spent: todaySpent,
        remaining: budgetRemaining,
        percentUsed: Math.round(budgetPercent * 10) / 10,
      },
      scheduler: schedulerStatus,
      dataRetention: retentionConfig,
      dataSizes,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to fetch system health:', error);
    res.status(500).json({ error: 'Failed to fetch system health' });
  }
});
