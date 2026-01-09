import type Database from 'better-sqlite3';
import { Server as SocketServer } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';

interface BlockchainSource {
  id: string;
  name: string;
  chain: string;
  type: 'price' | 'governance' | 'defi' | 'nft';
  endpoint: string;
  enabled: boolean;
  lastFetched?: string;
  fetchInterval: number; // in minutes
}

export class BlockchainCollectorService {
  private db: Database.Database;
  private io: SocketServer;
  private sources: BlockchainSource[] = [];
  private intervalIds: Map<string, NodeJS.Timeout> = new Map();
  private isRunning: boolean = false;

  // Default blockchain data sources
  private defaultSources: Omit<BlockchainSource, 'id'>[] = [
    {
      name: 'ETH Price',
      chain: 'ethereum',
      type: 'price',
      endpoint: 'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd&include_24hr_change=true',
      enabled: true,
      fetchInterval: 5, // 5 minutes
    },
    {
      name: 'ETH Gas',
      chain: 'ethereum',
      type: 'defi',
      endpoint: 'https://api.etherscan.io/api?module=gastracker&action=gasoracle',
      enabled: false, // Requires API key
      fetchInterval: 2,
    },
    {
      name: 'DeFi TVL',
      chain: 'multi',
      type: 'defi',
      endpoint: 'https://api.llama.fi/v2/protocols',
      enabled: true,
      fetchInterval: 30,
    },
  ];

  constructor(db: Database.Database, io: SocketServer) {
    this.db = db;
    this.io = io;
    this.initializeSources();
  }

