# Collaborative Editing + Comments Architecture

## Overview
Building a real-time collaborative editing system where:
- Multiple users can edit simultaneously in web browser
- Each user's edits are highlighted in pastel colors based on their name
- Comments appear in a sidebar, anchored to specific text positions
- Full version history and conflict resolution

## Architecture Phases

### Phase 3A: Basic Comments System
- Comments anchored to text positions
- Sidebar UI for displaying comments
- Basic CRUD operations for comments

### Phase 3B: Real-time Collaborative Editing  
- WebSocket infrastructure for live synchronization
- Operational Transformation (OT) for conflict resolution
- Color-coded edit highlighting
- Live cursor positions

### Phase 3C: Integration & Polish
- Comments that follow text as it moves during edits
- Advanced conflict resolution
- Performance optimization

## Database Schema

### Comments Table
```sql
CREATE TABLE comments (
    id SERIAL PRIMARY KEY,
    share_id VARCHAR(255) NOT NULL,
    contributor_name VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    -- Text position anchoring
    position_start INTEGER NOT NULL, -- character position in document
    position_end INTEGER NOT NULL,   -- end position for range comments
    version_number INTEGER NOT NULL, -- which document version
    -- Threading support
    parent_comment_id INTEGER REFERENCES comments(id),
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_resolved BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (share_id) REFERENCES shares(share_id) ON DELETE CASCADE
);

CREATE INDEX idx_comments_share_id ON comments(share_id);
CREATE INDEX idx_comments_position ON comments(share_id, position_start, position_end);
```

### Edit Operations Table (for real-time collaboration)
```sql
CREATE TABLE edit_operations (
    id SERIAL PRIMARY KEY,
    share_id VARCHAR(255) NOT NULL,
    -- Operation details
    operation_type VARCHAR(20) NOT NULL, -- 'insert', 'delete', 'retain'
    position INTEGER NOT NULL,           -- character position
    content TEXT,                        -- content for insert operations
    length INTEGER,                      -- length for delete/retain operations
    -- Attribution
    contributor_name VARCHAR(255) NOT NULL,
    contributor_color VARCHAR(7) NOT NULL, -- hex color code
    -- Timing and versioning
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sequence_number BIGINT NOT NULL,     -- for ordering operations
    version_number INTEGER NOT NULL,
    FOREIGN KEY (share_id) REFERENCES shares(share_id) ON DELETE CASCADE
);

CREATE INDEX idx_operations_share_id_seq ON edit_operations(share_id, sequence_number);
```

### Contributor Colors Table
```sql
CREATE TABLE contributor_colors (
    contributor_name VARCHAR(255) PRIMARY KEY,
    color_hex VARCHAR(7) NOT NULL, -- #FFB6C1 style pastel colors
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## API Endpoints

### Comments API
```
GET /api/notes/:shareId/comments
- Returns all comments for a document
- Response: { comments: [{ id, content, contributorName, position, createdAt, replies: [] }] }

POST /api/notes/:shareId/comments
- Creates a new comment
- Body: { content, contributorName, positionStart, positionEnd, parentId? }

PUT /api/notes/:shareId/comments/:commentId
- Updates a comment
- Body: { content }

DELETE /api/notes/:shareId/comments/:commentId
- Deletes a comment (soft delete, mark as resolved)
```

### Real-time Collaboration API
```
WebSocket: /ws/notes/:shareId
- Real-time bidirectional communication
- Messages: { type: 'operation', data: { op, position, content, contributor } }
- Messages: { type: 'cursor', data: { position, contributor } }
- Messages: { type: 'join', data: { contributor } }

GET /api/notes/:shareId/operations
- Get recent operations for initialization
- Query params: ?since=sequenceNumber

