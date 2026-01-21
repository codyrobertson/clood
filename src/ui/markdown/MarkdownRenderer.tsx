/**
 * Markdown Renderer (UOW-0409, UOW-0410)
 *
 * Renders parsed markdown to:
 * 1. Ink/React components for the TUI
 * 2. ANSI strings for direct terminal output
 *
 * Implements the IMarkdownRenderer interface for flexible rendering.
 */

import React from 'react';
import { Box, Text } from 'ink';
import type { MarkdownNode, IMarkdownRenderer, MarkdownRenderOptions } from './MarkdownParser.js';
import { DEFAULT_RENDER_OPTIONS } from './MarkdownParser.js';
import { renderCodeBlock, renderInlineCode } from './CodeBlockRenderer.js';

/**
 * Color scheme for React/Ink rendering
 */
export interface MarkdownColorScheme {
  heading?: string;
  bold?: string;
  italic?: string;
  code?: string;
  codeBackground?: string;
  link?: string;
  blockquote?: string;
  listMarker?: string;
  horizontalRule?: string;
}

const DEFAULT_COLORS: MarkdownColorScheme = {
  heading: 'cyan',
  bold: 'white',
  italic: 'white',
  code: 'yellow',
  codeBackground: 'gray',
  link: 'blue',
  blockquote: 'gray',
  listMarker: 'green',
  horizontalRule: 'gray',
};

/**
 * Props for the React MarkdownRenderer component
 */
export interface MarkdownRendererProps {
  /** Parsed markdown AST */
  nodes: MarkdownNode[];
  /** Maximum width for wrapping */
  width?: number;
  /** Color scheme */
  colors?: MarkdownColorScheme;
  /** Render options */
  options?: MarkdownRenderOptions;
}

interface NodeRendererProps {
  node: MarkdownNode;
  colors: MarkdownColorScheme;
  width?: number;
  depth?: number;
  options?: MarkdownRenderOptions;
}

/**
 * React component for rendering a single markdown node
 */
const NodeRenderer: React.FC<NodeRendererProps> = ({
  node,
  colors,
  width,
  depth = 0,
  options,
}) => {
  switch (node.type) {
    case 'text':
      return <Text>{node.content}</Text>;

    case 'paragraph':
      return (
        <Box marginBottom={1}>
          <Text wrap="wrap">
            {node.children?.map((child, i) => (
              <NodeRenderer
                key={i}
                node={child}
                colors={colors}
                width={width}
                depth={depth}
                options={options}
              />
            ))}
          </Text>
        </Box>
      );

    case 'heading': {
      const level = node.level ?? 1;
      const prefix = '#'.repeat(level) + ' ';
      return (
        <Box marginBottom={1}>
          <Text bold color={colors.heading}>
            {prefix}
            {node.children?.map((child, i) => (
              <NodeRenderer
                key={i}
                node={child}
                colors={colors}
                width={width}
                depth={depth}
                options={options}
              />
            ))}
          </Text>
        </Box>
      );
    }

    case 'bold':
      return (
        <Text bold color={colors.bold}>
          {node.children?.map((child, i) => (
            <NodeRenderer
              key={i}
              node={child}
              colors={colors}
              width={width}
              depth={depth}
              options={options}
            />
          ))}
        </Text>
      );

    case 'italic':
      return (
        <Text italic color={colors.italic}>
          {node.children?.map((child, i) => (
            <NodeRenderer
              key={i}
              node={child}
              colors={colors}
              width={width}
              depth={depth}
              options={options}
            />
          ))}
        </Text>
      );

    case 'code':
      return (
        <Text color={colors.code} backgroundColor={colors.codeBackground}>
          {' '}
          {node.content}
          {' '}
        </Text>
      );

    case 'codeBlock': {
      // Use the new CodeBlockRenderer for enhanced code blocks
      const codeBlockString = renderCodeBlock({
        code: node.content ?? '',
        language: node.language,
        showLineNumbers: true,
        showBorder: options?.codeBlockBorder ?? true,
        showLanguageLabel: options?.showLanguageLabel ?? true,
        useColors: options?.useColors ?? true,
        syntaxHighlight: options?.syntaxHighlight ?? true,
        tabSize: options?.tabSize ?? 2,
        maxWidth: width ?? options?.width ?? 80,
      });

      return (
        <Box marginY={1}>
          <Text>{codeBlockString}</Text>
        </Box>
      );
    }

    case 'link':
      return (
        <Text color={colors.link} underline>
          {node.content}
          {node.url && <Text dimColor> ({node.url})</Text>}
        </Text>
      );

    case 'blockquote':
      return (
        <Box marginLeft={2} marginY={1}>
          <Text color={colors.blockquote}>{'\u2502'} </Text>
          <Box flexDirection="column">
            {node.children?.map((child, i) => (
              <NodeRenderer
                key={i}
                node={child}
                colors={colors}
                width={width ? width - 4 : undefined}
                depth={depth + 1}
                options={options}
              />
            ))}
          </Box>
        </Box>
      );

    case 'list':
      return (
        <Box flexDirection="column" marginY={1}>
          {node.children?.map((item, i) => (
            <Box key={i}>
              <Text color={colors.listMarker}>
                {node.ordered ? `${i + 1}. ` : '\u2022 '}
              </Text>
              <Box>
                {item.children?.map((child, j) => (
                  <NodeRenderer
                    key={j}
                    node={child}
                    colors={colors}
                    width={width}
                    depth={depth}
                    options={options}
                  />
                ))}
              </Box>
            </Box>
          ))}
        </Box>
      );

    case 'listItem':
      return (
        <>
          {node.children?.map((child, i) => (
            <NodeRenderer
              key={i}
              node={child}
              colors={colors}
              width={width}
              depth={depth}
              options={options}
            />
          ))}
        </>
      );

    case 'horizontalRule':
      return (
        <Box marginY={1}>
          <Text color={colors.horizontalRule}>{'\u2500'.repeat(width ?? 40)}</Text>
        </Box>
      );

    case 'lineBreak':
      return <Text>{'\n'}</Text>;

    default:
      return null;
  }
};

