/**
 * Metrics Tests (UOW-0110)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MetricsCollector } from './Metrics.js';

describe('MetricsCollector', () => {
  let metrics: MetricsCollector;

  beforeEach(() => {
    metrics = new MetricsCollector();
  });

  it('should track lines read', () => {
    metrics.recordLineRead();
    metrics.recordLineRead();
    metrics.recordLineRead();

    expect(metrics.getMetrics().linesRead).toBe(3);
  });

  it('should track parse errors', () => {
    metrics.recordParseError();
    metrics.recordParseError();

    expect(metrics.getMetrics().parseErrors).toBe(2);
  });

  it('should track dropped events', () => {
    metrics.recordDroppedEvent();

    expect(metrics.getMetrics().droppedEvents).toBe(1);
  });

  it('should track events processed', () => {
    metrics.recordEventProcessed();
    metrics.recordEventProcessed();

    expect(metrics.getMetrics().eventsProcessed).toBe(2);
  });

  it('should track processing time', () => {
    metrics.recordEventProcessed(10);
    metrics.recordEventProcessed(20);
    metrics.recordEventProcessed(30);

    expect(metrics.getMetrics().avgProcessingTimeMs).toBe(20);
  });

  it('should update memory metrics', () => {
    metrics.updateMemoryMetrics(100, 5);

    const data = metrics.getMetrics();
    expect(data.messagesInMemory).toBe(100);
    expect(data.tasksInMemory).toBe(5);
  });

  it('should track uptime', async () => {
    await new Promise((r) => setTimeout(r, 50));
    const data = metrics.getMetrics();
    expect(data.uptime).toBeGreaterThanOrEqual(50);
  });

  it('should reset metrics', () => {
    metrics.recordLineRead();
    metrics.recordParseError();
    metrics.recordEventProcessed();
    metrics.reset();

    const data = metrics.getMetrics();
    expect(data.linesRead).toBe(0);
    expect(data.parseErrors).toBe(0);
    expect(data.eventsProcessed).toBe(0);
  });
});
