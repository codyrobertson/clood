/**
 * Action Bindings (UOW-1010 through UOW-1014)
 *
 * Implements action binding system with:
 * - ActionBinding parser with templating support
 * - sendMessage action (emit message.request)
 * - updateState action (apply patch locally)
 * - dismiss/navigate actions
 */

import { z } from 'zod';
import { UIEvent, createUIEvent } from './UIEvent.js';
import { IEventSink } from './EventSink.js';

/**
 * Action types
 */
export const ActionTypeSchema = z.enum([
  'sendMessage',
  'updateState',
  'dismiss',
  'navigate',
  'custom',
]);

export type ActionType = z.infer<typeof ActionTypeSchema>;

/**
 * Template variable pattern for string interpolation
 * Matches {{variableName}} or {{path.to.value}}
 */
const TEMPLATE_PATTERN = /\{\{([^}]+)\}\}/g;

/**
 * Base action schema
 */
const BaseActionSchema = z.object({
  type: ActionTypeSchema,
  condition: z.string().optional(),
});

/**
 * SendMessage action schema
 */
export const SendMessageActionSchema = BaseActionSchema.extend({
  type: z.literal('sendMessage'),
  message: z.string(),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * UpdateState action schema
 */
export const UpdateStateActionSchema = BaseActionSchema.extend({
  type: z.literal('updateState'),
  path: z.string(),
  value: z.unknown(),
  operation: z.enum(['set', 'merge', 'delete', 'append', 'prepend']).optional().default('set'),
});

/**
 * Dismiss action schema
 */
export const DismissActionSchema = BaseActionSchema.extend({
  type: z.literal('dismiss'),
  targetId: z.string().optional(),
  reason: z.string().optional(),
});

/**
 * Navigate action schema
 */
export const NavigateActionSchema = BaseActionSchema.extend({
  type: z.literal('navigate'),
  target: z.string(),
  params: z.record(z.unknown()).optional(),
  replace: z.boolean().optional(),
});

/**
 * Custom action schema
 */
export const CustomActionSchema = BaseActionSchema.extend({
  type: z.literal('custom'),
  name: z.string(),
  payload: z.record(z.unknown()).optional(),
});

/**
 * Union of all action schemas
 */
export const ActionSchema = z.discriminatedUnion('type', [
  SendMessageActionSchema,
  UpdateStateActionSchema,
  DismissActionSchema,
  NavigateActionSchema,
  CustomActionSchema,
]);

export type Action = z.infer<typeof ActionSchema>;
export type SendMessageAction = z.infer<typeof SendMessageActionSchema>;
export type UpdateStateAction = z.infer<typeof UpdateStateActionSchema>;
export type DismissAction = z.infer<typeof DismissActionSchema>;
export type NavigateAction = z.infer<typeof NavigateActionSchema>;
export type CustomAction = z.infer<typeof CustomActionSchema>;

/**
 * Action binding - binds an event (like click) to one or more actions
 */
export const ActionBindingSchema = z.object({
  /** Event that triggers this binding (e.g., 'click', 'submit', 'change') */
  trigger: z.string(),

  /** Component ID this binding is attached to */
  componentId: z.string().optional(),

  /** Actions to execute when triggered */
  actions: z.array(ActionSchema),

  /** Whether to stop event propagation */
  stopPropagation: z.boolean().optional(),

  /** Whether to prevent default behavior */
  preventDefault: z.boolean().optional(),

  /** Debounce delay in ms */
  debounceMs: z.number().optional(),
});

export type ActionBinding = z.infer<typeof ActionBindingSchema>;

/**
 * Template context for variable interpolation
 */
export interface TemplateContext {
  /** Component data */
  component?: Record<string, unknown>;
  /** Event data */
  event?: Record<string, unknown>;
  /** Application state */
  state?: Record<string, unknown>;
  /** User data */
  user?: Record<string, unknown>;
  /** Custom variables */
  [key: string]: unknown;
}

/**
 * Get nested value from object using dot notation path
 */
function getNestedValue(obj: unknown, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    if (typeof current === 'object') {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }

  return current;
}

/**
 * Interpolate template string with context values
 */
export function interpolateTemplate(template: string, context: TemplateContext): string {
  return template.replace(TEMPLATE_PATTERN, (_match, path: string) => {
    const trimmedPath = path.trim();
    const value = getNestedValue(context, trimmedPath);

    if (value === undefined || value === null) {
      return '';
    }

    if (typeof value === 'object') {
      return JSON.stringify(value);
    }

    return String(value);
  });
}

/**
 * Interpolate an unknown value recursively
 */
export function interpolateValue(value: unknown, context: TemplateContext): unknown {
  if (typeof value === 'string') {
    return interpolateTemplate(value, context);
  }

  if (Array.isArray(value)) {
    return value.map((item) => interpolateValue(item, context));
  }

  if (typeof value === 'object' && value !== null) {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      result[key] = interpolateValue(val, context);
    }
    return result;
  }

  return value;
}

/**
 * Parse and validate an action binding
 */
export function parseActionBinding(input: unknown): ActionBinding | null {
  const result = ActionBindingSchema.safeParse(input);
  return result.success ? result.data : null;
}

/**
 * Parse and validate an action
 */
export function parseAction(input: unknown): Action | null {
  const result = ActionSchema.safeParse(input);
  return result.success ? result.data : null;
}

/**
 * State update handler type
 */
export type StateUpdateHandler = (
  path: string,
  value: unknown,
  operation: 'set' | 'merge' | 'delete' | 'append' | 'prepend'
) => void;

/**
 * Navigate handler type
 */
export type NavigateHandler = (target: string, params?: Record<string, unknown>, replace?: boolean) => void;

/**
 * Dismiss handler type
 */
export type DismissHandler = (targetId?: string, reason?: string) => void;

/**
 * Custom action handler type
 */
export type CustomActionHandler = (name: string, payload?: Record<string, unknown>) => void;

/**
 * Action executor configuration
 */
export interface ActionExecutorConfig {
  /** Event sink for emitting events */
  eventSink: IEventSink;

  /** Handler for state updates */
  onStateUpdate?: StateUpdateHandler;

  /** Handler for navigation */
  onNavigate?: NavigateHandler;

  /** Handler for dismiss */
  onDismiss?: DismissHandler;

  /** Handler for custom actions */
  onCustomAction?: CustomActionHandler;

  /** Default context for template interpolation */
  defaultContext?: TemplateContext;
}

/**
 * Action executor - executes actions and emits events
 */
export class ActionExecutor {
  private config: ActionExecutorConfig;
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(config: ActionExecutorConfig) {
    this.config = config;
  }

  /**
   * Execute a single action
   */
  execute(action: Action, context: TemplateContext = {}): UIEvent | null {
    const mergedContext = { ...this.config.defaultContext, ...context };

    // Check condition
    if (action.condition) {
      if (!this.evaluateCondition(action.condition, mergedContext)) {
        return null;
      }
    }

    switch (action.type) {
      case 'sendMessage':
        return this.executeSendMessage(action, mergedContext);
      case 'updateState':
        return this.executeUpdateState(action, mergedContext);
      case 'dismiss':
        return this.executeDismiss(action, mergedContext);
      case 'navigate':
        return this.executeNavigate(action, mergedContext);
      case 'custom':
        return this.executeCustom(action, mergedContext);
    }
  }

  /**
   * Execute multiple actions
   */
  executeAll(actions: Action[], context: TemplateContext = {}): UIEvent[] {
    const events: UIEvent[] = [];
    for (const action of actions) {
      const event = this.execute(action, context);
      if (event) {
        events.push(event);
      }
    }
    return events;
  }

  /**
   * Execute an action binding
   */
  executeBinding(binding: ActionBinding, context: TemplateContext = {}): UIEvent[] {
    const mergedContext = {
      ...this.config.defaultContext,
      ...context,
      binding: {
        trigger: binding.trigger,
        componentId: binding.componentId,
      },
    };

    // Handle debouncing
    if (binding.debounceMs && binding.debounceMs > 0) {
      const key = `${binding.componentId ?? ''}-${binding.trigger}`;
      const existingTimer = this.debounceTimers.get(key);

      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      return new Promise((resolve) => {
        const timer = setTimeout(() => {
          this.debounceTimers.delete(key);
          resolve(this.executeAll(binding.actions, mergedContext));
        }, binding.debounceMs);

        this.debounceTimers.set(key, timer);
      }) as unknown as UIEvent[];
    }

    return this.executeAll(binding.actions, mergedContext);
  }

  /**
   * Execute sendMessage action
   */
  private executeSendMessage(action: SendMessageAction, context: TemplateContext): UIEvent {
    const message = interpolateTemplate(action.message, context);
    const metadata = action.metadata
      ? (interpolateValue(action.metadata, context) as Record<string, unknown>)
      : undefined;

    const event = createUIEvent('message.request', { content: message, metadata });
    this.config.eventSink.emit(event);
    return event;
  }

  /**
   * Execute updateState action
   */
  private executeUpdateState(action: UpdateStateAction, context: TemplateContext): UIEvent {
    const path = interpolateTemplate(action.path, context);
    const value = interpolateValue(action.value, context);
    const operation = action.operation ?? 'set';

    // Call local state update handler
    if (this.config.onStateUpdate) {
      this.config.onStateUpdate(path, value, operation);
    }

    const event = createUIEvent('action.updateState', { path, value, operation });
    this.config.eventSink.emit(event);
    return event;
  }

  /**
   * Execute dismiss action
   */
  private executeDismiss(action: DismissAction, context: TemplateContext): UIEvent {
    const targetId = action.targetId
      ? interpolateTemplate(action.targetId, context)
      : undefined;
    const reason = action.reason
      ? interpolateTemplate(action.reason, context)
      : undefined;

    // Call local dismiss handler
    if (this.config.onDismiss) {
      this.config.onDismiss(targetId, reason);
    }

    const event = createUIEvent('action.dismiss', { targetId, reason });
    this.config.eventSink.emit(event);
    return event;
  }

  /**
   * Execute navigate action
   */
  private executeNavigate(action: NavigateAction, context: TemplateContext): UIEvent {
    const target = interpolateTemplate(action.target, context);
    const params = action.params
      ? (interpolateValue(action.params, context) as Record<string, unknown>)
      : undefined;

    // Call local navigate handler
    if (this.config.onNavigate) {
      this.config.onNavigate(target, params, action.replace);
    }

    const event = createUIEvent('action.navigate', { target, params, replace: action.replace });
    this.config.eventSink.emit(event);
    return event;
  }

  /**
   * Execute custom action
   */
  private executeCustom(action: CustomAction, context: TemplateContext): UIEvent {
    const name = interpolateTemplate(action.name, context);
    const payload = action.payload
      ? (interpolateValue(action.payload, context) as Record<string, unknown>)
      : undefined;

    // Call local custom action handler
    if (this.config.onCustomAction) {
      this.config.onCustomAction(name, payload);
    }

    const event = createUIEvent('action.custom', { actionName: name, ...payload });
    this.config.eventSink.emit(event);
    return event;
  }

  /**
   * Evaluate a condition expression
   * Supports simple expressions like:
   * - "state.user.authenticated"
   * - "component.value > 0"
   * - "event.key === 'Enter'"
   */
  private evaluateCondition(condition: string, context: TemplateContext): boolean {
    try {
      // Simple path check (e.g., "state.user.authenticated")
      if (/^[a-zA-Z_][a-zA-Z0-9_.]*$/.test(condition)) {
        const value = getNestedValue(context, condition);
        return Boolean(value);
      }

      // For more complex expressions, we use a simple evaluator
      // This is limited for security reasons
      const interpolated = interpolateTemplate(condition, context);

      // Handle simple comparisons
      const comparisonMatch = interpolated.match(/^(.+?)\s*(===|!==|==|!=|>=|<=|>|<)\s*(.+)$/);
      if (comparisonMatch) {
        const [, leftStr, op, rightStr] = comparisonMatch;
        const left = this.parseValue(leftStr!.trim());
        const right = this.parseValue(rightStr!.trim());

        switch (op) {
          case '===':
          case '==':
            return left === right;
          case '!==':
          case '!=':
            return left !== right;
          case '>':
            return Number(left) > Number(right);
          case '<':
            return Number(left) < Number(right);
          case '>=':
            return Number(left) >= Number(right);
          case '<=':
            return Number(left) <= Number(right);
        }
      }

      // Handle boolean expressions
      if (interpolated === 'true') return true;
      if (interpolated === 'false') return false;

      // Default: treat as truthy check
      return Boolean(interpolated && interpolated !== 'undefined' && interpolated !== 'null');
    } catch {
      return false;
    }
  }

  /**
   * Parse a value string to its actual type
   */
  private parseValue(str: string): unknown {
    // Remove quotes for strings
    if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"))) {
      return str.slice(1, -1);
    }

    // Parse numbers
    const num = Number(str);
    if (!isNaN(num)) {
      return num;
    }

    // Parse booleans
    if (str === 'true') return true;
    if (str === 'false') return false;
    if (str === 'null') return null;
    if (str === 'undefined') return undefined;

    return str;
  }

  /**
   * Clear all debounce timers
   */
  clearDebounceTimers(): void {
    Array.from(this.debounceTimers.values()).forEach((timer) => {
      clearTimeout(timer);
    });
    this.debounceTimers.clear();
  }

  /**
   * Destroy the executor
   */
  destroy(): void {
    this.clearDebounceTimers();
  }
}

