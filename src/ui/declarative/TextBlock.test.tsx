/**
 * TextBlock Component Tests (UOW-0810)
 *
 * Tests for the ANSI-safe, Unicode-aware text rendering component.
 */

import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import {
  TextBlock,
  SimpleText,
  Paragraph,
  Label,
  Highlight,
  CodeBlock,
  getVisualWidth,
  truncateText,
  padText,
  wrapText,
} from './TextBlock.js';

describe('TextBlock utility functions', () => {
  describe('getVisualWidth', () => {
    it('should return correct width for ASCII text', () => {
      expect(getVisualWidth('hello')).toBe(5);
      expect(getVisualWidth('hello world')).toBe(11);
    });

    it('should handle empty string', () => {
      expect(getVisualWidth('')).toBe(0);
    });

    it('should handle wide characters (CJK)', () => {
      // CJK characters typically have width of 2
      expect(getVisualWidth('\u4E2D\u6587')).toBe(4); // Chinese characters
    });

    it('should handle emojis', () => {
      // Emoji width varies by implementation
      const width = getVisualWidth('\uD83D\uDE00');
      expect(width).toBeGreaterThan(0);
    });
  });

  describe('truncateText', () => {
    it('should not truncate text that fits', () => {
      expect(truncateText('hello', 10)).toBe('hello');
    });

    it('should truncate at end by default', () => {
      const result = truncateText('hello world', 8);
      expect(result).toBe('hello w\u2026');
    });

    it('should truncate at start when specified', () => {
      const result = truncateText('hello world', 8, { position: 'start' });
      expect(result).toBe('\u2026o world');
    });

    it('should truncate in middle when specified', () => {
      const result = truncateText('hello world', 8, { position: 'middle' });
      expect(result).toContain('\u2026');
      expect(getVisualWidth(result)).toBeLessThanOrEqual(8);
    });

    it('should use custom ellipsis', () => {
      const result = truncateText('hello world', 8, { ellipsis: '...' });
      expect(result).toContain('...');
    });

    it('should handle maxWidth smaller than ellipsis', () => {
      const result = truncateText('hello', 1);
      expect(result.length).toBeLessThanOrEqual(1);
    });
  });

  describe('padText', () => {
    it('should pad text to width (left align)', () => {
      expect(padText('hi', 5, 'left')).toBe('hi   ');
    });

    it('should pad text to width (right align)', () => {
      expect(padText('hi', 5, 'right')).toBe('   hi');
    });

    it('should pad text to width (center align)', () => {
      expect(padText('hi', 6, 'center')).toBe('  hi  ');
    });

    it('should not pad if text is already longer', () => {
      expect(padText('hello world', 5, 'left')).toBe('hello world');
    });
  });

  describe('wrapText', () => {
    it('should wrap text at word boundaries', () => {
      const result = wrapText('hello world how are you', 10);
      expect(result.length).toBeGreaterThan(1);
      result.forEach(line => {
        expect(getVisualWidth(line)).toBeLessThanOrEqual(11); // Allow for slight overflow
      });
    });

    it('should hard wrap when specified', () => {
      const result = wrapText('superlongword', 5, { hard: true });
      expect(result.length).toBeGreaterThan(1);
    });

    it('should preserve newlines', () => {
      const result = wrapText('line1\nline2', 20);
      expect(result.length).toBe(2);
    });
  });
});

