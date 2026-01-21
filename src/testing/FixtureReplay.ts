/**
 * Integration Test Fixture Replay (UOW-0111)
 *
 * Replays JSONL fixture files for integration testing.
 */

import { readFileSync, existsSync } from 'fs';
import { parseEvent, type ParsedEvent } from '../core/EventStream.js';

export interface ReplayOptions {
  /** Delay between events in ms (default: 0 for instant) */
  delay?: number;
  /** Skip invalid events (default: true) */
  skipInvalid?: boolean;
  /** Transform events before replay */
  transform?: (event: ParsedEvent) => ParsedEvent | null;
  /** Filter events */
  filter?: (event: ParsedEvent) => boolean;
}

export interface ReplayResult {
  events: ParsedEvent[];
  errors: ReplayError[];
  totalLines: number;
  validEvents: number;
  skippedEvents: number;
  duration: number;
}

export interface ReplayError {
  line: number;
  content: string;
  error: string;
}

export type EventHandler = (event: ParsedEvent, index: number) => void | Promise<void>;

/**
 * Load events from a fixture file
 */
export function loadFixture(path: string): ParsedEvent[] {
  if (!existsSync(path)) {
    throw new Error(`Fixture file not found: ${path}`);
  }

  const content = readFileSync(path, 'utf-8');
  const lines = content.split('\n').filter((line) => line.trim().length > 0);
  const events: ParsedEvent[] = [];

  for (const line of lines) {
    const event = parseEvent(line);
    if (event) {
      events.push(event);
    }
  }

  return events;
}

/**
 * Parse fixture content directly
 */
export function parseFixture(content: string): ParsedEvent[] {
  const lines = content.split('\n').filter((line) => line.trim().length > 0);
  const events: ParsedEvent[] = [];

  for (const line of lines) {
    const event = parseEvent(line);
    if (event) {
      events.push(event);
    }
  }

  return events;
}

/**
 * Replay events from a fixture file
 */
export async function replayFixture(
  path: string,
  handler: EventHandler,
  options: ReplayOptions = {}
): Promise<ReplayResult> {
  const { delay = 0, skipInvalid = true, transform, filter } = options;
  const startTime = Date.now();

  if (!existsSync(path)) {
    throw new Error(`Fixture file not found: ${path}`);
  }

  const content = readFileSync(path, 'utf-8');
  const lines = content.split('\n');

  const events: ParsedEvent[] = [];
  const errors: ReplayError[] = [];
  let skippedEvents = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.length === 0) continue;

    const event = parseEvent(line);

    if (!event) {
      if (skipInvalid) {
        skippedEvents++;
        continue;
      }
      errors.push({
        line: i + 1,
        content: line.slice(0, 100),
        error: 'Failed to parse event',
      });
      continue;
    }

    // Apply filter
    if (filter && !filter(event)) {
      skippedEvents++;
      continue;
    }

    // Apply transform
    let finalEvent = event;
    if (transform) {
      const transformed = transform(event);
      if (!transformed) {
        skippedEvents++;
        continue;
      }
      finalEvent = transformed;
    }

    events.push(finalEvent);

    // Call handler
    await handler(finalEvent, events.length - 1);

    // Apply delay
    if (delay > 0) {
      await sleep(delay);
    }
  }

  return {
    events,
    errors,
    totalLines: lines.length,
    validEvents: events.length,
    skippedEvents,
    duration: Date.now() - startTime,
  };
}

/**
 * Create a mock event emitter for testing
 */
export function createEventEmitter() {
  const handlers: Map<string, Set<(event: ParsedEvent) => void>> = new Map();

  return {
    on(eventType: string, handler: (event: ParsedEvent) => void) {
      if (!handlers.has(eventType)) {
        handlers.set(eventType, new Set());
      }
      handlers.get(eventType)!.add(handler);
      return () => handlers.get(eventType)?.delete(handler);
    },

    emit(event: ParsedEvent) {
      const typeHandlers = handlers.get(event.type);
      if (typeHandlers) {
        for (const handler of typeHandlers) {
          handler(event);
        }
      }
      // Also emit to '*' wildcard handlers
      const wildcardHandlers = handlers.get('*');
      if (wildcardHandlers) {
        for (const handler of wildcardHandlers) {
          handler(event);
        }
      }
    },

    clear() {
      handlers.clear();
    },
  };
}

/**
 * Create a fixture builder for tests
 */
export class FixtureBuilder {
  private events: object[] = [];

  message(id: string, role: 'user' | 'assistant', content: string): this {
    this.events.push({
      type: 'message',
      id,
      role,
      content,
      timestamp: new Date().toISOString(),
    });
    return this;
  }

  streamStart(id: string): this {
    this.events.push({
      type: 'stream',
      action: 'start',
      messageId: id,
    });
    return this;
  }

  streamDelta(id: string, delta: string): this {
    this.events.push({
      type: 'stream',
      action: 'delta',
      messageId: id,
      delta,
    });
    return this;
  }

  streamEnd(id: string): this {
    this.events.push({
      type: 'stream',
      action: 'end',
      messageId: id,
    });
    return this;
  }

  task(id: string, status: string, title: string, progress?: number): this {
    this.events.push({
      type: 'task',
      id,
      status,
      title,
      progress,
    });
    return this;
  }

  notification(level: string, message: string): this {
    this.events.push({
      type: 'notify', // matches NotificationEventSchema
      level,
      message,
    });
    return this;
  }

  toolCall(id: string, name: string, status: string): this {
    this.events.push({
      type: 'tool_call',
      id,
      name,
      status,
    });
    return this;
  }

  custom(event: object): this {
    this.events.push(event);
    return this;
  }

  toJsonl(): string {
    return this.events.map((e) => JSON.stringify(e)).join('\n');
  }

  toEvents(): ParsedEvent[] {
    return parseFixture(this.toJsonl());
  }

  build(): string {
    return this.toJsonl();
  }
}

/**
 * Assertion helpers for testing events
 */
export const eventMatchers = {
  hasEventType(events: ParsedEvent[], type: string): boolean {
    return events.some((e) => e.type === type);
  },

  countEventType(events: ParsedEvent[], type: string): number {
    return events.filter((e) => e.type === type).length;
  },

  findEvent(events: ParsedEvent[], predicate: (e: ParsedEvent) => boolean): ParsedEvent | undefined {
    return events.find(predicate);
  },

  filterEvents(events: ParsedEvent[], predicate: (e: ParsedEvent) => boolean): ParsedEvent[] {
    return events.filter(predicate);
  },

  getEventSequence(events: ParsedEvent[]): string[] {
    return events.map((e) => e.type);
  },
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
