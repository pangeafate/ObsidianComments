import { Extension } from '@hocuspocus/server';
import { PrismaClient } from '@prisma/client';
import * as Y from 'yjs';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

// Test database connection on startup
async function testDatabaseConnection() {
  try {
    await prisma.$connect();
    console.log('✅ Hocuspocus connected to database successfully');
    
    // Test basic query
    const documentCount = await prisma.document.count();
    console.log(`📊 Found ${documentCount} documents in database`);
  } catch (error) {
    console.error('❌ Hocuspocus database connection failed:', error);
    throw error;
  }
}

// Initialize database connection
testDatabaseConnection().catch(console.error);

export class PersistenceExtension implements Extension {
  async onLoadDocument(data: any) {
    const { documentName } = data;
    
    try {
      const document = await prisma.document.findUnique({
        where: { id: documentName }
      });

      if (document) {
        if (document.yjsState) {
          // Load existing Yjs state
          const update = new Uint8Array(document.yjsState);
          Y.applyUpdate(data.document, update);
        } else {
          // Initialize with Markdown content
          const text = data.document.getText('content');
          if (text.length === 0) {
            text.insert(0, document.content);
          }
        }
      }
    } catch (error) {
      console.error(`❌ Error loading document ${documentName}:`, error);
      console.error('Database URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
    }

    return data;
  }

  async onStoreDocument(data: any) {
    const { documentName, document } = data;
    
    try {
      const state = Y.encodeStateAsUpdate(document);
      
      await prisma.document.update({
        where: { id: documentName },
        data: { 
          yjsState: Buffer.from(state),
          updatedAt: new Date()
        }
      });

      // Create version snapshot every 100 updates
      const updateCount = await this.getUpdateCount(documentName);
      if (updateCount % 100 === 0) {
        await this.createSnapshot(documentName, document, updateCount);
      }
    } catch (error) {
      console.error(`❌ Error storing document ${documentName}:`, error);
      console.error('Database URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
    }

    return data;
  }

  private async getUpdateCount(documentId: string): Promise<number> {
    const versions = await prisma.version.count({
      where: { documentId }
    });
    return versions;
  }

  private async createSnapshot(documentId: string, document: Y.Doc, version: number) {
    const snapshot = Y.encodeStateAsUpdate(document);
    
    await prisma.version.create({
      data: {
        documentId,
        version,
        snapshot: Buffer.from(snapshot),
        metadata: JSON.stringify({
          type: 'auto',
          timestamp: new Date().toISOString()
        })
      }
    });
  }
}