#!/usr/bin/env node
/**
 * Completion UI Hook (EPIC-9)
 *
 * This hook handles completion/autocomplete events and transforms them
 * into rich UI components for terminal display.
 *
 * Hook Type: Completion
 * Triggered: When autocomplete suggestions are needed
 */

import { readFileSync } from 'fs';

/**
 * Completion item types and their icons
 */
const COMPLETION_ICONS = {
  file: 'F',
  folder: 'D',
  command: '>',
  variable: '$',
  function: 'f',
  keyword: 'K',
  snippet: 'S',
  text: 'T',
  method: 'm',
  property: 'p',
  class: 'C',
  interface: 'I',
  module: 'M',
  value: 'v',
  enum: 'E',
  constant: 'c',
  reference: 'r',
  operator: 'o',
  default: '.',
};

/**
 * Completion item colors by type
 */
const COMPLETION_COLORS = {
  file: 'blue',
  folder: 'cyan',
  command: 'green',
  variable: 'yellow',
  function: 'magenta',
  keyword: 'red',
  snippet: 'gray',
  text: 'white',
  method: 'magenta',
  property: 'cyan',
  class: 'yellow',
  interface: 'blue',
  module: 'green',
  value: 'white',
  enum: 'yellow',
  constant: 'red',
  reference: 'blue',
  operator: 'gray',
  default: 'white',
};

/**
 * Transform completion items into list items
 * @param {Array} items - Completion items
 * @returns {Array} Transformed list items
 */
function transformCompletionItems(items) {
  return items.map((item, idx) => {
    const type = item.type || item.kind || 'default';
    const icon = COMPLETION_ICONS[type] || COMPLETION_ICONS.default;
    const label = item.label || item.text || item.value || String(item);
    const detail = item.detail || item.description || '';

    return {
      id: item.id || `completion-${idx}`,
      label: `[${icon}] ${label}${detail ? ` - ${detail}` : ''}`,
      value: item.value || item.insertText || label,
      icon,
      type,
    };
  });
}

/**
 * Transform completion suggestions into UILayout
 * @param {object} completionData - Completion request data
 * @returns {object} UILayout specification
 */
function transformCompletionUI(completionData) {
  const {
    items = [],
    prefix = '',
    context = {},
    position = {},
    maxVisible = 10,
    id,
  } = completionData;

  const completionId = id || `completion-${Date.now()}`;

  if (items.length === 0) {
    return {
      version: '1.0',
      id: completionId,
      root: {
        id: `${completionId}-empty`,
        type: 'TextBlock',
        content: 'No completions available',
        color: 'gray',
        dimColor: true,
      },
      metadata: {
        type: 'completion',
        empty: true,
      },
    };
  }

  const listItems = transformCompletionItems(items.slice(0, 50));
  const visibleCount = Math.min(maxVisible, listItems.length);

  const children = [];

  // Add prefix indicator if present
  if (prefix) {
    children.push({
      id: `${completionId}-prefix`,
      type: 'TextBlock',
      content: `Completions for: ${prefix}`,
      color: 'cyan',
      bold: true,
    });
  }

  // Add completion list
  children.push({
    id: `${completionId}-list`,
    type: 'List',
    items: listItems,
    selectedIndex: 0,
    maxHeight: visibleCount,
  });

  // Add count indicator if there are more items
  if (items.length > listItems.length) {
    children.push({
      id: `${completionId}-more`,
      type: 'TextBlock',
      content: `... and ${items.length - listItems.length} more`,
      color: 'gray',
      dimColor: true,
    });
  }

  // Add hint for navigation
  children.push({
    id: `${completionId}-hint`,
    type: 'TextBlock',
    content: 'Up/Down: Navigate | Tab/Enter: Select | Esc: Cancel',
    color: 'gray',
    dimColor: true,
  });

  return {
    version: '1.0',
    id: completionId,
    title: 'Completions',
    root: {
      id: `${completionId}-container`,
      type: 'Container',
      direction: 'column',
      gap: 1,
      border: { style: 'single', color: 'cyan' },
      padding: { left: 1, right: 1 },
      width: 50,
      children,
    },
    focusedComponentId: `${completionId}-list`,
    metadata: {
      type: 'completion',
      prefix,
      totalItems: items.length,
      visibleItems: listItems.length,
      context,
      position,
    },
  };
}

/**
 * Transform file completion into UILayout
 * @param {object} completionData - File completion data
 * @returns {object} UILayout specification
 */
