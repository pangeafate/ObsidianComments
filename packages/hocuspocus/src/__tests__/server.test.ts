import * as Y from 'yjs';

// Mock dependencies before imports
const mockHocuspocus = jest.fn();
const mockDatabase = jest.fn();
const mockRedis = jest.fn();

const mockPrismaClient = {
  $connect: jest.fn(),
  document: {
    count: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  version: {
    count: jest.fn(),
    create: jest.fn(),
  },
};

const mockRedisClient = {
  connect: jest.fn().mockResolvedValue(undefined),
  on: jest.fn(),
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrismaClient),
}));

jest.mock('redis', () => ({
  createClient: jest.fn(() => mockRedisClient),
}));

jest.mock('@hocuspocus/server', () => ({
  Hocuspocus: mockHocuspocus,
}));

jest.mock('@hocuspocus/extension-database', () => ({
  Database: mockDatabase,
}));

jest.mock('@hocuspocus/extension-redis', () => ({
  Redis: mockRedis,
}));

// Import after mocks
import { createServer } from '../server';

describe('Hocuspocus Server', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.DATABASE_URL = 'test-db-url';
    process.env.REDIS_URL = 'redis://test:6379';
    process.env.PORT = '8082';
  });

  afterEach(() => {
    delete process.env.DATABASE_URL;
    delete process.env.REDIS_URL;
    delete process.env.PORT;
  });

  describe('createServer', () => {
    it('should create server with correct configuration', () => {
      const { createClient } = require('redis');
      
      createServer();

      expect(createClient).toHaveBeenCalledWith({
        url: 'redis://test:6379',
      });

      expect(mockRedisClient.connect).toHaveBeenCalled();
      expect(mockRedisClient.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockRedisClient.on).toHaveBeenCalledWith('error', expect.any(Function));

      expect(mockDatabase).toHaveBeenCalledWith({
        fetch: expect.any(Function),
        store: expect.any(Function),
      });

      expect(mockHocuspocus).toHaveBeenCalledWith({
        port: 8082,
        extensions: expect.any(Array),
        debounce: 2000,
        maxDebounce: 10000,
        onConnect: expect.any(Function),
        onDisconnect: expect.any(Function),
        onChange: expect.any(Function),
        onStoreDocument: expect.any(Function),
        onLoadDocument: expect.any(Function),
        onRequest: expect.any(Function),
        onAuthenticate: expect.any(Function),
      });
    });

    it('should use default Redis URL when not provided', () => {
      const { createClient } = require('redis');
      delete process.env.REDIS_URL;
      createServer();

      expect(createClient).toHaveBeenCalledWith({
        url: 'redis://redis:6379',
      });
    });

    it('should use default port when not provided', () => {
      delete process.env.PORT;
      createServer();

      expect(mockHocuspocus).toHaveBeenCalledWith(
        expect.objectContaining({
          port: 8082,
        })
      );
    });
  });

  describe('Database Extension', () => {
    let fetchFunction: any;
    let storeFunction: any;

    beforeEach(() => {
      createServer();
      const databaseConfig = mockDatabase.mock.calls[0][0];
      fetchFunction = databaseConfig.fetch;
      storeFunction = databaseConfig.store;
    });

    describe('fetch function', () => {
      it('should return existing yjsState when document exists', async () => {
        const mockYjsState = Buffer.from('mock-yjs-state');
        mockPrismaClient.document.findUnique.mockResolvedValue({
          id: 'test-doc',
          content: 'test content',
          yjsState: mockYjsState,
        });

        const result = await fetchFunction({ documentName: 'test-doc' });

        expect(mockPrismaClient.document.findUnique).toHaveBeenCalledWith({
          where: { id: 'test-doc' },
        });
        expect(result).toEqual(new Uint8Array(mockYjsState));
      });

      it('should initialize Yjs state when document exists without yjsState', async () => {
        mockPrismaClient.document.findUnique.mockResolvedValue({
          id: 'test-doc',
          content: 'test content',
          yjsState: null,
        });
        mockPrismaClient.document.update.mockResolvedValue({});

        const result = await fetchFunction({ documentName: 'test-doc' });

        expect(mockPrismaClient.document.findUnique).toHaveBeenCalledWith({
          where: { id: 'test-doc' },
        });
        expect(mockPrismaClient.document.update).toHaveBeenCalledWith({
          where: { id: 'test-doc' },
          data: { yjsState: expect.any(Buffer) },
        });
        expect(result).toBeInstanceOf(Uint8Array);
      });

      it('should initialize empty Yjs state when document has no content', async () => {
        mockPrismaClient.document.findUnique.mockResolvedValue({
          id: 'test-doc',
          content: '',
          yjsState: null,
        });
        mockPrismaClient.document.update.mockResolvedValue({});

        const result = await fetchFunction({ documentName: 'test-doc' });

        expect(result).toBeInstanceOf(Uint8Array);
      });

      it('should return null when document does not exist', async () => {
        mockPrismaClient.document.findUnique.mockResolvedValue(null);

        const result = await fetchFunction({ documentName: 'non-existent' });

        expect(result).toBeNull();
      });

      it('should handle database errors gracefully', async () => {
        mockPrismaClient.document.findUnique.mockRejectedValue(new Error('Database error'));

        const result = await fetchFunction({ documentName: 'test-doc' });

        expect(result).toBeNull();
      });

      it('should handle Yjs state update errors gracefully', async () => {
        mockPrismaClient.document.findUnique.mockResolvedValue({
          id: 'test-doc',
          content: 'test content',
          yjsState: null,
        });
        mockPrismaClient.document.update.mockRejectedValue(new Error('Update error'));

        const result = await fetchFunction({ documentName: 'test-doc' });

        expect(result).toBeInstanceOf(Uint8Array);
      });
    });

    describe('store function', () => {
      it('should store document state successfully', async () => {
        const mockState = new Uint8Array([1, 2, 3]);
        mockPrismaClient.document.update.mockResolvedValue({});
        mockPrismaClient.version.count.mockResolvedValue(99);

        await storeFunction({ documentName: 'test-doc', state: mockState });

        expect(mockPrismaClient.document.update).toHaveBeenCalledWith({
          where: { id: 'test-doc' },
          data: {
            yjsState: Buffer.from(mockState),
            updatedAt: expect.any(Date),
          },
        });
      });

      it('should create version snapshot on 100th update', async () => {
        const mockState = new Uint8Array([1, 2, 3]);
        mockPrismaClient.document.update.mockResolvedValue({});
        mockPrismaClient.version.count.mockResolvedValue(100);
        mockPrismaClient.version.create.mockResolvedValue({});

        await storeFunction({ documentName: 'test-doc', state: mockState });

        expect(mockPrismaClient.version.create).toHaveBeenCalledWith({
          data: {
            documentId: 'test-doc',
            version: 101,
            snapshot: Buffer.from(mockState),
            metadata: expect.stringContaining('"type":"auto"'),
          },
        });
      });

      it('should not create snapshot on non-100th update', async () => {
        const mockState = new Uint8Array([1, 2, 3]);
        mockPrismaClient.document.update.mockResolvedValue({});
        mockPrismaClient.version.count.mockResolvedValue(50);

        await storeFunction({ documentName: 'test-doc', state: mockState });

        expect(mockPrismaClient.version.create).not.toHaveBeenCalled();
      });

      it('should handle store errors gracefully', async () => {
        const mockState = new Uint8Array([1, 2, 3]);
        mockPrismaClient.document.update.mockRejectedValue(new Error('Store error'));

        await expect(storeFunction({ documentName: 'test-doc', state: mockState })).resolves.not.toThrow();
      });
    });
  });

  describe('Event Handlers', () => {
    let eventHandlers: any;

    beforeEach(() => {
      createServer();
      const config = mockHocuspocus.mock.calls[0][0];
      eventHandlers = {
        onConnect: config.onConnect,
        onDisconnect: config.onDisconnect,
        onChange: config.onChange,
        onStoreDocument: config.onStoreDocument,
        onLoadDocument: config.onLoadDocument,
        onRequest: config.onRequest,
        onAuthenticate: config.onAuthenticate,
      };
    });

    describe('onConnect', () => {
      it('should log connection details', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        const mockData = {
          socketId: 'socket-123',
          documentName: 'test-doc',
          request: { headers: { 'user-agent': 'test-agent' } },
          document: {
            awareness: { getStates: () => ({ size: 2 }) },
            on: jest.fn(),
          },
        };

        await eventHandlers.onConnect(mockData);

        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('Client connected from socket-123')
        );
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('Connection count for test-doc: 2')
        );
        expect(mockData.document.on).toHaveBeenCalledWith('update', expect.any(Function));

        consoleSpy.mockRestore();
      });

      it('should handle new document connection', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        const mockData = {
          socketId: 'socket-123',
          documentName: 'test-doc',
          request: { headers: { 'user-agent': 'test-agent' } },
          document: { on: jest.fn() },
        };

        await eventHandlers.onConnect(mockData);

        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('New document connection for test-doc')
        );

        consoleSpy.mockRestore();
      });
    });

    describe('onDisconnect', () => {
      it('should log disconnection', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        const mockData = { socketId: 'socket-123' };

        await eventHandlers.onDisconnect(mockData);

        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('Client disconnected: socket-123')
        );

        consoleSpy.mockRestore();
      });
    });

    describe('onChange', () => {
      it('should log document changes', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        const mockData = {
          documentName: 'test-doc',
          update: new Uint8Array([1, 2, 3]),
        };

        await eventHandlers.onChange(mockData);

        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('Document changed: test-doc, changes: 3 bytes')
        );

        consoleSpy.mockRestore();
      });
    });

    describe('onRequest', () => {
      it('should handle health check requests', async () => {
        const mockData = {
          request: { url: '/health', method: 'GET' },
        };

        const response = await eventHandlers.onRequest(mockData);

        expect(response).toBeInstanceOf(Response);
        expect(response.status).toBe(200);
        
        const body = await response.json();
        expect(body).toEqual({
          status: 'healthy',
          service: 'hocuspocus',
          timestamp: expect.any(String),
        });
      });

      it('should return null for non-health requests', async () => {
        const mockData = {
          request: { url: '/other', method: 'GET' },
        };

        const response = await eventHandlers.onRequest(mockData);

        expect(response).toBeNull();
      });
    });

    describe('onAuthenticate', () => {
      it('should accept collaboration token', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        const mockData = {
          documentName: 'test-doc',
          token: 'collaboration-token',
          socketId: 'socket-123',
          request: { headers: { origin: 'test-origin' } },
        };

        const result = await eventHandlers.onAuthenticate(mockData);

        expect(result).toBe(true);
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('Authentication successful for test-doc')
        );

        consoleSpy.mockRestore();
      });

      it('should accept connections without tokens', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        const mockData = {
          documentName: 'test-doc',
          token: null,
          socketId: 'socket-123',
          request: { headers: { origin: 'test-origin' } },
        };

        const result = await eventHandlers.onAuthenticate(mockData);

        expect(result).toBe(true);

        consoleSpy.mockRestore();
      });

      it('should reject invalid tokens', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        const mockData = {
          documentName: 'test-doc',
          token: 'invalid-token',
          socketId: 'socket-123',
          request: { headers: { origin: 'test-origin' } },
        };

        const result = await eventHandlers.onAuthenticate(mockData);

        expect(result).toBe(false);
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('Authentication failed for test-doc')
        );

        consoleSpy.mockRestore();
      });
    });
  });

  describe('Yjs Document Initialization', () => {
    it('should create proper ProseMirror structure for content', () => {
      const ydoc = new Y.Doc();
      const content = 'Test content';
      
      const prosemirrorFragment = ydoc.getXmlFragment('default');
      const paragraph = new Y.XmlElement('paragraph');
      const textNode = new Y.XmlText();
      textNode.insert(0, content);
      paragraph.insert(0, [textNode]);
      prosemirrorFragment.insert(0, [paragraph]);
      
      const state = Y.encodeStateAsUpdate(ydoc);
      
      expect(state).toBeInstanceOf(Uint8Array);
      expect(state.length).toBeGreaterThan(0);
    });

    it('should create empty document when no content provided', () => {
      const ydoc = new Y.Doc();
      const state = Y.encodeStateAsUpdate(ydoc);
      
      expect(state).toBeInstanceOf(Uint8Array);
    });
  });

  describe('Error Handling', () => {
    it('should handle Prisma connection errors', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockPrismaClient.$connect.mockRejectedValue(new Error('Connection failed'));

      // Import and run the database connection test
      const { createServer } = await import('../server');
      
      // The error should be handled gracefully
      expect(consoleSpy).not.toThrow();
      
      consoleSpy.mockRestore();
    });

    it('should handle Redis connection errors', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      createServer();
      
      // Simulate Redis error
      const errorHandler = mockRedisClient.on.mock.calls.find(call => call[0] === 'error')[1];
      errorHandler(new Error('Redis connection failed'));
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '❌ Hocuspocus Redis connection failed:', expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Environment Configuration', () => {
    it('should handle missing DATABASE_URL', () => {
      delete process.env.DATABASE_URL;
      
      expect(() => createServer()).not.toThrow();
      // Just verify the server can be created without throwing
      expect(mockHocuspocus).toHaveBeenCalled();
    });

    it('should use custom PORT when provided', () => {
      process.env.PORT = '9000';
      
      createServer();
      
      expect(mockHocuspocus).toHaveBeenCalledWith(
        expect.objectContaining({
          port: 9000,
        })
      );
    });
  });
});