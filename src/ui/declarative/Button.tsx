/**
 * Declarative Button Component (UOW-0802, UOW-0830)
 *
 * Renders a button from declarative UILayout schema.
 * Emits button.click events when activated.
 */

import React from 'react';
import { Box, Text, useInput } from 'ink';
import { emitButtonClick } from './EventEmitter.js';

export interface ButtonProps {
  /** Button ID for events */
  id: string;
  /** Button label */
  label: string;
  /** Keyboard shortcut hint */
  shortcut?: string;
  /** Whether button is disabled */
  disabled?: boolean;
  /** Primary button styling */
  primary?: boolean;
  /** Whether button is focused */
  focused?: boolean;
  /** Called when button is activated */
  onPress?: (id: string) => void;
}

export const Button: React.FC<ButtonProps> = ({
  id,
  label,
  shortcut,
  disabled = false,
  primary = false,
  focused = false,
  onPress,
}) => {
  // Handle keyboard input when focused
  useInput(
    (input, key) => {
      if (disabled) return;
      if (key.return || input === ' ') {
        // Emit button.click event
        emitButtonClick(id, id, label);
        onPress?.(id);
      }
    },
    { isActive: focused }
  );

  const bgColor = disabled ? 'gray' : primary ? 'blue' : focused ? 'cyan' : undefined;
  const textColor = disabled ? 'gray' : primary || focused ? 'white' : undefined;

  return (
    <Box paddingX={1}>
      <Text
        backgroundColor={bgColor}
        color={textColor}
        bold={primary}
        dimColor={disabled}
      >
        {focused && !disabled && '▸ '}
        [{label}]
        {shortcut && <Text dimColor> ({shortcut})</Text>}
      </Text>
    </Box>
  );
};

/**
 * Button Row Component - renders multiple buttons horizontally
 */
export interface ButtonRowProps {
  /** Unique ID */
  id: string;
  /** Array of buttons */
  buttons: ButtonProps[];
  /** Spacing between buttons */
  spacing?: number;
  /** Currently focused button index */
  focusedIndex?: number;
  /** Called when a button is pressed */
  onButtonPress?: (buttonId: string) => void;
}

export const ButtonRow: React.FC<ButtonRowProps> = ({
  buttons,
  spacing = 1,
  focusedIndex,
  onButtonPress,
}) => {
  return (
    <Box flexDirection="row" gap={spacing}>
      {buttons.map((button, index) => (
        <Button
          key={button.id}
          {...button}
          focused={focusedIndex === index}
          onPress={onButtonPress}
        />
      ))}
    </Box>
  );
};

/**
 * Action Button - inline action with icon
 */
export interface ActionButtonProps {
  id: string;
  icon: string;
  label?: string;
  disabled?: boolean;
  focused?: boolean;
  onPress?: (id: string) => void;
}

export const ActionButton: React.FC<ActionButtonProps> = ({
  id,
  icon,
  label,
  disabled = false,
  focused = false,
  onPress,
}) => {
  useInput(
    (input, key) => {
      if (disabled) return;
      if (key.return || input === ' ') {
        // Emit button.click event
        emitButtonClick(id, id, label);
        onPress?.(id);
      }
    },
    { isActive: focused }
  );

  return (
    <Box>
      <Text
        color={disabled ? 'gray' : focused ? 'cyan' : undefined}
        dimColor={disabled}
      >
        {focused && '▸'}
        {icon}
        {label && ` ${label}`}
      </Text>
    </Box>
  );
};
