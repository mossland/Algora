import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';

import { initDatabase } from './db';
import { setupRoutes } from './routes';
import { setupSocketHandlers } from './services/socket';
import { ActivityService } from './activity';
import { SchedulerService } from './scheduler';

const PORT = process.env.PORT || 3201;
const NODE_ENV = process.env.NODE_ENV || 'development';

const app = express();
const httpServer = createServer(app);

// Socket.IO setup
const io = new SocketServer(httpServer, {
  cors: {
    origin: NODE_ENV === 'development'
      ? ['http://localhost:3200', 'http://127.0.0.1:3200']
      : process.env.CORS_ORIGIN?.split(',') || [],
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: NODE_ENV === 'development'
    ? ['http://localhost:3200', 'http://127.0.0.1:3200']
    : process.env.CORS_ORIGIN?.split(',') || [],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
  });
});

// Initialize services
async function bootstrap() {
  try {
    // Initialize database
    console.info('Initializing database...');
    const db = initDatabase();

    // Make db available to routes
    app.locals.db = db;
    app.locals.io = io;

    // Setup routes
    setupRoutes(app);

    // Setup Socket.IO handlers
    setupSocketHandlers(io, db);

    // Initialize activity service
    const activityService = new ActivityService(db, io);
    app.locals.activityService = activityService;

    // Initialize scheduler (commented out until fully implemented)
    // const schedulerService = new SchedulerService(db, io, activityService);
    // app.locals.schedulerService = schedulerService;

    // Start heartbeat
    activityService.startHeartbeat();

    // Start server
    httpServer.listen(PORT, () => {
      console.info(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║     █████╗ ██╗      ██████╗  ██████╗ ██████╗  █████╗        ║
║    ██╔══██╗██║     ██╔════╝ ██╔═══██╗██╔══██╗██╔══██╗       ║
║    ███████║██║     ██║  ███╗██║   ██║██████╔╝███████║       ║
║    ██╔══██║██║     ██║   ██║██║   ██║██╔══██╗██╔══██║       ║
║    ██║  ██║███████╗╚██████╔╝╚██████╔╝██║  ██║██║  ██║       ║
║    ╚═╝  ╚═╝╚══════╝ ╚═════╝  ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝       ║
║                                                              ║
║    24/7 Live Agentic Governance Platform                     ║
║                                                              ║
╠══════════════════════════════════════════════════════════════╣
║    API Server running on: http://localhost:${PORT}             ║
║    Environment: ${NODE_ENV.padEnd(43)}║
║    Database: SQLite with WAL mode                            ║
╚══════════════════════════════════════════════════════════════╝
      `);
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.info('SIGTERM received, shutting down...');
  httpServer.close(() => {
    console.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.info('SIGINT received, shutting down...');
  httpServer.close(() => {
    console.info('Server closed');
    process.exit(0);
  });
});

bootstrap();

export { app, io };
