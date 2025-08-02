import { HighlightManager, HighlightRange } from '../../src/websocket/highlights';

describe('HighlightManager', () => {
  let highlightManager: HighlightManager;

  beforeEach(() => {
    highlightManager = new HighlightManager(30000, 10000); // 30s duration, 10s fade start
  });

  describe('addInsertHighlight', () => {
    test('should add a new highlight for inserted text', () => {
      highlightManager.addInsertHighlight(
        5, // start
        10, // length
        'Alice',
        '#FF0000',
        'op-123'
      );

      const highlights = highlightManager.getCurrentHighlights();
      expect(highlights).toHaveLength(1);
      expect(highlights[0]).toMatchObject({
        start: 5,
        end: 15,
        contributorName: 'Alice',
        contributorColor: '#FF0000',
        intensity: 1,
        operationId: 'op-123'
      });
    });

    test('should add multiple highlights from different contributors', () => {
      highlightManager.addInsertHighlight(0, 5, 'Alice', '#FF0000', 'op-1');
      highlightManager.addInsertHighlight(10, 5, 'Bob', '#00FF00', 'op-2');

      const highlights = highlightManager.getCurrentHighlights();
      expect(highlights).toHaveLength(2);
      expect(highlights[0].contributorName).toBe('Alice');
      expect(highlights[1].contributorName).toBe('Bob');
    });
  });

  describe('handleDeleteOperation', () => {
    beforeEach(() => {
      // Add some initial highlights
      highlightManager.addInsertHighlight(0, 5, 'Alice', '#FF0000', 'op-1'); // 0-5
      highlightManager.addInsertHighlight(10, 5, 'Bob', '#00FF00', 'op-2'); // 10-15
      highlightManager.addInsertHighlight(20, 5, 'Charlie', '#0000FF', 'op-3'); // 20-25
    });

    test('should remove highlight completely within deletion range', () => {
      highlightManager.handleDeleteOperation(9, 7, 'op-delete'); // Delete 9-16

      const highlights = highlightManager.getCurrentHighlights();
      expect(highlights).toHaveLength(2);
      expect(highlights.find(h => h.contributorName === 'Bob')).toBeUndefined();
    });

    test('should shift highlights after deletion', () => {
      highlightManager.handleDeleteOperation(7, 3, 'op-delete'); // Delete 7-10

      const highlights = highlightManager.getCurrentHighlights();
      const charlieHighlight = highlights.find(h => h.contributorName === 'Charlie');
      expect(charlieHighlight).toMatchObject({
        start: 17, // 20 - 3
        end: 22   // 25 - 3
      });
    });

    test('should truncate highlight that overlaps with deletion start', () => {
      highlightManager.handleDeleteOperation(12, 5, 'op-delete'); // Delete 12-17

      const highlights = highlightManager.getCurrentHighlights();
      const bobHighlight = highlights.find(h => h.contributorName === 'Bob');
      expect(bobHighlight).toMatchObject({
        start: 10,
        end: 12  // Truncated at deletion start
      });
    });

    test('should shift highlight that starts within deletion but extends beyond', () => {
      highlightManager.addInsertHighlight(14, 10, 'David', '#FFFF00', 'op-4'); // 14-24
      highlightManager.handleDeleteOperation(12, 5, 'op-delete'); // Delete 12-17

      const highlights = highlightManager.getCurrentHighlights();
      const davidHighlight = highlights.find(h => h.contributorName === 'David');
      expect(davidHighlight).toMatchObject({
        start: 12,
        end: 19  // 24 - 5
      });
    });
  });

  describe('getCurrentHighlights', () => {
    test('should return highlights sorted by position', () => {
      highlightManager.addInsertHighlight(20, 5, 'Charlie', '#0000FF', 'op-3');
      highlightManager.addInsertHighlight(5, 5, 'Alice', '#FF0000', 'op-1');
      highlightManager.addInsertHighlight(10, 5, 'Bob', '#00FF00', 'op-2');

      const highlights = highlightManager.getCurrentHighlights();
      expect(highlights[0].contributorName).toBe('Alice');
      expect(highlights[1].contributorName).toBe('Bob');
      expect(highlights[2].contributorName).toBe('Charlie');
    });

    test('should exclude expired highlights', () => {
      const shortManager = new HighlightManager(100, 50); // Very short duration
      
      shortManager.addInsertHighlight(0, 5, 'Alice', '#FF0000', 'op-1');
      
      let highlights = shortManager.getCurrentHighlights();
      expect(highlights).toHaveLength(1);

      // Wait for expiration
      setTimeout(() => {
        highlights = shortManager.getCurrentHighlights();
        expect(highlights).toHaveLength(0);
      }, 150);
    });

    test('should calculate intensity based on age', (done) => {
      const manager = new HighlightManager(1000, 500); // 1s duration, 0.5s fade start
      
      manager.addInsertHighlight(0, 5, 'Alice', '#FF0000', 'op-1');
      
      // Immediately should have full intensity
      let highlights = manager.getCurrentHighlights();
      expect(highlights[0].intensity).toBe(1);
      
      // After fade start time, should have reduced intensity
      setTimeout(() => {
        highlights = manager.getCurrentHighlights();
        expect(highlights[0].intensity).toBeLessThan(1);
        expect(highlights[0].intensity).toBeGreaterThan(0);
        done();
      }, 600);
    });
  });

  describe('getContributorHighlights', () => {
    beforeEach(() => {
      highlightManager.addInsertHighlight(0, 5, 'Alice', '#FF0000', 'op-1');
      highlightManager.addInsertHighlight(10, 5, 'Bob', '#00FF00', 'op-2');
      highlightManager.addInsertHighlight(20, 5, 'Alice', '#FF0000', 'op-3');
    });

    test('should return highlights for specific contributor', () => {
      const aliceHighlights = highlightManager.getContributorHighlights('Alice');
      expect(aliceHighlights).toHaveLength(2);
      expect(aliceHighlights[0].start).toBe(0);
      expect(aliceHighlights[1].start).toBe(20);
    });

    test('should return empty array for non-existent contributor', () => {
      const highlights = highlightManager.getContributorHighlights('NonExistent');
      expect(highlights).toHaveLength(0);
    });
  });

  describe('getHighlightsInRange', () => {
    beforeEach(() => {
      highlightManager.addInsertHighlight(0, 5, 'Alice', '#FF0000', 'op-1');   // 0-5
      highlightManager.addInsertHighlight(10, 5, 'Bob', '#00FF00', 'op-2');    // 10-15
      highlightManager.addInsertHighlight(20, 5, 'Charlie', '#0000FF', 'op-3'); // 20-25
    });

    test('should return highlights that overlap with range', () => {
      const highlights = highlightManager.getHighlightsInRange(8, 18);
      expect(highlights).toHaveLength(1);
      expect(highlights[0].contributorName).toBe('Bob');
    });

    test('should return multiple overlapping highlights', () => {
      const highlights = highlightManager.getHighlightsInRange(3, 23);
      expect(highlights).toHaveLength(3);
    });

    test('should return empty array for non-overlapping range', () => {
      const highlights = highlightManager.getHighlightsInRange(30, 35);
      expect(highlights).toHaveLength(0);
    });
  });

  describe('mergeOverlappingHighlights', () => {
    test('should merge overlapping highlights from same contributor', () => {
      highlightManager.addInsertHighlight(0, 5, 'Alice', '#FF0000', 'op-1');  // 0-5
      highlightManager.addInsertHighlight(3, 5, 'Alice', '#FF0000', 'op-2');  // 3-8 (overlaps)
      highlightManager.addInsertHighlight(10, 5, 'Bob', '#00FF00', 'op-3');   // 10-15

      highlightManager.mergeOverlappingHighlights();

      const highlights = highlightManager.getCurrentHighlights();
      expect(highlights).toHaveLength(2);
      
      const aliceHighlight = highlights.find(h => h.contributorName === 'Alice');
      expect(aliceHighlight).toMatchObject({
        start: 0,
        end: 8  // Merged range
      });
    });

    test('should not merge highlights from different contributors', () => {
      highlightManager.addInsertHighlight(0, 5, 'Alice', '#FF0000', 'op-1');  // 0-5
      highlightManager.addInsertHighlight(3, 5, 'Bob', '#00FF00', 'op-2');    // 3-8 (overlaps but different contributor)

      highlightManager.mergeOverlappingHighlights();

      const highlights = highlightManager.getCurrentHighlights();
      expect(highlights).toHaveLength(2); // Should remain separate
    });

    test('should merge adjacent highlights from same contributor', () => {
      highlightManager.addInsertHighlight(0, 5, 'Alice', '#FF0000', 'op-1');  // 0-5
      highlightManager.addInsertHighlight(5, 5, 'Alice', '#FF0000', 'op-2');  // 5-10 (adjacent)

      highlightManager.mergeOverlappingHighlights();

      const highlights = highlightManager.getCurrentHighlights();
      expect(highlights).toHaveLength(1);
      expect(highlights[0]).toMatchObject({
        start: 0,
        end: 10
      });
    });
  });

  describe('getStats', () => {
    test('should return correct statistics', () => {
      highlightManager.addInsertHighlight(0, 5, 'Alice', '#FF0000', 'op-1');
      highlightManager.addInsertHighlight(10, 5, 'Bob', '#00FF00', 'op-2');
      highlightManager.addInsertHighlight(20, 5, 'Alice', '#FF0000', 'op-3');

      const stats = highlightManager.getStats();
      expect(stats).toMatchObject({
        totalHighlights: 3,
        contributorCount: 2
      });
      expect(stats.oldestHighlight).toBeInstanceOf(Date);
      expect(stats.newestHighlight).toBeInstanceOf(Date);
    });

    test('should return zero stats for empty highlights', () => {
      const stats = highlightManager.getStats();
      expect(stats).toMatchObject({
        totalHighlights: 0,
        contributorCount: 0,
        oldestHighlight: undefined,
        newestHighlight: undefined
      });
    });
  });

  describe('clearAllHighlights', () => {
    test('should remove all highlights', () => {
      highlightManager.addInsertHighlight(0, 5, 'Alice', '#FF0000', 'op-1');
      highlightManager.addInsertHighlight(10, 5, 'Bob', '#00FF00', 'op-2');

      expect(highlightManager.getCurrentHighlights()).toHaveLength(2);

      highlightManager.clearAllHighlights();

      expect(highlightManager.getCurrentHighlights()).toHaveLength(0);
    });
  });
});