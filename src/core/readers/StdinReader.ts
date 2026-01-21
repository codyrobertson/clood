/**
 * Stdin JSONL Reader
 *
 * Reads JSON Lines from stdin, parsing each line as it arrives.
 * Provides an async iterator interface for consuming events.
 */

import * as readline from 'readline';
import { parseEvent, type ParsedEvent } from '../EventStream.js';

export interface StdinReaderOptions {
  /** Maximum buffer size for a single line (default: 10MB) */
  maxLineLength?: number;
  /** Whether to emit debug events (default: false) */
  debug?: boolean;
}

/**
 * Creates an async iterator that reads JSONL from stdin.
 */
export async function* createStdinReader(
  options: StdinReaderOptions = {}
): AsyncGenerator<ParsedEvent, void, undefined> {
  const { maxLineLength = 10 * 1024 * 1024, debug = false } = options;

  const rl = readline.createInterface({
    input: process.stdin,
    crlfDelay: Infinity,
    terminal: false,
  });

  const lineQueue: string[] = [];
  let resolveNext: ((value: IteratorResult<string, void>) => void) | null = null;
  let closed = false;

  rl.on('line', (line) => {
    // Check line length
    if (line.length > maxLineLength) {
      if (debug) {
        console.error(`[StdinReader] Line exceeds max length (${line.length}), truncating`);
      }
      line = line.slice(0, maxLineLength);
    }

    if (resolveNext) {
      const resolve = resolveNext;
      resolveNext = null;
      resolve({ value: line, done: false });
    } else {
      lineQueue.push(line);
    }
  });

  rl.on('close', () => {
    closed = true;
    if (resolveNext) {
      const resolve = resolveNext;
      resolveNext = null;
      resolve({ value: undefined, done: true });
    }
  });

  rl.on('error', (err) => {
    if (debug) {
      console.error(`[StdinReader] Error: ${err.message}`);
    }
    closed = true;
    if (resolveNext) {
      const resolve = resolveNext;
      resolveNext = null;
      resolve({ value: undefined, done: true });
    }
  });

  // Async iteration
  while (!closed || lineQueue.length > 0) {
    let line: string;

    if (lineQueue.length > 0) {
      line = lineQueue.shift()!;
    } else if (closed) {
      break;
    } else {
      // Wait for next line
      const result = await new Promise<IteratorResult<string, void>>((resolve) => {
        resolveNext = resolve;
      });

      if (result.done) {
        break;
      }
      line = result.value;
    }

    // Parse the line
    const event = parseEvent(line);
    if (event) {
      yield event;
    } else if (debug && line.trim()) {
      console.error(`[StdinReader] Failed to parse line: ${line.slice(0, 100)}`);
    }
  }
}

/**
 * Utility to read all events from stdin into an array.
 * Useful for testing and batch processing.
 */
export async function readAllFromStdin(
  options: StdinReaderOptions = {}
): Promise<ParsedEvent[]> {
  const events: ParsedEvent[] = [];

  for await (const event of createStdinReader(options)) {
    events.push(event);
  }

  return events;
}
