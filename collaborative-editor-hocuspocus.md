# Collaborative Editor Implementation Plan with Tiptap & Hocuspocus

## Project Overview
A real-time collaborative Markdown editor with commenting functionality, similar to Google Docs, designed for one-way publishing from Obsidian. Users publish notes from Obsidian to the web platform, where they become available for collaborative editing via a unique URL. The system leverages Tiptap editor with Hocuspocus WebSocket backend for CRDT-based collaboration, supporting multiple users editing and commenting on published documents simultaneously with version history and rollback capabilities. Each document will be accessible via a unique URL in the format: https://obsidiancomments.lakestrom.com/share/[unique-id]

## Core Functionality

### Document Management
- Documents are published from Obsidian as Markdown content via REST API
- Each published document receives a unique identifier and shareable URL
- Once published, documents exist independently on the web platform
- The system maintains a complete history through Yjs snapshots and database persistence
- Users can view and rollback to any previous version of the document
- All edits are tracked with timestamps and author information via Yjs awareness
- Published documents have no live connection back to Obsidian

### Collaborative Editing
- Multiple users can edit the same document simultaneously using Yjs CRDT
- Each user's presence is tracked with awareness (cursor, selection, user info)
- Users can see other active editors' cursor positions in real-time
- Text selections by other users are visible to all participants
- Conflict resolution is automatic through CRDT algorithms
- The system handles network disconnections gracefully with Yjs's built-in sync

### Commenting System
- Comments are implemented as Tiptap extensions with Yjs shared types
- Users can select any text and add comments using Tiptap marks
- Comments appear in a side panel similar to Google Docs
- Each comment can have threaded replies stored in Yjs maps
- Users can mark comments as resolved
- Comment indicators appear inline with the document text as Tiptap decorations

### User Sessions
- No authentication required to access published documents
- Simple username-based identification integrated with Yjs awareness
- Users are prompted for a username when attempting to edit or comment
- Each session is assigned a unique pastel color through awareness states
- Presence information is automatically managed by Hocuspocus
- The system tracks all active users through Yjs awareness protocol
- Anyone with the URL can view and edit the document

## Technology Stack

### Backend Architecture
- **Framework**: Node.js with Express.js for RESTful API
- **Collaboration Server**: Hocuspocus server for Yjs WebSocket synchronization
- **Database**: PostgreSQL for persistent storage of documents, versions, and structured data
- **Document Storage**: Yjs documents persisted to PostgreSQL with Hocuspocus extensions
- **Cache**: Redis for Hocuspocus document caching and performance optimization
- **ORM**: Prisma for type-safe database operations
- **Testing**: Jest for unit tests and Supertest for API integration tests

### Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety
- **Editor**: Tiptap v2 with Yjs collaboration extensions
- **Collaboration**: Yjs with y-prosemirror for real-time sync
- **WebSocket Client**: @hocuspocus/provider for Yjs synchronization
- **Styling**: Tailwind CSS for modern, responsive design
- **State Management**: Zustand for application state, Yjs for document state
- **Testing**: Jest with React Testing Library, Cypress for E2E tests
- **Markdown**: Tiptap Markdown extension for parsing and rendering

### Infrastructure
- **Containerization**: Docker with Docker Compose for consistent environments
- **Web Server**: Nginx as reverse proxy for load balancing and SSL termination
- **Ports**: Frontend (8080), Backend API (8081), Hocuspocus WebSocket (8082)
- **Repository**: https://github.com/pangeafate/ObsidianComments
- **Domain**: obsidiancomments.lakestrom.com

## Database Design

### Document Storage
Documents are initially created when published from Obsidian via the REST API. The submitted Markdown content is stored in PostgreSQL along with metadata. When first accessed via the web URL, the system initializes a Yjs document in Hocuspocus with the Markdown content. Subsequent edits are stored as Yjs binary updates. The document table includes metadata like creation time, last modified, original source, and publishing information.

### Snapshots and Versions
Hocuspocus creates periodic snapshots of Yjs documents for efficient loading. Additional version metadata is stored separately, linking to specific Yjs document states with author information and commit messages.

### Comment Metadata
While comment content lives in the Yjs document, metadata like resolved status, timestamps, and threading relationships are stored in PostgreSQL for efficient querying and filtering.

