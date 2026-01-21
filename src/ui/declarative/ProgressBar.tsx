/**
 * Declarative ProgressBar Component (UOW-0807)
 *
 * Displays progress with various styles.
 */

import React from 'react';
import { Box, Text } from 'ink';

export interface ProgressBarProps {
  /** Progress value (0-100) */
  value: number;
  /** Maximum value (default: 100) */
  max?: number;
  /** Width of bar in characters */
  width?: number;
  /** Show percentage label */
  showPercentage?: boolean;
  /** Show value label */
  showValue?: boolean;
  /** Label text */
  label?: string;
  /** Bar style */
  style?: 'bar' | 'blocks' | 'dots' | 'braille';
  /** Color of filled portion */
  color?: string;
  /** Show spinner for indeterminate state */
  indeterminate?: boolean;
}

const BAR_CHARS = {
  bar: { filled: '█', empty: '░', partial: ['▏', '▎', '▍', '▌', '▋', '▊', '▉'] },
  blocks: { filled: '█', empty: '░', partial: ['▏', '▎', '▍', '▌', '▋', '▊', '▉'] },
  dots: { filled: '●', empty: '○', partial: ['◔', '◑', '◕'] },
  braille: { filled: '⣿', empty: '⣀', partial: ['⣄', '⣤', '⣶'] },
};

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  width = 20,
  showPercentage = true,
  showValue = false,
  label,
  style = 'bar',
  color = 'green',
  indeterminate = false,
}) => {
  const chars = BAR_CHARS[style];
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  const filledWidth = (percentage / 100) * width;
  const fullBlocks = Math.floor(filledWidth);
  const partialIndex = Math.floor((filledWidth - fullBlocks) * chars.partial.length);
  const emptyBlocks = width - fullBlocks - (partialIndex > 0 ? 1 : 0);

  // Build the bar
  let bar = '';
  bar += chars.filled.repeat(fullBlocks);
  if (partialIndex > 0 && fullBlocks < width) {
    bar += chars.partial[partialIndex - 1] ?? '';
  }
  bar += chars.empty.repeat(Math.max(0, emptyBlocks));

  // For indeterminate, animate
  const [frame, setFrame] = React.useState(0);
  React.useEffect(() => {
    if (!indeterminate) return;
    const interval = setInterval(() => {
      setFrame((f) => (f + 1) % width);
    }, 100);
    return () => clearInterval(interval);
  }, [indeterminate, width]);

  if (indeterminate) {
    const indeterminateBar = chars.empty.repeat(width).split('');
    const pulseWidth = 3;
    for (let i = 0; i < pulseWidth; i++) {
      const pos = (frame + i) % width;
      indeterminateBar[pos] = chars.filled;
    }
    bar = indeterminateBar.join('');
  }

  return (
    <Box>
      {label && <Text>{label} </Text>}
      <Text color={color as Parameters<typeof Text>[0]['color']}>{bar}</Text>
      {showPercentage && !indeterminate && (
        <Text> {Math.round(percentage)}%</Text>
      )}
      {showValue && !indeterminate && (
        <Text dimColor> ({value}/{max})</Text>
      )}
    </Box>
  );
};

/**
 * Multi-segment progress bar
 */
export interface MultiProgressBarProps {
  segments: Array<{
    value: number;
    color: string;
    label?: string;
  }>;
  total: number;
  width?: number;
  showLegend?: boolean;
}

export const MultiProgressBar: React.FC<MultiProgressBarProps> = ({
  segments,
  total,
  width = 30,
  showLegend = true,
}) => {
  const segmentWidths = segments.map((s) => Math.round((s.value / total) * width));

  // Adjust for rounding errors
  const actualTotal = segmentWidths.reduce((a, b) => a + b, 0);
  const lastIndex = segmentWidths.length - 1;
  if (actualTotal < width && lastIndex >= 0) {
    const lastWidth = segmentWidths[lastIndex];
    if (lastWidth !== undefined) {
      segmentWidths[lastIndex] = lastWidth + (width - actualTotal);
    }
  }

  return (
    <Box flexDirection="column">
      <Box>
        {segments.map((segment, i) => (
          <Text key={i} color={segment.color as Parameters<typeof Text>[0]['color']}>
            {'█'.repeat(segmentWidths[i] ?? 0)}
          </Text>
        ))}
      </Box>

      {showLegend && (
        <Box marginTop={1} gap={2}>
          {segments.map((segment, i) => (
            <Box key={i}>
              <Text color={segment.color as Parameters<typeof Text>[0]['color']}>■ </Text>
              <Text>{segment.label ?? `Segment ${i + 1}`}: {segment.value}</Text>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

/**
 * Circular progress (text-based)
 */
export interface CircularProgressProps {
  value: number;
  max?: number;
  size?: 'small' | 'medium' | 'large';
  color?: string;
}

const CIRCLE_CHARS = ['○', '◔', '◑', '◕', '●'];

export const CircularProgress: React.FC<CircularProgressProps> = ({
  value,
  max = 100,
  size = 'medium',
  color = 'cyan',
}) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  const charIndex = Math.floor((percentage / 100) * (CIRCLE_CHARS.length - 1));
  const char = CIRCLE_CHARS[charIndex] ?? '○';

  const sizeMap = {
    small: 1,
    medium: 2,
    large: 3,
  };

  const displayChar = char.repeat(sizeMap[size]);

  return (
    <Box>
      <Text color={color as Parameters<typeof Text>[0]['color']} bold>
        {displayChar}
      </Text>
      <Text> {Math.round(percentage)}%</Text>
    </Box>
  );
};

/**
 * Download/upload style progress
 */
export interface TransferProgressProps {
  bytesTransferred: number;
  totalBytes: number;
  startTime?: number;
  width?: number;
}

export const TransferProgress: React.FC<TransferProgressProps> = ({
  bytesTransferred,
  totalBytes,
  startTime,
  width = 20,
}) => {
  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  const percentage = (bytesTransferred / totalBytes) * 100;

  // Calculate speed and ETA
  let speed = 0;
  let eta = '';
  if (startTime) {
    const elapsed = (Date.now() - startTime) / 1000;
    speed = bytesTransferred / elapsed;
    const remaining = totalBytes - bytesTransferred;
    const etaSeconds = remaining / speed;
    if (etaSeconds < 60) {
      eta = `${Math.round(etaSeconds)}s`;
    } else if (etaSeconds < 3600) {
      eta = `${Math.round(etaSeconds / 60)}m`;
    } else {
      eta = `${Math.round(etaSeconds / 3600)}h`;
    }
  }

  return (
    <Box flexDirection="column">
      <ProgressBar value={percentage} width={width} showPercentage />
      <Box gap={2}>
        <Text dimColor>
          {formatBytes(bytesTransferred)} / {formatBytes(totalBytes)}
        </Text>
        {speed > 0 && (
          <Text dimColor>{formatBytes(speed)}/s</Text>
        )}
        {eta && (
          <Text dimColor>ETA: {eta}</Text>
        )}
      </Box>
    </Box>
  );
};