/**
 * React component for rendering markdown AST
 */
export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  nodes,
  width,
  colors = DEFAULT_COLORS,
  options,
}) => {
  const mergedColors = { ...DEFAULT_COLORS, ...colors };

  return (
    <Box flexDirection="column">
      {nodes.map((node, i) => (
        <NodeRenderer
          key={i}
          node={node}
          colors={mergedColors}
          width={width}
          options={options}
        />
      ))}
    </Box>
  );
};

// ============================================================================
// ANSI String Renderer - Implements IMarkdownRenderer
// ============================================================================

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
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
  white: '\x1b[37m',
  bgGray: '\x1b[100m',
} as const;

/**
 * Apply ANSI styling to text
 */
function ansiStyle(text: string, ...styles: (keyof typeof ANSI)[]): string {
  if (styles.length === 0) return text;
  const codes = styles.map((s) => ANSI[s]).join('');
  return codes + text + ANSI.reset;
}

/**
 * ANSI Markdown Renderer - renders markdown AST to ANSI-styled strings
 * Implements the IMarkdownRenderer interface
 */
export class AnsiMarkdownRenderer implements IMarkdownRenderer {
  options: MarkdownRenderOptions;

  constructor(options?: Partial<MarkdownRenderOptions>) {
    this.options = { ...DEFAULT_RENDER_OPTIONS, ...options };
  }

  /**
   * Render complete markdown AST to ANSI string
   */
  render(nodes: MarkdownNode[]): string {
    return nodes.map((node) => this.renderNode(node)).join('\n');
  }

