/**
 * Modal Component
 *
 * A reusable modal overlay with backdrop and focus trapping.
 */

import React from 'react';
import { Box, Text, useInput } from 'ink';

export interface ModalProps {
  /** Modal title */
  title: string;
  /** Modal content */
  children: React.ReactNode;
  /** Width of the modal (default: 60) */
  width?: number;
  /** Height of the modal (default: auto) */
  height?: number;
  /** Called when the modal should close */
  onClose: () => void;
  /** Border color */
  borderColor?: string;
  /** Footer text/hint */
  footer?: string;
}

export const Modal: React.FC<ModalProps> = ({
  title,
  children,
  width = 60,
  height,
  onClose,
  borderColor = 'blue',
  footer = 'Press ESC to close',
}) => {
  // Handle escape to close
  useInput((_input, key) => {
    if (key.escape) {
      onClose();
    }
  });

  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor={borderColor}
      width={width}
      height={height}
      paddingX={1}
    >
      {/* Header */}
      <Box justifyContent="center" marginBottom={1}>
        <Text bold color={borderColor}>
          {title}
        </Text>
      </Box>

      {/* Content */}
      <Box flexDirection="column" flexGrow={1}>
        {children}
      </Box>

      {/* Footer */}
      {footer && (
        <Box justifyContent="center" marginTop={1}>
          <Text dimColor italic>
            {footer}
          </Text>
        </Box>
      )}
    </Box>
  );
};
