/**
 * Layout Validator (UOW-0206)
 *
 * Validates UILayout specs against the schema with comprehensive
 * checking of required fields, valid component types, and nesting rules.
 */

import {
  UILayoutSchema,
  COMPONENT_TYPES,
  CONTAINER_TYPES,
  type UILayout,
  type Component,
} from './schema/UILayout.js';
import type { ZodError, ZodIssue } from 'zod';

// =============================================================================
// TYPES
// =============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  layout?: UILayout;
}

export interface ValidationError {
  path: string;
  message: string;
  code: string;
  suggestion?: string;
}

export interface ValidationWarning {
  path: string;
  message: string;
  code: string;
}

export interface ValidationOptions {
  /** Maximum allowed nesting depth (default: 10) */
  maxNestingDepth?: number;
  /** Maximum number of components (default: 1000) */
  maxComponents?: number;
  /** Allow modals nested inside other modals (default: false) */
  allowNestedModals?: boolean;
  /** Strict ID uniqueness checking (default: true) */
  strictIdUniqueness?: boolean;
  /** Warn about accessibility issues (default: true) */
  checkAccessibility?: boolean;
}

const DEFAULT_OPTIONS: Required<ValidationOptions> = {
  maxNestingDepth: 10,
  maxComponents: 1000,
  allowNestedModals: false,
  strictIdUniqueness: true,
  checkAccessibility: true,
};

// =============================================================================
// MAIN VALIDATION FUNCTIONS
// =============================================================================

/**
 * Validates a UILayout against the schema and nesting rules
 */