  private initializeSources(): void {
    // Create blockchain sources table if not exists
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS blockchain_sources (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        chain TEXT NOT NULL,
        type TEXT NOT NULL,
        endpoint TEXT NOT NULL,
        enabled INTEGER DEFAULT 1,
        last_fetched TEXT,
        fetch_interval INTEGER DEFAULT 30,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Load existing sources
    const existingSources = this.db.prepare('SELECT * FROM blockchain_sources').all() as any[];

    if (existingSources.length === 0) {
      const insert = this.db.prepare(`
        INSERT INTO blockchain_sources (id, name, chain, type, endpoint, enabled, fetch_interval)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      for (const source of this.defaultSources) {
        insert.run(
          uuidv4(),
          source.name,
          source.chain,
          source.type,
          source.endpoint,
          source.enabled ? 1 : 0,
          source.fetchInterval
        );
      }

      console.log(`[Blockchain] Seeded ${this.defaultSources.length} default sources`);
    }

    // Reload sources
    this.sources = this.db.prepare('SELECT * FROM blockchain_sources WHERE enabled = 1').all().map((row: any) => ({
      id: row.id,
      name: row.name,
      chain: row.chain,
      type: row.type,
      endpoint: row.endpoint,
      enabled: row.enabled === 1,
      lastFetched: row.last_fetched,
      fetchInterval: row.fetch_interval,
    }));
  }

  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    console.log(`[Blockchain] Collector started with ${this.sources.length} sources`);

    for (const source of this.sources) {
      this.startSourceCollector(source);
    }

    // Initial fetch after 20 seconds
    setTimeout(() => this.fetchAllSources(), 20000);
  }

  stop(): void {
    this.isRunning = false;

    for (const [sourceId, intervalId] of this.intervalIds) {
      clearInterval(intervalId);
      this.intervalIds.delete(sourceId);
    }

    console.log('[Blockchain] Collector stopped');
  }

  private startSourceCollector(source: BlockchainSource): void {
    if (this.intervalIds.has(source.id)) {
      clearInterval(this.intervalIds.get(source.id)!);
    }

    const intervalMs = source.fetchInterval * 60 * 1000;
    const intervalId = setInterval(() => this.fetchSource(source), intervalMs);
    this.intervalIds.set(source.id, intervalId);
  }

  private async fetchAllSources(): Promise<void> {
    for (const source of this.sources) {
      await this.fetchSource(source);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  async fetchSource(source: BlockchainSource): Promise<number> {
    try {
      console.log(`[Blockchain] Fetching: ${source.name}`);

      const response = await fetch(source.endpoint, {
        headers: {
          'User-Agent': 'Algora/1.0 Governance Signal Collector',
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      let newSignals = 0;

      switch (source.type) {
        case 'price':
          newSignals = await this.processPriceData(source, data);
          break;
        case 'defi':
          newSignals = await this.processDeFiData(source, data);
          break;
        case 'governance':
          newSignals = await this.processGovernanceData(source, data);
          break;
      }

      // Update last fetched time
      this.db.prepare('UPDATE blockchain_sources SET last_fetched = ? WHERE id = ?')
        .run(new Date().toISOString(), source.id);

      if (newSignals > 0) {
        console.log(`[Blockchain] ${source.name}: ${newSignals} new signals`);
      }

      return newSignals;
    } catch (error) {
      console.error(`[Blockchain] Error fetching ${source.name}:`, error);
      return 0;
    }
  }

  private async processPriceData(source: BlockchainSource, data: any): Promise<number> {
    // Handle CoinGecko price format
    if (data.ethereum) {
      const price = data.ethereum.usd;
      const change24h = data.ethereum.usd_24h_change;

      // Determine severity based on price change
      let severity = 'low';
      if (Math.abs(change24h) > 10) severity = 'critical';
      else if (Math.abs(change24h) > 5) severity = 'high';
      else if (Math.abs(change24h) > 2) severity = 'medium';

      // Create signal only if significant change
      if (Math.abs(change24h) >= 2) {
        const originalId = `blockchain:price:eth:${new Date().toISOString().split('T')[0]}`;

        // Check if we already have a price signal for today
        const existing = this.db.prepare(
          'SELECT id FROM signals WHERE original_id = ?'
        ).get(originalId);

        if (!existing) {
          const direction = change24h > 0 ? 'up' : 'down';
          const signal = {
            id: uuidv4(),
            original_id: originalId,
            source: `blockchain:${source.name}`,
            timestamp: new Date().toISOString(),
            category: 'market',
            severity,
            value: price,
            unit: 'USD',
            description: `ETH price ${direction} ${Math.abs(change24h).toFixed(2)}% in 24h. Current: $${price.toFixed(2)}`,
            metadata: JSON.stringify({
              chain: source.chain,
              asset: 'ETH',
              price,
              change24h,
            }),
          };

          this.insertSignal(signal);
          return 1;
        }
      }
    }

    return 0;
  }

  private async processDeFiData(source: BlockchainSource, data: any): Promise<number> {
    let newSignals = 0;

    // Handle DeFiLlama TVL data
    if (Array.isArray(data)) {
      // Get top 5 protocols by TVL change
      const protocols = data
        .filter((p: any) => p.tvl > 1000000000) // TVL > $1B
        .slice(0, 10);

      for (const protocol of protocols) {
        const tvlChange = protocol.change_1d || 0;

        // Only create signal for significant TVL changes
        if (Math.abs(tvlChange) >= 5) {
          const originalId = `blockchain:tvl:${protocol.slug}:${new Date().toISOString().split('T')[0]}`;

          const existing = this.db.prepare(
            'SELECT id FROM signals WHERE original_id = ?'
          ).get(originalId);

          if (!existing) {
            const direction = tvlChange > 0 ? 'increased' : 'decreased';
            const severity = Math.abs(tvlChange) > 15 ? 'high' : 'medium';

            const signal = {
              id: uuidv4(),
              original_id: originalId,
              source: `blockchain:${source.name}`,
              timestamp: new Date().toISOString(),
              category: 'defi',
              severity,
              value: protocol.tvl,
              unit: 'USD',
              description: `${protocol.name} TVL ${direction} by ${Math.abs(tvlChange).toFixed(2)}%. Current TVL: $${(protocol.tvl / 1e9).toFixed(2)}B`,
              metadata: JSON.stringify({
                protocol: protocol.name,
                slug: protocol.slug,
                tvl: protocol.tvl,
                tvlChange,
                chain: protocol.chain || 'multi',
              }),
            };

            this.insertSignal(signal);
            newSignals++;
          }
        }
      }
    }

    return newSignals;
  }

  private async processGovernanceData(source: BlockchainSource, data: any): Promise<number> {
    // Generic governance data processing
    // This can be extended based on specific governance APIs
    return 0;
  }

  private insertSignal(signal: any): void {
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

    this.io.emit('signals:collected', { signal });

    this.db.prepare(`
      INSERT INTO activity_log (id, type, severity, timestamp, message, details)
      VALUES (?, 'COLLECTOR', 'info', ?, ?, ?)
    `).run(
      uuidv4(),
      new Date().toISOString(),
      `Blockchain signal: ${signal.description.substring(0, 50)}...`,
      JSON.stringify({ source: signal.source, category: signal.category })
    );
  }

  // Management methods
  addSource(source: Omit<BlockchainSource, 'id'>): BlockchainSource {
    const id = uuidv4();
    this.db.prepare(`
      INSERT INTO blockchain_sources (id, name, chain, type, endpoint, enabled, fetch_interval)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, source.name, source.chain, source.type, source.endpoint, source.enabled ? 1 : 0, source.fetchInterval);

    const newSource = { ...source, id };
    this.sources.push(newSource);

    if (this.isRunning && source.enabled) {
      this.startSourceCollector(newSource);
    }

    return newSource;
  }

  removeSource(sourceId: string): boolean {
    const intervalId = this.intervalIds.get(sourceId);
    if (intervalId) {
      clearInterval(intervalId);
      this.intervalIds.delete(sourceId);
    }

    this.db.prepare('DELETE FROM blockchain_sources WHERE id = ?').run(sourceId);
    this.sources = this.sources.filter(s => s.id !== sourceId);

    return true;
  }

  getSources(): BlockchainSource[] {
    return this.sources;
  }
}
