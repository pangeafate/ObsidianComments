import { ShareRoom, RoomManager } from '../../src/websocket/rooms';
import { ContributorSession, TransformedOperation } from '../../src/websocket/types';

describe('ShareRoom', () => {
  let room: ShareRoom;
  const shareId = 'test-share-123';
  const initialContent = '# Test Document\n\nInitial content';

  beforeEach(() => {
    room = new ShareRoom(shareId, initialContent, 1);
  });

  describe('Contributor Management', () => {
    test('should add contributor to room', () => {
      const session: ContributorSession = {
        contributorName: 'Alice',
        contributorColor: '#FF0000',
        socketId: 'socket-123',
        shareId,
        lastActive: new Date()
      };

      room.addContributor(session);
      
      expect(room.getContributor('socket-123')).toEqual(session);
      expect(room.getContributorCount()).toBe(1);
      expect(room.isEmpty()).toBe(false);
    });

    test('should remove contributor from room', () => {
      const session: ContributorSession = {
        contributorName: 'Bob',
        contributorColor: '#00FF00',
        socketId: 'socket-456',
        shareId,
        lastActive: new Date()
      };

      room.addContributor(session);
      const removed = room.removeContributor('socket-456');
      
      expect(removed).toEqual(session);
      expect(room.getContributor('socket-456')).toBeNull();
      expect(room.getContributorCount()).toBe(0);
      expect(room.isEmpty()).toBe(true);
    });

    test('should get other contributors excluding specified socket', () => {
      const session1: ContributorSession = {
        contributorName: 'Alice',
        contributorColor: '#FF0000',
        socketId: 'socket-1',
        shareId,
        lastActive: new Date()
      };

      const session2: ContributorSession = {
        contributorName: 'Bob',
        contributorColor: '#00FF00',
        socketId: 'socket-2',
        shareId,
        lastActive: new Date()
      };

      room.addContributor(session1);
      room.addContributor(session2);

      const others = room.getOtherContributors('socket-1');
      expect(others).toHaveLength(1);
      expect(others[0]).toEqual(session2);
    });

    test('should update contributor cursor position', () => {
      const session: ContributorSession = {
        contributorName: 'Charlie',
        contributorColor: '#0000FF',
        socketId: 'socket-789',
        shareId,
        lastActive: new Date()
      };

      room.addContributor(session);
      room.updateContributorCursor('socket-789', 42);

      const updated = room.getContributor('socket-789');
      expect(updated?.cursorPosition).toBe(42);
    });
  });

  describe('Document Operations', () => {
    test('should apply insert operation', () => {
      const operation: TransformedOperation = {
        operation: [{ retain: 15 }, { insert: ' INSERTED' }],
        contributorName: 'Alice',
        timestamp: new Date(),
        baseVersion: 1,
        operationId: 'op-123'
      };

      const success = room.applyOperation(operation);
      
      expect(success).toBe(true);
      expect(room.documentState.version).toBe(2);
      expect(room.documentState.content).toContain('INSERTED');
      expect(room.documentState.operations).toHaveLength(1);
    });

    test('should apply delete operation', () => {
      const operation: TransformedOperation = {
        operation: [{ retain: 0 }, { delete: 2 }],
        contributorName: 'Bob',
        timestamp: new Date(),
        baseVersion: 1,
        operationId: 'op-456'
      };

      const success = room.applyOperation(operation);
      
      expect(success).toBe(true);
      expect(room.documentState.version).toBe(2);
      expect(room.documentState.content.startsWith('# ')).toBe(false);
      expect(room.documentState.operations).toHaveLength(1);
    });

    test('should get document state', () => {
      const state = room.getDocumentState();
      
      expect(state.content).toBe(initialContent);
      expect(state.version).toBe(1);
      expect(state.operations).toHaveLength(0);
      expect(state.lastModified).toBeInstanceOf(Date);
    });

    test('should limit operation history', () => {
      // Add more than 100 operations
      for (let i = 0; i < 105; i++) {
        const operation: TransformedOperation = {
          operation: [{ retain: 0 }, { insert: 'x' }],
          contributorName: 'TestUser',
          timestamp: new Date(),
          baseVersion: i + 1,
          operationId: `op-${i}`
        };
        room.applyOperation(operation);
      }

      expect(room.documentState.operations).toHaveLength(100);
      expect(room.documentState.version).toBe(106);
    });
  });

  describe('Contributor Summary', () => {
    test('should get contributor summary', () => {
      const session1: ContributorSession = {
        contributorName: 'Alice',
        contributorColor: '#FF0000',
        socketId: 'socket-1',
        shareId,
        cursorPosition: 10,
        lastActive: new Date()
      };

      const session2: ContributorSession = {
        contributorName: 'Bob',
        contributorColor: '#00FF00',
        socketId: 'socket-2',
        shareId,
        cursorPosition: 20,
        lastActive: new Date()
      };

      room.addContributor(session1);
      room.addContributor(session2);

      const summary = room.getContributorSummary();
      
      expect(summary).toHaveLength(2);
      expect(summary).toContainEqual({
        name: 'Alice',
        color: '#FF0000',
        cursorPosition: 10
      });
      expect(summary).toContainEqual({
        name: 'Bob',
        color: '#00FF00',
        cursorPosition: 20
      });
    });
  });
});

