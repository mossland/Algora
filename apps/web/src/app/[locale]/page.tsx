import { getDashboardData } from '@/lib/server-api';
import { DashboardClient } from '@/components/dashboard';

/**
 * Dashboard Page - Server Component
 *
 * This page uses React Server Components (RSC) to fetch data on the server
 * before sending HTML to the client. This eliminates the loading spinner
 * on initial page load and improves Time to First Contentful Paint (FCP).
 *
 * Data flow:
 * 1. Server fetches stats, agents, activities in parallel
 * 2. Server renders HTML with initial data
 * 3. Client receives pre-rendered HTML (instant display)
 * 4. Client hydrates and React Query takes over for real-time updates
 */
export default async function DashboardPage() {
  // Fetch all dashboard data on the server (parallel requests)
  const { stats, agents, activities } = await getDashboardData();

  return (
    <DashboardClient
      initialStats={stats}
      initialAgents={agents}
      initialActivities={activities}
    />
  );
}
