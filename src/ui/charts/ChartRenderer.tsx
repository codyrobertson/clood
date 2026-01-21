/**
 * Chart Renderer Component (UOW-0705)
 *
 * Renders chart blocks with:
 * - No text wrapping (preserves ASCII art structure)
 * - ANSI color passthrough (maintains terminal colors)
 * - Border styling (configurable border appearance)
 * - Title rendering (optional title display)
 */

import React, { useMemo } from 'react';
import { Box, Text } from 'ink';

/** Border style options */
export type ChartBorderStyle = 'none' | 'single' | 'double' | 'rounded' | 'bold' | 'ascii';

/** Border characters for different styles */
const BORDER_CHARS: Record<ChartBorderStyle, {
  topLeft: string;
  topRight: string;
  bottomLeft: string;
  bottomRight: string;
  horizontal: string;
  vertical: string;
  titleLeft: string;
  titleRight: string;
}> = {
  none: {
    topLeft: '',
    topRight: '',
    bottomLeft: '',
    bottomRight: '',
    horizontal: '',
    vertical: '',
    titleLeft: '',
    titleRight: '',
  },
  single: {
    topLeft: '┌',
    topRight: '┐',
    bottomLeft: '└',
    bottomRight: '┘',
    horizontal: '─',
    vertical: '│',
    titleLeft: '┤',
    titleRight: '├',
  },
  double: {
    topLeft: '╔',
    topRight: '╗',
    bottomLeft: '╚',
    bottomRight: '╝',
    horizontal: '═',
    vertical: '║',
    titleLeft: '╡',
    titleRight: '╞',
  },
  rounded: {
    topLeft: '╭',
    topRight: '╮',
    bottomLeft: '╰',
    bottomRight: '╯',
    horizontal: '─',
    vertical: '│',
    titleLeft: '┤',
    titleRight: '├',
  },
  bold: {
    topLeft: '┏',
    topRight: '┓',
    bottomLeft: '┗',
    bottomRight: '┛',
    horizontal: '━',
    vertical: '┃',
    titleLeft: '┫',
    titleRight: '┣',
  },
  ascii: {
    topLeft: '+',
    topRight: '+',
    bottomLeft: '+',
    bottomRight: '+',
    horizontal: '-',
    vertical: '|',
    titleLeft: '+',
    titleRight: '+',
  },
};

/** Color options for the chart */
export interface ChartColors {
  /** Border color */
  border?: string;
  /** Title color */
  title?: string;
  /** Content color (default, can be overridden by ANSI) */
  content?: string;
  /** Background color */
  background?: string;
}

/** Default colors */
const DEFAULT_COLORS: ChartColors = {
  border: 'gray',
  title: 'cyan',
  content: 'white',
};

/** Props for ChartRenderer component */
export interface ChartRendererProps {
  /** The chart content (ASCII art/text) */
  content: string;
  /** Optional title to display */
  title?: string;
  /** Border style */
  borderStyle?: ChartBorderStyle;
  /** Color configuration */
  colors?: ChartColors;
  /** Minimum width (content will be padded if smaller) */
  minWidth?: number;
  /** Maximum width (content will be clipped if larger) */
  maxWidth?: number;
  /** Show line numbers */
  showLineNumbers?: boolean;
  /** Horizontal padding inside the border */
  paddingX?: number;
  /** Vertical padding inside the border */
  paddingY?: number;
  /** Enable ANSI color passthrough */
  preserveAnsi?: boolean;
}

/**
 * Parse ANSI escape codes from text
 * Returns segments with their color information
 */
interface TextSegment {
  text: string;
  color?: string;
  bold?: boolean;
  dim?: boolean;
  underline?: boolean;
}

