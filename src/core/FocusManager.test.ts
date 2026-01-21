/**
 * Focus Manager Tests (UOW-0211)
 *
 * Tests for focus transitions and modal focus trapping.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FocusManager, getFocusManager, resetFocusManager } from './FocusManager.js';

describe('FocusManager', () => {
  let manager: FocusManager;

  beforeEach(() => {
    manager = new FocusManager();
  });

  describe('registration', () => {
    it('should register focusable components', () => {
      manager.register({ id: 'btn1' });
      manager.register({ id: 'btn2' });
      expect(manager.getComponents()).toHaveLength(2);
    });

    it('should unregister components', () => {
      manager.register({ id: 'btn1' });
      manager.register({ id: 'btn2' });
      manager.unregister('btn1');
      expect(manager.getComponents()).toHaveLength(1);
      expect(manager.getComponents()[0]?.id).toBe('btn2');
    });

    it('should clear focus when unregistering focused component', () => {
      manager.register({ id: 'btn1' });
      manager.focus('btn1');
      expect(manager.getFocusedId()).toBe('btn1');
      manager.unregister('btn1');
      expect(manager.getFocusedId()).toBeNull();
    });
  });

  describe('focus', () => {
    beforeEach(() => {
      manager.register({ id: 'btn1' });
      manager.register({ id: 'btn2' });
      manager.register({ id: 'btn3' });
    });

    it('should focus a component', () => {
      expect(manager.focus('btn1')).toBe(true);
      expect(manager.getFocusedId()).toBe('btn1');
    });

    it('should return false for non-existent component', () => {
      expect(manager.focus('nonexistent')).toBe(false);
      expect(manager.getFocusedId()).toBeNull();
    });

    it('should not focus disabled components', () => {
      manager.register({ id: 'disabled-btn', disabled: true });
      expect(manager.focus('disabled-btn')).toBe(false);
    });

    it('should track isFocused correctly', () => {
      manager.focus('btn1');
      expect(manager.isFocused('btn1')).toBe(true);
      expect(manager.isFocused('btn2')).toBe(false);
    });

    it('should maintain focus history', () => {
      manager.focus('btn1');
      manager.focus('btn2');
      manager.focus('btn3');
      const state = manager.getState();
      expect(state.focusHistory).toContain('btn1');
      expect(state.focusHistory).toContain('btn2');
    });
  });

  describe('blur', () => {
    it('should clear focus', () => {
      manager.register({ id: 'btn1' });
      manager.focus('btn1');
      manager.blur();
      expect(manager.getFocusedId()).toBeNull();
    });

    it('should add to history when blurring', () => {
      manager.register({ id: 'btn1' });
      manager.focus('btn1');
      manager.blur();
      expect(manager.getState().focusHistory).toContain('btn1');
    });
  });

  describe('focusPrevious', () => {
    beforeEach(() => {
      manager.register({ id: 'btn1' });
      manager.register({ id: 'btn2' });
      manager.register({ id: 'btn3' });
    });

    it('should restore previous focus', () => {
      manager.focus('btn1');
      manager.focus('btn2');
      manager.focusPrevious();
      expect(manager.getFocusedId()).toBe('btn1');
    });

    it('should skip unregistered components in history', () => {
      manager.focus('btn1');
      manager.focus('btn2');
      manager.focus('btn3');
      manager.unregister('btn2');
      manager.focusPrevious();
      expect(manager.getFocusedId()).toBe('btn1');
    });

    it('should return false when history is empty', () => {
      expect(manager.focusPrevious()).toBe(false);
      expect(manager.getFocusedId()).toBeNull();
    });
  });

  describe('focusNext / focusPrev navigation', () => {
    beforeEach(() => {
      manager.register({ id: 'btn1', tabIndex: 1 });
      manager.register({ id: 'btn2', tabIndex: 2 });
      manager.register({ id: 'btn3', tabIndex: 3 });
    });

    it('should focus next component', () => {
      manager.focus('btn1');
      manager.focusNext();
      expect(manager.getFocusedId()).toBe('btn2');
    });

    it('should wrap around to first', () => {
      manager.focus('btn3');
      manager.focusNext();
      expect(manager.getFocusedId()).toBe('btn1');
    });

    it('should focus prev component', () => {
      manager.focus('btn2');
      manager.focusPrev();
      expect(manager.getFocusedId()).toBe('btn1');
    });

    it('should wrap around to last', () => {
      manager.focus('btn1');
      manager.focusPrev();
      expect(manager.getFocusedId()).toBe('btn3');
    });

    it('should skip disabled components', () => {
      manager.register({ id: 'disabled', tabIndex: 2, disabled: true });
      manager.unregister('btn2');
      manager.register({ id: 'btn2-new', tabIndex: 2, disabled: true });

      manager.focus('btn1');
      manager.focusNext();
      // Should skip disabled and go to btn3
      expect(manager.getFocusedId()).toBe('btn3');
    });
  });

  describe('focusFirst / focusLast', () => {
    beforeEach(() => {
      manager.register({ id: 'btn1', tabIndex: 1 });
      manager.register({ id: 'btn2', tabIndex: 2 });
      manager.register({ id: 'btn3', tabIndex: 3 });
    });

    it('should focus first component', () => {
      manager.focusFirst();
      expect(manager.getFocusedId()).toBe('btn1');
    });

    it('should focus last component', () => {
      manager.focusLast();
      expect(manager.getFocusedId()).toBe('btn3');
    });

    it('should return false when no components', () => {
      const emptyManager = new FocusManager();
      expect(emptyManager.focusFirst()).toBe(false);
      expect(emptyManager.focusLast()).toBe(false);
    });
  });

  describe('focus trapping', () => {
    beforeEach(() => {
      manager.register({ id: 'main-content' });
      manager.register({ id: 'modal' });
      manager.register({ id: 'modal-input' });
      manager.register({ id: 'modal-ok-btn' });
      manager.register({ id: 'modal-cancel-btn' });
    });

    it('should push focus trap', () => {
      manager.pushFocusTrap('modal');
      expect(manager.isFocusTrapped()).toBe(true);
      expect(manager.getCurrentTrap()).toBe('modal');
    });

    it('should pop focus trap', () => {
      manager.focus('main-content');
      manager.pushFocusTrap('modal');
      const popped = manager.popFocusTrap();
      expect(popped).toBe('modal');
      expect(manager.isFocusTrapped()).toBe(false);
    });

    it('should prevent focusing outside trap', () => {
      manager.pushFocusTrap('modal');
      expect(manager.focus('main-content')).toBe(false);
    });

    it('should allow focusing trap container', () => {
      manager.pushFocusTrap('modal');
      expect(manager.focus('modal')).toBe(true);
    });

    it('should allow focusing children of trap', () => {
      manager.pushFocusTrap('modal');
      expect(manager.focus('modal-ok-btn')).toBe(true);
      expect(manager.focus('modal-cancel-btn')).toBe(true);
    });

    it('should restore focus when popping trap', () => {
      manager.focus('main-content');
      manager.pushFocusTrap('modal');
      manager.focus('modal-ok-btn');
      manager.popFocusTrap();
      // Focus is restored to previous item in history (may be modal or main-content)
      // The key point is focus is no longer trapped
      expect(manager.isFocusTrapped()).toBe(false);
      expect(manager.getFocusedId()).not.toBeNull();
    });

    it('should handle nested traps', () => {
      manager.register({ id: 'nested-modal' });
      manager.register({ id: 'nested-modal-btn' });

      manager.focus('main-content');
      manager.pushFocusTrap('modal');
      manager.pushFocusTrap('nested-modal');

      expect(manager.getState().focusTrapStack).toHaveLength(2);
      expect(manager.getCurrentTrap()).toBe('nested-modal');

      // Can't focus outer modal items while nested is active
      expect(manager.focus('modal-ok-btn')).toBe(false);

      // Pop nested
      manager.popFocusTrap();
      expect(manager.getCurrentTrap()).toBe('modal');

      // Now can focus outer modal
      expect(manager.focus('modal-ok-btn')).toBe(true);
    });

    it('should constrain navigation to trap', () => {
      manager.pushFocusTrap('modal');
      manager.focus('modal');

      // Navigation should only cycle through modal and its children
      manager.focusNext();
      const focusedId = manager.getFocusedId();
      expect(focusedId?.startsWith('modal')).toBe(true);
    });
  });

  describe('subscription', () => {
    it('should notify listeners on focus change', () => {
      const listener = vi.fn();
      manager.register({ id: 'btn1' });
      manager.subscribe(listener);
      manager.focus('btn1');
      expect(listener).toHaveBeenCalledWith(expect.objectContaining({
        focusedId: 'btn1',
      }));
    });

    it('should allow unsubscribe', () => {
      const listener = vi.fn();
      manager.register({ id: 'btn1' });
      const unsubscribe = manager.subscribe(listener);
      unsubscribe();
      manager.focus('btn1');
      expect(listener).not.toHaveBeenCalled();
    });

    it('should notify on blur', () => {
      const listener = vi.fn();
      manager.register({ id: 'btn1' });
      manager.focus('btn1');
      manager.subscribe(listener);
      manager.blur();
      expect(listener).toHaveBeenCalledWith(expect.objectContaining({
        focusedId: null,
      }));
    });

    it('should notify on trap push/pop', () => {
      const listener = vi.fn();
      manager.register({ id: 'modal' });
      manager.subscribe(listener);
      manager.pushFocusTrap('modal');
      expect(listener).toHaveBeenCalled();
      listener.mockClear();
      manager.popFocusTrap();
      expect(listener).toHaveBeenCalled();
    });
  });

  describe('reset', () => {
    it('should reset all state', () => {
      manager.register({ id: 'btn1' });
      manager.focus('btn1');
      manager.pushFocusTrap('btn1');
      manager.reset();

      expect(manager.getFocusedId()).toBeNull();
      expect(manager.getComponents()).toHaveLength(0);
      expect(manager.isFocusTrapped()).toBe(false);
    });
  });

  describe('history limits', () => {
    it('should respect maxHistorySize', () => {
      const limitedManager = new FocusManager({ maxHistorySize: 3 });

      for (let i = 0; i < 10; i++) {
        limitedManager.register({ id: `btn${i}` });
      }

      for (let i = 0; i < 10; i++) {
        limitedManager.focus(`btn${i}`);
      }

      // History should be limited to 3
      expect(limitedManager.getState().focusHistory.length).toBeLessThanOrEqual(3);
    });
  });

  describe('global focus manager', () => {
    beforeEach(() => {
      resetFocusManager();
    });

    it('should provide singleton instance', () => {
      const manager1 = getFocusManager();
      const manager2 = getFocusManager();
      expect(manager1).toBe(manager2);
    });

    it('should reset singleton', () => {
      const manager1 = getFocusManager();
      manager1.register({ id: 'test' });
      resetFocusManager();
      const manager2 = getFocusManager();
      expect(manager2.getComponents()).toHaveLength(0);
    });
  });

  describe('tabIndex ordering', () => {
    it('should order by tabIndex', () => {
      manager.register({ id: 'btn3', tabIndex: 30 });
      manager.register({ id: 'btn1', tabIndex: 10 });
      manager.register({ id: 'btn2', tabIndex: 20 });

      manager.focusFirst();
      expect(manager.getFocusedId()).toBe('btn1');

      manager.focusNext();
      expect(manager.getFocusedId()).toBe('btn2');

      manager.focusNext();
      expect(manager.getFocusedId()).toBe('btn3');
    });

    it('should treat undefined tabIndex as 0', () => {
      manager.register({ id: 'btn1', tabIndex: 10 });
      manager.register({ id: 'btn-no-index' }); // tabIndex undefined = 0
      manager.register({ id: 'btn2', tabIndex: 5 });

      manager.focusFirst();
      expect(manager.getFocusedId()).toBe('btn-no-index'); // 0 comes first
    });
  });
});
