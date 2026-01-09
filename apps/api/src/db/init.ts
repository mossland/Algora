import 'dotenv/config';
import { initDatabase } from './index';
import { seedAgents } from '../agents/seed';

async function main() {
  console.info('Initializing Algora database...');

  const db = initDatabase();

  // Seed initial agents
  console.info('Seeding agents...');
  seedAgents(db);

  console.info('Database initialization complete!');
  process.exit(0);
}

main().catch(error => {
  console.error('Database initialization failed:', error);
  process.exit(1);
});
