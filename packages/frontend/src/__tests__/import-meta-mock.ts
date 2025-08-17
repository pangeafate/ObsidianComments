/**
 * Mock for import.meta to fix Jest configuration issues
 * This provides the import.meta.env object that Vite uses
 */

// Define the import.meta global for Jest
declare global {
  interface ImportMeta {
    env: {
      DEV: boolean;
      VITE_API_URL: string;
      VITE_WS_URL: string;
      [key: string]: any;
    };
  }
}

// Create the mock
const importMetaMock = {
  env: {
    DEV: false,
    VITE_API_URL: 'http://localhost:8081',
    VITE_WS_URL: 'ws://localhost:8081/ws',
    NODE_ENV: 'test'
  }
};

// Assign to global
Object.defineProperty(globalThis, 'import', {
  value: {
    meta: importMetaMock
  },
  configurable: true
});

export {};