// Operational Transformation for real-time collaborative editing
// Based on ShareJS operational transform principles

import { Operation } from './types';

export class OperationalTransform {
  
  /**
   * Transform operation against another operation
   * Based on transformation rules for concurrent operations
   */
  static transform(op1: Operation[], op2: Operation[], priority: 'left' | 'right' = 'left'): [Operation[], Operation[]] {
    const result1: Operation[] = [];
    const result2: Operation[] = [];
    
    let i1 = 0, i2 = 0;
    let op1Current = op1[i1];
    let op2Current = op2[i2];
    
    while (op1Current || op2Current) {
      // Handle retain operations
      if (op1Current?.retain && op2Current?.retain) {
        const minRetain = Math.min(op1Current.retain, op2Current.retain);
        result1.push({ retain: minRetain });
        result2.push({ retain: minRetain });
        
        op1Current.retain -= minRetain;
        op2Current.retain -= minRetain;
        
        if (op1Current.retain === 0) {
          i1++;
          op1Current = op1[i1];
        }
        if (op2Current.retain === 0) {
          i2++;
          op2Current = op2[i2];
        }
      }
      // Insert vs Insert
      else if (op1Current?.insert && op2Current?.insert) {
        if (priority === 'left') {
          result1.push({ insert: op1Current.insert });
          result2.push({ retain: op1Current.insert.length });
          i1++;
          op1Current = op1[i1];
        } else {
          result1.push({ retain: op2Current.insert.length });
          result2.push({ insert: op2Current.insert });
          i2++;
          op2Current = op2[i2];
        }
      }
      // Insert vs Retain
      else if (op1Current?.insert && op2Current?.retain) {
        result1.push({ insert: op1Current.insert });
        result2.push({ retain: op1Current.insert.length });
        i1++;
        op1Current = op1[i1];
      }
      // Retain vs Insert
      else if (op1Current?.retain && op2Current?.insert) {
        result1.push({ retain: op2Current.insert.length });
        result2.push({ insert: op2Current.insert });
        i2++;
        op2Current = op2[i2];
      }
      // Insert vs Delete
      else if (op1Current?.insert && op2Current?.delete) {
        result1.push({ insert: op1Current.insert });
        i1++;
        op1Current = op1[i1];
      }
      // Delete vs Insert
      else if (op1Current?.delete && op2Current?.insert) {
        result2.push({ insert: op2Current.insert });
        i2++;
        op2Current = op2[i2];
      }
      // Retain vs Delete
      else if (op1Current?.retain && op2Current?.delete) {
        const minLength = Math.min(op1Current.retain, op2Current.delete);
        result2.push({ delete: minLength });
        
        op1Current.retain -= minLength;
        op2Current.delete -= minLength;
        
        if (op1Current.retain === 0) {
          i1++;
          op1Current = op1[i1];
        }
        if (op2Current.delete === 0) {
          i2++;
          op2Current = op2[i2];
        }
      }
      // Delete vs Retain
      else if (op1Current?.delete && op2Current?.retain) {
        const minLength = Math.min(op1Current.delete, op2Current.retain);
        result1.push({ delete: minLength });
        
        op1Current.delete -= minLength;
        op2Current.retain -= minLength;
        
        if (op1Current.delete === 0) {
          i1++;
          op1Current = op1[i1];
        }
        if (op2Current.retain === 0) {
          i2++;
          op2Current = op2[i2];
        }
      }
      // Delete vs Delete
      else if (op1Current?.delete && op2Current?.delete) {
        const minLength = Math.min(op1Current.delete, op2Current.delete);
        
        op1Current.delete -= minLength;
        op2Current.delete -= minLength;
        
        if (op1Current.delete === 0) {
          i1++;
          op1Current = op1[i1];
        }
        if (op2Current.delete === 0) {
          i2++;
          op2Current = op2[i2];
        }
      }
      // Handle only op1 remaining
      else if (op1Current && !op2Current) {
        result1.push({ ...op1Current });
        i1++;
        op1Current = op1[i1];
      }
      // Handle only op2 remaining
      else if (!op1Current && op2Current) {
        result2.push({ ...op2Current });
        i2++;
        op2Current = op2[i2];
      }
      else {
        // Should not reach here
        break;
      }
    }
    
    return [this.normalize(result1), this.normalize(result2)];
  }

  /**
   * Apply operation to text content
   */
  static apply(content: string, operations: Operation[]): string {
    let result = content;
    let position = 0;
    
    for (const op of operations) {
      if (op.retain && typeof op.retain === 'number') {
        position += op.retain;
      } else if (op.insert && typeof op.insert === 'string') {
        result = result.slice(0, position) + op.insert + result.slice(position);
        position += op.insert.length;
      } else if (op.delete && typeof op.delete === 'number') {
        result = result.slice(0, position) + result.slice(position + op.delete);
      }
    }
    
    return result;
  }