function parseAnsiText(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  const ansiRegex = /\x1b\[([0-9;]*)m/g;

  let lastIndex = 0;
  let currentColor: string | undefined;
  let currentBold = false;
  let currentDim = false;
  let currentUnderline = false;

  let match;
  while ((match = ansiRegex.exec(text)) !== null) {
    // Add text before the escape code
    if (match.index > lastIndex) {
      segments.push({
        text: text.slice(lastIndex, match.index),
        color: currentColor,
        bold: currentBold,
        dim: currentDim,
        underline: currentUnderline,
      });
    }

    // Parse the escape code
    const codes = match[1]?.split(';').map(Number) ?? [];
    for (const code of codes) {
      switch (code) {
        case 0: // Reset
          currentColor = undefined;
          currentBold = false;
          currentDim = false;
          currentUnderline = false;
          break;
        case 1: // Bold
          currentBold = true;
          break;
        case 2: // Dim
          currentDim = true;
          break;
        case 4: // Underline
          currentUnderline = true;
          break;
        case 30: currentColor = 'black'; break;
        case 31: currentColor = 'red'; break;
        case 32: currentColor = 'green'; break;
        case 33: currentColor = 'yellow'; break;
        case 34: currentColor = 'blue'; break;
        case 35: currentColor = 'magenta'; break;
        case 36: currentColor = 'cyan'; break;
        case 37: currentColor = 'white'; break;
        case 90: currentColor = 'gray'; break;
        case 91: currentColor = 'redBright'; break;
        case 92: currentColor = 'greenBright'; break;
        case 93: currentColor = 'yellowBright'; break;
        case 94: currentColor = 'blueBright'; break;
        case 95: currentColor = 'magentaBright'; break;
        case 96: currentColor = 'cyanBright'; break;
        case 97: currentColor = 'whiteBright'; break;
      }
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    segments.push({
      text: text.slice(lastIndex),
      color: currentColor,
      bold: currentBold,
      dim: currentDim,
      underline: currentUnderline,
    });
  }

  return segments;
}

/**
 * Strip ANSI escape codes from text
 */
function stripAnsi(text: string): string {
  return text.replace(/\x1b\[[0-9;]*m/g, '');
}

/**
 * Get the visible width of text (excluding ANSI codes)
 */
function getVisibleWidth(text: string): number {
  return stripAnsi(text).length;
}

/**
 * Calculate the maximum line width in content
 */
function getMaxLineWidth(content: string): number {
  const lines = content.split('\n');
  return Math.max(...lines.map(getVisibleWidth));
}

/**
 * Renders a single line with ANSI color passthrough
 */
const ChartLine: React.FC<{
  line: string;
  preserveAnsi: boolean;
  defaultColor?: string;
  lineNumber?: number;
  lineNumberWidth?: number;
}> = ({ line, preserveAnsi, defaultColor, lineNumber, lineNumberWidth }) => {
  if (preserveAnsi) {
    const segments = parseAnsiText(line);

    return (
      <Box>
        {lineNumber !== undefined && lineNumberWidth !== undefined && (
          <Text dimColor>
            {String(lineNumber).padStart(lineNumberWidth, ' ')} {' '}
          </Text>
        )}
        {segments.map((segment, i) => (
          <Text
            key={i}
            color={segment.color as Parameters<typeof Text>[0]['color'] || defaultColor as Parameters<typeof Text>[0]['color']}
            bold={segment.bold}
            dimColor={segment.dim}
            underline={segment.underline}
          >
            {segment.text}
          </Text>
        ))}
      </Box>
    );
  }

  // No ANSI passthrough - strip codes and render plain
  const plainText = stripAnsi(line);

  return (
    <Box>
      {lineNumber !== undefined && lineNumberWidth !== undefined && (
        <Text dimColor>
          {String(lineNumber).padStart(lineNumberWidth, ' ')} {' '}
        </Text>
      )}
      <Text color={defaultColor as Parameters<typeof Text>[0]['color']}>{plainText}</Text>
    </Box>
  );
};

/**
 * Main ChartRenderer component
 */
export const ChartRenderer: React.FC<ChartRendererProps> = ({
  content,
  title,
  borderStyle = 'single',
  colors = DEFAULT_COLORS,
  minWidth,
  maxWidth,
  showLineNumbers = false,
  paddingX = 1,
  paddingY = 0,
  preserveAnsi = true,
}) => {
  const mergedColors = { ...DEFAULT_COLORS, ...colors };
  const borderChars = BORDER_CHARS[borderStyle];

  // Process content lines
  const processedContent = useMemo(() => {
    let lines = content.split('\n');

    // Remove trailing empty lines
    while (lines.length > 0 && lines[lines.length - 1]?.trim() === '') {
      lines.pop();
    }

    // Remove leading empty lines
    while (lines.length > 0 && lines[0]?.trim() === '') {
      lines.shift();
    }

    return lines;
  }, [content]);

  // Calculate dimensions
  const contentWidth = useMemo(() => {
    const naturalWidth = getMaxLineWidth(content);
    let width = naturalWidth;

    if (minWidth !== undefined) {
      width = Math.max(width, minWidth);
    }
    if (maxWidth !== undefined) {
      width = Math.min(width, maxWidth);
    }

    return width;
  }, [content, minWidth, maxWidth]);

  // Calculate line number width if needed
  const lineNumberWidth = showLineNumbers
    ? String(processedContent.length).length
    : 0;

  // Calculate total width including borders and padding
  const totalWidth =
    (borderStyle !== 'none' ? 2 : 0) + // Left and right borders
    paddingX * 2 + // Left and right padding
    (showLineNumbers ? lineNumberWidth + 2 : 0) + // Line numbers
    contentWidth;

  // Render title bar
  const renderTitle = () => {
    if (!title || borderStyle === 'none') {
      return null;
    }

    const titleWithPadding = ` ${title} `;
    const titleWidth = titleWithPadding.length;
    const availableWidth = totalWidth - 2; // Subtract corners
    const remainingWidth = availableWidth - titleWidth - 2; // Subtract title delimiters
    const leftPadding = Math.floor(remainingWidth / 2);
    const rightPadding = remainingWidth - leftPadding;

    return (
      <Box>
        <Text color={mergedColors.border as Parameters<typeof Text>[0]['color']}>
          {borderChars.topLeft}
          {borderChars.horizontal.repeat(leftPadding)}
          {borderChars.titleLeft}
        </Text>
        <Text color={mergedColors.title as Parameters<typeof Text>[0]['color']} bold>
          {titleWithPadding}
        </Text>
        <Text color={mergedColors.border as Parameters<typeof Text>[0]['color']}>
          {borderChars.titleRight}
          {borderChars.horizontal.repeat(rightPadding)}
          {borderChars.topRight}
        </Text>
      </Box>
    );
  };

  // Render top border (when no title)
  const renderTopBorder = () => {
    if (title || borderStyle === 'none') {
      return null;
    }

    const innerWidth = totalWidth - 2;

    return (
      <Box>
        <Text color={mergedColors.border as Parameters<typeof Text>[0]['color']}>
          {borderChars.topLeft}
          {borderChars.horizontal.repeat(innerWidth)}
          {borderChars.topRight}
        </Text>
      </Box>
    );
  };

  // Render bottom border
  const renderBottomBorder = () => {
    if (borderStyle === 'none') {
      return null;
    }

    const innerWidth = totalWidth - 2;

    return (
      <Box>
        <Text color={mergedColors.border as Parameters<typeof Text>[0]['color']}>
          {borderChars.bottomLeft}
          {borderChars.horizontal.repeat(innerWidth)}
          {borderChars.bottomRight}
        </Text>
      </Box>
    );
  };

  // Render a content line
  const renderContentLine = (line: string, index: number) => {
    const visibleWidth = getVisibleWidth(line);
    const padding = ' '.repeat(Math.max(0, contentWidth - visibleWidth));

    return (
      <Box key={index}>
        {borderStyle !== 'none' && (
          <Text color={mergedColors.border as Parameters<typeof Text>[0]['color']}>
            {borderChars.vertical}
          </Text>
        )}
        <Text>{' '.repeat(paddingX)}</Text>
        <ChartLine
          line={line + padding}
          preserveAnsi={preserveAnsi}
          defaultColor={mergedColors.content}
          lineNumber={showLineNumbers ? index + 1 : undefined}
          lineNumberWidth={showLineNumbers ? lineNumberWidth : undefined}
        />
        <Text>{' '.repeat(paddingX)}</Text>
        {borderStyle !== 'none' && (
          <Text color={mergedColors.border as Parameters<typeof Text>[0]['color']}>
            {borderChars.vertical}
          </Text>
        )}
      </Box>
    );
  };

  // Render padding lines
  const renderPaddingLines = (count: number) => {
    if (count <= 0 || borderStyle === 'none') {
      return null;
    }

    const innerWidth = totalWidth - 2;

    return Array(count)
      .fill(0)
      .map((_, i) => (
        <Box key={`padding-${i}`}>
          <Text color={mergedColors.border as Parameters<typeof Text>[0]['color']}>
            {borderChars.vertical}
          </Text>
          <Text>{' '.repeat(innerWidth)}</Text>
          <Text color={mergedColors.border as Parameters<typeof Text>[0]['color']}>
            {borderChars.vertical}
          </Text>
        </Box>
      ));
  };

  return (
    <Box flexDirection="column">
      {renderTitle()}
      {renderTopBorder()}
      {renderPaddingLines(paddingY)}
      {processedContent.map(renderContentLine)}
      {renderPaddingLines(paddingY)}
      {renderBottomBorder()}
    </Box>
  );
};

/**
 * Simple chart block renderer without border
 */
export const ChartBlock: React.FC<{
  content: string;
  preserveAnsi?: boolean;
  color?: string;
}> = ({ content, preserveAnsi = true, color }) => {
  const lines = content.split('\n');

  return (
    <Box flexDirection="column">
      {lines.map((line, i) => (
        <ChartLine
          key={i}
          line={line}
          preserveAnsi={preserveAnsi}
          defaultColor={color}
        />
      ))}
    </Box>
  );
};

/**
 * Utility function to render chart content as string array
 * (for non-React contexts)
 */
export function renderChartToLines(
  content: string,
  options: {
    title?: string;
    borderStyle?: ChartBorderStyle;
    minWidth?: number;
    maxWidth?: number;
    paddingX?: number;
    paddingY?: number;
    preserveAnsi?: boolean;
  } = {}
): string[] {
  const {
    title,
    borderStyle = 'single',
    minWidth,
    maxWidth,
    paddingX = 1,
    paddingY = 0,
    preserveAnsi = false,
  } = options;

  const borderChars = BORDER_CHARS[borderStyle];
  let lines = content.split('\n');

  // Trim empty lines
  while (lines.length > 0 && lines[lines.length - 1]?.trim() === '') {
    lines.pop();
  }
  while (lines.length > 0 && lines[0]?.trim() === '') {
    lines.shift();
  }

  // Calculate width
  let contentWidth = lines.length > 0
    ? Math.max(...lines.map((l) => (preserveAnsi ? getVisibleWidth(l) : l.length)), 0)
    : 0;
  if (minWidth !== undefined) contentWidth = Math.max(contentWidth, minWidth);
  if (maxWidth !== undefined) contentWidth = Math.min(contentWidth, maxWidth);
  // Ensure minimum width of 1 for empty content
  contentWidth = Math.max(contentWidth, 1);

  const totalWidth = (borderStyle !== 'none' ? 2 : 0) + paddingX * 2 + contentWidth;
  const result: string[] = [];

  // Top border or title
  if (borderStyle !== 'none') {
    if (title) {
      const titleWithPadding = ` ${title} `;
      const remainingWidth = totalWidth - 2 - titleWithPadding.length - 2;
      const leftPad = Math.floor(remainingWidth / 2);
      const rightPad = remainingWidth - leftPad;
      result.push(
        borderChars.topLeft +
          borderChars.horizontal.repeat(leftPad) +
          borderChars.titleLeft +
          titleWithPadding +
          borderChars.titleRight +
          borderChars.horizontal.repeat(rightPad) +
          borderChars.topRight
      );
    } else {
      result.push(
        borderChars.topLeft +
          borderChars.horizontal.repeat(totalWidth - 2) +
          borderChars.topRight
      );
    }
  }

  // Padding lines
  for (let i = 0; i < paddingY; i++) {
    if (borderStyle !== 'none') {
      result.push(borderChars.vertical + ' '.repeat(totalWidth - 2) + borderChars.vertical);
    } else {
      result.push('');
    }
  }

  // Content lines
  for (const line of lines) {
    const processedLine = preserveAnsi ? line : stripAnsi(line);
    const lineWidth = preserveAnsi ? getVisibleWidth(line) : processedLine.length;
    const padding = ' '.repeat(Math.max(0, contentWidth - lineWidth));

    if (borderStyle !== 'none') {
      result.push(
        borderChars.vertical +
          ' '.repeat(paddingX) +
          processedLine +
          padding +
          ' '.repeat(paddingX) +
          borderChars.vertical
      );
    } else {
      result.push(' '.repeat(paddingX) + processedLine + padding + ' '.repeat(paddingX));
    }
  }

  // Padding lines
  for (let i = 0; i < paddingY; i++) {
    if (borderStyle !== 'none') {
      result.push(borderChars.vertical + ' '.repeat(totalWidth - 2) + borderChars.vertical);
    } else {
      result.push('');
    }
  }

  // Bottom border
  if (borderStyle !== 'none') {
    result.push(
      borderChars.bottomLeft +
        borderChars.horizontal.repeat(totalWidth - 2) +
        borderChars.bottomRight
    );
  }

  return result;
}

/**
 * Create a bar chart string representation
 */
export function createBarChartString(
  data: Array<{ label: string; value: number; color?: string }>,
  options: {
    width?: number;
    barChar?: string;
    showValues?: boolean;
    maxValue?: number;
  } = {}
): string {
  const { width = 30, barChar = '█', showValues = true, maxValue } = options;
  const max = maxValue ?? Math.max(...data.map((d) => d.value), 1);
  const maxLabelWidth = Math.max(...data.map((d) => d.label.length));

  const lines = data.map((item) => {
    const barWidth = Math.round((item.value / max) * width);
    const bar = barChar.repeat(barWidth);
    const label = item.label.padEnd(maxLabelWidth);
    return showValues ? `${label} ${bar} ${item.value}` : `${label} ${bar}`;
  });

  return lines.join('\n');
}

/**
 * Create a line chart string representation
 */
export function createLineChartString(
  data: number[],
  options: {
    width?: number;
    height?: number;
    showAxis?: boolean;
  } = {}
): string {
  const { width = 40, height = 10, showAxis = true } = options;

  if (data.length === 0) return '';

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  // Create grid
  const grid: string[][] = Array(height)
    .fill(null)
    .map(() => Array(width).fill(' '));

  // Plot points
  const step = Math.max(1, Math.floor(data.length / width));
  for (let x = 0; x < width && x * step < data.length; x++) {
    const value = data[x * step] ?? 0;
    const y = Math.floor(((value - min) / range) * (height - 1));
    const gridY = height - 1 - y;
    if (grid[gridY]) {
      grid[gridY][x] = '•';
    }
  }

  const lines: string[] = [];

  if (showAxis) {
    lines.push(`${max.toFixed(1).padStart(6)} ┤`);
  }

  for (const row of grid) {
    const rowStr = row.join('');
    if (showAxis) {
      lines.push(`${''.padStart(6)}│${rowStr}`);
    } else {
      lines.push(rowStr);
    }
  }

  if (showAxis) {
    lines.push(`${min.toFixed(1).padStart(6)} ┤`);
    lines.push(`${''.padStart(6)}└${'─'.repeat(width)}`);
  }

  return lines.join('\n');
}
