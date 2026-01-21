/**
 * Markdown Parser Tests (UOW-0409)
 */

import { describe, it, expect } from 'vitest';
import { parseMarkdown, toPlainText, extractCodeBlocks } from './MarkdownParser.js';

describe('parseMarkdown', () => {
  describe('headings', () => {
    it('should parse h1', () => {
      const nodes = parseMarkdown('# Hello');
      expect(nodes).toHaveLength(1);
      expect(nodes[0].type).toBe('heading');
      expect(nodes[0].level).toBe(1);
    });

    it('should parse h2-h6', () => {
      const nodes = parseMarkdown('## H2\n### H3\n#### H4');
      expect(nodes).toHaveLength(3);
      expect(nodes[0].level).toBe(2);
      expect(nodes[1].level).toBe(3);
      expect(nodes[2].level).toBe(4);
    });
  });

  describe('inline formatting', () => {
    it('should parse bold text', () => {
      const nodes = parseMarkdown('This is **bold** text');
      expect(nodes).toHaveLength(1);
      const para = nodes[0];
      expect(para.type).toBe('paragraph');
      expect(para.children).toBeDefined();

      const boldNode = para.children?.find(n => n.type === 'bold');
      expect(boldNode).toBeDefined();
    });

    it('should parse italic text', () => {
      const nodes = parseMarkdown('This is *italic* text');
      expect(nodes).toHaveLength(1);
      const para = nodes[0];
      const italicNode = para.children?.find(n => n.type === 'italic');
      expect(italicNode).toBeDefined();
    });

    it('should parse inline code', () => {
      const nodes = parseMarkdown('Use `console.log()` for debugging');
      expect(nodes).toHaveLength(1);
      const para = nodes[0];
      const codeNode = para.children?.find(n => n.type === 'code');
      expect(codeNode).toBeDefined();
      expect(codeNode?.content).toBe('console.log()');
    });

    it('should parse links', () => {
      const nodes = parseMarkdown('Check out [Google](https://google.com)');
      expect(nodes).toHaveLength(1);
      const para = nodes[0];
      const linkNode = para.children?.find(n => n.type === 'link');
      expect(linkNode).toBeDefined();
      expect(linkNode?.content).toBe('Google');
      expect(linkNode?.url).toBe('https://google.com');
    });
  });

  describe('code blocks', () => {
    it('should parse code block without language', () => {
      const nodes = parseMarkdown('```\nconst x = 1;\n```');
      expect(nodes).toHaveLength(1);
      expect(nodes[0].type).toBe('codeBlock');
      expect(nodes[0].content).toBe('const x = 1;');
      expect(nodes[0].language).toBeUndefined();
    });

    it('should parse code block with language', () => {
      const nodes = parseMarkdown('```typescript\nconst x: number = 1;\n```');
      expect(nodes).toHaveLength(1);
      expect(nodes[0].type).toBe('codeBlock');
      expect(nodes[0].language).toBe('typescript');
      expect(nodes[0].content).toBe('const x: number = 1;');
    });

    it('should parse multi-line code blocks', () => {
      const md = '```js\nfunction hello() {\n  return "world";\n}\n```';
      const nodes = parseMarkdown(md);
      expect(nodes[0].content).toBe('function hello() {\n  return "world";\n}');
    });
  });

  describe('lists', () => {
    it('should parse unordered list', () => {
      const nodes = parseMarkdown('- Item 1\n- Item 2\n- Item 3');
      expect(nodes).toHaveLength(1);
      expect(nodes[0].type).toBe('list');
      expect(nodes[0].ordered).toBe(false);
      expect(nodes[0].children).toHaveLength(3);
    });

    it('should parse ordered list', () => {
      const nodes = parseMarkdown('1. First\n2. Second\n3. Third');
      expect(nodes).toHaveLength(1);
      expect(nodes[0].type).toBe('list');
      expect(nodes[0].ordered).toBe(true);
      expect(nodes[0].children).toHaveLength(3);
    });

    it('should parse list items with formatting', () => {
      const nodes = parseMarkdown('- **Bold** item\n- *Italic* item');
      expect(nodes[0].children?.[0].children?.some(n => n.type === 'bold')).toBe(true);
      expect(nodes[0].children?.[1].children?.some(n => n.type === 'italic')).toBe(true);
    });
  });

  describe('blockquotes', () => {
    it('should parse single line blockquote', () => {
      const nodes = parseMarkdown('> This is a quote');
      expect(nodes).toHaveLength(1);
      expect(nodes[0].type).toBe('blockquote');
    });

    it('should parse multi-line blockquote', () => {
      const nodes = parseMarkdown('> Line 1\n> Line 2');
      expect(nodes).toHaveLength(1);
      expect(nodes[0].type).toBe('blockquote');
    });
  });

  describe('horizontal rule', () => {
    it('should parse ---', () => {
      const nodes = parseMarkdown('---');
      expect(nodes).toHaveLength(1);
      expect(nodes[0].type).toBe('horizontalRule');
    });

    it('should parse ***', () => {
      const nodes = parseMarkdown('***');
      expect(nodes).toHaveLength(1);
      expect(nodes[0].type).toBe('horizontalRule');
    });

    it('should parse ___', () => {
      const nodes = parseMarkdown('___');
      expect(nodes).toHaveLength(1);
      expect(nodes[0].type).toBe('horizontalRule');
    });
  });

  describe('paragraphs', () => {
    it('should parse plain text as paragraph', () => {
      const nodes = parseMarkdown('Just some text');
      expect(nodes).toHaveLength(1);
      expect(nodes[0].type).toBe('paragraph');
    });

    it('should join consecutive lines', () => {
      const nodes = parseMarkdown('Line 1\nLine 2\nLine 3');
      expect(nodes).toHaveLength(1);
      expect(nodes[0].type).toBe('paragraph');
    });

    it('should split on blank lines', () => {
      const nodes = parseMarkdown('Paragraph 1\n\nParagraph 2');
      expect(nodes).toHaveLength(2);
    });
  });

  describe('complex documents', () => {
    it('should parse mixed content', () => {
      const md = `# Title

This is a paragraph with **bold** and *italic*.

- List item 1
- List item 2

\`\`\`js
const x = 1;
\`\`\`

> A quote
`;
      const nodes = parseMarkdown(md);
      expect(nodes.length).toBeGreaterThan(0);

      const types = nodes.map(n => n.type);
      expect(types).toContain('heading');
      expect(types).toContain('paragraph');
      expect(types).toContain('list');
      expect(types).toContain('codeBlock');
      expect(types).toContain('blockquote');
    });
  });
});

describe('toPlainText', () => {
  it('should convert AST to plain text', () => {
    const nodes = parseMarkdown('# Hello\n\nWorld');
    const text = toPlainText(nodes);
    expect(text).toContain('Hello');
    expect(text).toContain('World');
  });

  it('should strip formatting', () => {
    const nodes = parseMarkdown('**bold** and *italic*');
    const text = toPlainText(nodes);
    expect(text).toContain('bold');
    expect(text).toContain('italic');
    expect(text).not.toContain('**');
    expect(text).not.toContain('*');
  });
});

describe('extractCodeBlocks', () => {
  it('should extract code blocks', () => {
    const nodes = parseMarkdown('```js\ncode1\n```\n\n```python\ncode2\n```');
    const blocks = extractCodeBlocks(nodes);
    expect(blocks).toHaveLength(2);
    expect(blocks[0].code).toBe('code1');
    expect(blocks[0].language).toBe('js');
    expect(blocks[1].code).toBe('code2');
    expect(blocks[1].language).toBe('python');
  });

  it('should return empty array when no code blocks', () => {
    const nodes = parseMarkdown('No code here');
    const blocks = extractCodeBlocks(nodes);
    expect(blocks).toHaveLength(0);
  });
});
