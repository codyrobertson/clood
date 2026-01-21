/**
 * Markdown Parser (UOW-0409)
 *
 * Parses a subset of markdown for terminal display.
 * Supports: headers, bold, italic, code, lists, links, blockquotes.
 */

export type MarkdownNodeType =
  | 'text'
  | 'paragraph'
  | 'heading'
  | 'bold'
  | 'italic'
  | 'code'
  | 'codeBlock'
  | 'list'
  | 'listItem'
  | 'link'
  | 'blockquote'
  | 'horizontalRule'
  | 'lineBreak';

export interface MarkdownNode {
  type: MarkdownNodeType;
  content?: string;
  children?: MarkdownNode[];
  level?: number; // For headings (1-6)
  language?: string; // For code blocks
  url?: string; // For links
  ordered?: boolean; // For lists
}

export interface ParseOptions {
  /** Enable GFM (GitHub Flavored Markdown) extensions */
  gfm?: boolean;
  /** Preserve line breaks in paragraphs */
  breaks?: boolean;
}

const HEADING_REGEX = /^(#{1,6})\s+(.+)$/;
const CODE_BLOCK_START = /^```(\w*)?$/;
const CODE_BLOCK_END = /^```$/;
const BLOCKQUOTE_REGEX = /^>\s*(.*)$/;
const UNORDERED_LIST_REGEX = /^[-*+]\s+(.+)$/;
const ORDERED_LIST_REGEX = /^(\d+)\.\s+(.+)$/;
const HORIZONTAL_RULE_REGEX = /^(?:[-*_]\s*){3,}$/;

/**
 * Parse inline markdown (bold, italic, code, links)
 */
function parseInline(text: string): MarkdownNode[] {
  const nodes: MarkdownNode[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    // Bold: **text** or __text__
    let match = remaining.match(/^(\*\*|__)(.+?)\1/);
    if (match) {
      nodes.push({
        type: 'bold',
        children: parseInline(match[2] ?? ''),
      });
      remaining = remaining.slice(match[0].length);
      continue;
    }

    // Italic: *text* or _text_
    match = remaining.match(/^(\*|_)(.+?)\1/);
    if (match) {
      nodes.push({
        type: 'italic',
        children: parseInline(match[2] ?? ''),
      });
      remaining = remaining.slice(match[0].length);
      continue;
    }

    // Inline code: `code`
    match = remaining.match(/^`([^`]+)`/);
    if (match) {
      nodes.push({
        type: 'code',
        content: match[1] ?? '',
      });
      remaining = remaining.slice(match[0].length);
      continue;
    }

    // Link: [text](url)
    match = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
    if (match) {
      nodes.push({
        type: 'link',
        content: match[1] ?? '',
        url: match[2] ?? '',
      });
      remaining = remaining.slice(match[0].length);
      continue;
    }

    // Plain text - find next special char or end
    const nextSpecial = remaining.search(/[\*_`\[]/);
    if (nextSpecial === -1) {
      nodes.push({ type: 'text', content: remaining });
      break;
    } else if (nextSpecial === 0) {
      // Special char not matched, treat as text
      nodes.push({ type: 'text', content: remaining[0] });
      remaining = remaining.slice(1);
    } else {
      nodes.push({ type: 'text', content: remaining.slice(0, nextSpecial) });
      remaining = remaining.slice(nextSpecial);
    }
  }

  return nodes;
}

/**
 * Parse markdown text into AST
 */
