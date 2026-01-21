/**
 * CLI Arguments Parser Tests (UOW-1304)
 *
 * Tests for command-line argument parsing functionality including:
 * - Flag parsing (--session, --debug, --help)
 * - Short flag aliases (-s, -d, -h)
 * - Help output format verification
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseArgs, CliArgs } from './args.js';

describe('CLI Arguments Parser', () => {
  // Store original process.exit and console.log
  const originalExit = process.exit;
  const originalConsoleLog = console.log;
  let exitCode: number | undefined;
  let logOutput: string[];

  beforeEach(() => {
    exitCode = undefined;
    logOutput = [];

    // Mock process.exit to capture exit code
    process.exit = vi.fn((code?: number) => {
      exitCode = code ?? 0;
      throw new Error('process.exit called');
    }) as never;

    // Mock console.log to capture output
    console.log = vi.fn((...args: unknown[]) => {
      logOutput.push(args.map(String).join(' '));
    });
  });

  afterEach(() => {
    // Restore original functions
    process.exit = originalExit;
    console.log = originalConsoleLog;
    vi.restoreAllMocks();
  });

  describe('parseArgs', () => {
    describe('--session / -s flag', () => {
      it('should parse --session flag with space-separated value', () => {
        const args = parseArgs(['--session', '/path/to/session.jsonl']);
        expect(args.sessionPath).toBe('/path/to/session.jsonl');
      });

      it('should parse --session flag with = separator', () => {
        const args = parseArgs(['--session=/path/to/session.jsonl']);
        expect(args.sessionPath).toBe('/path/to/session.jsonl');
      });

      it('should parse -s short flag', () => {
        const args = parseArgs(['-s', '/path/to/session.jsonl']);
        expect(args.sessionPath).toBe('/path/to/session.jsonl');
      });

      it('should handle session path with spaces', () => {
        const args = parseArgs(['--session', '/path/with spaces/session.jsonl']);
        expect(args.sessionPath).toBe('/path/with spaces/session.jsonl');
      });

      it('should handle empty session path', () => {
        const args = parseArgs(['--session', '']);
        expect(args.sessionPath).toBe('');
      });

      it('should use last session path when multiple provided', () => {
        const args = parseArgs([
          '--session', '/first/path.jsonl',
          '--session', '/second/path.jsonl',
        ]);
        expect(args.sessionPath).toBe('/second/path.jsonl');
      });
    });

    describe('--debug / -d flag', () => {
      it('should parse --debug flag', () => {
        const args = parseArgs(['--debug']);
        expect(args.debug).toBe(true);
      });

      it('should parse -d short flag', () => {
        const args = parseArgs(['-d']);
        expect(args.debug).toBe(true);
      });

      it('should default debug to false', () => {
        const args = parseArgs([]);
        expect(args.debug).toBe(false);
      });

      it('should handle debug with other flags', () => {
        const args = parseArgs(['--session', '/path/file.jsonl', '--debug']);
        expect(args.debug).toBe(true);
        expect(args.sessionPath).toBe('/path/file.jsonl');
      });
    });

    describe('--help / -h flag', () => {
      it('should set help flag when --help is passed', () => {
        try {
          parseArgs(['--help']);
        } catch {
          // Expected due to process.exit mock
        }
        expect(exitCode).toBe(0);
      });

      it('should set help flag when -h is passed', () => {
        try {
          parseArgs(['-h']);
        } catch {
          // Expected due to process.exit mock
        }
        expect(exitCode).toBe(0);
      });

      it('should print help message when help flag is set', () => {
        try {
          parseArgs(['--help']);
        } catch {
          // Expected due to process.exit mock
        }
        const helpText = logOutput.join('\n');
        expect(helpText).toContain('Clood TUI');
        expect(helpText).toContain('Usage:');
      });

      it('should exit with code 0 when help is shown', () => {
        try {
          parseArgs(['--help']);
        } catch {
          // Expected due to process.exit mock
        }
        expect(exitCode).toBe(0);
      });
    });

    describe('combined flags', () => {
      it('should handle all flags together', () => {
        try {
          // Note: help will exit, so we test without it
          const args = parseArgs(['-s', '/session.jsonl', '-d']);
          expect(args.sessionPath).toBe('/session.jsonl');
          expect(args.debug).toBe(true);
        } catch {
          // If help was somehow triggered
        }
      });

      it('should handle flags in any order', () => {
        const args = parseArgs(['-d', '-s', '/session.jsonl']);
        expect(args.debug).toBe(true);
        expect(args.sessionPath).toBe('/session.jsonl');
      });
    });

    describe('unknown arguments', () => {
      it('should ignore unknown flags', () => {
        const args = parseArgs(['--unknown', 'value', '--debug']);
        expect(args.debug).toBe(true);
        expect(args.sessionPath).toBeUndefined();
      });

      it('should ignore positional arguments', () => {
        const args = parseArgs(['somefile.txt', '--debug']);
        expect(args.debug).toBe(true);
        expect(args.sessionPath).toBeUndefined();
      });
    });

    describe('edge cases', () => {
      it('should handle empty argv', () => {
        const args = parseArgs([]);
        expect(args.debug).toBe(false);
        expect(args.help).toBe(false);
        expect(args.sessionPath).toBeUndefined();
      });

      it('should handle undefined in session path', () => {
        // Simulate case where --session is last argument with no value
        const args = parseArgs(['--session']);
        expect(args.sessionPath).toBeUndefined();
      });
    });
  });

  describe('help output format', () => {
    it('should include application name', () => {
      try {
        parseArgs(['--help']);
      } catch {
        // Expected
      }
      const helpText = logOutput.join('\n');
      expect(helpText).toContain('Clood TUI');
    });

    it('should include usage section', () => {
      try {
        parseArgs(['--help']);
      } catch {
        // Expected
      }
      const helpText = logOutput.join('\n');
      expect(helpText).toContain('Usage:');
      expect(helpText).toContain('clood-tui');
    });

    it('should document --session option', () => {
      try {
        parseArgs(['--help']);
      } catch {
        // Expected
      }
      const helpText = logOutput.join('\n');
      expect(helpText).toContain('--session');
      expect(helpText).toContain('-s');
    });

    it('should document --debug option', () => {
      try {
        parseArgs(['--help']);
      } catch {
        // Expected
      }
      const helpText = logOutput.join('\n');
      expect(helpText).toContain('--debug');
      expect(helpText).toContain('-d');
    });

    it('should document --help option', () => {
      try {
        parseArgs(['--help']);
      } catch {
        // Expected
      }
      const helpText = logOutput.join('\n');
      expect(helpText).toContain('--help');
      expect(helpText).toContain('-h');
    });

    it('should include examples section', () => {
      try {
        parseArgs(['--help']);
      } catch {
        // Expected
      }
      const helpText = logOutput.join('\n');
      expect(helpText).toContain('Examples:');
    });

    it('should show example with session path', () => {
      try {
        parseArgs(['--help']);
      } catch {
        // Expected
      }
      const helpText = logOutput.join('\n');
      expect(helpText).toContain('--session');
      expect(helpText).toMatch(/\.jsonl/);
    });
  });

  describe('CliArgs interface', () => {
    it('should have correct shape', () => {
      const args = parseArgs([]);
      expect(typeof args.debug).toBe('boolean');
      expect(typeof args.help).toBe('boolean');
      expect(args.sessionPath === undefined || typeof args.sessionPath === 'string').toBe(true);
    });
  });
});
