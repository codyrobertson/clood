#!/usr/bin/env node
/**
 * Notification Handler - Notification Hook (EPIC-9)
 *
 * This hook handles notification events and transforms them
 * into rich UI notifications for terminal display.
 *
 * Hook Type: Notification
 * Triggered: When Claude Code emits notification events
 */

import { readFileSync } from 'fs';

/**
 * Notification level configurations
 */
const NOTIFICATION_STYLES = {
  info: {
    icon: 'i',
    color: 'blue',
    borderStyle: 'single',
  },
  success: {
    icon: '+',
    color: 'green',
    borderStyle: 'round',
  },
  warning: {
    icon: '!',
    color: 'yellow',
    borderStyle: 'double',
  },
  error: {
    icon: 'x',
    color: 'red',
    borderStyle: 'bold',
  },
};

/**
 * Transform notification into UILayout specification
 * @param {object} notification - The notification data
 * @returns {object} UILayout specification
 */
function transformNotification(notification) {
  const {
    level = 'info',
    title,
    message,
    duration = 5000,
    actions = [],
    dismissible = true,
    id,
  } = notification;

  const style = NOTIFICATION_STYLES[level] || NOTIFICATION_STYLES.info;
  const notificationId = id || `notification-${Date.now()}`;

  const children = [];

  // Header with icon and title
  if (title) {
    children.push({
      id: `${notificationId}-header`,
      type: 'Container',
      direction: 'row',
      gap: 1,
      children: [
        {
          id: `${notificationId}-icon`,
          type: 'TextBlock',
          content: `[${style.icon}]`,
          color: style.color,
          bold: true,
        },
        {
          id: `${notificationId}-title`,
          type: 'TextBlock',
          content: title,
          color: style.color,
          bold: true,
        },
      ],
    });
  }

  // Message body
  if (message) {
    children.push({
      id: `${notificationId}-message`,
      type: 'TextBlock',
      content: message,
      wrap: true,
    });
  }

  // Action buttons
  if (actions.length > 0) {
    const buttons = actions.map((action, idx) => ({
      id: `${notificationId}-action-${idx}`,
      label: action.label,
      shortcut: action.shortcut,
      primary: idx === 0,
    }));

    if (dismissible) {
      buttons.push({
        id: `${notificationId}-dismiss`,
        label: 'Dismiss',
        shortcut: 'esc',
      });
    }

    children.push({
      id: `${notificationId}-actions`,
      type: 'ButtonRow',
      buttons,
      spacing: 2,
    });
  }

  return {
    version: '1.0',
    id: notificationId,
    title: title || `${level.charAt(0).toUpperCase() + level.slice(1)} Notification`,
    root: {
      id: `${notificationId}-container`,
      type: 'Container',
      direction: 'column',
      gap: 1,
      border: { style: style.borderStyle, color: style.color },
      padding: { top: 1, bottom: 1, left: 2, right: 2 },
      width: 60,
      children,
    },
    metadata: {
      type: 'notification',
      level,
      duration,
      dismissible,
      createdAt: Date.now(),
    },
  };
}

/**
 * Transform progress notification
 * @param {object} notification - Progress notification data
 * @returns {object} UILayout specification
 */
function transformProgressNotification(notification) {
  const {
    id,
    title = 'Progress',
    message,
    progress = 0,
    total = 100,
    status = 'running',
  } = notification;

  const notificationId = id || `progress-${Date.now()}`;
  const percentage = Math.min(100, Math.round((progress / total) * 100));
  const isComplete = status === 'completed' || percentage >= 100;

  const children = [
    {
      id: `${notificationId}-title`,
      type: 'TextBlock',
      content: title,
      bold: true,
      color: isComplete ? 'green' : 'cyan',
    },
    {
      id: `${notificationId}-progress`,
      type: 'ProgressBar',
      value: percentage,
      showPercentage: true,
      color: isComplete ? 'green' : 'cyan',
      width: 40,
    },
  ];

  if (message) {
    children.push({
      id: `${notificationId}-message`,
      type: 'TextBlock',
      content: message,
      color: 'gray',
      dimColor: true,
    });
  }

  return {
    version: '1.0',
    id: notificationId,
    title: 'Progress',
    root: {
      id: `${notificationId}-container`,
      type: 'Container',
      direction: 'column',
      gap: 1,
      border: { style: 'single', color: isComplete ? 'green' : 'cyan' },
      padding: { left: 2, right: 2 },
      children,
    },
    metadata: {
      type: 'progress',
      progress: percentage,
      status,
    },
  };
}

