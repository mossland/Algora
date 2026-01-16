/**
 * Server-side API utilities for React Server Components
 * These functions run on the server and can be used in async Server Components
 */

import { type Stats, type Agent, type Activity } from './api';

// Use internal API URL for server-side requests (faster, no SSL overhead)
const API_BASE = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3201';

/**
 * Server-side fetch with caching options
 */
async function serverFetch<T>(
  endpoint: string,
  options?: {
    revalidate?: number | false;
    tags?: string[];
  }
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;

  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
    },
    next: {
      revalidate: options?.revalidate ?? 10, // Default 10 seconds cache
      tags: options?.tags,
    },
  });

  if (!response.ok) {
    console.error(`Server API Error: ${response.status} for ${endpoint}`);
    throw new Error(`Server API Error: ${response.status}`);
  }

  return response.json();
}

/**
 * Fetch dashboard stats (server-side)
 */
export async function getStats(): Promise<Stats> {
  try {
    return await serverFetch<Stats>('/api/stats', {
      revalidate: 10,
      tags: ['stats'],
    });
  } catch (error) {
    console.error('Failed to fetch stats on server:', error);
    return {
      activeAgents: 0,
      activeSessions: 0,
      signalsToday: 0,
      openIssues: 0,
    };
  }
}

/**
 * Fetch agents list (server-side)
 */
export async function getAgents(): Promise<Agent[]> {
  try {
    const response = await serverFetch<{ agents: Agent[] }>('/api/agents', {
      revalidate: 30,
      tags: ['agents'],
    });
    return response.agents || [];
  } catch (error) {
    console.error('Failed to fetch agents on server:', error);
    return [];
  }
}

/**
 * Fetch recent activities (server-side)
 */
export async function getActivities(limit = 25): Promise<Activity[]> {
  try {
    const response = await serverFetch<{ activities: Activity[] }>(
      `/api/activity?limit=${limit}`,
      {
        revalidate: 15,
        tags: ['activities'],
      }
    );
    return response.activities || [];
  } catch (error) {
    console.error('Failed to fetch activities on server:', error);
    return [];
  }
}

/**
 * Fetch all dashboard data in parallel (optimized for initial load)
 */
export async function getDashboardData() {
  const [stats, agents, activities] = await Promise.all([
    getStats(),
    getAgents(),
    getActivities(25),
  ]);

  return { stats, agents, activities };
}
