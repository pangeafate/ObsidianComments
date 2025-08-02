// React context for managing collaborative editing state

import { createContext, useContext, useReducer, useEffect } from 'react';
import type { ReactNode } from 'react';
import { webSocketManager } from '../utils/WebSocketManager';
import type {
  CollaborationState,
  Contributor,
  TextHighlight,
  Comment,
  DocumentState,
  TextChangeEvent,
  SyncStateEvent,
  HighlightsUpdateEvent,
  CommentEvent,
  PresenceEvent,
  CursorPosition
} from '../types/collaboration';

// Action types
type CollaborationAction =
  | { type: 'SET_CONNECTION_STATUS'; payload: { connected: boolean; connecting?: boolean; error?: string } }
  | { type: 'SET_SHARE_ID'; payload: string }
  | { type: 'SET_CONTRIBUTOR_NAME'; payload: string }
  | { type: 'SET_DOCUMENT_STATE'; payload: DocumentState }
  | { type: 'UPDATE_CONTRIBUTORS'; payload: Contributor[] }
  | { type: 'ADD_CONTRIBUTOR'; payload: Contributor }
  | { type: 'REMOVE_CONTRIBUTOR'; payload: string }
  | { type: 'UPDATE_HIGHLIGHTS'; payload: TextHighlight[] }
  | { type: 'UPDATE_COMMENTS'; payload: Comment[] }
  | { type: 'ADD_COMMENT'; payload: Comment }
  | { type: 'UPDATE_COMMENT'; payload: Comment }
  | { type: 'DELETE_COMMENT'; payload: number }
  | { type: 'UPDATE_CURSOR'; payload: CursorPosition }
  | { type: 'RESET_STATE' };

// Initial state
const initialState: CollaborationState = {
  shareId: null,
  contributorName: '',
  contributors: [],
  highlights: [],
  comments: [],
  documentState: null,
  isConnected: false,
  isConnecting: false,
  error: null
};

// Reducer
function collaborationReducer(state: CollaborationState, action: CollaborationAction): CollaborationState {
  switch (action.type) {
    case 'SET_CONNECTION_STATUS':
      return {
        ...state,
        isConnected: action.payload.connected,
        isConnecting: action.payload.connecting ?? false,
        error: action.payload.error ?? null
      };

    case 'SET_SHARE_ID':
      return {
        ...state,
        shareId: action.payload
      };

    case 'SET_CONTRIBUTOR_NAME':
      return {
        ...state,
        contributorName: action.payload
      };

    case 'SET_DOCUMENT_STATE':
      return {
        ...state,
        documentState: action.payload
      };

    case 'UPDATE_CONTRIBUTORS':
      return {
        ...state,
        contributors: action.payload.map(contrib => ({
          ...contrib,
          isOnline: true
        }))
      };

    case 'ADD_CONTRIBUTOR':
      return {
        ...state,
        contributors: [
          ...state.contributors.filter(c => c.name !== action.payload.name),
          { ...action.payload, isOnline: true }
        ]
      };

    case 'REMOVE_CONTRIBUTOR':
      return {
        ...state,
        contributors: state.contributors.map(contrib =>
          contrib.name === action.payload
            ? { ...contrib, isOnline: false, lastSeen: new Date() }
            : contrib
        )
      };

    case 'UPDATE_HIGHLIGHTS':
      return {
        ...state,
        highlights: action.payload
      };

    case 'UPDATE_COMMENTS':
      return {
        ...state,
        comments: action.payload
      };

    case 'ADD_COMMENT':
      return {
        ...state,
        comments: [...state.comments, action.payload]
      };

    case 'UPDATE_COMMENT':
      return {
        ...state,
        comments: state.comments.map(comment =>
          comment.id === action.payload.id ? action.payload : comment
        )
      };

    case 'DELETE_COMMENT':
      return {
        ...state,
        comments: state.comments.filter(comment => comment.id !== action.payload)
      };

    case 'UPDATE_CURSOR':
      return {
        ...state,
        contributors: state.contributors.map(contrib =>
          contrib.name === action.payload.contributorName
            ? { ...contrib, cursorPosition: action.payload.position }
            : contrib
        )
      };

    case 'RESET_STATE':
      return initialState;

    default:
      return state;
  }
}

