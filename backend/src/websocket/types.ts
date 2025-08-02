// WebSocket event types for real-time collaboration

export interface ContributorSession {
  contributorName: string;
  contributorColor: string;
  socketId: string;
  shareId: string;
  cursorPosition?: number;
  lastActive: Date;
}

export interface TextChangeOperation {
  type: 'insert' | 'delete' | 'retain';
  position: number;
  content?: string;
  length?: number;
  contributorName: string;
  timestamp: Date;
  operationId: string;
}

export interface CursorPosition {
  contributorName: string;
  position: number;
  selection?: {
    start: number;
    end: number;
  };
}

export interface CommentEvent {
  type: 'add' | 'update' | 'delete' | 'resolve';
  commentId?: number;
  shareId: string;
  contributorName: string;
  content?: string;
  positionStart?: number;
  positionEnd?: number;
  parentCommentId?: number;
}

export interface PresenceEvent {
  type: 'join' | 'leave' | 'update';
  contributorName: string;
  contributorColor: string;
  shareId: string;
  cursorPosition?: number;
}

// WebSocket event names
export const WS_EVENTS = {
  // Connection events
  JOIN_SHARE: 'join-share',
  LEAVE_SHARE: 'leave-share',
  
  // Text editing events
  TEXT_CHANGE: 'text-change',
  TEXT_CHANGE_APPLIED: 'text-change-applied',
  
  // Cursor events
  CURSOR_MOVE: 'cursor-move',
  CURSOR_UPDATE: 'cursor-update',
  
  // Highlight events
  HIGHLIGHTS_UPDATE: 'highlights-update',
  REQUEST_HIGHLIGHTS: 'request-highlights',
  
  // Comment events
  COMMENT_ADD: 'comment-add',
  COMMENT_UPDATE: 'comment-update', 
  COMMENT_DELETE: 'comment-delete',
  COMMENT_RESOLVE: 'comment-resolve',
  
  // Presence events
  CONTRIBUTOR_JOIN: 'contributor-join',
  CONTRIBUTOR_LEAVE: 'contributor-leave',
  CONTRIBUTORS_LIST: 'contributors-list',
  
  // Sync events
  REQUEST_SYNC: 'request-sync',
  SYNC_STATE: 'sync-state',
  
  // Error events
  ERROR: 'error'
} as const;

export type WSEventName = typeof WS_EVENTS[keyof typeof WS_EVENTS];

// Operational Transform types
export interface Operation {
  retain?: number;
  insert?: string;
  delete?: number;
  attributes?: Record<string, any>;
}

export interface DocumentState {
  content: string;
  version: number;
  operations: TransformedOperation[];
  lastModified: Date;
}

export interface TransformedOperation {
  operation: Operation[];
  contributorName: string;
  timestamp: Date;
  baseVersion: number;
  operationId: string;
}