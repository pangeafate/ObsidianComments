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
  private connectionAttempts = 0;
  private maxConnectionAttempts = 3;
  private isConnecting = false;
  private circuitBreakerOpen = false;
  private lastAttemptTime = 0;
  private circuitBreakerTimeout = 60000; // 1 minute

  private serverUrl: string;

  constructor(serverUrl?: string) {
    // Default to production URL, but use localhost for development
    if (serverUrl) {
      this.serverUrl = serverUrl;
    } else if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      this.serverUrl = 'http://localhost:3001'; // Backend runs on 3001 in development
    } else {
      this.serverUrl = 'https://obsidiancomments.lakestrom.com';
    }
    console.log('WebSocketManager initialized with URL:', this.serverUrl);
  }

  // Connection management
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check circuit breaker
      if (this.circuitBreakerOpen) {
        const timeSinceLastAttempt = Date.now() - this.lastAttemptTime;
        if (timeSinceLastAttempt < this.circuitBreakerTimeout) {
          const waitTime = Math.ceil((this.circuitBreakerTimeout - timeSinceLastAttempt) / 1000);
          reject(new Error(`Connection temporarily unavailable. Try again in ${waitTime} seconds.`));
          return;
        } else {
          // Reset circuit breaker
          this.circuitBreakerOpen = false;
          this.connectionAttempts = 0;
        }
      }

      if (this.socket?.connected) {
        console.log('WebSocket already connected');
        resolve();
        return;
      }

      if (this.isConnecting) {
        reject(new Error('Connection already in progress'));
        return;
      }

      // Prevent excessive connection attempts even before circuit breaker
      if (this.connectionAttempts >= this.maxConnectionAttempts) {
        this.circuitBreakerOpen = true;
        reject(new Error('Maximum connection attempts reached. Please wait before retrying.'));
        return;
      }

      this.isConnecting = true;
      this.connectionAttempts++;
      this.lastAttemptTime = Date.now();

      console.log(`Attempting to connect to WebSocket server (attempt ${this.connectionAttempts}/${this.maxConnectionAttempts}):`, this.serverUrl);
      
      // Create socket with minimal reconnection to prevent resource exhaustion
      this.socket = io(this.serverUrl, {
        transports: ['polling', 'websocket'],
        timeout: 10000,
        forceNew: true,
        autoConnect: true,
        reconnection: false, // Disable Socket.IO auto-reconnection - we handle it manually
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
        console.log('WebSocket connected successfully');
        this.isConnecting = false;
        this.connectionAttempts = 0;
        this.circuitBreakerOpen = false;
        this.emit('connection-status', { connected: true });
        resolve();
      });

      this.socket.on('disconnect', (reason) => {
        console.log('WebSocket disconnected:', reason);
        this.isConnecting = false;
        this.emit('connection-status', { connected: false, reason });
        
        // Don't auto-reconnect - let the app handle reconnection logic
      });

      this.socket.on('connect_error', (error: any) => {
        console.error('WebSocket connection error:', error);
        this.isConnecting = false;
        
        // Check if we should open circuit breaker
        if (this.connectionAttempts >= this.maxConnectionAttempts) {
          this.circuitBreakerOpen = true;
          console.warn('Circuit breaker opened due to repeated connection failures');
          // Stop incrementing attempts when circuit breaker is open
          this.connectionAttempts = this.maxConnectionAttempts;
        }
        
        let errorMessage: string;
        
        if (error.type === 'TransportError' || error.message?.includes('ERR_INSUFFICIENT_RESOURCES')) {
          errorMessage = 'Server temporarily unavailable. Please wait a moment and try again.';
        } else if (error.message?.includes('ECONNREFUSED')) {
          errorMessage = 'Cannot reach collaboration server. Please check your connection.';
        } else if (error.message?.includes('timeout')) {
          errorMessage = 'Connection timed out. Please try again.';
        } else {
          errorMessage = `Connection failed: ${error.description || error.message || 'Unknown error'}`;
        }
          
        this.emit('connection-status', { 
          connected: false, 
          error: errorMessage
        });
        reject(new Error(errorMessage));
      });

      // Set up event listeners
      this.setupEventListeners();
    });
  }

  disconnect(): void {
    this.isConnecting = false;
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Add a manual retry method for apps to use
  retry(): Promise<void> {
    if (this.circuitBreakerOpen) {
      this.circuitBreakerOpen = false;
      this.connectionAttempts = 0;
      console.log('Circuit breaker manually reset');
    }
    return this.connect();
  }

  // Get connection state for UI
  getConnectionState() {
    return {
      isConnecting: this.isConnecting,
      isConnected: this.socket?.connected || false,
      connectionAttempts: this.connectionAttempts,
      maxAttempts: this.maxConnectionAttempts,
      circuitBreakerOpen: this.circuitBreakerOpen
    };
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