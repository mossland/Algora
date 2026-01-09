import type Database from 'better-sqlite3';
import { Server as SocketServer } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { parseStringPromise } from 'xml2js';

interface RSSFeed {
  id: string;
  name: string;
  url: string;
  category: string;
  enabled: boolean;
  lastFetched?: string;
  fetchInterval: number; // in minutes
}

interface RSSItem {
  title: string;
  link: string;
  description: string;
  pubDate?: string;
  guid?: string;
}

interface Signal {
  id: string;
  original_id: string;
  source: string;
  timestamp: string;
  category: string;
  severity: string;
  value: number;
  unit: string;
  description: string;
  metadata: string | null;
}

export class RSSCollectorService {
  private db: Database.Database;
  private io: SocketServer;
  private feeds: RSSFeed[] = [];
  private intervalIds: Map<string, NodeJS.Timeout> = new Map();
  private isRunning: boolean = false;

  // Default RSS feeds across multiple categories
  private defaultFeeds: Omit<RSSFeed, 'id'>[] = [
    // === AI Category ===
    {
      name: 'OpenAI Blog',
      url: 'https://openai.com/blog/rss.xml',
      category: 'ai',
      enabled: true,
      fetchInterval: 30,
    },
    {
      name: 'Google AI Blog',
      url: 'https://blog.google/technology/ai/rss/',
      category: 'ai',
      enabled: true,
      fetchInterval: 30,
    },
    {
      name: 'arXiv AI',
      url: 'http://arxiv.org/rss/cs.AI',
      category: 'ai',
      enabled: true,
      fetchInterval: 60,
    },
    {
      name: 'TechCrunch',
      url: 'https://techcrunch.com/feed/',
      category: 'ai',
      enabled: true,
      fetchInterval: 15,
    },
    {
      name: 'Hacker News',
      url: 'https://hnrss.org/frontpage',
      category: 'ai',
      enabled: true,
      fetchInterval: 15,
    },
    // === Crypto Category ===
    {
      name: 'CoinDesk',
      url: 'https://www.coindesk.com/arc/outboundfeeds/rss/',
      category: 'crypto',
      enabled: true,
      fetchInterval: 15,
    },
    {
      name: 'Cointelegraph',
      url: 'https://cointelegraph.com/rss',
      category: 'crypto',
      enabled: true,
      fetchInterval: 15,
    },
    {
      name: 'Decrypt',
      url: 'https://decrypt.co/feed',
      category: 'crypto',
      enabled: true,
      fetchInterval: 15,
    },
    {
      name: 'The Defiant',
      url: 'https://thedefiant.io/feed',
      category: 'crypto',
      enabled: true,
      fetchInterval: 15,
    },
    {
      name: 'CryptoSlate',
      url: 'https://cryptoslate.com/feed/',
      category: 'crypto',
      enabled: true,
      fetchInterval: 15,
    },
    // === Finance Category ===
    {
      name: 'CNBC Finance',
      url: 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=10000664',
      category: 'finance',
      enabled: true,
      fetchInterval: 15,
    },
    // === Security Category ===
    {
      name: 'The Hacker News',
      url: 'https://feeds.feedburner.com/TheHackersNews',
      category: 'security',
      enabled: true,
      fetchInterval: 30,
    },
    {
      name: 'Krebs on Security',
      url: 'https://krebsonsecurity.com/feed/',
      category: 'security',
      enabled: true,
      fetchInterval: 30,
    },
    // === Dev Category ===
    {
      name: 'The Verge',
      url: 'https://www.theverge.com/rss/index.xml',
      category: 'dev',
      enabled: true,
      fetchInterval: 15,
    },
    {
      name: 'Ars Technica',
      url: 'https://feeds.arstechnica.com/arstechnica/index',
      category: 'dev',
      enabled: true,
      fetchInterval: 15,
    },
    {
      name: 'Stack Overflow Blog',
      url: 'https://stackoverflow.blog/feed/',
      category: 'dev',
      enabled: true,
      fetchInterval: 60,
    },
    // === Protocol Category (Ethereum specific) ===
    {
      name: 'Ethereum Blog',
      url: 'https://blog.ethereum.org/feed.xml',
      category: 'protocol',
      enabled: true,
      fetchInterval: 30,
    },
  ];

