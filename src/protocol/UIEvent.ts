/**
 * UIEvent Envelope (UOW-1001)
 *
 * Defines the universal event envelope for bidirectional protocol.
 * All outbound events from the UI are wrapped in this envelope.
 */

import { z } from 'zod';

/**
 * Event type enum for all possible UI events
 */
export const UIEventTypeSchema = z.enum([
  // User interaction events
  'user_input',
  'button_click',
  'selection_change',
  'focus_change',
  'key_press',
  'scroll',

  // Action events
  'action.sendMessage',
  'action.updateState',
  'action.dismiss',
  'action.navigate',
  'action.custom',

  // Message events
  'message.request',
  'message.response',

  // Task events
  'task_action',
  'modal_action',
  'document_action',
  'notification_action',

  // System events
  'lifecycle',
  'resize',
  'error',
  'metrics',
  'debug',
]);

export type UIEventType = z.infer<typeof UIEventTypeSchema>;

/**
 * Base payload schema - all payloads must extend this
 */
export const BasePayloadSchema = z.record(z.unknown());

/**
 * UIEvent envelope schema
 * Wraps all outbound events with metadata
 */
export const UIEventSchema = z.object({
  /** Unique event type identifier */
  eventType: UIEventTypeSchema,

  /** ISO 8601 timestamp when event was created */
  timestamp: z.string().datetime(),

  /** ID of the component that triggered the event (optional) */
  componentId: z.string().optional(),

  /** Event-specific payload */
  payload: BasePayloadSchema,

  /** Optional correlation ID for request/response tracking */
  correlationId: z.string().optional(),

  /** Optional sequence number for ordering */
  sequence: z.number().int().nonnegative().optional(),

  /** Protocol version */
  version: z.literal('1.0').optional().default('1.0'),
});

export type UIEvent = z.infer<typeof UIEventSchema>;

/**
 * Specific payload schemas for different event types
 */

// User input payload
export const UserInputPayloadSchema = z.object({
  input: z.string(),
  inputType: z.enum(['text', 'command', 'confirmation']).optional(),
});

// Button click payload
export const ButtonClickPayloadSchema = z.object({
  buttonId: z.string(),
  data: z.unknown().optional(),
});

// Selection change payload
export const SelectionChangePayloadSchema = z.object({
  selectedIndex: z.number().optional(),
  selectedIds: z.array(z.string()).optional(),
  selectedValue: z.unknown().optional(),
});

// Focus change payload
export const FocusChangePayloadSchema = z.object({
  focusedId: z.string().nullable(),
  previousId: z.string().nullable().optional(),
});

// Key press payload
export const KeyPressPayloadSchema = z.object({
  key: z.string(),
  ctrl: z.boolean().optional(),
  alt: z.boolean().optional(),
  shift: z.boolean().optional(),
  meta: z.boolean().optional(),
  handled: z.boolean().optional(),
});

// Scroll payload
export const ScrollPayloadSchema = z.object({
  scrollTop: z.number(),
  scrollHeight: z.number(),
  viewportHeight: z.number(),
  direction: z.enum(['up', 'down']).optional(),
});

// Message request payload
export const MessageRequestPayloadSchema = z.object({
  content: z.string(),
  metadata: z.record(z.unknown()).optional(),
});

// Error payload
export const ErrorPayloadSchema = z.object({
  code: z.string(),
  message: z.string(),
  stack: z.string().optional(),
  recoverable: z.boolean().optional(),
});

// Lifecycle payload
export const LifecyclePayloadSchema = z.object({
  event: z.enum(['ready', 'mounted', 'unmounted', 'suspended', 'resumed']),
});

// Metrics payload
export const MetricsPayloadSchema = z.object({
  fps: z.number().optional(),
  renderCount: z.number().optional(),
  eventCount: z.number().optional(),
  memoryUsage: z.number().optional(),
  uptime: z.number().optional(),
});

// Navigate payload
export const NavigatePayloadSchema = z.object({
  target: z.string(),
  params: z.record(z.unknown()).optional(),
});

// Dismiss payload
export const DismissPayloadSchema = z.object({
  targetId: z.string(),
  reason: z.string().optional(),
});

// Update state payload
export const UpdateStatePayloadSchema = z.object({
  path: z.string(),
  value: z.unknown(),
  operation: z.enum(['set', 'merge', 'delete']).optional().default('set'),
});

