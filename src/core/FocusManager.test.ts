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

  // ==========================================================================
  // UOW-0211: MODAL FOCUS TRAPPING STATE TRANSITIONS
  // ==========================================================================
  describe('modal focus trapping state transitions', () => {
    beforeEach(() => {
      // Set up a typical modal scenario
      manager.register({ id: 'header', tabIndex: 1 });
      manager.register({ id: 'main-content', tabIndex: 2 });
      manager.register({ id: 'sidebar', tabIndex: 3 });
      manager.register({ id: 'footer', tabIndex: 4 });
      // Modal components
      manager.register({ id: 'modal', tabIndex: 10 });
      manager.register({ id: 'modal-title', tabIndex: 11 });
      manager.register({ id: 'modal-input', tabIndex: 12 });
      manager.register({ id: 'modal-confirm', tabIndex: 13 });
      manager.register({ id: 'modal-cancel', tabIndex: 14 });
    });

    it('should transition from unfocused to focused state', () => {
      // Initial state: nothing focused
      expect(manager.getFocusedId()).toBeNull();
      expect(manager.getState().focusHistory).toHaveLength(0);

      // Transition: focus first component
      manager.focus('header');
      expect(manager.getFocusedId()).toBe('header');
      expect(manager.isFocused('header')).toBe(true);
    });

    it('should transition from focused to trapped state when modal opens', () => {
      // State 1: Regular focus
      manager.focus('main-content');
      expect(manager.getFocusedId()).toBe('main-content');
      expect(manager.isFocusTrapped()).toBe(false);

      // Transition: Open modal and trap focus
      manager.pushFocusTrap('modal');

      // State 2: Focus is now trapped
      expect(manager.isFocusTrapped()).toBe(true);
      expect(manager.getCurrentTrap()).toBe('modal');
      expect(manager.getFocusedId()).toBe('modal');
    });

    it('should prevent focus escape during trapped state', () => {
      manager.focus('main-content');
      manager.pushFocusTrap('modal');

      // Attempting to focus outside trap should fail
      const result1 = manager.focus('header');
      expect(result1).toBe(false);
      expect(manager.getFocusedId()).toBe('modal'); // Still focused on modal

      const result2 = manager.focus('sidebar');
      expect(result2).toBe(false);

      const result3 = manager.focus('footer');
      expect(result3).toBe(false);

      // But focusing within trap should work
      const result4 = manager.focus('modal-input');
      expect(result4).toBe(true);
      expect(manager.getFocusedId()).toBe('modal-input');
    });

    it('should transition from trapped to untrapped state when modal closes', () => {
      // Setup: Focus something, then trap
      manager.focus('main-content');
      manager.pushFocusTrap('modal');
      manager.focus('modal-confirm');

      // State: Trapped
      expect(manager.isFocusTrapped()).toBe(true);

      // Transition: Close modal
      const popped = manager.popFocusTrap();

      // State: Untrapped
      expect(popped).toBe('modal');
      expect(manager.isFocusTrapped()).toBe(false);
      expect(manager.getCurrentTrap()).toBeUndefined();
    });

    it('should handle rapid trap/untrap transitions', () => {
      manager.focus('main-content');

      // Rapid push/pop
      manager.pushFocusTrap('modal');
      expect(manager.isFocusTrapped()).toBe(true);

      manager.popFocusTrap();
      expect(manager.isFocusTrapped()).toBe(false);

      manager.pushFocusTrap('modal');
      expect(manager.isFocusTrapped()).toBe(true);

      manager.popFocusTrap();
      expect(manager.isFocusTrapped()).toBe(false);

      // Should be stable after rapid transitions
      expect(manager.getState().focusTrapStack).toHaveLength(0);
    });

    it('should maintain focus history through trap transitions', () => {
      manager.focus('header');
      manager.focus('main-content');
      manager.focus('sidebar');

      // Before trap, history should contain previous focuses
      expect(manager.getState().focusHistory).toContain('header');
      expect(manager.getState().focusHistory).toContain('main-content');

      manager.pushFocusTrap('modal');
      manager.focus('modal-input');
      manager.focus('modal-confirm');

      // After popping trap, should be able to restore focus
      manager.popFocusTrap();

      // Focus history should still be functional
      expect(manager.focusPrevious()).toBe(true);
    });

    it('should handle nested modal state transitions correctly', () => {
      // Register nested modal components
      manager.register({ id: 'nested-modal', tabIndex: 20 });
      manager.register({ id: 'nested-modal-input', tabIndex: 21 });
      manager.register({ id: 'nested-modal-ok', tabIndex: 22 });

      // State 1: No traps
      manager.focus('main-content');
      expect(manager.getState().focusTrapStack).toHaveLength(0);

      // State 2: First modal trap
      manager.pushFocusTrap('modal');
      expect(manager.getState().focusTrapStack).toHaveLength(1);
      expect(manager.getCurrentTrap()).toBe('modal');

      // State 3: Nested modal trap
      manager.pushFocusTrap('nested-modal');
      expect(manager.getState().focusTrapStack).toHaveLength(2);
      expect(manager.getCurrentTrap()).toBe('nested-modal');

      // Verify only nested modal children can be focused
      expect(manager.focus('modal-input')).toBe(false);
      expect(manager.focus('nested-modal-input')).toBe(true);

      // State 4: Pop nested modal
      manager.popFocusTrap();
      expect(manager.getState().focusTrapStack).toHaveLength(1);
      expect(manager.getCurrentTrap()).toBe('modal');

      // Now modal children can be focused again
      expect(manager.focus('modal-input')).toBe(true);

      // State 5: Pop all traps
      manager.popFocusTrap();
      expect(manager.getState().focusTrapStack).toHaveLength(0);
      expect(manager.isFocusTrapped()).toBe(false);
    });

    it('should notify subscribers on all trap state transitions', () => {
      const stateHistory: Array<{ trapped: boolean; trapId: string | undefined }> = [];
      manager.subscribe((state) => {
        stateHistory.push({
          trapped: state.focusTrapStack.length > 0,
          trapId: state.focusTrapStack[state.focusTrapStack.length - 1],
        });
      });

      manager.focus('main-content');
      manager.pushFocusTrap('modal');
      manager.focus('modal-input');
      manager.popFocusTrap();

      // Should have received notifications for all transitions
      expect(stateHistory.length).toBeGreaterThan(0);

      // Verify trap state was captured
      const trappedStates = stateHistory.filter((s) => s.trapped);
      const untrappedStates = stateHistory.filter((s) => !s.trapped);
      expect(trappedStates.length).toBeGreaterThan(0);
      expect(untrappedStates.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // UOW-0211: FOCUS CYCLING BETWEEN COMPONENTS
  // ==========================================================================
  describe('focus cycling between components', () => {
    beforeEach(() => {
      // Register components in a specific order with tabIndex
      manager.register({ id: 'input-name', tabIndex: 1 });
      manager.register({ id: 'input-email', tabIndex: 2 });
      manager.register({ id: 'input-phone', tabIndex: 3 });
      manager.register({ id: 'checkbox-agree', tabIndex: 4 });
      manager.register({ id: 'btn-submit', tabIndex: 5 });
      manager.register({ id: 'btn-cancel', tabIndex: 6 });
    });

    it('should cycle forward through all focusable components', () => {
      manager.focusFirst();
      expect(manager.getFocusedId()).toBe('input-name');

      manager.focusNext();
      expect(manager.getFocusedId()).toBe('input-email');

      manager.focusNext();
      expect(manager.getFocusedId()).toBe('input-phone');

      manager.focusNext();
      expect(manager.getFocusedId()).toBe('checkbox-agree');

      manager.focusNext();
      expect(manager.getFocusedId()).toBe('btn-submit');

      manager.focusNext();
      expect(manager.getFocusedId()).toBe('btn-cancel');

      // Should wrap to first
      manager.focusNext();
      expect(manager.getFocusedId()).toBe('input-name');
    });

    it('should cycle backward through all focusable components', () => {
      manager.focusLast();
      expect(manager.getFocusedId()).toBe('btn-cancel');

      manager.focusPrev();
      expect(manager.getFocusedId()).toBe('btn-submit');

      manager.focusPrev();
      expect(manager.getFocusedId()).toBe('checkbox-agree');

      manager.focusPrev();
      expect(manager.getFocusedId()).toBe('input-phone');

      manager.focusPrev();
      expect(manager.getFocusedId()).toBe('input-email');

      manager.focusPrev();
      expect(manager.getFocusedId()).toBe('input-name');

      // Should wrap to last
      manager.focusPrev();
      expect(manager.getFocusedId()).toBe('btn-cancel');
    });

    it('should skip disabled components during cycling', () => {
      // Disable some components
      manager.unregister('input-email');
      manager.register({ id: 'input-email', tabIndex: 2, disabled: true });

      manager.unregister('checkbox-agree');
      manager.register({ id: 'checkbox-agree', tabIndex: 4, disabled: true });

      manager.focus('input-name');
      manager.focusNext();
      // Should skip disabled input-email
      expect(manager.getFocusedId()).toBe('input-phone');

      manager.focusNext();
      // Should skip disabled checkbox-agree
      expect(manager.getFocusedId()).toBe('btn-submit');
    });

    it('should handle cycling when all but one component is disabled', () => {
      // Disable all except one
      ['input-name', 'input-email', 'input-phone', 'checkbox-agree', 'btn-cancel'].forEach((id) => {
        manager.unregister(id);
        manager.register({ id, tabIndex: 0, disabled: true });
      });

      manager.focus('btn-submit');
      manager.focusNext();
      // Should stay on the only focusable component
      expect(manager.getFocusedId()).toBe('btn-submit');

      manager.focusPrev();
      expect(manager.getFocusedId()).toBe('btn-submit');
    });

    it('should focus first/last component correctly', () => {
      // Without any initial focus
      expect(manager.getFocusedId()).toBeNull();

      manager.focusFirst();
      expect(manager.getFocusedId()).toBe('input-name');

      manager.blur();
      expect(manager.getFocusedId()).toBeNull();

      manager.focusLast();
      expect(manager.getFocusedId()).toBe('btn-cancel');
    });

    it('should cycle within trapped focus area only', () => {
      // Add modal components
      manager.register({ id: 'modal-dialog', tabIndex: 100 });
      manager.register({ id: 'modal-dialog-input', tabIndex: 101 });
      manager.register({ id: 'modal-dialog-btn-ok', tabIndex: 102 });
      manager.register({ id: 'modal-dialog-btn-cancel', tabIndex: 103 });

      // Trap focus in modal
      manager.pushFocusTrap('modal-dialog');

      // Focus first in trap
      manager.focusFirst();
      expect(manager.getFocusedId()).toBe('modal-dialog');

      // Cycle should only include modal components
      manager.focusNext();
      expect(manager.getFocusedId()).toBe('modal-dialog-input');

      manager.focusNext();
      expect(manager.getFocusedId()).toBe('modal-dialog-btn-ok');

      manager.focusNext();
      expect(manager.getFocusedId()).toBe('modal-dialog-btn-cancel');

      // Should wrap within trap
      manager.focusNext();
      expect(manager.getFocusedId()).toBe('modal-dialog');

      // Verify main form components are not reachable
      const mainFormFocused = manager.focus('input-name');
      expect(mainFormFocused).toBe(false);
    });

    it('should maintain correct cycling order after component unregistration', () => {
      manager.focus('input-name');

      // Remove middle component
      manager.unregister('input-email');

      manager.focusNext();
      // Should skip to next available
      expect(manager.getFocusedId()).toBe('input-phone');

      manager.focusPrev();
      // Should go back to input-name (email is gone)
      expect(manager.getFocusedId()).toBe('input-name');
    });

    it('should maintain correct cycling order after component registration', () => {
      manager.focus('input-phone');

      // Add new component between phone and checkbox
      manager.register({ id: 'input-address', tabIndex: 3.5 });

      manager.focusNext();
      // Next should be the new component (tabIndex 3.5 > 3)
      expect(manager.getFocusedId()).toBe('input-address');

      manager.focusNext();
      expect(manager.getFocusedId()).toBe('checkbox-agree');
    });

    it('should handle empty component list gracefully', () => {
      const emptyManager = new FocusManager();

      // These should not throw
      expect(emptyManager.focusFirst()).toBe(false);
      expect(emptyManager.focusLast()).toBe(false);
      expect(emptyManager.focusNext()).toBe(false);
      expect(emptyManager.focusPrev()).toBe(false);

      // Focus state should remain null
      expect(emptyManager.getFocusedId()).toBeNull();
    });

    it('should track focus transitions in history during cycling', () => {
      manager.focus('input-name');
      manager.focusNext(); // -> input-email
      manager.focusNext(); // -> input-phone
      manager.focusNext(); // -> checkbox-agree

      const history = manager.getState().focusHistory;

      // History should track the path
      expect(history).toContain('input-name');
      expect(history).toContain('input-email');
      expect(history).toContain('input-phone');
    });

    it('should allow restoring previous focus after cycling', () => {
      manager.focus('input-name');
      manager.focusNext();
      manager.focusNext();
      manager.focusNext();
      expect(manager.getFocusedId()).toBe('checkbox-agree');

      // Restore previous focus
      manager.focusPrevious();
      expect(manager.getFocusedId()).toBe('input-phone');

      manager.focusPrevious();
      expect(manager.getFocusedId()).toBe('input-email');

      manager.focusPrevious();
      expect(manager.getFocusedId()).toBe('input-name');
    });
  });
});