/**
 * Transform toast notification (brief, auto-dismissing)
 * @param {object} notification - Toast notification data
 * @returns {object} UILayout specification
 */
function transformToastNotification(notification) {
  const { level = 'info', message, duration = 3000, id } = notification;

  const style = NOTIFICATION_STYLES[level] || NOTIFICATION_STYLES.info;
  const notificationId = id || `toast-${Date.now()}`;

  return {
    version: '1.0',
    id: notificationId,
    root: {
      id: `${notificationId}-toast`,
      type: 'TextBlock',
      content: `[${style.icon}] ${message}`,
      color: style.color,
    },
    metadata: {
      type: 'toast',
      level,
      duration,
      dismissible: true,
      createdAt: Date.now(),
    },
  };
}

/**
 * Transform task notification
 * @param {object} notification - Task notification data
 * @returns {object} UILayout specification
 */
function transformTaskNotification(notification) {
  const {
    id,
    taskId,
    taskName,
    status = 'pending',
    message,
    output,
    error,
  } = notification;

  const notificationId = id || `task-${taskId || Date.now()}`;

  const statusConfig = {
    pending: { icon: 'o', color: 'gray', label: 'Pending' },
    running: { icon: '*', color: 'cyan', label: 'Running' },
    completed: { icon: '+', color: 'green', label: 'Completed' },
    failed: { icon: 'x', color: 'red', label: 'Failed' },
    cancelled: { icon: '-', color: 'yellow', label: 'Cancelled' },
  };

  const config = statusConfig[status] || statusConfig.pending;

  const children = [
    {
      id: `${notificationId}-header`,
      type: 'Container',
      direction: 'row',
      gap: 1,
      children: [
        {
          id: `${notificationId}-status-icon`,
          type: 'TextBlock',
          content: `[${config.icon}]`,
          color: config.color,
        },
        {
          id: `${notificationId}-name`,
          type: 'TextBlock',
          content: taskName || `Task ${taskId}`,
          bold: true,
        },
        {
          id: `${notificationId}-status-label`,
          type: 'TextBlock',
          content: `(${config.label})`,
          color: config.color,
          dimColor: true,
        },
      ],
    },
  ];

  if (message) {
    children.push({
      id: `${notificationId}-message`,
      type: 'TextBlock',
      content: message,
    });
  }

  if (output && status === 'completed') {
    const truncatedOutput = output.length > 500 ? output.slice(0, 500) + '...' : output;
    children.push({
      id: `${notificationId}-output`,
      type: 'TextBlock',
      content: truncatedOutput,
      color: 'gray',
    });
  }

  if (error && status === 'failed') {
    children.push({
      id: `${notificationId}-error`,
      type: 'TextBlock',
      content: error,
      color: 'red',
    });
  }

  return {
    version: '1.0',
    id: notificationId,
    title: 'Task Update',
    root: {
      id: `${notificationId}-container`,
      type: 'Container',
      direction: 'column',
      gap: 1,
      border: { style: 'single', color: config.color },
      padding: { left: 2, right: 2 },
      children,
    },
    metadata: {
      type: 'task',
      taskId,
      status,
    },
  };
}

/**
 * Main hook handler
 */
async function main() {
  try {
    const input = readFileSync(0, 'utf-8');
    const hookData = JSON.parse(input);

    const { notification_type, ...notificationData } = hookData;

    let uiSpec = null;

    switch (notification_type) {
      case 'progress':
        uiSpec = transformProgressNotification(notificationData);
        break;
      case 'toast':
        uiSpec = transformToastNotification(notificationData);
        break;
      case 'task':
        uiSpec = transformTaskNotification(notificationData);
        break;
      default:
        uiSpec = transformNotification(notificationData);
    }

    if (uiSpec) {
      process.stdout.write(
        JSON.stringify({
          action: 'show_notification',
          ui_layout: uiSpec,
          notification_type: notification_type || 'standard',
        })
      );
    } else {
      process.stdout.write(JSON.stringify({ action: 'passthrough' }));
    }
  } catch (error) {
    process.stderr.write(`Notification Handler Error: ${error.message}\n`);
    process.stdout.write(JSON.stringify({ action: 'passthrough', error: error.message }));
  }
}

main();
