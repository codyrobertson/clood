/**
 * Progress Bar Component
 *
 * Renders an ASCII progress bar with customizable width and styling.
 */

import React from 'react';
import { Box, Text } from 'ink';

export interface ProgressBarProps {
  /** Progress value between 0 and 100 */
  value: number;
  /** Total width of the bar (default: 30) */
  width?: number;
  /** Color of the filled portion */
  color?: string;
  /** Show percentage text */
  showPercentage?: boolean;
  /** Custom label */
  label?: string;
  /** Character for filled portion (default: █) */
  fillChar?: string;
  /** Character for empty portion (default: ░) */
  emptyChar?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  width = 30,
  color = 'green',
  showPercentage = true,
  label,
  fillChar = '█',
  emptyChar = '░',
}) => {
  // Clamp value between 0 and 100
  const clampedValue = Math.max(0, Math.min(100, value));

  // Calculate filled and empty portions
  const barWidth = width - 2; // Account for brackets
  const filledWidth = Math.round((clampedValue / 100) * barWidth);
  const emptyWidth = barWidth - filledWidth;

  const filledBar = fillChar.repeat(filledWidth);
  const emptyBar = emptyChar.repeat(emptyWidth);

  return (
    <Box>
      {label && (
        <Text>
          {label}:{' '}
        </Text>
      )}
      <Text>[</Text>
      <Text color={color}>{filledBar}</Text>
      <Text dimColor>{emptyBar}</Text>
      <Text>]</Text>
      {showPercentage && (
        <Text> {clampedValue.toFixed(0)}%</Text>
      )}
    </Box>
  );
};

/**
 * Simple Spinner Progress Bar
 *
 * Shows an indeterminate progress indicator.
 */
export interface SpinnerBarProps {
  /** Width of the bar (default: 20) */
  width?: number;
  /** Animation frame (0-based, cycles through positions) */
  frame?: number;
  /** Color of the indicator */
  color?: string;
  /** Label text */
  label?: string;
}

export const SpinnerBar: React.FC<SpinnerBarProps> = ({
  width = 20,
  frame = 0,
  color = 'cyan',
  label,
}) => {
  const indicatorWidth = 3;
  const position = frame % (width - indicatorWidth);

  const before = '░'.repeat(position);
  const indicator = '█'.repeat(indicatorWidth);
  const after = '░'.repeat(width - position - indicatorWidth);

  return (
    <Box>
      {label && (
        <Text>
          {label}:{' '}
        </Text>
      )}
      <Text>[</Text>
      <Text dimColor>{before}</Text>
      <Text color={color}>{indicator}</Text>
      <Text dimColor>{after}</Text>
      <Text>]</Text>
    </Box>
  );
};