// Context
interface CollaborationContextType {
  state: CollaborationState;
  actions: {
    connect: () => Promise<void>;
    disconnect: () => void;
    retry: () => Promise<void>;
    joinShare: (shareId: string, contributorName: string) => void;
    leaveShare: () => void;
    sendTextChange: (operation: any[], operationId: string, baseVersion: number) => void;
    sendCursorMove: (position: number, selection?: { start: number; end: number }) => void;
    addComment: (content: string, positionStart: number, positionEnd: number, parentId?: number) => void;
    updateComment: (commentId: number, content: string) => void;
    deleteComment: (commentId: number) => void;
    requestSync: () => void;
    requestHighlights: () => void;
  };
}

const CollaborationContext = createContext<CollaborationContextType | null>(null);

// Provider component
interface CollaborationProviderProps {
  children: ReactNode;
}

export function CollaborationProvider({ children }: CollaborationProviderProps) {
  const [state, dispatch] = useReducer(collaborationReducer, initialState);

  useEffect(() => {
    // Set up WebSocket event listeners
    const handleConnectionStatus = (data: { connected: boolean; error?: string }) => {
      dispatch({
        type: 'SET_CONNECTION_STATUS',
        payload: data
      });
    };

    const handleSyncState = (data: SyncStateEvent) => {
      dispatch({
        type: 'SET_DOCUMENT_STATE',
        payload: data.documentState
      });
      dispatch({
        type: 'UPDATE_CONTRIBUTORS',
        payload: data.contributors.map(c => ({ ...c, isOnline: true }))
      });
      dispatch({
        type: 'UPDATE_HIGHLIGHTS',
        payload: data.highlights
      });
    };

    const handleTextChangeApplied = (data: TextChangeEvent) => {
      if (data.highlights) {
        dispatch({
          type: 'UPDATE_HIGHLIGHTS',
          payload: data.highlights
        });
      }
    };

    const handleHighlightsUpdate = (data: HighlightsUpdateEvent) => {
      dispatch({
        type: 'UPDATE_HIGHLIGHTS',
        payload: data.highlights
      });
    };

    const handleContributorJoin = (data: PresenceEvent) => {
      dispatch({
        type: 'ADD_CONTRIBUTOR',
        payload: {
          name: data.contributorName,
          color: data.contributorColor,
          isOnline: true,
          cursorPosition: data.cursorPosition
        }
      });
    };

    const handleContributorLeave = (data: PresenceEvent) => {
      dispatch({
        type: 'REMOVE_CONTRIBUTOR',
        payload: data.contributorName
      });
    };

    const handleContributorsList = (data: { contributors: any[] }) => {
      dispatch({
        type: 'UPDATE_CONTRIBUTORS',
        payload: data.contributors.map(c => ({ ...c, isOnline: true }))
      });
    };

    const handleCursorUpdate = (data: CursorPosition) => {
      dispatch({
        type: 'UPDATE_CURSOR',
        payload: data
      });
    };

    const handleCommentAdd = (data: CommentEvent) => {
      if (data.comment) {
        dispatch({
          type: 'ADD_COMMENT',
          payload: data.comment
        });
      }
    };

    const handleCommentUpdate = (data: CommentEvent) => {
      if (data.comment) {
        dispatch({
          type: 'UPDATE_COMMENT',
          payload: data.comment
        });
      }
    };

    const handleCommentDelete = (data: CommentEvent) => {
      if (data.commentId) {
        dispatch({
          type: 'DELETE_COMMENT',
          payload: data.commentId
        });
      }
    };

    const handleError = (data: { message: string }) => {
      dispatch({
        type: 'SET_CONNECTION_STATUS',
        payload: { connected: state.isConnected, error: data.message }
      });
    };

    // Register event listeners
    webSocketManager.on('connection-status', handleConnectionStatus);
    webSocketManager.on('sync-state', handleSyncState);
    webSocketManager.on('text-change-applied', handleTextChangeApplied);
    webSocketManager.on('highlights-update', handleHighlightsUpdate);
    webSocketManager.on('contributor-join', handleContributorJoin);
    webSocketManager.on('contributor-leave', handleContributorLeave);
    webSocketManager.on('contributors-list', handleContributorsList);
    webSocketManager.on('cursor-update', handleCursorUpdate);
    webSocketManager.on('comment-add', handleCommentAdd);
    webSocketManager.on('comment-update', handleCommentUpdate);
    webSocketManager.on('comment-delete', handleCommentDelete);
    webSocketManager.on('error', handleError);

    return () => {
      // Cleanup event listeners
      webSocketManager.off('connection-status', handleConnectionStatus);
      webSocketManager.off('sync-state', handleSyncState);
      webSocketManager.off('text-change-applied', handleTextChangeApplied);
      webSocketManager.off('highlights-update', handleHighlightsUpdate);
      webSocketManager.off('contributor-join', handleContributorJoin);
      webSocketManager.off('contributor-leave', handleContributorLeave);
      webSocketManager.off('contributors-list', handleContributorsList);
      webSocketManager.off('cursor-update', handleCursorUpdate);
      webSocketManager.off('comment-add', handleCommentAdd);
      webSocketManager.off('comment-update', handleCommentUpdate);
      webSocketManager.off('comment-delete', handleCommentDelete);
      webSocketManager.off('error', handleError);
    };
  }, [state.isConnected]);

  const actions = {
    connect: async () => {
      dispatch({
        type: 'SET_CONNECTION_STATUS',
        payload: { connected: false, connecting: true }
      });
      try {
        await webSocketManager.connect();
      } catch (error) {
        dispatch({
          type: 'SET_CONNECTION_STATUS',
          payload: { connected: false, connecting: false, error: (error as Error).message }
        });
      }
    },

    disconnect: () => {
      webSocketManager.disconnect();
      dispatch({ type: 'RESET_STATE' });
    },

    retry: async () => {
      dispatch({
        type: 'SET_CONNECTION_STATUS',
        payload: { connected: false, connecting: true }
      });
      try {
        await webSocketManager.retry();
      } catch (error) {
        dispatch({
          type: 'SET_CONNECTION_STATUS',
          payload: { connected: false, connecting: false, error: (error as Error).message }
        });
        throw error;
      }
    },

    joinShare: (shareId: string, contributorName: string) => {
      dispatch({ type: 'SET_SHARE_ID', payload: shareId });
      dispatch({ type: 'SET_CONTRIBUTOR_NAME', payload: contributorName });
      webSocketManager.joinShare(shareId, contributorName);
    },

    leaveShare: () => {
      if (state.shareId) {
        webSocketManager.leaveShare(state.shareId);
      }
      dispatch({ type: 'RESET_STATE' });
    },

    sendTextChange: (operation: any[], operationId: string, baseVersion: number) => {
      if (state.shareId) {
        webSocketManager.sendTextChange(state.shareId, operation, operationId, baseVersion);
      }
    },

    sendCursorMove: (position: number, selection?: { start: number; end: number }) => {
      webSocketManager.sendCursorMove(state.contributorName, position, selection);
    },

    addComment: (content: string, positionStart: number, positionEnd: number, parentId?: number) => {
      if (state.shareId) {
        webSocketManager.addComment(
          state.shareId,
          state.contributorName,
          content,
          positionStart,
          positionEnd,
          parentId
        );
      }
    },

    updateComment: (commentId: number, content: string) => {
      if (state.shareId) {
        webSocketManager.updateComment(state.shareId, commentId, state.contributorName, content);
      }
    },

    deleteComment: (commentId: number) => {
      if (state.shareId) {
        webSocketManager.deleteComment(state.shareId, commentId, state.contributorName);
      }
    },

    requestSync: () => {
      if (state.shareId) {
        webSocketManager.requestSync(state.shareId);
      }
    },

    requestHighlights: () => {
      if (state.shareId) {
        webSocketManager.requestHighlights(state.shareId);
      }
    }
  };

  return (
    <CollaborationContext.Provider value={{ state, actions }}>
      {children}
    </CollaborationContext.Provider>
  );
}

// Hook to use collaboration context
export function useCollaboration() {
  const context = useContext(CollaborationContext);
  if (!context) {
    throw new Error('useCollaboration must be used within a CollaborationProvider');
  }
  return context;
}