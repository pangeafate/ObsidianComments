// Test note content fixtures for TDD

export const TEST_NOTES = {
  simple: {
    content: '# Simple Note\n\nThis is a simple test note.',
    title: 'Simple Note',
    expectedFrontmatter: '---\nshareId: test-share-id\nsharedAt: 2024-01-01T00:00:00.000Z\n---\n# Simple Note\n\nThis is a simple test note.'
  },
  
  withFrontmatter: {
    content: '---\ntitle: Existing Frontmatter\ntags: [test, note]\n---\n# Note with Frontmatter\n\nContent here.',
    title: 'Note with Frontmatter',
    expectedFrontmatter: '---\ntitle: Existing Frontmatter\ntags: [test, note]\nshareId: test-share-id\nsharedAt: 2024-01-01T00:00:00.000Z\n---\n# Note with Frontmatter\n\nContent here.'
  },
  
  complex: {
    content: `# Complex Note

## Section 1

This note has **bold text**, *italic text*, and \`code\`.

### Subsection

- List item 1
- List item 2
  - Nested item

## Section 2

\`\`\`typescript
function example() {
  return "Hello, world!";
}
\`\`\`

> This is a blockquote

[Link to somewhere](https://example.com)

## Math

$$E = mc^2$$

## Tags and Links

#tag1 #tag2

[[Internal Link]]

---

End of note.`,
    title: 'Complex Note'
  },
  
  emptyNote: {
    content: '',
    title: ''
  },
  
  onlyFrontmatter: {
    content: '---\ntitle: Only Frontmatter\n---',
    title: 'Only Frontmatter'
  },
  
  codeBlocksAndMath: {
    content: `# Technical Note

## Code Examples

\`\`\`javascript
const apiClient = new ApiClient({
  apiKey: 'secret-key',
  serverUrl: 'https://api.example.com'
});
\`\`\`

\`\`\`python
def share_note(content):
    return {"url": "https://share.example.com/abc123"}
\`\`\`

## Math Formulas

Inline math: $x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$

Block math:
$$\\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}$$

## Mixed Content

- Normal text
- \`inline code\`
- **Bold text**
- $inline math$`,
    title: 'Technical Note'
  }
};

export const MOCK_SHARE_RESPONSES = {
  success: {
    shareUrl: 'https://obsidiancomments.serverado.app/editor/abc123def456',
    shareId: 'abc123def456',
    createdAt: '2024-01-01T00:00:00.000Z',
    permissions: 'edit'
  },
  
  error: {
    error: 'Invalid API key',
    message: 'The provided API key is invalid or expired'
  },
  
  networkError: {
    message: 'Network request failed'
  }
};

export const MOCK_SETTINGS = {
  default: {
    apiKey: '',
    serverUrl: 'https://obsidiancomments.serverado.app',
    copyToClipboard: true,
    showNotifications: true,
    defaultPermissions: 'edit'
  },
  
  configured: {
    apiKey: 'test-api-key-12345-abcdef-valid-length',
    serverUrl: 'https://obsidiancomments.serverado.app',
    copyToClipboard: true,
    showNotifications: true,
    defaultPermissions: 'edit'
  },
  
  minimal: {
    apiKey: 'minimal-key',
    serverUrl: 'https://localhost:3000',
    copyToClipboard: false,
    showNotifications: false,
    defaultPermissions: 'view'
  }
};

export const createMockFile = (filename: string, content: string) => {
  return {
    path: filename,
    name: filename,
    basename: filename.replace(/\.[^/.]+$/, ''),
    extension: filename.includes('.') ? filename.split('.').pop() : '',
    content
  };
};

export const createMockTFile = (path: string) => {
  const name = path.split('/').pop() || '';
  return {
    path,
    name,
    basename: name.replace(/\.[^/.]+$/, ''),
    extension: name.includes('.') ? name.split('.').pop() : ''
  };
};