export function validateLayout(
  input: unknown,
  options: ValidationOptions = {}
): ValidationResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Step 1: Zod schema validation
  const schemaResult = UILayoutSchema.safeParse(input);

  if (!schemaResult.success) {
    return {
      valid: false,
      errors: formatZodErrors(schemaResult.error),
      warnings: [],
    };
  }

  const layout = schemaResult.data;

  // Step 2: Structural validation
  const componentIds = new Set<string>();
  const context: ValidationContext = {
    path: 'root',
    depth: 0,
    parentTypes: [],
    insideModal: false,
    componentIds,
  };

  validateComponent(layout.root as Component, context, errors, warnings, opts);

  // Step 3: Check focused component ID exists
  if (layout.focusedComponentId && !componentIds.has(layout.focusedComponentId)) {
    errors.push({
      path: 'focusedComponentId',
      message: `Focused component ID "${layout.focusedComponentId}" does not exist in the layout`,
      code: 'INVALID_FOCUS_TARGET',
      suggestion: `Valid component IDs: ${Array.from(componentIds).slice(0, 5).join(', ')}${componentIds.size > 5 ? '...' : ''}`,
    });
  }

  // Step 4: Check component count
  if (componentIds.size > opts.maxComponents) {
    errors.push({
      path: '',
      message: `Layout contains ${componentIds.size} components, exceeding maximum of ${opts.maxComponents}`,
      code: 'MAX_COMPONENTS_EXCEEDED',
      suggestion: 'Consider breaking the layout into smaller sub-layouts',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    layout: errors.length === 0 ? layout : undefined,
  };
}

/**
 * Type guard to check if input is a valid UILayout
 */
export function isValidLayout(input: unknown): input is UILayout {
  return validateLayout(input).valid;
}

/**
 * Assert that input is a valid UILayout, throw if not
 */
export function assertValidLayout(input: unknown): asserts input is UILayout {
  const result = validateLayout(input);
  if (!result.valid) {
    const messages = result.errors.map((e) => `${e.path}: ${e.message}`).join('; ');
    throw new Error(`Invalid UILayout: ${messages}`);
  }
}

/**
 * Validate a single component (without layout wrapper)
 */
export function validateComponent(
  component: Component,
  context: ValidationContext,
  errors: ValidationError[],
  warnings: ValidationWarning[],
  options: Required<ValidationOptions>
): void {
  const comp = component as Record<string, unknown>;
  const componentType = comp['type'] as string;
  const componentId = comp['id'] as string;
  const currentPath = context.path;

  // Check ID uniqueness
  if (options.strictIdUniqueness) {
    if (context.componentIds.has(componentId)) {
      errors.push({
        path: currentPath,
        message: `Duplicate component ID: "${componentId}"`,
        code: 'DUPLICATE_ID',
        suggestion: 'Each component must have a unique ID within the layout',
      });
    }
    context.componentIds.add(componentId);
  }

  // Check nesting depth
  if (context.depth > options.maxNestingDepth) {
    errors.push({
      path: currentPath,
      message: `Component nesting depth (${context.depth}) exceeds maximum (${options.maxNestingDepth})`,
      code: 'MAX_DEPTH_EXCEEDED',
      suggestion: 'Flatten the component hierarchy or increase maxNestingDepth',
    });
    return; // Don't continue validating deeply nested components
  }

  // Check valid component type
  if (!COMPONENT_TYPES.includes(componentType as typeof COMPONENT_TYPES[number])) {
    errors.push({
      path: currentPath,
      message: `Unknown component type: "${componentType}"`,
      code: 'UNKNOWN_COMPONENT_TYPE',
      suggestion: `Valid types: ${COMPONENT_TYPES.join(', ')}`,
    });
    return;
  }

  // Check modal nesting
  if (componentType === 'Modal') {
    if (context.insideModal && !options.allowNestedModals) {
      errors.push({
        path: currentPath,
        message: 'Modals cannot be nested inside other modals',
        code: 'NESTED_MODAL',
        suggestion: 'Use a single modal or enable allowNestedModals option',
      });
    }
  }

  // Check SplitView constraints
  if (componentType === 'SplitView') {
    const children = comp['children'] as unknown[];
    const sizes = comp['sizes'] as unknown[];
    if (children && sizes && children.length !== sizes.length) {
      errors.push({
        path: currentPath,
        message: `SplitView children count (${children.length}) must match sizes count (${sizes.length})`,
        code: 'SPLITVIEW_MISMATCH',
        suggestion: 'Ensure each child has a corresponding size',
      });
    }
  }

  // Accessibility warnings
  if (options.checkAccessibility) {
    checkAccessibility(comp, currentPath, warnings);
  }

  // Recursively validate children
  validateChildren(comp, componentType, context, errors, warnings, options);
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

interface ValidationContext {
  path: string;
  depth: number;
  parentTypes: string[];
  insideModal: boolean;
  componentIds: Set<string>;
}

/**
 * Format Zod validation errors into our error format
 */
function formatZodErrors(error: ZodError): ValidationError[] {
  return error.errors.map((err: ZodIssue) => {
    const suggestion = getSuggestionForZodError(err);
    return {
      path: err.path.join('.'),
      message: err.message,
      code: err.code,
      suggestion,
    };
  });
}

/**
 * Get helpful suggestions for common Zod errors
 */
function getSuggestionForZodError(err: ZodIssue): string | undefined {
  if (err.code === 'invalid_literal' && err.path.includes('version')) {
    return 'Currently only version "1.0" is supported';
  }
  if (err.code === 'invalid_union_discriminator') {
    return `Valid component types: ${COMPONENT_TYPES.join(', ')}`;
  }
  if (err.code === 'invalid_type') {
    return `Expected ${err.expected}, received ${err.received}`;
  }
  return undefined;
}

/**
 * Validate children of a container component
 */
function validateChildren(
  component: Record<string, unknown>,
  componentType: string,
  context: ValidationContext,
  errors: ValidationError[],
  warnings: ValidationWarning[],
  options: Required<ValidationOptions>
): void {
  const isContainer = CONTAINER_TYPES.includes(componentType as typeof CONTAINER_TYPES[number]);

  // Handle direct children array
  if (component['children'] && Array.isArray(component['children'])) {
    const children = component['children'] as Component[];
    for (let i = 0; i < children.length; i++) {
      const childContext: ValidationContext = {
        path: `${context.path}.children[${i}]`,
        depth: context.depth + 1,
        parentTypes: [...context.parentTypes, componentType],
        insideModal: context.insideModal || componentType === 'Modal',
        componentIds: context.componentIds,
      };
      validateComponent(children[i]!, childContext, errors, warnings, options);
    }
  }

  // Handle Tabs content
  if (componentType === 'Tabs' && component['tabs']) {
    const tabs = component['tabs'] as Array<{ id: string; content: Component }>;
    for (let i = 0; i < tabs.length; i++) {
      const tab = tabs[i]!;
      if (tab.content) {
        const childContext: ValidationContext = {
          path: `${context.path}.tabs[${i}].content`,
          depth: context.depth + 1,
          parentTypes: [...context.parentTypes, componentType],
          insideModal: context.insideModal,
          componentIds: context.componentIds,
        };
        validateComponent(tab.content, childContext, errors, warnings, options);
      }
    }
  }

  // Handle Accordion sections
  if (componentType === 'Accordion' && component['sections']) {
    const sections = component['sections'] as Array<{ id: string; content: Component }>;
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i]!;
      if (section.content) {
        const childContext: ValidationContext = {
          path: `${context.path}.sections[${i}].content`,
          depth: context.depth + 1,
          parentTypes: [...context.parentTypes, componentType],
          insideModal: context.insideModal,
          componentIds: context.componentIds,
        };
        validateComponent(section.content, childContext, errors, warnings, options);
      }
    }
  }

  // Warn about non-container types having children
  if (!isContainer && component['children']) {
    warnings.push({
      path: context.path,
      message: `Component type "${componentType}" should not have children`,
      code: 'UNEXPECTED_CHILDREN',
    });
  }
}

