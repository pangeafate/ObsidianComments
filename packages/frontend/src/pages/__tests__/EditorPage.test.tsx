import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { EditorPage } from '../EditorPage';

// Mock the Editor component to avoid complex dependencies
jest.mock('../../components/Editor', () => ({
  Editor: ({ documentId }: { documentId: string }) => (
    <div data-testid="editor-component">Editor with documentId: {documentId}</div>
  ),
}));

// Helper to render EditorPage with routing context
const renderWithRouter = (initialEntries: string[]) => {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <EditorPage />
    </MemoryRouter>
  );
};

// Mock useParams hook for testing
const mockUseParams = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => mockUseParams(),
}));

describe('EditorPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render Editor component when documentId is provided', () => {
    mockUseParams.mockReturnValue({ documentId: 'test-document-123' });
    
    render(<EditorPage />);
    
    expect(screen.getByTestId('editor-component')).toBeInTheDocument();
    expect(screen.getByText('Editor with documentId: test-document-123')).toBeInTheDocument();
  });

  it('should render error message when documentId is missing', () => {
    mockUseParams.mockReturnValue({ documentId: undefined });
    
    render(<EditorPage />);
    
    expect(screen.getByText('Document Not Found')).toBeInTheDocument();
    expect(screen.getByText("The document you're looking for doesn't exist.")).toBeInTheDocument();
    expect(screen.queryByTestId('editor-component')).not.toBeInTheDocument();
  });

  it('should render error message when documentId is empty string', () => {
    mockUseParams.mockReturnValue({ documentId: '' });
    
    render(<EditorPage />);
    
    expect(screen.getByText('Document Not Found')).toBeInTheDocument();
    expect(screen.queryByTestId('editor-component')).not.toBeInTheDocument();
  });

  it('should handle UUID format document IDs', () => {
    const uuidDocumentId = '550e8400-e29b-41d4-a716-446655440000';
    mockUseParams.mockReturnValue({ documentId: uuidDocumentId });
    
    render(<EditorPage />);
    
    expect(screen.getByTestId('editor-component')).toBeInTheDocument();
    expect(screen.getByText(`Editor with documentId: ${uuidDocumentId}`)).toBeInTheDocument();
  });

  it('should handle timestamp format document IDs', () => {
    const timestampDocumentId = '1642771200000-123456789';
    mockUseParams.mockReturnValue({ documentId: timestampDocumentId });
    
    render(<EditorPage />);
    
    expect(screen.getByTestId('editor-component')).toBeInTheDocument();
    expect(screen.getByText(`Editor with documentId: ${timestampDocumentId}`)).toBeInTheDocument();
  });

  it('should pass documentId correctly to Editor component', () => {
    const testDocumentId = 'my-special-document-2025';
    mockUseParams.mockReturnValue({ documentId: testDocumentId });
    
    render(<EditorPage />);
    
    const editorComponent = screen.getByTestId('editor-component');
    expect(editorComponent).toBeInTheDocument();
    expect(editorComponent).toHaveTextContent(`Editor with documentId: ${testDocumentId}`);
  });
});