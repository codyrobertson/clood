/**
 * Declarative Form Component (UOW-1004)
 *
 * Form handling for terminal UI with validation.
 */

import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

export type FormFieldType = 'text' | 'password' | 'number' | 'select' | 'checkbox' | 'radio';

export interface FormFieldOption {
  value: string;
  label: string;
}

export interface FormField {
  id: string;
  type: FormFieldType;
  label: string;
  placeholder?: string;
  required?: boolean;
  defaultValue?: unknown;
  options?: FormFieldOption[]; // For select/radio
  validation?: (value: unknown) => string | null; // Returns error message or null
}

export interface FormProps {
  /** Form fields */
  fields: FormField[];
  /** Current form values */
  values: Record<string, unknown>;
  /** Form errors */
  errors?: Record<string, string>;
  /** Currently focused field index */
  focusedIndex?: number;
  /** Whether form has focus */
  focused?: boolean;
  /** Called when value changes */
  onChange?: (fieldId: string, value: unknown) => void;
  /** Called on form submit */
  onSubmit?: (values: Record<string, unknown>) => void;
  /** Called when focus changes */
  onFocusChange?: (index: number) => void;
  /** Submit button label */
  submitLabel?: string;
}

export const Form: React.FC<FormProps> = ({
  fields,
  values,
  errors = {},
  focusedIndex = 0,
  focused = false,
  onChange,
  onSubmit,
  onFocusChange,
  submitLabel = 'Submit',
}) => {
  const [editingText, setEditingText] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Total items including submit button
  const totalItems = fields.length + 1;
  const isOnSubmit = focusedIndex === fields.length;

  useInput(
    (input, key) => {
      if (!focused) return;

      // Navigate
      if (!isEditing) {
        if (key.upArrow || input === 'k') {
          const newIndex = Math.max(0, focusedIndex - 1);
          if (newIndex !== focusedIndex) {
            onFocusChange?.(newIndex);
          }
          return;
        }

        if (key.downArrow || input === 'j') {
          const newIndex = Math.min(totalItems - 1, focusedIndex + 1);
          if (newIndex !== focusedIndex) {
            onFocusChange?.(newIndex);
          }
          return;
        }

        // Submit on Enter when on submit button
        if (key.return && isOnSubmit) {
          onSubmit?.(values);
          return;
        }
      }

      // Field-specific handling
      const field = fields[focusedIndex];
      if (!field) return;

      switch (field.type) {
        case 'text':
        case 'password':
        case 'number':
          if (key.return) {
            if (isEditing) {
              // Save and exit edit mode
              onChange?.(field.id, field.type === 'number' ? parseFloat(editingText) : editingText);
              setIsEditing(false);
            } else {
              // Enter edit mode
              setEditingText(String(values[field.id] ?? ''));
              setIsEditing(true);
            }
            return;
          }

          if (isEditing) {
            if (key.escape) {
              setIsEditing(false);
              return;
            }

            if (key.backspace || key.delete) {
              setEditingText((t) => t.slice(0, -1));
              return;
            }

            if (input && !key.ctrl && !key.meta) {
              if (field.type === 'number' && !/[\d.-]/.test(input)) {
                return;
              }
              setEditingText((t) => t + input);
            }
          }
          break;

        case 'checkbox':
          if (key.return || input === ' ') {
            onChange?.(field.id, !values[field.id]);
          }
          break;

        case 'select':
        case 'radio':
          if (field.options) {
            const currentValue = values[field.id];
            const currentIndex = field.options.findIndex((o) => o.value === currentValue);

            if (key.leftArrow || input === 'h') {
              const newIndex = Math.max(0, currentIndex - 1);
              const opt = field.options[newIndex];
              if (opt) {
                onChange?.(field.id, opt.value);
              }
            } else if (key.rightArrow || input === 'l') {
              const newIndex = Math.min(field.options.length - 1, currentIndex + 1);
              const opt = field.options[newIndex];
              if (opt) {
                onChange?.(field.id, opt.value);
              }
            }
          }
          break;
      }
    },
    { isActive: focused }
  );

  const renderField = (field: FormField, index: number) => {
    const isFocused = focused && index === focusedIndex;
    const value = values[field.id];
    const error = errors[field.id];

    return (
      <Box key={field.id} flexDirection="column" marginBottom={1}>
        {/* Label */}
        <Box>
          <Text bold color={isFocused ? 'cyan' : undefined}>
            {field.label}
            {field.required && <Text color="red">*</Text>}
          </Text>
        </Box>

        {/* Input */}
        <Box marginLeft={2}>
          {renderFieldInput(field, value, isFocused)}
        </Box>

        {/* Error */}
        {error && (
          <Box marginLeft={2}>
            <Text color="red">{error}</Text>
          </Box>
        )}
      </Box>
    );
  };

  const renderFieldInput = (field: FormField, value: unknown, isFocused: boolean) => {
    switch (field.type) {
      case 'text':
      case 'password':
      case 'number': {
        const displayValue = isEditing && isFocused
          ? editingText
          : String(value ?? '');
        const masked = field.type === 'password'
          ? '•'.repeat(displayValue.length)
          : displayValue;

        return (
          <Box>
            <Text
              backgroundColor={isFocused ? 'blue' : undefined}
              color={!displayValue ? 'gray' : undefined}
            >
              {masked || field.placeholder || '(empty)'}
            </Text>
            {isEditing && isFocused && (
              <Text backgroundColor="white" color="black">▏</Text>
            )}
          </Box>
        );
      }

      case 'checkbox':
        return (
          <Text color={isFocused ? 'cyan' : undefined}>
            {value ? '☑' : '☐'} {value ? 'Yes' : 'No'}
          </Text>
        );

      case 'select':
      case 'radio':
        return (
          <Box gap={1}>
            {field.options?.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <Text
                  key={opt.value}
                  color={isSelected ? 'cyan' : 'gray'}
                  bold={isSelected}
                  backgroundColor={isSelected && isFocused ? 'blue' : undefined}
                >
                  {field.type === 'radio'
                    ? (isSelected ? '◉' : '○')
                    : ''
                  } {opt.label}
                </Text>
              );
            })}
          </Box>
        );

      default:
        return <Text dimColor>Unknown field type</Text>;
    }
  };

  return (
    <Box flexDirection="column">
      {fields.map((field, index) => renderField(field, index))}

      {/* Submit button */}
      <Box marginTop={1}>
        <Text
          backgroundColor={isOnSubmit && focused ? 'green' : undefined}
          color={isOnSubmit && focused ? 'white' : 'green'}
          bold={isOnSubmit}
        >
          {'[ '}{submitLabel}{' ]'}
        </Text>
      </Box>

      {/* Help */}
      {focused && (
        <Box marginTop={1}>
          <Text dimColor>
            {isEditing
              ? 'Type to edit, Enter to save, Esc to cancel'
              : '↑↓ navigate, Enter to edit/submit, Space to toggle'}
          </Text>
        </Box>
      )}
    </Box>
  );
};

