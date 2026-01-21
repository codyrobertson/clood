#!/usr/bin/env node
/**
 * UI Interceptor - PreToolUse Hook (EPIC-9)
 *
 * This hook intercepts tool use events before execution and transforms
 * them into UILayout specifications for rich terminal rendering.
 *
 * Hook Type: PreToolUse
 * Triggered: Before any tool execution
 */

import { readFileSync } from 'fs';

/**
 * Tool types that should trigger UI transformations
 */
const UI_INTERCEPTABLE_TOOLS = [
  'AskUserQuestion',
  'TodoWrite',
  'Read',
  'Write',
  'Edit',
  'Bash',
  'Glob',
  'Grep',
];

/**
 * Transform AskUserQuestion tool call into UI specification
 * @param {object} toolInput - The tool input parameters
 * @returns {object} UILayout specification
 */
function transformAskUserQuestion(toolInput) {
  const { question, options, default_value, allow_multiple } = toolInput;

  const components = [];

  // Add question text block
  components.push({
    id: 'question-text',
    type: 'TextBlock',
    content: question || 'Please select an option:',
    color: 'cyan',
    bold: true,
  });

  // Transform options into List component
  if (options && Array.isArray(options)) {
    const listItems = options.map((opt, idx) => ({
      id: `option-${idx}`,
      label: typeof opt === 'string' ? opt : opt.label || String(opt),
      value: typeof opt === 'string' ? opt : opt.value || opt,
    }));

    components.push({
      id: 'options-list',
      type: 'List',
      items: listItems,
      multiSelect: allow_multiple || false,
      selectedIndex: default_value !== undefined ? options.indexOf(default_value) : 0,
    });
  }

  // Add action buttons
  components.push({
    id: 'action-buttons',
    type: 'ButtonRow',
    buttons: [
      { id: 'confirm', label: 'Confirm', shortcut: 'enter', primary: true },
      { id: 'cancel', label: 'Cancel', shortcut: 'esc' },
    ],
  });

  return {
    version: '1.0',
    id: `ask-user-${Date.now()}`,
    title: 'User Input Required',
    root: {
      id: 'ask-container',
      type: 'Container',
      direction: 'column',
      gap: 1,
      padding: { top: 1, bottom: 1, left: 2, right: 2 },
      border: { style: 'round', color: 'cyan' },
      children: components,
    },
    focusedComponentId: 'options-list',
  };
}

/**
 * Transform TodoWrite tool call into UI specification
 * @param {object} toolInput - The tool input parameters
 * @returns {object} UILayout specification
 */
function transformTodoWrite(toolInput) {
  const { todos } = toolInput;

  if (!todos || !Array.isArray(todos)) {
    return null;
  }

  const tableRows = todos.map((todo, idx) => ({
    index: idx + 1,
    status: getStatusIcon(todo.status),
    task: todo.content || todo.task || '',
  }));

  return {
    version: '1.0',
    id: `todo-${Date.now()}`,
    title: 'Task List',
    root: {
      id: 'todo-container',
      type: 'Container',
      direction: 'column',
      gap: 1,
      border: { style: 'single', color: 'yellow' },
      children: [
        {
          id: 'todo-header',
          type: 'TextBlock',
          content: 'Tasks',
          bold: true,
          color: 'yellow',
        },
        {
          id: 'todo-table',
          type: 'Table',
          columns: [
            { id: 'index', header: '#', width: 4, align: 'center' },
            { id: 'status', header: 'Status', width: 8, align: 'center' },
            { id: 'task', header: 'Task', width: 'fill', align: 'left' },
          ],
          rows: tableRows,
        },
      ],
    },
  };
}

/**
 * Get status icon for todo status
 * @param {string} status - The todo status
 * @returns {string} Status icon
 */
function getStatusIcon(status) {
  const icons = {
    pending: '[ ]',
    in_progress: '[*]',
    completed: '[x]',
    blocked: '[!]',
  };
  return icons[status] || '[ ]';
}

/**
 * Transform file operation tools (Read, Write, Edit) into UI preview
 * @param {string} toolName - The tool name
 * @param {object} toolInput - The tool input parameters
 * @returns {object|null} UILayout specification or null
 */
function transformFileOperation(toolName, toolInput) {
  const { file_path, path, content, old_string, new_string } = toolInput;
  const filePath = file_path || path;

  if (!filePath) {
    return null;
  }

  if (toolName === 'Edit' && old_string && new_string) {
    return {
      version: '1.0',
      id: `edit-preview-${Date.now()}`,
      title: `Edit: ${filePath}`,
      root: {
        id: 'diff-container',
        type: 'Container',
        direction: 'column',
        border: { style: 'single', color: 'blue' },
        children: [
          {
            id: 'diff-view',
            type: 'DiffView',
            mode: 'unified',
            oldContent: old_string,
            newContent: new_string,
            filePath: filePath,
          },
        ],
      },
    };
  }

  return {
    version: '1.0',
    id: `file-op-${Date.now()}`,
    title: `${toolName}: ${filePath}`,
    root: {
      id: 'file-info',
      type: 'TextBlock',
      content: `${toolName} operation on: ${filePath}`,
      color: 'blue',
    },
  };
}

/**
 * Transform Bash tool call into UI specification
 * @param {object} toolInput - The tool input parameters
 * @returns {object} UILayout specification
 */
function transformBash(toolInput) {
  const { command, description } = toolInput;

  return {
    version: '1.0',
    id: `bash-${Date.now()}`,
    title: 'Command Execution',
    root: {
      id: 'bash-container',
      type: 'Container',
      direction: 'column',
      gap: 1,
      border: { style: 'single', color: 'green' },
      children: [
        {
          id: 'bash-header',
          type: 'TextBlock',
          content: description || 'Running command...',
          color: 'green',
          bold: true,
        },
        {
          id: 'bash-command',
          type: 'TextBlock',
          content: `$ ${command}`,
          color: 'gray',
        },
        {
          id: 'bash-progress',
          type: 'ProgressBar',
          value: 0,
          label: 'Executing...',
          color: 'green',
        },
      ],
    },
  };
}

/**
 * Main hook handler - processes stdin and outputs transformed UI spec
 */
async function main() {
  try {
    // Read hook input from stdin
    const input = readFileSync(0, 'utf-8');
    const hookData = JSON.parse(input);

    const { tool_name, tool_input } = hookData;

    // Check if this tool should be intercepted
    if (!UI_INTERCEPTABLE_TOOLS.includes(tool_name)) {
      // Pass through without transformation
      process.stdout.write(JSON.stringify({ action: 'passthrough' }));
      return;
    }

    let uiSpec = null;

    // Transform based on tool type
    switch (tool_name) {
      case 'AskUserQuestion':
        uiSpec = transformAskUserQuestion(tool_input);
        break;
      case 'TodoWrite':
        uiSpec = transformTodoWrite(tool_input);
        break;
      case 'Read':
      case 'Write':
      case 'Edit':
        uiSpec = transformFileOperation(tool_name, tool_input);
        break;
      case 'Bash':
        uiSpec = transformBash(tool_input);
        break;
      default:
        uiSpec = null;
    }

    if (uiSpec) {
      process.stdout.write(
        JSON.stringify({
          action: 'render',
          ui_layout: uiSpec,
          original_tool: tool_name,
        })
      );
    } else {
      process.stdout.write(JSON.stringify({ action: 'passthrough' }));
    }
  } catch (error) {
    // On error, pass through without transformation
    process.stderr.write(`UI Interceptor Error: ${error.message}\n`);
    process.stdout.write(JSON.stringify({ action: 'passthrough', error: error.message }));
  }
}

main();
