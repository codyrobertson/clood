#!/usr/bin/env node
/**
 * Result Renderer - PostToolUse Hook (EPIC-9)
 *
 * This hook processes tool execution results and transforms them
 * into rich UILayout specifications for terminal rendering.
 *
 * Hook Type: PostToolUse
 * Triggered: After any tool execution completes
 */

import { readFileSync } from 'fs';

/**
 * Tool types that should have their results rendered
 */
const RENDERABLE_TOOLS = [
  'Bash',
  'Read',
  'Glob',
  'Grep',
  'TodoWrite',
  'WebFetch',
  'WebSearch',
];

/**
 * Render Bash command result
 * @param {object} result - The tool result
 * @param {object} toolInput - Original tool input
 * @returns {object} UILayout specification
 */
function renderBashResult(result, toolInput) {
  const { output, exit_code, error } = result;
  const isSuccess = exit_code === 0 || exit_code === undefined;
  const statusColor = isSuccess ? 'green' : 'red';

  const children = [
    {
      id: 'bash-status',
      type: 'TextBlock',
      content: isSuccess ? 'Command completed successfully' : `Command failed (exit: ${exit_code})`,
      color: statusColor,
      bold: true,
    },
  ];

  // Add command display
  if (toolInput.command) {
    children.push({
      id: 'bash-cmd',
      type: 'TextBlock',
      content: `$ ${toolInput.command}`,
      color: 'gray',
      dimColor: true,
    });
  }

  // Add output if present
  if (output) {
    const lines = output.split('\n');
    const truncated = lines.length > 50;
    const displayOutput = truncated ? lines.slice(0, 50).join('\n') + '\n... (truncated)' : output;

    children.push({
      id: 'bash-output',
      type: 'TextBlock',
      content: displayOutput,
      wrap: true,
    });
  }

  // Add error if present
  if (error) {
    children.push({
      id: 'bash-error',
      type: 'TextBlock',
      content: error,
      color: 'red',
    });
  }

  return {
    version: '1.0',
    id: `bash-result-${Date.now()}`,
    title: 'Command Result',
    root: {
      id: 'result-container',
      type: 'Container',
      direction: 'column',
      gap: 1,
      border: { style: 'single', color: statusColor },
      padding: { top: 1, bottom: 1, left: 2, right: 2 },
      children,
    },
  };
}

/**
 * Render Read file result
 * @param {object} result - The tool result
 * @param {object} toolInput - Original tool input
 * @returns {object} UILayout specification
 */
function renderReadResult(result, toolInput) {
  const { content, error } = result;
  const filePath = toolInput.file_path || toolInput.path;

  if (error) {
    return {
      version: '1.0',
      id: `read-error-${Date.now()}`,
      root: {
        id: 'error-block',
        type: 'TextBlock',
        content: `Error reading ${filePath}: ${error}`,
        color: 'red',
      },
    };
  }

  // Detect language from file extension
  const ext = filePath ? filePath.split('.').pop() : '';
  const languageMap = {
    js: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    jsx: 'javascript',
    py: 'python',
    rb: 'ruby',
    go: 'go',
    rs: 'rust',
    json: 'json',
    md: 'markdown',
    yaml: 'yaml',
    yml: 'yaml',
  };
  const language = languageMap[ext] || ext;

  const lines = (content || '').split('\n');
  const lineCount = lines.length;
  const truncated = lineCount > 100;
  const displayContent = truncated ? lines.slice(0, 100).join('\n') : content;

  return {
    version: '1.0',
    id: `read-result-${Date.now()}`,
    title: filePath || 'File Content',
    root: {
      id: 'read-container',
      type: 'Container',
      direction: 'column',
      border: { style: 'single', color: 'blue' },
      children: [
        {
          id: 'file-header',
          type: 'TextBlock',
          content: `${filePath} (${lineCount} lines${truncated ? ', showing first 100' : ''})`,
          color: 'blue',
          bold: true,
        },
        {
          id: 'file-content',
          type: 'TextBlock',
          content: displayContent || '(empty file)',
          wrap: false,
        },
      ],
    },
  };
}

/**
 * Render Glob/Grep search results
 * @param {object} result - The tool result
 * @param {string} toolName - The tool name
 * @param {object} toolInput - Original tool input
 * @returns {object} UILayout specification
 */
