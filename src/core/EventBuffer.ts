/**
 * Event Buffer with Backpressure (UOW-0109)
 *
 * Implements buffering with configurable max queue size and drop policy.
 */

import type { ParsedEvent } from './EventStream.js';

export type DropPolicy = 'drop-oldest' | 'drop-newest' | 'block';

export interface EventBufferOptions {
  maxQueueSize: number;
  dropPolicy: DropPolicy;
  onDrop?: (event: ParsedEvent, reason: string) => void;
}

export interface EventBufferMetrics {
  totalReceived: number;
  totalDropped: number;
  currentQueueSize: number;
  peakQueueSize: number;
}

export class EventBuffer {
  private queue: ParsedEvent[] = [];
  private options: EventBufferOptions;
  private metrics: EventBufferMetrics = {
    totalReceived: 0,
    totalDropped: 0,
    currentQueueSize: 0,
    peakQueueSize: 0,
  };
  private resolvers: Array<(event: ParsedEvent) => void> = [];

  constructor(options: Partial<EventBufferOptions> = {}) {
    this.options = {
      maxQueueSize: options.maxQueueSize ?? 1000,
      dropPolicy: options.dropPolicy ?? 'drop-oldest',
      onDrop: options.onDrop,
    };
  }

  push(event: ParsedEvent): boolean {
    this.metrics.totalReceived++;

    if (this.resolvers.length > 0) {
      const resolver = this.resolvers.shift()!;
      resolver(event);
      return true;
    }

    if (this.queue.length >= this.options.maxQueueSize) {
      return this.handleOverflow(event);
    }

    this.queue.push(event);
    this.updateQueueMetrics();
    return true;
  }

  private handleOverflow(event: ParsedEvent): boolean {
    switch (this.options.dropPolicy) {
      case 'drop-oldest': {
        const dropped = this.queue.shift();
        if (dropped) {
          this.metrics.totalDropped++;
          this.options.onDrop?.(dropped, 'queue-full-drop-oldest');
        }
        this.queue.push(event);
        return true;
      }
      case 'drop-newest': {
        this.metrics.totalDropped++;
        this.options.onDrop?.(event, 'queue-full-drop-newest');
        return false;
      }
      case 'block': {
        return false;
      }
    }
  }

  async take(): Promise<ParsedEvent> {
    if (this.queue.length > 0) {
      const event = this.queue.shift()!;
      this.updateQueueMetrics();
      return event;
    }

    return new Promise((resolve) => {
      this.resolvers.push(resolve);
    });
  }

  tryTake(): ParsedEvent | null {
    if (this.queue.length > 0) {
      const event = this.queue.shift()!;
      this.updateQueueMetrics();
      return event;
    }
    return null;
  }

  private updateQueueMetrics(): void {
    this.metrics.currentQueueSize = this.queue.length;
    if (this.queue.length > this.metrics.peakQueueSize) {
      this.metrics.peakQueueSize = this.queue.length;
    }
  }

  getMetrics(): EventBufferMetrics {
    return { ...this.metrics };
  }

  clear(): void {
    this.queue = [];
    this.metrics.currentQueueSize = 0;
  }

  get size(): number {
    return this.queue.length;
  }
}
