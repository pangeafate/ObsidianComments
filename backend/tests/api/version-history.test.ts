import request from 'supertest';
import { app } from '../../src/app';

describe('Version History API', () => {
  let testShareId: string;

  beforeAll(async () => {
    // Create a test note to work with
    const response = await request(app)
      .post('/api/notes/share')
      .set('Origin', 'app://obsidian.md')
      .set('Content-Type', 'application/json')
      .send({
        content: '# Initial Note\n\nThis is the first version.',
        contributorName: 'Alice'
      });

    expect(response.status).toBe(201);
    expect(response.body.shareId).toBeDefined();
    testShareId = response.body.shareId;
    console.log('Created test note with shareId:', testShareId);
  });

  describe('GET /api/notes/:shareId/versions', () => {
    test('should verify note exists first', async () => {
      // First verify the note exists
      const noteResponse = await request(app)
        .get(`/api/notes/${testShareId}`)
        .set('Origin', 'app://obsidian.md');
      
      console.log('Note response status:', noteResponse.status);
      console.log('Note response body:', noteResponse.body);
      expect(noteResponse.status).toBe(200);
    });

    test('should return version history for a note', async () => {
      const response = await request(app)
        .get(`/api/notes/${testShareId}/versions`)
        .set('Origin', 'app://obsidian.md');
      
      console.log('Version history response status:', response.status);
      console.log('Version history response body:', response.body);
      expect(response.status).toBe(200);

      expect(response.body).toMatchObject({
        shareId: testShareId,
        currentVersion: expect.any(Number),
        totalVersions: expect.any(Number),
        versions: expect.any(Array)
      });

      expect(response.body.versions.length).toBeGreaterThan(0);
      
      // Each version should have required fields
      response.body.versions.forEach((version: any) => {
        expect(version).toMatchObject({
          versionNumber: expect.any(Number),
          contributorName: expect.any(String),
          createdAt: expect.any(String),
          contentPreview: expect.any(String)
        });
      });
    });

    test('should return versions in descending order (newest first)', async () => {
      const response = await request(app)
        .get(`/api/notes/${testShareId}/versions`)
        .set('Origin', 'app://obsidian.md')
        .expect(200);

      const versions = response.body.versions;
      if (versions.length > 1) {
        for (let i = 0; i < versions.length - 1; i++) {
          expect(versions[i].versionNumber).toBeGreaterThan(versions[i + 1].versionNumber);
        }
      }
    });

    test('should return 404 for non-existent note', async () => {
      const response = await request(app)
        .get('/api/notes/non-existent-id/versions')
        .set('Origin', 'app://obsidian.md')
        .expect(404);

      expect(response.body).toMatchObject({
        error: 'Note not found'
      });
    });

    test('should include content preview (first 200 chars)', async () => {
      const response = await request(app)
        .get(`/api/notes/${testShareId}/versions`)
        .set('Origin', 'app://obsidian.md')
        .expect(200);

      response.body.versions.forEach((version: any) => {
        expect(version.contentPreview.length).toBeLessThanOrEqual(200);
      });
    });
  });

  describe('GET /api/notes/:shareId/versions/:versionNumber', () => {
    test('should return full content for specific version', async () => {
      const response = await request(app)
        .get(`/api/notes/${testShareId}/versions/1`)
        .set('Origin', 'app://obsidian.md')
        .expect(200);

      expect(response.body).toMatchObject({
        versionNumber: 1,
        content: expect.any(String),
        contributorName: expect.any(String),
        createdAt: expect.any(String)
      });

      // Content should be full, not truncated
      expect(response.body.content.length).toBeGreaterThan(0);
    });

    test('should return 404 for non-existent version', async () => {
      const response = await request(app)
        .get(`/api/notes/${testShareId}/versions/999`)
        .set('Origin', 'app://obsidian.md')
        .expect(404);

      expect(response.body).toMatchObject({
        error: 'Version not found'
      });
    });

    test('should return 404 for non-existent note', async () => {
      const response = await request(app)
        .get('/api/notes/non-existent-id/versions/1')
        .set('Origin', 'app://obsidian.md')
        .expect(404);

      expect(response.body).toMatchObject({
        error: 'Note not found'
      });
    });

    test('should include change summary if available', async () => {
      const response = await request(app)
        .get(`/api/notes/${testShareId}/versions/1`)
        .set('Origin', 'app://obsidian.md')
        .expect(200);

      if (response.body.changeSummary) {
        expect(typeof response.body.changeSummary).toBe('string');
      }
    });
  });

  describe('Version creation during note updates', () => {
    test('should create new version when note is updated', async () => {
      // First, create a note
      const createResponse = await request(app)
        .post('/api/notes/share')
        .set('Origin', 'app://obsidian.md')
        .set('Content-Type', 'application/json')
        .send({
          content: '# Version Test\n\nInitial content.',
          contributorName: 'Alice'
        });

      const shareId = createResponse.body.shareId;

      // Get initial version count
      const initialVersions = await request(app)
        .get(`/api/notes/${shareId}/versions`)
        .set('Origin', 'app://obsidian.md')
        .expect(200);

      const initialCount = initialVersions.body.totalVersions;

      // Update the note
      await request(app)
        .put(`/api/notes/${shareId}`)
        .set('Origin', 'app://obsidian.md')
        .set('Content-Type', 'application/json')
        .send({
          content: '# Version Test\n\nUpdated content with more details.',
          contributorName: 'Bob',
          changeSummary: 'Added more details'
        })
        .expect(200);

      // Check that version count increased
      const updatedVersions = await request(app)
        .get(`/api/notes/${shareId}/versions`)
        .set('Origin', 'app://obsidian.md')
        .expect(200);

      expect(updatedVersions.body.totalVersions).toBe(initialCount + 1);
      expect(updatedVersions.body.currentVersion).toBe(2);

      // Verify the new version has correct data
      const latestVersion = updatedVersions.body.versions[0]; // Should be first (newest)
      expect(latestVersion.contributorName).toBe('Bob');
      expect(latestVersion.changeSummary).toBe('Added more details');
      expect(latestVersion.versionNumber).toBe(2);
    });
  });
});