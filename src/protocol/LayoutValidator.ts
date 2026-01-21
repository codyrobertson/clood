/**
 * Layout Validator (UOW-0206)
 *
 * Validates UILayout specs against the schema.
 */

import { UILayoutSchema, type UILayout } from './schema/UILayout.js';
import type { ZodError } from 'zod';

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  layout?: UILayout;
}

export interface ValidationError {
  path: string;
  message: string;
  code: string;
}

export function validateLayout(input: unknown): ValidationResult {
  const result = UILayoutSchema.safeParse(input);

  if (result.success) {
    return {
      valid: true,
      errors: [],
      layout: result.data,
    };
  }

  return {
    valid: false,
    errors: formatZodErrors(result.error),
  };
}

function formatZodErrors(error: ZodError): ValidationError[] {
  return error.errors.map((err) => ({
    path: err.path.join('.'),
    message: err.message,
    code: err.code,
  }));
}

export function isValidLayout(input: unknown): input is UILayout {
  return validateLayout(input).valid;
}

export function assertValidLayout(input: unknown): asserts input is UILayout {
  const result = validateLayout(input);
  if (!result.valid) {
    const messages = result.errors.map((e) => `${e.path}: ${e.message}`).join('; ');
    throw new Error(`Invalid UILayout: ${messages}`);
  }
}
