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
    
    // WebSocket service temporarily disabled for deployment stability
    console.log('📡 Backend running in basic mode (WebSocket features disabled for stability)');
    
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