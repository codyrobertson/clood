/**
 * Declarative InputField Component (UOW-0806)
 *
 * Text input field for terminal UI.
 */

import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

export interface InputFieldProps {
  /** Unique ID */
  id: string;
  /** Current value */
  value: string;
  /** Placeholder text */
  placeholder?: string;
  /** Label */
  label?: string;
  /** Whether input has focus */
  focused?: boolean;
  /** Input type */
  type?: 'text' | 'password' | 'number';
  /** Maximum length */
  maxLength?: number;
  /** Width of input field */
  width?: number;
  /** Validation pattern */
  pattern?: RegExp;
  /** Error message */
  error?: string;
  /** Called when value changes */
  onChange?: (value: string) => void;
  /** Called on Enter */
  onSubmit?: (value: string) => void;
  /** Called on Escape */
  onCancel?: () => void;
}

export const InputField: React.FC<InputFieldProps> = ({
  id: _id,
  value,
  placeholder = '',
  label,
  focused = false,
  type = 'text',
  maxLength,
  width = 30,
  pattern,
  error,
  onChange,
  onSubmit,
  onCancel,
}) => {
  const [cursorPosition, setCursorPosition] = useState(value.length);

  useInput(
    (input, key) => {
      if (!focused) return;

      // Submit on Enter
      if (key.return) {
        onSubmit?.(value);
        return;
      }

      // Cancel on Escape
      if (key.escape) {
        onCancel?.();
        return;
      }

      // Handle backspace
      if (key.backspace || key.delete) {
        if (cursorPosition > 0) {
          const newValue = value.slice(0, cursorPosition - 1) + value.slice(cursorPosition);
          onChange?.(newValue);
          setCursorPosition(cursorPosition - 1);
        }
        return;
      }

      // Move cursor left
      if (key.leftArrow) {
        setCursorPosition(Math.max(0, cursorPosition - 1));
        return;
      }

      // Move cursor right
      if (key.rightArrow) {
        setCursorPosition(Math.min(value.length, cursorPosition + 1));
        return;
      }

      // Home key
      if (key.ctrl && input === 'a') {
        setCursorPosition(0);
        return;
      }

      // End key
      if (key.ctrl && input === 'e') {
        setCursorPosition(value.length);
        return;
      }

      // Clear line
      if (key.ctrl && input === 'u') {
        onChange?.('');
        setCursorPosition(0);
        return;
      }

      // Regular character input
      if (input && !key.ctrl && !key.meta) {
        // Check max length
        if (maxLength && value.length >= maxLength) {
          return;
        }

        // For number type, only allow digits
        if (type === 'number' && !/^[\d.-]$/.test(input)) {
          return;
        }

        // Check pattern
        const newValue = value.slice(0, cursorPosition) + input + value.slice(cursorPosition);
        if (pattern && !pattern.test(newValue)) {
          return;
        }

        onChange?.(newValue);
        setCursorPosition(cursorPosition + 1);
      }
    },
    { isActive: focused }
  );

  // Render the display value
  const displayValue = type === 'password' ? '•'.repeat(value.length) : value;
  const showPlaceholder = value.length === 0;

  // Build display string with cursor
  let displayText = showPlaceholder ? placeholder : displayValue;

  // Truncate if needed
  if (displayText.length > width) {
    const start = Math.max(0, cursorPosition - width + 5);
    displayText = displayText.slice(start, start + width);
  }

  // Pad to width
  displayText = displayText.padEnd(width);

  return (
    <Box flexDirection="column">
      {label && (
        <Box marginBottom={0}>
          <Text bold>{label}</Text>
        </Box>
      )}

      <Box>
        <Text
          backgroundColor={focused ? 'blue' : undefined}
          color={showPlaceholder ? 'gray' : focused ? 'white' : undefined}
        >
          {displayText}
        </Text>
        {focused && (
          <Text backgroundColor="white" color="black">
            {' '}
          </Text>
        )}
      </Box>

      {error && (
        <Box marginTop={0}>
          <Text color="red">{error}</Text>
        </Box>
      )}
    </Box>
  );
};

/**
 * Text area with multi-line support
 */
export interface TextAreaProps {
  id: string;
  value: string;
  placeholder?: string;
  label?: string;
  focused?: boolean;
  rows?: number;
  width?: number;
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
}

