/**
 * Declarative FilePicker Component (UOW-0819)
 *
 * Renders a file picker with directory listing, navigation,
 * file selection, and glob filtering.
 * Emits file.select events on file selection.
 */

import React, { useState, useMemo, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import { UIEventEmitter } from './EventEmitter.js';

/**
 * File entry interface
 */
export interface FileEntry {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  modified?: Date | string;
  permissions?: string;
  isHidden?: boolean;
}

/**
 * File select UI event
 */
export interface FileSelectUIEvent {
  type: 'file.select';
  componentId: string;
  timestamp: string;
  data: {
    path: string;
    name: string;
    type: 'file' | 'directory';
    action: 'select' | 'open' | 'confirm';
  };
}

/**
 * File navigate UI event
 */
export interface FileNavigateUIEvent {
  type: 'file.navigate';
  componentId: string;
  timestamp: string;
  data: {
    fromPath: string;
    toPath: string;
    direction: 'into' | 'up' | 'root';
  };
}

/**
 * File filter UI event
 */
export interface FileFilterUIEvent {
  type: 'file.filter';
  componentId: string;
  timestamp: string;
  data: {
    pattern: string;
    matchCount: number;
  };
}

/**
 * Emit file select event
 */
export function emitFileSelect(
  componentId: string,
  path: string,
  name: string,
  type: 'file' | 'directory',
  action: 'select' | 'open' | 'confirm'
): void {
  UIEventEmitter.emit({
    type: 'file.select' as 'button.click', // Type workaround for extensibility
    componentId,
    data: { path, name, type, action },
  });
}

/**
 * Emit file navigate event
 */
export function emitFileNavigate(
  componentId: string,
  fromPath: string,
  toPath: string,
  direction: 'into' | 'up' | 'root'
): void {
  UIEventEmitter.emit({
    type: 'file.navigate' as 'button.click', // Type workaround for extensibility
    componentId,
    data: { fromPath, toPath, direction },
  });
}

/**
 * Emit file filter event
 */
export function emitFileFilter(
  componentId: string,
  pattern: string,
  matchCount: number
): void {
  UIEventEmitter.emit({
    type: 'file.filter' as 'button.click', // Type workaround for extensibility
    componentId,
    data: { pattern, matchCount },
  });
}

/**
 * Simple glob pattern matching
 */
function matchGlob(filename: string, pattern: string): boolean {
  if (!pattern || pattern === '*') return true;

  // Convert glob to regex
  const regexStr = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape special chars except * and ?
    .replace(/\*/g, '.*') // * matches any characters
    .replace(/\?/g, '.'); // ? matches single character

  try {
    const regex = new RegExp(`^${regexStr}$`, 'i');
    return regex.test(filename);
  } catch {
    return filename.toLowerCase().includes(pattern.toLowerCase());
  }
}

/**
 * Format file size for display
 */
function formatFileSize(bytes: number | undefined): string {
  if (bytes === undefined) return '';

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(unitIndex === 0 ? 0 : 1)}${units[unitIndex]}`;
}

/**
 * File icons by extension
 */
const FILE_ICONS: Record<string, string> = {
  // Directories
  directory: '\u{1F4C1}', // folder

  // Documents
  txt: '\u{1F4C4}', // document
  md: '\u{1F4DD}', // memo
  pdf: '\u{1F4D5}', // book
  doc: '\u{1F4C3}', // document
  docx: '\u{1F4C3}',

  // Code
  js: '\u{1F7E8}', // yellow square
  ts: '\u{1F537}', // blue diamond
  jsx: '\u{269B}', // atom
  tsx: '\u{269B}',
  py: '\u{1F40D}', // snake
  rb: '\u{1F48E}', // gem
  go: '\u{1F439}', // hamster
  rs: '\u{1F980}', // crab
  java: '\u{2615}', // coffee
  c: '\u{1F1E8}', // C
  cpp: '\u{1F1E8}',
  h: '\u{1F1ED}', // H
  css: '\u{1F3A8}', // palette
  html: '\u{1F310}', // globe
  json: '\u{1F4CB}', // clipboard
  xml: '\u{1F4C4}',
  yaml: '\u{2699}', // gear
  yml: '\u{2699}',
  sh: '\u{1F4BB}', // terminal
  bash: '\u{1F4BB}',

  // Data
  csv: '\u{1F4CA}', // chart
  sql: '\u{1F5C3}', // database

  // Images
  png: '\u{1F5BC}', // picture
  jpg: '\u{1F5BC}',
  jpeg: '\u{1F5BC}',
  gif: '\u{1F5BC}',
  svg: '\u{1F5BC}',
  ico: '\u{1F5BC}',

  // Archives
  zip: '\u{1F4E6}', // package
  tar: '\u{1F4E6}',
  gz: '\u{1F4E6}',
  rar: '\u{1F4E6}',

  // Config
  env: '\u{1F510}', // lock
  gitignore: '\u{1F6AB}', // no entry
  dockerignore: '\u{1F433}', // whale

  // Default
  default: '\u{1F4C4}', // document
};

function getFileIcon(entry: FileEntry): string {
  if (entry.type === 'directory') {
    return FILE_ICONS.directory ?? '\u{1F4C1}';
  }

  const ext = entry.name.split('.').pop()?.toLowerCase() ?? '';

  // Check for special filenames
  if (entry.name.startsWith('.')) {
    const specialName = entry.name.toLowerCase();
    if (specialName === '.env' || specialName.startsWith('.env.')) {
      return FILE_ICONS.env ?? '\u{1F510}';
    }
    if (specialName === '.gitignore') {
      return FILE_ICONS.gitignore ?? '\u{1F6AB}';
    }
  }

  return FILE_ICONS[ext] ?? FILE_ICONS.default ?? '\u{1F4C4}';
}

export interface FilePickerProps {
  /** Unique component ID */
  id: string;
  /** Current directory path */
  currentPath: string;
  /** File entries in current directory */
  entries: FileEntry[];
  /** Glob filter pattern */
  filterPattern?: string;
  /** Show hidden files */
  showHidden?: boolean;
  /** Show file sizes */
  showSizes?: boolean;
  /** Show file icons */
  showIcons?: boolean;
  /** Maximum visible entries */
  maxVisible?: number;
  /** Whether component is visible */
  visible?: boolean;
  /** Whether component has focus */
  focused?: boolean;
  /** Show path bar */
  showPathBar?: boolean;
  /** Show filter input */
  showFilterInput?: boolean;
  /** Show help hints */
  showHelp?: boolean;
  /** Selected entry index */
  selectedIndex?: number;
  /** Multiple selection mode */
  multiSelect?: boolean;
  /** Selected paths (for multi-select) */
  selectedPaths?: string[];
  /** Sort order */
  sortBy?: 'name' | 'size' | 'modified' | 'type';
  /** Sort direction */
  sortDirection?: 'asc' | 'desc';
  /** Called when file/directory is selected */
  onSelect?: (entry: FileEntry) => void;
  /** Called when navigating into directory */
  onNavigate?: (path: string) => void;
  /** Called when going up to parent */
  onNavigateUp?: () => void;
  /** Called when filter changes */
  onFilterChange?: (pattern: string) => void;
  /** Called when selection is confirmed (Enter on file) */
  onConfirm?: (entries: FileEntry[]) => void;
}

export const FilePicker: React.FC<FilePickerProps> = ({
  id,
  currentPath,
  entries,
  filterPattern = '',
  showHidden = false,
  showSizes = true,
  showIcons = true,
  maxVisible = 15,
  visible = true,
  focused = false,
  showPathBar = true,
  showFilterInput = true,
  showHelp = true,
  selectedIndex: controlledSelectedIndex,
  multiSelect = false,
  selectedPaths = [],
  sortBy = 'type',
  sortDirection = 'asc',
  onSelect,
  onNavigate,
  onNavigateUp,
  onFilterChange,
  onConfirm,
}) => {
  // Internal state
  const [internalSelectedIndex, setInternalSelectedIndex] = useState(0);
  const [internalFilter, setInternalFilter] = useState(filterPattern);
  const [isFilterMode, setIsFilterMode] = useState(false);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [internalSelectedPaths, setInternalSelectedPaths] = useState<string[]>(selectedPaths);

  const selectedIndex = controlledSelectedIndex ?? internalSelectedIndex;
  const currentFilter = filterPattern || internalFilter;
  const currentSelectedPaths = selectedPaths.length > 0 ? selectedPaths : internalSelectedPaths;

  // Filter and sort entries
  const processedEntries = useMemo(() => {
    let filtered = entries;

    // Filter hidden files
    if (!showHidden) {
      filtered = filtered.filter((e) => !e.isHidden && !e.name.startsWith('.'));
    }

    // Apply glob filter
    if (currentFilter) {
      filtered = filtered.filter((e) => matchGlob(e.name, currentFilter));
    }

    // Sort entries
    const sorted = [...filtered].sort((a, b) => {
      // Always put directories first when sorting by type
      if (sortBy === 'type') {
        if (a.type !== b.type) {
          return a.type === 'directory' ? -1 : 1;
        }
      }

      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'size':
          comparison = (a.size ?? 0) - (b.size ?? 0);
          break;
        case 'modified':
          const aTime = a.modified ? new Date(a.modified).getTime() : 0;
          const bTime = b.modified ? new Date(b.modified).getTime() : 0;
          comparison = aTime - bTime;
          break;
        case 'type':
          comparison = a.name.localeCompare(b.name);
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [entries, showHidden, currentFilter, sortBy, sortDirection]);

  // Calculate visible entries
  const visibleEntries = useMemo(() => {
    return processedEntries.slice(scrollOffset, scrollOffset + maxVisible);
  }, [processedEntries, scrollOffset, maxVisible]);

  // Ensure selected index is in bounds
  const safeSelectedIndex = Math.min(selectedIndex, processedEntries.length - 1);

  // Handle navigation
  const navigateInto = useCallback(
    (entry: FileEntry) => {
      if (entry.type === 'directory') {
        emitFileNavigate(id, currentPath, entry.path, 'into');
        onNavigate?.(entry.path);
      }
    },
    [id, currentPath, onNavigate]
  );

  const navigateUp = useCallback(() => {
    const parentPath = currentPath.split('/').slice(0, -1).join('/') || '/';
    emitFileNavigate(id, currentPath, parentPath, 'up');
    onNavigateUp?.();
  }, [id, currentPath, onNavigateUp]);

  // Handle selection
  const selectEntry = useCallback(
    (index: number) => {
      if (index >= 0 && index < processedEntries.length) {
        const entry = processedEntries[index];
        if (entry) {
          setInternalSelectedIndex(index);
          emitFileSelect(id, entry.path, entry.name, entry.type, 'select');
          onSelect?.(entry);
        }
      }
    },
    [processedEntries, id, onSelect]
  );

  // Handle multi-select toggle
  const toggleSelection = useCallback(
    (entry: FileEntry) => {
      if (!multiSelect) return;

      const isSelected = currentSelectedPaths.includes(entry.path);
      const newPaths = isSelected
        ? currentSelectedPaths.filter((p) => p !== entry.path)
        : [...currentSelectedPaths, entry.path];

      setInternalSelectedPaths(newPaths);
    },
    [multiSelect, currentSelectedPaths]
  );

  // Handle confirmation
  const confirmSelection = useCallback(() => {
    if (multiSelect && currentSelectedPaths.length > 0) {
      const selectedEntries = processedEntries.filter((e) =>
        currentSelectedPaths.includes(e.path)
      );
      onConfirm?.(selectedEntries);
    } else {
      const entry = processedEntries[safeSelectedIndex];
      if (entry) {
        if (entry.type === 'directory') {
          navigateInto(entry);
        } else {
          emitFileSelect(id, entry.path, entry.name, entry.type, 'confirm');
          onConfirm?.([entry]);
        }
      }
    }
  }, [multiSelect, currentSelectedPaths, processedEntries, safeSelectedIndex, navigateInto, id, onConfirm]);

  // Handle keyboard input
  useInput(
    (input, key) => {
      if (!focused) return;

      // Filter mode input
      if (isFilterMode) {
        if (key.escape) {
          setIsFilterMode(false);
          return;
        }
        if (key.return) {
          setIsFilterMode(false);
          onFilterChange?.(internalFilter);
          emitFileFilter(id, internalFilter, processedEntries.length);
          return;
        }
        if (key.backspace || key.delete) {
          setInternalFilter((f) => f.slice(0, -1));
          return;
        }
        if (input && !key.ctrl && !key.meta) {
          setInternalFilter((f) => f + input);
          return;
        }
        return;
      }

      // Normal mode navigation
      if (key.upArrow || input === 'k') {
        const newIndex = Math.max(0, safeSelectedIndex - 1);
        selectEntry(newIndex);
        if (newIndex < scrollOffset) {
          setScrollOffset(newIndex);
        }
        return;
      }
      if (key.downArrow || input === 'j') {
        const newIndex = Math.min(processedEntries.length - 1, safeSelectedIndex + 1);
        selectEntry(newIndex);
        if (newIndex >= scrollOffset + maxVisible) {
          setScrollOffset(newIndex - maxVisible + 1);
        }
        return;
      }

      // Page navigation
      if (key.pageUp) {
        const newIndex = Math.max(0, safeSelectedIndex - maxVisible);
        selectEntry(newIndex);
        setScrollOffset(Math.max(0, scrollOffset - maxVisible));
        return;
      }
      if (key.pageDown) {
        const newIndex = Math.min(processedEntries.length - 1, safeSelectedIndex + maxVisible);
        selectEntry(newIndex);
        setScrollOffset(Math.min(processedEntries.length - maxVisible, scrollOffset + maxVisible));
        return;
      }

      // Jump to top/bottom
      if (input === 'g') {
        selectEntry(0);
        setScrollOffset(0);
        return;
      }
      if (input === 'G') {
        selectEntry(processedEntries.length - 1);
        setScrollOffset(Math.max(0, processedEntries.length - maxVisible));
        return;
      }

      // Enter directory or confirm file
      if (key.return) {
        confirmSelection();
        return;
      }

      // Navigate into directory
      if (key.rightArrow || input === 'l') {
        const entry = processedEntries[safeSelectedIndex];
        if (entry?.type === 'directory') {
          navigateInto(entry);
        }
        return;
      }

      // Navigate up
      if (key.leftArrow || input === 'h' || input === '-') {
        navigateUp();
        return;
      }

      // Toggle hidden files
      // (Would need external state management for this)

      // Enter filter mode
      if (input === '/' || input === 'f') {
        setIsFilterMode(true);
        return;
      }

      // Clear filter
      if (key.escape) {
        setInternalFilter('');
        onFilterChange?.('');
        emitFileFilter(id, '', entries.length);
        return;
      }

      // Multi-select toggle
      if (input === ' ' && multiSelect) {
        const entry = processedEntries[safeSelectedIndex];
        if (entry) {
          toggleSelection(entry);
        }
        return;
      }

      // Select all (multi-select)
      if (input === 'a' && multiSelect) {
        if (currentSelectedPaths.length === processedEntries.length) {
          setInternalSelectedPaths([]);
        } else {
          setInternalSelectedPaths(processedEntries.map((e) => e.path));
        }
        return;
      }
    },
    { isActive: focused }
  );

  if (!visible) {
    return null;
  }

  // Render path bar
  const renderPathBar = () => {
    if (!showPathBar) return null;

    const pathParts = currentPath.split('/').filter(Boolean);

    return (
      <Box marginBottom={1}>
        <Text color="cyan">{'\u{1F4C2}'} </Text>
        <Text color="blue">/</Text>
        {pathParts.map((part, index) => (
          <Text key={index}>
            <Text color="blue">{part}</Text>
            {index < pathParts.length - 1 && <Text color="gray">/</Text>}
          </Text>
        ))}
      </Box>
    );
  };

  // Render filter input
  const renderFilterInput = () => {
    if (!showFilterInput) return null;

    return (
      <Box marginBottom={1}>
        <Text dimColor>Filter: </Text>
        {isFilterMode ? (
          <>
            <Text color="cyan">{internalFilter}</Text>
            <Text color="cyan" inverse>
              {' '}
            </Text>
          </>
        ) : currentFilter ? (
          <Text color="yellow">{currentFilter}</Text>
        ) : (
          <Text dimColor>(press / to filter)</Text>
        )}
        {currentFilter && (
          <Text dimColor> ({processedEntries.length} matches)</Text>
        )}
      </Box>
    );
  };

  // Render file entry
  const renderEntry = (entry: FileEntry, displayIndex: number) => {
    const actualIndex = scrollOffset + displayIndex;
    const isSelected = actualIndex === safeSelectedIndex;
    const isMultiSelected = currentSelectedPaths.includes(entry.path);

    return (
      <Box key={entry.path}>
        {/* Selection indicator */}
        <Text color={isSelected && focused ? 'cyan' : undefined}>
          {isSelected ? '\u{25B8}' : ' '}
        </Text>

        {/* Multi-select checkbox */}
        {multiSelect && (
          <Text color={isMultiSelected ? 'green' : 'gray'}>
            {isMultiSelected ? '\u{25C9}' : '\u{25CB}'}{' '}
          </Text>
        )}

        {/* Icon */}
        {showIcons && (
          <Text>{getFileIcon(entry)} </Text>
        )}

        {/* Name */}
        <Text
          color={entry.type === 'directory' ? 'blue' : undefined}
          bold={isSelected && focused}
          dimColor={entry.isHidden}
        >
          {entry.name}
        </Text>

        {/* Directory indicator */}
        {entry.type === 'directory' && <Text color="blue">/</Text>}

        {/* Size (files only) */}
        {showSizes && entry.type === 'file' && entry.size !== undefined && (
          <Text dimColor> {formatFileSize(entry.size)}</Text>
        )}
      </Box>
    );
  };

  // Scroll indicators
  const canScrollUp = scrollOffset > 0;
  const canScrollDown = scrollOffset + maxVisible < processedEntries.length;

  return (
    <Box flexDirection="column">
      {/* Path bar */}
      {renderPathBar()}

      {/* Filter input */}
      {renderFilterInput()}

      {/* Parent directory entry */}
      <Box>
        <Text dimColor>{' \u{1F4C1} .. (parent directory)'}</Text>
      </Box>

      {/* Scroll up indicator */}
      {canScrollUp && (
        <Text dimColor>{'  '}{'\u{25B2}'} {scrollOffset} more above</Text>
      )}

      {/* File entries */}
      {visibleEntries.map((entry, idx) => renderEntry(entry, idx))}

      {/* Scroll down indicator */}
      {canScrollDown && (
        <Text dimColor>
          {'  '}{'\u{25BC}'} {processedEntries.length - scrollOffset - maxVisible} more below
        </Text>
      )}

      {/* Empty state */}
      {processedEntries.length === 0 && (
        <Text dimColor>
          {currentFilter ? 'No files matching filter' : 'Empty directory'}
        </Text>
      )}

      {/* Selection count (multi-select) */}
      {multiSelect && currentSelectedPaths.length > 0 && (
        <Box marginTop={1}>
          <Text color="green">{currentSelectedPaths.length} item(s) selected</Text>
        </Box>
      )}

      {/* Help hints */}
      {showHelp && focused && (
        <Box marginTop={1}>
          <Text dimColor>
            j/k: navigate | Enter: open | h/-: up | /: filter | {multiSelect ? 'Space: select | a: select all | ' : ''}Esc: clear
          </Text>
        </Box>
      )}
    </Box>
  );
};

/**
 * Simple file picker with minimal options
 */
export interface SimpleFilePickerProps {
  id: string;
  currentPath: string;
  entries: FileEntry[];
  focused?: boolean;
  onSelect?: (entry: FileEntry) => void;
  onNavigate?: (path: string) => void;
  onNavigateUp?: () => void;
  onConfirm?: (entries: FileEntry[]) => void;
}

export const SimpleFilePicker: React.FC<SimpleFilePickerProps> = ({
  id,
  currentPath,
  entries,
  focused = false,
  onSelect,
  onNavigate,
  onNavigateUp,
  onConfirm,
}) => {
  return (
    <FilePicker
      id={id}
      currentPath={currentPath}
      entries={entries}
      focused={focused}
      showSizes={false}
      showIcons={true}
      showFilterInput={false}
      showHelp={false}
      maxVisible={10}
      onSelect={onSelect}
      onNavigate={onNavigate}
      onNavigateUp={onNavigateUp}
      onConfirm={onConfirm}
    />
  );
};

/**
 * Directory picker (only shows directories)
 */
export interface DirectoryPickerProps extends Omit<FilePickerProps, 'entries'> {
  entries: FileEntry[];
}

export const DirectoryPicker: React.FC<DirectoryPickerProps> = ({
  entries,
  ...props
}) => {
  const directoriesOnly = useMemo(() => {
    return entries.filter((e) => e.type === 'directory');
  }, [entries]);

  return <FilePicker {...props} entries={directoriesOnly} />;
};

/**
 * Create file entries from path strings (utility function)
 */
export function createFileEntries(
  paths: string[],
  basePath: string = ''
): FileEntry[] {
  return paths.map((path) => {
    const fullPath = basePath ? `${basePath}/${path}` : path;
    const name = path.split('/').pop() ?? path;
    const isDirectory = !name.includes('.') || name.endsWith('/');

    return {
      name: name.replace(/\/$/, ''),
      path: fullPath.replace(/\/$/, ''),
      type: isDirectory ? 'directory' : 'file',
      isHidden: name.startsWith('.'),
    };
  });
}
