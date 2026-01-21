/**
 * Event Stream Parser Tests
 *
 * Tests for JSON event parsing and validation.
 */

import { describe, it, expect } from 'vitest';
import {
  parseEvent,
  parseEvents,
  isMessageEvent,
  isStreamEvent,
  isTaskEvent,
  isDocumentEvent,
  isNotificationEvent,
  isUnknownEvent,
} from './EventStream.js';

describe('EventStream Parser', () => {
  describe('parseEvent', () => {
    it('should parse a valid message event', () => {
      const json = JSON.stringify({
        type: 'message',
        role: 'user',
        content: 'Hello, Claude!',
      });

      const event = parseEvent(json);

      expect(event).not.toBeNull();
      expect(isMessageEvent(event!)).toBe(true);
      if (isMessageEvent(event!)) {
        expect(event.role).toBe('user');
        expect(event.content).toBe('Hello, Claude!');
      }
    });

    it('should parse a valid assistant message event', () => {
      const json = JSON.stringify({
        type: 'message',
        id: 'msg-123',
        role: 'assistant',
        content: 'Hello! How can I help you?',
        timestamp: '2026-01-21T12:00:00Z',
      });

      const event = parseEvent(json);

      expect(event).not.toBeNull();
      expect(isMessageEvent(event!)).toBe(true);
      if (isMessageEvent(event!)) {
        expect(event.id).toBe('msg-123');
        expect(event.role).toBe('assistant');
      }
    });

    it('should parse a valid stream event', () => {
      const json = JSON.stringify({
        type: 'stream',
        messageId: 'msg-123',
        content: 'partial content',
        done: false,
      });

      const event = parseEvent(json);

      expect(event).not.toBeNull();
      expect(isStreamEvent(event!)).toBe(true);
      if (isStreamEvent(event!)) {
        expect(event.messageId).toBe('msg-123');
        expect(event.content).toBe('partial content');
        expect(event.done).toBe(false);
      }
    });

    it('should parse a valid task event', () => {
      const json = JSON.stringify({
        type: 'task',
        id: 'task-456',
        command: 'npm install',
        status: 'running',
      });

      const event = parseEvent(json);

      expect(event).not.toBeNull();
      expect(isTaskEvent(event!)).toBe(true);
      if (isTaskEvent(event!)) {
        expect(event.id).toBe('task-456');
        expect(event.status).toBe('running');
      }
    });

    it('should parse a valid document event', () => {
      const json = JSON.stringify({
        type: 'document',
        action: 'open',
        path: '/path/to/file.md',
        title: 'README',
        content: '# Hello World',
      });

      const event = parseEvent(json);

      expect(event).not.toBeNull();
      expect(isDocumentEvent(event!)).toBe(true);
      if (isDocumentEvent(event!)) {
        expect(event.action).toBe('open');
        expect(event.path).toBe('/path/to/file.md');
      }
    });

    it('should parse a valid notification event', () => {
      const json = JSON.stringify({
        type: 'notify',
        level: 'warning',
        message: 'Something happened',
      });

      const event = parseEvent(json);

      expect(event).not.toBeNull();
      expect(isNotificationEvent(event!)).toBe(true);
      if (isNotificationEvent(event!)) {
        expect(event.level).toBe('warning');
        expect(event.message).toBe('Something happened');
      }
    });

    it('should return null for empty lines', () => {
      expect(parseEvent('')).toBeNull();
      expect(parseEvent('   ')).toBeNull();
      expect(parseEvent('\n')).toBeNull();
    });

    it('should return null for invalid JSON', () => {
      expect(parseEvent('not json')).toBeNull();
      expect(parseEvent('{ invalid }')).toBeNull();
      expect(parseEvent('{incomplete')).toBeNull();
    });

    it('should return unknown event for unrecognized event types', () => {
      const json = JSON.stringify({
        type: 'custom_event',
        data: 'something',
      });

      const event = parseEvent(json);

      expect(event).not.toBeNull();
      expect(isUnknownEvent(event!)).toBe(true);
      if (isUnknownEvent(event!)) {
        expect(event.originalType).toBe('custom_event');
      }
    });

    it('should return unknown event for invalid schema', () => {
      const json = JSON.stringify({
        type: 'message',
        // Missing required 'role' and 'content' fields
      });

      const event = parseEvent(json);

      expect(event).not.toBeNull();
      expect(isUnknownEvent(event!)).toBe(true);
    });

    it('should handle very long content', () => {
      const longContent = 'x'.repeat(100000);
      const json = JSON.stringify({
        type: 'message',
        role: 'assistant',
        content: longContent,
      });

      const event = parseEvent(json);

      expect(event).not.toBeNull();
      expect(isMessageEvent(event!)).toBe(true);
      if (isMessageEvent(event!)) {
        expect(event.content.length).toBe(100000);
      }
    });
  });

  describe('parseEvents', () => {
    it('should parse multiple events from JSONL', () => {
      const jsonl = [
        JSON.stringify({ type: 'message', role: 'user', content: 'Hello' }),
        JSON.stringify({ type: 'message', role: 'assistant', content: 'Hi there!' }),
        JSON.stringify({ type: 'task', id: '1', status: 'running', command: 'build' }),
      ].join('\n');

      const events = parseEvents(jsonl);

      expect(events).toHaveLength(3);
      expect(isMessageEvent(events[0]!)).toBe(true);
      expect(isMessageEvent(events[1]!)).toBe(true);
      expect(isTaskEvent(events[2]!)).toBe(true);
    });

    it('should skip invalid lines in JSONL', () => {
      const jsonl = [
        JSON.stringify({ type: 'message', role: 'user', content: 'Hello' }),
        'invalid json line',
        JSON.stringify({ type: 'message', role: 'assistant', content: 'Hi!' }),
      ].join('\n');

      const events = parseEvents(jsonl);

      expect(events).toHaveLength(2);
    });

    it('should handle empty JSONL', () => {
      const events = parseEvents('');
      expect(events).toHaveLength(0);
    });

    it('should handle JSONL with only empty lines', () => {
      const events = parseEvents('\n\n\n');
      expect(events).toHaveLength(0);
    });
  });
});