function renderSearchResult(result, toolName, toolInput) {
  const { files, matches, count } = result;
  const items = files || matches || [];

  if (items.length === 0) {
    return {
      version: '1.0',
      id: `search-empty-${Date.now()}`,
      root: {
        id: 'empty-result',
        type: 'TextBlock',
        content: `No ${toolName === 'Glob' ? 'files' : 'matches'} found`,
        color: 'yellow',
      },
    };
  }

  const listItems = items.slice(0, 50).map((item, idx) => ({
    id: `result-${idx}`,
    label: typeof item === 'string' ? item : item.path || item.file || String(item),
    value: item,
  }));

  return {
    version: '1.0',
    id: `search-result-${Date.now()}`,
    title: `${toolName} Results`,
    root: {
      id: 'search-container',
      type: 'Container',
      direction: 'column',
      border: { style: 'single', color: 'magenta' },
      children: [
        {
          id: 'search-header',
          type: 'TextBlock',
          content: `Found ${count || items.length} ${toolName === 'Glob' ? 'files' : 'matches'}${items.length > 50 ? ' (showing first 50)' : ''}`,
          color: 'magenta',
          bold: true,
        },
        {
          id: 'search-list',
          type: 'List',
          items: listItems,
          maxHeight: 20,
        },
      ],
    },
  };
}

/**
 * Render TodoWrite result
 * @param {object} result - The tool result
 * @param {object} toolInput - Original tool input
 * @returns {object} UILayout specification
 */
function renderTodoResult(result, toolInput) {
  const todos = toolInput.todos || [];

  const pending = todos.filter((t) => t.status === 'pending').length;
  const inProgress = todos.filter((t) => t.status === 'in_progress').length;
  const completed = todos.filter((t) => t.status === 'completed').length;

  const progress = todos.length > 0 ? Math.round((completed / todos.length) * 100) : 0;

  return {
    version: '1.0',
    id: `todo-result-${Date.now()}`,
    title: 'Task Progress',
    root: {
      id: 'todo-result-container',
      type: 'Container',
      direction: 'column',
      gap: 1,
      border: { style: 'round', color: 'yellow' },
      padding: { left: 2, right: 2 },
      children: [
        {
          id: 'todo-progress',
          type: 'ProgressBar',
          value: progress,
          showPercentage: true,
          label: 'Progress',
          color: 'yellow',
        },
        {
          id: 'todo-summary',
          type: 'TextBlock',
          content: `Pending: ${pending} | In Progress: ${inProgress} | Completed: ${completed}`,
          color: 'gray',
        },
      ],
    },
  };
}

/**
 * Render web fetch/search results
 * @param {object} result - The tool result
 * @param {string} toolName - The tool name
 * @returns {object} UILayout specification
 */
function renderWebResult(result, toolName) {
  const { content, results, error } = result;

  if (error) {
    return {
      version: '1.0',
      id: `web-error-${Date.now()}`,
      root: {
        id: 'web-error',
        type: 'TextBlock',
        content: `${toolName} error: ${error}`,
        color: 'red',
      },
    };
  }

  if (toolName === 'WebSearch' && results) {
    const listItems = results.slice(0, 10).map((r, idx) => ({
      id: `search-${idx}`,
      label: r.title || r.url,
      value: r.url,
    }));

    return {
      version: '1.0',
      id: `web-search-${Date.now()}`,
      title: 'Search Results',
      root: {
        id: 'search-container',
        type: 'Container',
        direction: 'column',
        border: { style: 'single', color: 'cyan' },
        children: [
          {
            id: 'search-list',
            type: 'List',
            items: listItems,
          },
        ],
      },
    };
  }

  // WebFetch content
  const truncatedContent =
    content && content.length > 2000 ? content.slice(0, 2000) + '\n... (truncated)' : content;

  return {
    version: '1.0',
    id: `web-fetch-${Date.now()}`,
    title: 'Web Content',
    root: {
      id: 'fetch-container',
      type: 'Container',
      direction: 'column',
      border: { style: 'single', color: 'cyan' },
      children: [
        {
          id: 'fetch-content',
          type: 'TextBlock',
          content: truncatedContent || '(no content)',
          wrap: true,
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

    const { tool_name, tool_input, tool_result } = hookData;

    // Check if this tool's results should be rendered
    if (!RENDERABLE_TOOLS.includes(tool_name)) {
      process.stdout.write(JSON.stringify({ action: 'passthrough' }));
      return;
    }

    let uiSpec = null;

    // Render based on tool type
    switch (tool_name) {
      case 'Bash':
        uiSpec = renderBashResult(tool_result, tool_input);
        break;
      case 'Read':
        uiSpec = renderReadResult(tool_result, tool_input);
        break;
      case 'Glob':
      case 'Grep':
        uiSpec = renderSearchResult(tool_result, tool_name, tool_input);
        break;
      case 'TodoWrite':
        uiSpec = renderTodoResult(tool_result, tool_input);
        break;
      case 'WebFetch':
      case 'WebSearch':
        uiSpec = renderWebResult(tool_result, tool_name);
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
    process.stderr.write(`Result Renderer Error: ${error.message}\n`);
    process.stdout.write(JSON.stringify({ action: 'passthrough', error: error.message }));
  }
}

main();
