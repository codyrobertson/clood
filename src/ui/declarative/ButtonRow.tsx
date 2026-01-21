/**
 * Declarative ButtonRow Component (UOW-0812)
 *
 * A fully interactive button row component with:
 * - Horizontal button layout
 * - Shortcut legend display
 * - Focus indication and keyboard navigation
 * - Emits button.click events on shortcut press or activation
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Box, Text, useInput } from 'ink';
import { emitButtonClick } from './EventEmitter.js';

export type ButtonVariant = 'default' | 'primary' | 'secondary' | 'danger' | 'success' | 'warning';
export type ButtonSize = 'small' | 'medium' | 'large';

export interface ButtonConfig {
  /** Unique button ID */
  id: string;
  /** Button label */
  label: string;
  /** Keyboard shortcut (e.g., 'y', 'n', 'ctrl+s') */
  shortcut?: string;
  /** Display shortcut key hint */
  showShortcut?: boolean;
  /** Button variant */
  variant?: ButtonVariant;
  /** Whether button is disabled */
  disabled?: boolean;
  /** Icon to display before label */
  icon?: string;
  /** Custom data to include in click event */
  data?: unknown;
}

export interface ButtonRowProps {
  /** Unique component ID */
  id: string;
  /** Array of button configurations */
  buttons: ButtonConfig[];
  /** Spacing between buttons */
  spacing?: number;
  /** Currently focused button index (-1 for none) */
  focusedIndex?: number;
  /** Whether the row has keyboard focus */
  focused?: boolean;
  /** Show shortcut legend below buttons */
  showLegend?: boolean;
  /** Legend separator */
  legendSeparator?: string;
  /** Alignment of buttons */
  align?: 'left' | 'center' | 'right' | 'space-between';
  /** Button size */
  size?: ButtonSize;
  /** Called when a button is clicked */
  onButtonClick?: (buttonId: string, data?: unknown) => void;
  /** Called when focus changes */
  onFocusChange?: (index: number) => void;
  /** Whether component is visible */
  visible?: boolean;
}

/**
 * Parse a shortcut string into key and modifiers
 */
function parseShortcut(shortcut: string): {
  key: string;
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
  meta: boolean;
} {
  const lower = shortcut.toLowerCase();
  const parts = lower.split('+');
  const key = parts[parts.length - 1] || '';

  return {
    key,
    ctrl: parts.includes('ctrl') || parts.includes('control'),
    alt: parts.includes('alt'),
    shift: parts.includes('shift'),
    meta: parts.includes('meta') || parts.includes('cmd') || parts.includes('command'),
  };
}

/**
 * Format a shortcut for display
 */
function formatShortcut(shortcut: string): string {
  const { key, ctrl, alt, shift, meta } = parseShortcut(shortcut);
  const parts: string[] = [];

  if (ctrl) parts.push('Ctrl');
  if (alt) parts.push('Alt');
  if (shift) parts.push('Shift');
  if (meta) parts.push('Cmd');

  // Format the key nicely
  const formattedKey = key.length === 1 ? key.toUpperCase() : key.charAt(0).toUpperCase() + key.slice(1);
  parts.push(formattedKey);

  return parts.join('+');
}

/**
 * Get variant colors
 */
function getVariantColors(variant: ButtonVariant, focused: boolean, disabled: boolean): {
  bg: string | undefined;
  fg: string | undefined;
} {
  if (disabled) {
    return { bg: 'gray', fg: 'white' };
  }

  switch (variant) {
    case 'primary':
      return { bg: focused ? 'blueBright' : 'blue', fg: 'white' };
    case 'secondary':
      return { bg: focused ? 'gray' : 'blackBright', fg: 'white' };
    case 'danger':
      return { bg: focused ? 'redBright' : 'red', fg: 'white' };
    case 'success':
      return { bg: focused ? 'greenBright' : 'green', fg: 'white' };
    case 'warning':
      return { bg: focused ? 'yellowBright' : 'yellow', fg: 'black' };
    case 'default':
    default:
      return {
        bg: focused ? 'cyan' : undefined,
        fg: focused ? 'white' : undefined,
      };
  }
}

/**
 * Get padding based on size
 */
function getSizePadding(size: ButtonSize): number {
  switch (size) {
    case 'small':
      return 0;
    case 'large':
      return 2;
    case 'medium':
    default:
      return 1;
  }
}

/**
 * Individual Button in the row
 */
interface RowButtonProps {
  button: ButtonConfig;
  isFocused: boolean;
  size: ButtonSize;
  onPress: () => void;
}

