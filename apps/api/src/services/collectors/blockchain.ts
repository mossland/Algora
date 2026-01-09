import type Database from 'better-sqlite3';
import { Server as SocketServer } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';

interface BlockchainSource {
  id: string;
  name: string;
  chain: string;
  type: 'price' | 'governance' | 'defi' | 'nft' | 'gas' | 'l2' | 'onchain';
  endpoint: string;
  enabled: boolean;
  lastFetched?: string;
  fetchInterval: number; // in minutes
  apiKeyEnv?: string; // Environment variable name for API key
}

export class BlockchainCollectorService {
  private db: Database.Database;
  private io: SocketServer;
  private sources: BlockchainSource[] = [];
  private intervalIds: Map<string, NodeJS.Timeout> = new Map();
  private isRunning: boolean = false;

  // Default blockchain data sources
  private defaultSources: Omit<BlockchainSource, 'id'>[] = [
    // === Price Data (CoinGecko - Free API) ===
    {
      name: 'CoinGecko Prices',
      chain: 'multi',
      type: 'price',
      endpoint: 'https://api.coingecko.com/api/v3/simple/price?ids=ethereum,bitcoin,solana,matic-network,arbitrum&vs_currencies=usd&include_24hr_change=true&include_market_cap=true',
      enabled: true,
      fetchInterval: 5,
    },
    // === Price Data (CoinMarketCap - Requires API key) ===
    {
      name: 'CoinMarketCap Top 10',
      chain: 'multi',
      type: 'price',
      endpoint: 'https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest?limit=10',
      enabled: false, // Set to true when COINMARKETCAP_API_KEY is configured
      fetchInterval: 5,
      apiKeyEnv: 'COINMARKETCAP_API_KEY',
    },
    // === Etherscan (Requires API key for higher rate limits) ===
    {
      name: 'Etherscan Gas',
      chain: 'ethereum',
      type: 'gas',
      endpoint: 'https://api.etherscan.io/api?module=gastracker&action=gasoracle',
      enabled: false, // Set to true when ETHERSCAN_API_KEY is configured
      fetchInterval: 2,
      apiKeyEnv: 'ETHERSCAN_API_KEY',
    },
    {
      name: 'Etherscan ETH Supply',
      chain: 'ethereum',
      type: 'onchain',
      endpoint: 'https://api.etherscan.io/api?module=stats&action=ethsupply2',
      enabled: false,
      fetchInterval: 60,
      apiKeyEnv: 'ETHERSCAN_API_KEY',
    },
    // === DeFi Data (DefiLlama - Free API) ===
    {
      name: 'DeFi TVL',
      chain: 'multi',
      type: 'defi',
      endpoint: 'https://api.llama.fi/v2/protocols',
      enabled: true,
      fetchInterval: 30,
    },
    {
      name: 'DeFi Chains TVL',
      chain: 'multi',
      type: 'defi',
      endpoint: 'https://api.llama.fi/v2/chains',
      enabled: true,
      fetchInterval: 30,
    },
    {
      name: 'DeFi Stablecoins',
      chain: 'multi',
      type: 'defi',
      endpoint: 'https://stablecoins.llama.fi/stablecoins?includePrices=true',
      enabled: true,
      fetchInterval: 30,
    },
    // === L2 Data (L2Beat - Requires API key) ===
    {
      name: 'L2Beat TVL',
      chain: 'l2',
      type: 'l2',
      endpoint: 'https://l2beat.com/api/scaling/tvl',
      enabled: false, // L2Beat API requires authentication
      fetchInterval: 60,
    },
    // === Fear & Greed Index (Alternative.me - Free) ===
    {
      name: 'Fear & Greed Index',
      chain: 'multi',
      type: 'price',
      endpoint: 'https://api.alternative.me/fng/?limit=1',
      enabled: true,
      fetchInterval: 60,
    },
    // === NFT Data (OpenSea - Requires API key) ===
    {
      name: 'OpenSea Stats',
      chain: 'ethereum',
      type: 'nft',
      endpoint: 'https://api.opensea.io/api/v2/collections?order_by=seven_day_volume&limit=10',
      enabled: false,
      fetchInterval: 60,
      apiKeyEnv: 'OPENSEA_API_KEY',
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

      // Build headers with API key if required
      const headers: Record<string, string> = {
        'User-Agent': 'Algora/1.0 Governance Signal Collector',
        'Accept': 'application/json',
      };

      // Add API key if required
      if (source.apiKeyEnv) {
        const apiKey = process.env[source.apiKeyEnv];
        if (!apiKey) {
          console.warn(`[Blockchain] ${source.name}: API key not configured (${source.apiKeyEnv})`);
          return 0;
        }

        // Different APIs use different header formats
        if (source.apiKeyEnv === 'COINMARKETCAP_API_KEY') {
          headers['X-CMC_PRO_API_KEY'] = apiKey;
        } else if (source.apiKeyEnv === 'ETHERSCAN_API_KEY') {
          // Etherscan uses query param, append to endpoint
          const separator = source.endpoint.includes('?') ? '&' : '?';
          source = { ...source, endpoint: `${source.endpoint}${separator}apikey=${apiKey}` };
        } else if (source.apiKeyEnv === 'OPENSEA_API_KEY') {
          headers['X-API-KEY'] = apiKey;
        } else {
          headers['Authorization'] = `Bearer ${apiKey}`;
        }
      }

      const response = await fetch(source.endpoint, {
        headers,
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
        case 'gas':
          newSignals = await this.processGasData(source, data);
          break;
        case 'l2':
          newSignals = await this.processL2Data(source, data);
          break;
        case 'onchain':
          newSignals = await this.processOnchainData(source, data);
          break;
        case 'nft':
          newSignals = await this.processNFTData(source, data);
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
    let newSignals = 0;

    // Handle Fear & Greed Index
    if (data.data && data.data[0]?.value) {
      const fng = data.data[0];
      const value = parseInt(fng.value);
      const classification = fng.value_classification;
      const originalId = `blockchain:fng:${new Date().toISOString().split('T')[0]}`;

      const existing = this.db.prepare('SELECT id FROM signals WHERE original_id = ?').get(originalId);
      if (!existing) {
        let severity = 'low';
        if (value <= 25 || value >= 75) severity = 'high';
        else if (value <= 40 || value >= 60) severity = 'medium';

        const signal = {
          id: uuidv4(),
          original_id: originalId,
          source: `blockchain:${source.name}`,
          timestamp: new Date().toISOString(),
          category: 'market',
          severity,
          value,
          unit: 'index',
          description: `Fear & Greed Index: ${value} (${classification})`,
          metadata: JSON.stringify({ value, classification, timestamp: fng.timestamp }),
        };
        this.insertSignal(signal);
        newSignals++;
      }
      return newSignals;
    }

    // Handle CoinGecko multi-coin price format
    const coinNames: Record<string, string> = {
      ethereum: 'ETH',
      bitcoin: 'BTC',
      solana: 'SOL',
      'matic-network': 'MATIC',
      arbitrum: 'ARB',
    };

    for (const [coinId, coinData] of Object.entries(data)) {
      if (typeof coinData !== 'object' || !coinData) continue;
      const coin = coinData as any;

      const price = coin.usd;
      const change24h = coin.usd_24h_change;
      const symbol = coinNames[coinId] || coinId.toUpperCase();

      if (!price || change24h === undefined) continue;

      // Determine severity based on price change
      let severity = 'low';
      if (Math.abs(change24h) > 10) severity = 'critical';
      else if (Math.abs(change24h) > 5) severity = 'high';
      else if (Math.abs(change24h) > 2) severity = 'medium';

      // Create signal only if significant change
      if (Math.abs(change24h) >= 2) {
        const originalId = `blockchain:price:${coinId}:${new Date().toISOString().split('T')[0]}`;

        const existing = this.db.prepare('SELECT id FROM signals WHERE original_id = ?').get(originalId);
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
            description: `${symbol} price ${direction} ${Math.abs(change24h).toFixed(2)}% in 24h. Current: $${price.toLocaleString()}`,
            metadata: JSON.stringify({
              chain: source.chain,
              asset: symbol,
              coinId,
              price,
              change24h,
              marketCap: coin.usd_market_cap,
            }),
          };
          this.insertSignal(signal);
          newSignals++;
        }
      }
    }

    // Handle CoinMarketCap format
    if (data.data && Array.isArray(data.data)) {
      for (const coin of data.data) {
        const price = coin.quote?.USD?.price;
        const change24h = coin.quote?.USD?.percent_change_24h;
        const symbol = coin.symbol;

        if (!price || change24h === undefined) continue;

        let severity = 'low';
        if (Math.abs(change24h) > 10) severity = 'critical';
        else if (Math.abs(change24h) > 5) severity = 'high';
        else if (Math.abs(change24h) > 2) severity = 'medium';

        if (Math.abs(change24h) >= 2) {
          const originalId = `blockchain:cmc:${coin.slug}:${new Date().toISOString().split('T')[0]}`;
          const existing = this.db.prepare('SELECT id FROM signals WHERE original_id = ?').get(originalId);

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
              description: `${symbol} price ${direction} ${Math.abs(change24h).toFixed(2)}% in 24h. Current: $${price.toLocaleString()}`,
              metadata: JSON.stringify({
                name: coin.name,
                symbol,
                slug: coin.slug,
                price,
                change24h,
                marketCap: coin.quote?.USD?.market_cap,
                rank: coin.cmc_rank,
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

  private async processGasData(source: BlockchainSource, data: any): Promise<number> {
    // Handle Etherscan gas oracle format
    if (data.result && data.result.SafeGasPrice) {
      const { SafeGasPrice, ProposeGasPrice, FastGasPrice } = data.result;
      const fast = parseInt(FastGasPrice);

      // Only signal on unusual gas prices
      let severity = 'low';
      if (fast > 100) severity = 'critical';
      else if (fast > 50) severity = 'high';
      else if (fast > 30) severity = 'medium';

      if (fast > 30) {
        const originalId = `blockchain:gas:${new Date().toISOString().split('T')[0]}:${Math.floor(Date.now() / 3600000)}`; // hourly

        const existing = this.db.prepare('SELECT id FROM signals WHERE original_id = ?').get(originalId);
        if (!existing) {
          const signal = {
            id: uuidv4(),
            original_id: originalId,
            source: `blockchain:${source.name}`,
            timestamp: new Date().toISOString(),
            category: 'gas',
            severity,
            value: fast,
            unit: 'gwei',
            description: `High Ethereum gas: ${fast} gwei (Fast), ${ProposeGasPrice} gwei (Standard), ${SafeGasPrice} gwei (Safe)`,
            metadata: JSON.stringify({
              safe: parseInt(SafeGasPrice),
              standard: parseInt(ProposeGasPrice),
              fast,
            }),
          };
          this.insertSignal(signal);
          return 1;
        }
      }
    }
    return 0;
  }

  private async processL2Data(source: BlockchainSource, data: any): Promise<number> {
    // Handle L2Beat TVL format
    if (data.projects) {
      let newSignals = 0;
      const topL2s = Object.entries(data.projects)
        .map(([name, info]: [string, any]) => ({ name, ...info }))
        .filter((l2: any) => l2.tvl > 1e9) // TVL > $1B
        .slice(0, 5);

      for (const l2 of topL2s) {
        // Only report significant changes (would need historical data)
        // For now, just report current state periodically
        const originalId = `blockchain:l2:${l2.name}:${new Date().toISOString().split('T')[0]}`;
        const existing = this.db.prepare('SELECT id FROM signals WHERE original_id = ?').get(originalId);

        if (!existing) {
          const signal = {
            id: uuidv4(),
            original_id: originalId,
            source: `blockchain:${source.name}`,
            timestamp: new Date().toISOString(),
            category: 'l2',
            severity: 'low',
            value: l2.tvl,
            unit: 'USD',
            description: `${l2.name} L2 TVL: $${(l2.tvl / 1e9).toFixed(2)}B`,
            metadata: JSON.stringify({ name: l2.name, tvl: l2.tvl }),
          };
          this.insertSignal(signal);
          newSignals++;
        }
      }
      return newSignals;
    }
    return 0;
  }

  private async processOnchainData(source: BlockchainSource, data: any): Promise<number> {
    // Handle Etherscan supply format
    if (data.result && source.name.includes('Supply')) {
      const supply = parseFloat(data.result) / 1e18; // Convert from wei
      const originalId = `blockchain:supply:eth:${new Date().toISOString().split('T')[0]}`;

      const existing = this.db.prepare('SELECT id FROM signals WHERE original_id = ?').get(originalId);
      if (!existing) {
        const signal = {
          id: uuidv4(),
          original_id: originalId,
          source: `blockchain:${source.name}`,
          timestamp: new Date().toISOString(),
          category: 'onchain',
          severity: 'low',
          value: supply,
          unit: 'ETH',
          description: `ETH total supply: ${supply.toLocaleString()} ETH`,
          metadata: JSON.stringify({ supply }),
        };
        this.insertSignal(signal);
        return 1;
      }
    }
    return 0;
  }

  private async processNFTData(source: BlockchainSource, data: any): Promise<number> {
    // Handle OpenSea collections format
    if (data.collections && Array.isArray(data.collections)) {
      let newSignals = 0;
      for (const collection of data.collections.slice(0, 5)) {
        const volume = collection.stats?.seven_day_volume || 0;
        if (volume > 100) { // > 100 ETH weekly volume
          const originalId = `blockchain:nft:${collection.slug}:${new Date().toISOString().split('T')[0]}`;
          const existing = this.db.prepare('SELECT id FROM signals WHERE original_id = ?').get(originalId);

          if (!existing) {
            const signal = {
              id: uuidv4(),
              original_id: originalId,
              source: `blockchain:${source.name}`,
              timestamp: new Date().toISOString(),
              category: 'nft',
              severity: 'low',
              value: volume,
              unit: 'ETH',
              description: `Top NFT: ${collection.name} - ${volume.toFixed(2)} ETH weekly volume`,
              metadata: JSON.stringify({
                name: collection.name,
                slug: collection.slug,
                volume,
                floorPrice: collection.stats?.floor_price,
              }),
            };
            this.insertSignal(signal);
            newSignals++;
          }
        }
      }
      return newSignals;
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
