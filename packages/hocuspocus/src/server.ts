import { Hocuspocus } from '@hocuspocus/server';

export function createServer() {
  return new Hocuspocus({
    port: parseInt(process.env.PORT || '8082'),
    
    async onConnect(data: any) {
      console.log(`Client connected from ${data.socketId}, document: ${data.documentName}`);
      console.log(`User agent: ${data.request?.headers['user-agent']?.substring(0, 100)}`);
    },

    async onDisconnect(data: any) {
      console.log(`Client disconnected: ${data.socketId}`);
    },

    async onLoadDocument(data: any) {
      console.log(`Loading document: ${data.documentName}`);
      // Return empty document for now - in future this would load from database
      return null;
    },

    async onStoreDocument(data: any) {
      console.log(`Storing document: ${data.documentName}, size: ${data.document?.length || 0} bytes`);
      // In future this would save to database
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
      // For now, allow all connections - in future add proper auth
      console.log(`Authentication request for document: ${data.documentName}`);
      return true;
    },
  });
}