const RowButton: React.FC<RowButtonProps> = ({
  button,
  isFocused,
  size,
  onPress: _onPress,
}) => {
  const { bg, fg } = getVariantColors(button.variant || 'default', isFocused, !!button.disabled);
  const padding = getSizePadding(size);

  const shortcutHint = button.shortcut && button.showShortcut !== false
    ? ` (${formatShortcut(button.shortcut)})`
    : '';

  return (
    <Box paddingX={padding}>
      <Text
        backgroundColor={bg}
        color={fg}
        bold={isFocused || button.variant === 'primary'}
        dimColor={button.disabled}
        inverse={isFocused && !button.variant}
      >
        {isFocused && !button.disabled && '\u25B8 '}
        {button.icon && `${button.icon} `}
        [{button.label}]
        {shortcutHint && <Text dimColor={!isFocused}>{shortcutHint}</Text>}
      </Text>
    </Box>
  );
};

/**
 * Shortcut Legend Component
 */
interface ShortcutLegendProps {
  buttons: ButtonConfig[];
  separator: string;
}

const ShortcutLegend: React.FC<ShortcutLegendProps> = ({ buttons, separator }) => {
  const shortcuts = buttons
    .filter(b => b.shortcut && !b.disabled)
    .map(b => ({
      key: formatShortcut(b.shortcut!),
      label: b.label,
    }));

  if (shortcuts.length === 0) return null;

  return (
    <Box marginTop={1}>
      <Text dimColor>
        {shortcuts.map((s, i) => (
          <React.Fragment key={i}>
            {i > 0 && separator}
            <Text bold color="cyan">{s.key}</Text>
            <Text dimColor>: {s.label}</Text>
          </React.Fragment>
        ))}
      </Text>
    </Box>
  );
};

/**
 * ButtonRow Component
 */
export const ButtonRow: React.FC<ButtonRowProps> = ({
  id,
  buttons,
  spacing = 1,
  focusedIndex: controlledFocusIndex,
  focused = false,
  showLegend = true,
  legendSeparator = '  ',
  align = 'left',
  size = 'medium',
  onButtonClick,
  onFocusChange,
  visible = true,
}) => {
  // Internal focus state
  const [internalFocusIndex, setInternalFocusIndex] = useState(0);

  // Use controlled or internal focus index
  const focusedButtonIndex = controlledFocusIndex ?? internalFocusIndex;

  // Get enabled buttons for navigation
  const enabledIndices = useMemo(() => {
    return buttons
      .map((b, i) => ({ button: b, index: i }))
      .filter(item => !item.button.disabled)
      .map(item => item.index);
  }, [buttons]);

  // Handle button activation
  const activateButton = useCallback((index: number) => {
    const button = buttons[index];
    if (!button || button.disabled) return;

    // Emit button.click event
    emitButtonClick(id, button.id, button.label);

    // Call callback
    onButtonClick?.(button.id, button.data);
  }, [id, buttons, onButtonClick]);

  // Update focus index
  const updateFocus = useCallback((newIndex: number) => {
    setInternalFocusIndex(newIndex);
    onFocusChange?.(newIndex);
  }, [onFocusChange]);

  // Handle keyboard input
  useInput(
    (input, key) => {
      if (!focused || buttons.length === 0) return;

      // Check for shortcut matches first
      for (let i = 0; i < buttons.length; i++) {
        const button = buttons[i];
        if (!button || !button.shortcut || button.disabled) continue;

        const parsed = parseShortcut(button.shortcut);

        // Check if the input matches the shortcut
        const keyMatch = input.toLowerCase() === parsed.key.toLowerCase() ||
          (key.return && parsed.key === 'enter') ||
          (key.escape && parsed.key === 'escape') ||
          (key.tab && parsed.key === 'tab') ||
          (input === ' ' && parsed.key === 'space');

        const modifiersMatch =
          (!!key.ctrl === parsed.ctrl) &&
          (!!key.meta === parsed.meta) &&
          (!!key.shift === parsed.shift);

        if (keyMatch && modifiersMatch) {
          activateButton(i);
          return;
        }
      }

      // Navigation: left/right arrows, h/l keys, tab
      if (key.leftArrow || input === 'h' || (key.shift && key.tab)) {
        const currentPos = enabledIndices.indexOf(focusedButtonIndex);
        if (currentPos > 0) {
          const newIndex = enabledIndices[currentPos - 1];
          if (newIndex !== undefined) {
            updateFocus(newIndex);
          }
        }
        return;
      }

      if (key.rightArrow || input === 'l' || key.tab) {
        const currentPos = enabledIndices.indexOf(focusedButtonIndex);
        if (currentPos < enabledIndices.length - 1) {
          const newIndex = enabledIndices[currentPos + 1];
          if (newIndex !== undefined) {
            updateFocus(newIndex);
          }
        }
        return;
      }

      // Activate focused button on Enter or Space
      if (key.return || input === ' ') {
        activateButton(focusedButtonIndex);
        return;
      }

      // Home: go to first button (using 'g' for vim-style or Ctrl+A)
      if (input === 'g' || (key.ctrl && input === 'a')) {
        const firstEnabled = enabledIndices[0];
        if (firstEnabled !== undefined) {
          updateFocus(firstEnabled);
        }
        return;
      }

      // End: go to last button (using 'G' for vim-style or Ctrl+E)
      if (input === 'G' || (key.ctrl && input === 'e')) {
        const lastEnabled = enabledIndices[enabledIndices.length - 1];
        if (lastEnabled !== undefined) {
          updateFocus(lastEnabled);
        }
        return;
      }
    },
    { isActive: focused }
  );

  if (!visible || buttons.length === 0) {
    return null;
  }

  // Determine justify content based on alignment
  const justifyContent = align === 'left'
    ? 'flex-start'
    : align === 'right'
      ? 'flex-end'
      : align === 'center'
        ? 'center'
        : 'space-between';

  return (
    <Box flexDirection="column">
      <Box
        flexDirection="row"
        gap={spacing}
        justifyContent={justifyContent}
      >
        {buttons.map((button, index) => (
          <RowButton
            key={button.id}
            button={button}
            isFocused={focused && focusedButtonIndex === index}
            size={size}
            onPress={() => activateButton(index)}
          />
        ))}
      </Box>

      {showLegend && (
        <ShortcutLegend buttons={buttons} separator={legendSeparator} />
      )}
    </Box>
  );
};

