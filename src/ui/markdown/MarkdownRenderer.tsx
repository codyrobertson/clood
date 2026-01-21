/**
 * Markdown Renderer (UOW-0409, UOW-0410)
 *
 * Renders parsed markdown to Ink components with styling.
 */

import React from 'react';
import { Box, Text } from 'ink';
import type { MarkdownNode } from './MarkdownParser.js';

export interface MarkdownRendererProps {
  /** Parsed markdown AST */
  nodes: MarkdownNode[];
  /** Maximum width for wrapping */
  width?: number;
  /** Color scheme */
  colors?: MarkdownColorScheme;
}

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

interface NodeRendererProps {
  node: MarkdownNode;
  colors: MarkdownColorScheme;
  width?: number;
  depth?: number;
}

const NodeRenderer: React.FC<NodeRendererProps> = ({ node, colors, width, depth = 0 }) => {
  switch (node.type) {
    case 'text':
      return <Text>{node.content}</Text>;

    case 'paragraph':
      return (
        <Box marginBottom={1}>
          <Text wrap="wrap">
            {node.children?.map((child, i) => (
              <NodeRenderer key={i} node={child} colors={colors} width={width} depth={depth} />
            ))}
          </Text>
        </Box>
      );

    case 'heading': {
      const level = node.level || 1;
      const prefix = '#'.repeat(level) + ' ';
      return (
        <Box marginBottom={1}>
          <Text bold color={colors.heading}>
            {prefix}
            {node.children?.map((child, i) => (
              <NodeRenderer key={i} node={child} colors={colors} width={width} depth={depth} />
            ))}
          </Text>
        </Box>
      );
    }

    case 'bold':
      return (
        <Text bold color={colors.bold}>
          {node.children?.map((child, i) => (
            <NodeRenderer key={i} node={child} colors={colors} width={width} depth={depth} />
          ))}
        </Text>
      );

    case 'italic':
      return (
        <Text italic color={colors.italic}>
          {node.children?.map((child, i) => (
            <NodeRenderer key={i} node={child} colors={colors} width={width} depth={depth} />
          ))}
        </Text>
      );

    case 'code':
      return (
        <Text color={colors.code} backgroundColor={colors.codeBackground}>
          {' '}{node.content}{' '}
        </Text>
      );

    case 'codeBlock':
      return (
        <Box
          flexDirection="column"
          marginY={1}
          paddingX={1}
          borderStyle="round"
          borderColor="gray"
        >
          {node.language && (
            <Text dimColor>{node.language}</Text>
          )}
          <Text color={colors.code}>{node.content}</Text>
        </Box>
      );

    case 'link':
      return (
        <Text color={colors.link} underline>
          {node.content}
        </Text>
      );

    case 'blockquote':
      return (
        <Box marginLeft={2} marginY={1}>
          <Text color={colors.blockquote}>│ </Text>
          <Box flexDirection="column">
            {node.children?.map((child, i) => (
              <NodeRenderer key={i} node={child} colors={colors} width={width ? width - 4 : undefined} depth={depth + 1} />
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
                {node.ordered ? `${i + 1}. ` : '• '}
              </Text>
              <Box>
                {item.children?.map((child, j) => (
                  <NodeRenderer key={j} node={child} colors={colors} width={width} depth={depth} />
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
            <NodeRenderer key={i} node={child} colors={colors} width={width} depth={depth} />
          ))}
        </>
      );

    case 'horizontalRule':
      return (
        <Box marginY={1}>
          <Text color={colors.horizontalRule}>
            {'─'.repeat(width || 40)}
          </Text>
        </Box>
      );

    case 'lineBreak':
      return <Text>{'\n'}</Text>;

    default:
      return null;
  }
};

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  nodes,
  width,
  colors = DEFAULT_COLORS,
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
        />
      ))}
    </Box>
  );
};

/**
 * Code Block Component with syntax highlighting hints
 */
export interface CodeBlockProps {
  code: string;
  language?: string;
  width?: number;
  showLineNumbers?: boolean;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({
  code,
  language,
  width,
  showLineNumbers = false,
}) => {
  const lines = code.split('\n');
  const lineNumberWidth = showLineNumbers ? String(lines.length).length + 1 : 0;
  const contentWidth = width ? width - lineNumberWidth - 4 : undefined;

  return (
    <Box
      flexDirection="column"
      paddingX={1}
      paddingY={0}
      borderStyle="round"
      borderColor="gray"
      width={width}
    >
      {language && (
        <Box marginBottom={0}>
          <Text dimColor italic>
            {language}
          </Text>
        </Box>
      )}
      {lines.map((line, i) => (
        <Box key={i}>
          {showLineNumbers && (
            <Text dimColor>
              {String(i + 1).padStart(lineNumberWidth)}│
            </Text>
          )}
          <Text color="yellow" wrap={contentWidth ? 'truncate' : undefined}>
            {line}
          </Text>
        </Box>
      ))}
    </Box>
  );
};

/**
 * Inline Code Component
 */
export interface InlineCodeProps {
  children: string;
}

export const InlineCode: React.FC<InlineCodeProps> = ({ children }) => {
  return (
    <Text color="yellow" backgroundColor="gray">
      {' '}{children}{' '}
    </Text>
  );
};
