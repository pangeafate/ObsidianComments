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

  // TEMPORARY: Use only Database extension to debug persistence
  console.log('🔧 Configuring Database extension (Redis disabled for debugging)');
  
  // Configure Database extension for PostgreSQL persistence
  const databaseExtension = new Database({
    // Return a Promise to retrieve data from PostgreSQL
    fetch: async ({ documentName }) => {
      console.log(`📖 [DATABASE] fetch() called for document: ${documentName}`);
      try {
        const document = await prisma.document.findUnique({
          where: { id: documentName }
        });

        if (document) {
          if (document.yjsState) {
            console.log(`✅ [DATABASE] Found existing Yjs state for ${documentName}`);
            return new Uint8Array(document.yjsState);
          } else {
            console.log(`📝 [DATABASE] No Yjs state found for ${documentName}, returning empty state`);
            console.log(`ℹ️ [DATABASE] Frontend will handle content initialization to avoid duplication`);
            // Return empty state - let the frontend initialize the content
            // This prevents double-initialization that causes content duplication
            return null;
          }
        }
        
        console.log(`❓ [DATABASE] Document ${documentName} not found in database`);
        return null;
      } catch (error) {
        console.error(`❌ [DATABASE] Error loading document ${documentName}:`, error);
        return null;
      }
    },

    // Return a Promise to store data to PostgreSQL
    store: async ({ documentName, state }) => {
      console.log(`💾 [DATABASE] store() called for document: ${documentName}, size: ${state?.length || 0} bytes`);
      try {
        await prisma.document.update({
          where: { id: documentName },
          data: { 
            yjsState: Buffer.from(state),
            updatedAt: new Date()
          }
        });
        console.log(`✅ [DATABASE] Successfully stored document ${documentName}`);

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
          console.log(`📸 [DATABASE] Created snapshot for document ${documentName} (version ${updateCount + 1})`);
        }
      } catch (error) {
        console.error(`❌ [DATABASE] Error storing document ${documentName}:`, error);
        console.error('Database URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
      }
    },
  });
  
  return new Hocuspocus({
    port: parseInt(process.env.PORT || '8082'),
    
    // TEMPORARY: Use only Database extension for debugging
    extensions: [databaseExtension],
    
    // Enable debug logging
    debounce: 2000, // Save to database every 2 seconds instead of default 10
    maxDebounce: 10000, // Maximum wait time
    
    async onConnect(data: any) {
      console.log(`🔌 Client connected from ${data.socketId}, document: ${data.documentName}`);
      console.log(`🌐 User agent: ${data.request?.headers['user-agent']?.substring(0, 100)}`);
      // Check if document exists before accessing awareness
      if (data.document && data.document.awareness) {
        console.log(`📊 Connection count for ${data.documentName}: ${data.document.awareness.getStates().size}`);
      } else {
        console.log(`📊 New document connection for ${data.documentName}`);
      }
      
      // Add Y.Doc update listener for debugging
      if (data.document) {
        console.log(`🔍 Setting up Y.Doc update listener for ${data.documentName}`);
        data.document.on('update', (update: Uint8Array, origin: any) => {
          console.log(`📝 Y.Doc update received for ${data.documentName}, size: ${update.length}, origin: ${origin?.constructor?.name || 'unknown'}`);
        });
      }
    },

    async onDisconnect(data: any) {
      console.log(`🔌 Client disconnected: ${data.socketId}`);
    },

    async onChange(data: any) {
      console.log(`📝 Document changed: ${data.documentName}, changes: ${data.update?.length || 0} bytes`);
    },

    async onStoreDocument(data: any) {
      console.log(`💾 Storing document: ${data.documentName} to database`);
    },

    async onLoadDocument(data: any) {
      console.log(`📖 Loading document: ${data.documentName} from database`);
    },

    async onRequest(data: any) {
      // Handle health check endpoint
      if (data.request.url === '/health' && data.request.method === 'GET') {
        return new Response(JSON.stringify({ 
          status: 'healthy', 
          service: 'hocuspocus',
          timestamp: new Date().toISOString() 
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Let backend handle CORS for API endpoints
      // Hocuspocus only handles WebSocket connections (/ws) which don't need CORS headers
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