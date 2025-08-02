import request from 'supertest';
import { app } from '../../src/app';

describe('Comments API', () => {
  let testShareId: string;
  let testCommentId: number;

  beforeAll(async () => {
    // Create a test note to work with
    const response = await request(app)
      .post('/api/notes/share')
      .set('Origin', 'app://obsidian.md')
      .set('Content-Type', 'application/json')
      .send({
        content: '# Test Note for Comments\n\nThis is a test note. It has some content that we can comment on.',
        contributorName: 'TestAuthor'
      });

    expect(response.status).toBe(201);
    testShareId = response.body.shareId;
  });

  describe('POST /api/notes/:shareId/comments', () => {
    test('should create a new comment', async () => {
      const response = await request(app)
        .post(`/api/notes/${testShareId}/comments`)
        .set('Origin', 'app://obsidian.md')
        .set('Content-Type', 'application/json')
        .send({
          content: 'This is a great introduction!',
          contributorName: 'Alice',
          positionStart: 20,
          positionEnd: 45,
          versionNumber: 1
        });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        id: expect.any(Number),
        shareId: testShareId,
        contributorName: 'Alice',
        content: 'This is a great introduction!',
        positionStart: 20,
        positionEnd: 45,
        versionNumber: 1,
        contributorColor: expect.any(String),
        createdAt: expect.any(String),
        isResolved: false,
        isActive: true
      });

      testCommentId = response.body.id;
    });

    test('should create a reply to an existing comment', async () => {
      const response = await request(app)
        .post(`/api/notes/${testShareId}/comments`)
        .set('Origin', 'app://obsidian.md')
        .set('Content-Type', 'application/json')
        .send({
          content: 'I agree with Alice!',
          contributorName: 'Bob',
          positionStart: 20,
          positionEnd: 45,
          versionNumber: 1,
          parentCommentId: testCommentId
        });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        contributorName: 'Bob',
        content: 'I agree with Alice!',
        parentCommentId: testCommentId
      });
    });

    test('should require content', async () => {
      const response = await request(app)
        .post(`/api/notes/${testShareId}/comments`)
        .set('Origin', 'app://obsidian.md')
        .set('Content-Type', 'application/json')
        .send({
          contributorName: 'Alice',
          positionStart: 10,
          positionEnd: 20
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Comment content is required');
    });

    test('should require contributor name', async () => {
      const response = await request(app)
        .post(`/api/notes/${testShareId}/comments`)
        .set('Origin', 'app://obsidian.md')
        .set('Content-Type', 'application/json')
        .send({
          content: 'Test comment',
          positionStart: 10,
          positionEnd: 20
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Contributor name is required');
    });

    test('should require valid position range', async () => {
      const response = await request(app)
        .post(`/api/notes/${testShareId}/comments`)
        .set('Origin', 'app://obsidian.md')
        .set('Content-Type', 'application/json')
        .send({
          content: 'Test comment',
          contributorName: 'Alice',
          positionStart: 20,
          positionEnd: 10 // Invalid: end before start
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid position range');
    });

    test('should return 404 for non-existent note', async () => {
      const response = await request(app)
        .post('/api/notes/non-existent/comments')
        .set('Origin', 'app://obsidian.md')
        .set('Content-Type', 'application/json')
        .send({
          content: 'Test comment',
          contributorName: 'Alice',
          positionStart: 10,
          positionEnd: 20
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Note not found');
    });
  });

  describe('GET /api/notes/:shareId/comments', () => {
    test('should get all comments for a note', async () => {
      const response = await request(app)
        .get(`/api/notes/${testShareId}/comments`)
        .set('Origin', 'app://obsidian.md');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        shareId: testShareId,
        totalComments: expect.any(Number),
        comments: expect.any(Array)
      });

      expect(response.body.comments.length).toBeGreaterThan(0);
      
      // Should include the main comment with reply
      const mainComment = response.body.comments.find((c: any) => c.id === testCommentId);
      expect(mainComment).toBeDefined();
      expect(mainComment.replies).toHaveLength(1);
      expect(mainComment.replies[0].contributorName).toBe('Bob');
    });

    test('should return empty array for note with no comments', async () => {
      // Create a new note with no comments
      const noteResponse = await request(app)
        .post('/api/notes/share')
        .set('Origin', 'app://obsidian.md')
        .set('Content-Type', 'application/json')
        .send({
          content: '# Empty Note\n\nNo comments here.',
          contributorName: 'TestAuthor'
        });

      const emptyShareId = noteResponse.body.shareId;

      const response = await request(app)
        .get(`/api/notes/${emptyShareId}/comments`)
        .set('Origin', 'app://obsidian.md');

      expect(response.status).toBe(200);
      expect(response.body.comments).toHaveLength(0);
    });

    test('should return 404 for non-existent note', async () => {
      const response = await request(app)
        .get('/api/notes/non-existent/comments')
        .set('Origin', 'app://obsidian.md');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Note not found');
    });
  });

  describe('PUT /api/notes/:shareId/comments/:commentId', () => {
    test('should update a comment by its author', async () => {
      const response = await request(app)
        .put(`/api/notes/${testShareId}/comments/${testCommentId}`)
        .set('Origin', 'app://obsidian.md')
        .set('Content-Type', 'application/json')
        .send({
          content: 'This is an updated introduction comment!',
          contributorName: 'Alice'
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: testCommentId,
        content: 'This is an updated introduction comment!',
        contributorName: 'Alice'
      });
    });

    test('should not allow updating comment by different contributor', async () => {
      const response = await request(app)
        .put(`/api/notes/${testShareId}/comments/${testCommentId}`)
        .set('Origin', 'app://obsidian.md')
        .set('Content-Type', 'application/json')
        .send({
          content: 'Trying to edit someone elses comment',
          contributorName: 'Bob'
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Comment not found or you are not authorized to edit it');
    });

    test('should require content', async () => {
      const response = await request(app)
        .put(`/api/notes/${testShareId}/comments/${testCommentId}`)
        .set('Origin', 'app://obsidian.md')
        .set('Content-Type', 'application/json')
        .send({
          contributorName: 'Alice'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Comment content is required');
    });
  });

  describe('POST /api/notes/:shareId/comments/:commentId/resolve', () => {
    test('should resolve a comment by its author', async () => {
      const response = await request(app)
        .post(`/api/notes/${testShareId}/comments/${testCommentId}/resolve`)
        .set('Origin', 'app://obsidian.md')
        .set('Content-Type', 'application/json')
        .send({
          contributorName: 'Alice'
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        message: 'Comment resolved'
      });
    });

    test('should not allow resolving comment by different contributor', async () => {
      // Create a new comment to test with
      const commentResponse = await request(app)
        .post(`/api/notes/${testShareId}/comments`)
        .set('Origin', 'app://obsidian.md')
        .set('Content-Type', 'application/json')
        .send({
          content: 'Another test comment',
          contributorName: 'Charlie',
          positionStart: 50,
          positionEnd: 60
        });

      const newCommentId = commentResponse.body.id;

      const response = await request(app)
        .post(`/api/notes/${testShareId}/comments/${newCommentId}/resolve`)
        .set('Origin', 'app://obsidian.md')
        .set('Content-Type', 'application/json')
        .send({
          contributorName: 'Bob'
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Comment not found or you are not authorized to resolve it');
    });
  });

  describe('DELETE /api/notes/:shareId/comments/:commentId', () => {
    test('should delete a comment by its author', async () => {
      // Create a comment to delete
      const commentResponse = await request(app)
        .post(`/api/notes/${testShareId}/comments`)
        .set('Origin', 'app://obsidian.md')
        .set('Content-Type', 'application/json')
        .send({
          content: 'This comment will be deleted',
          contributorName: 'Diana',
          positionStart: 70,
          positionEnd: 80
        });

      const commentToDeleteId = commentResponse.body.id;

      const response = await request(app)
        .delete(`/api/notes/${testShareId}/comments/${commentToDeleteId}`)
        .set('Origin', 'app://obsidian.md')
        .set('Content-Type', 'application/json')
        .send({
          contributorName: 'Diana'
        });

      expect(response.status).toBe(204);

      // Verify comment is no longer returned in list
      const listResponse = await request(app)
        .get(`/api/notes/${testShareId}/comments`)
        .set('Origin', 'app://obsidian.md');

      const deletedComment = listResponse.body.comments.find((c: any) => c.id === commentToDeleteId);
      expect(deletedComment).toBeUndefined();
    });

    test('should not allow deleting comment by different contributor', async () => {
      // Create a comment to test with
      const commentResponse = await request(app)
        .post(`/api/notes/${testShareId}/comments`)
        .set('Origin', 'app://obsidian.md')
        .set('Content-Type', 'application/json')
        .send({
          content: 'Protected comment',
          contributorName: 'Eve',
          positionStart: 90,
          positionEnd: 100
        });

      const protectedCommentId = commentResponse.body.id;

      const response = await request(app)
        .delete(`/api/notes/${testShareId}/comments/${protectedCommentId}`)
        .set('Origin', 'app://obsidian.md')
        .set('Content-Type', 'application/json')
        .send({
          contributorName: 'Frank'
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Comment not found or you are not authorized to delete it');
    });
  });

  describe('GET /api/notes/:shareId/contributors/colors', () => {
    test('should get contributor colors for a note', async () => {
      const response = await request(app)
        .get(`/api/notes/${testShareId}/contributors/colors`)
        .set('Origin', 'app://obsidian.md');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        shareId: testShareId,
        contributors: expect.any(Array)
      });

      expect(response.body.contributors.length).toBeGreaterThan(0);
      
      // Should include colors for contributors who have commented
      const contributors = response.body.contributors;
      const aliceColor = contributors.find((c: any) => c.contributorName === 'Alice');
      expect(aliceColor).toBeDefined();
      expect(aliceColor.colorHex).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });

  describe('GET /api/notes/:shareId/contributors/:contributorName/color', () => {
    test('should get specific contributor color', async () => {
      const response = await request(app)
        .get(`/api/notes/${testShareId}/contributors/Alice/color`)
        .set('Origin', 'app://obsidian.md');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        contributorName: 'Alice',
        colorHex: expect.stringMatching(/^#[0-9A-Fa-f]{6}$/)
      });
    });

    test('should create color for new contributor', async () => {
      const response = await request(app)
        .get(`/api/notes/${testShareId}/contributors/NewUser/color`)
        .set('Origin', 'app://obsidian.md');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        contributorName: 'NewUser',
        colorHex: expect.stringMatching(/^#[0-9A-Fa-f]{6}$/)
      });
    });
  });

  describe('GET /api/notes/:shareId/comments/range/:startPos/:endPos', () => {
    test('should get comments in position range', async () => {
      const response = await request(app)
        .get(`/api/notes/${testShareId}/comments/range/15/50`)
        .set('Origin', 'app://obsidian.md');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        shareId: testShareId,
        positionRange: { start: 15, end: 50 },
        comments: expect.any(Array)
      });

      // Should include comments that overlap with the range
      expect(response.body.comments.length).toBeGreaterThan(0);
    });

    test('should return empty array for range with no comments', async () => {
      const response = await request(app)
        .get(`/api/notes/${testShareId}/comments/range/200/300`)
        .set('Origin', 'app://obsidian.md');

      expect(response.status).toBe(200);
      expect(response.body.comments).toHaveLength(0);
    });
  });
});