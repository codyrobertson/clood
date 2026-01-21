/**
 * Declarative List Component (UOW-0803, UOW-0813, UOW-0831)
 *
 * Renders a list from declarative UILayout schema with selection support.
 * Features:
 * - Keyboard navigation (up/down, j/k, page up/down, home/end)
 * - Single select (emit list.select)
 * - Multi-select toggle (emit list.select with array)
 * - Visual selection indicators
 * - Search/filter support
 * - Grouping support
 */

import React, { useMemo, useState, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import { emitListSelect, emitListActivate, emitListSelectionChange } from './EventEmitter.js';

export type ListItemVariant = 'default' | 'success' | 'warning' | 'error' | 'info';

export interface ListItem {
  id: string;
  label: string;
  value?: unknown;
  icon?: string;
  disabled?: boolean;
  /** Secondary text */
  description?: string;
  /** Item variant for styling */
  variant?: ListItemVariant;
  /** Group this item belongs to */
  group?: string;
  /** Custom right-side content */
  suffix?: string;
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
  /** Show descriptions */
  showDescriptions?: boolean;
  /** Enable search/filter mode */
  searchEnabled?: boolean;
  /** Current search query */
  searchQuery?: string;
  /** Page size for page up/down navigation */
  pageSize?: number;
  /** Wrap navigation at boundaries */
  wrapNavigation?: boolean;
  /** Custom cursor character */
  cursorChar?: string;
  /** Custom selection indicator */
  selectedChar?: string;
  /** Custom unselected indicator */
  unselectedChar?: string;
  /** Empty state message */
  emptyMessage?: string;
  /** Show group headers */
  showGroupHeaders?: boolean;
  /** Called when selection changes */
  onSelect?: (item: ListItem, index: number) => void;
  /** Called when item is activated (Enter) */
  onActivate?: (item: ListItem, index: number) => void;
  /** Called when selection changes in multi-select */
  onSelectionChange?: (selectedIds: string[]) => void;
  /** Called when search query changes */
  onSearchChange?: (query: string) => void;
}

/**
 * Get variant color for list item
 */
function getVariantColor(variant?: ListItemVariant): string | undefined {
  switch (variant) {
    case 'success': return 'green';
    case 'warning': return 'yellow';
    case 'error': return 'red';
    case 'info': return 'blue';
    default: return undefined;
  }
}

/**
 * Filter items based on search query
 */
function filterItems(items: ListItem[], query: string): ListItem[] {
  if (!query) return items;
  const lowerQuery = query.toLowerCase();
  return items.filter(item =>
    item.label.toLowerCase().includes(lowerQuery) ||
    (item.description && item.description.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Group items by their group property
 */
function groupItems(items: ListItem[]): Map<string | undefined, ListItem[]> {
  const groups = new Map<string | undefined, ListItem[]>();

  for (const item of items) {
    const group = item.group;
    if (!groups.has(group)) {
      groups.set(group, []);
    }
    groups.get(group)!.push(item);
  }

  return groups;
}

export const List: React.FC<ListProps> = ({
  id,
  items,
  selectedIndex: controlledSelectedIndex,
  selectedIds: controlledSelectedIds,
  multiSelect = false,
  maxHeight,
  focused = false,
  showNumbers = false,
  showDescriptions = false,
  searchEnabled = false,
  searchQuery: controlledSearchQuery,
  pageSize = 10,
  wrapNavigation = false,
  cursorChar = '\u25B8',
  selectedChar = '\u25C9',
  unselectedChar = '\u25CB',
  emptyMessage = 'No items',
  showGroupHeaders = false,
  onSelect,
  onActivate,
  onSelectionChange,
  onSearchChange,
}) => {
  // Internal state for uncontrolled mode
  const [internalSelectedIndex, setInternalSelectedIndex] = useState(0);
  const [internalSelectedIds, setInternalSelectedIds] = useState<string[]>([]);
  const [internalSearchQuery, setInternalSearchQuery] = useState('');

  // Use controlled or internal state
  const selectedIndex = controlledSelectedIndex ?? internalSelectedIndex;
  const selectedIds = controlledSelectedIds ?? internalSelectedIds;
  const searchQuery = controlledSearchQuery ?? internalSearchQuery;

  // Filter items if search is enabled
  const filteredItems = useMemo(() => {
    return searchEnabled && searchQuery ? filterItems(items, searchQuery) : items;
  }, [items, searchEnabled, searchQuery]);

  // Calculate visible items for scrolling
  const { visibleItems, scrollOffset } = useMemo(() => {
    if (!maxHeight || filteredItems.length <= maxHeight) {
      return { visibleItems: filteredItems, scrollOffset: 0 };
    }

    // Keep selected item in view
    let offset = 0;
    const effectiveIndex = Math.min(selectedIndex, filteredItems.length - 1);
    if (effectiveIndex >= maxHeight) {
      offset = effectiveIndex - maxHeight + 1;
    }
    if (effectiveIndex < offset) {
      offset = effectiveIndex;
    }

    return {
      visibleItems: filteredItems.slice(offset, offset + maxHeight),
      scrollOffset: offset,
    };
  }, [filteredItems, selectedIndex, maxHeight]);

  // Navigation helper
  const navigateTo = useCallback((newIndex: number) => {
    const clampedIndex = wrapNavigation
      ? ((newIndex % filteredItems.length) + filteredItems.length) % filteredItems.length
      : Math.max(0, Math.min(filteredItems.length - 1, newIndex));

    const newItem = filteredItems[clampedIndex];
    if (clampedIndex !== selectedIndex && newItem) {
      setInternalSelectedIndex(clampedIndex);
      // Emit list.select event
      emitListSelect(id, newItem.id, clampedIndex, newItem.label, newItem.value);
      onSelect?.(newItem, clampedIndex);
    }
  }, [id, filteredItems, selectedIndex, wrapNavigation, onSelect]);

  // Toggle selection for multi-select
  const toggleSelection = useCallback((item: ListItem) => {
    const newSelectedIds = selectedIds.includes(item.id)
      ? selectedIds.filter((itemId) => itemId !== item.id)
      : [...selectedIds, item.id];
    setInternalSelectedIds(newSelectedIds);
    // Emit list.selectionChange event
    emitListSelectionChange(id, newSelectedIds);
    onSelectionChange?.(newSelectedIds);
  }, [id, selectedIds, onSelectionChange]);

  // Select all/none for multi-select
  const selectAll = useCallback(() => {
    const allIds = filteredItems.filter(i => !i.disabled).map(i => i.id);
    setInternalSelectedIds(allIds);
    emitListSelectionChange(id, allIds);
    onSelectionChange?.(allIds);
  }, [id, filteredItems, onSelectionChange]);

  const selectNone = useCallback(() => {
    setInternalSelectedIds([]);
    emitListSelectionChange(id, []);
    onSelectionChange?.([]);
  }, [id, onSelectionChange]);

  // Handle keyboard navigation
  useInput(
    (input, key) => {
      if (!focused || filteredItems.length === 0) return;

      // Navigate up
      if (key.upArrow || input === 'k') {
        navigateTo(selectedIndex - 1);
        return;
      }

      // Navigate down
      if (key.downArrow || input === 'j') {
        navigateTo(selectedIndex + 1);
        return;
      }

      // Page up
      if (key.pageUp || (key.ctrl && input === 'u')) {
        navigateTo(selectedIndex - pageSize);
        return;
      }

      // Page down
      if (key.pageDown || (key.ctrl && input === 'd')) {
        navigateTo(selectedIndex + pageSize);
        return;
      }

      // Jump to start (vim 'g' or Ctrl+Home emulation)
      if (input === 'g') {
        navigateTo(0);
        return;
      }

      // Jump to end (vim 'G')
      if (input === 'G') {
        navigateTo(filteredItems.length - 1);
        return;
      }

      // Multi-select: Select all
      if (multiSelect && (key.ctrl && input === 'a')) {
        selectAll();
        return;
      }

      // Multi-select: Select none
      if (multiSelect && (key.ctrl && input === 'n')) {
        selectNone();
        return;
      }

      // Toggle selection (multi-select) or activate
      if (key.return || input === ' ') {
        const item = filteredItems[selectedIndex];
        if (!item || item.disabled) return;

        if (multiSelect && input === ' ') {
          toggleSelection(item);
        } else if (key.return) {
          // Emit list.activate event
          emitListActivate(id, item.id, selectedIndex, item.label, item.value);
          onActivate?.(item, selectedIndex);
        }
        return;
      }

      // Search mode: handle backspace
      if (searchEnabled && key.backspace) {
        const newQuery = searchQuery.slice(0, -1);
        setInternalSearchQuery(newQuery);
        onSearchChange?.(newQuery);
        return;
      }

      // Search mode: handle character input (alphanumeric only)
      if (searchEnabled && input.length === 1 && /[a-zA-Z0-9 ]/.test(input)) {
        const newQuery = searchQuery + input;
        setInternalSearchQuery(newQuery);
        onSearchChange?.(newQuery);
        return;
      }

      // Clear search with Escape
      if (searchEnabled && key.escape && searchQuery) {
        setInternalSearchQuery('');
        onSearchChange?.('');
        return;
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

  // Group items if enabled
  const groupedItems = useMemo(() => {
    if (!showGroupHeaders) return null;
    return groupItems(visibleItems);
  }, [visibleItems, showGroupHeaders]);

  // Render a single list item
  const renderItem = (item: ListItem, index: number, actualIndex: number) => {
    const selected = isSelected(item, index);
    const cursor = isCursor(index) && focused;
    const variantColor = getVariantColor(item.variant);

    return (
      <Box key={item.id} flexDirection="column">
        <Box paddingLeft={1}>
          {/* Cursor indicator */}
          <Text color={cursor ? 'cyan' : undefined}>
            {cursor ? cursorChar : ' '}
          </Text>

          {/* Multi-select checkbox */}
          {multiSelect && (
            <Text color={selected ? 'green' : 'gray'}>
              {selected ? selectedChar : unselectedChar}{' '}
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
            color={cursor ? 'cyan' : variantColor || (item.disabled ? 'gray' : undefined)}
            bold={cursor}
            dimColor={item.disabled}
          >
            {item.label}
          </Text>

          {/* Suffix */}
          {item.suffix && (
            <Text dimColor> {item.suffix}</Text>
          )}
        </Box>

        {/* Description */}
        {showDescriptions && item.description && (
          <Box paddingLeft={multiSelect ? 5 : 3}>
            <Text dimColor italic>
              {item.description}
            </Text>
          </Box>
        )}
      </Box>
    );
  };

  // Empty state
  if (filteredItems.length === 0) {
    return (
      <Box flexDirection="column" paddingX={1}>
        {searchEnabled && searchQuery && (
          <Text dimColor>Search: {searchQuery}</Text>
        )}
        <Text dimColor italic>{emptyMessage}</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      {/* Search indicator */}
      {searchEnabled && searchQuery && (
        <Box paddingX={1} marginBottom={1}>
          <Text dimColor>Search: </Text>
          <Text color="cyan">{searchQuery}</Text>
          <Text dimColor> ({filteredItems.length} results)</Text>
        </Box>
      )}

      {/* Scroll indicator - top */}
      {scrollOffset > 0 && (
        <Text dimColor>\u25B2 {scrollOffset} more</Text>
      )}

      {/* List items - grouped or flat */}
      {groupedItems ? (
        // Grouped rendering
        Array.from(groupedItems.entries()).map(([group, groupItems]) => (
          <Box key={group ?? '__ungrouped__'} flexDirection="column">
            {group && (
              <Box paddingX={1} marginTop={1}>
                <Text bold color="gray">{group}</Text>
              </Box>
            )}
            {groupItems.map((item) => {
              const actualIndex = filteredItems.indexOf(item);
              const visibleIndex = visibleItems.indexOf(item);
              return renderItem(item, visibleIndex, actualIndex);
            })}
          </Box>
        ))
      ) : (
        // Flat rendering
        visibleItems.map((item, index) => {
          const actualIndex = scrollOffset + index;
          return renderItem(item, index, actualIndex);
        })
      )}

      {/* Scroll indicator - bottom */}
      {scrollOffset + visibleItems.length < filteredItems.length && (
        <Text dimColor>
          \u25BC {filteredItems.length - scrollOffset - visibleItems.length} more
        </Text>
      )}

      {/* Multi-select summary */}
      {multiSelect && selectedIds.length > 0 && (
        <Box marginTop={1} paddingX={1}>
          <Text dimColor>
            {selectedIds.length} selected
          </Text>
        </Box>
      )}
    </Box>
  );
};

/**
 * Simple selection list (no multi-select)
 */
export interface SelectListProps {
  id: string;
  items: Array<{ id: string; label: string; disabled?: boolean }>;
  value?: string;
  focused?: boolean;
  showNumbers?: boolean;
  maxHeight?: number;
  onChange?: (value: string) => void;
}

export const SelectList: React.FC<SelectListProps> = ({
  id,
  items,
  value,
  focused = false,
  showNumbers = false,
  maxHeight,
  onChange,
}) => {
  const selectedIndex = items.findIndex((item) => item.id === value);

  return (
    <List
      id={id}
      items={items}
      selectedIndex={selectedIndex >= 0 ? selectedIndex : 0}
      focused={focused}
      showNumbers={showNumbers}
      maxHeight={maxHeight}
      onActivate={(item) => onChange?.(item.id)}
      onSelect={(item) => onChange?.(item.id)}
    />
  );
};

/**
 * Checkbox list for multi-select
 */
export interface CheckboxListProps {
  id: string;
  items: Array<{ id: string; label: string; disabled?: boolean }>;
  selectedIds?: string[];
  focused?: boolean;
  maxHeight?: number;
  onChange?: (selectedIds: string[]) => void;
}

export const CheckboxList: React.FC<CheckboxListProps> = ({
  id,
  items,
  selectedIds = [],
  focused = false,
  maxHeight,
  onChange,
}) => {
  return (
    <List
      id={id}
      items={items}
      selectedIds={selectedIds}
      multiSelect={true}
      focused={focused}
      maxHeight={maxHeight}
      onSelectionChange={onChange}
    />
  );
};

/**
 * Menu list with icons and descriptions
 */
export interface MenuListProps {
  id: string;
  items: Array<{
    id: string;
    label: string;
    icon?: string;
    description?: string;
    shortcut?: string;
    disabled?: boolean;
  }>;
  focused?: boolean;
  maxHeight?: number;
  onSelect?: (itemId: string) => void;
}

export const MenuList: React.FC<MenuListProps> = ({
  id,
  items,
  focused = false,
  maxHeight,
  onSelect,
}) => {
  const listItems: ListItem[] = items.map(item => ({
    id: item.id,
    label: item.label,
    icon: item.icon,
    description: item.description,
    suffix: item.shortcut,
    disabled: item.disabled,
  }));

  return (
    <List
      id={id}
      items={listItems}
      focused={focused}
      maxHeight={maxHeight}
      showDescriptions={true}
      onActivate={(item) => onSelect?.(item.id)}
    />
  );
};

/**
 * File list with icons based on file type
 */
export interface FileListProps {
  id: string;
  files: Array<{
    name: string;
    path: string;
    isDirectory?: boolean;
    size?: string;
    modified?: string;
  }>;
  selectedPath?: string;
  focused?: boolean;
  maxHeight?: number;
  onSelect?: (path: string) => void;
  onOpen?: (path: string) => void;
}

export const FileList: React.FC<FileListProps> = ({
  id,
  files,
  selectedPath,
  focused = false,
  maxHeight,
  onSelect,
  onOpen,
}) => {
  const listItems: ListItem[] = files.map(file => ({
    id: file.path,
    label: file.name,
    icon: file.isDirectory ? '\uD83D\uDCC1' : '\uD83D\uDCC4',
    suffix: file.size || file.modified,
    value: file,
  }));

  const selectedIndex = files.findIndex(f => f.path === selectedPath);

  return (
    <List
      id={id}
      items={listItems}
      selectedIndex={selectedIndex >= 0 ? selectedIndex : 0}
      focused={focused}
      maxHeight={maxHeight}
      onSelect={(item) => onSelect?.(item.id)}
      onActivate={(item) => onOpen?.(item.id)}
    />
  );
};

/**
 * Searchable list with built-in filter
 */
export interface SearchableListProps {
  id: string;
  items: ListItem[];
  focused?: boolean;
  maxHeight?: number;
  placeholder?: string;
  onSelect?: (item: ListItem) => void;
  onActivate?: (item: ListItem) => void;
}

export const SearchableList: React.FC<SearchableListProps> = ({
  id,
  items,
  focused = false,
  maxHeight,
  placeholder: _placeholder = 'Type to search...',
  onSelect,
  onActivate,
}) => {
  const [query, setQuery] = useState('');

  return (
    <List
      id={id}
      items={items}
      focused={focused}
      maxHeight={maxHeight}
      searchEnabled={true}
      searchQuery={query}
      onSearchChange={setQuery}
      onSelect={onSelect}
      onActivate={onActivate}
      emptyMessage={query ? 'No matching items' : 'No items'}
    />
  );
};
