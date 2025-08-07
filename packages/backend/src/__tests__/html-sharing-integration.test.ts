import request from 'supertest';
import { app } from '../app';
import { prisma } from './setup';

describe('HTML Sharing Integration', () => {
  beforeEach(async () => {
    // Clean database before each test
    await prisma.document.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should support complete workflow: share -> view -> edit', async () => {
    // 1. Share note with HTML
    const shareResponse = await request(app)
      .post('/api/notes/share')
      .send({
        title: 'Integration Test Note',
        content: '# Integration Test\n\nMarkdown content',
        htmlContent: '<h1>Integration Test</h1><p>HTML content</p>'
      });

    const { shareId } = shareResponse.body;

    // 2. Retrieve for viewing (should get HTML)
    const viewResponse = await request(app)
      .get(`/api/notes/${shareId}`)
      .expect(200);

    expect(viewResponse.body).toMatchObject({
      htmlContent: '<h1>Integration Test</h1><p>HTML content</p>',
      renderMode: 'html'
    });

    // 3. Edit (should work with markdown)
    await request(app)
      .put(`/api/notes/${shareId}`)
      .send({ content: 'Updated markdown content' })
      .expect(200);

    // 4. Verify edit worked
    const afterEdit = await request(app)
      .get(`/api/notes/${shareId}`)
      .expect(200);

    expect(afterEdit.body).toMatchObject({
      content: 'Updated markdown content',
      htmlContent: '<h1>Integration Test</h1><p>HTML content</p>' // HTML preserved
    });
  });

  it('should maintain My Links functionality with proper titles', async () => {
    // Create multiple notes with explicit titles
    const notes = await Promise.all([
      request(app).post('/api/notes/share').send({
        title: 'First Note',
        content: '# Different Title\nContent 1'
      }),
      request(app).post('/api/notes/share').send({
        title: 'Second Note', 
        content: '# Another Title\nContent 2'
      })
    ]);

    // Get notes list (My Links)
    const listResponse = await request(app)
      .get('/api/notes')
      .expect(200);

    expect(listResponse.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ title: 'First Note' }),
        expect.objectContaining({ title: 'Second Note' })
      ])
    );
  });

  it('should handle mixed content types (HTML and markdown-only)', async () => {
    // Create HTML note
    const htmlResponse = await request(app)
      .post('/api/notes/share')
      .send({
        title: 'HTML Note',
        content: '# HTML Note\n\nContent',
        htmlContent: '<h1>HTML Note</h1><p>Content</p>'
      });

    // Create markdown-only note
    const mdResponse = await request(app)
      .post('/api/notes/share')
      .send({
        title: 'Markdown Note',
        content: '# Markdown Note\n\nContent'
      });

    // Both should be retrievable
    const htmlNote = await request(app)
      .get(`/api/notes/${htmlResponse.body.shareId}`)
      .expect(200);

    const mdNote = await request(app)
      .get(`/api/notes/${mdResponse.body.shareId}`)
      .expect(200);

    expect(htmlNote.body.renderMode).toBe('html');
    expect(htmlNote.body.htmlContent).toBeTruthy();
    
    expect(mdNote.body.renderMode).toBe('markdown');
    expect(mdNote.body.htmlContent).toBeNull();
  });

  it('should preserve collaboration features for all note types', async () => {
    // Create HTML note
    const response = await request(app)
      .post('/api/notes/share')
      .send({
        title: 'Collaborative Note',
        content: 'Original content',
        htmlContent: '<p>Original content</p>'
      });

    // Should have collaborative URL
    expect(response.body.collaborativeUrl).toContain('/editor/');
    
    // Should be editable
    await request(app)
      .put(`/api/notes/${response.body.shareId}`)
      .send({ content: 'Edited content' })
      .expect(200);

    // Verify edit worked
    const updated = await request(app)
      .get(`/api/notes/${response.body.shareId}`)
      .expect(200);

    expect(updated.body.content).toBe('Edited content');
  });
});