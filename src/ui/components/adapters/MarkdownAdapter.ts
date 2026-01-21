/**
 * Markdown Renderer Adapter (UOW-0506)
 *
 * Renders markdown content to terminal-friendly output.
 * Uses the existing MarkdownParser from src/ui/markdown/.
 */

import {
  parseMarkdown,
  type MarkdownNode,
  type ParseOptions,
} from '../../markdown/MarkdownParser.js';
import { BaseRendererAdapter, type DocumentKind } from './RendererAdapter.js';

/**
 * ANSI escape codes for terminal styling
 */
const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  italic: '\x1b[3m',
  underline: '\x1b[4m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  magenta: '\x1b[35m',
  gray: '\x1b[90m',
};

export interface MarkdownAdapterOptions {
  /** Enable ANSI styling (default: true) */
  useAnsi?: boolean;
  /** Maximum line width for wrapping (default: 80) */
  maxWidth?: number;
  /** Indent size for nested content (default: 2) */
  indentSize?: number;
  /** Parse options passed to MarkdownParser */
  parseOptions?: ParseOptions;
}

const DEFAULT_OPTIONS: Required<MarkdownAdapterOptions> = {
  useAnsi: true,
  maxWidth: 80,
  indentSize: 2,
  parseOptions: {},
};

/**
 * Markdown renderer adapter for terminal display
 */
export class MarkdownAdapter extends BaseRendererAdapter {
  readonly supportedKinds: DocumentKind[] = ['markdown'];
  private options: Required<MarkdownAdapterOptions>;

