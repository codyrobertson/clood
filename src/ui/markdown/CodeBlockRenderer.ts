/**
 * Code Block Renderer (UOW-0410)
 *
 * Renders code blocks with:
 * - No text wrapping (preserves exact layout)
 * - Preserved whitespace and indentation
 * - Optional syntax highlighting (using cli-highlight)
 * - Border/background styling for terminal display
 */

import { highlight } from 'cli-highlight';
import type { MarkdownRenderOptions } from './MarkdownParser.js';

/**
 * ANSI escape codes for terminal styling
 */
const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  italic: '\x1b[3m',
  underline: '\x1b[4m',
  // Colors
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
  // Background colors
  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m',
  bgGray: '\x1b[100m',
} as const;

/**
 * Box drawing characters for code block borders
 */
const BOX = {
  topLeft: '\u256d',     // rounded corner
  topRight: '\u256e',
  bottomLeft: '\u2570',
  bottomRight: '\u256f',
  horizontal: '\u2500',
  vertical: '\u2502',
  // Alternative: sharp corners
  sharpTopLeft: '\u250c',
  sharpTopRight: '\u2510',
  sharpBottomLeft: '\u2514',
  sharpBottomRight: '\u2518',
} as const;

/**
 * Options specific to code block rendering
 */
export interface CodeBlockOptions {
  /** The code content to render */
  code: string;
  /** Programming language for syntax highlighting */
  language?: string;
  /** Whether to show line numbers */
  showLineNumbers?: boolean;
  /** Starting line number (default: 1) */
  startLineNumber?: number;
  /** Whether to show a border around the code block */
  showBorder?: boolean;
  /** Whether to use rounded corners for the border */
  roundedCorners?: boolean;
  /** Whether to show the language label */
  showLanguageLabel?: boolean;
  /** Whether to use ANSI colors */
  useColors?: boolean;
  /** Enable syntax highlighting */
  syntaxHighlight?: boolean;
  /** Tab size for expanding tabs to spaces */
  tabSize?: number;
  /** Maximum width (for border calculation, does NOT wrap code) */
  maxWidth?: number;
  /** Highlight specific line numbers */
  highlightLines?: number[];
}

const DEFAULT_CODE_BLOCK_OPTIONS: Required<CodeBlockOptions> = {
  code: '',
  language: '',
  showLineNumbers: true,
  startLineNumber: 1,
  showBorder: true,
  roundedCorners: true,
  showLanguageLabel: true,
  useColors: true,
  syntaxHighlight: true,
  tabSize: 2,
  maxWidth: 80,
  highlightLines: [],
};

/**
 * Language aliases for syntax highlighting
 */
const LANGUAGE_ALIASES: Record<string, string> = {
  'js': 'javascript',
  'ts': 'typescript',
  'py': 'python',
  'rb': 'ruby',
  'yml': 'yaml',
  'sh': 'bash',
  'shell': 'bash',
  'zsh': 'bash',
  'dockerfile': 'docker',
  'c++': 'cpp',
  'c#': 'csharp',
  'f#': 'fsharp',
  'md': 'markdown',
  'rs': 'rust',
  'kt': 'kotlin',
  'ex': 'elixir',
  'exs': 'elixir',
  'hs': 'haskell',
  'erl': 'erlang',
  'pl': 'perl',
  'ps1': 'powershell',
  'psm1': 'powershell',
};

/**
 * Normalize language name for syntax highlighting
 */
function normalizeLanguage(lang?: string): string | undefined {
  if (!lang) return undefined;
  const lower = lang.toLowerCase().trim();
  return LANGUAGE_ALIASES[lower] ?? lower;
}

/**
 * Apply ANSI styling to text
 */
function style(text: string, ...styles: (keyof typeof ANSI)[]): string {
  if (styles.length === 0) return text;
  const codes = styles.map((s) => ANSI[s]).join('');
  return codes + text + ANSI.reset;
}

/**
 * Expand tabs to spaces while preserving alignment
 */
function expandTabs(line: string, tabSize: number): string {
  let result = '';
  let column = 0;

  for (const char of line) {
    if (char === '\t') {
      const spacesToAdd = tabSize - (column % tabSize);
      result += ' '.repeat(spacesToAdd);
      column += spacesToAdd;
    } else {
      result += char;
      column++;
    }
  }

  return result;
}

/**
 * Get the display width of a string, accounting for ANSI codes
 */
