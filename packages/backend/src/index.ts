import { app } from './app';
import { PrismaClient } from '@prisma/client';
import { createServer } from 'http';

const PORT = process.env.PORT || 8081;
const prisma = new PrismaClient();

async function startServer() {
  try {
    // Test database connection on startup
    console.log('🔍 Testing database connection...');
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Backend connected to database successfully');
    
    // Create HTTP server
    const httpServer = createServer(app);
    
    // Initialize WebSocket service safely
    try {
      const { websocketService } = await import('./services/websocketService');
      websocketService.init(httpServer);
      console.log('✅ WebSocket service enabled for real-time collaboration');
    } catch (wsError) {
      console.warn('⚠️ WebSocket service failed to initialize, continuing without it:', wsError);
      console.log('📡 Backend will run in basic mode without WebSocket features');
    }
    
    httpServer.listen(PORT, () => {
      console.log(`Backend server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Backend failed to connect to database:', error);
    console.error('DATABASE_URL:', process.env.DATABASE_URL);
    process.exit(1);
  }
}

startServer();