/**
 * Action builder helpers
 */
export const Actions = {
  /**
   * Create a sendMessage action
   */
  sendMessage(message: string, metadata?: Record<string, unknown>): SendMessageAction {
    return { type: 'sendMessage', message, metadata };
  },

  /**
   * Create an updateState action
   */
  updateState(
    path: string,
    value: unknown,
    operation?: 'set' | 'merge' | 'delete' | 'append' | 'prepend'
  ): UpdateStateAction {
    return { type: 'updateState', path, value, operation: operation ?? 'set' };
  },

  /**
   * Create a dismiss action
   */
  dismiss(targetId?: string, reason?: string): DismissAction {
    return { type: 'dismiss', targetId, reason };
  },

  /**
   * Create a navigate action
   */
  navigate(target: string, params?: Record<string, unknown>, replace?: boolean): NavigateAction {
    return { type: 'navigate', target, params, replace };
  },

  /**
   * Create a custom action
   */
  custom(name: string, payload?: Record<string, unknown>): CustomAction {
    return { type: 'custom', name, payload };
  },
};

/**
 * Action binding builder helpers
 */
export const Bindings = {
  /**
   * Create an action binding for click events
   */
  onClick(actions: Action[], componentId?: string): ActionBinding {
    return { trigger: 'click', componentId, actions };
  },

  /**
   * Create an action binding for submit events
   */
  onSubmit(actions: Action[], componentId?: string): ActionBinding {
    return { trigger: 'submit', componentId, actions };
  },

  /**
   * Create an action binding for change events
   */
  onChange(actions: Action[], componentId?: string): ActionBinding {
    return { trigger: 'change', componentId, actions };
  },

  /**
   * Create an action binding for key press events
   */
  onKeyPress(key: string, actions: Action[], componentId?: string): ActionBinding {
    return {
      trigger: `keypress:${key}`,
      componentId,
      actions,
    };
  },

  /**
   * Create a debounced action binding
   */
  debounced(trigger: string, actions: Action[], debounceMs: number, componentId?: string): ActionBinding {
    return { trigger, componentId, actions, debounceMs };
  },
};

/**
 * Create an action executor with default configuration
 */
export function createActionExecutor(config: ActionExecutorConfig): ActionExecutor {
  return new ActionExecutor(config);
}
