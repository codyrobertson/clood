/**
 * Formatting Utilities
 *
 * Provides text formatting helpers for the TUI.
 */

/**
 * Format message content for display.
 * Handles code blocks, preserves whitespace for ASCII art, etc.
 * @param content - The message content to format
 * @param _maxWidth - Maximum width for formatting (reserved for future use)
 */
export function formatMessageContent(content: string, _maxWidth: number): string {
  // For now, return content as-is
  // Future enhancements: syntax highlighting, markdown rendering
  return content;
}

/**
 * Detect if content appears to be an ASCII diagram.
 * Looks for common box-drawing characters and patterns.
 */
export function isAsciiDiagram(content: string): boolean {
  // Box-drawing characters (Unicode)
  const boxChars = /[─│┌┐└┘├┤┬┴┼╭╮╯╰═║╔╗╚╝╠╣╦╩╬]/;

  // Common ASCII art patterns:
  // - Box corners and edges: +--+ or |--|
  // - Lines enclosed by |: | text |
  // - Arrows: -->, <--, ->, <-, =>, <=
  // - Long dashes or equals: --- or ===
  // - Box row: +---+
  const asciiPatterns = /[+\-|][-+|]+|^\s*\|.*\|\s*$|-->|<--|->|<-|=>|<=|---+|===+|\+[-=]+\+/;

  const lines = content.split('\n');

  // If content has multiple lines with box-drawing chars, likely a diagram
  let boxCharLineCount = 0;
  for (const line of lines) {
    if (boxChars.test(line) || asciiPatterns.test(line)) {
      boxCharLineCount++;
    }
  }

  // Consider it a diagram if >30% of lines have diagram-like characters
  // and there are at least 3 such lines
  return boxCharLineCount >= 3 && boxCharLineCount / lines.length > 0.3;
}

/**
 * Truncate text to fit within a maximum width.
 */
export function truncate(text: string, maxWidth: number): string {
  if (text.length <= maxWidth) {
    return text;
  }
  return text.slice(0, maxWidth - 3) + '...';
}

/**
 * Pad a string to a specific width.
 */
export function pad(text: string, width: number, align: 'left' | 'right' | 'center' = 'left'): string {
  if (text.length >= width) {
    return text;
  }

  const padding = width - text.length;

  switch (align) {
    case 'right':
      return ' '.repeat(padding) + text;
    case 'center':
      const leftPad = Math.floor(padding / 2);
      const rightPad = padding - leftPad;
      return ' '.repeat(leftPad) + text + ' '.repeat(rightPad);
    case 'left':
    default:
      return text + ' '.repeat(padding);
  }
}

/**
 * Format a duration in milliseconds to a human-readable string.
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  if (ms < 60000) {
    return `${(ms / 1000).toFixed(1)}s`;
  }
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

/**
 * Format a timestamp to a short time string.
 */
export function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

/**
 * Generate a unique ID.
 */
let idCounter = 0;
export function generateId(): string {
  return `${Date.now()}-${++idCounter}`;
}
