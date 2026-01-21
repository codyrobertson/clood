/**
 * AskUserQuestion Transform (EPIC-9)
 *
 * Transforms AskUserQuestion tool calls into UILayout specifications
 * and handles mapping user selections back to output format.
 */

import { z } from 'zod';

// Local simplified types for UI components (avoids strict Zod inference issues)
interface UIListItem {
  id: string;
  label: string;
  value?: unknown;
  disabled?: boolean;
  description?: string;
}

interface UITextBlock {
  id: string;
  type: 'TextBlock';
  content: string;
  color?: string;
  bold?: boolean;
  italic?: boolean;
  dimColor?: boolean;
  wrap?: boolean;
}

interface UIList {
  id: string;
  type: 'List';
  items: UIListItem[];
  multiSelect?: boolean;
  selectedIndex?: number;
  selectedIds?: string[];
  maxHeight?: number;
}

interface UIButtonSpec {
  id: string;
  label: string;
  shortcut?: string;
  primary?: boolean;
}

interface UIButtonRow {
  id: string;
  type: 'ButtonRow';
  buttons: UIButtonSpec[];
  spacing?: number;
}

interface UIContainer {
  id: string;
  type: 'Container';
  direction?: 'row' | 'column';
  gap?: number;
  padding?: { top?: number; bottom?: number; left?: number; right?: number };
  border?: { style?: string; color?: string };
  children: Array<UITextBlock | UIList | UIButtonRow | UIContainer>;
}

export interface UILayoutSpec {
  version: '1.0';
  id: string;
  title?: string;
  root: UIContainer;
  focusedComponentId?: string;
}

/**
 * Schema for AskUserQuestion input
 */
export const AskUserQuestionInputSchema = z.object({
  question: z.string(),
  options: z.array(z.union([
    z.string(),
    z.object({
      label: z.string(),
      value: z.unknown(),
      description: z.string().optional(),
      disabled: z.boolean().optional(),
    }),
  ])).optional(),
  default_value: z.unknown().optional(),
  allow_multiple: z.boolean().optional(),
  placeholder: z.string().optional(),
  validation: z.object({
    required: z.boolean().optional(),
    min_length: z.number().optional(),
    max_length: z.number().optional(),
    pattern: z.string().optional(),
  }).optional(),
});

export type AskUserQuestionInput = z.infer<typeof AskUserQuestionInputSchema>;

/**
 * Option item - normalized from string or object
 */
export interface NormalizedOption {
  id: string;
  label: string;
  value: unknown;
  description?: string;
  disabled?: boolean;
}

/**
 * Selection result from UI
 */
export interface SelectionResult {
  /** Selected value(s) */
  value: unknown;
  /** Selected option ID(s) */
  selectedIds: string[];
  /** Whether selection was cancelled */
  cancelled: boolean;
  /** Raw input for text questions */
  rawInput?: string;
}

/**
 * Transform configuration
 */
export interface TransformConfig {
  /** Border style for the container */
  borderStyle?: 'none' | 'single' | 'double' | 'round' | 'bold';
  /** Primary color */
  primaryColor?: string;
  /** Secondary color */
  secondaryColor?: string;
  /** Maximum visible items in list */
  maxVisibleItems?: number;
  /** Show confirm/cancel buttons */
  showButtons?: boolean;
  /** Custom button labels */
  buttonLabels?: {
    confirm?: string;
    cancel?: string;
  };
}

const DEFAULT_CONFIG: Required<TransformConfig> = {
  borderStyle: 'round',
  primaryColor: 'cyan',
  secondaryColor: 'gray',
  maxVisibleItems: 10,
  showButtons: true,
  buttonLabels: {
    confirm: 'Confirm',
    cancel: 'Cancel',
  },
};

/**
 * Normalize options to consistent format
 */
export function normalizeOptions(options: AskUserQuestionInput['options']): NormalizedOption[] {
  if (!options || options.length === 0) {
    return [];
  }

  return options.map((opt, idx) => {
    if (typeof opt === 'string') {
      return {
        id: `option-${idx}`,
        label: opt,
        value: opt,
      };
    }

    return {
      id: `option-${idx}`,
      label: opt.label,
      value: opt.value !== undefined ? opt.value : opt.label,
      description: opt.description,
      disabled: opt.disabled,
    };
  });
}

/**
 * Find default selection index from options
 */