export const TextArea: React.FC<TextAreaProps> = ({
  id: _id,
  value,
  placeholder = '',
  label,
  focused = false,
  rows = 3,
  width = 40,
  onChange,
  onSubmit,
}) => {
  const [cursorLine, setCursorLine] = useState(0);
  const [cursorCol, setCursorCol] = useState(0);

  const lines = value.split('\n');

  useInput(
    (input, key) => {
      if (!focused) return;

      // Submit on Ctrl+Enter
      if (key.ctrl && key.return) {
        onSubmit?.(value);
        return;
      }

      // New line on Enter
      if (key.return) {
        const currentLine = lines[cursorLine] ?? '';
        const before = currentLine.slice(0, cursorCol);
        const after = currentLine.slice(cursorCol);
        const newLines = [
          ...lines.slice(0, cursorLine),
          before,
          after,
          ...lines.slice(cursorLine + 1),
        ];
        onChange?.(newLines.join('\n'));
        setCursorLine(cursorLine + 1);
        setCursorCol(0);
        return;
      }

      // Backspace
      if (key.backspace || key.delete) {
        if (cursorCol > 0) {
          const currentLine = lines[cursorLine] ?? '';
          const newLine = currentLine.slice(0, cursorCol - 1) + currentLine.slice(cursorCol);
          const newLines = [...lines.slice(0, cursorLine), newLine, ...lines.slice(cursorLine + 1)];
          onChange?.(newLines.join('\n'));
          setCursorCol(cursorCol - 1);
        } else if (cursorLine > 0) {
          // Join with previous line
          const prevLine = lines[cursorLine - 1] ?? '';
          const currentLine = lines[cursorLine] ?? '';
          const newLines = [
            ...lines.slice(0, cursorLine - 1),
            prevLine + currentLine,
            ...lines.slice(cursorLine + 1),
          ];
          onChange?.(newLines.join('\n'));
          setCursorLine(cursorLine - 1);
          setCursorCol(prevLine.length);
        }
        return;
      }

      // Navigation
      if (key.upArrow) {
        if (cursorLine > 0) {
          setCursorLine(cursorLine - 1);
          const prevLineLen = (lines[cursorLine - 1] ?? '').length;
          setCursorCol(Math.min(cursorCol, prevLineLen));
        }
        return;
      }

      if (key.downArrow) {
        if (cursorLine < lines.length - 1) {
          setCursorLine(cursorLine + 1);
          const nextLineLen = (lines[cursorLine + 1] ?? '').length;
          setCursorCol(Math.min(cursorCol, nextLineLen));
        }
        return;
      }

      if (key.leftArrow) {
        if (cursorCol > 0) {
          setCursorCol(cursorCol - 1);
        } else if (cursorLine > 0) {
          setCursorLine(cursorLine - 1);
          setCursorCol((lines[cursorLine - 1] ?? '').length);
        }
        return;
      }

      if (key.rightArrow) {
        const currentLineLen = (lines[cursorLine] ?? '').length;
        if (cursorCol < currentLineLen) {
          setCursorCol(cursorCol + 1);
        } else if (cursorLine < lines.length - 1) {
          setCursorLine(cursorLine + 1);
          setCursorCol(0);
        }
        return;
      }

      // Regular input
      if (input && !key.ctrl && !key.meta) {
        const currentLine = lines[cursorLine] ?? '';
        const newLine = currentLine.slice(0, cursorCol) + input + currentLine.slice(cursorCol);
        const newLines = [...lines.slice(0, cursorLine), newLine, ...lines.slice(cursorLine + 1)];
        onChange?.(newLines.join('\n'));
        setCursorCol(cursorCol + 1);
      }
    },
    { isActive: focused }
  );

  const displayLines = lines.slice(0, rows);
  const showPlaceholder = value.length === 0;

  return (
    <Box flexDirection="column">
      {label && (
        <Box marginBottom={0}>
          <Text bold>{label}</Text>
        </Box>
      )}

      <Box
        flexDirection="column"
        borderStyle={focused ? 'single' : undefined}
        borderColor={focused ? 'cyan' : undefined}
      >
        {showPlaceholder ? (
          <Text dimColor>{placeholder.padEnd(width)}</Text>
        ) : (
          displayLines.map((line, i) => (
            <Text key={i}>
              {(i === cursorLine && focused
                ? line.slice(0, cursorCol) + '▏' + line.slice(cursorCol)
                : line
              ).slice(0, width).padEnd(width)}
            </Text>
          ))
        )}
      </Box>

      {focused && (
        <Text dimColor>Ctrl+Enter to submit</Text>
      )}
    </Box>
  );
};

/**
 * Password input with visibility toggle
 */
export interface PasswordInputProps {
  id: string;
  value: string;
  label?: string;
  placeholder?: string;
  focused?: boolean;
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
}

export const PasswordInput: React.FC<PasswordInputProps> = ({
  id,
  value,
  label,
  placeholder = 'Enter password',
  focused = false,
  onChange,
  onSubmit,
}) => {
  const [showPassword, setShowPassword] = useState(false);

  useInput(
    (input, key) => {
      if (key.ctrl && input === 'v') {
        setShowPassword(!showPassword);
      }
    },
    { isActive: focused }
  );

  return (
    <Box flexDirection="column">
      <InputField
        id={id}
        value={value}
        label={label}
        placeholder={placeholder}
        focused={focused}
        type={showPassword ? 'text' : 'password'}
        onChange={onChange}
        onSubmit={onSubmit}
      />
      {focused && (
        <Text dimColor>Ctrl+V to toggle visibility</Text>
      )}
    </Box>
  );
};
