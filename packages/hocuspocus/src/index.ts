import { createServer } from './server';

const server = createServer();

server.listen().then(() => {
  console.log(`Hocuspocus server running on port ${server.configuration.port}`);
}).catch((error: any) => {
  console.error('Failed to start Hocuspocus server:', error);
  process.exit(1);
});