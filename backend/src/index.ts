import { app, httpServer } from './app';
import { config } from './config';

const port = config.port || 3000;

httpServer.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
  console.log(`📚 Environment: ${config.env}`);
  console.log(`🔗 Server URL: http://localhost:${port}`);
  console.log(`🔌 WebSocket server initialized`);
});