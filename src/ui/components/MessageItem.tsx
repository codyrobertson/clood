/**
 * Message Item Component
 *
 * Renders a single message in the conversation.
 * Handles different message roles and formatting.
 */

import React from 'react';
import { Box, Text } from 'ink';
import type { Message } from '../../types/index.js';
import { useStore } from '../../store/index.js';
import { formatMessageContent } from '../../utils/formatting.js';

export interface MessageItemProps {
  message: Message;
  maxWidth: number;
}

export const MessageItem: React.FC<MessageItemProps> = ({ message, maxWidth }) => {
  const theme = useStore((s) => s.config.theme);
  const streamingMessageId = useStore((s) => s.streamingMessageId);
  const isStreaming = message.id === streamingMessageId;

  // Determine role-specific styling
  const getRoleConfig = () => {
    switch (message.role) {
      case 'user':
        return {
          color: theme.userMessageColor as 'cyan',
          prefix: 'You',
          borderColor: 'cyan' as const,
        };
      case 'assistant':
        return {
          color: theme.assistantMessageColor as 'green',
          prefix: 'Claude',
          borderColor: 'green' as const,
        };
      case 'system':
        return {
          color: theme.systemMessageColor as 'gray',
          prefix: 'System',
          borderColor: 'gray' as const,
        };
      default:
        return {
          color: 'white' as const,
          prefix: 'Unknown',
          borderColor: 'white' as const,
        };
    }
  };

  const roleConfig = getRoleConfig();

  // Format timestamp
  const timestamp = message.timestamp
    ? new Date(message.timestamp).toLocaleTimeString()
    : '';

  // Format content for display
  const formattedContent = formatMessageContent(message.content, maxWidth);

  return (
    <Box
      flexDirection="column"
      marginBottom={1}
      borderStyle="single"
      borderColor={roleConfig.borderColor}
      paddingX={1}
    >
      {/* Message header */}
      <Box justifyContent="space-between">
        <Text bold color={roleConfig.color}>
          {roleConfig.prefix}
          {isStreaming && (
            <Text color="yellow"> [streaming...]</Text>
          )}
        </Text>
        {timestamp && (
          <Text dimColor>{timestamp}</Text>
        )}
      </Box>

      {/* Message content */}
      <Box marginTop={1}>
        <Text wrap="wrap">{formattedContent}</Text>
      </Box>

      {/* Tool calls indicator */}
      {message.metadata?.toolCalls && message.metadata.toolCalls.length > 0 && (
        <Box marginTop={1}>
          <Text dimColor italic>
            [{message.metadata.toolCalls.length} tool call(s)]
          </Text>
        </Box>
      )}
    </Box>
  );
};
