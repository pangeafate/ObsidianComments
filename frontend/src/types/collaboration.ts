// Frontend types for collaborative editing

export interface Contributor {
  name: string;
  color: string;
  cursorPosition?: number;
  isOnline: boolean;
  lastSeen?: Date;
}

export interface TextHighlight {
  start: number;
  end: number;
  contributorName: string;
  contributorColor: string;
  intensity: number;
  operationId: string;
}

export interface Comment {
  id: number;
  shareId: string;
  contributorName: string;
  content: string;
  positionStart: number;
  positionEnd: number;
  versionNumber: number;
  parentCommentId?: number;
  createdAt: string;
  updatedAt: string;
  isResolved: boolean;
  isActive: boolean;
  contributorColor?: string;
  replies: Comment[];
}

export interface DocumentState {
  content: string;
  version: number;
  lastModified: string;
}

export interface Operation {
  retain?: number;
  insert?: string;
  delete?: number;
  attributes?: Record<string, any>;
}

export interface CursorPosition {
  contributorName: string;
  position: number;
  selection?: {
    start: number;
    end: number;
  };
}

export interface CollaborationState {
  shareId: string | null;
  contributorName: string;
  contributors: Contributor[];
  highlights: TextHighlight[];
  comments: Comment[];
  documentState: DocumentState | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
}

export interface TextChangeEvent {
  operation: Operation[];
  contributorName: string;
  contributorColor: string;
  operationId: string;
  newVersion: number;
  timestamp: string;
  highlights?: TextHighlight[];
}

export interface SyncStateEvent {
  documentState: DocumentState;
  contributors: Contributor[];
  highlights: TextHighlight[];
}

export interface HighlightsUpdateEvent {
  highlights: TextHighlight[];
  contributorName?: string;
  operationId?: string;
  stats?: {
    totalHighlights: number;
    contributorCount: number;
  };
}

export interface CommentEvent {
  type: 'add' | 'update' | 'delete' | 'resolve';
  comment?: Comment;
  commentId?: number;
  contributorName: string;
}

export interface PresenceEvent {
  type: 'join' | 'leave' | 'update';
  contributorName: string;
  contributorColor: string;
  shareId: string;
  cursorPosition?: number;
}

// Slate.js integration types
export interface SlateNode {
  type: string;
  children: SlateNode[];
  text?: string;
  [key: string]: any;
}

export interface SlateSelection {
  anchor: SlatePoint;
  focus: SlatePoint;
}

export interface SlatePoint {
  path: number[];
  offset: number;
}

export interface HighlightDecoration {
  anchor: SlatePoint;
  focus: SlatePoint;
  contributorName: string;
  contributorColor: string;
  intensity: number;
  highlight: true;
}

export interface CursorDecoration {
  anchor: SlatePoint;
  focus: SlatePoint;
  contributorName: string;
  contributorColor: string;
  cursor: true;
}

export interface CommentDecoration {
  anchor: SlatePoint;
  focus: SlatePoint;
  commentId: number;
  comment: true;
}