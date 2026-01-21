/**
 * Outbound Event Protocol (UOW-1001)
 *
 * Defines events that the UI can emit back to the parent process.
 */

import { z } from 'zod';

// Base outbound event
const OutboundEventBase = z.object({
  timestamp: z.string().datetime().optional(),
  correlationId: z.string().optional(),
});

// User input event
export const UserInputEventSchema = OutboundEventBase.extend({
  type: z.literal('user_input'),
  input: z.string(),
  inputType: z.enum(['text', 'command', 'confirmation']).optional(),
});

// Button click event
export const ButtonClickEventSchema = OutboundEventBase.extend({
  type: z.literal('button_click'),
  buttonId: z.string(),
  componentId: z.string().optional(),
  data: z.unknown().optional(),
});

// Selection change event
export const SelectionChangeEventSchema = OutboundEventBase.extend({
  type: z.literal('selection_change'),
  componentId: z.string(),
  selectedIndex: z.number().optional(),
  selectedIds: z.array(z.string()).optional(),
  selectedValue: z.unknown().optional(),
});

// Scroll event
export const ScrollEventSchema = OutboundEventBase.extend({
  type: z.literal('scroll'),
  componentId: z.string(),
  scrollTop: z.number(),
  scrollHeight: z.number(),
  viewportHeight: z.number(),
  direction: z.enum(['up', 'down']).optional(),
});

// Focus change event
export const FocusChangeEventSchema = OutboundEventBase.extend({
  type: z.literal('focus_change'),
  focusedId: z.string().nullable(),
  previousId: z.string().nullable().optional(),
});

// Key press event (for shortcuts)
export const KeyPressEventSchema = OutboundEventBase.extend({
  type: z.literal('key_press'),
  key: z.string(),
  ctrl: z.boolean().optional(),
  alt: z.boolean().optional(),
  shift: z.boolean().optional(),
  meta: z.boolean().optional(),
  handled: z.boolean().optional(),
});

// Task action event
export const TaskActionEventSchema = OutboundEventBase.extend({
  type: z.literal('task_action'),
  action: z.enum(['cancel', 'retry', 'pause', 'resume', 'view']),
  taskId: z.string(),
});

// Modal action event
export const ModalActionEventSchema = OutboundEventBase.extend({
  type: z.literal('modal_action'),
  action: z.enum(['confirm', 'cancel', 'dismiss']),
  modalId: z.string(),
  data: z.unknown().optional(),
});

// Document action event
export const DocumentActionEventSchema = OutboundEventBase.extend({
  type: z.literal('document_action'),
  action: z.enum(['open', 'close', 'scroll', 'copy', 'download']),
  documentId: z.string().optional(),
  path: z.string().optional(),
});

// Notification action event
export const NotificationActionEventSchema = OutboundEventBase.extend({
  type: z.literal('notification_action'),
  action: z.enum(['dismiss', 'action']),
  notificationId: z.string(),
  actionId: z.string().optional(),
});

// Navigation event
export const NavigationEventSchema = OutboundEventBase.extend({
  type: z.literal('navigation'),
  target: z.enum(['back', 'forward', 'home', 'help', 'settings']),
  params: z.record(z.unknown()).optional(),
});

// Resize event
export const ResizeEventSchema = OutboundEventBase.extend({
  type: z.literal('resize'),
  width: z.number(),
  height: z.number(),
  previousWidth: z.number().optional(),
  previousHeight: z.number().optional(),
});

// Error event
export const ErrorEventSchema = OutboundEventBase.extend({
  type: z.literal('error'),
  code: z.string(),
  message: z.string(),
  stack: z.string().optional(),
  componentId: z.string().optional(),
  recoverable: z.boolean().optional(),
});

// Lifecycle event
export const LifecycleEventSchema = OutboundEventBase.extend({
  type: z.literal('lifecycle'),
  event: z.enum(['ready', 'mounted', 'unmounted', 'suspended', 'resumed']),
});

// Metrics event
export const MetricsEventSchema = OutboundEventBase.extend({
  type: z.literal('metrics'),
  metrics: z.object({
    fps: z.number().optional(),
    renderCount: z.number().optional(),
    eventCount: z.number().optional(),
    memoryUsage: z.number().optional(),
    uptime: z.number().optional(),
  }),
});

// Debug event
export const DebugEventSchema = OutboundEventBase.extend({
  type: z.literal('debug'),
  level: z.enum(['trace', 'debug', 'info', 'warn', 'error']),
  message: z.string(),
  data: z.unknown().optional(),
});

// Union of all outbound events
export const OutboundEventSchema = z.discriminatedUnion('type', [
  UserInputEventSchema,
  ButtonClickEventSchema,
  SelectionChangeEventSchema,
  ScrollEventSchema,
  FocusChangeEventSchema,
  KeyPressEventSchema,
  TaskActionEventSchema,
  ModalActionEventSchema,
  DocumentActionEventSchema,
  NotificationActionEventSchema,
  NavigationEventSchema,
  ResizeEventSchema,
  ErrorEventSchema,
  LifecycleEventSchema,
  MetricsEventSchema,
  DebugEventSchema,
]);

