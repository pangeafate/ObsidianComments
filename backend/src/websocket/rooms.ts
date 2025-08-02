// Room management for share-based collaboration

import { ContributorSession, DocumentState, TransformedOperation } from './types';
import { HighlightManager, HighlightRange } from './highlights';

export class ShareRoom {
  public shareId: string;
  public contributors: Map<string, ContributorSession> = new Map();
  public documentState: DocumentState;
  public highlightManager: HighlightManager;
  private operationQueue: TransformedOperation[] = [];
  
  constructor(shareId: string, initialContent: string, version: number = 1) {
    this.shareId = shareId;
    this.documentState = {
      content: initialContent,
      version,
      operations: [],
      lastModified: new Date()
    };
    this.highlightManager = new HighlightManager();
  }

  // Add contributor to room
  addContributor(session: ContributorSession): void {
    this.contributors.set(session.socketId, session);
    console.log(`Contributor ${session.contributorName} joined share ${this.shareId}`);
  }

  // Remove contributor from room
  removeContributor(socketId: string): ContributorSession | null {
    const session = this.contributors.get(socketId);
    if (session) {
      this.contributors.delete(socketId);
      console.log(`Contributor ${session.contributorName} left share ${this.shareId}`);
      return session;
    }
    return null;
  }

  // Get contributor by socket ID
  getContributor(socketId: string): ContributorSession | null {
    return this.contributors.get(socketId) || null;
  }

  // Get all contributors except the specified socket
  getOtherContributors(excludeSocketId: string): ContributorSession[] {
    return Array.from(this.contributors.values())
      .filter(session => session.socketId !== excludeSocketId);
  }

  // Update contributor cursor position
  updateContributorCursor(socketId: string, position: number): void {
    const session = this.contributors.get(socketId);
    if (session) {
      session.cursorPosition = position;
      session.lastActive = new Date();
    }
  }

  // Add operation to queue for processing
  queueOperation(operation: TransformedOperation): void {
    this.operationQueue.push(operation);
  }

  // Apply operations to document state
  applyOperation(operation: TransformedOperation): boolean {
    try {
      // Simple implementation - replace with proper OT later
      let position = 0;
      let content = this.documentState.content;
      
      // Get contributor session for highlighting
      const contributor = Array.from(this.contributors.values())
        .find(session => session.contributorName === operation.contributorName);
      
      for (const op of operation.operation) {
        if (op.retain && typeof op.retain === 'number') {
          // Retain - move position forward
          this.highlightManager.handleRetainOperation(position, op.retain);
          position += op.retain;
        } else if (op.insert && typeof op.insert === 'string') {
          // Insert operation
          content = content.slice(0, position) + op.insert + content.slice(position);
          
          // Add highlight for inserted text
          if (contributor) {
            this.highlightManager.addInsertHighlight(
              position,
              op.insert.length,
              operation.contributorName,
              contributor.contributorColor,
              operation.operationId
            );
          }
          
          position += op.insert.length;
        } else if (op.delete && typeof op.delete === 'number') {
          // Delete operation  
          this.highlightManager.handleDeleteOperation(position, op.delete, operation.operationId);
          content = content.slice(0, position) + content.slice(position + op.delete);
        }
      }
      
      this.documentState.content = content;
      this.documentState.version++;
      this.documentState.operations.push(operation);
      this.documentState.lastModified = new Date();
      
      // Keep only last 100 operations for memory management
      if (this.documentState.operations.length > 100) {
        this.documentState.operations = this.documentState.operations.slice(-100);
      }
      
      // Merge overlapping highlights periodically
      if (this.documentState.operations.length % 10 === 0) {
        this.highlightManager.mergeOverlappingHighlights();
      }
      
      return true;
    } catch (error) {
      console.error('Error applying operation:', error);
      return false;
    }
  }

  // Helper to get insert position from operation
  private getInsertPosition(operations: any[]): number {
    let position = 0;
    for (const op of operations) {
      if (op.retain) {
        position += op.retain;
      } else if (op.insert) {
        break;
      }
    }
    return position;
  }

  // Helper to get delete position from operation  
  private getDeletePosition(operations: any[]): number {
    let position = 0;
    for (const op of operations) {
      if (op.retain) {
        position += op.retain;
      } else if (op.delete) {
        break;
      }
    }
    return position;
  }

  // Get current document state for sync
  getDocumentState(): DocumentState {
    return { ...this.documentState };
  }

  // Check if room is empty
  isEmpty(): boolean {
    return this.contributors.size === 0;
  }

  // Get contributor count
  getContributorCount(): number {
    return this.contributors.size;
  }

  // Get all contributor names and colors
  getContributorSummary(): Array<{name: string, color: string, cursorPosition?: number}> {
    return Array.from(this.contributors.values()).map(session => ({
      name: session.contributorName,
      color: session.contributorColor,
      cursorPosition: session.cursorPosition
    }));
  }

  // Get current text highlights
  getCurrentHighlights(): HighlightRange[] {
    return this.highlightManager.getCurrentHighlights();
  }

  // Get highlights for a specific contributor
  getContributorHighlights(contributorName: string): HighlightRange[] {
    return this.highlightManager.getContributorHighlights(contributorName);
  }

  // Get highlights in a specific range
  getHighlightsInRange(start: number, end: number): HighlightRange[] {
    return this.highlightManager.getHighlightsInRange(start, end);
  }

  // Get highlight statistics
  getHighlightStats() {
    return this.highlightManager.getStats();
  }
}

// Global room manager
export class RoomManager {
  private rooms: Map<string, ShareRoom> = new Map();

  // Get or create room for share
  getRoom(shareId: string, initialContent?: string, version?: number): ShareRoom {
    let room = this.rooms.get(shareId);
    if (!room && initialContent !== undefined) {
      room = new ShareRoom(shareId, initialContent, version);
      this.rooms.set(shareId, room);
      console.log(`Created new room for share ${shareId}`);
    }
    return room!;
  }

  // Remove empty rooms
  cleanupEmptyRooms(): void {
    for (const [shareId, room] of this.rooms.entries()) {
      if (room.isEmpty()) {
        this.rooms.delete(shareId);
        console.log(`Cleaned up empty room for share ${shareId}`);
      }
    }
  }

  // Get room count for monitoring
  getRoomCount(): number {
    return this.rooms.size;
  }

  // Get total contributor count across all rooms
  getTotalContributorCount(): number {
    return Array.from(this.rooms.values())
      .reduce((total, room) => total + room.getContributorCount(), 0);
  }
}

// Singleton room manager instance
export const roomManager = new RoomManager();