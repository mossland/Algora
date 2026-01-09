import { Server as SocketServer } from 'socket.io';
import type Database from 'better-sqlite3';
import { ActivityService } from '../activity';

export type Tier = 0 | 1 | 2;

export interface SchedulerConfig {
  tier0Interval: number;  // Default: 60000 (1 min)
  tier1Interval: number;  // Default: 5000-15000 (5-15 sec)
  tier2ScheduledRuns: number[];  // Default: [6, 12, 18, 23]
}

export class SchedulerService {
  private db: Database.Database;
  private io: SocketServer;
  private activityService: ActivityService;
  private config: SchedulerConfig;
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private isRunning: boolean = false;

  constructor(
    db: Database.Database,
    io: SocketServer,
    activityService: ActivityService,
    config?: Partial<SchedulerConfig>
  ) {
    this.db = db;
    this.io = io;
    this.activityService = activityService;
    this.config = {
      tier0Interval: config?.tier0Interval || 60000,
      tier1Interval: config?.tier1Interval || 10000,
      tier2ScheduledRuns: config?.tier2ScheduledRuns || [6, 12, 18, 23],
    };
  }

  start(): void {
    if (this.isRunning) {
      console.warn('Scheduler is already running');
      return;
    }

    this.isRunning = true;
    console.info('Starting scheduler...');

    // Start Tier 0 tasks (data collection)
    this.startTier0();

    // Start Tier 1 tasks (agent chatter)
    this.startTier1();

    // Schedule Tier 2 tasks
    this.scheduleTier2();

    this.activityService.log('SYSTEM_STATUS', 'info', 'Scheduler started', {
      details: { config: this.config },
    });
  }

  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    // Clear all intervals
    for (const [name, interval] of this.intervals) {
      clearInterval(interval);
      console.info(`Stopped interval: ${name}`);
    }
    this.intervals.clear();

    this.activityService.log('SYSTEM_STATUS', 'info', 'Scheduler stopped');
  }

  private startTier0(): void {
    const interval = setInterval(async () => {
      if (!this.isRunning) return;

      try {
        await this.runTier0Tasks();
      } catch (error) {
        console.error('Tier 0 task error:', error);
        this.activityService.log('COLLECTOR', 'error', 'Tier 0 task failed', {
          details: { error: String(error) },
        });
      }
    }, this.config.tier0Interval);

    this.intervals.set('tier0', interval);
    console.info(`Tier 0 scheduler started (interval: ${this.config.tier0Interval}ms)`);
  }

  private startTier1(): void {
    const runChatter = () => {
      if (!this.isRunning) return;

      // Random interval between 5-15 seconds
      const nextInterval = 5000 + Math.random() * 10000;

      setTimeout(async () => {
        try {
          await this.runTier1Tasks();
        } catch (error) {
          console.error('Tier 1 task error:', error);
        }
        runChatter();
      }, nextInterval);
    };

    runChatter();
    console.info('Tier 1 scheduler started (chatter mode)');
  }

  private scheduleTier2(): void {
    // Check every minute if it's time to run Tier 2
    const interval = setInterval(() => {
      if (!this.isRunning) return;

      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();

      // Run at the start of scheduled hours
      if (this.config.tier2ScheduledRuns.includes(currentHour) && currentMinute === 0) {
        this.runTier2Tasks().catch(error => {
          console.error('Tier 2 task error:', error);
          this.activityService.log('SYSTEM_STATUS', 'error', 'Tier 2 scheduled run failed', {
            details: { error: String(error) },
          });
        });
      }
    }, 60000);

    this.intervals.set('tier2', interval);
    console.info(`Tier 2 scheduler started (hours: ${this.config.tier2ScheduledRuns.join(', ')})`);
  }

  private async runTier0Tasks(): Promise<void> {
    // Placeholder for data collection tasks
    this.activityService.log('COLLECTOR', 'info', 'Running Tier 0 data collection', {
      metadata: { tier: 0 },
    });

    // TODO: Implement signal collection from various sources
    // - RSS feeds
    // - GitHub events
    // - On-chain data
    // - Social media
  }

  private async runTier1Tasks(): Promise<void> {
    // Generate agent chatter using local LLM
    // Placeholder - will be implemented with actual LLM integration
    const agents = this.db.prepare(`
      SELECT a.id, a.name, a.display_name, a.color, a.idle_messages
      FROM agents a
      LEFT JOIN agent_states s ON a.id = s.agent_id
      WHERE a.is_active = 1 AND (s.status IS NULL OR s.status = 'idle')
      ORDER BY RANDOM()
      LIMIT 1
    `).all() as any[];

    if (agents.length > 0) {
      const agent = agents[0];
      const idleMessages = agent.idle_messages ? JSON.parse(agent.idle_messages) : [];
      const message = idleMessages.length > 0
        ? idleMessages[Math.floor(Math.random() * idleMessages.length)]
        : `${agent.display_name} is observing the system...`;

      // Emit chatter event
      this.io.emit('agent:chatter', {
        agentId: agent.id,
        agentName: agent.display_name,
        message,
        color: agent.color,
        timestamp: new Date().toISOString(),
      });

      // Log activity
      this.activityService.log('AGENT_CHATTER', 'info', message, {
        agentId: agent.id,
        metadata: { tier: 1 },
      });
    }
  }

  private async runTier2Tasks(): Promise<void> {
    // Run serious deliberation using external LLM
    this.activityService.log('SYSTEM_STATUS', 'info', 'Running Tier 2 deliberation', {
      metadata: { tier: 2 },
    });

    // TODO: Implement Tier 2 logic
    // - Check for pending issues
    // - Summon relevant agents
    // - Generate decision packets
  }

  async triggerTier2(): Promise<void> {
    if (!this.isRunning) {
      throw new Error('Scheduler is not running');
    }

    await this.runTier2Tasks();
  }

  getStatus(): {
    isRunning: boolean;
    config: SchedulerConfig;
    activeIntervals: string[];
  } {
    return {
      isRunning: this.isRunning,
      config: this.config,
      activeIntervals: Array.from(this.intervals.keys()),
    };
  }
}
