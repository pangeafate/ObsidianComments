# Obsidian Selective Sharing Tool - Functional Requirements Document

**Repository**: https://github.com/pangeafate/ObsidianComments

## Executive Summary

A tool that enables Obsidian users to selectively share individual notes from their private vault via web links, allowing anyone with the link to view and collaboratively edit the content with Google account identification.

## Core Functionality

### 1. Selective Note Sharing
- **Share individual notes** from Obsidian vault without exposing entire vault
- **Generate unique shareable links** for each shared note
- **Maintain privacy** of non-shared notes (they never leave local machine)
- **One-click sharing** from within Obsidian interface

### 2. Web-Based Viewing/Editing
- **Instant read access** without authentication
- **Rich markdown rendering** with proper formatting
- **Real-time collaborative editing** when authenticated
- **Mobile-responsive** interface

### 3. Google Account Integration
- **Optional authentication** - only required for editing/commenting
- **One-click Google sign-in** for users already logged into Chrome
- **Persistent sessions** across all shared notes
- **Identity tracking** for accountability

### 4. Commenting System
- **Inline comments** on specific lines or sections
- **Thread discussions** with replies
- **Comment notifications** (optional)
- **Comment resolution** tracking

## Detailed Functional Requirements

### Note Sharing Workflow

#### 1. Share Initiation
```
User Action: Right-click note → "Share Note Online"
            OR
            Command palette → "Share current note"
            OR
            Ribbon icon click

System Response: 
- Validates note content
- Generates unique share token
- Uploads note to server
- Returns shareable URL
- Copies URL to clipboard
- Shows success notification
```

#### 2. Share Management
- **View shared notes** - List all currently shared notes
- **Update shared note** - Push changes to existing share
- **Revoke sharing** - Remove note from public access
- **View share statistics** - See view/edit counts

### Authentication Flow

#### 1. Anonymous Viewing
```
User: Opens share link
System: Displays note immediately in read-only mode
No authentication required
```

#### 2. Edit/Comment Authentication
```
User: Clicks edit button or tries to type
System: Shows Google sign-in prompt
User: One-click approval (if already signed in)
System: Enables editing, shows user identity
```

#### 3. Session Persistence
- Sessions last 30 days
- Cookie-based recognition
- Automatic re-authentication if Google session valid

### Editor Features

#### 1. Markdown Support
**Must Support:**
- Headers (H1-H6)
- Bold, italic, strikethrough
- Lists (ordered, unordered, nested)
- Code blocks with syntax highlighting
- Tables
- Links (internal and external)
- Images (embedded and linked)
- Blockquotes
- Horizontal rules