export function findDefaultIndex(
  options: NormalizedOption[],
  defaultValue: unknown
): number {
  if (defaultValue === undefined || defaultValue === null) {
    return 0;
  }

  const index = options.findIndex((opt) => {
    // Match by value
    if (opt.value === defaultValue) return true;
    // Match by label for string defaults
    if (typeof defaultValue === 'string' && opt.label === defaultValue) return true;
    return false;
  });

  return index >= 0 ? index : 0;
}

/**
 * Find default selection IDs for multi-select
 */
export function findDefaultIds(
  options: NormalizedOption[],
  defaultValue: unknown
): string[] {
  if (defaultValue === undefined || defaultValue === null) {
    return [];
  }

  const defaults = Array.isArray(defaultValue) ? defaultValue : [defaultValue];

  return options
    .filter((opt) => {
      return defaults.some((d) => {
        if (opt.value === d) return true;
        if (typeof d === 'string' && opt.label === d) return true;
        return false;
      });
    })
    .map((opt) => opt.id);
}

/**
 * Transform AskUserQuestion input to UILayout specification
 */
export function transformToUISpec(
  input: AskUserQuestionInput,
  config: TransformConfig = {}
): UILayoutSpec {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const normalizedOptions = normalizeOptions(input.options);
  const hasOptions = normalizedOptions.length > 0;
  const isMultiSelect = input.allow_multiple === true;

  const layoutId = `ask-user-${Date.now()}`;
  const children: Array<UITextBlock | UIList | UIButtonRow | UIContainer> = [];

  // Question text block
  const questionBlock: UITextBlock = {
    id: `${layoutId}-question`,
    type: 'TextBlock',
    content: input.question,
    color: cfg.primaryColor,
    bold: true,
    wrap: true,
  };
  children.push(questionBlock);

  // Options list or text input hint
  if (hasOptions) {
    // Transform options to list items
    const listItems: UIListItem[] = normalizedOptions.map((opt) => ({
      id: opt.id,
      label: opt.description ? `${opt.label} - ${opt.description}` : opt.label,
      value: opt.value,
      disabled: opt.disabled,
    }));

    const selectedIndex = isMultiSelect
      ? undefined
      : findDefaultIndex(normalizedOptions, input.default_value);

    const selectedIds = isMultiSelect
      ? findDefaultIds(normalizedOptions, input.default_value)
      : undefined;

    const listComponent: UIList = {
      id: `${layoutId}-options`,
      type: 'List',
      items: listItems,
      multiSelect: isMultiSelect,
      selectedIndex,
      selectedIds,
      maxHeight: Math.min(cfg.maxVisibleItems, normalizedOptions.length),
    };
    children.push(listComponent);

    // Add selection hint
    const hintContent = isMultiSelect
      ? 'Space: Toggle | Enter: Confirm | Esc: Cancel'
      : 'Up/Down: Navigate | Enter: Select | Esc: Cancel';

    const hintBlock: UITextBlock = {
      id: `${layoutId}-hint`,
      type: 'TextBlock',
      content: hintContent,
      color: cfg.secondaryColor,
      dimColor: true,
    };
    children.push(hintBlock);
  } else {
    // Text input hint
    const placeholderText = input.placeholder || 'Type your response...';
    const hintBlock: UITextBlock = {
      id: `${layoutId}-placeholder`,
      type: 'TextBlock',
      content: placeholderText,
      color: cfg.secondaryColor,
      dimColor: true,
      italic: true,
    };
    children.push(hintBlock);

    // Validation hints
    if (input.validation) {
      const validationHints: string[] = [];
      if (input.validation.required) validationHints.push('Required');
      if (input.validation.min_length) validationHints.push(`Min: ${input.validation.min_length} chars`);
      if (input.validation.max_length) validationHints.push(`Max: ${input.validation.max_length} chars`);

      if (validationHints.length > 0) {
        const validationBlock: UITextBlock = {
          id: `${layoutId}-validation`,
          type: 'TextBlock',
          content: validationHints.join(' | '),
          color: cfg.secondaryColor,
        };
        children.push(validationBlock);
      }
    }
  }

  // Action buttons
  if (cfg.showButtons) {
    const buttons: UIButtonSpec[] = [
      {
        id: `${layoutId}-confirm`,
        label: cfg.buttonLabels.confirm || 'Confirm',
        shortcut: 'enter',
        primary: true,
      },
      {
        id: `${layoutId}-cancel`,
        label: cfg.buttonLabels.cancel || 'Cancel',
        shortcut: 'esc',
      },
    ];

    const buttonRow: UIButtonRow = {
      id: `${layoutId}-buttons`,
      type: 'ButtonRow',
      buttons,
      spacing: 2,
    };
    children.push(buttonRow);
  }

  // Root container
  const rootContainer: UIContainer = {
    id: `${layoutId}-container`,
    type: 'Container',
    direction: 'column',
    gap: 1,
    padding: { top: 1, bottom: 1, left: 2, right: 2 },
    border: { style: cfg.borderStyle, color: cfg.primaryColor },
    children,
  };

  const layout: UILayoutSpec = {
    version: '1.0',
    id: layoutId,
    title: 'User Input Required',
    root: rootContainer,
    focusedComponentId: hasOptions ? `${layoutId}-options` : undefined,
  };

  return layout;
}

