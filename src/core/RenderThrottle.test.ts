/**
 * Render Throttle Tests (UOW-0305)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { throttle, debounce, RenderScheduler } from './RenderThrottle.js';

describe('throttle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should execute immediately on first call (leading)', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, { minInterval: 100 });

    throttled('a');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('a');
  });

  it('should throttle subsequent calls', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, { minInterval: 100 });

    throttled('a');
    throttled('b');
    throttled('c');

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should execute trailing call after interval', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, { minInterval: 100 });

    throttled('a');
    throttled('b');

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenLastCalledWith('b');
  });

  it('should respect maxWait', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, { minInterval: 100, maxWait: 150 });

    throttled('a');
    vi.advanceTimersByTime(50);
    throttled('b');
    vi.advanceTimersByTime(50);
    throttled('c');
    vi.advanceTimersByTime(50);

    // maxWait should force execution
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should cancel pending execution', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, { minInterval: 100 });

    throttled('a');
    throttled('b');
    throttled.cancel();

    vi.advanceTimersByTime(200);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should flush pending execution', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, { minInterval: 100 });

    throttled('a');
    throttled('b');
    throttled.flush();

    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenLastCalledWith('b');
  });

  it('should report pending status', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, { minInterval: 100 });

    expect(throttled.pending()).toBe(false);
    throttled('a');
    throttled('b');
    expect(throttled.pending()).toBe(true);

    vi.advanceTimersByTime(100);
    expect(throttled.pending()).toBe(false);
  });
});

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should delay execution', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced('a');
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledWith('a');
  });

  it('should reset delay on subsequent calls', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced('a');
    vi.advanceTimersByTime(50);
    debounced('b');
    vi.advanceTimersByTime(50);
    debounced('c');
    vi.advanceTimersByTime(100);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('c');
  });

  it('should cancel pending execution', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced('a');
    debounced.cancel();
    vi.advanceTimersByTime(200);

    expect(fn).not.toHaveBeenCalled();
  });

  it('should flush immediately', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced('a');
    debounced.flush();

    expect(fn).toHaveBeenCalledWith('a');
  });
});

describe('RenderScheduler', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should schedule render at target fps', () => {
    const scheduler = new RenderScheduler(60);
    const callback = vi.fn();

    scheduler.scheduleRender(callback);
    expect(callback).not.toHaveBeenCalled();

    vi.advanceTimersByTime(17); // ~60fps = 16.67ms
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should coalesce multiple schedules', () => {
    const scheduler = new RenderScheduler(60);
    const callback1 = vi.fn();
    const callback2 = vi.fn();

    scheduler.scheduleRender(callback1);
    scheduler.scheduleRender(callback2);

    vi.advanceTimersByTime(17);
    expect(callback1).not.toHaveBeenCalled();
    expect(callback2).toHaveBeenCalledTimes(1);
  });

  it('should track frame count', () => {
    const scheduler = new RenderScheduler(60);

    expect(scheduler.getFrameCount()).toBe(0);

    scheduler.scheduleRender(() => {});
    vi.advanceTimersByTime(17);
    expect(scheduler.getFrameCount()).toBe(1);

    scheduler.scheduleRender(() => {});
    vi.advanceTimersByTime(17);
    expect(scheduler.getFrameCount()).toBe(2);
  });

  it('should cancel pending render', () => {
    const scheduler = new RenderScheduler(60);
    const callback = vi.fn();

    scheduler.scheduleRender(callback);
    scheduler.cancel();
    vi.advanceTimersByTime(100);

    expect(callback).not.toHaveBeenCalled();
  });

  it('should report pending status', () => {
    const scheduler = new RenderScheduler(60);

    expect(scheduler.isPending()).toBe(false);
    scheduler.scheduleRender(() => {});
    expect(scheduler.isPending()).toBe(true);

    vi.advanceTimersByTime(17);
    expect(scheduler.isPending()).toBe(false);
  });

  it('should allow changing fps', () => {
    const scheduler = new RenderScheduler(60);

    // Verify we can change fps
    scheduler.setFps(30); // 33.33ms per frame

    const callback = vi.fn();
    scheduler.scheduleRender(callback);

    // With 30 fps, frame time is ~33ms
    vi.advanceTimersByTime(35);
    expect(callback).toHaveBeenCalled();
  });
});
