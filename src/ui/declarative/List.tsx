/**
 * Declarative List Component (UOW-0803, UOW-0831)
 *
 * Renders a list from declarative UILayout schema with selection support.
 * Emits list.select and list.activate events for interactivity.
 */

import React, { useMemo } from 'react';
import { Box, Text, useInput } from 'ink';
import { emitListSelect, emitListActivate, emitListSelectionChange } from './EventEmitter.js';

export interface ListItem {
  id: string;
  label: string;
  value?: unknown;
  icon?: string;
  disabled?: boolean;
}

export interface ListProps {
  /** Unique ID */
  id: string;
  /** List items */
  items: ListItem[];
  /** Currently selected index */
  selectedIndex?: number;
  /** Selected item IDs (for multi-select) */
  selectedIds?: string[];
  /** Enable multi-select */
  multiSelect?: boolean;
  /** Maximum visible height */
  maxHeight?: number;
  /** Whether list has focus */
  focused?: boolean;
  /** Show item numbers */
  showNumbers?: boolean;
  /** Called when selection changes */
  onSelect?: (item: ListItem, index: number) => void;
  /** Called when item is activated (Enter) */
  onActivate?: (item: ListItem, index: number) => void;
  /** Called when selection changes in multi-select */
  onSelectionChange?: (selectedIds: string[]) => void;
}

export const List: React.FC<ListProps> = ({
  id,
  items,
  selectedIndex = 0,
  selectedIds = [],
  multiSelect = false,
  maxHeight,
  focused = false,
  showNumbers = false,
  onSelect,
  onActivate,
  onSelectionChange,
}) => {
  // Calculate visible items for scrolling
  const { visibleItems, scrollOffset } = useMemo(() => {
    if (!maxHeight || items.length <= maxHeight) {
      return { visibleItems: items, scrollOffset: 0 };
    }

    // Keep selected item in view
    let offset = 0;
    if (selectedIndex >= maxHeight) {
      offset = selectedIndex - maxHeight + 1;
    }
    if (selectedIndex < offset) {
      offset = selectedIndex;
    }

    return {
      visibleItems: items.slice(offset, offset + maxHeight),
      scrollOffset: offset,
    };
  }, [items, selectedIndex, maxHeight]);

  // Handle keyboard navigation
  useInput(
    (input, key) => {
      if (!focused || items.length === 0) return;

      // Navigate up
      if (key.upArrow || input === 'k') {
        const newIndex = Math.max(0, selectedIndex - 1);
        const newItem = items[newIndex];
        if (newIndex !== selectedIndex && newItem) {
          // Emit list.select event
          emitListSelect(id, newItem.id, newIndex, newItem.label, newItem.value);
          onSelect?.(newItem, newIndex);
        }
        return;
      }

      // Navigate down
      if (key.downArrow || input === 'j') {
        const newIndex = Math.min(items.length - 1, selectedIndex + 1);
        const newItem = items[newIndex];
        if (newIndex !== selectedIndex && newItem) {
          // Emit list.select event
          emitListSelect(id, newItem.id, newIndex, newItem.label, newItem.value);
          onSelect?.(newItem, newIndex);
        }
        return;
      }

      // Jump to start
      if (input === 'g') {
        const firstItem = items[0];
        if (firstItem) {
          // Emit list.select event
          emitListSelect(id, firstItem.id, 0, firstItem.label, firstItem.value);
          onSelect?.(firstItem, 0);
        }
        return;
      }

      // Jump to end
      if (input === 'G') {
        const lastIndex = items.length - 1;
        const lastItem = items[lastIndex];
        if (lastItem) {
          // Emit list.select event
          emitListSelect(id, lastItem.id, lastIndex, lastItem.label, lastItem.value);
          onSelect?.(lastItem, lastIndex);
        }
        return;
      }

      // Toggle selection (multi-select) or activate
      if (key.return || input === ' ') {
        const item = items[selectedIndex];
        if (!item || item.disabled) return;

        if (multiSelect && input === ' ') {
          const newSelectedIds = selectedIds.includes(item.id)
            ? selectedIds.filter((itemId) => itemId !== item.id)
            : [...selectedIds, item.id];
          // Emit list.selectionChange event
          emitListSelectionChange(id, newSelectedIds);
          onSelectionChange?.(newSelectedIds);
        } else {
          // Emit list.activate event
          emitListActivate(id, item.id, selectedIndex, item.label, item.value);
          onActivate?.(item, selectedIndex);
        }
      }
    },
    { isActive: focused }
  );

  const isSelected = (item: ListItem, index: number) => {
    if (multiSelect) {
      return selectedIds.includes(item.id);
    }
    return scrollOffset + index === selectedIndex;
  };

  const isCursor = (index: number) => {
    return scrollOffset + index === selectedIndex;
  };

  return (
    <Box flexDirection="column">
      {/* Scroll indicator - top */}
      {scrollOffset > 0 && (
        <Text dimColor>▲ {scrollOffset} more</Text>
      )}

      {/* List items */}
      {visibleItems.map((item, index) => {
        const actualIndex = scrollOffset + index;
        const selected = isSelected(item, index);
        const cursor = isCursor(index) && focused;

        return (
          <Box key={item.id} paddingLeft={1}>
            {/* Cursor indicator */}
            <Text color={cursor ? 'cyan' : undefined}>
              {cursor ? '▸' : ' '}
            </Text>

            {/* Multi-select checkbox */}
            {multiSelect && (
              <Text color={selected ? 'green' : 'gray'}>
                {selected ? '◉' : '○'}{' '}
              </Text>
            )}

            {/* Number */}
            {showNumbers && (
              <Text dimColor>{String(actualIndex + 1).padStart(2)}. </Text>
            )}

            {/* Icon */}
            {item.icon && <Text>{item.icon} </Text>}

            {/* Label */}
            <Text
              color={cursor ? 'cyan' : item.disabled ? 'gray' : undefined}
              bold={cursor}
              dimColor={item.disabled}
            >
              {item.label}
            </Text>
          </Box>
        );
      })}

      {/* Scroll indicator - bottom */}
      {scrollOffset + visibleItems.length < items.length && (
        <Text dimColor>
          ▼ {items.length - scrollOffset - visibleItems.length} more
        </Text>
      )}
    </Box>
  );
};

/**
 * Simple selection list (no multi-select)
 */
export interface SelectListProps {
  id: string;
  items: Array<{ id: string; label: string }>;
  value?: string;
  focused?: boolean;
  onChange?: (value: string) => void;
}

export const SelectList: React.FC<SelectListProps> = ({
  id,
  items,
  value,
  focused = false,
  onChange,
}) => {
  const selectedIndex = items.findIndex((item) => item.id === value) || 0;

  return (
    <List
      id={id}
      items={items}
      selectedIndex={selectedIndex >= 0 ? selectedIndex : 0}
      focused={focused}
      onActivate={(item) => onChange?.(item.id)}
      onSelect={(item) => onChange?.(item.id)}
    />
  );
};
