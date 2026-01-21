/**
 * Declarative Modal Component (UOW-0805, UOW-0833)
 *
 * Renders a modal dialog with focus trapping.
 * Emits modal.close, modal.confirm, and modal.cancel events for interactivity.
 */

import React, { useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { emitModalClose, emitModalConfirm, emitModalCancel } from './EventEmitter.js';

export interface ModalProps {
  /** Unique modal ID for events */
  id?: string;
  /** Whether modal is visible */
  visible: boolean;
  /** Modal title */
  title?: string;
  /** Modal content */
  children: React.ReactNode;
  /** Called when modal should close */
  onClose?: () => void;
  /** Width of modal (default: 60) */
  width?: number;
  /** Border style */
  borderStyle?: 'single' | 'double' | 'round' | 'classic';
  /** Show close hint */
  showCloseHint?: boolean;
  /** Footer content */
  footer?: React.ReactNode;
}

const BORDER_STYLES = {
  single: { tl: '┌', tr: '┐', bl: '└', br: '┘', h: '─', v: '│' },
  double: { tl: '╔', tr: '╗', bl: '╚', br: '╝', h: '═', v: '║' },
  round: { tl: '╭', tr: '╮', bl: '╰', br: '╯', h: '─', v: '│' },
  classic: { tl: '+', tr: '+', bl: '+', br: '+', h: '-', v: '|' },
};

export const Modal: React.FC<ModalProps> = ({
  id = 'modal',
  visible,
  title,
  children,
  onClose,
  width = 60,
  borderStyle = 'round',
  showCloseHint = true,
  footer,
}) => {
  // Handle escape key
  useInput(
    (input, key) => {
      if (key.escape || input === 'q') {
        // Emit modal.close event
        emitModalClose(id, 'escape');
        onClose?.();
      }
    },
    { isActive: visible }
  );

  if (!visible) {
    return null;
  }

  const border = BORDER_STYLES[borderStyle];
  const innerWidth = width - 2;

  const renderHorizontalLine = (left: string, right: string) => {
    return left + border.h.repeat(innerWidth) + right;
  };

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="cyan"
      paddingX={0}
      paddingY={0}
    >
      {/* Top border with title */}
      <Text color="cyan">
        {title
          ? border.tl +
            border.h +
            ' ' +
            title.slice(0, innerWidth - 4) +
            ' ' +
            border.h.repeat(Math.max(0, innerWidth - title.length - 4)) +
            border.tr
          : renderHorizontalLine(border.tl, border.tr)}
      </Text>

      {/* Content */}
      <Box flexDirection="column" paddingX={1}>
        {children}
      </Box>

      {/* Footer */}
      {footer && (
        <>
          <Text color="cyan">{renderHorizontalLine(border.v, border.v)}</Text>
          <Box paddingX={1}>{footer}</Box>
        </>
      )}

      {/* Close hint */}
      {showCloseHint && (
        <Box justifyContent="center">
          <Text dimColor>Press ESC or q to close</Text>
        </Box>
      )}

      {/* Bottom border */}
      <Text color="cyan">{renderHorizontalLine(border.bl, border.br)}</Text>
    </Box>
  );
};

/**
 * Confirmation dialog modal
 */
export interface ConfirmModalProps {
  /** Unique modal ID for events */
  id?: string;
  visible: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  id = 'confirm-modal',
  visible,
  title = 'Confirm',
  message,
  confirmLabel = 'Yes',
  cancelLabel = 'No',
  onConfirm,
  onCancel,
}) => {
  const [selected, setSelected] = React.useState<'confirm' | 'cancel'>('cancel');

  useInput(
    (input, key) => {
      if (key.leftArrow || input === 'h') {
        setSelected('confirm');
      } else if (key.rightArrow || input === 'l') {
        setSelected('cancel');
      } else if (key.return) {
        if (selected === 'confirm') {
          // Emit modal.confirm event
          emitModalConfirm(id);
          onConfirm?.();
        } else {
          // Emit modal.cancel event
          emitModalCancel(id);
          onCancel?.();
        }
      } else if (key.escape || input === 'n') {
        // Emit modal.cancel event
        emitModalCancel(id);
        onCancel?.();
      } else if (input === 'y') {
        // Emit modal.confirm event
        emitModalConfirm(id);
        onConfirm?.();
      }
    },
    { isActive: visible }
  );

  if (!visible) return null;

  return (
    <Modal id={id} visible={visible} title={title} onClose={onCancel} showCloseHint={false}>
      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text>{message}</Text>
        </Box>

        <Box justifyContent="center" gap={2}>
          <Text
            color={selected === 'confirm' ? 'green' : undefined}
            bold={selected === 'confirm'}
            backgroundColor={selected === 'confirm' ? 'green' : undefined}
          >
            {selected === 'confirm' ? `▸ ${confirmLabel}` : `  ${confirmLabel}`}
          </Text>
          <Text
            color={selected === 'cancel' ? 'red' : undefined}
            bold={selected === 'cancel'}
            backgroundColor={selected === 'cancel' ? 'red' : undefined}
          >
            {selected === 'cancel' ? `▸ ${cancelLabel}` : `  ${cancelLabel}`}
          </Text>
        </Box>

        <Box justifyContent="center" marginTop={1}>
          <Text dimColor>y/n or ←/→ to select, Enter to confirm</Text>
        </Box>
      </Box>
    </Modal>
  );
};

/**
 * Alert modal (info/warning/error)
 */
export interface AlertModalProps {
  /** Unique modal ID for events */
  id?: string;
  visible: boolean;
  type?: 'info' | 'warning' | 'error' | 'success';
  title?: string;
  message: string;
  onDismiss?: () => void;
}

const ALERT_ICONS = {
  info: 'ℹ',
  warning: '⚠',
  error: '✖',
  success: '✔',
};

const ALERT_COLORS = {
  info: 'blue',
  warning: 'yellow',
  error: 'red',
  success: 'green',
} as const;

export const AlertModal: React.FC<AlertModalProps> = ({
  id = 'alert-modal',
  visible,
  type = 'info',
  title,
  message,
  onDismiss,
}) => {
  if (!visible) return null;

  const icon = ALERT_ICONS[type];
  const color = ALERT_COLORS[type];
  const defaultTitle = type.charAt(0).toUpperCase() + type.slice(1);

  return (
    <Modal id={id} visible={visible} title={title || defaultTitle} onClose={onDismiss}>
      <Box>
        <Text color={color}>{icon} </Text>
        <Text>{message}</Text>
      </Box>
    </Modal>
  );
};

/**
 * Loading modal with spinner
 */
export interface LoadingModalProps {
  visible: boolean;
  message?: string;
}

export const LoadingModal: React.FC<LoadingModalProps> = ({
  visible,
  message = 'Loading...',
}) => {
  const [frame, setFrame] = React.useState(0);
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

  useEffect(() => {
    if (!visible) return;

    const interval = setInterval(() => {
      setFrame((f) => (f + 1) % frames.length);
    }, 80);

    return () => clearInterval(interval);
  }, [visible, frames.length]);

  if (!visible) return null;

  return (
    <Box borderStyle="round" borderColor="cyan" paddingX={2} paddingY={1}>
      <Text color="cyan">{frames[frame]} </Text>
      <Text>{message}</Text>
    </Box>
  );
};
