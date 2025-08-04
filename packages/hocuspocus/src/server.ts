import { Hocuspocus } from '@hocuspocus/server';
import { Database } from '@hocuspocus/extension-database';
import { Redis } from '@hocuspocus/extension-redis';
import { PrismaClient } from '@prisma/client';
import * as Y from 'yjs';
import { createClient } from 'redis';

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

export function createServer() {
  // Configure Redis client for Hocuspocus extension
  const redisUrl = process.env.REDIS_URL || 'redis://redis:6379';
  const redisClient = createClient({
    url: redisUrl
  });
  
  // Test Redis connection
  redisClient.on('connect', () => {
    console.log('✅ Hocuspocus connected to Redis successfully');
  });
  
  redisClient.on('error', (error) => {
    console.error('❌ Hocuspocus Redis connection failed:', error);
  });

  // Connect to Redis
  redisClient.connect().catch(console.error);

  // Configure Redis extension with client instance
  const redisExtension = new Redis({
    redis: redisClient,
  });

  // Configure Database extension for PostgreSQL persistence
  const databaseExtension = new Database({
    // Return a Promise to retrieve data from PostgreSQL
    fetch: async ({ documentName }) => {
      console.log(`📖 Loading document: ${documentName}`);
      try {
        const document = await prisma.document.findUnique({
          where: { id: documentName }
        });

        if (document) {
          if (document.yjsState) {
            console.log(`✅ Found existing Yjs state for ${documentName}`);
            return new Uint8Array(document.yjsState);
          } else {
            console.log(`📝 Initializing Yjs document with content for ${documentName}`);
            // Create new Yjs doc with initial content
            const ydoc = new Y.Doc();
            // Use XmlFragment to match frontend TipTap usage
            const xmlFragment = ydoc.getXmlFragment('content');
            // For now, just initialize empty - TipTap will handle content
            return Y.encodeStateAsUpdate(ydoc);
          }
        }
        
        console.log(`❓ Document ${documentName} not found in database`);
        return null;
      } catch (error) {
        console.error(`❌ Error loading document ${documentName}:`, error);
        return null;
      }
    },

    // Return a Promise to store data to PostgreSQL
    store: async ({ documentName, state }) => {
      console.log(`💾 Storing document: ${documentName}, size: ${state?.length || 0} bytes`);
      try {
        await prisma.document.update({
          where: { id: documentName },
          data: { 
            yjsState: Buffer.from(state),
            updatedAt: new Date()
          }
        });
        console.log(`✅ Successfully stored document ${documentName}`);

        // Create version snapshot every 100 updates
        const updateCount = await prisma.version.count({
          where: { documentId: documentName }
        });
        if (updateCount % 100 === 0) {
          await prisma.version.create({
            data: {
              documentId: documentName,
              version: updateCount + 1,
              snapshot: Buffer.from(state),
              metadata: JSON.stringify({
                type: 'auto',
                timestamp: new Date().toISOString()
              })
            }
          });
          console.log(`📸 Created snapshot for document ${documentName} (version ${updateCount + 1})`);
        }
      } catch (error) {
        console.error(`❌ Error storing document ${documentName}:`, error);
        console.error('Database URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
      }
    },
  });
  
  return new Hocuspocus({
    port: parseInt(process.env.PORT || '8082'),
    
    // Use official Redis + Database extensions for proper persistence
    extensions: [redisExtension, databaseExtension],
    
    async onConnect(data: any) {
      console.log(`🔌 Client connected from ${data.socketId}, document: ${data.documentName}`);
      console.log(`🌐 User agent: ${data.request?.headers['user-agent']?.substring(0, 100)}`);
      // Check if document exists before accessing awareness
      if (data.document && data.document.awareness) {
        console.log(`📊 Connection count for ${data.documentName}: ${data.document.awareness.getStates().size}`);
      } else {
        console.log(`📊 New document connection for ${data.documentName}`);
      }
    },

    async onDisconnect(data: any) {
      console.log(`Client disconnected: ${data.socketId}`);
    },

    async onRequest(data: any) {
      // Allow all origins for now - can be restricted later
      const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Authorization',
        'Access-Control-Allow-Credentials': 'true'
      };
      
      if (data.request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers });
      }
      
      return null; // Let Hocuspocus handle the request
    },

    async onAuthenticate(data: any) {
      console.log(`🔐 Authentication request for document: ${data.documentName}`);
      console.log(`🎫 Token received: ${data.token ? 'Yes (' + data.token + ')' : 'No'}`);
      console.log(`👤 Connection context:`, { 
        socketId: data.socketId, 
        origin: data.request?.headers?.origin 
      });
      
      // Accept the collaboration token or allow connections without tokens for now
      if (data.token === 'collaboration-token' || !data.token) {
        console.log(`✅ Authentication successful for ${data.documentName}`);
        return true;
      }
      
      console.log(`❌ Authentication failed for ${data.documentName} - invalid token`);
      return false;
    },
  });
}