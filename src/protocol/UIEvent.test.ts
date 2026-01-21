/**
 * UIEvent Tests (UOW-1001)
 *
 * Tests for the UIEvent envelope and validation.
 */

import { describe, it, expect } from 'vitest';
import {
  UIEventSchema,
  UIEventTypeSchema,
  UserInputPayloadSchema,
  ButtonClickPayloadSchema,
  SelectionChangePayloadSchema,
  FocusChangePayloadSchema,
  KeyPressPayloadSchema,
  ScrollPayloadSchema,
  MessageRequestPayloadSchema,
  ErrorPayloadSchema,
  LifecyclePayloadSchema,
  validateUIEvent,
  validateUIEventWithError,
  createUIEvent,
  isEventType,
  UIEvents,
  serializeUIEvent,
  deserializeUIEvent,
  type UIEvent,
} from './UIEvent.js';

describe('UIEvent', () => {
  describe('UIEventTypeSchema', () => {
    it('should accept valid event types', () => {
      const validTypes = [
        'user_input',
        'button_click',
        'selection_change',
        'focus_change',
        'key_press',
        'scroll',
        'action.sendMessage',
        'action.updateState',
        'action.dismiss',
        'action.navigate',
        'action.custom',
        'message.request',
        'message.response',
        'lifecycle',
        'resize',
        'error',
        'metrics',
        'debug',
      ];

      for (const type of validTypes) {
        const result = UIEventTypeSchema.safeParse(type);
        expect(result.success).toBe(true);
      }
    });

    it('should reject invalid event types', () => {
      const result = UIEventTypeSchema.safeParse('invalid_type');
      expect(result.success).toBe(false);
    });
  });

  describe('UIEventSchema', () => {
    it('should validate a complete UIEvent', () => {
      const event = {
        eventType: 'user_input',
        timestamp: '2024-01-01T00:00:00.000Z',
        componentId: 'input-1',
        payload: { input: 'hello' },
        correlationId: 'corr-123',
        sequence: 1,
        version: '1.0',
      };

      const result = UIEventSchema.safeParse(event);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.eventType).toBe('user_input');
        expect(result.data.componentId).toBe('input-1');
        expect(result.data.version).toBe('1.0');
      }
    });

    it('should validate minimal UIEvent', () => {
      const event = {
        eventType: 'lifecycle',
        timestamp: '2024-01-01T00:00:00.000Z',
        payload: { event: 'ready' },
      };

      const result = UIEventSchema.safeParse(event);
      expect(result.success).toBe(true);
    });

    it('should reject UIEvent without eventType', () => {
      const event = {
        timestamp: '2024-01-01T00:00:00.000Z',
        payload: {},
      };

      const result = UIEventSchema.safeParse(event);
      expect(result.success).toBe(false);
    });

    it('should reject UIEvent without timestamp', () => {
      const event = {
        eventType: 'user_input',
        payload: {},
      };

      const result = UIEventSchema.safeParse(event);
      expect(result.success).toBe(false);
    });

    it('should reject UIEvent without payload', () => {
      const event = {
        eventType: 'user_input',
        timestamp: '2024-01-01T00:00:00.000Z',
      };

      const result = UIEventSchema.safeParse(event);
      expect(result.success).toBe(false);
    });

    it('should reject invalid timestamp format', () => {
      const event = {
        eventType: 'user_input',
        timestamp: 'not-a-date',
        payload: {},
      };

      const result = UIEventSchema.safeParse(event);
      expect(result.success).toBe(false);
    });

    it('should default version to 1.0', () => {
      const event = {
        eventType: 'user_input',
        timestamp: '2024-01-01T00:00:00.000Z',
        payload: {},
      };

      const result = UIEventSchema.safeParse(event);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.version).toBe('1.0');
      }
    });

    it('should accept optional fields as undefined', () => {
      const event = {
        eventType: 'user_input',
        timestamp: '2024-01-01T00:00:00.000Z',
        payload: {},
        componentId: undefined,
        correlationId: undefined,
        sequence: undefined,
      };

      const result = UIEventSchema.safeParse(event);
      expect(result.success).toBe(true);
    });
  });

  describe('Payload Schemas', () => {
    describe('UserInputPayloadSchema', () => {
      it('should validate user input payload', () => {
        const payload = { input: 'test input', inputType: 'text' };
        const result = UserInputPayloadSchema.safeParse(payload);
        expect(result.success).toBe(true);
      });

      it('should accept input without inputType', () => {
        const payload = { input: 'test' };
        const result = UserInputPayloadSchema.safeParse(payload);
        expect(result.success).toBe(true);
      });
    });

    describe('ButtonClickPayloadSchema', () => {
      it('should validate button click payload', () => {
        const payload = { buttonId: 'btn-1', data: { extra: 'info' } };
        const result = ButtonClickPayloadSchema.safeParse(payload);
        expect(result.success).toBe(true);
      });
    });

    describe('SelectionChangePayloadSchema', () => {
      it('should validate selection with index', () => {
        const payload = { selectedIndex: 2 };
        const result = SelectionChangePayloadSchema.safeParse(payload);
        expect(result.success).toBe(true);
      });

      it('should validate selection with ids', () => {
        const payload = { selectedIds: ['id1', 'id2'] };
        const result = SelectionChangePayloadSchema.safeParse(payload);
        expect(result.success).toBe(true);
      });
    });

    describe('FocusChangePayloadSchema', () => {
      it('should validate focus change', () => {
        const payload = { focusedId: 'input-1', previousId: 'button-1' };
        const result = FocusChangePayloadSchema.safeParse(payload);
        expect(result.success).toBe(true);
      });

      it('should allow null focusedId', () => {
        const payload = { focusedId: null };
        const result = FocusChangePayloadSchema.safeParse(payload);
        expect(result.success).toBe(true);
      });
    });

    describe('KeyPressPayloadSchema', () => {
      it('should validate key press with modifiers', () => {
        const payload = { key: 'Enter', ctrl: true, shift: false };
        const result = KeyPressPayloadSchema.safeParse(payload);
        expect(result.success).toBe(true);
      });
    });

    describe('ScrollPayloadSchema', () => {
      it('should validate scroll payload', () => {
        const payload = {
          scrollTop: 100,
          scrollHeight: 1000,
          viewportHeight: 500,
          direction: 'down',
        };
        const result = ScrollPayloadSchema.safeParse(payload);
        expect(result.success).toBe(true);
      });
    });

    describe('MessageRequestPayloadSchema', () => {
      it('should validate message request', () => {
        const payload = {
          content: 'Hello, world!',
          metadata: { source: 'user' },
        };
        const result = MessageRequestPayloadSchema.safeParse(payload);
        expect(result.success).toBe(true);
      });
    });

    describe('ErrorPayloadSchema', () => {
      it('should validate error payload', () => {
        const payload = {
          code: 'ERR_001',
          message: 'Something went wrong',
          recoverable: true,
        };
        const result = ErrorPayloadSchema.safeParse(payload);
        expect(result.success).toBe(true);
      });
    });

    describe('LifecyclePayloadSchema', () => {
      it('should validate lifecycle events', () => {
        const events = ['ready', 'mounted', 'unmounted', 'suspended', 'resumed'];
        for (const event of events) {
          const payload = { event };
          const result = LifecyclePayloadSchema.safeParse(payload);
          expect(result.success).toBe(true);
        }
      });
    });
  });

  describe('validateUIEvent', () => {
    it('should return parsed event for valid input', () => {
      const input = {
        eventType: 'user_input',
        timestamp: '2024-01-01T00:00:00.000Z',
        payload: { input: 'test' },
      };

      const result = validateUIEvent(input);
      expect(result).not.toBeNull();
      expect(result?.eventType).toBe('user_input');
    });

    it('should return null for invalid input', () => {
      const input = { invalid: true };
      const result = validateUIEvent(input);
      expect(result).toBeNull();
    });
  });

  describe('validateUIEventWithError', () => {
    it('should return success with data for valid input', () => {
      const input = {
        eventType: 'lifecycle',
        timestamp: '2024-01-01T00:00:00.000Z',
        payload: { event: 'ready' },
      };

      const result = validateUIEventWithError(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.eventType).toBe('lifecycle');
      }
    });

    it('should return error details for invalid input', () => {
      const input = { eventType: 'invalid' };
      const result = validateUIEventWithError(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
        expect(result.error.issues.length).toBeGreaterThan(0);
      }
    });
  });

  describe('createUIEvent', () => {
    it('should create event with current timestamp', () => {
      const before = new Date().toISOString();
      const event = createUIEvent('user_input', { input: 'test' });
      const after = new Date().toISOString();

      expect(event.eventType).toBe('user_input');
      expect(event.timestamp >= before).toBe(true);
      expect(event.timestamp <= after).toBe(true);
      expect(event.version).toBe('1.0');
    });

    it('should include optional parameters', () => {
      const event = createUIEvent('button_click', { buttonId: 'btn-1' }, {
        componentId: 'comp-1',
        correlationId: 'corr-123',
        sequence: 5,
      });

      expect(event.componentId).toBe('comp-1');
      expect(event.correlationId).toBe('corr-123');
      expect(event.sequence).toBe(5);
    });
  });

  describe('isEventType', () => {
    it('should return true for matching type', () => {
      const event = createUIEvent('user_input', { input: 'test' });
      expect(isEventType(event, 'user_input')).toBe(true);
    });

    it('should return false for non-matching type', () => {
      const event = createUIEvent('user_input', { input: 'test' });
      expect(isEventType(event, 'button_click')).toBe(false);
    });
  });

  describe('UIEvents factory', () => {
    it('should create userInput event', () => {
      const event = UIEvents.userInput('hello', 'input-1', 'text');
      expect(event.eventType).toBe('user_input');
      expect(event.payload).toEqual({ input: 'hello', inputType: 'text' });
      expect(event.componentId).toBe('input-1');
    });

    it('should create buttonClick event', () => {
      const event = UIEvents.buttonClick('btn-1', 'comp-1', { extra: 'data' });
      expect(event.eventType).toBe('button_click');
      expect(event.payload).toEqual({ buttonId: 'btn-1', data: { extra: 'data' } });
    });

    it('should create selectionChange event', () => {
      const event = UIEvents.selectionChange('list-1', 2, ['item-2'], 'value-2');
      expect(event.eventType).toBe('selection_change');
      expect(event.componentId).toBe('list-1');
    });

    it('should create focusChange event', () => {
      const event = UIEvents.focusChange('input-2', 'input-1');
      expect(event.eventType).toBe('focus_change');
      expect(event.payload).toEqual({ focusedId: 'input-2', previousId: 'input-1' });
    });

    it('should create keyPress event', () => {
      const event = UIEvents.keyPress('Enter', { ctrl: true });
      expect(event.eventType).toBe('key_press');
      expect(event.payload).toEqual({ key: 'Enter', ctrl: true });
    });

    it('should create scroll event', () => {
      const event = UIEvents.scroll('scroll-1', 100, 1000, 500);
      expect(event.eventType).toBe('scroll');
      expect(event.componentId).toBe('scroll-1');
    });

    it('should create messageRequest event', () => {
      const event = UIEvents.messageRequest('Hello!', { source: 'user' }, 'corr-123');
      expect(event.eventType).toBe('message.request');
      expect(event.correlationId).toBe('corr-123');
    });

    it('should create lifecycle event', () => {
      const event = UIEvents.lifecycle('ready');
      expect(event.eventType).toBe('lifecycle');
      expect(event.payload).toEqual({ event: 'ready' });
    });

    it('should create error event', () => {
      const event = UIEvents.error('ERR_001', 'Error message', 'comp-1', true);
      expect(event.eventType).toBe('error');
      expect(event.payload).toEqual({
        code: 'ERR_001',
        message: 'Error message',
        recoverable: true,
      });
    });

    it('should create navigate event', () => {
      const event = UIEvents.navigate('/settings', { tab: 'general' });
      expect(event.eventType).toBe('action.navigate');
      expect(event.payload).toEqual({ target: '/settings', params: { tab: 'general' } });
    });

    it('should create dismiss event', () => {
      const event = UIEvents.dismiss('modal-1', 'user_cancelled');
      expect(event.eventType).toBe('action.dismiss');
      expect(event.payload).toEqual({ targetId: 'modal-1', reason: 'user_cancelled' });
    });

    it('should create updateState event', () => {
      const event = UIEvents.updateState('/user/name', 'John', 'set');
      expect(event.eventType).toBe('action.updateState');
      expect(event.payload).toEqual({ path: '/user/name', value: 'John', operation: 'set' });
    });

    it('should create custom event', () => {
      const event = UIEvents.custom('myAction', { foo: 'bar' }, 'comp-1');
      expect(event.eventType).toBe('action.custom');
      expect(event.payload).toEqual({ actionName: 'myAction', foo: 'bar' });
    });
  });

  describe('serializeUIEvent', () => {
    it('should serialize event to JSON string', () => {
      const event = createUIEvent('user_input', { input: 'test' });
      const json = serializeUIEvent(event);

      expect(typeof json).toBe('string');
      expect(json).toContain('"eventType":"user_input"');
    });
  });

  describe('deserializeUIEvent', () => {
    it('should deserialize valid JSON to UIEvent', () => {
      const original = createUIEvent('lifecycle', { event: 'ready' });
      const json = serializeUIEvent(original);
      const deserialized = deserializeUIEvent(json);

      expect(deserialized).not.toBeNull();
      expect(deserialized?.eventType).toBe('lifecycle');
    });

    it('should return null for invalid JSON', () => {
      const result = deserializeUIEvent('not valid json');
      expect(result).toBeNull();
    });

    it('should return null for valid JSON but invalid event', () => {
      const result = deserializeUIEvent('{"invalid": true}');
      expect(result).toBeNull();
    });
  });
});
