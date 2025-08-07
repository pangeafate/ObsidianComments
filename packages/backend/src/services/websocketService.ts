import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';

interface NoteRoom {
  shareId: string;
  clients: Set<string>;
}

class WebSocketService {
  private io: SocketIOServer | null = null;
  private noteRooms: Map<string, NoteRoom> = new Map();

  init(httpServer: HttpServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: [
          'https://obsidiancomments.serverado.app',
          'http://localhost:3001', // Local development
          'http://localhost:5173', // Vite dev server
          'app://obsidian.md', // Obsidian desktop app
        ],
        methods: ['GET', 'POST'],
        credentials: true
      }
    });

    this.io.on('connection', (socket: Socket) => {
      console.log('🔌 Client connected:', socket.id);

      // Handle joining a note room for collaboration
      socket.on('join_note', (shareId: string) => {
        if (!shareId) {
          socket.emit('error', 'Share ID is required');
          return;
        }

        console.log(`📝 Client ${socket.id} joining note room: ${shareId}`);
        socket.join(shareId);

        // Track the room
        if (!this.noteRooms.has(shareId)) {
          this.noteRooms.set(shareId, {
            shareId,
            clients: new Set()
          });
        }
        this.noteRooms.get(shareId)?.clients.add(socket.id);

        // Notify others that a new collaborator joined
        socket.to(shareId).emit('collaborator_joined', {
          clientId: socket.id,
          timestamp: new Date().toISOString()
        });

        socket.emit('joined_note', {
          shareId,
          timestamp: new Date().toISOString()
        });
      });

      // Handle leaving a note room
      socket.on('leave_note', (shareId: string) => {
        if (!shareId) return;

        console.log(`📝 Client ${socket.id} leaving note room: ${shareId}`);
        socket.leave(shareId);

        // Remove from room tracking
        const room = this.noteRooms.get(shareId);
        if (room) {
          room.clients.delete(socket.id);
          if (room.clients.size === 0) {
            this.noteRooms.delete(shareId);
          }
        }

        // Notify others that collaborator left
        socket.to(shareId).emit('collaborator_left', {
          clientId: socket.id,
          timestamp: new Date().toISOString()
        });
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log('🔌 Client disconnected:', socket.id);

        // Clean up from all rooms
        for (const [shareId, room] of this.noteRooms.entries()) {
          if (room.clients.has(socket.id)) {
            room.clients.delete(socket.id);
            
            // Notify others in the room
            socket.to(shareId).emit('collaborator_left', {
              clientId: socket.id,
              timestamp: new Date().toISOString()
            });

            // Remove empty rooms
            if (room.clients.size === 0) {
              this.noteRooms.delete(shareId);
            }
          }
        }
      });
    });

    console.log('✅ WebSocket service initialized');
  }

  // Notify all connected clients when a note is deleted
  notifyNoteDeleted(shareId: string) {
    if (!this.io) {
      console.warn('⚠️  WebSocket service not initialized, skipping notification');
      return;
    }

    console.log(`🗑️  Notifying clients about deleted note: ${shareId}`);
    
    // Send to all clients in the note room
    this.io.to(shareId).emit('note_deleted', {
      shareId,
      message: 'This note has been deleted',
      timestamp: new Date().toISOString()
    });

    // Clean up the room tracking
    this.noteRooms.delete(shareId);
  }

  // Notify about note updates (for future use)
  notifyNoteUpdated(shareId: string, updateData: any) {
    if (!this.io) {
      console.warn('⚠️  WebSocket service not initialized, skipping notification');
      return;
    }

    this.io.to(shareId).emit('note_updated', {
      shareId,
      updateData,
      timestamp: new Date().toISOString()
    });
  }

  // Get connected clients for a note
  getConnectedClients(shareId: string): number {
    const room = this.noteRooms.get(shareId);
    return room ? room.clients.size : 0;
  }

  // Get IO instance for external use
  getIO(): SocketIOServer | null {
    return this.io;
  }
}

// Export singleton instance
export const websocketService = new WebSocketService();