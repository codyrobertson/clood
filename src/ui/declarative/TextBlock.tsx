/**
 * Declarative TextBlock Component (UOW-0810)
 *
 * A sophisticated text rendering component with:
 * - ANSI-safe rendering
 * - Unicode width awareness (using string-width)
 * - Truncation with ellipsis
 * - Word wrapping option
 */

import React, { useMemo } from 'react';
import { Box, Text } from 'ink';
import stringWidth from 'string-width';
import stripAnsi from 'strip-ansi';
import wrapAnsi from 'wrap-ansi';

export type TextAlign = 'left' | 'center' | 'right';
export type TextStyle = 'normal' | 'bold' | 'italic' | 'underline' | 'strikethrough' | 'inverse';
export type TextColor =
  | 'black' | 'red' | 'green' | 'yellow' | 'blue' | 'magenta' | 'cyan' | 'white' | 'gray'
  | 'blackBright' | 'redBright' | 'greenBright' | 'yellowBright' | 'blueBright' | 'magentaBright' | 'cyanBright' | 'whiteBright';

export interface TextBlockProps {
  /** Unique component ID */
  id: string;
  /** Text content (can include ANSI codes) */
  content: string;
  /** Maximum width for wrapping/truncation */
  maxWidth?: number;
  /** Maximum number of lines to display */
  maxLines?: number;
  /** Enable word wrapping */
  wrap?: boolean;
  /** Hard wrap (break words) vs soft wrap (at word boundaries) */
  hardWrap?: boolean;
  /** Truncate with ellipsis when exceeding maxWidth */
  truncate?: boolean;
  /** Custom ellipsis character(s) */
  ellipsis?: string;
  /** Truncation position */
  truncatePosition?: 'end' | 'middle' | 'start';
  /** Text alignment */
  align?: TextAlign;
  /** Text color */
  color?: TextColor;
  /** Background color */
  backgroundColor?: TextColor;
  /** Text style(s) */
  style?: TextStyle | TextStyle[];
  /** Whether text is dimmed */
  dimColor?: boolean;
  /** Preserve ANSI escape codes */
  preserveAnsi?: boolean;
  /** Line height (via padding) */
  lineSpacing?: number;
  /** Indent first line */
  indent?: number;
  /** Indent all lines except first (hanging indent) */
  hangingIndent?: number;
  /** Whether component is visible */
  visible?: boolean;
}

/**
 * Calculate the visual width of a string accounting for Unicode and ANSI
 */
export function getVisualWidth(text: string): number {
  return stringWidth(text);
}

/**
 * Truncate text to a specific visual width, preserving ANSI codes
 */
export function truncateText(
  text: string,
  maxWidth: number,
  options: {
    ellipsis?: string;
    position?: 'end' | 'middle' | 'start';
    preserveAnsi?: boolean;
  } = {}
): string {
  const {
    ellipsis = '\u2026', // Unicode ellipsis character
    position = 'end',
    preserveAnsi = true,
  } = options;

  const ellipsisWidth = getVisualWidth(ellipsis);

  // Get the plain text version for width calculation
  const plainText = preserveAnsi ? stripAnsi(text) : text;
  const textWidth = getVisualWidth(plainText);

  // If text fits, return as-is
  if (textWidth <= maxWidth) {
    return text;
  }

  // If maxWidth is smaller than ellipsis, just return ellipsis truncated
  if (maxWidth <= ellipsisWidth) {
    return ellipsis.slice(0, maxWidth);
  }

  const availableWidth = maxWidth - ellipsisWidth;

  // For ANSI-preserving truncation, we need to strip codes, truncate, then the output won't have codes
  // A more sophisticated approach would track ANSI state - for now, strip and truncate plain text
  const workingText = preserveAnsi ? plainText : text;

  switch (position) {
    case 'start': {
      // Truncate from start: ...ending
      let result = '';
      let width = 0;

      // Iterate from end to find what fits
      const chars = [...workingText].reverse();
      for (const char of chars) {
        const charWidth = getVisualWidth(char);
        if (width + charWidth > availableWidth) break;
        result = char + result;
        width += charWidth;
      }

      return ellipsis + result;
    }

    case 'middle': {
      // Truncate in middle: begin...end
      const halfWidth = Math.floor(availableWidth / 2);
      const secondHalfWidth = availableWidth - halfWidth;

      let startPart = '';
      let startWidth = 0;

      for (const char of workingText) {
        const charWidth = getVisualWidth(char);
        if (startWidth + charWidth > halfWidth) break;
        startPart += char;
        startWidth += charWidth;
      }

      let endPart = '';
      let endWidth = 0;
      const chars = [...workingText].reverse();

      for (const char of chars) {
        const charWidth = getVisualWidth(char);
        if (endWidth + charWidth > secondHalfWidth) break;
        endPart = char + endPart;
        endWidth += charWidth;
      }

      return startPart + ellipsis + endPart;
    }

    case 'end':
    default: {
      // Truncate at end: beginning...
      let result = '';
      let width = 0;

      for (const char of workingText) {
        const charWidth = getVisualWidth(char);
        if (width + charWidth > availableWidth) break;
        result += char;
        width += charWidth;
      }

      return result + ellipsis;
    }
  }
}

