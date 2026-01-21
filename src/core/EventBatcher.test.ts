/**
 * Event Batcher Tests (UOW-0306)
 *
 * Tests for the EventBatcher microtask queue pattern implementation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  EventBatcher,
  StateUpdateBatcher,
  createEventBatcher,
  createStateUpdateBatcher,
  getEventBatcher,
  resetEventBatcher,
  type BatchedEvent,
} from './EventBatcher.js';

describe('EventBatcher', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetEventBatcher();
  });

  afterEach(() => {
    vi.useRealTimers();
    resetEventBatcher();
  });

  describe('basic batching', () => {
    it('should batch events and deliver via microtask', async () => {
      const batcher = new EventBatcher<string>();
      const events: BatchedEvent<string>[] = [];

      batcher.onFlush((batch) => {
        events.push(...batch);
      });

      // Use unique keys to prevent coalescing
      batcher.add('test', 'payload1', 'key1');
      batcher.add('test', 'payload2', 'key2');
      batcher.add('test', 'payload3', 'key3');

      // Events not yet delivered (waiting for microtask)
      expect(events.length).toBe(0);

      // Flush microtask queue
      await vi.runAllTimersAsync();

      expect(events.length).toBe(3);
    });

    it('should coalesce events with same key', async () => {
      const batcher = new EventBatcher<{ value: number }>();
      const events: BatchedEvent<{ value: number }>[] = [];

      batcher.onFlush((batch) => {
        events.push(...batch);
      });

      batcher.add('counter', { value: 1 }, 'counter-key');
      batcher.add('counter', { value: 2 }, 'counter-key');
      batcher.add('counter', { value: 3 }, 'counter-key');

      await vi.runAllTimersAsync();

      // Should be coalesced into one event
      expect(events.length).toBe(1);
      expect(events[0].payload.value).toBe(3);
      expect(events[0].coalesced).toBe(2);
    });

    it('should not coalesce events with different keys', async () => {
      const batcher = new EventBatcher<string>();
      const events: BatchedEvent<string>[] = [];

      batcher.onFlush((batch) => {
        events.push(...batch);
      });

      batcher.add('type', 'a', 'key-1');
      batcher.add('type', 'b', 'key-2');
      batcher.add('type', 'c', 'key-3');

      await vi.runAllTimersAsync();

      expect(events.length).toBe(3);
    });

    it('should use type as key when no key provided', async () => {
      const batcher = new EventBatcher<string>();
      const events: BatchedEvent<string>[] = [];

      batcher.onFlush((batch) => {
        events.push(...batch);
      });

      batcher.add('scroll', 'a');
      batcher.add('scroll', 'b');
      batcher.add('click', 'c');

      await vi.runAllTimersAsync();

      // scroll events coalesced, click separate
      expect(events.length).toBe(2);
    });
  });

  describe('manual flush', () => {
    it('should flush immediately when called', () => {
      const batcher = new EventBatcher<string>();
      const events: BatchedEvent<string>[] = [];

      batcher.onFlush((batch) => {
        events.push(...batch);
      });

      batcher.add('test', 'payload');
      batcher.flush();

      expect(events.length).toBe(1);
    });

    it('should clear pending flush after manual flush', async () => {
      const batcher = new EventBatcher<string>();
      let flushCount = 0;

      batcher.onFlush(() => {
        flushCount++;
      });

      batcher.add('test', 'payload');
      batcher.flush();

      await vi.runAllTimersAsync();

      // Should only flush once
      expect(flushCount).toBe(1);
    });
  });

  describe('max batch size', () => {
    it('should auto-flush when max batch size reached', () => {
      const batcher = new EventBatcher<string>({ maxBatchSize: 3 });
      const events: BatchedEvent<string>[] = [];

      batcher.onFlush((batch) => {
        events.push(...batch);
      });

      batcher.add('type', 'a', 'key-1');
      batcher.add('type', 'b', 'key-2');
      expect(events.length).toBe(0);

      batcher.add('type', 'c', 'key-3');
      expect(events.length).toBe(3);
    });
  });

  describe('immediate event types', () => {
    it('should bypass batching for immediate event types', () => {
      const batcher = new EventBatcher<string>({
        immediateEventTypes: ['error', 'critical'],
      });
      const events: BatchedEvent<string>[] = [];

      batcher.onFlush((batch) => {
        events.push(...batch);
      });

      batcher.add('error', 'error payload');
      expect(events.length).toBe(1);

      batcher.add('normal', 'normal payload');
      expect(events.length).toBe(1); // Still 1 (normal is batched)
    });
  });

  describe('pause and resume', () => {
    it('should buffer events when paused', async () => {
      const batcher = new EventBatcher<string>();
      const events: BatchedEvent<string>[] = [];

      batcher.onFlush((batch) => {
        events.push(...batch);
      });

      batcher.pause();
      batcher.add('test', 'a');
      batcher.add('test', 'b', 'key-b');

      await vi.runAllTimersAsync();
      expect(events.length).toBe(0);

      batcher.resume();
      expect(events.length).toBe(2);
    });

    it('should report paused status', () => {
      const batcher = new EventBatcher<string>();

      expect(batcher.isPaused()).toBe(false);
      batcher.pause();
      expect(batcher.isPaused()).toBe(true);
      batcher.resume();
      expect(batcher.isPaused()).toBe(false);
    });
  });

  describe('custom coalescing', () => {
    it('should use custom coalesce function', async () => {
      const batcher = new EventBatcher<number[]>({
        coalesceEvents: (existing, incoming) => [...existing, ...incoming],
      });
      const events: BatchedEvent<number[]>[] = [];

      batcher.onFlush((batch) => {
        events.push(...batch);
      });

      batcher.add('array', [1], 'arr');
      batcher.add('array', [2], 'arr');
      batcher.add('array', [3], 'arr');

      await vi.runAllTimersAsync();

      expect(events.length).toBe(1);
      expect(events[0].payload).toEqual([1, 2, 3]);
    });
  });

  describe('handlers', () => {
    it('should support multiple handlers', async () => {
      const batcher = new EventBatcher<string>();
      let handler1Called = false;
      let handler2Called = false;

      batcher.onFlush(() => {
        handler1Called = true;
      });
      batcher.onFlush(() => {
        handler2Called = true;
      });

      batcher.add('test', 'payload');
      await vi.runAllTimersAsync();

      expect(handler1Called).toBe(true);
      expect(handler2Called).toBe(true);
    });

    it('should remove handler when unsubscribe called', async () => {
      const batcher = new EventBatcher<string>();
      let called = false;

      const unsubscribe = batcher.onFlush(() => {
        called = true;
      });
      unsubscribe();

      batcher.add('test', 'payload');
      await vi.runAllTimersAsync();

      expect(called).toBe(false);
    });

    it('should clear all handlers', async () => {
      const batcher = new EventBatcher<string>();
      let called = false;

      batcher.onFlush(() => {
        called = true;
      });
      batcher.clearHandlers();

      batcher.add('test', 'payload');
      await vi.runAllTimersAsync();

      expect(called).toBe(false);
    });

    it('should continue on handler error', async () => {
      const batcher = new EventBatcher<string>();
      let handler2Called = false;

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      batcher.onFlush(() => {
        throw new Error('Handler error');
      });
      batcher.onFlush(() => {
        handler2Called = true;
      });

      batcher.add('test', 'payload');
      await vi.runAllTimersAsync();

      expect(handler2Called).toBe(true);
      consoleSpy.mockRestore();
    });
  });

  describe('statistics', () => {
    it('should track events received', async () => {
      const batcher = new EventBatcher<string>({ trackStats: true });

      batcher.add('type', 'a');
      batcher.add('type', 'b');
      batcher.add('type', 'c');

      await vi.runAllTimersAsync();

      const stats = batcher.getStats();
      expect(stats.eventsReceived).toBe(3);
    });

    it('should track events coalesced', async () => {
      const batcher = new EventBatcher<string>({ trackStats: true });

      batcher.add('type', 'a', 'key');
      batcher.add('type', 'b', 'key');
      batcher.add('type', 'c', 'key');

      await vi.runAllTimersAsync();

      const stats = batcher.getStats();
      expect(stats.eventsCoalesced).toBe(2);
    });

    it('should track batches flushed', async () => {
      const batcher = new EventBatcher<string>({ trackStats: true });

      batcher.add('type', 'a', 'key-1');
      await vi.runAllTimersAsync();

      batcher.add('type', 'b', 'key-2');
      await vi.runAllTimersAsync();

      const stats = batcher.getStats();
      expect(stats.batchesFlushed).toBe(2);
    });

    it('should track events bypassed', () => {
      const batcher = new EventBatcher<string>({
        trackStats: true,
        immediateEventTypes: ['immediate'],
      });
      batcher.onFlush(() => {});

      batcher.add('immediate', 'payload');

      const stats = batcher.getStats();
      expect(stats.eventsBypassed).toBe(1);
    });

    it('should reset statistics', async () => {
      const batcher = new EventBatcher<string>({ trackStats: true });

      batcher.add('type', 'a');
      await vi.runAllTimersAsync();

      batcher.resetStats();
      const stats = batcher.getStats();

      expect(stats.eventsReceived).toBe(0);
      expect(stats.batchesFlushed).toBe(0);
    });
  });

  describe('clear and destroy', () => {
    it('should clear pending events', async () => {
      const batcher = new EventBatcher<string>();
      const events: BatchedEvent<string>[] = [];

      batcher.onFlush((batch) => {
        events.push(...batch);
      });

      batcher.add('type', 'a');
      batcher.add('type', 'b', 'key-b');
      batcher.clear();

      await vi.runAllTimersAsync();

      expect(events.length).toBe(0);
    });

    it('should destroy and flush remaining', async () => {
      const batcher = new EventBatcher<string>();
      const events: BatchedEvent<string>[] = [];

      batcher.onFlush((batch) => {
        events.push(...batch);
      });

      batcher.add('type', 'a');
      batcher.destroy();

      expect(events.length).toBe(1);
    });
  });

  describe('global batcher', () => {
    it('should create and reuse global instance', () => {
      const batcher1 = getEventBatcher();
      const batcher2 = getEventBatcher();

      expect(batcher1).toBe(batcher2);
    });

    it('should reset global instance', () => {
      const batcher1 = getEventBatcher();
      resetEventBatcher();
      const batcher2 = getEventBatcher();

      expect(batcher1).not.toBe(batcher2);
    });
  });

  describe('factory functions', () => {
    it('should create batcher via factory', () => {
      const batcher = createEventBatcher<string>({ maxBatchSize: 50 });
      expect(batcher).toBeInstanceOf(EventBatcher);
    });
  });
});

describe('StateUpdateBatcher', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should batch state updates', async () => {
    interface TestState {
      count: number;
      name: string;
    }

    const batcher = new StateUpdateBatcher<TestState>({
      count: 0,
      name: '',
    });

    let lastState: TestState | null = null;
    batcher.onStateUpdate((state) => {
      lastState = state;
    });

    batcher.update({ count: 1 });
    batcher.update({ count: 2 });
    batcher.update({ name: 'test' });

    await vi.runAllTimersAsync();

    expect(lastState).toEqual({ count: 2, name: 'test' });
  });

  it('should get current state', async () => {
    const batcher = new StateUpdateBatcher({ value: 0 });

    batcher.update({ value: 42 });
    await vi.runAllTimersAsync();

    expect(batcher.getState()).toEqual({ value: 42 });
  });

  it('should force flush updates', () => {
    const batcher = new StateUpdateBatcher({ value: 0 });
    let lastState: { value: number } | null = null;

    batcher.onStateUpdate((state) => {
      lastState = state;
    });

    batcher.update({ value: 100 });
    batcher.flush();

    expect(lastState).toEqual({ value: 100 });
  });

  it('should unsubscribe from updates', async () => {
    const batcher = new StateUpdateBatcher({ value: 0 });
    let called = false;

    const unsubscribe = batcher.onStateUpdate(() => {
      called = true;
    });
    unsubscribe();

    batcher.update({ value: 1 });
    await vi.runAllTimersAsync();

    expect(called).toBe(false);
  });

  it('should create via factory', () => {
    const batcher = createStateUpdateBatcher({ x: 0, y: 0 });
    expect(batcher).toBeInstanceOf(StateUpdateBatcher);
  });

  it('should provide access to underlying batcher', () => {
    const batcher = new StateUpdateBatcher({ value: 0 });
    expect(batcher.getBatcher()).toBeInstanceOf(EventBatcher);
  });
});

describe('EventBatcher stress tests', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should handle 10k events efficiently', async () => {
    const batcher = new EventBatcher<number>({ maxBatchSize: 10000 });
    const received: number[] = [];

    batcher.onFlush((events) => {
      for (const event of events) {
        received.push(event.payload);
      }
    });

    // Add 10k events with unique keys
    for (let i = 0; i < 10000; i++) {
      batcher.add('event', i, `key-${i}`);
    }

    await vi.runAllTimersAsync();

    expect(received.length).toBe(10000);
  });

  it('should coalesce 10k events to single key efficiently', async () => {
    const batcher = new EventBatcher<number>();
    let finalValue: number | null = null;

    batcher.onFlush((events) => {
      for (const event of events) {
        finalValue = event.payload;
      }
    });

    // All events with same key - should coalesce
    for (let i = 0; i < 10000; i++) {
      batcher.add('counter', i, 'counter');
    }

    await vi.runAllTimersAsync();

    // Should have coalesced to single event with last value
    expect(finalValue).toBe(9999);

    const stats = batcher.getStats();
    expect(stats.eventsCoalesced).toBe(9999);
    expect(stats.eventsDelivered).toBe(1);
  });

  it('should handle rapid add/flush cycles', () => {
    const batcher = new EventBatcher<number>();
    let totalReceived = 0;

    batcher.onFlush((events) => {
      totalReceived += events.length;
    });

    for (let cycle = 0; cycle < 1000; cycle++) {
      for (let i = 0; i < 10; i++) {
        batcher.add('event', i, `key-${cycle}-${i}`);
      }
      batcher.flush();
    }

    expect(totalReceived).toBe(10000);
  });

  it('should handle mixed immediate and batched events', async () => {
    const batcher = new EventBatcher<string>({
      immediateEventTypes: ['critical'],
    });

    let immediateCount = 0;
    let batchedCount = 0;

    batcher.onFlush((events) => {
      for (const event of events) {
        if (event.type === 'critical') {
          immediateCount++;
        } else {
          batchedCount++;
        }
      }
    });

    // Mix of immediate and batched
    for (let i = 0; i < 1000; i++) {
      if (i % 10 === 0) {
        batcher.add('critical', 'urgent');
      } else {
        batcher.add('normal', 'regular', `key-${i}`);
      }
    }

    await vi.runAllTimersAsync();

    expect(immediateCount).toBe(100);
    expect(batchedCount).toBe(900);
  });
});
