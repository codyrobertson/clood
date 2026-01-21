/**
 * Event Stream Parser
 *
 * Parses incoming JSON Lines from Claude Code's event stream
 * and converts them to typed events.
 */

import {
  EventSchema,
  type AppEvent,
  type UnknownEvent,
  type MessageEvent,
  type StreamEvent,
  type TaskEvent,
  type DocumentEvent,
  type ToolCallEvent,
  type NotificationEvent,
  type ChartEvent,
  type HookEvent,
  type SessionEvent,
} from '../types/events.js';

export type ParsedEvent = AppEvent | UnknownEvent;

/**
 * Parse a single JSON line into a typed event.
 */
export function parseEvent(jsonLine: string): ParsedEvent | null {
  // Skip empty lines
  const trimmed = jsonLine.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const raw = JSON.parse(trimmed);

    // Validate against our schema
    const result = EventSchema.safeParse(raw);

    if (result.success) {
      return result.data;
    }

    // If validation fails but we have a type, return as unknown
    if (raw && typeof raw === 'object' && 'type' in raw) {
      return {
        type: 'unknown',
        originalType: String(raw.type),
        raw,
      } satisfies UnknownEvent;
    }

    // Completely unrecognized format
    return {
      type: 'unknown',
      originalType: 'invalid',
      raw,
    } satisfies UnknownEvent;
  } catch {
    // JSON parse error - return null
    return null;
  }
}

/**
 * Parse multiple JSON lines (batch processing).
 */
export function parseEvents(jsonLines: string): ParsedEvent[] {
  const events: ParsedEvent[] = [];

  for (const line of jsonLines.split('\n')) {
    const event = parseEvent(line);
    if (event) {
      events.push(event);
    }
  }

  return events;
}

/**
 * Type guards for event types
 */
export function isMessageEvent(event: ParsedEvent): event is MessageEvent {
  return event.type === 'message';
}

export function isStreamEvent(event: ParsedEvent): event is StreamEvent {
  return event.type === 'stream';
}

export function isTaskEvent(event: ParsedEvent): event is TaskEvent {
  return event.type === 'task';
}

export function isDocumentEvent(event: ParsedEvent): event is DocumentEvent {
  return event.type === 'document';
}

export function isToolCallEvent(event: ParsedEvent): event is ToolCallEvent {
  return event.type === 'tool_call';
}

export function isNotificationEvent(event: ParsedEvent): event is NotificationEvent {
  return event.type === 'notify';
}

export function isChartEvent(event: ParsedEvent): event is ChartEvent {
  return event.type === 'chart';
}

export function isHookEvent(event: ParsedEvent): event is HookEvent {
  return event.type === 'hook';
}

export function isSessionEvent(event: ParsedEvent): event is SessionEvent {
  return event.type === 'session';
}

export function isUnknownEvent(event: ParsedEvent): event is UnknownEvent {
  return event.type === 'unknown';
}
