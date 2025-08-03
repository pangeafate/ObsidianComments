import { useParams } from 'react-router-dom';
import { Editor } from '../components/Editor';

export function EditorPage() {
  const { documentId } = useParams<{ documentId: string }>();

  if (!documentId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Document Not Found</h1>
          <p className="text-gray-600">The document you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return <Editor documentId={documentId} />;
}