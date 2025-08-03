import { Hocuspocus } from '@hocuspocus/server';

export function createServer() {
  return new Hocuspocus({
    port: parseInt(process.env.PORT || '8082'),
    
    async onConnect(data: any) {
      console.log(`Client connected`);
    },

    async onDisconnect(data: any) {
      console.log(`Client disconnected`);
    },

    async onLoadDocument(data: any) {
      console.log(`Loading document: ${data.documentName}`);
      return null; // Return empty document for now
    },

    async onStoreDocument(data: any) {
      console.log(`Storing document: ${data.documentName}`);
    },
  });
}