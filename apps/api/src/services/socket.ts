import { Server as SocketServer, Socket } from 'socket.io';
import type Database from 'better-sqlite3';

export function setupSocketHandlers(io: SocketServer, db: Database.Database): void {
  io.on('connection', (socket: Socket) => {
    console.info(`Client connected: ${socket.id}`);

    // Join agora session room
    socket.on('agora:join', (sessionId: string) => {
      socket.join(`agora:${sessionId}`);
      console.info(`Client ${socket.id} joined agora session: ${sessionId}`);
    });

    // Leave agora session room
    socket.on('agora:leave', (sessionId: string) => {
      socket.leave(`agora:${sessionId}`);
      console.info(`Client ${socket.id} left agora session: ${sessionId}`);
    });

    // Handle agent summon request
    socket.on('agent:summon', (data: { sessionId: string; agentId: string; reason?: string }) => {
      // This will be handled by the REST API, but we can emit acknowledgment
      socket.emit('agent:summon:ack', { received: true, ...data });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.info(`Client disconnected: ${socket.id}`);
    });

    // Error handling
    socket.on('error', (error) => {
      console.error(`Socket error for ${socket.id}:`, error);
    });
  });

  // Middleware for authentication (if needed in the future)
  io.use((socket, next) => {
    // For now, allow all connections
    // In production, add token verification here
    next();
  });
}

// Helper function to broadcast activity events
export function broadcastActivity(
  io: SocketServer,
  type: string,
  severity: string,
  message: string,
  details?: Record<string, unknown>
): void {
  io.emit('activity:event', {
    type,
    severity,
    message,
    details,
    timestamp: new Date().toISOString(),
  });
}

// Helper function to broadcast agent chatter
export function broadcastChatter(
  io: SocketServer,
  agentId: string,
  agentName: string,
  message: string,
  color?: string
): void {
  io.emit('agent:chatter', {
    agentId,
    agentName,
    message,
    color,
    timestamp: new Date().toISOString(),
  });
}