### User Awareness
Active user presence is managed entirely through Yjs awareness protocol. User metadata like display names and colors are stored in the awareness state and automatically cleaned up on disconnect.

## Document Publishing System

### Publishing API Endpoint

**POST /api/publish**
```json
{
  "title": "Document Title",
  "content": "# Markdown content...",
  "metadata": {
    "tags": ["tag1", "tag2"],
    "source": "obsidian",
    "publishedBy": "optional-user-identifier"
  }
}
```

**Response:**
```json
{
  "id": "unique-document-id",
  "url": "https://obsidiancomments.lakestrom.com/share/unique-document-id",
  "publishedAt": "2024-01-20T10:30:00Z"
}
```

### Publishing Process
1. Obsidian plugin sends Markdown content to the API
2. Server generates unique document ID
3. Server stores initial content in PostgreSQL
4. Server initializes empty Yjs document in Hocuspocus
5. Server imports Markdown content into Yjs document
6. Document becomes available at the shareable URL
7. Users accessing the URL load the Tiptap editor interface

### Document Lifecycle
- **Publishing**: One-time action from Obsidian to web
- **Editing**: All subsequent edits happen on the web platform
- **Collaboration**: Multiple users can edit via the web interface
- **Export**: Users can download the edited document as Markdown
- **No Sync**: Changes are not pushed back to Obsidian

## API Architecture

### RESTful Endpoints

**Document Publishing (from Obsidian)**
- `POST /api/publish` - Publish Markdown content from Obsidian
  - Accepts Markdown content and metadata
  - Returns unique document ID and shareable URL
  - Initializes Yjs document in Hocuspocus

**Document Operations**
- `GET /share/[unique-id]` - Load web editor interface for document
- Retrieve document metadata and access information
- List all published documents with last modified times
- Delete document (archives Yjs data)
- Export document as Markdown

**Version Management**
- List all versions with metadata
- Create named snapshot
- Restore document to specific version
- Compare versions (diff view)

**Comment Queries**
- Get comment statistics for a document
- Filter comments by status or author
- Export comments for external use

**User Management**
- Create/update user profile
- Get user's recent documents
- Manage user preferences

### Hocuspocus Configuration

**Server Setup**
```javascript
{
  port: 8082,
  redis: { // For scaling and persistence
    host: 'redis',
    port: 6379
  },
  database: { // PostgreSQL for document storage
    type: 'postgres',
    connectionString: process.env.DATABASE_URL
  },
  extensions: [
    authentication(), // Custom auth extension
    persistence(), // PostgreSQL persistence
    throttle(), // Rate limiting
    logger(), // Activity logging
  ]
}
```

**Client Connection**
```javascript
{
  url: 'wss://obsidiancomments.lakestrom.com/collaboration',
  name: documentId,
  token: sessionToken,
  awareness: {
    user: {
      name: username,
      color: generatePastelColor()
    }
  }
}
```

## Tiptap Configuration

### Editor Extensions

**Core Extensions**
- Document, Paragraph, Text, Heading
- Bold, Italic, Strike, Code, Link
- BulletList, OrderedList, TaskList
- CodeBlock with syntax highlighting
- Markdown shortcuts and paste handling