describe('RoomManager', () => {
  let roomManager: RoomManager;

  beforeEach(() => {
    roomManager = new RoomManager();
  });

  test('should create and get room', () => {
    const shareId = 'test-share-456';
    const content = 'Test content';
    const version = 1;

    const room = roomManager.getRoom(shareId, content, version);
    
    expect(room).toBeInstanceOf(ShareRoom);
    expect(room.shareId).toBe(shareId);
    expect(room.documentState.content).toBe(content);
    expect(room.documentState.version).toBe(version);
    expect(roomManager.getRoomCount()).toBe(1);
  });

  test('should return existing room', () => {
    const shareId = 'test-share-789';
    const room1 = roomManager.getRoom(shareId, 'Content 1', 1);
    const room2 = roomManager.getRoom(shareId);

    expect(room1).toBe(room2);
    expect(roomManager.getRoomCount()).toBe(1);
  });

  test('should cleanup empty rooms', () => {
    const shareId1 = 'test-share-1';
    const shareId2 = 'test-share-2';
    
    const room1 = roomManager.getRoom(shareId1, 'Content 1', 1);
    const room2 = roomManager.getRoom(shareId2, 'Content 2', 1);

    // Add contributor to room1 only
    const session: ContributorSession = {
      contributorName: 'Alice',
      contributorColor: '#FF0000',
      socketId: 'socket-123',
      shareId: shareId1,
      lastActive: new Date()
    };
    room1.addContributor(session);

    expect(roomManager.getRoomCount()).toBe(2);
    
    roomManager.cleanupEmptyRooms();
    
    expect(roomManager.getRoomCount()).toBe(1);
    expect(roomManager.getRoom(shareId1)).toBe(room1);
  });

  test('should get total contributor count', () => {
    const room1 = roomManager.getRoom('share-1', 'Content 1', 1);
    const room2 = roomManager.getRoom('share-2', 'Content 2', 1);

    const session1: ContributorSession = {
      contributorName: 'Alice',
      contributorColor: '#FF0000',
      socketId: 'socket-1',
      shareId: 'share-1',
      lastActive: new Date()
    };

    const session2: ContributorSession = {
      contributorName: 'Bob',
      contributorColor: '#00FF00',
      socketId: 'socket-2',
      shareId: 'share-2',
      lastActive: new Date()
    };

    const session3: ContributorSession = {
      contributorName: 'Charlie',
      contributorColor: '#0000FF',
      socketId: 'socket-3',
      shareId: 'share-2',
      lastActive: new Date()
    };

    room1.addContributor(session1);
    room2.addContributor(session2);
    room2.addContributor(session3);

    expect(roomManager.getTotalContributorCount()).toBe(3);
  });
});