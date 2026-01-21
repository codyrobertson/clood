/**
 * Fixture Replay Tests (UOW-0111)
 */

import { describe, it, expect, vi } from 'vitest';
import {
  parseFixture,
  FixtureBuilder,
  createEventEmitter,
  eventMatchers,
} from './FixtureReplay.js';

describe('FixtureReplay', () => {
  describe('parseFixture', () => {
    it('should parse JSONL content', () => {
      const content = `{"type":"message","id":"1","role":"user","content":"Hello"}
{"type":"message","id":"2","role":"assistant","content":"Hi there"}`;

      const events = parseFixture(content);
      expect(events).toHaveLength(2);
      expect(events[0].type).toBe('message');
      expect(events[1].type).toBe('message');
    });

    it('should skip empty lines', () => {
      const content = `{"type":"message","id":"1","role":"user","content":"Hello"}

{"type":"message","id":"2","role":"assistant","content":"Hi"}`;

      const events = parseFixture(content);
      expect(events).toHaveLength(2);
    });

    it('should skip invalid JSON', () => {
      const content = `{"type":"message","id":"1"}
not valid json
{"type":"notification","level":"info","message":"test"}`;

      const events = parseFixture(content);
      expect(events).toHaveLength(2);
    });
  });

  describe('FixtureBuilder', () => {
    it('should build message events', () => {
      const builder = new FixtureBuilder();
      builder.message('msg-1', 'user', 'Hello');
      builder.message('msg-2', 'assistant', 'Hi there');

      const events = builder.toEvents();
      expect(events).toHaveLength(2);
      expect(events[0].type).toBe('message');
    });

    it('should build stream events', () => {
      const builder = new FixtureBuilder();
      builder.streamStart('msg-1');
      builder.streamDelta('msg-1', 'Hello ');
      builder.streamDelta('msg-1', 'World');
      builder.streamEnd('msg-1');

      const events = builder.toEvents();
      expect(events).toHaveLength(4);
    });

    it('should build task events', () => {
      const builder = new FixtureBuilder();
      builder.task('task-1', 'running', 'Processing', 50);

      const events = builder.toEvents();
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('task');
    });

    it('should build notification events', () => {
      const builder = new FixtureBuilder();
      builder.notification('info', 'Test notification');

      const events = builder.toEvents();
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('notify');
    });

    it('should build tool call events', () => {
      const builder = new FixtureBuilder();
      builder.toolCall('tool-1', 'read_file', 'running');

      const events = builder.toEvents();
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('tool_call');
    });

    it('should output JSONL format', () => {
      const builder = new FixtureBuilder();
      builder.message('1', 'user', 'Hi');

      const jsonl = builder.toJsonl();
      const lines = jsonl.split('\n');
      expect(lines).toHaveLength(1);

      const parsed = JSON.parse(lines[0]);
      expect(parsed.type).toBe('message');
    });

    it('should support chaining', () => {
      const events = new FixtureBuilder()
        .message('1', 'user', 'Hello')
        .message('2', 'assistant', 'Hi')
        .notification('info', 'Done')
        .toEvents();

      expect(events).toHaveLength(3);
    });

    it('should support custom events', () => {
      const events = new FixtureBuilder()
        .custom({ type: 'custom', data: 'test' })
        .toEvents();

      expect(events).toHaveLength(1);
    });
  });

  describe('createEventEmitter', () => {
    it('should emit events to handlers', () => {
      const emitter = createEventEmitter();
      const handler = vi.fn();

      emitter.on('message', handler);
      emitter.emit({ type: 'message', id: '1', role: 'user', content: 'test' } as any);

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should support wildcard handlers', () => {
      const emitter = createEventEmitter();
      const handler = vi.fn();

      emitter.on('*', handler);
      emitter.emit({ type: 'message' } as any);
      emitter.emit({ type: 'task' } as any);

      expect(handler).toHaveBeenCalledTimes(2);
    });

    it('should support unsubscribe', () => {
      const emitter = createEventEmitter();
      const handler = vi.fn();

      const unsub = emitter.on('message', handler);
      unsub();

      emitter.emit({ type: 'message' } as any);
      expect(handler).not.toHaveBeenCalled();
    });

    it('should clear all handlers', () => {
      const emitter = createEventEmitter();
      const handler = vi.fn();

      emitter.on('message', handler);
      emitter.clear();
      emitter.emit({ type: 'message' } as any);

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('eventMatchers', () => {
    const events = new FixtureBuilder()
      .message('1', 'user', 'Hello')
      .message('2', 'assistant', 'Hi')
      .task('t1', 'running', 'Test')
      .notification('info', 'Done')
      .toEvents();

    it('should check if event type exists', () => {
      expect(eventMatchers.hasEventType(events, 'message')).toBe(true);
      expect(eventMatchers.hasEventType(events, 'notify')).toBe(true);
      expect(eventMatchers.hasEventType(events, 'nonexistent')).toBe(false);
    });

    it('should count event types', () => {
      expect(eventMatchers.countEventType(events, 'message')).toBe(2);
      expect(eventMatchers.countEventType(events, 'task')).toBe(1);
      expect(eventMatchers.countEventType(events, 'notify')).toBe(1);
      expect(eventMatchers.countEventType(events, 'nonexistent')).toBe(0);
    });

    it('should find event by predicate', () => {
      const found = eventMatchers.findEvent(events, (e) => e.type === 'task');
      expect(found).toBeDefined();
      expect(found?.type).toBe('task');
    });

    it('should filter events', () => {
      const filtered = eventMatchers.filterEvents(events, (e) => e.type === 'message');
      expect(filtered).toHaveLength(2);
    });

    it('should get event sequence', () => {
      const sequence = eventMatchers.getEventSequence(events);
      expect(sequence).toEqual(['message', 'message', 'task', 'notify']);
    });
  });
});