/**
 * Check for accessibility issues and add warnings
 */
function checkAccessibility(
  component: Record<string, unknown>,
  path: string,
  warnings: ValidationWarning[]
): void {
  const componentType = component['type'] as string;
  const accessibility = component['accessibility'] as Record<string, unknown> | undefined;

  // Interactive components should have accessible names
  const needsLabel = ['Button', 'InputField', 'Checkbox', 'Select', 'List', 'Table'];
  if (needsLabel.includes(componentType)) {
    const hasLabel = component['label'] || component['ariaLabel'] ||
      accessibility?.ariaLabel || accessibility?.ariaLabelledBy;

    if (!hasLabel && componentType === 'Button' && !component['label']) {
      // Button without label should have icon + ariaLabel
      if (component['icon'] && !accessibility?.ariaLabel) {
        warnings.push({
          path,
          message: 'Icon-only button should have ariaLabel for accessibility',
          code: 'MISSING_ARIA_LABEL',
        });
      }
    }
  }

  // Images should have alt text or ariaLabel
  if (componentType === 'Image' && !accessibility?.ariaLabel && !component['alt']) {
    warnings.push({
      path,
      message: 'Image should have alt text or ariaLabel',
      code: 'MISSING_ALT_TEXT',
    });
  }

  // Modal should have ariaLabel or title
  if (componentType === 'Modal') {
    if (!component['title'] && !accessibility?.ariaLabel) {
      warnings.push({
        path,
        message: 'Modal should have a title or ariaLabel',
        code: 'MISSING_MODAL_TITLE',
      });
    }
  }
}

/**
 * Quick validation check (schema only, no structural checks)
 */
export function quickValidate(input: unknown): { valid: boolean; error?: string } {
  const result = UILayoutSchema.safeParse(input);
  if (result.success) {
    return { valid: true };
  }
  const firstError = result.error.errors[0];
  return {
    valid: false,
    error: firstError ? `${firstError.path.join('.')}: ${firstError.message}` : 'Unknown validation error',
  };
}

/**
 * Validate and extract all component IDs from a layout
 */