function getDisplayWidth(str: string): number {
  // Strip ANSI codes for width calculation
  const stripped = str.replace(/\x1b\[[0-9;]*m/g, '');
  return stripped.length;
}

/**
 * Perform syntax highlighting on code
 */
function highlightCode(code: string, language?: string, useColors: boolean = true): string {
  if (!useColors || !language) {
    return code;
  }

  const normalizedLang = normalizeLanguage(language);

  try {
    // Use cli-highlight for syntax highlighting
    return highlight(code, {
      language: normalizedLang,
      ignoreIllegals: true,
    });
  } catch {
    // If highlighting fails, return plain code
    return code;
  }
}

/**
 * Render a code block with all styling options
 */
export function renderCodeBlock(options: CodeBlockOptions): string {
  const opts: Required<CodeBlockOptions> = { ...DEFAULT_CODE_BLOCK_OPTIONS, ...options };

  // Handle empty code
  if (opts.code === '') {
    return '';
  }

  const lines = opts.code.split('\n');
  const output: string[] = [];

  // Expand tabs in all lines
  const expandedLines = lines.map((line) => expandTabs(line, opts.tabSize));

  // Apply syntax highlighting if enabled
  let processedLines: string[];
  if (opts.syntaxHighlight && opts.language && opts.useColors) {
    // Highlight the entire code block, then split
    const highlighted = highlightCode(expandedLines.join('\n'), opts.language, opts.useColors);
    processedLines = highlighted.split('\n');
  } else {
    processedLines = expandedLines;
  }

  // Calculate line number width
  const totalLines = lines.length + opts.startLineNumber - 1;
  const lineNumberWidth = opts.showLineNumbers ? String(totalLines).length : 0;

  // Calculate the maximum line width for borders
  let maxLineWidth = 0;
  for (const line of expandedLines) {
    maxLineWidth = Math.max(maxLineWidth, getDisplayWidth(line));
  }

  // Account for line numbers in width calculation
  const prefixWidth = opts.showLineNumbers ? lineNumberWidth + 3 : 2; // " | " or "  "
  const contentWidth = Math.max(maxLineWidth, 20); // Minimum width of 20
  const totalWidth = Math.min(prefixWidth + contentWidth + 2, opts.maxWidth);

  // Get border characters
  const corners = opts.roundedCorners
    ? { tl: BOX.topLeft, tr: BOX.topRight, bl: BOX.bottomLeft, br: BOX.bottomRight }
    : { tl: BOX.sharpTopLeft, tr: BOX.sharpTopRight, bl: BOX.sharpBottomLeft, br: BOX.sharpBottomRight };

  // Render top border with language label
  if (opts.showBorder) {
    let topLine = corners.tl;
    if (opts.showLanguageLabel && opts.language) {
      const langLabel = ` ${opts.language} `;
      topLine += langLabel;
      topLine += BOX.horizontal.repeat(Math.max(0, totalWidth - langLabel.length - 2));
    } else {
      topLine += BOX.horizontal.repeat(totalWidth - 2);
    }
    topLine += corners.tr;
    output.push(opts.useColors ? style(topLine, 'gray') : topLine);
  } else if (opts.showLanguageLabel && opts.language) {
    // Show language label without border
    output.push(opts.useColors ? style(`[${opts.language}]`, 'dim') : `[${opts.language}]`);
  }

  // Render code lines
  for (let i = 0; i < processedLines.length; i++) {
    const lineNumber = opts.startLineNumber + i;
    const line = processedLines[i] ?? '';
    const isHighlighted = opts.highlightLines.includes(lineNumber);

    let renderedLine = '';

    // Border left edge
    if (opts.showBorder) {
      renderedLine += opts.useColors ? style(BOX.vertical, 'gray') : BOX.vertical;
    }

    // Line number
    if (opts.showLineNumbers) {
      const numStr = String(lineNumber).padStart(lineNumberWidth, ' ');
      if (opts.useColors) {
        renderedLine += isHighlighted
          ? style(numStr, 'yellow', 'bold')
          : style(numStr, 'dim');
        renderedLine += style(' \u2502 ', 'dim'); // vertical line separator
      } else {
        renderedLine += numStr + ' | ';
      }
    } else {
      renderedLine += ' ';
    }

    // Code content (NO WRAPPING - preserved exactly)
    if (isHighlighted && opts.useColors) {
      renderedLine += style(line, 'bgYellow', 'black');
    } else {
      renderedLine += line;
    }

    // Padding to border (only if showing border)
    if (opts.showBorder) {
      const currentWidth = getDisplayWidth(renderedLine);
      const padding = Math.max(0, totalWidth - currentWidth - 1);
      renderedLine += ' '.repeat(padding);
      renderedLine += opts.useColors ? style(BOX.vertical, 'gray') : BOX.vertical;
    }

    output.push(renderedLine);
  }

  // Render bottom border
  if (opts.showBorder) {
    let bottomLine = corners.bl;
    bottomLine += BOX.horizontal.repeat(totalWidth - 2);
    bottomLine += corners.br;
    output.push(opts.useColors ? style(bottomLine, 'gray') : bottomLine);
  }

  return output.join('\n');
}

/**
 * Render inline code with styling
 */
export function renderInlineCode(code: string, useColors: boolean = true): string {
  if (!useColors) {
    return `\`${code}\``;
  }
  return style(` ${code} `, 'yellow', 'bgGray');
}

/**
 * Create a CodeBlockRenderer from MarkdownRenderOptions
 */
export function createCodeBlockFromRenderOptions(
  code: string,
  language?: string,
  options?: MarkdownRenderOptions
): string {
  return renderCodeBlock({
    code,
    language,
    showLineNumbers: true,
    showBorder: options?.codeBlockBorder ?? true,
    showLanguageLabel: options?.showLanguageLabel ?? true,
    useColors: options?.useColors ?? true,
    syntaxHighlight: options?.syntaxHighlight ?? true,
    tabSize: options?.tabSize ?? 2,
    maxWidth: options?.width ?? 80,
  });
}

/**
 * CodeBlockRenderer class for object-oriented usage
 */
export class CodeBlockRenderer {
  private options: Required<CodeBlockOptions>;

  constructor(options: Partial<CodeBlockOptions> = {}) {
    this.options = { ...DEFAULT_CODE_BLOCK_OPTIONS, ...options };
  }

  /**
   * Render a code block
   */
  render(code: string, language?: string): string {
    return renderCodeBlock({
      ...this.options,
      code,
      language: language ?? this.options.language,
    });
  }

  /**
   * Render inline code
   */
  renderInline(code: string): string {
    return renderInlineCode(code, this.options.useColors);
  }

  /**
   * Update renderer options
   */
  setOptions(options: Partial<CodeBlockOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Get current options
   */
  getOptions(): Required<CodeBlockOptions> {
    return { ...this.options };
  }
}

/**
 * Export default instance
 */
export const defaultCodeBlockRenderer = new CodeBlockRenderer();