// TypeScript types
export type UserInputEvent = z.infer<typeof UserInputEventSchema>;
export type ButtonClickEvent = z.infer<typeof ButtonClickEventSchema>;
export type SelectionChangeEvent = z.infer<typeof SelectionChangeEventSchema>;
export type ScrollEvent = z.infer<typeof ScrollEventSchema>;
export type FocusChangeEvent = z.infer<typeof FocusChangeEventSchema>;
export type KeyPressEvent = z.infer<typeof KeyPressEventSchema>;
export type TaskActionEvent = z.infer<typeof TaskActionEventSchema>;
export type ModalActionEvent = z.infer<typeof ModalActionEventSchema>;
export type DocumentActionEvent = z.infer<typeof DocumentActionEventSchema>;
export type NotificationActionEvent = z.infer<typeof NotificationActionEventSchema>;
export type NavigationEvent = z.infer<typeof NavigationEventSchema>;
export type ResizeEvent = z.infer<typeof ResizeEventSchema>;
export type ErrorEvent = z.infer<typeof ErrorEventSchema>;
export type LifecycleEvent = z.infer<typeof LifecycleEventSchema>;
export type MetricsEvent = z.infer<typeof MetricsEventSchema>;
export type DebugEvent = z.infer<typeof DebugEventSchema>;
export type OutboundEvent = z.infer<typeof OutboundEventSchema>;

/**
 * Event emitter interface
 */
export interface OutboundEventEmitter {
  emit(event: OutboundEvent): void;
  onError?: (error: Error, event: OutboundEvent) => void;
}

/**
 * Create an event emitter that writes to stdout
 */
export function createStdoutEmitter(): OutboundEventEmitter {
  return {
    emit(event: OutboundEvent) {
      const eventWithTimestamp = {
        ...event,
        timestamp: event.timestamp || new Date().toISOString(),
      };
      process.stdout.write(JSON.stringify(eventWithTimestamp) + '\n');
    },
    onError(error, event) {
      console.error('Failed to emit event:', error, event);
    },
  };
}

/**
 * Create an event emitter that writes to a file
 */
export function createFileEmitter(writeCallback: (line: string) => void): OutboundEventEmitter {
  return {
    emit(event: OutboundEvent) {
      const eventWithTimestamp = {
        ...event,
        timestamp: event.timestamp || new Date().toISOString(),
      };
      writeCallback(JSON.stringify(eventWithTimestamp) + '\n');
    },
  };
}

/**
 * Create a buffered event emitter
 */
export function createBufferedEmitter(
  emitter: OutboundEventEmitter,
  options: { maxBuffer?: number; flushInterval?: number } = {}
): OutboundEventEmitter & { flush: () => void } {
  const buffer: OutboundEvent[] = [];
  const maxBuffer = options.maxBuffer ?? 100;
  const flushInterval = options.flushInterval ?? 100;

  let flushTimer: ReturnType<typeof setInterval> | null = null;

  const flush = () => {
    while (buffer.length > 0) {
      const event = buffer.shift()!;
      emitter.emit(event);
    }
  };

  if (flushInterval > 0) {
    flushTimer = setInterval(flush, flushInterval);
  }

  return {
    emit(event: OutboundEvent) {
      buffer.push(event);
      if (buffer.length >= maxBuffer) {
        flush();
      }
    },
    flush,
    onError: emitter.onError,
  };
}

/**
 * Validate an outbound event
 */
export function validateOutboundEvent(event: unknown): OutboundEvent | null {
  const result = OutboundEventSchema.safeParse(event);
  return result.success ? result.data : null;
}

/**
 * Helper to create events
 */
export const OutboundEvents = {
  userInput(input: string, inputType?: 'text' | 'command' | 'confirmation'): UserInputEvent {
    return { type: 'user_input', input, inputType };
  },

  buttonClick(buttonId: string, componentId?: string, data?: unknown): ButtonClickEvent {
    return { type: 'button_click', buttonId, componentId, data };
  },

  selectionChange(componentId: string, selectedIndex?: number, selectedIds?: string[]): SelectionChangeEvent {
    return { type: 'selection_change', componentId, selectedIndex, selectedIds };
  },

  focusChange(focusedId: string | null, previousId?: string | null): FocusChangeEvent {
    return { type: 'focus_change', focusedId, previousId };
  },

  keyPress(key: string, modifiers?: { ctrl?: boolean; alt?: boolean; shift?: boolean; meta?: boolean }): KeyPressEvent {
    return { type: 'key_press', key, ...modifiers };
  },

  taskAction(action: 'cancel' | 'retry' | 'pause' | 'resume' | 'view', taskId: string): TaskActionEvent {
    return { type: 'task_action', action, taskId };
  },

  modalAction(action: 'confirm' | 'cancel' | 'dismiss', modalId: string, data?: unknown): ModalActionEvent {
    return { type: 'modal_action', action, modalId, data };
  },

  lifecycle(event: 'ready' | 'mounted' | 'unmounted' | 'suspended' | 'resumed'): LifecycleEvent {
    return { type: 'lifecycle', event };
  },

  error(code: string, message: string, stack?: string, recoverable?: boolean): ErrorEvent {
    return { type: 'error', code, message, stack, recoverable };
  },

  resize(width: number, height: number): ResizeEvent {
    return { type: 'resize', width, height };
  },
};
