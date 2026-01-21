/**
 * Focus Manager (UOW-0210)
 *
 * Manages component focus state with support for focus trapping (modals).
 */

export interface FocusableComponent {
  id: string;
  tabIndex?: number;
  disabled?: boolean;
}

export interface FocusState {
  focusedId: string | null;
  focusHistory: string[];
  focusTrapStack: string[];
}

export interface FocusManagerOptions {
  /** Maximum history size for focus restore */
  maxHistorySize?: number;
}

export class FocusManager {
  private state: FocusState;
  private components: Map<string, FocusableComponent>;
  private options: Required<FocusManagerOptions>;
  private listeners: Set<(state: FocusState) => void>;

  constructor(options: FocusManagerOptions = {}) {
    this.options = {
      maxHistorySize: options.maxHistorySize ?? 50,
    };
    this.state = {
      focusedId: null,
      focusHistory: [],
      focusTrapStack: [],
    };
    this.components = new Map();
    this.listeners = new Set();
  }

  /**
   * Register a focusable component
   */
  register(component: FocusableComponent): void {
    this.components.set(component.id, component);
  }

  /**
   * Unregister a component
   */
  unregister(id: string): void {
    this.components.delete(id);
    // If this was focused, move focus elsewhere
    if (this.state.focusedId === id) {
      this.focusPrevious();
    }
    // Remove from history
    this.state.focusHistory = this.state.focusHistory.filter((hid) => hid !== id);
    // Remove from trap stack
    this.state.focusTrapStack = this.state.focusTrapStack.filter((tid) => tid !== id);
  }

  /**
   * Get current focus state
   */
  getState(): FocusState {
    return { ...this.state };
  }

  /**
   * Get currently focused component ID
   */
  getFocusedId(): string | null {
    return this.state.focusedId;
  }

  /**
   * Check if a component is focused
   */
  isFocused(id: string): boolean {
    return this.state.focusedId === id;
  }

  /**
   * Focus a specific component
   */
  focus(id: string): boolean {
    const component = this.components.get(id);
    if (!component || component.disabled) {
      return false;
    }

    // Check if focus is trapped
    if (this.state.focusTrapStack.length > 0) {
      const trapId = this.state.focusTrapStack[this.state.focusTrapStack.length - 1];
      // Allow focusing within trap or the trap container itself
      if (id !== trapId && !this.isDescendantOfTrap(id, trapId!)) {
        return false;
      }
    }

    // Save to history if changing focus
    if (this.state.focusedId && this.state.focusedId !== id) {
      this.state.focusHistory.push(this.state.focusedId);
      if (this.state.focusHistory.length > this.options.maxHistorySize) {
        this.state.focusHistory.shift();
      }
    }

    this.state.focusedId = id;
    this.notifyListeners();
    return true;
  }

  /**
   * Clear focus
   */
  blur(): void {
    if (this.state.focusedId) {
      this.state.focusHistory.push(this.state.focusedId);
      if (this.state.focusHistory.length > this.options.maxHistorySize) {
        this.state.focusHistory.shift();
      }
    }
    this.state.focusedId = null;
    this.notifyListeners();
  }

  /**
   * Focus the previous component in history
   */
  focusPrevious(): boolean {
    while (this.state.focusHistory.length > 0) {
      const prevId = this.state.focusHistory.pop();
      if (prevId && this.components.has(prevId)) {
        const component = this.components.get(prevId);
        if (component && !component.disabled) {
          this.state.focusedId = prevId;
          this.notifyListeners();
          return true;
        }
      }
    }
    this.state.focusedId = null;
    this.notifyListeners();
    return false;
  }

  /**
   * Move focus to next component (by tabIndex or registration order)
   */
  focusNext(): boolean {
    const focusable = this.getFocusableComponents();
    if (focusable.length === 0) return false;

    const currentIndex = this.state.focusedId
      ? focusable.findIndex((c) => c.id === this.state.focusedId)
      : -1;

    const nextIndex = (currentIndex + 1) % focusable.length;
    return this.focus(focusable[nextIndex]!.id);
  }