  constructor(options: MarkdownAdapterOptions = {}) {
    super();
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Render markdown content to terminal output
   */
  render(_kind: DocumentKind, content: string): string[] {
    const nodes = parseMarkdown(content, this.options.parseOptions);
    const lines: string[] = [];

    for (const node of nodes) {
      lines.push(...this.renderNode(node, 0));
    }

    return lines;
  }

  /**
   * Render a single markdown node
   */
  private renderNode(node: MarkdownNode, indent: number): string[] {
    const lines: string[] = [];
    const indentStr = ' '.repeat(indent);

    switch (node.type) {
      case 'heading':
        lines.push(...this.renderHeading(node, indentStr));
        lines.push(''); // Blank line after heading
        break;

      case 'paragraph':
        lines.push(...this.renderParagraph(node, indentStr));
        lines.push(''); // Blank line after paragraph
        break;

      case 'codeBlock':
        lines.push(...this.renderCodeBlock(node, indentStr));
        lines.push(''); // Blank line after code block
        break;

      case 'list':
        lines.push(...this.renderList(node, indent));
        lines.push(''); // Blank line after list
        break;

      case 'blockquote':
        lines.push(...this.renderBlockquote(node, indent));
        lines.push(''); // Blank line after blockquote
        break;

      case 'horizontalRule':
        lines.push(indentStr + this.style('---', 'dim'));
        lines.push('');
        break;

      case 'lineBreak':
        lines.push('');
        break;

      default:
        // Handle inline nodes at top level (shouldn't happen often)
        lines.push(indentStr + this.renderInline(node));
        break;
    }

    return lines;
  }

  /**
   * Render a heading
   */
  private renderHeading(node: MarkdownNode, indentStr: string): string[] {
    const level = node.level || 1;
    const prefix = '#'.repeat(level) + ' ';
    const content = this.renderChildren(node.children || []);

    // Style heading with bold and level-specific coloring
    const styledPrefix = this.style(prefix, 'cyan', 'bold');
    const styledContent = this.style(content, 'bold');

    return [indentStr + styledPrefix + styledContent];
  }

  /**
   * Render a paragraph
   */
  private renderParagraph(node: MarkdownNode, indentStr: string): string[] {
    const content = this.renderChildren(node.children || []);
    const wrapped = this.wrapText(content, this.options.maxWidth - indentStr.length);
    return wrapped.map((line) => indentStr + line);
  }

  /**
   * Render a code block
   */
  private renderCodeBlock(node: MarkdownNode, indentStr: string): string[] {
    const lines: string[] = [];
    const content = node.content || '';
    const language = node.language || '';

    // Top border with optional language
    const langDisplay = language ? ` ${language} ` : '';
    lines.push(indentStr + this.style(`\`\`\`${langDisplay}`, 'dim'));

    // Code content with dim styling
    const codeLines = content.split('\n');
    for (const codeLine of codeLines) {
      lines.push(indentStr + '  ' + this.style(codeLine, 'green'));
    }

    // Bottom border
    lines.push(indentStr + this.style('```', 'dim'));

    return lines;
  }

  /**
   * Render a list
   */
  private renderList(node: MarkdownNode, indent: number): string[] {
    const lines: string[] = [];
    const items = node.children || [];
    const ordered = node.ordered || false;
    const indentStr = ' '.repeat(indent);

    items.forEach((item, index) => {
      const prefix = ordered ? `${index + 1}. ` : '- ';
      const styledPrefix = this.style(prefix, 'yellow');
      const content = this.renderChildren(item.children || []);

      // Wrap content accounting for prefix width
      const prefixWidth = prefix.length;
      const availableWidth = this.options.maxWidth - indent - prefixWidth;
      const wrapped = this.wrapText(content, availableWidth);

      // First line with prefix
      lines.push(indentStr + styledPrefix + wrapped[0]);

      // Continuation lines with indent matching prefix
      const continuationIndent = ' '.repeat(prefixWidth);
      for (let i = 1; i < wrapped.length; i++) {
        lines.push(indentStr + continuationIndent + wrapped[i]);
      }
    });

    return lines;
  }

  /**
   * Render a blockquote
   */
  private renderBlockquote(node: MarkdownNode, indent: number): string[] {
    const lines: string[] = [];
    const indentStr = ' '.repeat(indent);
    const quotePrefix = this.style('> ', 'magenta');

    // Recursively render children
    for (const child of node.children || []) {
      const childLines = this.renderNode(child, 0);
      for (const line of childLines) {
        if (line === '') {
          lines.push(indentStr + this.style('>', 'magenta'));
        } else {
          lines.push(indentStr + quotePrefix + line);
        }
      }
    }

    return lines;
  }

  /**
   * Render inline children to a single string
   */
  private renderChildren(children: MarkdownNode[]): string {
    return children.map((child) => this.renderInline(child)).join('');
  }

  /**
   * Render an inline node
   */
  private renderInline(node: MarkdownNode): string {
    switch (node.type) {
      case 'text':
        return node.content || '';

      case 'bold':
        return this.style(this.renderChildren(node.children || []), 'bold');

      case 'italic':
        return this.style(this.renderChildren(node.children || []), 'italic');

      case 'code':
        return this.style('`' + (node.content || '') + '`', 'green');

      case 'link': {
        const text = node.content || '';
        const url = node.url || '';
        return this.style(text, 'cyan', 'underline') + this.style(` (${url})`, 'dim');
      }

      default:
        return node.content || '';
    }
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
   * Wrap text to fit within width
   */
  private wrapText(text: string, maxWidth: number): string[] {
    if (maxWidth <= 0 || text.length <= maxWidth) {
      return [text];
    }

    const lines: string[] = [];
    const words = text.split(/\s+/);
    let currentLine = '';

    for (const word of words) {
      if (currentLine === '') {
        currentLine = word;
      } else if (this.getVisibleLength(currentLine + ' ' + word) <= maxWidth) {
        currentLine += ' ' + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines.length > 0 ? lines : [''];
  }

  /**
   * Get visible length of text (excluding ANSI codes)
   */
  private getVisibleLength(text: string): number {
    // Strip ANSI escape codes
    const stripped = text.replace(/\x1b\[[0-9;]*m/g, '');
    return stripped.length;
  }
}

/**
 * Create a markdown adapter with default options
 */
export function createMarkdownAdapter(options?: MarkdownAdapterOptions): MarkdownAdapter {
  return new MarkdownAdapter(options);
}
