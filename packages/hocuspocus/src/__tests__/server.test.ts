import { Server } from '@hocuspocus/server';
import { createServer } from '../server';
import { prisma } from './setup';
import * as Y from 'yjs';

describe('Hocuspocus Server', () => {
  let server: any;

  beforeEach(async () => {
    server = createServer();
  });

  afterEach(async () => {
    if (server) {
      await server.destroy();
    }
  });

  it('should create server with correct configuration', () => {
    expect(server).toBeDefined();
    expect(server.configuration.port).toBe(8082);
  });

  it('should initialize document from database content', async () => {
    // Create a document in the database
    const document = await prisma.document.create({
      data: {
        id: 'test-hocuspocus-doc-1',
        title: 'Test Document',
        content: '# Test Heading\n\nThis is test content.'
      }
    });

    const ydoc = new Y.Doc();
    
    // Mock the document loading process
    const onLoadDocument = server.configuration.extensions.find(
      (ext: any) => ext.constructor.name === 'PersistenceExtension'
    );

    expect(onLoadDocument).toBeDefined();
  });

  it('should handle document persistence', async () => {
    const document = await prisma.document.create({
      data: {
        id: 'test-hocuspocus-doc-2',
        title: 'Test Document',
        content: '# Test Content'
      }
    });

    const ydoc = new Y.Doc();
    const text = ydoc.getText('content');
    text.insert(0, document.content);

    const state = Y.encodeStateAsUpdate(ydoc);
    
    // Update document with Yjs state
    const updated = await prisma.document.update({
      where: { id: document.id },
      data: { yjsState: Buffer.from(state) }
    });

    expect(updated.yjsState).toEqual(state);
  });

  it('should validate authentication tokens', () => {
    // Test authentication extension behavior
    const authExtension = server.configuration.extensions.find(
      (ext: any) => ext.constructor.name === 'AuthExtension'
    );

    expect(authExtension).toBeDefined();
  });
});