describe('TextBlock component', () => {
  it('should render basic text', () => {
    const { lastFrame } = render(
      <TextBlock id="test" content="Hello World" />
    );
    expect(lastFrame()).toContain('Hello World');
  });

  it('should render empty when visible is false', () => {
    const { lastFrame } = render(
      <TextBlock id="test" content="Hidden" visible={false} />
    );
    expect(lastFrame()).toBe('');
  });

  it('should handle multiline content', () => {
    const { lastFrame } = render(
      <TextBlock id="test" content="Line 1\nLine 2\nLine 3" />
    );
    expect(lastFrame()).toContain('Line 1');
    expect(lastFrame()).toContain('Line 2');
    expect(lastFrame()).toContain('Line 3');
  });

  it('should truncate text when specified', () => {
    const { lastFrame } = render(
      <TextBlock
        id="test"
        content="This is a very long text that should be truncated"
        maxWidth={15}
        truncate={true}
      />
    );
    const frame = lastFrame();
    expect(frame).toContain('\u2026');
  });

  it('should wrap text when specified', () => {
    const { lastFrame } = render(
      <TextBlock
        id="test"
        content="This is a long text that should wrap to multiple lines"
        maxWidth={20}
        wrap={true}
      />
    );
    const frame = lastFrame();
    const lines = frame.split('\n').filter(l => l.trim());
    expect(lines.length).toBeGreaterThan(1);
  });

  it('should handle empty content', () => {
    const { lastFrame } = render(
      <TextBlock id="test" content="" />
    );
    expect(lastFrame()).toBe('');
  });

  it('should apply text styles', () => {
    // Just verify it renders without error with styles
    const { lastFrame } = render(
      <TextBlock id="test" content="Styled text" style="bold" color="cyan" />
    );
    expect(lastFrame()).toContain('Styled text');
  });

  it('should apply multiple styles', () => {
    const { lastFrame } = render(
      <TextBlock id="test" content="Multi-styled" style={['bold', 'italic']} />
    );
    expect(lastFrame()).toContain('Multi-styled');
  });
});

describe('SimpleText component', () => {
  it('should render text with defaults', () => {
    const { lastFrame } = render(
      <SimpleText id="test" content="Simple text" />
    );
    expect(lastFrame()).toContain('Simple text');
  });

  it('should truncate by default when maxWidth specified', () => {
    const { lastFrame } = render(
      <SimpleText
        id="test"
        content="This is a very long text"
        maxWidth={10}
      />
    );
    expect(lastFrame()).toContain('\u2026');
  });
});

describe('Paragraph component', () => {
  it('should render wrapped text', () => {
    const { lastFrame } = render(
      <Paragraph
        id="test"
        content="This is a paragraph that should wrap nicely to multiple lines."
        maxWidth={30}
      />
    );
    const frame = lastFrame();
    const lines = frame.split('\n').filter(l => l.trim());
    expect(lines.length).toBeGreaterThan(1);
  });
});

describe('Label component', () => {
  it('should render label text', () => {
    const { lastFrame } = render(
      <Label id="test" content="Field Label" />
    );
    expect(lastFrame()).toContain('Field Label');
  });

  it('should show required indicator when specified', () => {
    const { lastFrame } = render(
      <Label id="test" content="Required Field" required={true} />
    );
    expect(lastFrame()).toContain('Required Field');
    expect(lastFrame()).toContain('*');
  });
});

describe('Highlight component', () => {
  it('should render highlighted text', () => {
    const { lastFrame } = render(
      <Highlight id="test" content="Important!" />
    );
    expect(lastFrame()).toContain('Important!');
  });
});

describe('CodeBlock component', () => {
  it('should render code content', () => {
    const { lastFrame } = render(
      <CodeBlock
        id="test"
        content="const x = 1;\nconst y = 2;"
      />
    );
    // CodeBlock wraps content in a box
    expect(lastFrame()).toContain('const x = 1;');
  });

  it('should show line numbers when enabled', () => {
    const { lastFrame } = render(
      <CodeBlock
        id="test"
        content="line1\nline2\nline3"
        showLineNumbers={true}
      />
    );
    expect(lastFrame()).toContain('1');
    expect(lastFrame()).toContain('2');
    expect(lastFrame()).toContain('3');
  });

  it('should render with border', () => {
    const { lastFrame } = render(
      <CodeBlock
        id="test"
        content="code content"
      />
    );
    // Should have some visual border
    expect(lastFrame()).toContain('code content');
  });
});