  /**
   * Move focus to previous component
   */
  focusPrev(): boolean {
    const focusable = this.getFocusableComponents();
    if (focusable.length === 0) return false;

    const currentIndex = this.state.focusedId
      ? focusable.findIndex((c) => c.id === this.state.focusedId)
      : 0;

    const prevIndex = (currentIndex - 1 + focusable.length) % focusable.length;
    return this.focus(focusable[prevIndex]!.id);
  }

  /**
   * Focus first focusable component
   */
  focusFirst(): boolean {
    const focusable = this.getFocusableComponents();
    if (focusable.length === 0) return false;
    return this.focus(focusable[0]!.id);
  }

  /**
   * Focus last focusable component
   */
  focusLast(): boolean {
    const focusable = this.getFocusableComponents();
    if (focusable.length === 0) return false;
    return this.focus(focusable[focusable.length - 1]!.id);
  }

  /**
   * Push a focus trap (e.g., when opening a modal)
   * Focus will be constrained to this component and its children
   */
  pushFocusTrap(id: string): void {
    this.state.focusTrapStack.push(id);
    // Optionally focus the trap container
    if (this.components.has(id)) {
      this.focus(id);
    }
    this.notifyListeners();
  }

  /**
   * Pop a focus trap (e.g., when closing a modal)
   * Returns the ID of the popped trap
   */
  popFocusTrap(): string | undefined {
    const popped = this.state.focusTrapStack.pop();
    // Restore focus to previous
    this.focusPrevious();
    this.notifyListeners();
    return popped;
  }

  /**
   * Check if focus is currently trapped
   */
  isFocusTrapped(): boolean {
    return this.state.focusTrapStack.length > 0;
  }

  /**
   * Get the current focus trap ID
   */
  getCurrentTrap(): string | undefined {
    return this.state.focusTrapStack[this.state.focusTrapStack.length - 1];
  }

  /**
   * Subscribe to focus state changes
   */
  subscribe(listener: (state: FocusState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Get all registered components
   */
  getComponents(): FocusableComponent[] {
    return Array.from(this.components.values());
  }

  /**
   * Get focusable components (sorted by tabIndex)
   */
  private getFocusableComponents(): FocusableComponent[] {
    let components = Array.from(this.components.values()).filter((c) => !c.disabled);

    // Filter by focus trap if active
    if (this.state.focusTrapStack.length > 0) {
      const trapId = this.state.focusTrapStack[this.state.focusTrapStack.length - 1];
      components = components.filter(
        (c) => c.id === trapId || this.isDescendantOfTrap(c.id, trapId!)
      );
    }

    // Sort by tabIndex (undefined is treated as 0)
    return components.sort((a, b) => {
      const aIndex = a.tabIndex ?? 0;
      const bIndex = b.tabIndex ?? 0;
      return aIndex - bIndex;
    });
  }

  /**
   * Check if an ID is a descendant of a trap container
   * For now, uses simple prefix matching (e.g., "modal-ok-btn" is child of "modal")
   */
  private isDescendantOfTrap(id: string, trapId: string): boolean {
    return id.startsWith(trapId + '-');
  }

  /**
   * Notify all listeners of state change
   */
  private notifyListeners(): void {
    const state = this.getState();
    for (const listener of this.listeners) {
      listener(state);
    }
  }

  /**
   * Reset the focus manager
   */
  reset(): void {
    this.state = {
      focusedId: null,
      focusHistory: [],
      focusTrapStack: [],
    };
    this.components.clear();
    this.notifyListeners();
  }
}

// Singleton instance for global focus management
let globalFocusManager: FocusManager | null = null;

export function getFocusManager(): FocusManager {
  if (!globalFocusManager) {
    globalFocusManager = new FocusManager();
  }
  return globalFocusManager;
}

export function resetFocusManager(): void {
  globalFocusManager = null;
}