function transformFileCompletion(completionData) {
  const {
    files = [],
    currentPath = '',
    filter = '',
    showHidden = false,
    id,
  } = completionData;

  const completionId = id || `file-completion-${Date.now()}`;

  // Transform files into completion items with file/folder types
  const items = files.map((file) => ({
    ...file,
    type: file.isDirectory ? 'folder' : 'file',
    label: file.name || file.path,
    value: file.path || file.name,
  }));

  const listItems = transformCompletionItems(items.slice(0, 30));

  const children = [
    {
      id: `${completionId}-path`,
      type: 'TextBlock',
      content: `Path: ${currentPath || '/'}`,
      color: 'blue',
    },
  ];

  if (filter) {
    children.push({
      id: `${completionId}-filter`,
      type: 'TextBlock',
      content: `Filter: ${filter}`,
      color: 'cyan',
    });
  }

  children.push({
    id: `${completionId}-list`,
    type: 'List',
    items: listItems,
    selectedIndex: 0,
    maxHeight: 15,
  });

  children.push({
    id: `${completionId}-hint`,
    type: 'TextBlock',
    content: 'Tab: Complete | Enter: Select | Ctrl+H: Toggle hidden',
    color: 'gray',
    dimColor: true,
  });

  return {
    version: '1.0',
    id: completionId,
    title: 'File Completion',
    root: {
      id: `${completionId}-container`,
      type: 'Container',
      direction: 'column',
      gap: 1,
      border: { style: 'single', color: 'blue' },
      padding: { left: 1, right: 1 },
      children,
    },
    focusedComponentId: `${completionId}-list`,
    metadata: {
      type: 'file_completion',
      currentPath,
      filter,
      showHidden,
      totalFiles: files.length,
    },
  };
}

/**
 * Transform command completion into UILayout
 * @param {object} completionData - Command completion data
 * @returns {object} UILayout specification
 */
function transformCommandCompletion(completionData) {
  const {
    commands = [],
    prefix = '',
    history = [],
    id,
  } = completionData;

  const completionId = id || `cmd-completion-${Date.now()}`;

  // Combine commands with history
  const allItems = [
    ...history.slice(0, 5).map((h) => ({
      label: h,
      type: 'text',
      detail: 'history',
      value: h,
    })),
    ...commands.map((cmd) => ({
      label: cmd.name || cmd,
      type: 'command',
      detail: cmd.description || '',
      value: cmd.name || cmd,
    })),
  ];

  const listItems = transformCompletionItems(allItems.slice(0, 20));

  const children = [];

  if (prefix) {
    children.push({
      id: `${completionId}-prefix`,
      type: 'TextBlock',
      content: `Command: ${prefix}`,
      color: 'green',
    });
  }

  if (history.length > 0) {
    children.push({
      id: `${completionId}-history-label`,
      type: 'TextBlock',
      content: 'Recent:',
      color: 'gray',
      bold: true,
    });
  }

  children.push({
    id: `${completionId}-list`,
    type: 'List',
    items: listItems,
    selectedIndex: 0,
    maxHeight: 12,
  });

  children.push({
    id: `${completionId}-hint`,
    type: 'TextBlock',
    content: 'Tab: Complete | Enter: Execute | Ctrl+R: Search history',
    color: 'gray',
    dimColor: true,
  });

  return {
    version: '1.0',
    id: completionId,
    title: 'Command Completion',
    root: {
      id: `${completionId}-container`,
      type: 'Container',
      direction: 'column',
      gap: 1,
      border: { style: 'single', color: 'green' },
      padding: { left: 1, right: 1 },
      children,
    },
    focusedComponentId: `${completionId}-list`,
    metadata: {
      type: 'command_completion',
      prefix,
      hasHistory: history.length > 0,
    },
  };
}

/**
 * Handle completion selection event
 * @param {object} selectionData - Selection event data
 * @returns {object} Selection result
 */
function handleCompletionSelection(selectionData) {
  const { selectedItem, completionId, action = 'select' } = selectionData;

  return {
    action: 'completion_selected',
    completion_id: completionId,
    selected_value: selectedItem?.value || selectedItem,
    selected_label: selectedItem?.label || String(selectedItem),
    selection_action: action,
  };
}

/**
 * Main hook handler
 */
async function main() {
  try {
    const input = readFileSync(0, 'utf-8');
    const hookData = JSON.parse(input);

    const { completion_type, action, ...completionData } = hookData;

    let result = null;

    // Handle selection events
    if (action === 'select') {
      result = handleCompletionSelection(completionData);
      process.stdout.write(JSON.stringify(result));
      return;
    }

    // Transform based on completion type
    let uiSpec = null;

    switch (completion_type) {
      case 'file':
        uiSpec = transformFileCompletion(completionData);
        break;
      case 'command':
        uiSpec = transformCommandCompletion(completionData);
        break;
      default:
        uiSpec = transformCompletionUI(completionData);
    }

    if (uiSpec) {
      process.stdout.write(
        JSON.stringify({
          action: 'show_completion',
          ui_layout: uiSpec,
          completion_type: completion_type || 'generic',
        })
      );
    } else {
      process.stdout.write(JSON.stringify({ action: 'passthrough' }));
    }
  } catch (error) {
    process.stderr.write(`Completion UI Error: ${error.message}\n`);
    process.stdout.write(JSON.stringify({ action: 'passthrough', error: error.message }));
  }
}

main();
