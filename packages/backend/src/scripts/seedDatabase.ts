import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedDatabase() {
  console.log('🌱 Seeding database with mockup document...');

  try {
    // Create a comprehensive mockup document for testing
    const mockDocument = await prisma.document.create({
      data: {
        id: 'demo-document-123',
        title: 'ObsidianComments Demo Document',
        content: `# Welcome to ObsidianComments! 🚀

This is a **collaborative Markdown editor** built with modern technologies and real-time features.

## ✨ Features to Test

### 1. Real-time Collaboration
- Open this document in multiple browser tabs
- Type simultaneously and watch changes sync in real-time
- See other users' cursors and selections

### 2. Comment System
- **Select any text** to add comments
- Create threaded discussions
- Resolve comments when done
- Comments sync across all users instantly

### 3. Rich Markdown Support
- **Bold** and *italic* text
- [Links](https://github.com/pangeafate/ObsidianComments)
- \`inline code\` and code blocks

\`\`\`javascript
// Code highlighting works too!
function collaborate() {
  return "Real-time editing is amazing!";
}
\`\`\`

### 4. Task Lists
- [x] Set up the collaborative editor
- [x] Implement real-time synchronization
- [x] Add commenting system
- [ ] Test with multiple users
- [ ] Try the version history

### 5. Version History
Use the version history feature to:
- Create snapshots of your work
- Compare different versions
- Rollback to previous states
- Track all changes over time

## 🧪 How to Test

1. **Multi-user Testing**: Open \`http://localhost:8080/share/demo-document-123\` in multiple browser tabs
2. **Add Comments**: Select text and use the comment panel on the right
3. **Real-time Editing**: Type in one tab and see changes in others
4. **User Presence**: Notice different colored cursors for each user

## 📝 Sample Content for Testing

### Lorem Ipsum Section
Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.

### Technical Documentation
This editor supports:
- **CRDT-based synchronization** with Yjs
- **WebSocket connections** via Hocuspocus
- **PostgreSQL persistence** with Prisma
- **Redis caching** for performance
- **TypeScript** for type safety

### Blockquotes
> "The best way to test collaboration is to collaborate!"
> 
> — ObsidianComments Team

---

**Happy Testing!** 🎉

Try selecting different parts of this text and adding comments. Each user gets a unique color and name automatically.`,
        metadata: {
          tags: ['demo', 'testing', 'collaboration'],
          source: 'seed-script',
          publishedBy: 'system',
          description: 'Comprehensive demo document for testing all features'
        }
      }
    });

    // Create some sample comments for testing
    await prisma.comment.createMany({
      data: [
        {
          id: 'comment-demo-1',
          documentId: mockDocument.id,
          content: 'This is a sample comment to demonstrate the commenting system!',
          author: 'Demo User',
          position: { from: 100, to: 120 },
          resolved: false
        },
        {
          id: 'comment-demo-2',
          documentId: mockDocument.id,
          content: 'Great point! This reply shows how threading works.',
          author: 'Another User',
          threadId: 'comment-demo-1',
          resolved: false
        },
        {
          id: 'comment-demo-3',
          documentId: mockDocument.id,
          content: 'This comment is resolved to show the resolved state.',
          author: 'Demo User',
          position: { from: 200, to: 250 },
          resolved: true
        }
      ]
    });

    // Create some sample users
    await prisma.user.createMany({
      data: [
        {
          id: 'user-demo-1',
          username: 'demo-user',
          displayName: 'Demo User',
          color: '#FF6B6B'
        },
        {
          id: 'user-demo-2', 
          username: 'test-collaborator',
          displayName: 'Test Collaborator',
          color: '#4ECDC4'
        },
        {
          id: 'user-demo-3',
          username: 'example-editor',
          displayName: 'Example Editor', 
          color: '#45B7D1'
        }
      ]
    });

    console.log('✅ Database seeded successfully!');
    console.log('🎯 Test URL: http://localhost:8080/share/demo-document-123');
    console.log('📊 Document ID: demo-document-123');
    console.log('📝 Title:', mockDocument.title);
    console.log('📅 Created:', mockDocument.publishedAt);

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if this script is executed directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('🏁 Seeding completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Seeding failed:', error);
      process.exit(1);
    });
}

export { seedDatabase };