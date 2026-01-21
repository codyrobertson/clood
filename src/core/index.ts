/**
 * Core Module Index
 *
 * Re-exports core functionality.
 */

export {
  parseEvent,
  parseEvents,
  isMessageEvent,
  isStreamEvent,
  isTaskEvent,
  isDocumentEvent,
  isToolCallEvent,
  isNotificationEvent,
  isChartEvent,
  isHookEvent,
  isSessionEvent,
  isUnknownEvent,
  type ParsedEvent,
} from './EventStream.js';

export { useEventStream } from './useEventStream.js';

// Metrics
export {
  AdvancedMetricsCollector,
  metricsCollector,
  getMetrics,
  getStatusBarMetrics,
  recordEvent,
  recordRender,
  recordError,
  resetMetrics,
  type MetricsSnapshot,
  type MetricsCollectorOptions,
} from './MetricsCollector.js';

// Render Throttler (UOW-0305)
export {
  RenderThrottler,
  createRenderThrottler,
  getRenderThrottler,
  resetRenderThrottler,
  requestRenderFrame,
  flushRenderFrames,
  type RenderThrottlerConfig,
  type RenderStats,
  type FrameCallback,
} from './RenderThrottler.js';

// Event Batcher (UOW-0306)
export {
  EventBatcher,
  StateUpdateBatcher,
  createEventBatcher,
  createStateUpdateBatcher,
  getEventBatcher,
  resetEventBatcher,
  type EventBatcherConfig,
  type BatchedEvent,
  type BatchStats,
  type BatchFlushHandler,
} from './EventBatcher.js';
