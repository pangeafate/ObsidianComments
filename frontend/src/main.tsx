// Main entry point for the React application

import React from 'react';
import ReactDOM from 'react-dom/client';
import { CollaborationProvider } from './contexts/CollaborationContext';
import { App } from './components/App';
import './index.css';

// Get share ID from URL path
// Support both production (/share/ABC123) and development (?shareId=ABC123) URLs
const pathname = window.location.pathname;
const searchParams = new URLSearchParams(window.location.search);
let shareId: string | null = null;

if (pathname.startsWith('/share/')) {
  // Production URL: /share/ABC123
  shareId = pathname.split('/').pop() || null;
} else if (searchParams.has('shareId')) {
  // Development URL: /?shareId=ABC123
  shareId = searchParams.get('shareId');
} else {
  // For development, use a test share ID
  if (import.meta.env.DEV) {
    shareId = 'test-share-id';
    console.log('Development mode: Using test share ID');
  }
}

if (!shareId) {
  // Show error if no share ID in URL
  document.body.innerHTML = `
    <div class="h-screen flex items-center justify-center bg-gray-50">
      <div class="text-center">
        <h1 class="text-2xl font-bold text-gray-900 mb-2">Invalid Share Link</h1>
        <p class="text-gray-600">This document link is not valid.</p>
        <p class="text-xs text-gray-400 mt-2">
          ${import.meta.env.DEV ? 'Development: Add ?shareId=your-share-id to the URL' : ''}
        </p>
      </div>
    </div>
  `;
} else {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <CollaborationProvider>
        <App shareId={shareId} />
      </CollaborationProvider>
    </React.StrictMode>
  );
}