/**
 * Map list selection back to output value
 */
export function mapSelectionToOutput(
  selection: { selectedIndex?: number; selectedIds?: string[] },
  options: NormalizedOption[],
  isMultiSelect: boolean
): SelectionResult {
  if (isMultiSelect) {
    const selectedIds = selection.selectedIds || [];
    const selectedOptions = options.filter((opt) => selectedIds.includes(opt.id));

    return {
      value: selectedOptions.map((opt) => opt.value),
      selectedIds,
      cancelled: false,
    };
  }

  // Single select
  const index = selection.selectedIndex ?? 0;
  const selectedOption = options[index];

  if (!selectedOption) {
    return {
      value: null,
      selectedIds: [],
      cancelled: true,
    };
  }

  return {
    value: selectedOption.value,
    selectedIds: [selectedOption.id],
    cancelled: false,
  };
}

/**
 * Create cancelled selection result
 */
export function createCancelledResult(): SelectionResult {
  return {
    value: null,
    selectedIds: [],
    cancelled: true,
  };
}

/**
 * Create text input result
 */
export function createTextInputResult(input: string): SelectionResult {
  return {
    value: input,
    selectedIds: [],
    cancelled: false,
    rawInput: input,
  };
}

/**
 * Validate text input against validation rules
 */
export function validateTextInput(
  input: string,
  validation?: AskUserQuestionInput['validation']
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!validation) {
    return { valid: true, errors };
  }

  if (validation.required && (!input || input.trim().length === 0)) {
    errors.push('This field is required');
  }

  if (validation.min_length && input.length < validation.min_length) {
    errors.push(`Minimum length is ${validation.min_length} characters`);
  }

  if (validation.max_length && input.length > validation.max_length) {
    errors.push(`Maximum length is ${validation.max_length} characters`);
  }

  if (validation.pattern) {
    try {
      const regex = new RegExp(validation.pattern);
      if (!regex.test(input)) {
        errors.push('Input does not match required pattern');
      }
    } catch {
      // Invalid regex pattern, skip validation
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Format output value for Claude Code response
 */
export function formatOutputValue(result: SelectionResult): string {
  if (result.cancelled) {
    return '[CANCELLED]';
  }

  if (result.rawInput !== undefined) {
    return result.rawInput;
  }

  if (Array.isArray(result.value)) {
    return result.value.map((v) => String(v)).join(', ');
  }

  return String(result.value);
}

/**
 * Complete transformation pipeline
 */
export class AskUserTransform {
  private config: Required<TransformConfig>;

  constructor(config: TransformConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Transform input to UI spec
   */
  toUISpec(input: AskUserQuestionInput): UILayoutSpec {
    return transformToUISpec(input, this.config);
  }

  /**
   * Map selection result back to output
   */
  fromSelection(
    selection: { selectedIndex?: number; selectedIds?: string[] },
    input: AskUserQuestionInput
  ): SelectionResult {
    const options = normalizeOptions(input.options);
    const isMultiSelect = input.allow_multiple === true;

    if (options.length === 0) {
      // Text input mode
      return createCancelledResult();
    }

    return mapSelectionToOutput(selection, options, isMultiSelect);
  }

  /**
   * Validate and create text input result
   */
  fromTextInput(
    text: string,
    input: AskUserQuestionInput
  ): { result: SelectionResult; validation: { valid: boolean; errors: string[] } } {
    const validation = validateTextInput(text, input.validation);
    const result = createTextInputResult(text);

    return { result, validation };
  }

  /**
   * Format result for output
   */
  formatOutput(result: SelectionResult): string {
    return formatOutputValue(result);
  }
}

// Export default instance
export const askUserTransform = new AskUserTransform();