  /**
   * Compose two operations into one
   */
  static compose(op1: Operation[], op2: Operation[]): Operation[] {
    const result: Operation[] = [];
    let i1 = 0, i2 = 0;
    let op1Current: Operation | undefined = op1[i1] ? { ...op1[i1] } : undefined;
    let op2Current: Operation | undefined = op2[i2] ? { ...op2[i2] } : undefined;
    
    while (op1Current || op2Current) {
      if (op1Current?.delete) {
        result.push({ delete: op1Current.delete });
        i1++;
        op1Current = op1[i1] ? { ...op1[i1] } : undefined;
      } else if (op2Current?.insert) {
        result.push({ insert: op2Current.insert });
        i2++;
        op2Current = op2[i2] ? { ...op2[i2] } : undefined;
      } else if (op1Current?.retain && op2Current?.retain) {
        const minRetain = Math.min(op1Current.retain, op2Current.retain);
        result.push({ retain: minRetain });
        
        op1Current.retain -= minRetain;
        op2Current.retain -= minRetain;
        
        if (op1Current.retain === 0) {
          i1++;
          op1Current = op1[i1] ? { ...op1[i1] } : undefined;
        }
        if (op2Current.retain === 0) {
          i2++;
          op2Current = op2[i2] ? { ...op2[i2] } : undefined;
        }
      } else if (op1Current?.retain && op2Current?.delete) {
        const minLength = Math.min(op1Current.retain, op2Current.delete);
        result.push({ delete: minLength });
        
        op1Current.retain -= minLength;
        op2Current.delete -= minLength;
        
        if (op1Current.retain === 0) {
          i1++;
          op1Current = op1[i1] ? { ...op1[i1] } : undefined;
        }
        if (op2Current.delete === 0) {
          i2++;
          op2Current = op2[i2] ? { ...op2[i2] } : undefined;
        }
      } else if (op1Current?.insert && op2Current?.retain) {
        const insertLength = op1Current.insert.length;
        const retainLength = Math.min(insertLength, op2Current.retain);
        
        if (retainLength === insertLength) {
          result.push({ insert: op1Current.insert });
          op2Current.retain -= insertLength;
          
          i1++;
          op1Current = op1[i1] ? { ...op1[i1] } : undefined;
          
          if (op2Current.retain === 0) {
            i2++;
            op2Current = op2[i2] ? { ...op2[i2] } : undefined;
          }
        } else {
          result.push({ insert: op1Current.insert.slice(0, retainLength) });
          op1Current.insert = op1Current.insert.slice(retainLength);
          
          i2++;
          op2Current = op2[i2] ? { ...op2[i2] } : undefined;
        }
      } else if (op1Current?.insert && op2Current?.delete) {
        const insertLength = op1Current.insert.length;
        const deleteLength = Math.min(insertLength, op2Current.delete);
        
        op1Current.insert = op1Current.insert.slice(deleteLength);
        op2Current.delete -= deleteLength;
        
        if (op1Current.insert.length === 0) {
          i1++;
          op1Current = op1[i1] ? { ...op1[i1] } : undefined;
        }
        if (op2Current.delete === 0) {
          i2++;
          op2Current = op2[i2] ? { ...op2[i2] } : undefined;
        }
      } else if (op1Current) {
        result.push({ ...op1Current });
        i1++;
        op1Current = op1[i1] ? { ...op1[i1] } : undefined;
      } else if (op2Current) {
        result.push({ ...op2Current });
        i2++;
        op2Current = op2[i2] ? { ...op2[i2] } : undefined;
      }
    }
    
    return this.normalize(result);
  }

  /**
   * Normalize operations by merging consecutive operations of the same type
   */
  static normalize(operations: Operation[]): Operation[] {
    const result: Operation[] = [];
    
    for (const op of operations) {
      const last = result[result.length - 1];
      
      if (last && op.retain && last.retain) {
        last.retain += op.retain;
      } else if (last && op.insert && last.insert) {
        last.insert += op.insert;
      } else if (last && op.delete && last.delete) {
        last.delete += op.delete;
      } else if (op.retain || op.insert || op.delete) {
        result.push({ ...op });
      }
    }
    
    return result.filter(op => 
      (op.retain && op.retain > 0) ||
      (op.insert && op.insert.length > 0) ||
      (op.delete && op.delete > 0)
    );
  }

  /**
   * Invert an operation (for undo functionality)
   */
  static invert(operations: Operation[], content: string): Operation[] {
    const result: Operation[] = [];
    let position = 0;
    
    for (const op of operations) {
      if (op.retain && typeof op.retain === 'number') {
        result.push({ retain: op.retain });
        position += op.retain;
      } else if (op.insert && typeof op.insert === 'string') {
        result.push({ delete: op.insert.length });
      } else if (op.delete && typeof op.delete === 'number') {
        const deletedText = content.slice(position, position + op.delete);
        result.push({ insert: deletedText });
        position += op.delete;
      }
    }
    
    return this.normalize(result);
  }

  /**
   * Transform a position through an operation
   */
  static transformPosition(position: number, operations: Operation[], priority: 'before' | 'after' = 'after'): number {
    let result = position;
    let offset = 0;
    
    for (const op of operations) {
      if (op.retain && typeof op.retain === 'number') {
        offset += op.retain;
      } else if (op.insert && typeof op.insert === 'string') {
        if (offset < result || (offset === result && priority === 'after')) {
          result += op.insert.length;
        }
      } else if (op.delete && typeof op.delete === 'number') {
        if (offset < result) {
          result = Math.max(result - op.delete, offset);
        }
        offset += op.delete;
      }
    }
    
    return result;
  }
}