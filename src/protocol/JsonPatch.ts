/**
 * JSON Patch (RFC 6902) Implementation (UOW-0207)
 *
 * Applies JSON Patch operations with sequence/version checking.
 */

import { z } from 'zod';

// Patch operation schemas
const PatchOpAddSchema = z.object({
  op: z.literal('add'),
  path: z.string(),
  value: z.unknown(),
});

const PatchOpRemoveSchema = z.object({
  op: z.literal('remove'),
  path: z.string(),
});

const PatchOpReplaceSchema = z.object({
  op: z.literal('replace'),
  path: z.string(),
  value: z.unknown(),
});

const PatchOpMoveSchema = z.object({
  op: z.literal('move'),
  from: z.string(),
  path: z.string(),
});

const PatchOpCopySchema = z.object({
  op: z.literal('copy'),
  from: z.string(),
  path: z.string(),
});

const PatchOpTestSchema = z.object({
  op: z.literal('test'),
  path: z.string(),
  value: z.unknown(),
});

export const PatchOperationSchema = z.discriminatedUnion('op', [
  PatchOpAddSchema,
  PatchOpRemoveSchema,
  PatchOpReplaceSchema,
  PatchOpMoveSchema,
  PatchOpCopySchema,
  PatchOpTestSchema,
]);

export const PatchDocumentSchema = z.object({
  version: z.number(),
  sequence: z.number(),
  operations: z.array(PatchOperationSchema),
});

export type PatchOperation = z.infer<typeof PatchOperationSchema>;
export type PatchDocument = z.infer<typeof PatchDocumentSchema>;

export interface PatchResult {
  success: boolean;
  document: unknown;
  error?: string;
  failedOperation?: PatchOperation;
}

export interface PatchState {
  version: number;
  lastSequence: number;
}

/**
 * Parse JSON pointer path into segments
 */
function parsePointer(path: string): string[] {
  if (path === '') return [];
  if (!path.startsWith('/')) {
    throw new Error(`Invalid JSON pointer: ${path}`);
  }
  return path
    .slice(1)
    .split('/')
    .map((seg) => seg.replace(/~1/g, '/').replace(/~0/g, '~'));
}

/**
 * Get value at path
 */
function getAtPath(doc: unknown, path: string): unknown {
  const segments = parsePointer(path);
  let current: unknown = doc;

  for (const seg of segments) {
    if (current === null || current === undefined) {
      throw new Error(`Path not found: ${path}`);
    }
    if (Array.isArray(current)) {
      const index = seg === '-' ? current.length : parseInt(seg, 10);
      current = current[index];
    } else if (typeof current === 'object') {
      current = (current as Record<string, unknown>)[seg];
    } else {
      throw new Error(`Cannot traverse path: ${path}`);
    }
  }

  return current;
}

/**
 * Set value at path (for add operation - inserts in arrays)
 */
function setAtPath(doc: unknown, path: string, value: unknown): unknown {
  if (path === '') return value;

  const segments = parsePointer(path);
  const result = structuredClone(doc);
  let current: unknown = result;

  for (let i = 0; i < segments.length - 1; i++) {
    const seg = segments[i]!;
    if (Array.isArray(current)) {
      current = current[parseInt(seg, 10)];
    } else if (typeof current === 'object' && current !== null) {
      current = (current as Record<string, unknown>)[seg];
    }
  }

  const lastSeg = segments[segments.length - 1]!;
  if (Array.isArray(current)) {
    const index = lastSeg === '-' ? current.length : parseInt(lastSeg, 10);
    current.splice(index, 0, value);
  } else if (typeof current === 'object' && current !== null) {
    (current as Record<string, unknown>)[lastSeg] = value;
  }

  return result;
}

/**
 * Replace value at path (for replace operation - replaces in arrays)
 */
function replaceAtPath(doc: unknown, path: string, value: unknown): unknown {
  if (path === '') return value;

  const segments = parsePointer(path);
  const result = structuredClone(doc);
  let current: unknown = result;

  for (let i = 0; i < segments.length - 1; i++) {
    const seg = segments[i]!;
    if (Array.isArray(current)) {
      current = current[parseInt(seg, 10)];
    } else if (typeof current === 'object' && current !== null) {
      current = (current as Record<string, unknown>)[seg];
    }
  }

  const lastSeg = segments[segments.length - 1]!;
  if (Array.isArray(current)) {
    const index = parseInt(lastSeg, 10);
    current[index] = value; // Replace, don't insert
  } else if (typeof current === 'object' && current !== null) {
    (current as Record<string, unknown>)[lastSeg] = value;
  }

  return result;
}

/**
 * Remove value at path
 */
function removeAtPath(doc: unknown, path: string): unknown {
  const segments = parsePointer(path);
  const result = structuredClone(doc);
  let current: unknown = result;

  for (let i = 0; i < segments.length - 1; i++) {
    const seg = segments[i]!;
    if (Array.isArray(current)) {
      current = current[parseInt(seg, 10)];
    } else if (typeof current === 'object' && current !== null) {
      current = (current as Record<string, unknown>)[seg];
    }
  }

  const lastSeg = segments[segments.length - 1]!;
  if (Array.isArray(current)) {
    current.splice(parseInt(lastSeg, 10), 1);
  } else if (typeof current === 'object' && current !== null) {
    delete (current as Record<string, unknown>)[lastSeg];
  }

  return result;
}

/**
 * Apply a single patch operation
 */
function applyOperation(doc: unknown, op: PatchOperation): unknown {
  switch (op.op) {
    case 'add':
      return setAtPath(doc, op.path, op.value);

    case 'remove':
      return removeAtPath(doc, op.path);

    case 'replace': {
      // Verify path exists (throws if not found)
      const existing = getAtPath(doc, op.path);
      if (existing === undefined) {
        throw new Error(`Path not found: ${op.path}`);
      }
      return replaceAtPath(doc, op.path, op.value);
    }

    case 'move': {
      const value = getAtPath(doc, op.from);
      const removed = removeAtPath(doc, op.from);
      return setAtPath(removed, op.path, value);
    }

    case 'copy': {
      const value = getAtPath(doc, op.from);
      return setAtPath(doc, op.path, structuredClone(value));
    }

    case 'test': {
      const actual = getAtPath(doc, op.path);
      if (JSON.stringify(actual) !== JSON.stringify(op.value)) {
        throw new Error(`Test failed at ${op.path}`);
      }
      return doc;
    }
  }
}

/**
 * Apply a patch document with version checking
 */
export function applyPatch(
  doc: unknown,
  patch: PatchDocument,
  state: PatchState
): PatchResult {
  // Version check
  if (patch.version !== state.version) {
    return {
      success: false,
      document: doc,
      error: `Version mismatch: expected ${state.version}, got ${patch.version}`,
    };
  }

  // Sequence check
  if (patch.sequence !== state.lastSequence + 1) {
    return {
      success: false,
      document: doc,
      error: `Sequence mismatch: expected ${state.lastSequence + 1}, got ${patch.sequence}`,
    };
  }

  let result = doc;

  for (const op of patch.operations) {
    try {
      result = applyOperation(result, op);
    } catch (error) {
      return {
        success: false,
        document: doc,
        error: error instanceof Error ? error.message : 'Unknown error',
        failedOperation: op,
      };
    }
  }

  return {
    success: true,
    document: result,
  };
}

/**
 * Validate a patch document
 */
export function validatePatch(input: unknown): PatchDocument | null {
  const result = PatchDocumentSchema.safeParse(input);
  return result.success ? result.data : null;
}
