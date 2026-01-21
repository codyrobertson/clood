/**
 * File JSONL Reader
 *
 * Reads JSON Lines from a file, supporting both one-shot reading
 * and file tailing with rotation handling.
 */

import * as fs from 'fs';
import * as readline from 'readline';
import { watch } from 'chokidar';
import { parseEvent, type ParsedEvent } from '../EventStream.js';

export interface FileReaderOptions {
  /** Start reading from the end of the file (for tailing) */
  fromEnd?: boolean;
  /** Follow file changes (tail -f behavior) */
  follow?: boolean;
  /** Maximum buffer size for a single line (default: 10MB) */
  maxLineLength?: number;
  /** Whether to emit debug events (default: false) */
  debug?: boolean;
}

/**
 * Read all events from a JSONL file (one-shot).
 */
export async function readFileEvents(
  filePath: string,
  options: FileReaderOptions = {}
): Promise<ParsedEvent[]> {
  const { maxLineLength = 10 * 1024 * 1024, debug = false } = options;

  if (!fs.existsSync(filePath)) {
    if (debug) {
      console.error(`[FileReader] File not found: ${filePath}`);
    }
    return [];
  }

  const events: ParsedEvent[] = [];
  const fileStream = fs.createReadStream(filePath);

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  for await (let line of rl) {
    if (line.length > maxLineLength) {
      line = line.slice(0, maxLineLength);
    }

    const event = parseEvent(line);
    if (event) {
      events.push(event);
    }
  }

  return events;
}

/**
 * Creates a file tailing reader that yields events as they are appended.
 */
export async function* createFileTailReader(
  filePath: string,
  options: FileReaderOptions = {}
): AsyncGenerator<ParsedEvent, void, undefined> {
  const {
    fromEnd = false,
    maxLineLength = 10 * 1024 * 1024,
    debug = false,
  } = options;

  if (!fs.existsSync(filePath)) {
    if (debug) {
      console.error(`[FileReader] File not found: ${filePath}`);
    }
    return;
  }

  let position = fromEnd ? fs.statSync(filePath).size : 0;
  let buffer = '';

  const readNewContent = (): ParsedEvent[] => {
    const events: ParsedEvent[] = [];

    try {
      const stats = fs.statSync(filePath);
      const currentSize = stats.size;

      if (currentSize < position) {
        // File was truncated, start from beginning
        position = 0;
        buffer = '';
      }

      if (currentSize > position) {
        const fd = fs.openSync(filePath, 'r');
        const readBuffer = Buffer.alloc(currentSize - position);
        fs.readSync(fd, readBuffer, 0, readBuffer.length, position);
        fs.closeSync(fd);

        position = currentSize;
        buffer += readBuffer.toString('utf-8');

        // Process complete lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (let line of lines) {
          if (line.length > maxLineLength) {
            line = line.slice(0, maxLineLength);
          }

          const event = parseEvent(line);
          if (event) {
            events.push(event);
          }
        }
      }
    } catch (error) {
      if (debug) {
        console.error(`[FileReader] Error reading file: ${error}`);
      }
    }

    return events;
  };

  // Initial read
  for (const event of readNewContent()) {
    yield event;
  }

  // Watch for changes
  const eventQueue: ParsedEvent[] = [];
  let resolveNext: ((value: IteratorResult<ParsedEvent, void>) => void) | null = null;
  let closed = false;

  const watcher = watch(filePath, {
    persistent: true,
    usePolling: false,
    awaitWriteFinish: {
      stabilityThreshold: 100,
      pollInterval: 50,
    },
  });

  watcher.on('change', () => {
    const newEvents = readNewContent();

    for (const event of newEvents) {
      if (resolveNext) {
        const resolve = resolveNext;
        resolveNext = null;
        resolve({ value: event, done: false });
      } else {
        eventQueue.push(event);
      }
    }
  });

  watcher.on('unlink', () => {
    if (debug) {
      console.error(`[FileReader] File deleted: ${filePath}`);
    }
    closed = true;
    if (resolveNext) {
      const resolve = resolveNext;
      resolveNext = null;
      // Signal completion
      resolve({ done: true, value: undefined } as IteratorResult<ParsedEvent, void>);
    }
  });

  // Yield events as they arrive
  try {
    while (!closed) {
      if (eventQueue.length > 0) {
        yield eventQueue.shift()!;
      } else {
        const result = await new Promise<IteratorResult<ParsedEvent, void>>((resolve) => {
          resolveNext = resolve;
        });

        if (result.done) {
          break;
        }
        yield result.value;
      }
    }
  } finally {
    await watcher.close();
  }
}
