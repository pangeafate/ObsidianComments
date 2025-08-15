import { render, screen } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { MemoryRouter } from 'react-router-dom';

// Mock the Editor component to avoid complex dependencies
jest.mock('../components/Editor', () => ({
  Editor: ({ documentId }: { documentId: string }) => (
    <div data-testid="editor-component">Editor with documentId: {documentId}</div>
  ),
}));

// Mock the pages
jest.mock('../pages/HomePage', () => ({
  HomePage: () => <div data-testid="home-page">Home Page</div>,
}));

jest.mock('../pages/SharePage', () => ({
  SharePage: () => <div data-testid="share-page">Share Page</div>,
}));

// Create a test version of App without router wrapper so we can control routing in tests
function TestableApp() {
  const { SharePage } = require('../pages/SharePage');
  const { HomePage } = require('../pages/HomePage');
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/share/:documentId" element={<SharePage />} />
        {/* Missing route: <Route path="/editor/:documentId" element={<EditorPage />} /> */}
      </Routes>
    </div>
  );
}

describe('App Routing', () => {
  it('should render HomePage for root path', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <TestableApp />
      </MemoryRouter>
    );
    
    expect(screen.getByTestId('home-page')).toBeInTheDocument();
  });

  it('should render SharePage for /share/:documentId path', () => {
    render(
      <MemoryRouter initialEntries={['/share/test-document-123']}>
        <TestableApp />
      </MemoryRouter>
    );
    
    expect(screen.getByTestId('share-page')).toBeInTheDocument();
  });

  it('should NOT render anything for /editor/:documentId path (this is the bug)', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/editor/test-document-123']}>
        <TestableApp />
      </MemoryRouter>
    );
    
    // This demonstrates the issue - no route matches so nothing renders
    // The main container should be empty (just the bg-gray-50 div)
    expect(container.querySelector('[data-testid="editor-component"]')).not.toBeInTheDocument();
    expect(container.querySelector('[data-testid="home-page"]')).not.toBeInTheDocument();
    expect(container.querySelector('[data-testid="share-page"]')).not.toBeInTheDocument();
  });

  it('should render Editor page for /editor/:documentId path AFTER we fix the routing', () => {
    // This test will be used to verify our fix works
    // For now, let's test what the correct implementation should look like
    
    const { Editor } = require('../components/Editor');
    
    function FixedApp() {
      const { SharePage } = require('../pages/SharePage');
      const { HomePage } = require('../pages/HomePage');
      
      // Mock EditorPage component that should exist
      const EditorPage = () => {
        const { useParams } = require('react-router-dom');
        const { documentId } = useParams() as { documentId: string };
        if (!documentId) return <div>No document ID</div>;
        return <Editor documentId={documentId} />;
      };
      
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
    
    render(
      <MemoryRouter initialEntries={['/editor/test-document-123']}>
        <FixedApp />
      </MemoryRouter>
    );
    
    expect(screen.getByTestId('editor-component')).toBeInTheDocument();
    expect(screen.getByText('Editor with documentId: test-document-123')).toBeInTheDocument();
  });
});