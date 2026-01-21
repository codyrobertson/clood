/**
 * Markdown Renderer Tests (UOW-0412)
 *
 * Comprehensive tests for markdown rendering including:
 * - Baseline rendering tests
 * - Code block preservation tests
 * - ANSI renderer tests
 * - Syntax highlighting tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { parseMarkdown } from './MarkdownParser.js';
import {
  AnsiMarkdownRenderer,
  createAnsiRenderer,
  renderMarkdownToAnsi,
} from './MarkdownRenderer.js';
import {
  renderCodeBlock,
  renderInlineCode,
  CodeBlockRenderer,
} from './CodeBlockRenderer.js';

// ============================================================================
// AnsiMarkdownRenderer Tests
// ============================================================================

describe('AnsiMarkdownRenderer', () => {
  let renderer: AnsiMarkdownRenderer;

  beforeEach(() => {
    renderer = new AnsiMarkdownRenderer({ useColors: false });
  });

  describe('basic rendering', () => {
    it('should render plain text', () => {
      const nodes = parseMarkdown('Hello World');
      const result = renderer.render(nodes);
      expect(result).toContain('Hello World');
    });

    it('should render multiple paragraphs', () => {
      const nodes = parseMarkdown('First paragraph\n\nSecond paragraph');
      const result = renderer.render(nodes);
      expect(result).toContain('First paragraph');
      expect(result).toContain('Second paragraph');
    });
  });

  describe('headings', () => {
    it('should render h1', () => {
      const nodes = parseMarkdown('# Heading 1');
      const result = renderer.render(nodes);
      expect(result).toContain('# Heading 1');
    });

    it('should render h2', () => {
      const nodes = parseMarkdown('## Heading 2');
      const result = renderer.render(nodes);
      expect(result).toContain('## Heading 2');
    });

    it('should render h3-h6', () => {
      const nodes = parseMarkdown('### H3\n#### H4\n##### H5\n###### H6');
      const result = renderer.render(nodes);
      expect(result).toContain('### H3');
      expect(result).toContain('#### H4');
      expect(result).toContain('##### H5');
      expect(result).toContain('###### H6');
    });
  });

  describe('inline formatting', () => {
    it('should render bold text', () => {
      const nodes = parseMarkdown('This is **bold** text');
      const result = renderer.render(nodes);
      expect(result).toContain('**bold**');
    });

    it('should render italic text', () => {
      const nodes = parseMarkdown('This is *italic* text');
      const result = renderer.render(nodes);
      expect(result).toContain('*italic*');
    });

    it('should render inline code', () => {
      const nodes = parseMarkdown('Use `console.log()` for debugging');
      const result = renderer.render(nodes);
      expect(result).toContain('`console.log()`');
    });

    it('should render links', () => {
      const nodes = parseMarkdown('[Google](https://google.com)');
      const result = renderer.render(nodes);
      expect(result).toContain('Google');
      expect(result).toContain('https://google.com');
    });
  });

  describe('lists', () => {
    it('should render unordered lists', () => {
      const nodes = parseMarkdown('- Item 1\n- Item 2\n- Item 3');
      const result = renderer.render(nodes);
      expect(result).toContain('Item 1');
      expect(result).toContain('Item 2');
      expect(result).toContain('Item 3');
    });

    it('should render ordered lists', () => {
      const nodes = parseMarkdown('1. First\n2. Second\n3. Third');
      const result = renderer.render(nodes);
      expect(result).toContain('1.');
      expect(result).toContain('First');
      expect(result).toContain('2.');
      expect(result).toContain('Second');
    });
  });

  describe('blockquotes', () => {
    it('should render blockquotes', () => {
      const nodes = parseMarkdown('> This is a quote');
      const result = renderer.render(nodes);
      expect(result).toContain('This is a quote');
    });
  });

  describe('horizontal rules', () => {
    it('should render horizontal rules', () => {
      const nodes = parseMarkdown('---');
      const result = renderer.render(nodes);
      // Without colors, should render as ---
      expect(result).toContain('---');
    });
  });

  describe('with colors enabled', () => {
    it('should include ANSI codes when colors enabled', () => {
      const colorRenderer = createAnsiRenderer({ useColors: true });
      const nodes = parseMarkdown('# Colored Heading');
      const result = colorRenderer.render(nodes);
      // Should contain ANSI escape codes
      expect(result).toContain('\x1b[');
    });
  });
});

// ============================================================================
// Code Block Rendering Tests
// ============================================================================

describe('CodeBlockRenderer', () => {
  describe('basic rendering', () => {
    it('should render simple code block', () => {
      const result = renderCodeBlock({
        code: 'const x = 1;',
        useColors: false,
        showBorder: false,
        showLineNumbers: false,
      });
      expect(result).toContain('const x = 1;');
    });

    it('should render multi-line code block', () => {
      const code = 'function hello() {\n  return "world";\n}';
      const result = renderCodeBlock({
        code,
        useColors: false,
        showBorder: false,
        showLineNumbers: false,
      });
      expect(result).toContain('function hello()');
      expect(result).toContain('return "world"');
    });
  });

  describe('whitespace preservation', () => {
    it('should preserve leading spaces', () => {
      const code = '    indented code';
      const result = renderCodeBlock({
        code,
        useColors: false,
        showBorder: false,
        showLineNumbers: false,
      });
      expect(result).toContain('    indented code');
    });

    it('should preserve indentation levels', () => {
      const code = 'level0\n  level1\n    level2\n      level3';
      const result = renderCodeBlock({
        code,
        useColors: false,
        showBorder: false,
        showLineNumbers: false,
      });
      expect(result).toContain('level0');
      expect(result).toContain('  level1');
      expect(result).toContain('    level2');
      expect(result).toContain('      level3');
    });

    it('should expand tabs to spaces', () => {
      const code = 'no tab\n\ttabbed';
      const result = renderCodeBlock({
        code,
        useColors: false,
        showBorder: false,
        showLineNumbers: false,
        tabSize: 4,
      });
      expect(result).toContain('no tab');
      // Tab should be expanded to 4 spaces
      expect(result).toContain('    tabbed');
    });

    it('should preserve empty lines', () => {
      const code = 'line1\n\nline3';
      const result = renderCodeBlock({
        code,
        useColors: false,
        showBorder: false,
        showLineNumbers: false,
      });
      const lines = result.split('\n');
      expect(lines).toHaveLength(3);
    });

    it('should preserve trailing whitespace', () => {
      const code = 'text with trailing    ';
      const result = renderCodeBlock({
        code,
        useColors: false,
        showBorder: false,
        showLineNumbers: false,
      });
      expect(result).toContain('text with trailing    ');
    });
  });

  describe('line numbers', () => {
    it('should show line numbers when enabled', () => {
      const code = 'line1\nline2\nline3';
      const result = renderCodeBlock({
        code,
        showLineNumbers: true,
        useColors: false,
        showBorder: false,
      });
      expect(result).toMatch(/1.*line1/);
      expect(result).toMatch(/2.*line2/);
      expect(result).toMatch(/3.*line3/);
    });

    it('should pad line numbers correctly', () => {
      // Create code with 100 lines
      const lines = Array.from({ length: 100 }, (_, i) => `line ${i + 1}`);
      const code = lines.join('\n');
      const result = renderCodeBlock({
        code,
        showLineNumbers: true,
        useColors: false,
        showBorder: false,
      });
      // Line numbers should be padded to 3 digits
      expect(result).toMatch(/\s*1.*line 1/);
      expect(result).toMatch(/100.*line 100/);
    });

    it('should support custom start line number', () => {
      const code = 'line1\nline2';
      const result = renderCodeBlock({
        code,
        showLineNumbers: true,
        startLineNumber: 10,
        useColors: false,
        showBorder: false,
      });
      expect(result).toMatch(/10.*line1/);
      expect(result).toMatch(/11.*line2/);
    });
  });

  describe('borders', () => {
    it('should render borders when enabled', () => {
      const result = renderCodeBlock({
        code: 'const x = 1;',
        showBorder: true,
        useColors: false,
        showLineNumbers: false,
      });
      // Should contain box drawing characters
      expect(result).toMatch(/[\u256d\u256e\u2570\u256f\u2500\u2502]/);
    });

    it('should not render borders when disabled', () => {
      const result = renderCodeBlock({
        code: 'const x = 1;',
        showBorder: false,
        useColors: false,
        showLineNumbers: false,
      });
      // Should not contain box drawing border corners
      expect(result).not.toMatch(/[\u256d\u256e\u2570\u256f]/);
    });
  });

  describe('language label', () => {
    it('should show language label when specified', () => {
      const result = renderCodeBlock({
        code: 'const x = 1;',
        language: 'javascript',
        showLanguageLabel: true,
        showBorder: true,
        useColors: false,
        showLineNumbers: false,
      });
      expect(result).toContain('javascript');
    });

    it('should not show language label when disabled', () => {
      const result = renderCodeBlock({
        code: 'const x = 1;',
        language: 'javascript',
        showLanguageLabel: false,
        showBorder: true,
        useColors: false,
        showLineNumbers: false,
      });
      expect(result).not.toContain('javascript');
    });
  });

  describe('syntax highlighting', () => {
    it('should apply syntax highlighting when enabled with colors', () => {
      const result = renderCodeBlock({
        code: 'const x = 1;',
        language: 'javascript',
        syntaxHighlight: true,
        useColors: true,
        showBorder: false,
        showLineNumbers: false,
      });
      // Should contain ANSI codes from syntax highlighting
      expect(result).toContain('\x1b[');
    });

    it('should not apply syntax highlighting when colors disabled', () => {
      const result = renderCodeBlock({
        code: 'const x = 1;',
        language: 'javascript',
        syntaxHighlight: true,
        useColors: false,
        showBorder: false,
        showLineNumbers: false,
      });
      // Should not contain ANSI codes
      expect(result).not.toContain('\x1b[');
    });

    it('should handle unknown languages gracefully', () => {
      const result = renderCodeBlock({
        code: 'some code',
        language: 'nonexistent-language-xyz',
        syntaxHighlight: true,
        useColors: true,
        showBorder: false,
        showLineNumbers: false,
      });
      // Should still render the code
      expect(result).toContain('some code');
    });
  });

  describe('CodeBlockRenderer class', () => {
    it('should create renderer with default options', () => {
      const cbRenderer = new CodeBlockRenderer();
      const result = cbRenderer.render('const x = 1;');
      expect(result).toContain('const x = 1;');
    });

    it('should allow option updates', () => {
      const cbRenderer = new CodeBlockRenderer({ showLineNumbers: false });
      cbRenderer.setOptions({ showLineNumbers: true });
      const opts = cbRenderer.getOptions();
      expect(opts.showLineNumbers).toBe(true);
    });

    it('should render inline code', () => {
      const cbRenderer = new CodeBlockRenderer({ useColors: false });
      const result = cbRenderer.renderInline('npm install');
      expect(result).toContain('npm install');
    });
  });
});

// ============================================================================
// Inline Code Rendering Tests
// ============================================================================

describe('renderInlineCode', () => {
  it('should render inline code without colors', () => {
    const result = renderInlineCode('npm install', false);
    expect(result).toContain('npm install');
    expect(result).toContain('`');
  });

  it('should render inline code with colors', () => {
    const result = renderInlineCode('npm install', true);
    expect(result).toContain('npm install');
    expect(result).toContain('\x1b[');
  });
});

// ============================================================================
// Integration Tests - Markdown with Code Blocks
// ============================================================================

describe('Markdown with Code Blocks Integration', () => {
  it('should render markdown document with code block', () => {
    const markdown = `# Example

Here is some code:

\`\`\`javascript
function hello() {
  return "world";
}
\`\`\`

And some more text.`;

    const result = renderMarkdownToAnsi(markdown, { useColors: false }, parseMarkdown);
    expect(result).toContain('# Example');
    expect(result).toContain('Here is some code');
    expect(result).toContain('function hello()');
    expect(result).toContain('return "world"');
    expect(result).toContain('And some more text');
  });

  it('should preserve code block indentation in markdown', () => {
    const markdown = `\`\`\`python
def example():
    if True:
        nested = "value"
        return nested
\`\`\``;

    const result = renderMarkdownToAnsi(markdown, { useColors: false }, parseMarkdown);
    expect(result).toContain('def example():');
    expect(result).toContain('    if True:');
    expect(result).toContain('        nested = "value"');
  });

  it('should handle multiple code blocks', () => {
    const markdown = `\`\`\`js
const a = 1;
\`\`\`

\`\`\`python
b = 2
\`\`\``;

    const result = renderMarkdownToAnsi(markdown, { useColors: false }, parseMarkdown);
    expect(result).toContain('const a = 1;');
    expect(result).toContain('b = 2');
  });

  it('should handle inline code in text', () => {
    const markdown = 'Use the `npm install` command to install packages.';
    const result = renderMarkdownToAnsi(markdown, { useColors: false }, parseMarkdown);
    expect(result).toContain('npm install');
  });
});

// ============================================================================
// Edge Cases and Error Handling
// ============================================================================

describe('Edge Cases', () => {
  describe('empty content', () => {
    it('should handle empty markdown', () => {
      const result = renderMarkdownToAnsi('', { useColors: false }, parseMarkdown);
      expect(result).toBe('');
    });

    it('should handle empty code block', () => {
      const result = renderCodeBlock({
        code: '',
        useColors: false,
        showBorder: false,
        showLineNumbers: false,
      });
      expect(result).toBe('');
    });
  });

  describe('special characters', () => {
    it('should handle code with special characters', () => {
      const code = 'const regex = /[a-z]+/g;';
      const result = renderCodeBlock({
        code,
        useColors: false,
        showBorder: false,
        showLineNumbers: false,
      });
      expect(result).toContain('/[a-z]+/g');
    });

    it('should handle code with unicode', () => {
      const code = 'const emoji = "test";';
      const result = renderCodeBlock({
        code,
        useColors: false,
        showBorder: false,
        showLineNumbers: false,
      });
      expect(result).toContain('test');
    });

    it('should handle code with ANSI sequences', () => {
      const code = 'const ansi = "\\x1b[31mred\\x1b[0m";';
      const result = renderCodeBlock({
        code,
        useColors: false,
        showBorder: false,
        showLineNumbers: false,
      });
      expect(result).toContain('\\x1b[31mred');
    });
  });

  describe('very long content', () => {
    it('should handle very long lines without wrapping', () => {
      const longLine = 'x'.repeat(200);
      const result = renderCodeBlock({
        code: longLine,
        useColors: false,
        showBorder: false,
        showLineNumbers: false,
      });
      expect(result).toContain(longLine);
    });

    it('should handle many lines', () => {
      const manyLines = Array.from({ length: 1000 }, (_, i) => `line ${i}`).join('\n');
      const result = renderCodeBlock({
        code: manyLines,
        showLineNumbers: true,
        useColors: false,
        showBorder: false,
      });
      expect(result).toContain('line 0');
      expect(result).toContain('line 999');
    });
  });
});

// ============================================================================
// Convenience Function Tests
// ============================================================================

describe('renderMarkdownToAnsi', () => {
  it('should render complete markdown documents', () => {
    const markdown = `# Title

Paragraph with **bold** and *italic*.

- List item 1
- List item 2

> A blockquote

\`\`\`
code
\`\`\`
`;

    const result = renderMarkdownToAnsi(markdown, { useColors: false }, parseMarkdown);
    expect(result).toContain('# Title');
    expect(result).toContain('**bold**');
    expect(result).toContain('*italic*');
    expect(result).toContain('List item 1');
    expect(result).toContain('A blockquote');
    expect(result).toContain('code');
  });

  it('should apply custom options', () => {
    const result = renderMarkdownToAnsi('# Test', {
      useColors: true,
      width: 100,
    }, parseMarkdown);
    expect(result).toContain('\x1b['); // ANSI codes
  });
});