/**
 * Pad text to a specific width with alignment
 */
export function padText(text: string, width: number, align: TextAlign = 'left'): string {
  const textWidth = getVisualWidth(text);

  if (textWidth >= width) {
    return text;
  }

  const padding = width - textWidth;

  switch (align) {
    case 'right':
      return ' '.repeat(padding) + text;
    case 'center': {
      const leftPad = Math.floor(padding / 2);
      const rightPad = padding - leftPad;
      return ' '.repeat(leftPad) + text + ' '.repeat(rightPad);
    }
    case 'left':
    default:
      return text + ' '.repeat(padding);
  }
}

/**
 * Wrap text to a specific width, preserving ANSI codes
 */
export function wrapText(
  text: string,
  maxWidth: number,
  options: {
    hard?: boolean;
    trim?: boolean;
    preserveAnsi?: boolean;
  } = {}
): string[] {
  const {
    hard = false,
    trim = true,
    // preserveAnsi is handled by wrap-ansi internally
    preserveAnsi: _preserveAnsi = true,
  } = options;

  // Use wrap-ansi for ANSI-safe wrapping
  const wrapped = wrapAnsi(text, maxWidth, {
    hard,
    trim,
    wordWrap: !hard,
  });

  return wrapped.split('\n');
}

/**
 * Apply indentation to lines
 */
function applyIndentation(
  lines: string[],
  indent: number = 0,
  hangingIndent: number = 0
): string[] {
  return lines.map((line, index) => {
    if (index === 0) {
      return ' '.repeat(indent) + line;
    }
    return ' '.repeat(hangingIndent) + line;
  });
}

/**
 * TextBlock Component
 */
export const TextBlock: React.FC<TextBlockProps> = ({
  id: _id,
  content,
  maxWidth,
  maxLines,
  wrap = false,
  hardWrap = false,
  truncate = false,
  ellipsis = '\u2026',
  truncatePosition = 'end',
  align = 'left',
  color,
  backgroundColor,
  style,
  dimColor = false,
  preserveAnsi = true,
  lineSpacing = 0,
  indent = 0,
  hangingIndent = 0,
  visible = true,
}) => {
  // Process the text content
  const processedLines = useMemo(() => {
    if (!content) return [];

    let lines: string[];

    // Step 1: Handle wrapping
    if (wrap && maxWidth) {
      // Adjust width for indentation
      const effectiveWidth = Math.max(1, maxWidth - Math.max(indent, hangingIndent));
      lines = wrapText(content, effectiveWidth, {
        hard: hardWrap,
        preserveAnsi,
      });
    } else {
      // Split by existing newlines
      lines = content.split('\n');
    }

    // Step 2: Apply truncation to each line if needed
    if (truncate && maxWidth) {
      const effectiveWidth = maxWidth - (indent > 0 ? indent : 0);
      lines = lines.map((line, index) => {
        const lineIndent = index === 0 ? indent : hangingIndent;
        const lineWidth = effectiveWidth - lineIndent + indent;
        return truncateText(line, lineWidth, {
          ellipsis,
          position: truncatePosition,
          preserveAnsi,
        });
      });
    }

    // Step 3: Apply indentation
    if (indent > 0 || hangingIndent > 0) {
      lines = applyIndentation(lines, indent, hangingIndent);
    }

    // Step 4: Apply alignment
    if (maxWidth && align !== 'left') {
      lines = lines.map(line => padText(line, maxWidth, align));
    }

    // Step 5: Limit number of lines
    if (maxLines && lines.length > maxLines) {
      lines = lines.slice(0, maxLines);
      // Add ellipsis to last line if truncated
      if (lines.length > 0) {
        const lastLine = lines[lines.length - 1];
        if (lastLine !== undefined) {
          lines[lines.length - 1] = lastLine.trimEnd() + ellipsis;
        }
      }
    }

    return lines;
  }, [
    content,
    maxWidth,
    maxLines,
    wrap,
    hardWrap,
    truncate,
    ellipsis,
    truncatePosition,
    align,
    preserveAnsi,
    indent,
    hangingIndent,
  ]);

  if (!visible) {
    return null;
  }

  // Determine text styles
  const styles = Array.isArray(style) ? style : style ? [style] : [];
  const isBold = styles.includes('bold');
  const isItalic = styles.includes('italic');
  const isUnderline = styles.includes('underline');
  const isStrikethrough = styles.includes('strikethrough');
  const isInverse = styles.includes('inverse');

  // Render lines with optional spacing
  return (
    <Box flexDirection="column">
      {processedLines.map((line, index) => (
        <Box key={index} marginBottom={index < processedLines.length - 1 ? lineSpacing : 0}>
          <Text
            color={color}
            backgroundColor={backgroundColor}
            bold={isBold}
            italic={isItalic}
            underline={isUnderline}
            strikethrough={isStrikethrough}
            inverse={isInverse}
            dimColor={dimColor}
          >
            {line}
          </Text>
        </Box>
      ))}
    </Box>
  );
};