export type UserInputPayload = z.infer<typeof UserInputPayloadSchema>;
export type ButtonClickPayload = z.infer<typeof ButtonClickPayloadSchema>;
export type SelectionChangePayload = z.infer<typeof SelectionChangePayloadSchema>;
export type FocusChangePayload = z.infer<typeof FocusChangePayloadSchema>;
export type KeyPressPayload = z.infer<typeof KeyPressPayloadSchema>;
export type ScrollPayload = z.infer<typeof ScrollPayloadSchema>;
export type MessageRequestPayload = z.infer<typeof MessageRequestPayloadSchema>;
export type ErrorPayload = z.infer<typeof ErrorPayloadSchema>;
export type LifecyclePayload = z.infer<typeof LifecyclePayloadSchema>;
export type MetricsPayload = z.infer<typeof MetricsPayloadSchema>;
export type NavigatePayload = z.infer<typeof NavigatePayloadSchema>;
export type DismissPayload = z.infer<typeof DismissPayloadSchema>;
export type UpdateStatePayload = z.infer<typeof UpdateStatePayloadSchema>;

/**
 * Validate a UIEvent
 */
export function validateUIEvent(input: unknown): UIEvent | null {
  const result = UIEventSchema.safeParse(input);
  return result.success ? result.data : null;
}

/**
 * Validate UIEvent with detailed error
 */
export function validateUIEventWithError(input: unknown): {
  success: true;
  data: UIEvent;
} | {
  success: false;
  error: z.ZodError;
} {
  const result = UIEventSchema.safeParse(input);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * Create a UIEvent with current timestamp
 */
export function createUIEvent(
  eventType: UIEventType,
  payload: Record<string, unknown>,
  options?: {
    componentId?: string;
    correlationId?: string;
    sequence?: number;
  }
): UIEvent {
  return {
    eventType,
    timestamp: new Date().toISOString(),
    payload,
    componentId: options?.componentId,
    correlationId: options?.correlationId,
    sequence: options?.sequence,
    version: '1.0',
  };
}

/**
 * Type guard to check if an event is a specific type
 */
export function isEventType<T extends UIEventType>(
  event: UIEvent,
  type: T
): boolean {
  return event.eventType === type;
}

/**
 * Helper factory functions for common events
 */
export const UIEvents = {
  userInput(input: string, componentId?: string, inputType?: 'text' | 'command' | 'confirmation'): UIEvent {
    return createUIEvent('user_input', { input, inputType }, { componentId });
  },

  buttonClick(buttonId: string, componentId?: string, data?: unknown): UIEvent {
    return createUIEvent('button_click', { buttonId, data }, { componentId });
  },

  selectionChange(
    componentId: string,
    selectedIndex?: number,
    selectedIds?: string[],
    selectedValue?: unknown
  ): UIEvent {
    return createUIEvent('selection_change', { selectedIndex, selectedIds, selectedValue }, { componentId });
  },

  focusChange(focusedId: string | null, previousId?: string | null): UIEvent {
    return createUIEvent('focus_change', { focusedId, previousId });
  },

  keyPress(key: string, modifiers?: { ctrl?: boolean; alt?: boolean; shift?: boolean; meta?: boolean }): UIEvent {
    return createUIEvent('key_press', { key, ...modifiers });
  },

  scroll(componentId: string, scrollTop: number, scrollHeight: number, viewportHeight: number): UIEvent {
    return createUIEvent('scroll', { scrollTop, scrollHeight, viewportHeight }, { componentId });
  },

  messageRequest(content: string, metadata?: Record<string, unknown>, correlationId?: string): UIEvent {
    return createUIEvent('message.request', { content, metadata }, { correlationId });
  },

  lifecycle(event: 'ready' | 'mounted' | 'unmounted' | 'suspended' | 'resumed'): UIEvent {
    return createUIEvent('lifecycle', { event });
  },

  error(code: string, message: string, componentId?: string, recoverable?: boolean): UIEvent {
    return createUIEvent('error', { code, message, recoverable }, { componentId });
  },

  navigate(target: string, params?: Record<string, unknown>): UIEvent {
    return createUIEvent('action.navigate', { target, params });
  },

  dismiss(targetId: string, reason?: string): UIEvent {
    return createUIEvent('action.dismiss', { targetId, reason });
  },

  updateState(path: string, value: unknown, operation?: 'set' | 'merge' | 'delete'): UIEvent {
    return createUIEvent('action.updateState', { path, value, operation: operation ?? 'set' });
  },

  custom(actionName: string, payload: Record<string, unknown>, componentId?: string): UIEvent {
    return createUIEvent('action.custom', { actionName, ...payload }, { componentId });
  },
};

/**
 * Serialize UIEvent to JSON string
 */
export function serializeUIEvent(event: UIEvent): string {
  return JSON.stringify(event);
}

/**
 * Deserialize JSON string to UIEvent
 */
export function deserializeUIEvent(json: string): UIEvent | null {
  try {
    const parsed = JSON.parse(json);
    return validateUIEvent(parsed);
  } catch {
    return null;
  }
}
