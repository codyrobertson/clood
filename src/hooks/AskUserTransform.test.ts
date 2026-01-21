/**
 * AskUserTransform Tests (EPIC-9)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  AskUserTransform,
  transformToUISpec,
  normalizeOptions,
  findDefaultIndex,
  findDefaultIds,
  mapSelectionToOutput,
  createCancelledResult,
  createTextInputResult,
  validateTextInput,
  formatOutputValue,
  askUserTransform,
  type AskUserQuestionInput,
  type NormalizedOption,
  type SelectionResult,
} from './AskUserTransform.js';

describe('AskUserTransform', () => {
  describe('normalizeOptions', () => {
    it('should normalize string options', () => {
      const options = ['Option A', 'Option B', 'Option C'];
      const normalized = normalizeOptions(options);

      expect(normalized).toHaveLength(3);
      expect(normalized[0]).toEqual({
        id: 'option-0',
        label: 'Option A',
        value: 'Option A',
      });
      expect(normalized[1].label).toBe('Option B');
      expect(normalized[2].label).toBe('Option C');
    });

    it('should normalize object options', () => {
      const options = [
        { label: 'Yes', value: true, description: 'Confirm action' },
        { label: 'No', value: false },
      ];
      const normalized = normalizeOptions(options);

      expect(normalized).toHaveLength(2);
      expect(normalized[0]).toEqual({
        id: 'option-0',
        label: 'Yes',
        value: true,
        description: 'Confirm action',
        disabled: undefined,
      });
      expect(normalized[1].value).toBe(false);
    });

    it('should handle mixed options', () => {
      const options = [
        'Plain text',
        { label: 'Object', value: 123 },
      ];
      const normalized = normalizeOptions(options);

      expect(normalized[0].value).toBe('Plain text');
      expect(normalized[1].value).toBe(123);
    });

    it('should return empty array for undefined options', () => {
      expect(normalizeOptions(undefined)).toEqual([]);
      expect(normalizeOptions([])).toEqual([]);
    });

    it('should handle disabled options', () => {
      const options = [
        { label: 'Available', value: 1 },
        { label: 'Unavailable', value: 2, disabled: true },
      ];
      const normalized = normalizeOptions(options);

      expect(normalized[0].disabled).toBeUndefined();
      expect(normalized[1].disabled).toBe(true);
    });
  });

  describe('findDefaultIndex', () => {
    const options: NormalizedOption[] = [
      { id: 'option-0', label: 'First', value: 'first' },
      { id: 'option-1', label: 'Second', value: 'second' },
      { id: 'option-2', label: 'Third', value: 3 },
    ];

    it('should find by value match', () => {
      expect(findDefaultIndex(options, 'second')).toBe(1);
      expect(findDefaultIndex(options, 3)).toBe(2);
    });

    it('should find by label match for strings', () => {
      expect(findDefaultIndex(options, 'First')).toBe(0);
    });

    it('should return 0 for no match', () => {
      expect(findDefaultIndex(options, 'nonexistent')).toBe(0);
    });

    it('should return 0 for undefined/null', () => {
      expect(findDefaultIndex(options, undefined)).toBe(0);
      expect(findDefaultIndex(options, null)).toBe(0);
    });
  });

  describe('findDefaultIds', () => {
    const options: NormalizedOption[] = [
      { id: 'option-0', label: 'A', value: 'a' },
      { id: 'option-1', label: 'B', value: 'b' },
      { id: 'option-2', label: 'C', value: 'c' },
    ];

    it('should find single default', () => {
      expect(findDefaultIds(options, 'b')).toEqual(['option-1']);
    });

    it('should find multiple defaults', () => {
      expect(findDefaultIds(options, ['a', 'c'])).toEqual(['option-0', 'option-2']);
    });

    it('should match by label', () => {
      expect(findDefaultIds(options, 'A')).toEqual(['option-0']);
    });

    it('should return empty array for no match', () => {
      expect(findDefaultIds(options, 'x')).toEqual([]);
      expect(findDefaultIds(options, undefined)).toEqual([]);
      expect(findDefaultIds(options, null)).toEqual([]);
    });
  });

  describe('transformToUISpec', () => {
    it('should create basic layout for question with options', () => {
      const input: AskUserQuestionInput = {
        question: 'Choose a color:',
        options: ['Red', 'Green', 'Blue'],
      };

      const layout = transformToUISpec(input);

      expect(layout.version).toBe('1.0');
      expect(layout.id).toMatch(/^ask-user-\d+$/);
      expect(layout.title).toBe('User Input Required');
      expect(layout.root.type).toBe('Container');
    });

    it('should include question text block', () => {
      const input: AskUserQuestionInput = {
        question: 'What is your choice?',
        options: ['A', 'B'],
      };

      const layout = transformToUISpec(input);
      const container = layout.root as { children: Array<{ type: string; content?: string }> };

      const questionBlock = container.children.find((c) => c.type === 'TextBlock' && c.content === 'What is your choice?');
      expect(questionBlock).toBeDefined();
    });

    it('should create list component for options', () => {
      const input: AskUserQuestionInput = {
        question: 'Select:',
        options: ['Option 1', 'Option 2', 'Option 3'],
      };

      const layout = transformToUISpec(input);
      const container = layout.root as { children: Array<{ type: string; items?: unknown[] }> };

      const listComponent = container.children.find((c) => c.type === 'List');
      expect(listComponent).toBeDefined();
      expect(listComponent?.items).toHaveLength(3);
    });

    it('should set multiSelect for allow_multiple', () => {
      const input: AskUserQuestionInput = {
        question: 'Select multiple:',
        options: ['A', 'B', 'C'],
        allow_multiple: true,
      };

      const layout = transformToUISpec(input);
      const container = layout.root as { children: Array<{ type: string; multiSelect?: boolean }> };

      const listComponent = container.children.find((c) => c.type === 'List');
      expect(listComponent?.multiSelect).toBe(true);
    });

    it('should set default selection index', () => {
      const input: AskUserQuestionInput = {
        question: 'Select:',
        options: ['First', 'Second', 'Third'],
        default_value: 'Second',
      };

      const layout = transformToUISpec(input);
      const container = layout.root as { children: Array<{ type: string; selectedIndex?: number }> };

      const listComponent = container.children.find((c) => c.type === 'List');
      expect(listComponent?.selectedIndex).toBe(1);
    });

    it('should set default selected IDs for multi-select', () => {
      const input: AskUserQuestionInput = {
        question: 'Select multiple:',
        options: ['A', 'B', 'C'],
        allow_multiple: true,
        default_value: ['A', 'C'],
      };

      const layout = transformToUISpec(input);
      const container = layout.root as { children: Array<{ type: string; selectedIds?: string[] }> };

      const listComponent = container.children.find((c) => c.type === 'List');
      expect(listComponent?.selectedIds).toEqual(['option-0', 'option-2']);
    });

    it('should create button row', () => {
      const input: AskUserQuestionInput = {
        question: 'Confirm?',
        options: ['Yes', 'No'],
      };

      const layout = transformToUISpec(input);
      const container = layout.root as { children: Array<{ type: string; buttons?: Array<{ label: string }> }> };

      const buttonRow = container.children.find((c) => c.type === 'ButtonRow');
      expect(buttonRow).toBeDefined();
      expect(buttonRow?.buttons?.some((b) => b.label === 'Confirm')).toBe(true);
      expect(buttonRow?.buttons?.some((b) => b.label === 'Cancel')).toBe(true);
    });

    it('should handle question without options (text input)', () => {
      const input: AskUserQuestionInput = {
        question: 'Enter your name:',
        placeholder: 'Your name here...',
      };

      const layout = transformToUISpec(input);
      const container = layout.root as { children: Array<{ type: string; content?: string }> };

      // Should not have a List component
      const listComponent = container.children.find((c) => c.type === 'List');
      expect(listComponent).toBeUndefined();

      // Should have placeholder text
      const placeholder = container.children.find((c) => c.content === 'Your name here...');
      expect(placeholder).toBeDefined();
    });

    it('should include validation hints for text input', () => {
      const input: AskUserQuestionInput = {
        question: 'Enter code:',
        validation: {
          required: true,
          min_length: 3,
          max_length: 10,
        },
      };

      const layout = transformToUISpec(input);
      const container = layout.root as { children: Array<{ type: string; content?: string }> };

      const validationBlock = container.children.find((c) =>
        c.content?.includes('Required') ||
        c.content?.includes('Min:') ||
        c.content?.includes('Max:')
      );
      expect(validationBlock).toBeDefined();
    });

    it('should apply custom config', () => {
      const input: AskUserQuestionInput = {
        question: 'Custom styled question:',
        options: ['A', 'B'],
      };

      const layout = transformToUISpec(input, {
        borderStyle: 'double',
        primaryColor: 'green',
      });

      const container = layout.root as { border?: { style: string; color: string } };
      expect(container.border?.style).toBe('double');
      expect(container.border?.color).toBe('green');
    });

    it('should set focusedComponentId to options list', () => {
      const input: AskUserQuestionInput = {
        question: 'Select:',
        options: ['A', 'B'],
      };

      const layout = transformToUISpec(input);
      expect(layout.focusedComponentId).toMatch(/-options$/);
    });
  });

  describe('mapSelectionToOutput', () => {
    const options: NormalizedOption[] = [
      { id: 'option-0', label: 'First', value: 1 },
      { id: 'option-1', label: 'Second', value: 2 },
      { id: 'option-2', label: 'Third', value: 3 },
    ];

    it('should map single selection by index', () => {
      const result = mapSelectionToOutput(
        { selectedIndex: 1 },
        options,
        false
      );

      expect(result.value).toBe(2);
      expect(result.selectedIds).toEqual(['option-1']);
      expect(result.cancelled).toBe(false);
    });

    it('should map multi-selection by IDs', () => {
      const result = mapSelectionToOutput(
        { selectedIds: ['option-0', 'option-2'] },
        options,
        true
      );

      expect(result.value).toEqual([1, 3]);
      expect(result.selectedIds).toEqual(['option-0', 'option-2']);
      expect(result.cancelled).toBe(false);
    });

    it('should return cancelled for invalid index', () => {
      const result = mapSelectionToOutput(
        { selectedIndex: 99 },
        options,
        false
      );

      expect(result.cancelled).toBe(true);
      expect(result.value).toBeNull();
    });

    it('should return empty array for multi-select with no selections', () => {
      const result = mapSelectionToOutput(
        { selectedIds: [] },
        options,
        true
      );

      expect(result.value).toEqual([]);
      expect(result.selectedIds).toEqual([]);
    });
  });

  describe('createCancelledResult', () => {
    it('should create cancelled result', () => {
      const result = createCancelledResult();

      expect(result.cancelled).toBe(true);
      expect(result.value).toBeNull();
      expect(result.selectedIds).toEqual([]);
    });
  });

  describe('createTextInputResult', () => {
    it('should create text input result', () => {
      const result = createTextInputResult('Hello World');

      expect(result.value).toBe('Hello World');
      expect(result.rawInput).toBe('Hello World');
      expect(result.cancelled).toBe(false);
    });
  });

  describe('validateTextInput', () => {
    it('should pass with no validation rules', () => {
      const result = validateTextInput('anything', undefined);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate required field', () => {
      const result = validateTextInput('', { required: true });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('This field is required');
    });

    it('should validate minimum length', () => {
      const result = validateTextInput('ab', { min_length: 3 });
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Minimum length');
    });

    it('should validate maximum length', () => {
      const result = validateTextInput('abcdef', { max_length: 5 });
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Maximum length');
    });

    it('should validate pattern', () => {
      const result = validateTextInput('abc', { pattern: '^\\d+$' });
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('pattern');
    });

    it('should pass valid input', () => {
      const result = validateTextInput('12345', {
        required: true,
        min_length: 3,
        max_length: 10,
        pattern: '^\\d+$',
      });
      expect(result.valid).toBe(true);
    });
  });

  describe('formatOutputValue', () => {
    it('should format cancelled result', () => {
      const result: SelectionResult = {
        value: null,
        selectedIds: [],
        cancelled: true,
      };
      expect(formatOutputValue(result)).toBe('[CANCELLED]');
    });

    it('should format raw input', () => {
      const result: SelectionResult = {
        value: 'typed text',
        selectedIds: [],
        cancelled: false,
        rawInput: 'typed text',
      };
      expect(formatOutputValue(result)).toBe('typed text');
    });

    it('should format array values', () => {
      const result: SelectionResult = {
        value: ['a', 'b', 'c'],
        selectedIds: ['0', '1', '2'],
        cancelled: false,
      };
      expect(formatOutputValue(result)).toBe('a, b, c');
    });

    it('should format single value', () => {
      const result: SelectionResult = {
        value: 42,
        selectedIds: ['0'],
        cancelled: false,
      };
      expect(formatOutputValue(result)).toBe('42');
    });
  });

  describe('AskUserTransform class', () => {
    let transform: AskUserTransform;

    beforeEach(() => {
      transform = new AskUserTransform();
    });

    it('should transform to UI spec', () => {
      const input: AskUserQuestionInput = {
        question: 'Test question?',
        options: ['Yes', 'No'],
      };

      const layout = transform.toUISpec(input);
      expect(layout.version).toBe('1.0');
      expect(layout.root).toBeDefined();
    });

    it('should map selection back', () => {
      const input: AskUserQuestionInput = {
        question: 'Select:',
        options: ['A', 'B', 'C'],
      };

      const result = transform.fromSelection({ selectedIndex: 1 }, input);
      expect(result.value).toBe('B');
    });

    it('should handle multi-select mapping', () => {
      const input: AskUserQuestionInput = {
        question: 'Select multiple:',
        options: ['X', 'Y', 'Z'],
        allow_multiple: true,
      };

      const result = transform.fromSelection({ selectedIds: ['option-0', 'option-2'] }, input);
      expect(result.value).toEqual(['X', 'Z']);
    });

    it('should validate text input', () => {
      const input: AskUserQuestionInput = {
        question: 'Enter text:',
        validation: { required: true, min_length: 5 },
      };

      const { result, validation } = transform.fromTextInput('abc', input);
      expect(result.rawInput).toBe('abc');
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it('should format output', () => {
      const result: SelectionResult = {
        value: 'test',
        selectedIds: [],
        cancelled: false,
        rawInput: 'test',
      };

      expect(transform.formatOutput(result)).toBe('test');
    });

    it('should accept custom config', () => {
      const customTransform = new AskUserTransform({
        borderStyle: 'bold',
        primaryColor: 'red',
      });

      const input: AskUserQuestionInput = {
        question: 'Custom?',
        options: ['Yes'],
      };

      const layout = customTransform.toUISpec(input);
      const container = layout.root as { border?: { style: string; color: string } };
      expect(container.border?.style).toBe('bold');
      expect(container.border?.color).toBe('red');
    });
  });

  describe('default instance', () => {
    it('should export default askUserTransform instance', () => {
      expect(askUserTransform).toBeInstanceOf(AskUserTransform);
    });

    it('should work with default instance', () => {
      const input: AskUserQuestionInput = {
        question: 'Default instance test?',
        options: ['A', 'B'],
      };

      const layout = askUserTransform.toUISpec(input);
      expect(layout.version).toBe('1.0');
    });
  });
});