export function parseMarkdown(text: string, options: ParseOptions = {}): MarkdownNode[] {
  const lines = text.split('\n');
  const nodes: MarkdownNode[] = [];
  let i = 0;

  const getLine = (idx: number): string => lines[idx] ?? '';

  while (i < lines.length) {
    const line = getLine(i);

    // Empty line
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Heading
    const headingMatch = line.match(HEADING_REGEX);
    if (headingMatch) {
      nodes.push({
        type: 'heading',
        level: (headingMatch[1] ?? '').length,
        children: parseInline(headingMatch[2] ?? ''),
      });
      i++;
      continue;
    }

    // Horizontal rule
    if (HORIZONTAL_RULE_REGEX.test(line)) {
      nodes.push({ type: 'horizontalRule' });
      i++;
      continue;
    }

    // Code block
    const codeBlockMatch = line.match(CODE_BLOCK_START);
    if (codeBlockMatch) {
      const language = codeBlockMatch[1] || undefined;
      const codeLines: string[] = [];
      i++;

      while (i < lines.length && !CODE_BLOCK_END.test(getLine(i))) {
        codeLines.push(getLine(i));
        i++;
      }

      nodes.push({
        type: 'codeBlock',
        content: codeLines.join('\n'),
        language,
      });
      i++; // Skip closing ```
      continue;
    }

    // Blockquote
    const blockquoteMatch = line.match(BLOCKQUOTE_REGEX);
    if (blockquoteMatch) {
      const quoteLines: string[] = [blockquoteMatch[1] ?? ''];
      i++;

      while (i < lines.length) {
        const currentLine = getLine(i);
        const nextMatch = currentLine.match(BLOCKQUOTE_REGEX);
        if (nextMatch) {
          quoteLines.push(nextMatch[1] ?? '');
          i++;
        } else if (currentLine.trim() === '') {
          break;
        } else {
          break;
        }
      }

      nodes.push({
        type: 'blockquote',
        children: parseMarkdown(quoteLines.join('\n'), options),
      });
      continue;
    }

    // Unordered list
    const ulMatch = line.match(UNORDERED_LIST_REGEX);
    if (ulMatch) {
      const items: MarkdownNode[] = [];

      while (i < lines.length) {
        const currentLine = getLine(i);
        const itemMatch = currentLine.match(UNORDERED_LIST_REGEX);
        if (itemMatch) {
          items.push({
            type: 'listItem',
            children: parseInline(itemMatch[1] ?? ''),
          });
          i++;
        } else if (currentLine.trim() === '') {
          i++;
          break;
        } else {
          break;
        }
      }

      nodes.push({
        type: 'list',
        ordered: false,
        children: items,
      });
      continue;
    }

    // Ordered list
    const olMatch = line.match(ORDERED_LIST_REGEX);
    if (olMatch) {
      const items: MarkdownNode[] = [];

      while (i < lines.length) {
        const currentLine = getLine(i);
        const itemMatch = currentLine.match(ORDERED_LIST_REGEX);
        if (itemMatch) {
          items.push({
            type: 'listItem',
            children: parseInline(itemMatch[2] ?? ''),
          });
          i++;
        } else if (currentLine.trim() === '') {
          i++;
          break;
        } else {
          break;
        }
      }

      nodes.push({
        type: 'list',
        ordered: true,
        children: items,
      });
      continue;
    }

    // Paragraph - collect lines until empty line or block element
    const paragraphLines: string[] = [line];
    i++;

    while (i < lines.length) {
      const nextLine = getLine(i);
      if (
        nextLine.trim() === '' ||
        HEADING_REGEX.test(nextLine) ||
        CODE_BLOCK_START.test(nextLine) ||
        BLOCKQUOTE_REGEX.test(nextLine) ||
        UNORDERED_LIST_REGEX.test(nextLine) ||
        ORDERED_LIST_REGEX.test(nextLine) ||
        HORIZONTAL_RULE_REGEX.test(nextLine)
      ) {
        break;
      }
      paragraphLines.push(nextLine);
      i++;
    }

    const separator = options.breaks ? '\n' : ' ';
    nodes.push({
      type: 'paragraph',
      children: parseInline(paragraphLines.join(separator)),
    });
  }

  return nodes;
}

/**
 * Convert markdown AST back to plain text
 */
export function toPlainText(nodes: MarkdownNode[]): string {
  return nodes
    .map((node) => {
      switch (node.type) {
        case 'text':
          return node.content || '';
        case 'paragraph':
          return toPlainText(node.children || []) + '\n';
        case 'heading':
          return toPlainText(node.children || []) + '\n';
        case 'bold':
        case 'italic':
          return toPlainText(node.children || []);
        case 'code':
          return node.content || '';
        case 'codeBlock':
          return (node.content || '') + '\n';
        case 'link':
          return node.content || '';
        case 'list':
          return (node.children || [])
            .map((item, idx) => {
              const prefix = node.ordered ? `${idx + 1}. ` : '• ';
              return prefix + toPlainText(item.children || []);
            })
            .join('\n') + '\n';
        case 'listItem':
          return toPlainText(node.children || []);
        case 'blockquote':
          return toPlainText(node.children || [])
            .split('\n')
            .map((l) => '> ' + l)
            .join('\n') + '\n';
        case 'horizontalRule':
          return '---\n';
        case 'lineBreak':
          return '\n';
        default:
          return '';
      }
    })
    .join('');
}

/**
 * Extract code blocks from markdown
 */
export function extractCodeBlocks(nodes: MarkdownNode[]): Array<{ code: string; language?: string }> {
  const blocks: Array<{ code: string; language?: string }> = [];

  function traverse(nodeList: MarkdownNode[]) {
    for (const node of nodeList) {
      if (node.type === 'codeBlock') {
        blocks.push({
          code: node.content || '',
          language: node.language,
        });
      }
      if (node.children) {
        traverse(node.children);
      }
    }
  }

  traverse(nodes);
  return blocks;
}
