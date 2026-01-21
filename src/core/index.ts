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
