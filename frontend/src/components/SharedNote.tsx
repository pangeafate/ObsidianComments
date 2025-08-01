import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import axios from 'axios';
import './SharedNote.css';

interface NoteData {
  shareId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  permissions: {
    canEdit: boolean;
    canComment: boolean;
    isOwner: boolean;
  };
}

interface Comment {
  id: string;
  content: string;
  userId: string;
  userName: string;
  createdAt: string;
  lineNumber?: number;
}

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://obsidiancomments.lakestrom.com/api';

export const SharedNote: React.FC = () => {
  const { shareId } = useParams<{ shareId: string }>();
  const [note, setNote] = useState<NoteData | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');

  useEffect(() => {
    if (shareId) {
      fetchNote();
      fetchComments();
    }
  }, [shareId]);

  const fetchNote = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/notes/${shareId}`);
      setNote(response.data);
      setEditContent(response.data.content);
      setError(null);
    } catch (err) {
      console.error('Error fetching note:', err);
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        setError('Note not found. It may have been deleted or the link is invalid.');
      } else {
        setError('Failed to load note. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      // For now, comments are empty as we haven't implemented auth yet
      setComments([]);
    } catch (err) {
      console.error('Error fetching comments:', err);
    }
  };

  const handleSave = async () => {
    if (!note || !shareId) return;

    try {
      const response = await axios.put(`${API_BASE_URL}/notes/${shareId}`, {
        content: editContent,
        version: note.version
      });
      
      setNote(prev => prev ? {
        ...prev,
        content: editContent,
        version: response.data.version,
        updatedAt: response.data.updatedAt
      } : null);
      
      setIsEditing(false);
    } catch (err) {
      console.error('Error saving note:', err);
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        setError('Version conflict. The note was updated by someone else. Please refresh and try again.');
      } else if (axios.isAxiosError(err) && err.response?.status === 403) {
        setError('You do not have permission to edit this note.');
      } else {
        setError('Failed to save note. Please try again.');
      }
    }
  };

  const handleCancel = () => {
    setEditContent(note?.content || '');
    setIsEditing(false);
  };

  if (loading) {
    return (
      <div className="shared-note-container">
        <div className="loading">
          <div className="loading-spinner"></div>
          <p>Loading note...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="shared-note-container">
        <div className="error">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Try Again</button>
        </div>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="shared-note-container">
        <div className="error">
          <h2>Note Not Found</h2>
          <p>The shared note you're looking for doesn't exist or has been deleted.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="shared-note-container">
      <header className="note-header">
        <div className="note-info">
          <h1>Shared Note</h1>
          <div className="note-meta">
            <span>Created: {new Date(note.createdAt).toLocaleDateString()}</span>
            <span>Updated: {new Date(note.updatedAt).toLocaleDateString()}</span>
            <span>Version: {note.version}</span>
          </div>
        </div>
        
        {note.permissions.canEdit && (
          <div className="note-actions">
            {!isEditing ? (
              <button 
                className="edit-button"
                onClick={() => setIsEditing(true)}
              >
                Edit
              </button>
            ) : (
              <div className="edit-actions">
                <button 
                  className="save-button"
                  onClick={handleSave}
                >
                  Save
                </button>
                <button 
                  className="cancel-button"
                  onClick={handleCancel}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      <main className="note-content">
        {isEditing ? (
          <div className="edit-mode">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="edit-textarea"
              placeholder="Write your note content here..."
            />
            <div className="edit-hint">
              <p>💡 You can use Markdown syntax for formatting</p>
            </div>
          </div>
        ) : (
          <div className="view-mode">
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              className="markdown-content"
            >
              {note.content}
            </ReactMarkdown>
          </div>
        )}
      </main>

      {note.permissions.canComment && (
        <section className="comments-section">
          <h3>Comments</h3>
          {comments.length === 0 ? (
            <p className="no-comments">No comments yet. Sign in to add the first comment!</p>
          ) : (
            <div className="comments-list">
              {comments.map(comment => (
                <div key={comment.id} className="comment">
                  <div className="comment-header">
                    <span className="comment-author">{comment.userName}</span>
                    <span className="comment-date">
                      {new Date(comment.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="comment-content">
                    {comment.content}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <footer className="note-footer">
        <p>
          <span>🔗 Share this note: </span>
          <code>{window.location.href}</code>
        </p>
        <p className="powered-by">
          Powered by <strong>Obsidian Comments</strong>
        </p>
      </footer>
    </div>
  );
};