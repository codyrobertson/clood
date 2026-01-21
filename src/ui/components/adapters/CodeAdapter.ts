/**
 * Code Renderer Adapter (UOW-0507)
 *
 * Renders plaintext/code content with line numbers.
 * Includes optional syntax highlighting flag (stub for future implementation).
 */

import { BaseRendererAdapter, type DocumentKind } from './RendererAdapter.js';

/**
 * ANSI escape codes for terminal styling
 */
const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  gray: '\x1b[90m',
};

export interface CodeAdapterOptions {
  /** Show line numbers (default: true) */
  showLineNumbers?: boolean;
  /** Enable ANSI styling (default: true) */
  useAnsi?: boolean;
  /** Starting line number (default: 1) */
  startLine?: number;
  /** Enable syntax highlighting (default: false, stub for future) */
  syntaxHighlight?: boolean;
  /** Language hint for syntax highlighting */
  language?: string;
  /** Minimum width for line number column (default: 4) */
  lineNumberWidth?: number;
  /** Tab size for expansion (default: 2) */
  tabSize?: number;
}

const DEFAULT_OPTIONS: Required<CodeAdapterOptions> = {
  showLineNumbers: true,
  useAnsi: true,
  startLine: 1,
  syntaxHighlight: false,
  language: '',
  lineNumberWidth: 4,
  tabSize: 2,
};

/**
 * Code/plaintext renderer adapter for terminal display
 */
export class CodeAdapter extends BaseRendererAdapter {
  readonly supportedKinds: DocumentKind[] = ['code', 'text'];
  private options: Required<CodeAdapterOptions>;

  constructor(options: CodeAdapterOptions = {}) {
    super();
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Render code/text content to terminal output
   */
  render(_kind: DocumentKind, content: string): string[] {
    const lines = content.split('\n');
    const output: string[] = [];

    // Calculate line number width based on total lines
    const totalLines = lines.length + this.options.startLine - 1;
    const lineNumberWidth = Math.max(
      this.options.lineNumberWidth,
      String(totalLines).length
    );

    for (let i = 0; i < lines.length; i++) {
      const lineNumber = this.options.startLine + i;
      const line = this.expandTabs(lines[i] ?? '');

      if (this.options.showLineNumbers) {
        const formattedLineNum = this.formatLineNumber(lineNumber, lineNumberWidth);
        const separator = this.style(' | ', 'dim');
        const styledLine = this.options.syntaxHighlight
          ? this.highlightSyntax(line)
          : line;
        output.push(formattedLineNum + separator + styledLine);
      } else {
        const styledLine = this.options.syntaxHighlight
          ? this.highlightSyntax(line)
          : line;
        output.push(styledLine);
      }
    }

    return output;
  }

  /**
   * Format line number with padding
   */
  private formatLineNumber(num: number, width: number): string {
    const numStr = String(num).padStart(width, ' ');
    return this.style(numStr, 'dim');
  }

  /**
   * Expand tabs to spaces
   */
  private expandTabs(line: string): string {
    return line.replace(/\t/g, ' '.repeat(this.options.tabSize));
  }

  /**
   * Apply ANSI styling if enabled
   */
  private style(text: string, ...styles: (keyof typeof ANSI)[]): string {
    if (!this.options.useAnsi) {
      return text;
    }

    const codes = styles.map((s) => ANSI[s]).join('');
    return codes + text + ANSI.reset;
  }

  /**
   * Stub for syntax highlighting (future implementation)
   *
   * This is a placeholder that demonstrates basic patterns.
   * A full implementation would use a syntax highlighting library
   * or implement language-specific tokenizers.
   */
  private highlightSyntax(line: string): string {
    if (!this.options.useAnsi) {
      return line;
    }

    // Basic stub highlighting - just highlights comments and strings
    // A real implementation would be much more sophisticated

    let highlighted = line;

    // Highlight single-line comments (// style)
    highlighted = highlighted.replace(
      /(\/\/.*$)/g,
      this.style('$1', 'dim')
    );

    // Highlight single-line comments (# style)
    highlighted = highlighted.replace(
      /(#.*$)/g,
      this.style('$1', 'dim')
    );

    // Highlight string literals (basic - doesn't handle escapes properly)
    // This is intentionally simple as it's a stub
    highlighted = highlighted.replace(
      /("[^"]*"|'[^']*'|`[^`]*`)/g,
      this.style('$1', 'green')
    );

    // Highlight numbers
    highlighted = highlighted.replace(
      /\b(\d+(?:\.\d+)?)\b/g,
      this.style('$1', 'cyan')
    );

    // Highlight common keywords (very basic)
    const keywords = [
      'const', 'let', 'var', 'function', 'class', 'interface', 'type',
      'import', 'export', 'from', 'return', 'if', 'else', 'for', 'while',
      'switch', 'case', 'break', 'continue', 'try', 'catch', 'throw',
      'async', 'await', 'new', 'this', 'super', 'extends', 'implements',
      'public', 'private', 'protected', 'static', 'readonly',
      'def', 'class', 'self', 'None', 'True', 'False',
    ];

    for (const keyword of keywords) {
      const regex = new RegExp(`\\b(${keyword})\\b`, 'g');
      highlighted = highlighted.replace(regex, this.style('$1', 'yellow'));
    }

    return highlighted;
  }

  /**
   * Get a range of lines from the content
   */
  renderRange(
    content: string,
    startLine: number,
    endLine: number
  ): string[] {
    const allLines = content.split('\n');
    const start = Math.max(0, startLine - 1);
    const end = Math.min(allLines.length, endLine);
    const rangeContent = allLines.slice(start, end).join('\n');

    const originalStartLine = this.options.startLine;
    this.options.startLine = startLine;
    const result = this.render('code', rangeContent);
    this.options.startLine = originalStartLine;

    return result;
  }
}

/**
 * Create a code adapter with default options
 */
export function createCodeAdapter(options?: CodeAdapterOptions): CodeAdapter {
  return new CodeAdapter(options);
}

/**
 * Create a plain text adapter (code adapter without line numbers)
 */
export function createTextAdapter(options?: CodeAdapterOptions): CodeAdapter {
  return new CodeAdapter({
    showLineNumbers: false,
    syntaxHighlight: false,
    ...options,
  });
}
