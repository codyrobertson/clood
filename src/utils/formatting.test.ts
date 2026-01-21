/**
 * Formatting Utilities Tests (UOW-0702)
 */

import { describe, it, expect } from 'vitest';
import {
  formatMessageContent,
  isAsciiDiagram,
  truncate,
  pad,
  formatDuration,
  formatTime,
  generateId,
} from './formatting.js';

describe('formatting', () => {
  describe('formatMessageContent', () => {
    it('should return content as-is', () => {
      const content = 'Hello, world!';
      expect(formatMessageContent(content, 80)).toBe(content);
    });

    it('should preserve whitespace', () => {
      const content = '  indented  text  ';
      expect(formatMessageContent(content, 80)).toBe(content);
    });
  });

  describe('isAsciiDiagram', () => {
    it('should detect box-drawing diagrams', () => {
      const diagram = `
┌─────────┐
│  Box    │
│  Text   │
└─────────┘
`;
      expect(isAsciiDiagram(diagram)).toBe(true);
    });

    it('should detect ASCII art boxes', () => {
      const diagram = `
+----------+
|  ASCII   |
|  Box     |
+----------+
`;
      expect(isAsciiDiagram(diagram)).toBe(true);
    });

    it('should detect flow diagrams with boxes', () => {
      const diagram = `
+--------+     +--------+
| Step 1 | --> | Step 2 |
+--------+     +--------+
     |              |
     v              v
+--------+     +--------+
|Result 1|     |Result 2|
+--------+     +--------+
`;
      expect(isAsciiDiagram(diagram)).toBe(true);
    });

    it('should detect horizontal line patterns', () => {
      const diagram = `
+---------------------+
|    Header           |
+---------------------+
|  Content here       |
+---------------------+
`;
      expect(isAsciiDiagram(diagram)).toBe(true);
    });

    it('should detect unicode box drawings', () => {
      const diagram = `
╔═══════════════╗
║   Unicode     ║
║   Box         ║
╚═══════════════╝
`;
      expect(isAsciiDiagram(diagram)).toBe(true);
    });

    it('should detect rounded corner boxes', () => {
      const diagram = `
╭──────────────╮
│  Rounded     │
│  Box         │
╰──────────────╯
`;
      expect(isAsciiDiagram(diagram)).toBe(true);
    });

    it('should detect tree structures', () => {
      const diagram = `
root
├── child1
│   ├── grandchild1
│   └── grandchild2
└── child2
`;
      expect(isAsciiDiagram(diagram)).toBe(true);
    });

    it('should NOT detect plain text', () => {
      const text = `
This is just regular text.
It has multiple lines.
But no diagram characters.
`;
      expect(isAsciiDiagram(text)).toBe(false);
    });

    it('should NOT detect short content with few special chars', () => {
      const text = `Line 1
Line 2`;
      expect(isAsciiDiagram(text)).toBe(false);
    });

    it('should NOT detect single arrow in text', () => {
      const text = `See next step -> continue
This is a note.
Regular paragraph.`;
      expect(isAsciiDiagram(text)).toBe(false);
    });

    it('should detect complex flowchart', () => {
      const flowchart = `
    ┌─────────┐     ┌─────────┐
    │  Start  │────>│ Process │
    └─────────┘     └────┬────┘
                         │
                    ┌────v────┐
                    │ Decision│
                    └────┬────┘
                    Yes  │  No
                   ┌─────┴─────┐
              ┌────v───┐  ┌────v───┐
              │ Path A │  │ Path B │
              └────────┘  └────────┘
`;
      expect(isAsciiDiagram(flowchart)).toBe(true);
    });

    it('should detect sequence diagram style', () => {
      const sequence = `
+--------+      +--------+
| Client |      | Server |
+--------+      +--------+
    |               |
    |---request---->|
    |               |
    |<--response----|
    |               |
`;
      expect(isAsciiDiagram(sequence)).toBe(true);
    });
  });

  describe('truncate', () => {
    it('should not truncate short strings', () => {
      expect(truncate('Hello', 10)).toBe('Hello');
    });

    it('should truncate long strings with ellipsis', () => {
      expect(truncate('Hello, World!', 10)).toBe('Hello, ...');
    });

    it('should handle exact length', () => {
      expect(truncate('Hello', 5)).toBe('Hello');
    });

    it('should handle very short max width', () => {
      expect(truncate('Hello', 4)).toBe('H...');
    });
  });

  describe('pad', () => {
    it('should left pad by default', () => {
      expect(pad('Hi', 5)).toBe('Hi   ');
    });

    it('should right pad', () => {
      expect(pad('Hi', 5, 'right')).toBe('   Hi');
    });

    it('should center pad', () => {
      expect(pad('Hi', 6, 'center')).toBe('  Hi  ');
    });

    it('should center pad with odd padding', () => {
      expect(pad('Hi', 5, 'center')).toBe(' Hi  ');
    });

    it('should not pad if already at width', () => {
      expect(pad('Hello', 5)).toBe('Hello');
    });

    it('should not truncate if over width', () => {
      expect(pad('Hello', 3)).toBe('Hello');
    });
  });

  describe('formatDuration', () => {
    it('should format milliseconds', () => {
      expect(formatDuration(500)).toBe('500ms');
    });

    it('should format seconds', () => {
      expect(formatDuration(5000)).toBe('5.0s');
    });

    it('should format seconds with decimals', () => {
      expect(formatDuration(5500)).toBe('5.5s');
    });

    it('should format minutes and seconds', () => {
      expect(formatDuration(125000)).toBe('2m 5s');
    });

    it('should format just over a minute', () => {
      expect(formatDuration(61000)).toBe('1m 1s');
    });
  });

  describe('formatTime', () => {
    it('should format time in 24-hour format', () => {
      const date = new Date('2024-01-15T14:30:45');
      const result = formatTime(date);
      expect(result).toMatch(/14:30:45/);
    });

    it('should format morning time', () => {
      const date = new Date('2024-01-15T09:05:00');
      const result = formatTime(date);
      expect(result).toMatch(/09:05:00/);
    });
  });

  describe('generateId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateId();
      const id2 = generateId();
      const id3 = generateId();

      expect(id1).not.toBe(id2);
      expect(id2).not.toBe(id3);
      expect(id1).not.toBe(id3);
    });

    it('should contain timestamp', () => {
      const before = Date.now();
      const id = generateId();
      const after = Date.now();

      const timestamp = parseInt(id.split('-')[0]);
      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });
  });
});
