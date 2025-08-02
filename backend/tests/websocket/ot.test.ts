import { OperationalTransform } from '../../src/websocket/ot';
import { Operation } from '../../src/websocket/types';

describe('OperationalTransform', () => {
  describe('apply', () => {
    test('should apply retain operation', () => {
      const content = 'Hello World';
      const operations: Operation[] = [{ retain: 11 }];
      
      const result = OperationalTransform.apply(content, operations);
      expect(result).toBe('Hello World');
    });

    test('should apply insert operation', () => {
      const content = 'Hello World';
      const operations: Operation[] = [
        { retain: 5 },
        { insert: ' Beautiful' },
        { retain: 6 }
      ];
      
      const result = OperationalTransform.apply(content, operations);
      expect(result).toBe('Hello Beautiful World');
    });

    test('should apply delete operation', () => {
      const content = 'Hello Beautiful World';
      const operations: Operation[] = [
        { retain: 5 },
        { delete: 10 },
        { retain: 6 }
      ];
      
      const result = OperationalTransform.apply(content, operations);
      expect(result).toBe('Hello World');
    });

    test('should apply complex operations', () => {
      const content = 'The quick brown fox';
      const operations: Operation[] = [
        { retain: 4 },
        { insert: 'slow ' },
        { delete: 5 },
        { retain: 1 },
        { insert: 'red' },
        { delete: 5 },
        { retain: 4 }
      ];
      
      const result = OperationalTransform.apply(content, operations);
      expect(result).toBe('The slow red fox');
    });
  });

  describe('transform', () => {
    test('should transform concurrent inserts with left priority', () => {
      const op1: Operation[] = [{ retain: 5 }, { insert: 'A' }];
      const op2: Operation[] = [{ retain: 5 }, { insert: 'B' }];
      
      const [transformed1, transformed2] = OperationalTransform.transform(op1, op2, 'left');
      
      expect(transformed1).toEqual([{ retain: 5 }, { insert: 'A' }]);
      expect(transformed2).toEqual([{ retain: 6 }, { insert: 'B' }]);
    });

    test('should transform concurrent inserts with right priority', () => {
      const op1: Operation[] = [{ retain: 5 }, { insert: 'A' }];
      const op2: Operation[] = [{ retain: 5 }, { insert: 'B' }];
      
      const [transformed1, transformed2] = OperationalTransform.transform(op1, op2, 'right');
      
      expect(transformed1).toEqual([{ retain: 6 }, { insert: 'A' }]);
      expect(transformed2).toEqual([{ retain: 5 }, { insert: 'B' }]);
    });

    test('should transform insert vs delete', () => {
      const op1: Operation[] = [{ retain: 5 }, { insert: 'NEW' }];
      const op2: Operation[] = [{ retain: 3 }, { delete: 4 }];
      
      const [transformed1, transformed2] = OperationalTransform.transform(op1, op2);
      
      expect(transformed1).toEqual([{ retain: 3 }, { insert: 'NEW' }]);
      expect(transformed2).toEqual([{ retain: 3 }, { delete: 4 }]);
    });

    test('should transform concurrent deletes', () => {
      const op1: Operation[] = [{ retain: 2 }, { delete: 3 }];
      const op2: Operation[] = [{ retain: 4 }, { delete: 2 }];
      
      const [transformed1, transformed2] = OperationalTransform.transform(op1, op2);
      
      expect(transformed1).toEqual([{ retain: 2 }, { delete: 2 }]);
      expect(transformed2).toEqual([{ retain: 2 }, { delete: 2 }]);
    });
  });

  describe('compose', () => {
    test('should compose retain operations', () => {
      const op1: Operation[] = [{ retain: 5 }];
      const op2: Operation[] = [{ retain: 3 }, { insert: 'X' }, { retain: 2 }];
      
      const composed = OperationalTransform.compose(op1, op2);
      expect(composed).toEqual([{ retain: 3 }, { insert: 'X' }, { retain: 2 }]);
    });

    test('should compose insert and delete', () => {
      const op1: Operation[] = [{ retain: 2 }, { insert: 'Hello' }, { retain: 3 }];
      const op2: Operation[] = [{ retain: 2 }, { delete: 3 }, { retain: 5 }];
      
      const composed = OperationalTransform.compose(op1, op2);
      expect(composed).toEqual([{ retain: 2 }, { insert: 'lo' }, { retain: 3 }]);
    });

    test('should compose complex operations', () => {
      const op1: Operation[] = [
        { retain: 1 },
        { insert: 'ABC' },
        { delete: 2 },
        { retain: 3 }
      ];
      const op2: Operation[] = [
        { retain: 2 },
        { delete: 1 },
        { insert: 'XY' },
        { retain: 4 }
      ];
      
      const composed = OperationalTransform.compose(op1, op2);
      expect(composed).toEqual([
        { retain: 1 },
        { insert: 'AXY' },
        { delete: 2 },
        { retain: 3 }
      ]);
    });
  });

  describe('normalize', () => {
    test('should merge consecutive retains', () => {
      const operations: Operation[] = [
        { retain: 3 },
        { retain: 2 },
        { insert: 'X' },
        { retain: 1 }
      ];
      
      const normalized = OperationalTransform.normalize(operations);
      expect(normalized).toEqual([
        { retain: 5 },
        { insert: 'X' },
        { retain: 1 }
      ]);
    });

    test('should merge consecutive inserts', () => {
      const operations: Operation[] = [
        { retain: 2 },
        { insert: 'Hello' },
        { insert: ' World' },
        { retain: 3 }
      ];
      
      const normalized = OperationalTransform.normalize(operations);
      expect(normalized).toEqual([
        { retain: 2 },
        { insert: 'Hello World' },
        { retain: 3 }
      ]);
    });

    test('should merge consecutive deletes', () => {
      const operations: Operation[] = [
        { retain: 1 },
        { delete: 3 },
        { delete: 2 },
        { retain: 4 }
      ];
      
      const normalized = OperationalTransform.normalize(operations);
      expect(normalized).toEqual([
        { retain: 1 },
        { delete: 5 },
        { retain: 4 }
      ]);
    });

    test('should remove zero-length operations', () => {
      const operations: Operation[] = [
        { retain: 0 },
        { insert: '' },
        { delete: 0 },
        { retain: 5 },
        { insert: 'Hello' }
      ];
      
      const normalized = OperationalTransform.normalize(operations);
      expect(normalized).toEqual([
        { retain: 5 },
        { insert: 'Hello' }
      ]);
    });
  });

  describe('invert', () => {
    test('should invert retain operation', () => {
      const operations: Operation[] = [{ retain: 5 }];
      const content = 'Hello';
      
      const inverted = OperationalTransform.invert(operations, content);
      expect(inverted).toEqual([{ retain: 5 }]);
    });

    test('should invert insert operation', () => {
      const operations: Operation[] = [
        { retain: 5 },
        { insert: ' World' },
        { retain: 0 }
      ];
      const content = 'Hello';
      
      const inverted = OperationalTransform.invert(operations, content);
      expect(inverted).toEqual([
        { retain: 5 },
        { delete: 6 }
      ]);
    });

    test('should invert delete operation', () => {
      const operations: Operation[] = [
        { retain: 5 },
        { delete: 6 },
        { retain: 0 }
      ];
      const content = 'Hello World!';
      
      const inverted = OperationalTransform.invert(operations, content);
      expect(inverted).toEqual([
        { retain: 5 },
        { insert: ' World' }
      ]);
    });
  });

  describe('transformPosition', () => {
    test('should transform position with insert before', () => {
      const position = 10;
      const operations: Operation[] = [
        { retain: 5 },
        { insert: 'ABC' },
        { retain: 5 }
      ];
      
      const transformed = OperationalTransform.transformPosition(position, operations);
      expect(transformed).toBe(13);
    });

    test('should transform position with insert after', () => {
      const position = 5;
      const operations: Operation[] = [
        { retain: 10 },
        { insert: 'ABC' }
      ];
      
      const transformed = OperationalTransform.transformPosition(position, operations);
      expect(transformed).toBe(5);
    });

    test('should transform position with delete before', () => {
      const position = 10;
      const operations: Operation[] = [
        { retain: 3 },
        { delete: 4 },
        { retain: 3 }
      ];
      
      const transformed = OperationalTransform.transformPosition(position, operations);
      expect(transformed).toBe(6);
    });

    test('should transform position with delete containing position', () => {
      const position = 5;
      const operations: Operation[] = [
        { retain: 2 },
        { delete: 8 },
        { retain: 0 }
      ];
      
      const transformed = OperationalTransform.transformPosition(position, operations);
      expect(transformed).toBe(2);
    });

    test('should handle priority at exact position', () => {
      const position = 5;
      const operations: Operation[] = [
        { retain: 5 },
        { insert: 'X' }
      ];
      
      const transformedAfter = OperationalTransform.transformPosition(position, operations, 'after');
      const transformedBefore = OperationalTransform.transformPosition(position, operations, 'before');
      
      expect(transformedAfter).toBe(6);
      expect(transformedBefore).toBe(5);
    });
  });

  describe('integration tests', () => {
    test('should maintain convergence property', () => {
      const initialContent = 'Hello World';
      
      // Two concurrent operations
      const op1: Operation[] = [{ retain: 5 }, { insert: ' Beautiful' }];
      const op2: Operation[] = [{ retain: 11 }, { insert: '!' }];
      
      // Apply operations in different orders
      const [op1Prime, op2Prime] = OperationalTransform.transform(op1, op2);
      
      // Path 1: op1 then op2'
      const result1 = OperationalTransform.apply(
        OperationalTransform.apply(initialContent, op1),
        op2Prime
      );
      
      // Path 2: op2 then op1'
      const result2 = OperationalTransform.apply(
        OperationalTransform.apply(initialContent, op2),
        op1Prime
      );
      
      // Results should be identical (convergence)
      expect(result1).toBe(result2);
      expect(result1).toBe('Hello Beautiful World!');
    });

    test('should handle composition correctly', () => {
      const content = 'The quick brown fox jumps';
      
      const op1: Operation[] = [
        { retain: 4 },
        { insert: 'slow ' },
        { delete: 6 }
      ];
      
      const op2: Operation[] = [
        { retain: 8 },
        { insert: ' red' },
        { delete: 6 },
        { retain: 6 }
      ];
      
      // Apply operations separately
      const intermediate = OperationalTransform.apply(content, op1);
      const separate = OperationalTransform.apply(intermediate, op2);
      
      // Apply composed operation
      const composed = OperationalTransform.compose(op1, op2);
      const combined = OperationalTransform.apply(content, composed);
      
      // Results should be identical
      expect(separate).toBe(combined);
      expect(separate).toBe('The slow red jumps');
    });
  });
});