**Collaboration Extensions**
- Collaboration (y-prosemirror integration)
- CollaborationCursor (show other users' cursors)
- CollaborationSelection (highlight others' selections)
- Comments (custom extension for inline comments)

**Custom Extensions**
- CommentThread: Manages comment discussions
- VersionHistory: Shows document timeline
- UserPresence: Enhanced awareness display
- MarkdownExport: Clean Markdown generation

### Comment Implementation

Comments are implemented as a custom Tiptap extension that:
- Creates marks in the document for commented text
- Stores comment data in a Yjs shared map
- Renders comment indicators inline
- Manages the comment panel UI
- Handles comment threading through Yjs nested maps

## Testing Strategy

### Backend Testing

**Hocuspocus Testing**
- Test connection lifecycle and authentication
- Verify document persistence and loading
- Test awareness state synchronization
- Validate extension behavior

**Integration Testing**
- Test Yjs document operations
- Verify snapshot creation and restoration
- Test concurrent editing scenarios
- Validate conflict resolution

### Frontend Testing

**Tiptap Testing**
- Test editor initialization with extensions
- Verify collaborative features work correctly
- Test comment creation and management
- Validate Markdown import/export

**Collaboration Testing**
- Multi-user editing scenarios
- Network disconnection/reconnection
- Document state consistency
- Performance under load

## Security Measures

### Hocuspocus Security
- Token-based authentication for WebSocket connections
- Document-level access control
- Rate limiting per connection
- Input validation in extensions

### Data Protection
- Yjs documents encrypted at rest
- Secure WebSocket connections (WSS)
- No personal data in awareness states
- Automatic cleanup of stale data

## Performance Optimization

### Hocuspocus Performance
- Redis caching for active documents
- Lazy loading of document snapshots
- Efficient binary delta synchronization
- Connection pooling for PostgreSQL

### Tiptap Performance
- Lazy loading of editor extensions
- Debounced synchronization
- Virtual scrolling for long documents
- Optimized comment rendering

### Yjs Optimization
- Periodic garbage collection
- Snapshot intervals for large documents
- Subdocument pattern for comments
- Awareness state throttling

## Implementation Timeline

### Phase 1: Foundation (Week 1)
Set up project with TypeScript and Docker. Configure Hocuspocus server with PostgreSQL persistence. Design database schema for published documents. Implement publishing API endpoint for Obsidian. Create document initialization workflow. Set up GitHub repository with CI/CD.

### Phase 2: Collaborative Editor (Week 2)
Integrate Tiptap with Yjs collaboration. Configure Hocuspocus extensions for authentication and persistence. Implement user awareness with colors and cursors. Create comment extension for Tiptap. Test multi-user synchronization.

### Phase 3: Frontend Development (Week 3)
Build React application with Tiptap integration. Implement Hocuspocus provider connection. Create commenting UI with threading. Add version history interface. Implement Markdown import/export.

### Phase 4: Polish & Deployment (Week 4)
Develop Obsidian plugin for one-way publishing. Optimize performance for production. Add comprehensive error handling. Create deployment configuration. Set up monitoring for Hocuspocus. Complete user and developer documentation. Test end-to-end publishing workflow.

## Deployment Strategy

### Local Development
Use Docker Compose with Hocuspocus, PostgreSQL, and Redis. Run frontend development server with hot reload. Test collaboration features with multiple browser windows.

### Production Deployment
Deploy Hocuspocus as separate service for scaling. Use connection pooling for PostgreSQL. Configure Redis for high availability. Set up WebSocket load balancing in Nginx. Enable Hocuspocus clustering for scale.

### Monitoring
Track Hocuspocus connection metrics. Monitor Yjs document sizes and performance. Alert on synchronization failures. Log collaboration session analytics.

## Obsidian Plugin Integration

The Obsidian plugin provides one-way publishing functionality:

### Plugin Features
- **Publish Command**: Right-click menu or command palette option to publish current note
- **API Integration**: Sends Markdown content to the REST API endpoint
- **URL Generation**: Receives and displays the shareable URL after publishing
- **Clipboard Support**: Automatically copies the share URL to clipboard
- **Publishing History**: Maintains a list of published documents with their URLs
- **Metadata Support**: Includes note title and tags when publishing

### Publishing Workflow
1. User selects "Publish to Web" in Obsidian
2. Plugin sends POST request to `/api/publish` with Markdown content
3. Server creates new document in database and initializes Yjs document
4. Server returns unique ID and shareable URL
5. Plugin displays success message with URL
6. User shares URL with collaborators who can edit in browser

### No Synchronization
- Published documents are independent copies
- Changes made on the web are not synced back to Obsidian
- Users can manually export the edited version from web if needed
- Each publish creates a new document (no updating existing)

## Key Advantages of This Architecture

1. **Simple Integration**: One-way publishing keeps Obsidian plugin lightweight
2. **CRDT-based Collaboration**: Automatic conflict resolution for web editing
3. **Independent Systems**: Obsidian and web platform remain decoupled
4. **Easy Sharing**: Simple URL-based access for collaborators
5. **No Sync Complexity**: Avoids complex bidirectional synchronization
6. **Performance**: Web platform optimized for real-time collaboration
7. **Privacy**: Original Obsidian notes remain local and private