**Obsidian-Specific Features:**
- [[Wiki Links]] - Convert to web links or highlight
- Tags (#tag) - Render as highlighted text
- Callouts - Render with appropriate styling
- Math blocks - Basic LaTeX support

#### 2. Real-time Collaboration
- **Live cursor positions** of other editors
- **Conflict-free editing** using operational transforms
- **Presence indicators** showing who's viewing/editing
- **Auto-save** every 5 seconds
- **Offline support** with sync on reconnect

#### 3. Version History
- **Track all changes** with timestamps
- **View previous versions**
- **Restore earlier versions**
- **Diff visualization** between versions
- **Attribution** of changes to specific users

### Permission Model

| Action | Anonymous | Authenticated | Owner |
|--------|-----------|---------------|-------|
| View | ✅ | ✅ | ✅ |
| Edit | ❌ | ✅ | ✅ |
| Comment | ❌ | ✅ | ✅ |
| Delete Comments | ❌ | Own only | ✅ |
| View Edit History | ✅ | ✅ | ✅ |
| Restore Version | ❌ | ❌ | ✅ |
| Delete Note | ❌ | ❌ | ✅ |
| Update Share Settings | ❌ | ❌ | ✅ |

## Technical Requirements

### Performance Requirements
- **Page load time**: < 2 seconds
- **Editor initialization**: < 1 second
- **Real-time sync latency**: < 200ms
- **Support concurrent users**: 50+ per note
- **Maximum note size**: 10MB

### Security Requirements
- **HTTPS only** for all connections
- **CSRF protection** on all endpoints
- **XSS prevention** in user content
- **Rate limiting**: 100 requests/minute per IP
- **Input sanitization** for all user data
- **Secure token generation** (cryptographically random)

### Browser Support
- Chrome/Edge: Last 2 versions
- Firefox: Last 2 versions
- Safari: Last 2 versions
- Mobile browsers: iOS Safari, Chrome Android

### Accessibility Requirements
- **WCAG 2.1 AA compliance**
- **Keyboard navigation** support
- **Screen reader** compatibility
- **High contrast mode** support
- **Focus indicators** on all interactive elements

## Data Requirements

### Data Storage
- **Note content**: PostgreSQL text field
- **Version history**: Compressed diffs
- **User profiles**: Minimal Google data
- **Comments**: Structured with threading
- **Share metadata**: Access counts, timestamps

### Data Retention
- **Active shares**: Indefinite
- **Deleted shares**: 30 days (soft delete)
- **Version history**: Last 100 versions or 90 days
- **User data**: Until explicitly deleted
- **Access logs**: 90 days

### Data Privacy
- **No tracking pixels** or analytics by default
- **User data minimization** - only essential fields
- **Right to deletion** - users can remove their data
- **No data sharing** with third parties
- **Local vault privacy** - unshared notes never uploaded

## User Interface Requirements

### Desktop Web Interface
```
┌─────────────────────────────────────────┐
│ [Logo] Note Title          [Share] [···] │
├─────────────────────────────────────────┤
│ Viewing as: John Doe (john@gmail.com)   │
├─────────────────────────────────────────┤
│                                         │
│  # Note Content                    [💬] │
│                                         │
│  Markdown content renders here...       │
│                                         │
│                              Comments → │
│                                         │
└─────────────────────────────────────────┘
```

### Mobile Interface
- **Responsive design** adapting to screen size
- **Touch-optimized** controls
- **Swipe gestures** for navigation
- **Bottom sheet** for comments
- **Floating action button** for edit mode

### Obsidian Plugin Interface
- **Context menu** integration
- **Command palette** commands
- **Ribbon icon** for quick access
- **Settings tab** for configuration
- **Status bar** indicator for shared notes

## Integration Requirements

### Obsidian Integration
- **Plugin API** compatibility
- **Vault adapter** for file access
- **Event hooks** for file changes
- **Settings sync** with Obsidian config
- **Theme compatibility**

### Google OAuth 2.0
- **OAuth 2.0** flow implementation
- **Scope**: Profile and email only
- **Token refresh** handling
- **Revocation** support

### API Design
```
POST   /api/notes/share      - Create share
GET    /api/notes/:token     - Get note content
PUT    /api/notes/:token     - Update note
DELETE /api/notes/:token     - Remove share
POST   /api/notes/:token/comments - Add comment
GET    /api/auth/google      - Google OAuth
POST   /api/auth/logout      - End session
```

## Operational Requirements

### Source Control
- **Repository**: https://github.com/pangeafate/ObsidianComments
- **Branching Strategy**: 
  - `main` - Production-ready code
  - `develop` - Integration branch
  - `feature/*` - Individual features
- **Version Control**: Semantic versioning (v1.0.0)
- **License**: To be determined
- **README**: Comprehensive setup and usage instructions

### Initial Repository Structure
```
ObsidianComments/
├── README.md
├── LICENSE
├── .gitignore
├── .github/
│   ├── workflows/
│   │   ├── test.yml
│   │   └── deploy.yml
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md
│   │   └── feature_request.md
│   └── pull_request_template.md
├── backend/
├── frontend/
├── obsidian-plugin/
├── docs/
│   ├── ARCHITECTURE.md
│   ├── API.md
│   ├── SETUP.md
│   └── CONTRIBUTING.md
├── scripts/
│   ├── setup.sh
│   └── deploy.sh
├── docker-compose.yml
└── TDD_RULES.md
```

### Deployment
- **Docker** containerization
- **Environment** configuration via .env
- **Health checks** endpoint
- **Graceful shutdown** handling
- **Zero-downtime** deployments

### Monitoring
- **Uptime monitoring** (99.9% target)
- **Error tracking** with stack traces
- **Performance metrics** collection
- **User activity** dashboards
- **Resource usage** alerts

### Backup & Recovery
- **Automated daily backups**
- **Point-in-time recovery** capability
- **Backup testing** monthly
- **Disaster recovery** plan
- **Data export** functionality

## Constraints and Limitations

### Technical Constraints
- **No browser storage** for sensitive data
- **Single database** (no sharding initially)
- **No file attachments** in first version
- **Text-only** content (no binary files)
- **English UI** only initially

### Repository Requirements
- **GitHub Repository**: https://github.com/pangeafate/ObsidianComments
- **Open Source**: Code must be publicly accessible
- **Issue Tracking**: Use GitHub Issues for bug reports and features
- **Pull Requests**: All changes via PR with review
- **CI/CD**: GitHub Actions for automated testing and deployment
- **Documentation**: Wiki for detailed documentation
- **Releases**: Tagged releases with changelogs
- **Commit Convention**: 
  - `test: ` - Test additions/modifications
  - `feat: ` - New features
  - `fix: ` - Bug fixes
  - `docs: ` - Documentation changes
  - `refactor: ` - Code refactoring
  - `chore: ` - Maintenance tasks

### Business Constraints
- **Free tier**: Up to 100 shared notes
- **Note size limit**: 10MB per note
- **API rate limits**: 1000 requests/hour
- **Concurrent editors**: 50 per note
- **Share link expiration**: Optional, max 1 year

## Success Metrics

### Primary Metrics
- **Time to share**: < 5 seconds from initiation
- **Authentication success rate**: > 95%
- **Page load performance**: P95 < 2 seconds
- **Zero data breaches**
- **99.9% uptime**

### User Satisfaction Metrics
- **Task completion rate**: > 90%
- **Error rate**: < 1%
- **Time to first edit**: < 30 seconds
- **Return user rate**: > 60%

## Future Enhancements (Out of Scope v1)

- Two-way sync back to Obsidian
- File attachment support
- Custom domains for shares
- Team/organization accounts
- Advanced permissions (read-only shares)
- API for third-party integrations
- Electron desktop app
- Offline-first PWA
- End-to-end encryption option
- Integration with other note-taking tools

## Acceptance Criteria

### Repository Setup
- [ ] Repository created at https://github.com/pangeafate/ObsidianComments
- [ ] README.md with setup instructions
- [ ] LICENSE file chosen and added
- [ ] .gitignore for Node.js/JavaScript projects
- [ ] GitHub Actions CI/CD pipeline configured
- [ ] Branch protection rules enabled for main branch
- [ ] Issue templates for bugs and features
- [ ] Contributing guidelines documented

### Minimum Viable Product (MVP)
- [ ] User can share a note from Obsidian
- [ ] Anyone with link can view the note
- [ ] Google authentication works with one click
- [ ] Authenticated users can edit
- [ ] Changes persist and sync
- [ ] Basic comment functionality
- [ ] Mobile-responsive design
- [ ] 80% test coverage
- [ ] Deployed to production VM

### Definition of Done
- All acceptance criteria met
- Tests written and passing (TDD)
- Code reviewed and approved
- Documentation updated
- Deployed to production
- Monitoring configured
- Performance benchmarks met
- Code pushed to GitHub repository
- Release tagged in GitHub