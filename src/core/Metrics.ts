/**
 * Metrics Collection (UOW-0110)
 *
 * Tracks lines read, parse errors, dropped events, and performance metrics.
 */

export interface MetricsData {
  // Event processing
  linesRead: number;
  parseErrors: number;
  droppedEvents: number;
  eventsProcessed: number;

  // Performance
  eventsPerSecond: number;
  rendersPerSecond: number;
  avgProcessingTimeMs: number;

  // Memory (approximation)
  messagesInMemory: number;
  tasksInMemory: number;

  // Timing
  startTime: number;
  lastEventTime: number;
  uptime: number;
}

export class MetricsCollector {
  private data: MetricsData;
  private eventTimes: number[] = [];
  private renderTimes: number[] = [];
  private processingTimes: number[] = [];
  private windowSize = 100; // Rolling window for rate calculations

  constructor() {
    this.data = {
      linesRead: 0,
      parseErrors: 0,
      droppedEvents: 0,
      eventsProcessed: 0,
      eventsPerSecond: 0,
      rendersPerSecond: 0,
      avgProcessingTimeMs: 0,
      messagesInMemory: 0,
      tasksInMemory: 0,
      startTime: Date.now(),
      lastEventTime: 0,
      uptime: 0,
    };
  }

  recordLineRead(): void {
    this.data.linesRead++;
  }

  recordParseError(): void {
    this.data.parseErrors++;
  }

  recordDroppedEvent(): void {
    this.data.droppedEvents++;
  }

  recordEventProcessed(processingTimeMs?: number): void {
    this.data.eventsProcessed++;
    this.data.lastEventTime = Date.now();
    this.eventTimes.push(this.data.lastEventTime);

    if (processingTimeMs !== undefined) {
      this.processingTimes.push(processingTimeMs);
      if (this.processingTimes.length > this.windowSize) {
        this.processingTimes.shift();
      }
    }

    if (this.eventTimes.length > this.windowSize) {
      this.eventTimes.shift();
    }

    this.updateRates();
  }

  recordRender(): void {
    this.renderTimes.push(Date.now());
    if (this.renderTimes.length > this.windowSize) {
      this.renderTimes.shift();
    }
    this.updateRates();
  }

  updateMemoryMetrics(messages: number, tasks: number): void {
    this.data.messagesInMemory = messages;
    this.data.tasksInMemory = tasks;
  }

  private updateRates(): void {
    const now = Date.now();
    this.data.uptime = now - this.data.startTime;

    // Calculate events per second from rolling window
    if (this.eventTimes.length >= 2) {
      const windowStart = this.eventTimes[0]!;
      const windowEnd = this.eventTimes[this.eventTimes.length - 1]!;
      const windowDuration = (windowEnd - windowStart) / 1000;
      if (windowDuration > 0) {
        this.data.eventsPerSecond = (this.eventTimes.length - 1) / windowDuration;
      }
    }

    // Calculate renders per second
    if (this.renderTimes.length >= 2) {
      const windowStart = this.renderTimes[0]!;
      const windowEnd = this.renderTimes[this.renderTimes.length - 1]!;
      const windowDuration = (windowEnd - windowStart) / 1000;
      if (windowDuration > 0) {
        this.data.rendersPerSecond = (this.renderTimes.length - 1) / windowDuration;
      }
    }

    // Calculate average processing time
    if (this.processingTimes.length > 0) {
      const sum = this.processingTimes.reduce((a, b) => a + b, 0);
      this.data.avgProcessingTimeMs = sum / this.processingTimes.length;
    }
  }

  getMetrics(): MetricsData {
    this.data.uptime = Date.now() - this.data.startTime;
    return { ...this.data };
  }

  reset(): void {
    this.data = {
      ...this.data,
      linesRead: 0,
      parseErrors: 0,
      droppedEvents: 0,
      eventsProcessed: 0,
      eventsPerSecond: 0,
      rendersPerSecond: 0,
      avgProcessingTimeMs: 0,
      startTime: Date.now(),
      lastEventTime: 0,
      uptime: 0,
    };
    this.eventTimes = [];
    this.renderTimes = [];
    this.processingTimes = [];
  }
}

// Singleton instance
export const metrics = new MetricsCollector();
