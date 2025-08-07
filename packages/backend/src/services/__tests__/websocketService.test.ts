import { createServer, Server as HttpServer } from 'http';
import { Socket as ClientSocket, io as clientIo } from 'socket.io-client';
import { websocketService } from '../websocketService';
import express from 'express';

describe('WebSocketService', () => {
  let httpServer: HttpServer;
  let clientSocket: ClientSocket;
  let serverPort: number;

  beforeAll((done) => {
    // Create Express app and HTTP server
    const app = express();
    httpServer = createServer(app);
    
    // Initialize WebSocket service
    websocketService.init(httpServer);
    
    // Start server on random port
    httpServer.listen(() => {
      const address = httpServer.address();
      if (address && typeof address === 'object') {
        serverPort = address.port;
        done();
      }
    });
  });

  afterAll((done) => {
    httpServer.close(done);
  });

  beforeEach((done) => {
    // Create client socket before each test
    clientSocket = clientIo(`http://localhost:${serverPort}`);
    clientSocket.on('connect', done);
  });

  afterEach(() => {
    if (clientSocket.connected) {
      clientSocket.disconnect();
    }
  });

  describe('Connection handling', () => {
    it('should accept client connections', (done) => {
      expect(clientSocket.connected).toBe(true);
      done();
    });

    it('should handle client disconnections', (done) => {
      clientSocket.on('disconnect', () => {
        done();
      });
      clientSocket.disconnect();
    });
  });

  describe('Note room management', () => {
    it('should allow clients to join note rooms', (done) => {
      const shareId = 'test-note-123';
      
      clientSocket.on('joined_note', (data) => {
        expect(data.shareId).toBe(shareId);
        expect(data).toHaveProperty('timestamp');
        done();
      });

      clientSocket.emit('join_note', shareId);
    });

    it('should notify other clients when someone joins', (done) => {
      const shareId = 'collaboration-test';
      
      // Create a second client
      const secondClient = clientIo(`http://localhost:${serverPort}`);
      
      secondClient.on('connect', () => {
        // First client joins the room
        clientSocket.emit('join_note', shareId);
        
        // Second client should receive notification when joining
        secondClient.on('collaborator_joined', (data) => {
          expect(data).toHaveProperty('clientId');
          expect(data).toHaveProperty('timestamp');
          secondClient.disconnect();
          done();
        });
        
        // Delay second client joining to ensure first is already in room
        setTimeout(() => {
          secondClient.emit('join_note', shareId);
        }, 10);
      });
    });

    it('should handle leaving note rooms', (done) => {
      const shareId = 'leave-test-note';
      
      clientSocket.on('joined_note', () => {
        // After joining, immediately leave
        clientSocket.emit('leave_note', shareId);
        
        // Verify we can still communicate (socket still connected)
        setTimeout(() => {
          expect(clientSocket.connected).toBe(true);
          done();
        }, 10);
      });

      clientSocket.emit('join_note', shareId);
    });

    it('should reject join requests without shareId', (done) => {
      clientSocket.on('error', (errorMessage) => {
        expect(errorMessage).toBe('Share ID is required');
        done();
      });

      clientSocket.emit('join_note', '');
    });
  });

  describe('Note deletion notifications', () => {
    it('should send deletion notifications to clients in the note room', (done) => {
      const shareId = 'delete-notification-test';
      
      clientSocket.on('joined_note', () => {
        // Listen for deletion notification
        clientSocket.on('note_deleted', (data) => {
          expect(data.shareId).toBe(shareId);
          expect(data.message).toBe('This note has been deleted');
          expect(data).toHaveProperty('timestamp');
          done();
        });
        
        // Simulate note deletion from server side
        setTimeout(() => {
          websocketService.notifyNoteDeleted(shareId);
        }, 10);
      });

      clientSocket.emit('join_note', shareId);
    });

    it('should not send notifications to clients not in the room', (done) => {
      const shareId = 'room-isolation-test';
      const otherShareId = 'different-room';
      
      let deletionNotificationReceived = false;
      
      clientSocket.on('joined_note', () => {
        // Listen for deletion notifications
        clientSocket.on('note_deleted', () => {
          deletionNotificationReceived = true;
        });
        
        // Delete a different note
        setTimeout(() => {
          websocketService.notifyNoteDeleted(otherShareId);
          
          // Wait and verify no notification was received
          setTimeout(() => {
            expect(deletionNotificationReceived).toBe(false);
            done();
          }, 50);
        }, 10);
      });

      // Join one room, but delete notification is for a different room
      clientSocket.emit('join_note', shareId);
    });
  });

  describe('Service methods', () => {
    it('should track connected clients correctly', () => {
      // Initially no clients
      expect(websocketService.getConnectedClients('any-note')).toBe(0);
    });

    it('should return WebSocket server instance', () => {
      const io = websocketService.getIO();
      expect(io).toBeTruthy();
      expect(typeof io.emit).toBe('function');
    });

    it('should handle note updates (future functionality)', (done) => {
      const shareId = 'update-test-note';
      const updateData = { title: 'Updated Title', content: 'Updated content' };
      
      clientSocket.on('joined_note', () => {
        clientSocket.on('note_updated', (data) => {
          expect(data.shareId).toBe(shareId);
          expect(data.updateData).toEqual(updateData);
          expect(data).toHaveProperty('timestamp');
          done();
        });
        
        // Test the update notification method
        setTimeout(() => {
          websocketService.notifyNoteUpdated(shareId, updateData);
        }, 10);
      });

      clientSocket.emit('join_note', shareId);
    });
  });

  describe('Error handling', () => {
    it('should handle multiple rapid join/leave operations', (done) => {
      const shareId = 'rapid-operations-test';
      let operationsCompleted = 0;
      const totalOperations = 6; // 3 joins + 3 leaves
      
      const checkCompletion = () => {
        operationsCompleted++;
        if (operationsCompleted === totalOperations) {
          expect(clientSocket.connected).toBe(true);
          done();
        }
      };
      
      clientSocket.on('joined_note', checkCompletion);
      
      // Perform rapid join/leave operations
      for (let i = 0; i < 3; i++) {
        setTimeout(() => {
          clientSocket.emit('join_note', shareId);
        }, i * 5);
        
        setTimeout(() => {
          clientSocket.emit('leave_note', shareId);
          checkCompletion(); // Count leave operations
        }, i * 5 + 2);
      }
    });

    it('should gracefully handle notifications when no clients are connected', () => {
      // This should not throw an error
      expect(() => {
        websocketService.notifyNoteDeleted('no-clients-note');
      }).not.toThrow();
      
      expect(() => {
        websocketService.notifyNoteUpdated('no-clients-note', { data: 'test' });
      }).not.toThrow();
    });
  });

  describe('Service initialization', () => {
    it('should handle multiple initialization attempts gracefully', () => {
      // Should not throw even if called multiple times
      expect(() => {
        websocketService.init(httpServer);
      }).not.toThrow();
    });

    it('should warn when service not initialized for notifications', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      // Create a fresh instance to test uninitialized state
      const { WebSocketService } = require('../websocketService');
      const uninitializedService = new WebSocketService();
      
      uninitializedService.notifyNoteDeleted('test');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('WebSocket service not initialized')
      );
      
      consoleSpy.mockRestore();
    });
  });
});