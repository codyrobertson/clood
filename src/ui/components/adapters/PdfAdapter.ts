/**
 * PDF Renderer Adapter (UOW-0509, UOW-0510, UOW-0511)
 *
 * Renders PDF content to terminal-friendly text output.
 * - UOW-0509: Safe exec wrapper for pdftotext
 * - UOW-0510: PDF-to-text pipeline
 * - UOW-0511: "PDF unsupported" message when tool missing
 */

import { execSync, type ExecSyncOptionsWithStringEncoding } from 'child_process';
import { existsSync } from 'fs';
import { BaseRendererAdapter, type DocumentKind } from './RendererAdapter.js';

/**
 * ANSI escape codes for terminal styling
 */
const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

/**
 * Result of PDF tool availability check
 */
export interface PdfToolStatus {
  available: boolean;
  toolPath: string | null;
  version: string | null;
  error: string | null;
}

export interface PdfAdapterOptions {
  /** Enable ANSI styling (default: true) */
  useAnsi?: boolean;
  /** Maximum line width for wrapping (default: 80) */
  maxWidth?: number;
  /** Custom path to pdftotext binary */
  pdftotextPath?: string;
  /** Timeout for pdftotext execution in ms (default: 30000) */
  timeout?: number;
  /** Page range to extract (e.g., "1-5" or "1,3,5") */
  pageRange?: string;
  /** Layout mode: 'raw', 'layout', or 'table' (default: 'layout') */
  layoutMode?: 'raw' | 'layout' | 'table';
}

const DEFAULT_OPTIONS: Required<PdfAdapterOptions> = {
  useAnsi: true,
  maxWidth: 80,
  pdftotextPath: 'pdftotext',
  timeout: 30000,
  pageRange: '',
  layoutMode: 'layout',
};

/**
 * PDF renderer adapter for terminal display
 */
export class PdfAdapter extends BaseRendererAdapter {
  readonly supportedKinds: DocumentKind[] = ['pdf'];
  private options: Required<PdfAdapterOptions>;
  private toolStatus: PdfToolStatus | null = null;

