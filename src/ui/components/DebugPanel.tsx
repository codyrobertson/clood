/**
 * Debug Panel Component
 *
 * Shows debug information and logs when debug mode is enabled.
 */

import React from 'react';
import { Box, Text } from 'ink';
import { useStore } from '../../store/index.js';

export const DebugPanel: React.FC = () => {
  const debugLogs = useStore((s) => s.debugLogs);
  const messages = useStore((s) => s.messages);
  const tasks = useStore((s) => s.tasks);
  const viewMode = useStore((s) => s.viewMode);

  // Show last 5 debug logs
  const recentLogs = debugLogs.slice(-5);

  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor="magenta"
      paddingX={1}
      marginTop={1}
    >
      <Text bold color="magenta">Debug Info</Text>

      {/* State summary */}
      <Box marginTop={1}>
        <Text dimColor>
          Messages: {messages.length} | Tasks: {tasks.length} | Mode: {viewMode}
        </Text>
      </Box>

      {/* Recent logs */}
      {recentLogs.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          <Text dimColor>Recent Events:</Text>
          {recentLogs.map((log, index) => (
            <Text key={index} dimColor wrap="truncate">
              {log}
            </Text>
          ))}
        </Box>
      )}

      {recentLogs.length === 0 && (
        <Box marginTop={1}>
          <Text dimColor italic>No debug events yet</Text>
        </Box>
      )}
    </Box>
  );
};
