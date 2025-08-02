// WebSocket server for real-time collaboration

import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { 
  WS_EVENTS, 
  ContributorSession, 
  TextChangeOperation, 
  CursorPosition, 
  CommentEvent, 
  PresenceEvent,
  TransformedOperation
} from './types';
import { roomManager } from './rooms';
import { CommentModel } from '../db/models/Comment';
import { NoteModel } from '../db/models/Note';

export class CollaborationServer {
  private io: SocketIOServer;

  constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: [
          'app://obsidian.md',
          'https://obsidiancomments.lakestrom.com',
          'https://lakestrom.com',
          'http://localhost:3000',
          'http://localhost:3001'
        ],
        methods: ['GET', 'POST'],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    this.setupEventHandlers();
    this.setupCleanupTimer();
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket) => {
      console.log(`Socket connected: ${socket.id}`);

      // Join a share room
      socket.on(WS_EVENTS.JOIN_SHARE, async (data: {
        shareId: string;
        contributorName: string;
      }) => {
        try {
          await this.handleJoinShare(socket, data);
        } catch (error) {
          console.error('Error joining share:', error);
          socket.emit(WS_EVENTS.ERROR, { message: 'Failed to join share' });
        }
      });

      // Leave share room
      socket.on(WS_EVENTS.LEAVE_SHARE, (data: { shareId: string }) => {
        this.handleLeaveShare(socket, data.shareId);
      });

      // Handle text changes
      socket.on(WS_EVENTS.TEXT_CHANGE, async (data: {
        shareId: string;
        operation: any[];
        operationId: string;
        baseVersion: number;
      }) => {
        try {
          await this.handleTextChange(socket, data);
        } catch (error) {
          console.error('Error handling text change:', error);
          socket.emit(WS_EVENTS.ERROR, { message: 'Failed to apply text change' });
        }
      });

      // Handle cursor movements
      socket.on(WS_EVENTS.CURSOR_MOVE, (data: CursorPosition) => {
        this.handleCursorMove(socket, data);
      });

      // Handle comment events
      socket.on(WS_EVENTS.COMMENT_ADD, async (data: CommentEvent) => {
        try {
          await this.handleCommentAdd(socket, data);
        } catch (error) {
          console.error('Error adding comment:', error);
          socket.emit(WS_EVENTS.ERROR, { message: 'Failed to add comment' });
        }
      });

      socket.on(WS_EVENTS.COMMENT_UPDATE, async (data: CommentEvent) => {
        try {
          await this.handleCommentUpdate(socket, data);
        } catch (error) {
          console.error('Error updating comment:', error);
          socket.emit(WS_EVENTS.ERROR, { message: 'Failed to update comment' });
        }
      });

      socket.on(WS_EVENTS.COMMENT_DELETE, async (data: CommentEvent) => {
        try {
          await this.handleCommentDelete(socket, data);
        } catch (error) {
          console.error('Error deleting comment:', error);
          socket.emit(WS_EVENTS.ERROR, { message: 'Failed to delete comment' });
        }
      });

      // Handle sync requests
      socket.on(WS_EVENTS.REQUEST_SYNC, (data: { shareId: string }) => {
        this.handleSyncRequest(socket, data.shareId);
      });

      // Handle highlight requests
      socket.on(WS_EVENTS.REQUEST_HIGHLIGHTS, (data: { shareId: string }) => {
        this.handleHighlightsRequest(socket, data.shareId);
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`Socket disconnected: ${socket.id}`);
        this.handleDisconnect(socket);
      });
    });
  }

  private async handleJoinShare(socket: any, data: {
    shareId: string;
    contributorName: string;
  }): Promise<void> {
    const { shareId, contributorName } = data;

    // Verify share exists
    const note = await NoteModel.getByShareId(shareId);
    if (!note) {
      socket.emit(WS_EVENTS.ERROR, { message: 'Share not found' });
      return;
    }

    // Get contributor color
    const colorInfo = await CommentModel.getContributorColor(contributorName);

    // Create session
    const session: ContributorSession = {
      contributorName,
      contributorColor: colorInfo.colorHex,
      socketId: socket.id,
      shareId,
      lastActive: new Date()
    };

    // Get or create room
    const room = roomManager.getRoom(shareId, note.content, note.version);
    room.addContributor(session);

    // Join socket room
    socket.join(shareId);

    // Notify other contributors
    socket.to(shareId).emit(WS_EVENTS.CONTRIBUTOR_JOIN, {
      type: 'join',
      contributorName,
      contributorColor: colorInfo.colorHex,
      shareId
    } as PresenceEvent);

    // Send current state to joining contributor
    socket.emit(WS_EVENTS.SYNC_STATE, {
      documentState: room.getDocumentState(),
      contributors: room.getContributorSummary(),
      highlights: room.getCurrentHighlights()
    });

    // Send contributors list
    socket.emit(WS_EVENTS.CONTRIBUTORS_LIST, {
      contributors: room.getContributorSummary()
    });

    console.log(`${contributorName} joined share ${shareId}`);
  }

  private handleLeaveShare(socket: any, shareId: string): void {
    const room = roomManager.getRoom(shareId);
    if (!room) return;

    const session = room.removeContributor(socket.id);
    if (!session) return;

    socket.leave(shareId);

    // Notify other contributors
    socket.to(shareId).emit(WS_EVENTS.CONTRIBUTOR_LEAVE, {
      type: 'leave',
      contributorName: session.contributorName,
      contributorColor: session.contributorColor,
      shareId
    } as PresenceEvent);
  }

  private async handleTextChange(socket: any, data: {
    shareId: string;
    operation: any[];
    operationId: string;
    baseVersion: number;
  }): Promise<void> {
    const { shareId, operation, operationId, baseVersion } = data;
    
    const room = roomManager.getRoom(shareId);
    if (!room) {
      socket.emit(WS_EVENTS.ERROR, { message: 'Room not found' });
      return;
    }

    const session = room.getContributor(socket.id);
    if (!session) {
      socket.emit(WS_EVENTS.ERROR, { message: 'Session not found' });
      return;
    }

    // Create transformed operation
    const transformedOp: TransformedOperation = {
      operation,
      contributorName: session.contributorName,
      timestamp: new Date(),
      baseVersion,
      operationId
    };

    // Apply operation to room state
    const success = room.applyOperation(transformedOp);
    if (!success) {
      socket.emit(WS_EVENTS.ERROR, { message: 'Failed to apply operation' });
      return;
    }

    // Update database
    try {
      await NoteModel.update(
        shareId, 
        room.documentState.content, 
        session.contributorName,
        'Real-time edit'
      );
    } catch (error) {
      console.error('Error updating note in database:', error);
    }

    // Broadcast to other contributors
    socket.to(shareId).emit(WS_EVENTS.TEXT_CHANGE_APPLIED, {
      operation,
      contributorName: session.contributorName,
      contributorColor: session.contributorColor,
      operationId,
      newVersion: room.documentState.version,
      timestamp: transformedOp.timestamp,
      highlights: room.getCurrentHighlights()
    });

    // Confirm to sender
    socket.emit(WS_EVENTS.TEXT_CHANGE_APPLIED, {
      operationId,
      newVersion: room.documentState.version,
      success: true,
      highlights: room.getCurrentHighlights()
    });

    // Broadcast highlight updates
    this.io.to(shareId).emit(WS_EVENTS.HIGHLIGHTS_UPDATE, {
      highlights: room.getCurrentHighlights(),
      contributorName: session.contributorName,
      operationId
    });
  }

  private handleCursorMove(socket: any, data: CursorPosition): void {
    const room = roomManager.getRoom(data.contributorName); // This needs shareId
    if (!room) return;

    room.updateContributorCursor(socket.id, data.position);

    // Broadcast cursor position to other contributors
    socket.to(room.shareId).emit(WS_EVENTS.CURSOR_UPDATE, {
      contributorName: data.contributorName,
      position: data.position,
      selection: data.selection
    });
  }

  private async handleCommentAdd(socket: any, data: CommentEvent): Promise<void> {
    // Create comment in database
    const comment = await CommentModel.create({
      shareId: data.shareId,
      contributorName: data.contributorName,
      content: data.content!,
      positionStart: data.positionStart!,
      positionEnd: data.positionEnd!,
      versionNumber: 1, // Get from room state
      parentCommentId: data.parentCommentId
    });

    // Broadcast to all contributors in the share
    this.io.to(data.shareId).emit(WS_EVENTS.COMMENT_ADD, {
      comment,
      contributorName: data.contributorName
    });
  }

  private async handleCommentUpdate(socket: any, data: CommentEvent): Promise<void> {
    const updatedComment = await CommentModel.update(
      data.commentId!,
      data.content!,
      data.contributorName
    );

    if (updatedComment) {
      this.io.to(data.shareId).emit(WS_EVENTS.COMMENT_UPDATE, {
        comment: updatedComment,
        contributorName: data.contributorName
      });
    }
  }

  private async handleCommentDelete(socket: any, data: CommentEvent): Promise<void> {
    const success = await CommentModel.delete(data.commentId!, data.contributorName);

    if (success) {
      this.io.to(data.shareId).emit(WS_EVENTS.COMMENT_DELETE, {
        commentId: data.commentId,
        contributorName: data.contributorName
      });
    }
  }

  private handleSyncRequest(socket: any, shareId: string): void {
    const room = roomManager.getRoom(shareId);
    if (!room) {
      socket.emit(WS_EVENTS.ERROR, { message: 'Room not found' });
      return;
    }

    socket.emit(WS_EVENTS.SYNC_STATE, {
      documentState: room.getDocumentState(),
      contributors: room.getContributorSummary(),
      highlights: room.getCurrentHighlights()
    });
  }

  private handleHighlightsRequest(socket: any, shareId: string): void {
    const room = roomManager.getRoom(shareId);
    if (!room) {
      socket.emit(WS_EVENTS.ERROR, { message: 'Room not found' });
      return;
    }

    socket.emit(WS_EVENTS.HIGHLIGHTS_UPDATE, {
      highlights: room.getCurrentHighlights(),
      stats: room.getHighlightStats(),
      shareId
    });
  }

  private handleDisconnect(socket: any): void {
    // Find and remove from all rooms
    for (const room of roomManager['rooms'].values()) {
      const session = room.removeContributor(socket.id);
      if (session) {
        socket.to(room.shareId).emit(WS_EVENTS.CONTRIBUTOR_LEAVE, {
          type: 'leave',
          contributorName: session.contributorName,
          contributorColor: session.contributorColor,
          shareId: room.shareId
        } as PresenceEvent);
        break;
      }
    }
  }

  private setupCleanupTimer(): void {
    // Clean up empty rooms every 5 minutes
    setInterval(() => {
      roomManager.cleanupEmptyRooms();
    }, 5 * 60 * 1000);
  }

  public getStats(): { roomCount: number; contributorCount: number } {
    return {
      roomCount: roomManager.getRoomCount(),
      contributorCount: roomManager.getTotalContributorCount()
    };
  }
}