  /**
   * Render a single markdown node to ANSI string
   */
  renderNode(node: MarkdownNode, depth: number = 0): string {
    const useColors = this.options.useColors ?? true;

    switch (node.type) {
      case 'text':
        return node.content ?? '';

      case 'paragraph': {
        const content = this.renderChildren(node, depth);
        return content + '\n';
      }

      case 'heading': {
        const level = node.level ?? 1;
        const prefix = '#'.repeat(level) + ' ';
        const content = this.renderChildren(node, depth);
        if (useColors) {
          return ansiStyle(prefix + content, 'bold', 'cyan') + '\n';
        }
        return prefix + content + '\n';
      }

      case 'bold': {
        const content = this.renderChildren(node, depth);
        return useColors ? ansiStyle(content, 'bold') : `**${content}**`;
      }

      case 'italic': {
        const content = this.renderChildren(node, depth);
        return useColors ? ansiStyle(content, 'italic') : `*${content}*`;
      }

      case 'code': {
        const content = node.content ?? '';
        return useColors ? renderInlineCode(content, true) : `\`${content}\``;
      }

      case 'codeBlock': {
        // Use CodeBlockRenderer for proper syntax highlighting
        return renderCodeBlock({
          code: node.content ?? '',
          language: node.language,
          showLineNumbers: true,
          showBorder: this.options.codeBlockBorder ?? true,
          showLanguageLabel: this.options.showLanguageLabel ?? true,
          useColors,
          syntaxHighlight: this.options.syntaxHighlight ?? true,
          tabSize: this.options.tabSize ?? 2,
          maxWidth: this.options.width ?? 80,
        }) + '\n';
      }

      case 'link': {
        const text = node.content ?? '';
        const url = node.url ?? '';
        if (useColors) {
          return ansiStyle(text, 'underline', 'blue') + ansiStyle(` (${url})`, 'dim');
        }
        return `[${text}](${url})`;
      }

      case 'blockquote': {
        const indent = '  '.repeat(depth);
        const children = node.children ?? [];
        const lines = children
          .map((child) => this.renderNode(child, depth + 1))
          .join('')
          .split('\n')
          .filter((line) => line.length > 0);

        const prefix = useColors ? ansiStyle('\u2502 ', 'gray') : '> ';
        return lines.map((line) => indent + prefix + line).join('\n') + '\n';
      }

      case 'list': {
        const indent = '  '.repeat(depth);
        const items = node.children ?? [];
        return (
          items
            .map((item, i) => {
              const marker = node.ordered
                ? useColors
                  ? ansiStyle(`${i + 1}. `, 'green')
                  : `${i + 1}. `
                : useColors
                  ? ansiStyle('\u2022 ', 'green')
                  : '- ';
              const content = this.renderChildren(item, depth);
              return indent + marker + content;
            })
            .join('\n') + '\n'
        );
      }

      case 'listItem':
        return this.renderChildren(node, depth);

      case 'horizontalRule': {
        const width = this.options.width ?? 40;
        const line = '\u2500'.repeat(width);
        return (useColors ? ansiStyle(line, 'gray') : '---') + '\n';
      }

      case 'lineBreak':
        return '\n';

      default:
        return '';
    }
  }

  /**
   * Render all children of a node
   */
  private renderChildren(node: MarkdownNode, depth: number): string {
    if (!node.children) return '';
    return node.children.map((child) => this.renderNode(child, depth)).join('');
  }

  /**
   * Update renderer options
   */
  setOptions(options: Partial<MarkdownRenderOptions>): void {
    this.options = { ...this.options, ...options };
  }
}

/**
 * Create an ANSI markdown renderer with custom options
 */
export function createAnsiRenderer(options?: Partial<MarkdownRenderOptions>): AnsiMarkdownRenderer {
  return new AnsiMarkdownRenderer(options);
}

/**
 * Default ANSI renderer instance
 */
export const defaultAnsiRenderer = new AnsiMarkdownRenderer();

/**
 * Convenience function to render markdown string to ANSI output
 * Note: parseMarkdown must be passed in to avoid circular dependency
 */
export function renderMarkdownToAnsi(
  markdown: string,
  options?: Partial<MarkdownRenderOptions>,
  parser?: (text: string) => MarkdownNode[]
): string {
  // Use the provided parser or try to import dynamically
  let parseFunc = parser;
  if (!parseFunc) {
    // parseMarkdown is imported at the top of the file, so we can use it directly
    // through a re-import to avoid circular dependency at module load time
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      parseFunc = (require('./MarkdownParser.js') as { parseMarkdown: (text: string) => MarkdownNode[] }).parseMarkdown;
    } catch {
      // Fallback: return the raw markdown if parsing not available
      return markdown;
    }
  }
  const nodes = parseFunc(markdown);
  const renderer = options ? new AnsiMarkdownRenderer(options) : defaultAnsiRenderer;
  return renderer.render(nodes);
}

// ============================================================================
// Backward Compatibility - Original CodeBlock and InlineCode components
// ============================================================================

/**
 * Code Block Component with syntax highlighting (React/Ink)
 */
export interface CodeBlockProps {
  code: string;
  language?: string;
  width?: number;
  showLineNumbers?: boolean;
  syntaxHighlight?: boolean;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({
  code,
  language,
  width,
  showLineNumbers = true,
  syntaxHighlight = true,
}) => {
  const rendered = renderCodeBlock({
    code,
    language,
    showLineNumbers,
    showBorder: true,
    showLanguageLabel: true,
    useColors: true,
    syntaxHighlight,
    maxWidth: width ?? 80,
  });

  return (
    <Box marginY={1}>
      <Text>{rendered}</Text>
    </Box>
  );
};

/**
 * Inline Code Component (React/Ink)
 */
export interface InlineCodeProps {
  children: string;
}

export const InlineCode: React.FC<InlineCodeProps> = ({ children }) => {
  return (
    <Text color="yellow" backgroundColor="gray">
      {' '}
      {children}
      {' '}
    </Text>
  );
};