POST /api/notes/:shareId/operations
- Submit a new operation
- Body: { type, position, content?, length?, contributor }
```

## Color Assignment System

### Consistent Color Generation
```javascript
function getContributorColor(contributorName) {
  // Generate consistent pastel color from name hash
  const hash = hashString(contributorName);
  const hue = hash % 360;
  const saturation = 40 + (hash % 20); // 40-60%
  const lightness = 85 + (hash % 10);  // 85-95% (pastel range)
  return hslToHex(hue, saturation, lightness);
}

// Predefined pastel colors for first few contributors
const PASTEL_COLORS = [
  '#FFB6C1', // Light Pink
  '#B6E5D8', // Light Turquoise  
  '#A8E6CF', // Light Green
  '#FFD3A5', // Light Orange
  '#FFAAA5', // Light Coral
  '#C7CEEA', // Light Lavender
  '#B5EAD7', // Light Mint
  '#F7DC6F'  // Light Yellow
];
```

## Frontend Architecture

### Rich Text Editor
- **ProseMirror** or **Quill.js** for rich text editing
- Custom plugins for:
  - Real-time collaboration
  - Edit highlighting with contributor colors
  - Comment anchoring and display

### React Components Structure
```
<CollaborativeEditor>
  <EditorPane>
    <RichTextEditor />
    <CursorOverlay />
    <HighlightOverlay />
  </EditorPane>
  <CommentSidebar>
    <CommentThread />
    <NewCommentForm />
  </CommentSidebar>
  <ContributorList />
</CollaborativeEditor>
```

### WebSocket Client
```javascript
class CollaborationClient {
  constructor(shareId, contributorName) {
    this.ws = new WebSocket(`/ws/notes/${shareId}`);
    this.contributorName = contributorName;
    this.operationQueue = [];
    this.setupEventHandlers();
  }

  sendOperation(operation) {
    this.ws.send(JSON.stringify({
      type: 'operation',
      data: { ...operation, contributor: this.contributorName }
    }));
  }

  onOperation(callback) {
    this.operationCallbacks.push(callback);
  }
}
```

## Operational Transformation (OT)

### Basic Operation Types
```javascript
const OperationTypes = {
  INSERT: 'insert',  // Insert text at position
  DELETE: 'delete',  // Delete length characters at position  
  RETAIN: 'retain'   // Keep length characters (for attribution)
};

// Example operations:
{ type: 'insert', position: 10, content: 'Hello', contributor: 'Alice' }
{ type: 'delete', position: 5, length: 3, contributor: 'Bob' }
{ type: 'retain', position: 0, length: 15, contributor: 'Charlie' }
```

### Transformation Algorithm
When two operations conflict, transform them so both can be applied:
```javascript
function transformOperations(op1, op2) {
  // If op1 inserts before op2's position, shift op2 right
  if (op1.type === 'insert' && op1.position <= op2.position) {
    return { ...op2, position: op2.position + op1.content.length };
  }
  // More transformation rules...
}
```

## Implementation Timeline

### Week 1: Comments Foundation
- Database schema and migrations
- Basic comments CRUD API
- Simple text position anchoring

### Week 2: Real-time Infrastructure  
- WebSocket setup
- Basic operation sync
- Contributor color system

### Week 3: Collaborative Editing
- Operational transformation
- Edit highlighting
- Conflict resolution

### Week 4: Frontend Integration
- React components
- Rich text editor
- Comment sidebar UI

## Technical Challenges

1. **Conflict Resolution**: Multiple users editing same text simultaneously
2. **Performance**: Large documents with many operations
3. **Comment Anchoring**: Comments staying attached to text as it moves
4. **Network Reliability**: Handling disconnections and reconnections
5. **Undo/Redo**: Complex with multiple contributors

## Success Metrics

1. **Real-time Sync**: Operations appear within 100ms
2. **Conflict Resolution**: No data loss during simultaneous edits
3. **Visual Clarity**: Easy to see who made which changes
4. **Comment UX**: Intuitive comment creation and management
5. **Performance**: Smooth editing with 10+ concurrent users