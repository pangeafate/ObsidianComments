// WebSocket manager for real-time collaboration

import { io, Socket } from 'socket.io-client';
import type {
  Operation,
  TextChangeEvent,
  SyncStateEvent,
  HighlightsUpdateEvent,
  CommentEvent,
  PresenceEvent,
  CursorPosition
} from '../types/collaboration';

export type WebSocketEventHandler<T = any> = (data: T) => void;

export class WebSocketManager {
  private socket: Socket | null = null;
  private eventHandlers: Map<string, WebSocketEventHandler[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  private serverUrl: string;

  constructor(serverUrl?: string) {
    // Default to production URL, but use localhost for development
    if (serverUrl) {
      this.serverUrl = serverUrl;
    } else if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      this.serverUrl = 'http://localhost:3001';
    } else {
      this.serverUrl = 'https://obsidiancomments.lakestrom.com';
    }
    console.log('WebSocketManager initialized with URL:', this.serverUrl);
  }

  // Connection management
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        console.log('WebSocket already connected');
        resolve();
        return;
      }

      console.log('Attempting to connect to WebSocket server:', this.serverUrl);
      this.socket = io(this.serverUrl, {
        transports: ['polling', 'websocket'], // Try polling first, then upgrade to websocket
        timeout: 20000,
        forceNew: true,
        autoConnect: true,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
        upgrade: true
      });

      // Debug transport events
      this.socket.on('disconnect', (reason, details) => {
        console.log('Socket disconnected:', reason, details);
      });

      // Monitor transport upgrades
      this.socket.on('upgrade', () => {
        console.log('Socket upgraded to:', this.socket?.io.engine.transport.name);
      });

      this.socket.on('upgradeError', (error) => {
        console.error('Socket upgrade error:', error);
      });

      this.socket.on('connect', () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        this.emit('connection-status', { connected: true });
        resolve();
      });

      this.socket.on('disconnect', (reason) => {
        console.log('WebSocket disconnected:', reason);
        this.emit('connection-status', { connected: false, reason });
        
        if (reason === 'io server disconnect') {
          // Server initiated disconnect, don't reconnect
          return;
        }
        
        this.handleReconnect();
      });

      this.socket.on('connect_error', (error: any) => {
        console.error('WebSocket connection error:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        console.error('Error type:', error.type);
        console.error('Error description:', error.description);
        console.error('Error context:', error.context);
        console.error('Error transport:', error.transport);
        this.emit('connection-status', { 
          connected: false, 
          error: `${error.type || 'Connection Error'}: ${error.description || error.message || 'Unknown error'}` 
        });
        reject(error);
      });

      // Set up event listeners
      this.setupEventListeners();
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.emit('connection-status', { 
        connected: false, 
        error: 'Connection failed after multiple attempts' 
      });
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      this.connect().catch(error => {
        console.error('Reconnection failed:', error);
      });
    }, delay);
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    // Collaboration events
    this.socket.on('sync-state', (data: SyncStateEvent) => {
      this.emit('sync-state', data);
    });

    this.socket.on('text-change-applied', (data: TextChangeEvent) => {
      this.emit('text-change-applied', data);
    });

    this.socket.on('highlights-update', (data: HighlightsUpdateEvent) => {
      this.emit('highlights-update', data);
    });

    this.socket.on('cursor-update', (data: CursorPosition) => {
      this.emit('cursor-update', data);
    });

    // Comment events
    this.socket.on('comment-add', (data: CommentEvent) => {
      this.emit('comment-add', data);
    });

    this.socket.on('comment-update', (data: CommentEvent) => {
      this.emit('comment-update', data);
    });

    this.socket.on('comment-delete', (data: CommentEvent) => {
      this.emit('comment-delete', data);
    });

    // Presence events
    this.socket.on('contributor-join', (data: PresenceEvent) => {
      this.emit('contributor-join', data);
    });

    this.socket.on('contributor-leave', (data: PresenceEvent) => {
      this.emit('contributor-leave', data);
    });

    this.socket.on('contributors-list', (data: { contributors: any[] }) => {
      this.emit('contributors-list', data);
    });

    // Error handling
    this.socket.on('error', (data: { message: string }) => {
      this.emit('error', data);
    });
  }

  // Event emission and handling
  private emit(event: string, data: any): void {
    const handlers = this.eventHandlers.get(event) || [];
    handlers.forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error(`Error in event handler for ${event}:`, error);
      }
    });
  }

  on<T = any>(event: string, handler: WebSocketEventHandler<T>): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  off(event: string, handler: WebSocketEventHandler): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  // Collaboration methods
  joinShare(shareId: string, contributorName: string): void {
    if (!this.socket?.connected) {
      throw new Error('WebSocket not connected');
    }

    this.socket.emit('join-share', {
      shareId,
      contributorName
    });
  }

  leaveShare(shareId: string): void {
    if (!this.socket?.connected) return;

    this.socket.emit('leave-share', {
      shareId
    });
  }

  sendTextChange(
    shareId: string,
    operation: Operation[],
    operationId: string,
    baseVersion: number
  ): void {
    if (!this.socket?.connected) {
      throw new Error('WebSocket not connected');
    }

    this.socket.emit('text-change', {
      shareId,
      operation,
      operationId,
      baseVersion
    });
  }

  sendCursorMove(
    contributorName: string,
    position: number,
    selection?: { start: number; end: number }
  ): void {
    if (!this.socket?.connected) return;

    this.socket.emit('cursor-move', {
      contributorName,
      position,
      selection
    });
  }

  addComment(
    shareId: string,
    contributorName: string,
    content: string,
    positionStart: number,
    positionEnd: number,
    parentCommentId?: number
  ): void {
    if (!this.socket?.connected) {
      throw new Error('WebSocket not connected');
    }

    this.socket.emit('comment-add', {
      type: 'add',
      shareId,
      contributorName,
      content,
      positionStart,
      positionEnd,
      parentCommentId
    });
  }

  updateComment(
    shareId: string,
    commentId: number,
    contributorName: string,
    content: string
  ): void {
    if (!this.socket?.connected) {
      throw new Error('WebSocket not connected');
    }

    this.socket.emit('comment-update', {
      type: 'update',
      shareId,
      commentId,
      contributorName,
      content
    });
  }

  deleteComment(
    shareId: string,
    commentId: number,
    contributorName: string
  ): void {
    if (!this.socket?.connected) {
      throw new Error('WebSocket not connected');
    }

    this.socket.emit('comment-delete', {
      type: 'delete',
      shareId,
      commentId,
      contributorName
    });
  }

  requestSync(shareId: string): void {
    if (!this.socket?.connected) return;

    this.socket.emit('request-sync', {
      shareId
    });
  }

  requestHighlights(shareId: string): void {
    if (!this.socket?.connected) return;

    this.socket.emit('request-highlights', {
      shareId
    });
  }

  // Utility methods
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  getConnectionId(): string | undefined {
    return this.socket?.id;
  }
}

// Singleton instance
export const webSocketManager = new WebSocketManager();