  constructor(options: PdfAdapterOptions = {}) {
    super();
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Render PDF content to terminal output
   *
   * Note: For PDF files, the 'content' parameter should be the file path,
   * not the actual binary content. The adapter will use pdftotext to extract text.
   */
  render(_kind: DocumentKind, content: string): string[] {
    // Check if content looks like a file path
    if (this.isFilePath(content)) {
      return this.renderFromFile(content);
    }

    // If content is already text (pre-extracted), just format it
    return this.formatTextContent(content);
  }

  /**
   * Render PDF from file path
   */
  renderFromFile(filePath: string): string[] {
    // Check tool availability
    const status = this.checkToolAvailability();
    if (!status.available) {
      return this.renderUnsupportedMessage(status);
    }

    // Check if file exists
    if (!existsSync(filePath)) {
      return this.renderError(`PDF file not found: ${filePath}`);
    }

    // Extract text from PDF
    try {
      const text = this.extractTextFromPdf(filePath);
      return this.formatTextContent(text);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return this.renderError(`Failed to extract PDF text: ${message}`);
    }
  }

  /**
   * Check if pdftotext tool is available
   */
  checkToolAvailability(): PdfToolStatus {
    if (this.toolStatus !== null) {
      return this.toolStatus;
    }

    try {
      const result = this.safeExec(`${this.options.pdftotextPath} -v`, {
        timeout: 5000,
      });

      // pdftotext -v outputs version to stderr
      const version = result.stderr?.trim() || result.stdout?.trim() || 'unknown';

      this.toolStatus = {
        available: true,
        toolPath: this.options.pdftotextPath,
        version,
        error: null,
      };
    } catch (error) {
      this.toolStatus = {
        available: false,
        toolPath: null,
        version: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }

    return this.toolStatus;
  }

  /**
   * Safe exec wrapper with timeout and error handling
   */
  private safeExec(
    command: string,
    options: { timeout?: number } = {}
  ): { stdout: string; stderr: string } {
    const timeout = options.timeout || this.options.timeout;

    // Validate command to prevent injection
    if (!this.isValidCommand(command)) {
      throw new Error('Invalid command: contains potentially unsafe characters');
    }

    const execOptions: ExecSyncOptionsWithStringEncoding = {
      encoding: 'utf-8',
      timeout,
      maxBuffer: 50 * 1024 * 1024, // 50MB buffer
      stdio: ['pipe', 'pipe', 'pipe'],
    };

    try {
      const stdout = execSync(command, execOptions);
      return { stdout, stderr: '' };
    } catch (error: unknown) {
      // execSync throws on non-zero exit, but may still have useful output
      if (error && typeof error === 'object' && 'stdout' in error) {
        const execError = error as { stdout?: string; stderr?: string; message?: string };
        return {
          stdout: execError.stdout || '',
          stderr: execError.stderr || execError.message || '',
        };
      }
      throw error;
    }
  }

  /**
   * Validate command string for safety
   */
  private isValidCommand(command: string): boolean {
    // Disallow shell metacharacters that could lead to injection
    const dangerousChars = /[;&|`$(){}[\]<>\\]/;
    // Allow the command but check individual components
    const parts = command.split(/\s+/);
    const firstPart = parts[0] || '';

    // First part should be the pdftotext command
    if (!firstPart.endsWith('pdftotext') && firstPart !== 'pdftotext') {
      // Check if it's a path ending with pdftotext
      if (!firstPart.includes('pdftotext')) {
        return false;
      }
    }

    // Check remaining parts for dangerous characters
    for (let i = 1; i < parts.length; i++) {
      const part = parts[i] || '';
      // Allow flags starting with -
      if (part.startsWith('-')) continue;
      // Check for dangerous characters in file paths
      if (dangerousChars.test(part)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Extract text from PDF using pdftotext
   */
  private extractTextFromPdf(filePath: string): string {
    // Build command with options
    const args: string[] = [];

    // Layout mode
    switch (this.options.layoutMode) {
      case 'layout':
        args.push('-layout');
        break;
      case 'table':
        args.push('-table');
        break;
      case 'raw':
        args.push('-raw');
        break;
    }

    // Page range
    if (this.options.pageRange) {
      const rangeMatch = this.options.pageRange.match(/^(\d+)(?:-(\d+))?$/);
      if (rangeMatch) {
        const start = rangeMatch[1] ?? '1';
        const end = rangeMatch[2] ?? start;
        args.push('-f', start, '-l', end);
      }
    }

    // Escape file path for shell
    const escapedPath = this.escapeShellArg(filePath);

    // Output to stdout (use - as output file)
    const command = `${this.options.pdftotextPath} ${args.join(' ')} ${escapedPath} -`;

    const result = this.safeExec(command);
    return result.stdout;
  }

  /**
   * Escape shell argument
   */
  private escapeShellArg(arg: string): string {
    // Use single quotes and escape any single quotes in the string
    return `'${arg.replace(/'/g, "'\\''")}'`;
  }

  /**
   * Check if content looks like a file path
   */
  private isFilePath(content: string): boolean {
    // Check for common path patterns
    return (
      content.startsWith('/') ||
      content.startsWith('./') ||
      content.startsWith('../') ||
      content.startsWith('~') ||
      /^[a-zA-Z]:[/\\]/.test(content) || // Windows paths
      content.toLowerCase().endsWith('.pdf')
    );
  }

  /**
   * Format extracted text content for terminal display
   */
  private formatTextContent(text: string): string[] {
    const lines = text.split('\n');
    const output: string[] = [];

    for (const line of lines) {
      // Wrap long lines
      if (line.length > this.options.maxWidth) {
        const wrapped = this.wrapLine(line, this.options.maxWidth);
        output.push(...wrapped);
      } else {
        output.push(line);
      }
    }

    return output;
  }

  /**
   * Wrap a long line to fit within max width
   */
  private wrapLine(line: string, maxWidth: number): string[] {
    const words = line.split(/\s+/);
    const wrapped: string[] = [];
    let currentLine = '';

    for (const word of words) {
      if (currentLine === '') {
        currentLine = word;
      } else if (currentLine.length + 1 + word.length <= maxWidth) {
        currentLine += ' ' + word;
      } else {
        wrapped.push(currentLine);
        currentLine = word;
      }
    }

    if (currentLine) {
      wrapped.push(currentLine);
    }

    return wrapped.length > 0 ? wrapped : [''];
  }

  /**
   * Render unsupported message when pdftotext is not available
   */
  private renderUnsupportedMessage(status: PdfToolStatus): string[] {
    const lines: string[] = [];

    lines.push(this.style('PDF Support Unavailable', 'yellow', 'bold'));
    lines.push('');
    lines.push('The pdftotext tool is required to view PDF files.');
    lines.push('');
    lines.push(this.style('Installation instructions:', 'bold'));
    lines.push('');
    lines.push('  ' + this.style('Ubuntu/Debian:', 'cyan'));
    lines.push('    sudo apt-get install poppler-utils');
    lines.push('');
    lines.push('  ' + this.style('macOS (Homebrew):', 'cyan'));
    lines.push('    brew install poppler');
    lines.push('');
    lines.push('  ' + this.style('Fedora/RHEL:', 'cyan'));
    lines.push('    sudo dnf install poppler-utils');
    lines.push('');
    lines.push('  ' + this.style('Arch Linux:', 'cyan'));
    lines.push('    sudo pacman -S poppler');
    lines.push('');

    if (status.error) {
      lines.push(this.style(`Error: ${status.error}`, 'dim'));
    }

    return lines;
  }

  /**
   * Render error message
   */
  private renderError(message: string): string[] {
    return [
      this.style('Error', 'red', 'bold'),
      '',
      message,
    ];
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
   * Reset cached tool status (useful for testing)
   */
  resetToolStatus(): void {
    this.toolStatus = null;
  }
}

/**
 * Create a PDF adapter with default options
 */
export function createPdfAdapter(options?: PdfAdapterOptions): PdfAdapter {
  return new PdfAdapter(options);
}

/**
 * Check if PDF support is available on this system
 */
export function isPdfSupported(pdftotextPath?: string): boolean {
  const adapter = new PdfAdapter({ pdftotextPath });
  return adapter.checkToolAvailability().available;
}
