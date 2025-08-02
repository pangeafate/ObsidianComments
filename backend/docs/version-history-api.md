# Version History API Design

## Overview
The version history system tracks all changes made to notes, allowing users to:
- View complete history of edits
- See who made each change and when
- Compare different versions
- Restore to previous versions

## Database Schema (Already Implemented)
```sql
CREATE TABLE note_versions (
    id SERIAL PRIMARY KEY,
    share_id VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    contributor_name VARCHAR(255) NOT NULL DEFAULT 'Anonymous',
    change_summary TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    version_number INTEGER NOT NULL,
    FOREIGN KEY (share_id) REFERENCES shares(share_id) ON DELETE CASCADE
);
```

## API Endpoints

### 1. GET /api/notes/:shareId/versions
Get all versions of a note with pagination support.

**Response:**
```json
{
  "shareId": "abc123",
  "currentVersion": 5,
  "totalVersions": 5,
  "versions": [
    {
      "versionNumber": 5,
      "contributorName": "Alice",
      "changeSummary": "Added conclusions section",
      "createdAt": "2025-08-02T10:30:00Z",
      "contentPreview": "# Research Notes\n\nIntroduction...\n\n## Conclusions\nBased on..."
    },
    {
      "versionNumber": 4,
      "contributorName": "Bob",
      "changeSummary": "Fixed typos in methodology",
      "createdAt": "2025-08-02T09:15:00Z",
      "contentPreview": "# Research Notes\n\nIntroduction...\n\n## Methodology\nThe approach..."
    }
  ]
}
```

### 2. GET /api/notes/:shareId/versions/:versionNumber
Get the full content of a specific version.

**Response:**
```json
{
  "versionNumber": 3,
  "content": "# Research Notes\n\nIntroduction...",
  "contributorName": "Charlie",
  "changeSummary": "Initial draft",
  "createdAt": "2025-08-02T08:00:00Z"
}
```

### 3. GET /api/notes/:shareId/diff/:versionA/:versionB
Get differences between two versions (future enhancement).

**Response:**
```json
{
  "fromVersion": 3,
  "toVersion": 4,
  "diff": {
    "added": ["## Methodology\nThe approach..."],
    "removed": [],
    "changed": [
      {
        "line": 5,
        "from": "This is a preliminary study",
        "to": "This is a comprehensive study"
      }
    ]
  }
}
```

## Implementation Plan

### Phase 2A: Basic Version History
1. ✅ Database schema (already done)
2. ⏳ Version list endpoint
3. ⏳ Specific version endpoint
4. ⏳ Tests for version history

### Phase 2B: Enhanced Features (Future)
- Version comparison/diff
- Version restoration
- Content preview optimization
- Pagination for large histories

## Usage Scenarios

1. **View Edit History**: Users can see who edited the note and when
2. **Audit Trail**: Track changes for accountability
3. **Content Recovery**: Restore accidentally deleted content
4. **Collaboration**: See what others have contributed