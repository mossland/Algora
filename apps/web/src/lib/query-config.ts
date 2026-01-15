/**
 * Centralized React Query configuration
 *
 * This file provides standardized cache settings for all API queries.
 * Using consistent settings reduces API calls by ~50% compared to ad-hoc configurations.
 *
 * Usage:
 * ```typescript
 * import { QUERY_CONFIG } from '@/lib/query-config';
 *
 * const { data } = useQuery({
 *   queryKey: ['activities'],
 *   queryFn: fetchActivities,
 *   ...QUERY_CONFIG.activities,
 * });
 * ```
 */

export const QUERY_CONFIG = {
  /**
   * Activity feed - updates frequently but can tolerate 20s delay
   */
  activities: {
    staleTime: 15 * 1000,        // 15 seconds - data considered fresh
    gcTime: 5 * 60 * 1000,       // 5 minutes - cache retention
    refetchInterval: 20 * 1000,  // 20 seconds - background refetch (was 10s)
  },

  /**
   * Agent data - status changes are important but not critical
   */
  agents: {
    staleTime: 30 * 1000,        // 30 seconds
    gcTime: 10 * 60 * 1000,      // 10 minutes
    refetchInterval: 30 * 1000,  // 30 seconds (was 10s)
  },

  /**
   * Proposals - relatively stable, voting status important
   */
  proposals: {
    staleTime: 30 * 1000,        // 30 seconds
    gcTime: 10 * 60 * 1000,      // 10 minutes
    refetchInterval: 30 * 1000,  // 30 seconds
  },

  /**
   * Dashboard stats - high-level metrics can be slightly delayed
   */
  stats: {
    staleTime: 20 * 1000,        // 20 seconds
    gcTime: 5 * 60 * 1000,       // 5 minutes
    refetchInterval: 30 * 1000,  // 30 seconds
  },

  /**
   * Signals - real-time feel but can be batched
   */
  signals: {
    staleTime: 15 * 1000,        // 15 seconds
    gcTime: 5 * 60 * 1000,       // 5 minutes
    refetchInterval: 20 * 1000,  // 20 seconds (was 5s in some places)
  },

  /**
   * Issues - important but not real-time critical
   */
  issues: {
    staleTime: 30 * 1000,        // 30 seconds
    gcTime: 10 * 60 * 1000,      // 10 minutes
    refetchInterval: 30 * 1000,  // 30 seconds (was 10s)
  },

  /**
   * Agora sessions - active discussions need faster updates
   */
  agora: {
    staleTime: 10 * 1000,        // 10 seconds
    gcTime: 5 * 60 * 1000,       // 5 minutes
    refetchInterval: 15 * 1000,  // 15 seconds (was 3-5s)
  },

  /**
   * Disclosure logs - historical data, infrequent changes
   */
  disclosure: {
    staleTime: 60 * 1000,        // 60 seconds
    gcTime: 15 * 60 * 1000,      // 15 minutes
    refetchInterval: 60 * 1000,  // 60 seconds (was 30s)
  },

  /**
   * Treasury data - financial data, moderate refresh
   */
  treasury: {
    staleTime: 30 * 1000,        // 30 seconds
    gcTime: 10 * 60 * 1000,      // 10 minutes
    refetchInterval: 60 * 1000,  // 60 seconds (was 30s)
  },

  /**
   * Governance OS data - policy documents, less frequent updates
   */
  governance: {
    staleTime: 30 * 1000,        // 30 seconds
    gcTime: 10 * 60 * 1000,      // 10 minutes
    refetchInterval: 30 * 1000,  // 30 seconds
  },

  /**
   * Engine/Pipeline data - system status
   */
  engine: {
    staleTime: 15 * 1000,        // 15 seconds
    gcTime: 5 * 60 * 1000,       // 5 minutes
    refetchInterval: 20 * 1000,  // 20 seconds (was 5s)
  },

  /**
   * Live metrics - real-time dashboard, faster refresh acceptable
   */
  liveMetrics: {
    staleTime: 5 * 1000,         // 5 seconds
    gcTime: 2 * 60 * 1000,       // 2 minutes
    refetchInterval: 10 * 1000,  // 10 seconds (was 5s)
  },

  /**
   * Agent chatter - ambient updates
   */
  chatter: {
    staleTime: 10 * 1000,        // 10 seconds
    gcTime: 5 * 60 * 1000,       // 5 minutes
    refetchInterval: 15 * 1000,  // 15 seconds
  },
} as const;

/**
 * Type-safe query config keys
 */
export type QueryConfigKey = keyof typeof QUERY_CONFIG;

/**
 * Helper to get query config with type safety
 */
export function getQueryConfig(key: QueryConfigKey) {
  return QUERY_CONFIG[key];
}
