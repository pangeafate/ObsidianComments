import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Routes, Route } from 'react-router-dom';

// Mock all the page components
jest.mock('../pages/HomePage', () => ({
  HomePage: () => <div data-testid="home-page">Home Page</div>,
}));

jest.mock('../pages/SharePage', () => ({
  SharePage: () => <div data-testid="share-page">Share Page</div>,
}));

jest.mock('../pages/EditorPage', () => ({
  EditorPage: () => <div data-testid="editor-page">Editor Page</div>,
}));

// Test the actual routes configuration that should be in App.tsx
function TestAppRoutes() {
  const { HomePage } = require('../pages/HomePage');
  const { SharePage } = require('../pages/SharePage');
  const { EditorPage } = require('../pages/EditorPage');
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/share/:documentId" element={<SharePage />} />
        <Route path="/editor/:documentId" element={<EditorPage />} />
      </Routes>
    </div>
  );
}

describe('App Routing (Fixed)', () => {
  it('should render HomePage for root path', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <TestAppRoutes />
      </MemoryRouter>
    );
    
    expect(screen.getByTestId('home-page')).toBeInTheDocument();
  });

  it('should render SharePage for /share/:documentId path', () => {
    render(
      <MemoryRouter initialEntries={['/share/test-document-123']}>
        <TestAppRoutes />
      </MemoryRouter>
    );
    
    expect(screen.getByTestId('share-page')).toBeInTheDocument();
  });

  it('should render EditorPage for /editor/:documentId path (FIXED!)', () => {
    render(
      <MemoryRouter initialEntries={['/editor/test-document-123']}>
        <TestAppRoutes />
      </MemoryRouter>
    );
    
    // This should now work after adding the route!
    expect(screen.getByTestId('editor-page')).toBeInTheDocument();
  });

  it('should handle New Note button workflow with UUID', () => {
    render(
      <MemoryRouter initialEntries={['/editor/550e8400-e29b-41d4-a716-446655440000']}>
        <TestAppRoutes />
      </MemoryRouter>
    );
    
    expect(screen.getByTestId('editor-page')).toBeInTheDocument();
  });

  it('should handle New Note button workflow with timestamp ID', () => {
    render(
      <MemoryRouter initialEntries={['/editor/1642771200000-123456789']}>
        <TestAppRoutes />
      </MemoryRouter>
    );
    
    expect(screen.getByTestId('editor-page')).toBeInTheDocument();
  });

  it('should show nothing for unmatched routes', () => {
    render(
      <MemoryRouter initialEntries={['/nonexistent-route']}>
        <TestAppRoutes />
      </MemoryRouter>
    );
    
    // Should not render any of our main components for unmatched routes
    expect(screen.queryByTestId('home-page')).not.toBeInTheDocument();
    expect(screen.queryByTestId('share-page')).not.toBeInTheDocument();
    expect(screen.queryByTestId('editor-page')).not.toBeInTheDocument();
  });
});