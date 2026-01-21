import type Database from 'better-sqlite3';
import type { Server as SocketServer } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import type { ActivityService } from '../activity';

interface BudgetThreshold {
  percent: number;
  severity: 'warning' | 'error' | 'critical';
  alertType: string;
}

interface BudgetStatus {
  provider: string;
  dailyBudgetUsd: number;
  todayUsed: number;
  percentUsed: number;
}

interface BudgetAlert {
  id: string;
  metric_name: string;
  alert_type: string;
  severity: string;
  current_value: number;
  threshold: number;
  message: string;
  acknowledged: number;
  timestamp: string;
}

const THRESHOLDS: BudgetThreshold[] = [
  { percent: 80, severity: 'warning', alertType: 'budget_warning' },
  { percent: 95, severity: 'error', alertType: 'budget_critical' },
  { percent: 100, severity: 'critical', alertType: 'budget_exhausted' },
];

export class BudgetAlertService {
  private db: Database.Database;
  private io: SocketServer;
  private activityService: ActivityService;
  private sentAlerts: Map<string, Date> = new Map();

  constructor(db: Database.Database, io: SocketServer, activityService: ActivityService) {
    this.db = db;
    this.io = io;
    this.activityService = activityService;
  }

  /**
   * Get today's date in YYYY-MM-DD format
   */
  private today(): string {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * Get budget status for all providers
   */
  private getBudgetStatuses(): BudgetStatus[] {
    const today = this.today();

    // Get config for all providers with non-zero budget
    const configs = this.db.prepare(`
      SELECT * FROM budget_config
      WHERE enabled = 1 AND daily_budget_usd > 0
    `).all() as Array<{
      provider: string;
      daily_budget_usd: number;
    }>;

    // Get today's usage for all providers
    const usage = this.db.prepare(`
      SELECT provider, SUM(estimated_cost_usd) as total_cost
      FROM budget_usage
      WHERE date = ?
      GROUP BY provider
    `).all(today) as Array<{
      provider: string;
      total_cost: number;
    }>;

    const usageMap = new Map(usage.map(u => [u.provider, u.total_cost]));

    return configs.map(config => {
      const todayUsed = usageMap.get(config.provider) || 0;
      const percentUsed = config.daily_budget_usd > 0
        ? (todayUsed / config.daily_budget_usd) * 100
        : 0;

      return {
        provider: config.provider,
        dailyBudgetUsd: config.daily_budget_usd,
        todayUsed,
        percentUsed,
      };
    });
  }

  /**
   * Check budget thresholds and create alerts if needed
   */
  async checkBudgetThresholds(): Promise<void> {
    const statuses = this.getBudgetStatuses();

    for (const status of statuses) {
      // Check thresholds in descending order (highest first)
      // Only create alert for the highest threshold reached
      for (const threshold of [...THRESHOLDS].reverse()) {
        if (status.percentUsed >= threshold.percent) {
          await this.maybeCreateAlert(status, threshold);
          break; // Only one alert per provider
        }
      }
    }
  }

  /**
   * Create an alert if one hasn't been created today for this provider/threshold
   */
  private async maybeCreateAlert(
    status: BudgetStatus,
    threshold: BudgetThreshold
  ): Promise<void> {
    const today = this.today();
    const alertKey = `${status.provider}_${threshold.alertType}_${today}`;

    // Check if we already sent this alert today (in-memory cache)
    if (this.sentAlerts.has(alertKey)) {
      return;
    }

    // Also check in the database
    const existingAlert = this.db.prepare(`
      SELECT id FROM governance_kpi_alerts
      WHERE metric_name = 'budget_usage'
      AND alert_type = ?
      AND message LIKE ?
      AND DATE(timestamp) = ?
    `).get(threshold.alertType, `%${status.provider}%`, today);

    if (existingAlert) {
      // Cache it so we don't query DB again
      this.sentAlerts.set(alertKey, new Date());
      return;
    }

    const alertId = uuidv4();
    const message = `${status.provider} budget at ${status.percentUsed.toFixed(1)}% ($${status.todayUsed.toFixed(2)}/$${status.dailyBudgetUsd.toFixed(2)})`;

    // Insert alert into database
    this.db.prepare(`
      INSERT INTO governance_kpi_alerts
      (id, metric_name, alert_type, severity, current_value, threshold, message, acknowledged, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
    `).run(
      alertId,
      'budget_usage',
      threshold.alertType,
      threshold.severity,
      status.percentUsed,
      threshold.percent,
      message,
      new Date().toISOString()
    );

    // Log activity for real-time broadcast
    this.activityService.log('BUDGET_THROTTLE', threshold.severity, message, {
      details: {
        provider: status.provider,
        percentUsed: status.percentUsed,
        todayUsed: status.todayUsed,
        dailyBudgetUsd: status.dailyBudgetUsd,
        alertType: threshold.alertType,
      },
    });

    // Emit socket event for immediate notification
    this.io.emit('alert:budget', {
      id: alertId,
      provider: status.provider,
      percentUsed: status.percentUsed,
      severity: threshold.severity,
      alertType: threshold.alertType,
      message,
      timestamp: new Date().toISOString(),
    });

    // Cache this alert
    this.sentAlerts.set(alertKey, new Date());

    console.info(`[BudgetAlert] Created ${threshold.severity} alert for ${status.provider}: ${status.percentUsed.toFixed(1)}%`);
  }

  /**
   * Get all alerts with optional filters
   */
  getAlerts(options?: {
    acknowledged?: boolean;
    limit?: number;
    metricName?: string;
  }): BudgetAlert[] {
    const { acknowledged, limit = 50, metricName } = options || {};

    let query = 'SELECT * FROM governance_kpi_alerts WHERE 1=1';
    const params: unknown[] = [];

    if (acknowledged !== undefined) {
      query += ' AND acknowledged = ?';
      params.push(acknowledged ? 1 : 0);
    }

    if (metricName) {
      query += ' AND metric_name = ?';
      params.push(metricName);
    }

    query += ' ORDER BY timestamp DESC LIMIT ?';
    params.push(limit);

    return this.db.prepare(query).all(...params) as BudgetAlert[];
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string): boolean {
    const result = this.db.prepare(`
      UPDATE governance_kpi_alerts
      SET acknowledged = 1
      WHERE id = ?
    `).run(alertId);

    return result.changes > 0;
  }

  /**
   * Get count of unacknowledged alerts
   */
  getUnacknowledgedCount(): number {
    const result = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM governance_kpi_alerts
      WHERE acknowledged = 0
    `).get() as { count: number };

    return result.count;
  }

  /**
   * Clear sent alerts cache (called at midnight)
   */
  clearDailyCache(): void {
    this.sentAlerts.clear();
    console.info('[BudgetAlert] Daily alert cache cleared');
  }
}
