/**
 * Conversation Panel Component
 *
 * Displays the live conversation between user and Claude.
 * Supports streaming responses and auto-scrolling.
 */

import React, { useMemo } from 'react';
import { Box, Text } from 'ink';
import { useStore } from '../../store/index.js';
import { MessageItem } from './MessageItem.js';

export interface ConversationPanelProps {
  width: number;
  height: number;
}

export const ConversationPanel: React.FC<ConversationPanelProps> = ({
  width,
  height,
}) => {
  const messages = useStore((s) => s.messages);
  const scrollOffset = useStore((s) => s.conversationScrollOffset);
  const autoScroll = useStore((s) => s.config.autoScroll);

  // Calculate visible messages based on scroll offset
  const visibleMessages = useMemo(() => {
    if (messages.length === 0) {
      return [];
    }

    // If auto-scroll is enabled, show the most recent messages
    if (autoScroll) {
      // Estimate lines per message (rough calculation)
      const avgLinesPerMessage = 3;
      const maxMessages = Math.floor(height / avgLinesPerMessage);
      return messages.slice(-maxMessages);
    }

    // Manual scroll mode
    return messages.slice(scrollOffset, scrollOffset + height);
  }, [messages, scrollOffset, height, autoScroll]);

  if (messages.length === 0) {
    return (
      <Box
        flexDirection="column"
        paddingX={1}
        paddingY={1}
        width={width}
        height={height}
      >
        <Box justifyContent="center" alignItems="center" flexGrow={1}>
          <Text dimColor>
            No messages yet. Waiting for conversation...
          </Text>
        </Box>
        <Box justifyContent="center">
          <Text dimColor italic>
            Connect to a Claude Code session to see messages here.
          </Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      flexDirection="column"
      paddingX={1}
      width={width}
      height={height}
      overflowY="hidden"
    >
      {visibleMessages.map((message) => (
        <MessageItem
          key={message.id}
          message={message}
          maxWidth={width - 4}
        />
      ))}

      {/* Scroll indicator */}
      {messages.length > visibleMessages.length && (
        <Box justifyContent="center" marginTop={1}>
          <Text dimColor>
            [{messages.length - visibleMessages.length} more messages above - use PgUp/PgDn to scroll]
          </Text>
        </Box>
      )}
    </Box>
  );
};