  constructor(db: Database.Database, io: SocketServer) {
    this.db = db;
    this.io = io;
    this.initializeFeeds();
  }

  private initializeFeeds(): void {
    // Create RSS feeds table if not exists
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS rss_feeds (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        url TEXT NOT NULL UNIQUE,
        category TEXT NOT NULL,
        enabled INTEGER DEFAULT 1,
        last_fetched TEXT,
        fetch_interval INTEGER DEFAULT 30,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Load existing feeds
    const existingFeeds = this.db.prepare('SELECT * FROM rss_feeds').all() as any[];

    if (existingFeeds.length === 0) {
      // Seed default feeds
      const insert = this.db.prepare(`
        INSERT INTO rss_feeds (id, name, url, category, enabled, fetch_interval)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      for (const feed of this.defaultFeeds) {
        insert.run(uuidv4(), feed.name, feed.url, feed.category, feed.enabled ? 1 : 0, feed.fetchInterval);
      }

      console.log(`[RSS] Seeded ${this.defaultFeeds.length} default feeds`);
    }

    // Reload feeds
    this.feeds = this.db.prepare('SELECT * FROM rss_feeds WHERE enabled = 1').all().map((row: any) => ({
      id: row.id,
      name: row.name,
      url: row.url,
      category: row.category,
      enabled: row.enabled === 1,
      lastFetched: row.last_fetched,
      fetchInterval: row.fetch_interval,
    }));
  }

  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    console.log(`[RSS] Collector started with ${this.feeds.length} feeds`);

    // Start collectors for each feed
    for (const feed of this.feeds) {
      this.startFeedCollector(feed);
    }

    // Initial fetch after 10 seconds
    setTimeout(() => this.fetchAllFeeds(), 10000);
  }

  stop(): void {
    this.isRunning = false;

    // Clear all intervals
    for (const [feedId, intervalId] of this.intervalIds) {
      clearInterval(intervalId);
      this.intervalIds.delete(feedId);
    }

    console.log('[RSS] Collector stopped');
  }

  private startFeedCollector(feed: RSSFeed): void {
    if (this.intervalIds.has(feed.id)) {
      clearInterval(this.intervalIds.get(feed.id)!);
    }

    const intervalMs = feed.fetchInterval * 60 * 1000;
    const intervalId = setInterval(() => this.fetchFeed(feed), intervalMs);
    this.intervalIds.set(feed.id, intervalId);
  }

  private async fetchAllFeeds(): Promise<void> {
    for (const feed of this.feeds) {
      await this.fetchFeed(feed);
    }
  }

  async fetchFeed(feed: RSSFeed): Promise<number> {
    try {
      console.log(`[RSS] Fetching: ${feed.name}`);

      const response = await fetch(feed.url, {
        headers: {
          'User-Agent': 'Algora/1.0 Governance Signal Collector',
          'Accept': 'application/rss+xml, application/xml, text/xml',
        },
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const xml = await response.text();
      const result = await parseStringPromise(xml, { explicitArray: false });

      const items = this.extractItems(result);
      let newSignals = 0;

      for (const item of items) {
        const created = await this.processItem(feed, item);
        if (created) newSignals++;
      }

      // Update last fetched time
      this.db.prepare('UPDATE rss_feeds SET last_fetched = ? WHERE id = ?')
        .run(new Date().toISOString(), feed.id);

      if (newSignals > 0) {
        console.log(`[RSS] ${feed.name}: ${newSignals} new signals`);
        this.logActivity(feed.name, newSignals);
      }

      return newSignals;
    } catch (error) {
      console.error(`[RSS] Error fetching ${feed.name}:`, error);
      return 0;
    }
  }

  private extractItems(result: any): RSSItem[] {
    const items: RSSItem[] = [];

    // Handle RSS 2.0
    if (result.rss?.channel?.item) {
      const rssItems = Array.isArray(result.rss.channel.item)
        ? result.rss.channel.item
        : [result.rss.channel.item];

      for (const item of rssItems) {
        items.push({
          title: item.title || '',
          link: item.link || '',
          description: this.stripHtml(item.description || ''),
          pubDate: item.pubDate,
          guid: item.guid?._ || item.guid || item.link,
        });
      }
    }

    // Handle Atom
    if (result.feed?.entry) {
      const atomEntries = Array.isArray(result.feed.entry)
        ? result.feed.entry
        : [result.feed.entry];

      for (const entry of atomEntries) {
        items.push({
          title: entry.title?._ || entry.title || '',
          link: entry.link?.$.href || entry.link || '',
          description: this.stripHtml(entry.summary?._ || entry.summary || entry.content?._ || ''),
          pubDate: entry.published || entry.updated,
          guid: entry.id || entry.link?.$.href,
        });
      }
    }

    return items.slice(0, 20); // Limit to 20 most recent items
  }

  private async processItem(feed: RSSFeed, item: RSSItem): Promise<boolean> {
    const originalId = item.guid || item.link || `${feed.id}-${item.title}`;

    // Check if signal already exists
    const existing = this.db.prepare(
      'SELECT id FROM signals WHERE original_id = ? AND source = ?'
    ).get(originalId, `rss:${feed.name}`);

    if (existing) {
      return false;
    }

    // Determine severity based on keywords
    const severity = this.determineSeverity(item.title, item.description);

    const signal: Signal = {
      id: uuidv4(),
      original_id: originalId,
      source: `rss:${feed.name}`,
      timestamp: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
      category: feed.category,
      severity,
      value: 1,
      unit: 'article',
      description: `${item.title}\n\n${item.description.substring(0, 500)}`,
      metadata: JSON.stringify({
        title: item.title,
        link: item.link,
        feedName: feed.name,
        feedUrl: feed.url,
      }),
    };

    // Insert signal
    this.db.prepare(`
      INSERT INTO signals (id, original_id, source, timestamp, category, severity, value, unit, description, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      signal.id,
      signal.original_id,
      signal.source,
      signal.timestamp,
      signal.category,
      signal.severity,
      signal.value,
      signal.unit,
      signal.description,
      signal.metadata
    );

    // Emit event
    this.io.emit('signals:collected', { signal });

    return true;
  }

  private determineSeverity(title: string, description: string): string {
    const text = `${title} ${description}`.toLowerCase();

    const criticalKeywords = ['hack', 'exploit', 'vulnerability', 'breach', 'emergency', 'critical'];
    const highKeywords = ['urgent', 'breaking', 'major', 'significant', 'warning', 'risk'];
    const mediumKeywords = ['update', 'change', 'proposal', 'announcement', 'new'];

    if (criticalKeywords.some(k => text.includes(k))) return 'critical';
    if (highKeywords.some(k => text.includes(k))) return 'high';
    if (mediumKeywords.some(k => text.includes(k))) return 'medium';
    return 'low';
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private logActivity(feedName: string, count: number): void {
    this.db.prepare(`
      INSERT INTO activity_log (id, type, severity, timestamp, message, details)
      VALUES (?, 'COLLECTOR', 'info', ?, ?, ?)
    `).run(
      uuidv4(),
      new Date().toISOString(),
      `RSS: ${feedName} collected ${count} signals`,
      JSON.stringify({ source: 'rss', feedName, count })
    );
  }

  // Management methods
  addFeed(feed: Omit<RSSFeed, 'id'>): RSSFeed {
    const id = uuidv4();
    this.db.prepare(`
      INSERT INTO rss_feeds (id, name, url, category, enabled, fetch_interval)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, feed.name, feed.url, feed.category, feed.enabled ? 1 : 0, feed.fetchInterval);

    const newFeed = { ...feed, id };
    this.feeds.push(newFeed);

    if (this.isRunning && feed.enabled) {
      this.startFeedCollector(newFeed);
    }

    return newFeed;
  }

  removeFeed(feedId: string): boolean {
    const intervalId = this.intervalIds.get(feedId);
    if (intervalId) {
      clearInterval(intervalId);
      this.intervalIds.delete(feedId);
    }

    this.db.prepare('DELETE FROM rss_feeds WHERE id = ?').run(feedId);
    this.feeds = this.feeds.filter(f => f.id !== feedId);

    return true;
  }

  getFeeds(): RSSFeed[] {
    return this.feeds;
  }
}