/**
 * Quick action bar - a simplified button row for common actions
 */
export interface QuickActionsProps {
  id: string;
  actions: Array<{
    id: string;
    label: string;
    shortcut: string;
    icon?: string;
    disabled?: boolean;
  }>;
  focused?: boolean;
  onAction?: (actionId: string) => void;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  id,
  actions,
  focused = false,
  onAction,
}) => {
  const buttons: ButtonConfig[] = actions.map(action => ({
    id: action.id,
    label: action.label,
    shortcut: action.shortcut,
    showShortcut: true,
    icon: action.icon,
    disabled: action.disabled,
    variant: 'default',
  }));

  return (
    <ButtonRow
      id={id}
      buttons={buttons}
      focused={focused}
      showLegend={false}
      align="left"
      size="small"
      onButtonClick={onAction}
    />
  );
};

/**
 * Confirm/Cancel button pair
 */
export interface ConfirmCancelProps {
  id: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmShortcut?: string;
  cancelShortcut?: string;
  focused?: boolean;
  focusedButton?: 'confirm' | 'cancel';
  onConfirm?: () => void;
  onCancel?: () => void;
}

export const ConfirmCancel: React.FC<ConfirmCancelProps> = ({
  id,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmShortcut = 'y',
  cancelShortcut = 'n',
  focused = false,
  focusedButton = 'confirm',
  onConfirm,
  onCancel,
}) => {
  const buttons: ButtonConfig[] = [
    {
      id: 'confirm',
      label: confirmLabel,
      shortcut: confirmShortcut,
      variant: 'primary',
    },
    {
      id: 'cancel',
      label: cancelLabel,
      shortcut: cancelShortcut,
      variant: 'secondary',
    },
  ];

  const handleClick = (buttonId: string) => {
    if (buttonId === 'confirm') {
      onConfirm?.();
    } else if (buttonId === 'cancel') {
      onCancel?.();
    }
  };

  return (
    <ButtonRow
      id={id}
      buttons={buttons}
      focused={focused}
      focusedIndex={focusedButton === 'confirm' ? 0 : 1}
      showLegend={true}
      align="center"
      onButtonClick={handleClick}
    />
  );
};

/**
 * Yes/No buttons
 */
export interface YesNoProps {
  id: string;
  focused?: boolean;
  defaultFocus?: 'yes' | 'no';
  onYes?: () => void;
  onNo?: () => void;
}

export const YesNo: React.FC<YesNoProps> = ({
  id,
  focused = false,
  defaultFocus = 'yes',
  onYes,
  onNo,
}) => {
  return (
    <ConfirmCancel
      id={id}
      confirmLabel="Yes"
      cancelLabel="No"
      confirmShortcut="y"
      cancelShortcut="n"
      focused={focused}
      focusedButton={defaultFocus === 'yes' ? 'confirm' : 'cancel'}
      onConfirm={onYes}
      onCancel={onNo}
    />
  );
};

/**
 * Action toolbar with icons
 */
export interface ToolbarProps {
  id: string;
  actions: Array<{
    id: string;
    icon: string;
    label?: string;
    shortcut?: string;
    disabled?: boolean;
    variant?: ButtonVariant;
  }>;
  focused?: boolean;
  onAction?: (actionId: string) => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  id,
  actions,
  focused = false,
  onAction,
}) => {
  const buttons: ButtonConfig[] = actions.map(action => ({
    id: action.id,
    label: action.label || action.icon,
    icon: action.label ? action.icon : undefined,
    shortcut: action.shortcut,
    showShortcut: false,
    disabled: action.disabled,
    variant: action.variant || 'default',
  }));

  return (
    <ButtonRow
      id={id}
      buttons={buttons}
      focused={focused}
      showLegend={false}
      align="left"
      size="small"
      spacing={0}
      onButtonClick={onAction}
    />
  );
};