export function extractComponentIds(layout: UILayout): string[] {
  const ids: string[] = [];

  function traverse(component: Component): void {
    const comp = component as Record<string, unknown>;
    if (comp['id']) {
      ids.push(comp['id'] as string);
    }

    // Traverse children
    if (comp['children'] && Array.isArray(comp['children'])) {
      for (const child of comp['children'] as Component[]) {
        traverse(child);
      }
    }

    // Traverse tabs content
    if (comp['tabs'] && Array.isArray(comp['tabs'])) {
      for (const tab of comp['tabs'] as Array<{ content?: Component }>) {
        if (tab.content) {
          traverse(tab.content);
        }
      }
    }

    // Traverse accordion sections
    if (comp['sections'] && Array.isArray(comp['sections'])) {
      for (const section of comp['sections'] as Array<{ content?: Component }>) {
        if (section.content) {
          traverse(section.content);
        }
      }
    }
  }

  traverse(layout.root as Component);
  return ids;
}

/**
 * Find a component by ID in a layout
 */
export function findComponentById(
  layout: UILayout,
  id: string
): { component: Component; path: string } | null {
  function traverse(component: Component, path: string): { component: Component; path: string } | null {
    const comp = component as Record<string, unknown>;

    if (comp['id'] === id) {
      return { component, path };
    }

    // Search children
    if (comp['children'] && Array.isArray(comp['children'])) {
      const children = comp['children'] as Component[];
      for (let i = 0; i < children.length; i++) {
        const result = traverse(children[i]!, `${path}.children[${i}]`);
        if (result) return result;
      }
    }

    // Search tabs content
    if (comp['tabs'] && Array.isArray(comp['tabs'])) {
      const tabs = comp['tabs'] as Array<{ content?: Component }>;
      for (let i = 0; i < tabs.length; i++) {
        if (tabs[i]?.content) {
          const result = traverse(tabs[i]!.content!, `${path}.tabs[${i}].content`);
          if (result) return result;
        }
      }
    }

    // Search accordion sections
    if (comp['sections'] && Array.isArray(comp['sections'])) {
      const sections = comp['sections'] as Array<{ content?: Component }>;
      for (let i = 0; i < sections.length; i++) {
        if (sections[i]?.content) {
          const result = traverse(sections[i]!.content!, `${path}.sections[${i}].content`);
          if (result) return result;
        }
      }
    }

    return null;
  }

  return traverse(layout.root as Component, 'root');
}

/**
 * Get validation statistics for a layout
 */
export function getLayoutStats(layout: UILayout): {
  componentCount: number;
  maxDepth: number;
  componentTypes: Record<string, number>;
  hasModals: boolean;
  interactiveCount: number;
} {
  let maxDepth = 0;
  const componentTypes: Record<string, number> = {};
  let hasModals = false;
  let interactiveCount = 0;

  const INTERACTIVE_TYPES = [
    'Button', 'ButtonRow', 'InputField', 'Checkbox', 'RadioGroup', 'Select',
    'List', 'Table', 'Tabs', 'Accordion', 'TreeView', 'FilePicker',
  ];

  function traverse(component: Component, depth: number): void {
    const comp = component as Record<string, unknown>;
    const type = comp['type'] as string;

    maxDepth = Math.max(maxDepth, depth);
    componentTypes[type] = (componentTypes[type] || 0) + 1;

    if (type === 'Modal') hasModals = true;
    if (INTERACTIVE_TYPES.includes(type)) interactiveCount++;

    // Traverse children
    if (comp['children'] && Array.isArray(comp['children'])) {
      for (const child of comp['children'] as Component[]) {
        traverse(child, depth + 1);
      }
    }

    // Traverse tabs/sections
    if (comp['tabs'] && Array.isArray(comp['tabs'])) {
      for (const tab of comp['tabs'] as Array<{ content?: Component }>) {
        if (tab.content) traverse(tab.content, depth + 1);
      }
    }
    if (comp['sections'] && Array.isArray(comp['sections'])) {
      for (const section of comp['sections'] as Array<{ content?: Component }>) {
        if (section.content) traverse(section.content, depth + 1);
      }
    }
  }

  traverse(layout.root as Component, 0);

  return {
    componentCount: Object.values(componentTypes).reduce((a, b) => a + b, 0),
    maxDepth,
    componentTypes,
    hasModals,
    interactiveCount,
  };
}
