/**
 * Event Buffer Tests (UOW-0111 partial)
 */

import { describe, it, expect, vi } from 'vitest';
import { EventBuffer } from './EventBuffer.js';
import type { MessageEvent } from '../types/events.js';

const createMockEvent = (id: number): MessageEvent => ({
  type: 'message',
  id: `msg-${id}`,
  role: 'user',
  content: `Message ${id}`,
});

describe('EventBuffer', () => {
  it('should buffer events up to max queue size', () => {
    const buffer = new EventBuffer({ maxQueueSize: 3 });

    buffer.push(createMockEvent(1));
    buffer.push(createMockEvent(2));
    buffer.push(createMockEvent(3));

    expect(buffer.size).toBe(3);
  });

  it('should drop oldest when queue is full with drop-oldest policy', () => {
    const onDrop = vi.fn();
    const buffer = new EventBuffer({
      maxQueueSize: 2,
      dropPolicy: 'drop-oldest',
      onDrop,
    });

    buffer.push(createMockEvent(1));
    buffer.push(createMockEvent(2));
    buffer.push(createMockEvent(3));

    expect(buffer.size).toBe(2);
    expect(onDrop).toHaveBeenCalledTimes(1);

    const event = buffer.tryTake();
    expect(event?.type).toBe('message');
    expect((event as MessageEvent).id).toBe('msg-2');
  });

  it('should drop newest when queue is full with drop-newest policy', () => {
    const onDrop = vi.fn();
    const buffer = new EventBuffer({
      maxQueueSize: 2,
      dropPolicy: 'drop-newest',
      onDrop,
    });

    buffer.push(createMockEvent(1));
    buffer.push(createMockEvent(2));
    const accepted = buffer.push(createMockEvent(3));

    expect(accepted).toBe(false);
    expect(buffer.size).toBe(2);
    expect(onDrop).toHaveBeenCalledTimes(1);
  });

  it('should return null from tryTake when empty', () => {
    const buffer = new EventBuffer();
    expect(buffer.tryTake()).toBeNull();
  });

  it('should track metrics correctly', () => {
    const buffer = new EventBuffer({ maxQueueSize: 2, dropPolicy: 'drop-oldest' });

    buffer.push(createMockEvent(1));
    buffer.push(createMockEvent(2));
    buffer.push(createMockEvent(3));

    const metrics = buffer.getMetrics();
    expect(metrics.totalReceived).toBe(3);
    expect(metrics.totalDropped).toBe(1);
    expect(metrics.currentQueueSize).toBe(2);
    expect(metrics.peakQueueSize).toBe(2);
  });

  it('should resolve waiting consumers immediately', async () => {
    const buffer = new EventBuffer();

    const takePromise = buffer.take();
    buffer.push(createMockEvent(1));

    const event = await takePromise;
    expect(event.type).toBe('message');
    expect(buffer.size).toBe(0);
  });

  it('should clear the queue', () => {
    const buffer = new EventBuffer();

    buffer.push(createMockEvent(1));
    buffer.push(createMockEvent(2));
    buffer.clear();

    expect(buffer.size).toBe(0);
  });
});