/**
 * Simple text component for single-line text
 */
export interface SimpleTextProps {
  id: string;
  content: string;
  maxWidth?: number;
  truncate?: boolean;
  color?: TextColor;
  bold?: boolean;
  dim?: boolean;
}

export const SimpleText: React.FC<SimpleTextProps> = ({
  id,
  content,
  maxWidth,
  truncate = true,
  color,
  bold = false,
  dim = false,
}) => {
  return (
    <TextBlock
      id={id}
      content={content}
      maxWidth={maxWidth}
      truncate={truncate}
      color={color}
      style={bold ? 'bold' : 'normal'}
      dimColor={dim}
    />
  );
};

/**
 * Code block with monospace styling
 */
export interface CodeBlockProps {
  id: string;
  content: string;
  maxWidth?: number;
  maxLines?: number;
  language?: string;
  showLineNumbers?: boolean;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({
  id,
  content,
  maxWidth,
  maxLines,
  language: _language,
  showLineNumbers = false,
}) => {
  const lines = content.split('\n');
  const lineNumberWidth = showLineNumbers ? String(lines.length).length + 2 : 0;
  const codeWidth = maxWidth ? maxWidth - lineNumberWidth : undefined;

  const displayLines = maxLines ? lines.slice(0, maxLines) : lines;
  const truncated = maxLines && lines.length > maxLines;

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="gray" paddingX={1}>
      {displayLines.map((line, index) => (
        <Box key={index}>
          {showLineNumbers && (
            <Text dimColor>
              {String(index + 1).padStart(lineNumberWidth - 1)} {' '}
            </Text>
          )}
          <TextBlock
            id={`${id}-line-${index}`}
            content={line || ' '}
            maxWidth={codeWidth}
            truncate={true}
            preserveAnsi={true}
          />
        </Box>
      ))}
      {truncated && (
        <Text dimColor italic>
          ... {lines.length - (maxLines || 0)} more lines
        </Text>
      )}
    </Box>
  );
};

/**
 * Paragraph component for multi-line wrapped text
 */
export interface ParagraphProps {
  id: string;
  content: string;
  maxWidth?: number;
  indent?: number;
  align?: TextAlign;
  color?: TextColor;
}

export const Paragraph: React.FC<ParagraphProps> = ({
  id,
  content,
  maxWidth = 80,
  indent = 0,
  align = 'left',
  color,
}) => {
  return (
    <TextBlock
      id={id}
      content={content}
      maxWidth={maxWidth}
      wrap={true}
      indent={indent}
      align={align}
      color={color}
    />
  );
};

/**
 * Label component for form labels and headings
 */
export interface LabelProps {
  id: string;
  content: string;
  required?: boolean;
  color?: TextColor;
  bold?: boolean;
}

export const Label: React.FC<LabelProps> = ({
  id,
  content,
  required = false,
  color,
  bold = true,
}) => {
  return (
    <Box>
      <TextBlock
        id={id}
        content={content}
        color={color}
        style={bold ? 'bold' : 'normal'}
      />
      {required && <Text color="red"> *</Text>}
    </Box>
  );
};

/**
 * Highlight component for emphasized text
 */
export interface HighlightProps {
  id: string;
  content: string;
  highlightColor?: TextColor;
  backgroundColor?: TextColor;
}

export const Highlight: React.FC<HighlightProps> = ({
  id,
  content,
  highlightColor = 'yellow',
  backgroundColor,
}) => {
  return (
    <TextBlock
      id={id}
      content={content}
      color={highlightColor}
      backgroundColor={backgroundColor}
      style="bold"
    />
  );
};
