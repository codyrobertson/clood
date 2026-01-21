/**
 * Event Sink Tests (UOW-1002)
 *
 * Tests for the event sink implementations.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  StdoutEventSink,
  CallbackEventSink,
  BufferEventSink,
  CompositeEventSink,
  createEventSink,
  getDefaultEventSink,
  setDefaultEventSink,
  emitEvent,
  type IEventSink,
} from './EventSink.js';
import { UIEvent, createUIEvent } from './UIEvent.js';

describe('EventSink', () => {
  describe('StdoutEventSink', () => {
    let stdoutWriteSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      stdoutWriteSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    });

    afterEach(() => {
      stdoutWriteSpy.mockRestore();
    });

    it('should emit event to stdout', () => {
      const sink = new StdoutEventSink();
      const event = createUIEvent('user_input', { input: 'test' });

      sink.emit(event);

      expect(stdoutWriteSpy).toHaveBeenCalledTimes(1);
      const output = stdoutWriteSpy.mock.calls[0]![0] as string;
      expect(output).toContain('"eventType":"user_input"');
      expect(output.endsWith('\n')).toBe(true);
    });

    it('should track statistics', () => {
      const sink = new StdoutEventSink();
      const event = createUIEvent('lifecycle', { event: 'ready' });

      sink.emit(event);
      sink.emit(event);

      const stats = sink.getStats();
      expect(stats.eventsEmitted).toBe(2);
      expect(stats.bytesWritten).toBeGreaterThan(0);
      expect(stats.lastEmitTime).not.toBeNull();
    });

    it('should not emit after close', () => {
      const sink = new StdoutEventSink();
      const event = createUIEvent('lifecycle', { event: 'ready' });

      sink.close();
      sink.emit(event);

      expect(stdoutWriteSpy).not.toHaveBeenCalled();
    });

    it('should support pretty print option', () => {
      const sink = new StdoutEventSink({ prettyPrint: true });
      const event = createUIEvent('user_input', { input: 'test' });

      sink.emit(event);

      const output = stdoutWriteSpy.mock.calls[0]![0] as string;
      expect(output).toContain('\n  '); // Indentation from pretty print
    });

    it('should support prefix option', () => {
      const sink = new StdoutEventSink({ prefix: 'EVENT: ' });
      const event = createUIEvent('user_input', { input: 'test' });

      sink.emit(event);

      const output = stdoutWriteSpy.mock.calls[0]![0] as string;
      expect(output.startsWith('EVENT: ')).toBe(true);
    });

    it('should support disabling newline delimiter', () => {
      const sink = new StdoutEventSink({ newlineDelimited: false });
      const event = createUIEvent('user_input', { input: 'test' });

      sink.emit(event);

      const output = stdoutWriteSpy.mock.calls[0]![0] as string;
      expect(output.endsWith('\n')).toBe(false);
    });

    it('should call error handler on error', () => {
      const errorHandler = vi.fn();
      const sink = new StdoutEventSink({ onError: errorHandler });

      // Force an error by making stdout.write throw
      stdoutWriteSpy.mockImplementation(() => {
        throw new Error('Write error');
      });

      const event = createUIEvent('user_input', { input: 'test' });
      sink.emit(event);

      expect(errorHandler).toHaveBeenCalledTimes(1);
      expect(errorHandler).toHaveBeenCalledWith(expect.any(Error), event);
    });
  });

  describe('CallbackEventSink', () => {
    it('should call callback with event', () => {
      const callback = vi.fn();
      const sink = new CallbackEventSink(callback);
      const event = createUIEvent('button_click', { buttonId: 'btn-1' });

      sink.emit(event);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(event);
    });

    it('should track statistics', () => {
      const callback = vi.fn();
      const sink = new CallbackEventSink(callback);
      const event = createUIEvent('lifecycle', { event: 'ready' });

      sink.emit(event);
      sink.emit(event);
      sink.emit(event);

      const stats = sink.getStats();
      expect(stats.eventsEmitted).toBe(3);
    });

    it('should not emit after close', () => {
      const callback = vi.fn();
      const sink = new CallbackEventSink(callback);
      const event = createUIEvent('lifecycle', { event: 'ready' });

      sink.close();
      sink.emit(event);

      expect(callback).not.toHaveBeenCalled();
    });

    it('should handle callback errors', () => {
      const errorHandler = vi.fn();
      const callback = vi.fn().mockImplementation(() => {
        throw new Error('Callback error');
      });
      const sink = new CallbackEventSink(callback, { onError: errorHandler });
      const event = createUIEvent('user_input', { input: 'test' });

      sink.emit(event);

      expect(errorHandler).toHaveBeenCalledTimes(1);
      const stats = sink.getStats();
      expect(stats.errors).toBe(1);
    });
  });

  describe('BufferEventSink', () => {
    it('should buffer events', () => {
      const sink = new BufferEventSink();
      const event1 = createUIEvent('user_input', { input: 'test1' });
      const event2 = createUIEvent('user_input', { input: 'test2' });

      sink.emit(event1);
      sink.emit(event2);

      expect(sink.getBufferSize()).toBe(2);
      const buffer = sink.getBuffer();
      expect(buffer).toHaveLength(2);
      expect(buffer[0]!.payload).toEqual({ input: 'test1' });
      expect(buffer[1]!.payload).toEqual({ input: 'test2' });
    });

    it('should respect max size', () => {
      const sink = new BufferEventSink({ maxSize: 3 });

      for (let i = 0; i < 5; i++) {
        sink.emit(createUIEvent('user_input', { input: `test${i}` }));
      }

      expect(sink.getBufferSize()).toBe(3);
      const buffer = sink.getBuffer();
      // Should have the last 3 events
      expect(buffer[0]!.payload).toEqual({ input: 'test2' });
      expect(buffer[1]!.payload).toEqual({ input: 'test3' });
      expect(buffer[2]!.payload).toEqual({ input: 'test4' });
    });

    it('should clear buffer on flush', () => {
      const sink = new BufferEventSink();
      sink.emit(createUIEvent('user_input', { input: 'test' }));
      sink.emit(createUIEvent('user_input', { input: 'test2' }));

      expect(sink.getBufferSize()).toBe(2);

      sink.flush();

      expect(sink.getBufferSize()).toBe(0);
    });

    it('should return copy of buffer', () => {
      const sink = new BufferEventSink();
      const event = createUIEvent('user_input', { input: 'test' });
      sink.emit(event);

      const buffer1 = sink.getBuffer();
      const buffer2 = sink.getBuffer();

      expect(buffer1).not.toBe(buffer2);
      expect(buffer1).toEqual(buffer2);
    });
  });

  describe('CompositeEventSink', () => {
    it('should emit to all sinks', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const sink1 = new CallbackEventSink(callback1);
      const sink2 = new CallbackEventSink(callback2);
      const composite = new CompositeEventSink([sink1, sink2]);

      const event = createUIEvent('user_input', { input: 'test' });
      composite.emit(event);

      expect(callback1).toHaveBeenCalledWith(event);
      expect(callback2).toHaveBeenCalledWith(event);
    });

    it('should emit batch to all sinks', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const sink1 = new CallbackEventSink(callback1);
      const sink2 = new CallbackEventSink(callback2);
      const composite = new CompositeEventSink([sink1, sink2]);

      const events = [
        createUIEvent('user_input', { input: 'test1' }),
        createUIEvent('user_input', { input: 'test2' }),
      ];
      composite.emitBatch(events);

      expect(callback1).toHaveBeenCalledTimes(2);
      expect(callback2).toHaveBeenCalledTimes(2);
    });

    it('should aggregate statistics', () => {
      const sink1 = new BufferEventSink();
      const sink2 = new BufferEventSink();
      const composite = new CompositeEventSink([sink1, sink2]);

      composite.emit(createUIEvent('user_input', { input: 'test' }));
      composite.emit(createUIEvent('user_input', { input: 'test2' }));

      const stats = composite.getStats();
      expect(stats.eventsEmitted).toBe(4); // 2 events x 2 sinks
    });

    it('should close all sinks', () => {
      const sink1 = new BufferEventSink();
      const sink2 = new BufferEventSink();
      const composite = new CompositeEventSink([sink1, sink2]);

      composite.close();

      // Verify sinks are closed by trying to emit
      const event = createUIEvent('user_input', { input: 'test' });
      sink1.emit(event);
      sink2.emit(event);

      expect(sink1.getBufferSize()).toBe(0);
      expect(sink2.getBufferSize()).toBe(0);
    });

    it('should add and remove sinks', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const sink1 = new CallbackEventSink(callback1);
      const sink2 = new CallbackEventSink(callback2);
      const composite = new CompositeEventSink([sink1]);

      const event = createUIEvent('user_input', { input: 'test' });

      composite.emit(event);
      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).not.toHaveBeenCalled();

      composite.addSink(sink2);
      composite.emit(event);
      expect(callback1).toHaveBeenCalledTimes(2);
      expect(callback2).toHaveBeenCalledTimes(1);

      composite.removeSink(sink1);
      composite.emit(event);
      expect(callback1).toHaveBeenCalledTimes(2); // No new calls
      expect(callback2).toHaveBeenCalledTimes(2);
    });
  });

  describe('createEventSink', () => {
    it('should create stdout sink', () => {
      const sink = createEventSink({ mode: 'stdout' });
      expect(sink).toBeInstanceOf(StdoutEventSink);
    });

    it('should create callback sink', () => {
      const callback = vi.fn();
      const sink = createEventSink({ mode: 'callback', callback });
      expect(sink).toBeInstanceOf(CallbackEventSink);
    });

    it('should create buffer sink', () => {
      const sink = createEventSink({ mode: 'buffer' });
      expect(sink).toBeInstanceOf(BufferEventSink);
    });

    it('should throw for callback mode without callback', () => {
      expect(() => createEventSink({ mode: 'callback' })).toThrow('Callback is required');
    });

    it('should throw for unknown mode', () => {
      expect(() => createEventSink({ mode: 'unknown' as never })).toThrow('Unknown event sink mode');
    });
  });

  describe('Default sink', () => {
    let originalSink: IEventSink | null = null;

    beforeEach(() => {
      // Save and reset default sink
      originalSink = getDefaultEventSink();
    });

    afterEach(() => {
      if (originalSink) {
        setDefaultEventSink(originalSink);
      }
    });

    it('should return a default stdout sink', () => {
      const sink = getDefaultEventSink();
      expect(sink).toBeInstanceOf(StdoutEventSink);
    });

    it('should allow setting default sink', () => {
      const customSink = new BufferEventSink();
      setDefaultEventSink(customSink);

      expect(getDefaultEventSink()).toBe(customSink);
    });

    it('should emit to default sink', () => {
      const customSink = new BufferEventSink();
      setDefaultEventSink(customSink);

      const event = createUIEvent('user_input', { input: 'test' });
      emitEvent(event);

      expect(customSink.getBufferSize()).toBe(1);
    });
  });

  describe('emitBatch', () => {
    it('should emit all events in batch', () => {
      const callback = vi.fn();
      const sink = new CallbackEventSink(callback);

      const events = [
        createUIEvent('user_input', { input: 'test1' }),
        createUIEvent('button_click', { buttonId: 'btn-1' }),
        createUIEvent('lifecycle', { event: 'ready' }),
      ];

      sink.emitBatch(events);

      expect(callback).toHaveBeenCalledTimes(3);
      expect(callback).toHaveBeenNthCalledWith(1, events[0]);
      expect(callback).toHaveBeenNthCalledWith(2, events[1]);
      expect(callback).toHaveBeenNthCalledWith(3, events[2]);
    });
  });
});
