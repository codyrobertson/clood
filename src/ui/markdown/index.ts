/**
 * Markdown Module
 *
 * Exports markdown parsing and rendering utilities.
 */

// Parser exports
export {
  parseMarkdown,
  toPlainText,
  extractCodeBlocks,
  DEFAULT_RENDER_OPTIONS,
  type MarkdownNode,
  type MarkdownNodeType,
  type ParseOptions,
  type IMarkdownRenderer,
  type MarkdownRenderOptions,
} from './MarkdownParser.js';

// React/Ink renderer exports
export {
  MarkdownRenderer,
  CodeBlock,
  InlineCode,
  type MarkdownRendererProps,
  type MarkdownColorScheme,
  type CodeBlockProps,
  type InlineCodeProps,
} from './MarkdownRenderer.js';

// ANSI string renderer exports
export {
  AnsiMarkdownRenderer,
  createAnsiRenderer,
  defaultAnsiRenderer,
  renderMarkdownToAnsi,
} from './MarkdownRenderer.js';

// Code block renderer exports
export {
  renderCodeBlock,
  renderInlineCode,
  createCodeBlockFromRenderOptions,
  CodeBlockRenderer,
  defaultCodeBlockRenderer,
  type CodeBlockOptions,
} from './CodeBlockRenderer.js';
