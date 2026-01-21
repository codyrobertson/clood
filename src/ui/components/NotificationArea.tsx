/**
 * Notification Area Component
 *
 * Displays temporary notifications and alerts.
 */

import React, { useEffect } from 'react';
import { Box, Text } from 'ink';
import { useStore } from '../../store/index.js';

export const NotificationArea: React.FC = () => {
  const notifications = useStore((s) => s.notifications);
  const removeNotification = useStore((s) => s.removeNotification);

  // Auto-dismiss notifications after 5 seconds
  useEffect(() => {
    if (notifications.length === 0) return;

    const timers = notifications.map((notification) => {
      return setTimeout(() => {
        removeNotification(notification.id);
      }, 5000);
    });

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [notifications, removeNotification]);

  if (notifications.length === 0) {
    return null;
  }

  const getNotificationColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'red';
      case 'warning':
        return 'yellow';
      case 'success':
        return 'green';
      case 'info':
      default:
        return 'blue';
    }
  };

  const getNotificationIcon = (level: string) => {
    switch (level) {
      case 'error':
        return '✗';
      case 'warning':
        return '⚠';
      case 'success':
        return '✓';
      case 'info':
      default:
        return 'ℹ';
    }
  };

  // Show only the most recent 3 notifications
  const visibleNotifications = notifications.slice(-3);

  return (
    <Box flexDirection="column" marginTop={1}>
      {visibleNotifications.map((notification) => (
        <Box key={notification.id} paddingX={1}>
          <Text color={getNotificationColor(notification.level)}>
            {getNotificationIcon(notification.level)} {notification.message}
          </Text>
        </Box>
      ))}
    </Box>
  );
};