/**
 * Simple input group
 */
export interface InputGroupProps {
  label: string;
  children: React.ReactNode;
  error?: string;
  hint?: string;
  required?: boolean;
}

export const InputGroup: React.FC<InputGroupProps> = ({
  label,
  children,
  error,
  hint,
  required,
}) => {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box>
        <Text bold>{label}</Text>
        {required && <Text color="red">*</Text>}
      </Box>
      <Box marginLeft={2}>{children}</Box>
      {hint && !error && (
        <Box marginLeft={2}>
          <Text dimColor>{hint}</Text>
        </Box>
      )}
      {error && (
        <Box marginLeft={2}>
          <Text color="red">{error}</Text>
        </Box>
      )}
    </Box>
  );
};

/**
 * Form section divider
 */
export interface FormSectionProps {
  title: string;
  children: React.ReactNode;
}

export const FormSection: React.FC<FormSectionProps> = ({
  title,
  children,
}) => {
  return (
    <Box flexDirection="column" marginBottom={2}>
      <Box borderStyle="single" borderColor="gray" marginBottom={1} paddingX={1}>
        <Text bold color="cyan">{title}</Text>
      </Box>
      <Box flexDirection="column" marginLeft={1}>
        {children}
      </Box>
    </Box>
  );
};

/**
 * Inline form (horizontal layout)
 */
export interface InlineFormProps {
  children: React.ReactNode;
  onSubmit?: () => void;
}

export const InlineForm: React.FC<InlineFormProps> = ({
  children,
  onSubmit,
}) => {
  return (
    <Box gap={2}>
      {children}
      {onSubmit && (
        <Text color="green" bold>
          {'[Submit]'}
        </Text>
      )}
    </Box>
  );
};
