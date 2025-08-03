import { Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TrackChanges } from '../TrackChanges';
import { generateUserColor } from '../../utils/userColors';

describe('TrackChanges Extension', () => {
  let editor: Editor;

  beforeEach(() => {
    editor = new Editor({
      extensions: [
        StarterKit,
        TrackChanges.configure({
          userId: 'user-1',
          userName: 'Test User'
        })
      ],
      content: ''
    });
  });

  afterEach(() => {
    editor.destroy();
  });

  describe('Text insertion tracking', () => {
    it('should mark new text with track changes', () => {
      editor.commands.insertContent('Hello world');
      editor.commands.selectAll();
      editor.commands.addTrackChanges();
      
      let hasTrackChanges = false;
      editor.state.doc.descendants((node) => {
        if (node.marks.some(mark => mark.type.name === 'trackChange')) {
          hasTrackChanges = true;
        }
      });

      expect(hasTrackChanges).toBeTruthy();
    });

    it('should store user information in track change marks', () => {
      editor.commands.insertContent('Test text');
      editor.commands.selectAll();
      editor.commands.addTrackChanges();
      
      let foundMark = null;
      editor.state.doc.descendants((node) => {
        const trackChangeMark = node.marks.find(mark => mark.type.name === 'trackChange');
        if (trackChangeMark) {
          foundMark = trackChangeMark;
        }
      });

      expect(foundMark).toBeTruthy();
      expect(foundMark?.attrs.userId).toBe('user-1');
      expect(foundMark?.attrs.userName).toBe('Test User');
      expect(foundMark?.attrs.timestamp).toBeDefined();
    });

    it('should assign consistent colors for the same user', () => {
      const color1 = generateUserColor('user-1');
      const color2 = generateUserColor('user-1');
      expect(color1).toBe(color2);
    });

    it('should assign different colors for different users', () => {
      const color1 = generateUserColor('user-1');
      const color2 = generateUserColor('user-2');
      expect(color1).not.toBe(color2);
    });
  });

  describe('Accept all changes functionality', () => {
    it('should remove all track change marks', () => {
      editor.commands.insertContent('Tracked text');
      editor.commands.selectAll();
      editor.commands.addTrackChanges();
      
      // Verify track changes exist
      let hasTrackChanges = false;
      editor.state.doc.descendants((node) => {
        if (node.marks.some(mark => mark.type.name === 'trackChange')) {
          hasTrackChanges = true;
        }
      });
      expect(hasTrackChanges).toBe(true);

      // Accept all changes
      editor.commands.acceptAllChanges();

      // Verify track changes are removed
      hasTrackChanges = false;
      editor.state.doc.descendants((node) => {
        if (node.marks.some(mark => mark.type.name === 'trackChange')) {
          hasTrackChanges = true;
        }
      });
      expect(hasTrackChanges).toBe(false);
    });

    it('should preserve text content when accepting changes', () => {
      const content = 'This is tracked content';
      editor.commands.insertContent(content);
      editor.commands.selectAll();
      editor.commands.addTrackChanges();
      editor.commands.acceptAllChanges();
      
      expect(editor.getText()).toBe(content);
    });
  });

  describe('Multiple users tracking', () => {
    it('should differentiate changes from different users', () => {
      // Create two editors with different users
      const editor2 = new Editor({
        extensions: [
          StarterKit,
          TrackChanges.configure({
            userId: 'user-2',
            userName: 'User 2'
          })
        ],
        content: ''
      });

      // User 1 adds text
      editor.commands.insertContent('User 1 text');
      editor.commands.selectAll();
      editor.commands.addTrackChanges();
      
      // User 2 adds text
      editor2.commands.insertContent('User 2 text');
      editor2.commands.selectAll();
      editor2.commands.addTrackChanges();

      // Check both editors have different user IDs
      let user1Id = null;
      let user2Id = null;

      editor.state.doc.descendants((node) => {
        node.marks.forEach(mark => {
          if (mark.type.name === 'trackChange') {
            user1Id = mark.attrs.userId;
          }
        });
      });

      editor2.state.doc.descendants((node) => {
        node.marks.forEach(mark => {
          if (mark.type.name === 'trackChange') {
            user2Id = mark.attrs.userId;
          }
        });
      });

      expect(user1Id).toBe('user-1');
      expect(user2Id).toBe('user-2');
      expect(user1Id).not.toBe(user2Id);

      editor2.destroy();
    });
  });
});