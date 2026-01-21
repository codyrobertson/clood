/**
 * Status Bar Component
 *
 * Displays status information at the bottom of the screen.
 */

import React from 'react';
import { Box, Text } from 'ink';
import { useStore, useRunningTasks } from '../../store/index.js';

export interface StatusBarProps {
  hint?: string;
}

export const StatusBar: React.FC<StatusBarProps> = ({ hint }) => {
  const messages = useStore((s) => s.messages);
  const streamingMessageId = useStore((s) => s.streamingMessageId);
  const viewMode = useStore((s) => s.viewMode);
  const runningTasks = useRunningTasks();

  // Determine current status
  const getStatusText = (): string => {
    if (streamingMessageId) {
      return 'Claude is responding...';
    }
    if (runningTasks.length > 0) {
      return `${runningTasks.length} task(s) running`;
    }
    return 'Ready';
  };

  // Get mode indicator
  const getModeIndicator = (): string => {
    switch (viewMode) {
      case 'document':
        return '[DOC]';
      case 'fullscreen-tasks':
        return '[TASKS]';
      default:
        return '';
    }
  };

  return (
    <Box
      borderStyle="single"
      borderColor="gray"
      paddingX={1}
      justifyContent="space-between"
    >
      <Box>
        <Text color={streamingMessageId ? 'yellow' : 'green'}>
          {getStatusText()}
        </Text>
        {getModeIndicator() && (
          <Text color="blue"> {getModeIndicator()}</Text>
        )}
      </Box>

      <Box>
        {hint ? (
          <Text dimColor>{hint}</Text>
        ) : (
          <Text dimColor>
            {messages.length} messages | PgUp/PgDn: Scroll | T: Tasks | ?: Help
          </Text>
        )}
      </Box>
    </Box>
  );
};
