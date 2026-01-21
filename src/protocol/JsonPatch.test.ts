/**
 * JSON Patch Tests (UOW-0208)
 *
 * Tests for RFC 6902 JSON Patch implementation.
 */

import { describe, it, expect } from 'vitest';
import {
  applyPatch,
  validatePatch,
  PatchOperationSchema,
  PatchDocumentSchema,
  type PatchDocument,
  type PatchState,
} from './JsonPatch.js';

describe('JsonPatch', () => {
  describe('PatchOperationSchema', () => {
    it('should validate add operation', () => {
      const op = { op: 'add', path: '/foo', value: 'bar' };
      const result = PatchOperationSchema.safeParse(op);
      expect(result.success).toBe(true);
    });

    it('should validate remove operation', () => {
      const op = { op: 'remove', path: '/foo' };
      const result = PatchOperationSchema.safeParse(op);
      expect(result.success).toBe(true);
    });

    it('should validate replace operation', () => {
      const op = { op: 'replace', path: '/foo', value: 'baz' };
      const result = PatchOperationSchema.safeParse(op);
      expect(result.success).toBe(true);
    });

    it('should validate move operation', () => {
      const op = { op: 'move', from: '/foo', path: '/bar' };
      const result = PatchOperationSchema.safeParse(op);
      expect(result.success).toBe(true);
    });

    it('should validate copy operation', () => {
      const op = { op: 'copy', from: '/foo', path: '/bar' };
      const result = PatchOperationSchema.safeParse(op);
      expect(result.success).toBe(true);
    });

    it('should validate test operation', () => {
      const op = { op: 'test', path: '/foo', value: 'bar' };
      const result = PatchOperationSchema.safeParse(op);
      expect(result.success).toBe(true);
    });

    it('should reject invalid operation', () => {
      const op = { op: 'invalid', path: '/foo' };
      const result = PatchOperationSchema.safeParse(op);
      expect(result.success).toBe(false);
    });
  });

  describe('PatchDocumentSchema', () => {
    it('should validate complete patch document', () => {
      const doc = {
        version: 1,
        sequence: 1,
        operations: [
          { op: 'add', path: '/foo', value: 'bar' },
        ],
      };
      const result = PatchDocumentSchema.safeParse(doc);
      expect(result.success).toBe(true);
    });

    it('should reject document without version', () => {
      const doc = {
        sequence: 1,
        operations: [],
      };
      const result = PatchDocumentSchema.safeParse(doc);
      expect(result.success).toBe(false);
    });

    it('should reject document without sequence', () => {
      const doc = {
        version: 1,
        operations: [],
      };
      const result = PatchDocumentSchema.safeParse(doc);
      expect(result.success).toBe(false);
    });
  });

  describe('validatePatch', () => {
    it('should return parsed document for valid input', () => {
      const input = {
        version: 1,
        sequence: 1,
        operations: [{ op: 'add', path: '/x', value: 1 }],
      };
      const result = validatePatch(input);
      expect(result).not.toBeNull();
      expect(result?.version).toBe(1);
    });

    it('should return null for invalid input', () => {
      const input = { invalid: true };
      const result = validatePatch(input);
      expect(result).toBeNull();
    });
  });

  describe('applyPatch - add operation', () => {
    const state: PatchState = { version: 1, lastSequence: 0 };

    it('should add value to object', () => {
      const doc = { a: 1 };
      const patch: PatchDocument = {
        version: 1,
        sequence: 1,
        operations: [{ op: 'add', path: '/b', value: 2 }],
      };
      const result = applyPatch(doc, patch, state);
      expect(result.success).toBe(true);
      expect(result.document).toEqual({ a: 1, b: 2 });
    });

    it('should add value to array', () => {
      const doc = { arr: [1, 2] };
      const patch: PatchDocument = {
        version: 1,
        sequence: 1,
        operations: [{ op: 'add', path: '/arr/1', value: 99 }],
      };
      const result = applyPatch(doc, patch, state);
      expect(result.success).toBe(true);
      expect(result.document).toEqual({ arr: [1, 99, 2] });
    });

    it('should add to end of array with -', () => {
      const doc = { arr: [1, 2] };
      const patch: PatchDocument = {
        version: 1,
        sequence: 1,
        operations: [{ op: 'add', path: '/arr/-', value: 3 }],
      };
      const result = applyPatch(doc, patch, state);
      expect(result.success).toBe(true);
      expect(result.document).toEqual({ arr: [1, 2, 3] });
    });

    it('should add nested value', () => {
      const doc = { a: { b: 1 } };
      const patch: PatchDocument = {
        version: 1,
        sequence: 1,
        operations: [{ op: 'add', path: '/a/c', value: 2 }],
      };
      const result = applyPatch(doc, patch, state);
      expect(result.success).toBe(true);
      expect(result.document).toEqual({ a: { b: 1, c: 2 } });
    });

    it('should replace root with empty path', () => {
      const doc = { a: 1 };
      const patch: PatchDocument = {
        version: 1,
        sequence: 1,
        operations: [{ op: 'add', path: '', value: { b: 2 } }],
      };
      const result = applyPatch(doc, patch, state);
      expect(result.success).toBe(true);
      expect(result.document).toEqual({ b: 2 });
    });
  });

  describe('applyPatch - remove operation', () => {
    const state: PatchState = { version: 1, lastSequence: 0 };

    it('should remove property from object', () => {
      const doc = { a: 1, b: 2 };
      const patch: PatchDocument = {
        version: 1,
        sequence: 1,
        operations: [{ op: 'remove', path: '/b' }],
      };
      const result = applyPatch(doc, patch, state);
      expect(result.success).toBe(true);
      expect(result.document).toEqual({ a: 1 });
    });

    it('should remove element from array', () => {
      const doc = { arr: [1, 2, 3] };
      const patch: PatchDocument = {
        version: 1,
        sequence: 1,
        operations: [{ op: 'remove', path: '/arr/1' }],
      };
      const result = applyPatch(doc, patch, state);
      expect(result.success).toBe(true);
      expect(result.document).toEqual({ arr: [1, 3] });
    });

    it('should remove nested property', () => {
      const doc = { a: { b: 1, c: 2 } };
      const patch: PatchDocument = {
        version: 1,
        sequence: 1,
        operations: [{ op: 'remove', path: '/a/b' }],
      };
      const result = applyPatch(doc, patch, state);
      expect(result.success).toBe(true);
      expect(result.document).toEqual({ a: { c: 2 } });
    });
  });

  describe('applyPatch - replace operation', () => {
    const state: PatchState = { version: 1, lastSequence: 0 };

    it('should replace existing value', () => {
      const doc = { a: 1 };
      const patch: PatchDocument = {
        version: 1,
        sequence: 1,
        operations: [{ op: 'replace', path: '/a', value: 99 }],
      };
      const result = applyPatch(doc, patch, state);
      expect(result.success).toBe(true);
      expect(result.document).toEqual({ a: 99 });
    });

    it('should fail if path does not exist', () => {
      const doc = { a: 1 };
      const patch: PatchDocument = {
        version: 1,
        sequence: 1,
        operations: [{ op: 'replace', path: '/nonexistent', value: 99 }],
      };
      const result = applyPatch(doc, patch, state);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Path not found');
    });

    it('should replace array element', () => {
      const doc = { arr: [1, 2, 3] };
      const patch: PatchDocument = {
        version: 1,
        sequence: 1,
        operations: [{ op: 'replace', path: '/arr/1', value: 99 }],
      };
      const result = applyPatch(doc, patch, state);
      expect(result.success).toBe(true);
      expect(result.document).toEqual({ arr: [1, 99, 3] });
    });
  });

  describe('applyPatch - move operation', () => {
    const state: PatchState = { version: 1, lastSequence: 0 };

    it('should move value to new location', () => {
      const doc = { a: 1, b: 2 };
      const patch: PatchDocument = {
        version: 1,
        sequence: 1,
        operations: [{ op: 'move', from: '/a', path: '/c' }],
      };
      const result = applyPatch(doc, patch, state);
      expect(result.success).toBe(true);
      expect(result.document).toEqual({ b: 2, c: 1 });
    });

    it('should move array element', () => {
      const doc = { arr: [1, 2, 3] };
      const patch: PatchDocument = {
        version: 1,
        sequence: 1,
        operations: [{ op: 'move', from: '/arr/0', path: '/arr/-' }],
      };
      const result = applyPatch(doc, patch, state);
      expect(result.success).toBe(true);
      expect(result.document).toEqual({ arr: [2, 3, 1] });
    });
  });

  describe('applyPatch - copy operation', () => {
    const state: PatchState = { version: 1, lastSequence: 0 };

    it('should copy value to new location', () => {
      const doc = { a: 1 };
      const patch: PatchDocument = {
        version: 1,
        sequence: 1,
        operations: [{ op: 'copy', from: '/a', path: '/b' }],
      };
      const result = applyPatch(doc, patch, state);
      expect(result.success).toBe(true);
      expect(result.document).toEqual({ a: 1, b: 1 });
    });

    it('should deep copy objects', () => {
      const doc = { a: { nested: { value: 1 } } };
      const patch: PatchDocument = {
        version: 1,
        sequence: 1,
        operations: [{ op: 'copy', from: '/a', path: '/b' }],
      };
      const result = applyPatch(doc, patch, state);
      expect(result.success).toBe(true);
      const resultDoc = result.document as { a: { nested: { value: number } }; b: { nested: { value: number } } };
      expect(resultDoc.b.nested.value).toBe(1);
      // Verify it's a deep copy
      resultDoc.b.nested.value = 99;
      expect(resultDoc.a.nested.value).toBe(1);
    });
  });

  describe('applyPatch - test operation', () => {
    const state: PatchState = { version: 1, lastSequence: 0 };

    it('should pass when values match', () => {
      const doc = { a: 1 };
      const patch: PatchDocument = {
        version: 1,
        sequence: 1,
        operations: [{ op: 'test', path: '/a', value: 1 }],
      };
      const result = applyPatch(doc, patch, state);
      expect(result.success).toBe(true);
    });

    it('should fail when values do not match', () => {
      const doc = { a: 1 };
      const patch: PatchDocument = {
        version: 1,
        sequence: 1,
        operations: [{ op: 'test', path: '/a', value: 2 }],
      };
      const result = applyPatch(doc, patch, state);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Test failed');
    });

    it('should match complex objects', () => {
      const doc = { a: { b: [1, 2, 3] } };
      const patch: PatchDocument = {
        version: 1,
        sequence: 1,
        operations: [{ op: 'test', path: '/a', value: { b: [1, 2, 3] } }],
      };
      const result = applyPatch(doc, patch, state);
      expect(result.success).toBe(true);
    });
  });

  describe('applyPatch - version checking', () => {
    it('should fail on version mismatch', () => {
      const doc = { a: 1 };
      const state: PatchState = { version: 1, lastSequence: 0 };
      const patch: PatchDocument = {
        version: 2,
        sequence: 1,
        operations: [{ op: 'add', path: '/b', value: 2 }],
      };
      const result = applyPatch(doc, patch, state);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Version mismatch');
      expect(result.error).toContain('expected 1');
      expect(result.error).toContain('got 2');
    });
  });

  describe('applyPatch - sequence checking', () => {
    it('should fail on sequence mismatch', () => {
      const doc = { a: 1 };
      const state: PatchState = { version: 1, lastSequence: 5 };
      const patch: PatchDocument = {
        version: 1,
        sequence: 7,
        operations: [{ op: 'add', path: '/b', value: 2 }],
      };
      const result = applyPatch(doc, patch, state);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Sequence mismatch');
      expect(result.error).toContain('expected 6');
      expect(result.error).toContain('got 7');
    });

    it('should accept correct sequence', () => {
      const doc = { a: 1 };
      const state: PatchState = { version: 1, lastSequence: 5 };
      const patch: PatchDocument = {
        version: 1,
        sequence: 6,
        operations: [{ op: 'add', path: '/b', value: 2 }],
      };
      const result = applyPatch(doc, patch, state);
      expect(result.success).toBe(true);
    });
  });

  describe('applyPatch - multiple operations', () => {
    const state: PatchState = { version: 1, lastSequence: 0 };

    it('should apply multiple operations in order', () => {
      const doc = { a: 1 };
      const patch: PatchDocument = {
        version: 1,
        sequence: 1,
        operations: [
          { op: 'add', path: '/b', value: 2 },
          { op: 'add', path: '/c', value: 3 },
          { op: 'remove', path: '/a' },
        ],
      };
      const result = applyPatch(doc, patch, state);
      expect(result.success).toBe(true);
      expect(result.document).toEqual({ b: 2, c: 3 });
    });

    it('should stop on first error', () => {
      const doc = { a: 1 };
      const patch: PatchDocument = {
        version: 1,
        sequence: 1,
        operations: [
          { op: 'add', path: '/b', value: 2 },
          { op: 'test', path: '/a', value: 99 }, // test fails because a is 1, not 99
          { op: 'add', path: '/c', value: 3 },
        ],
      };
      const result = applyPatch(doc, patch, state);
      expect(result.success).toBe(false);
      expect(result.failedOperation).toEqual({ op: 'test', path: '/a', value: 99 });
      // Original document should be returned on failure
      expect(result.document).toEqual({ a: 1 });
    });
  });

  describe('applyPatch - JSON pointer escaping', () => {
    const state: PatchState = { version: 1, lastSequence: 0 };

    it('should handle escaped slash in path', () => {
      const doc = { 'a/b': 1 };
      const patch: PatchDocument = {
        version: 1,
        sequence: 1,
        operations: [{ op: 'replace', path: '/a~1b', value: 2 }],
      };
      const result = applyPatch(doc, patch, state);
      expect(result.success).toBe(true);
      expect(result.document).toEqual({ 'a/b': 2 });
    });

    it('should handle escaped tilde in path', () => {
      const doc = { 'a~b': 1 };
      const patch: PatchDocument = {
        version: 1,
        sequence: 1,
        operations: [{ op: 'replace', path: '/a~0b', value: 2 }],
      };
      const result = applyPatch(doc, patch, state);
      expect(result.success).toBe(true);
      expect(result.document).toEqual({ 'a~b': 2 });
    });
  });

  describe('applyPatch - edge cases', () => {
    const state: PatchState = { version: 1, lastSequence: 0 };

    it('should handle empty operations array', () => {
      const doc = { a: 1 };
      const patch: PatchDocument = {
        version: 1,
        sequence: 1,
        operations: [],
      };
      const result = applyPatch(doc, patch, state);
      expect(result.success).toBe(true);
      expect(result.document).toEqual({ a: 1 });
    });

    it('should handle deeply nested paths', () => {
      const doc = { a: { b: { c: { d: 1 } } } };
      const patch: PatchDocument = {
        version: 1,
        sequence: 1,
        operations: [{ op: 'replace', path: '/a/b/c/d', value: 99 }],
      };
      const result = applyPatch(doc, patch, state);
      expect(result.success).toBe(true);
      expect(result.document).toEqual({ a: { b: { c: { d: 99 } } } });
    });

    it('should fail with invalid pointer format', () => {
      const doc = { a: 1 };
      const patch: PatchDocument = {
        version: 1,
        sequence: 1,
        operations: [{ op: 'add', path: 'no-leading-slash', value: 2 }],
      };
      const result = applyPatch(doc, patch, state);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid JSON pointer');
    });
  });
});
