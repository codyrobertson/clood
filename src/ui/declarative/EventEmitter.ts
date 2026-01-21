/**
 * Declarative UI Event Emitter (UOW-0830)
 *
 * Provides a centralized event emitter for declarative UI components
 * to emit interactivity events that can be consumed by the parent application.
 */

import { OutboundEvent, OutboundEventEmitter, createStdoutEmitter } from '../../protocol/OutboundEvents.js';

/**
 * UI Component event types
 */
export type UIEventType =
  | 'button.click'
  | 'list.select'
  | 'list.activate'
  | 'list.selectionChange'
  | 'table.select'
  | 'table.activate'
  | 'modal.close'
  | 'modal.confirm'
  | 'modal.cancel'
  | 'input.change'
  | 'input.submit'
  | 'tabs.change'
  | 'accordion.toggle'
  | 'tree.select'
  | 'tree.expand'
  | 'tree.collapse';

/**
 * Base UI event interface
 */
export interface UIEvent {
  type: UIEventType;
  componentId: string;
  timestamp: string;
  data?: unknown;
}

/**
 * Button click event
 */
export interface ButtonClickUIEvent extends UIEvent {
  type: 'button.click';
  data: {
    buttonId: string;
    label?: string;
  };
}

/**
 * List select event
 */
export interface ListSelectUIEvent extends UIEvent {
  type: 'list.select';
  data: {
    itemId: string;
    itemIndex: number;
    itemLabel?: string;
    itemValue?: unknown;
  };
}

/**
 * List activate event (Enter pressed)
 */
export interface ListActivateUIEvent extends UIEvent {
  type: 'list.activate';
  data: {
    itemId: string;
    itemIndex: number;
    itemLabel?: string;
    itemValue?: unknown;
  };
}

/**
 * List multi-selection change event
 */
export interface ListSelectionChangeUIEvent extends UIEvent {
  type: 'list.selectionChange';
  data: {
    selectedIds: string[];
  };
}

/**
 * Table select event
 */
export interface TableSelectUIEvent extends UIEvent {
  type: 'table.select';
  data: {
    rowIndex: number;
    row: Record<string, unknown>;
  };
}

/**
 * Table activate event (Enter pressed)
 */
export interface TableActivateUIEvent extends UIEvent {
  type: 'table.activate';
  data: {
    rowIndex: number;
    row: Record<string, unknown>;
  };
}

/**
 * Modal close event
 */
export interface ModalCloseUIEvent extends UIEvent {
  type: 'modal.close';
  data: {
    reason: 'escape' | 'button' | 'backdrop';
  };
}

/**
 * Modal confirm event
 */
export interface ModalConfirmUIEvent extends UIEvent {
  type: 'modal.confirm';
  data?: unknown;
}

/**
 * Modal cancel event
 */
export interface ModalCancelUIEvent extends UIEvent {
  type: 'modal.cancel';
  data?: unknown;
}

/**
 * Event listener type
 */
export type UIEventListener<T extends UIEvent = UIEvent> = (event: T) => void;

/**
 * Unsubscribe function
 */
export type Unsubscribe = () => void;

/**
 * UIEventEmitter - Singleton event emitter for declarative UI components
 */
class UIEventEmitterClass {
  private listeners: Map<UIEventType | '*', Set<UIEventListener>> = new Map();
  private outboundEmitter: OutboundEventEmitter | null = null;
  private enabled: boolean = true;

  /**
   * Configure the outbound emitter for sending events to parent process
   */
  setOutboundEmitter(emitter: OutboundEventEmitter | null): void {
    this.outboundEmitter = emitter;
  }

  /**
   * Enable or disable event emission
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Check if event emission is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Subscribe to a specific event type
   */
  on<T extends UIEvent>(type: T['type'], listener: UIEventListener<T>): Unsubscribe {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(listener as UIEventListener);

    return () => {
      this.listeners.get(type)?.delete(listener as UIEventListener);
    };
  }

  /**
   * Subscribe to all events
   */
  onAll(listener: UIEventListener): Unsubscribe {
    if (!this.listeners.has('*')) {
      this.listeners.set('*', new Set());
    }
    this.listeners.get('*')!.add(listener);

    return () => {
      this.listeners.get('*')?.delete(listener);
    };
  }

  /**
   * Subscribe to an event type, but only fire once
   */
  once<T extends UIEvent>(type: T['type'], listener: UIEventListener<T>): Unsubscribe {
    const unsubscribe = this.on(type, (event) => {
      unsubscribe();
      listener(event as T);
    });
    return unsubscribe;
  }

  /**
   * Emit an event
   */
  emit<T extends UIEvent>(event: Omit<T, 'timestamp'>): void {
    if (!this.enabled) return;

    const fullEvent: UIEvent = {
      ...event,
      timestamp: new Date().toISOString(),
    } as UIEvent;

    // Notify type-specific listeners
    const typeListeners = this.listeners.get(event.type);
    if (typeListeners) {
      for (const listener of typeListeners) {
        try {
          listener(fullEvent);
        } catch (error) {
          console.error(`Error in UI event listener for ${event.type}:`, error);
        }
      }
    }

    // Notify catch-all listeners
    const allListeners = this.listeners.get('*');
    if (allListeners) {
      for (const listener of allListeners) {
        try {
          listener(fullEvent);
        } catch (error) {
          console.error('Error in catch-all UI event listener:', error);
        }
      }
    }

    // Forward to outbound emitter if configured
    if (this.outboundEmitter) {
      this.forwardToOutbound(fullEvent);
    }
  }

  /**
   * Forward UI event to outbound protocol
   */
  private forwardToOutbound(event: UIEvent): void {
    if (!this.outboundEmitter) return;

    let outboundEvent: OutboundEvent | null = null;

    switch (event.type) {
      case 'button.click': {
        const buttonEvent = event as ButtonClickUIEvent;
        outboundEvent = {
          type: 'button_click',
          buttonId: buttonEvent.data.buttonId,
          componentId: buttonEvent.componentId,
          timestamp: buttonEvent.timestamp,
        };
        break;
      }
      case 'list.select':
      case 'list.activate': {
        const listEvent = event as ListSelectUIEvent | ListActivateUIEvent;
        outboundEvent = {
          type: 'selection_change',
          componentId: listEvent.componentId,
          selectedIndex: listEvent.data.itemIndex,
          selectedValue: listEvent.data.itemValue,
          timestamp: listEvent.timestamp,
        };
        break;
      }
      case 'list.selectionChange': {
        const selectionEvent = event as ListSelectionChangeUIEvent;
        outboundEvent = {
          type: 'selection_change',
          componentId: selectionEvent.componentId,
          selectedIds: selectionEvent.data.selectedIds,
          timestamp: selectionEvent.timestamp,
        };
        break;
      }
      case 'table.select':
      case 'table.activate': {
        const tableEvent = event as TableSelectUIEvent | TableActivateUIEvent;
        outboundEvent = {
          type: 'selection_change',
          componentId: tableEvent.componentId,
          selectedIndex: tableEvent.data.rowIndex,
          selectedValue: tableEvent.data.row,
          timestamp: tableEvent.timestamp,
        };
        break;
      }
      case 'modal.close':
      case 'modal.cancel': {
        const modalEvent = event as ModalCloseUIEvent | ModalCancelUIEvent;
        outboundEvent = {
          type: 'modal_action',
          action: event.type === 'modal.close' ? 'dismiss' : 'cancel',
          modalId: modalEvent.componentId,
          data: modalEvent.data,
          timestamp: modalEvent.timestamp,
        };
        break;
      }
      case 'modal.confirm': {
        const confirmEvent = event as ModalConfirmUIEvent;
        outboundEvent = {
          type: 'modal_action',
          action: 'confirm',
          modalId: confirmEvent.componentId,
          data: confirmEvent.data,
          timestamp: confirmEvent.timestamp,
        };
        break;
      }
    }

    if (outboundEvent) {
      this.outboundEmitter.emit(outboundEvent);
    }
  }

  /**
   * Remove all listeners
   */
  clear(): void {
    this.listeners.clear();
  }

  /**
   * Remove listeners for a specific event type
   */
  clearType(type: UIEventType): void {
    this.listeners.delete(type);
  }

  /**
   * Get the count of listeners for a type
   */
  listenerCount(type: UIEventType | '*'): number {
    return this.listeners.get(type)?.size ?? 0;
  }
}

/**
 * Singleton instance of the UI event emitter
 */
export const UIEventEmitter = new UIEventEmitterClass();

/**
 * Helper functions for emitting common events
 */
export const emitButtonClick = (componentId: string, buttonId: string, label?: string): void => {
  UIEventEmitter.emit<ButtonClickUIEvent>({
    type: 'button.click',
    componentId,
    data: { buttonId, label },
  });
};

export const emitListSelect = (
  componentId: string,
  itemId: string,
  itemIndex: number,
  itemLabel?: string,
  itemValue?: unknown
): void => {
  UIEventEmitter.emit<ListSelectUIEvent>({
    type: 'list.select',
    componentId,
    data: { itemId, itemIndex, itemLabel, itemValue },
  });
};

export const emitListActivate = (
  componentId: string,
  itemId: string,
  itemIndex: number,
  itemLabel?: string,
  itemValue?: unknown
): void => {
  UIEventEmitter.emit<ListActivateUIEvent>({
    type: 'list.activate',
    componentId,
    data: { itemId, itemIndex, itemLabel, itemValue },
  });
};

export const emitListSelectionChange = (componentId: string, selectedIds: string[]): void => {
  UIEventEmitter.emit<ListSelectionChangeUIEvent>({
    type: 'list.selectionChange',
    componentId,
    data: { selectedIds },
  });
};

export const emitTableSelect = (
  componentId: string,
  rowIndex: number,
  row: Record<string, unknown>
): void => {
  UIEventEmitter.emit<TableSelectUIEvent>({
    type: 'table.select',
    componentId,
    data: { rowIndex, row },
  });
};

export const emitTableActivate = (
  componentId: string,
  rowIndex: number,
  row: Record<string, unknown>
): void => {
  UIEventEmitter.emit<TableActivateUIEvent>({
    type: 'table.activate',
    componentId,
    data: { rowIndex, row },
  });
};

export const emitModalClose = (
  componentId: string,
  reason: 'escape' | 'button' | 'backdrop'
): void => {
  UIEventEmitter.emit<ModalCloseUIEvent>({
    type: 'modal.close',
    componentId,
    data: { reason },
  });
};

export const emitModalConfirm = (componentId: string, data?: unknown): void => {
  UIEventEmitter.emit<ModalConfirmUIEvent>({
    type: 'modal.confirm',
    componentId,
    data,
  });
};

export const emitModalCancel = (componentId: string, data?: unknown): void => {
  UIEventEmitter.emit<ModalCancelUIEvent>({
    type: 'modal.cancel',
    componentId,
    data,
  });
};

/**
 * Initialize the UI event emitter with stdout forwarding
 */
export function initializeUIEventEmitter(): void {
  UIEventEmitter.setOutboundEmitter(createStdoutEmitter());
}

/**
 * React hook for subscribing to UI events
 */
export function useUIEvent<T extends UIEvent>(
  _type: T['type'],
  _listener: UIEventListener<T>,
  _deps: React.DependencyList = []
): void {
  // Note: This is a placeholder - actual implementation requires React import
  // The hook should be implemented in a separate file that imports React
}
