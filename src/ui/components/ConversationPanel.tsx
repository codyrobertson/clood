/**
 * Conversation Panel Component
 *
 * Displays the live conversation between user and Claude.
 * Supports streaming responses and auto-scrolling.
 * Detects and highlights diagram blocks for special viewing.
 */

import React, { useMemo } from 'react';
import { Box, Text } from 'ink';
import { useStore } from '../../store/index.js';
import { MessageItem } from './MessageItem.js';
import { detectDiagrams, type DiagramBlock } from '../charts/DiagramDetector.js';

export interface ConversationPanelProps {
  width: number;
  height: number;
}

/** Represents a detected diagram in a message */
export interface MessageDiagram {
  messageId: string;
  diagram: DiagramBlock;
  index: number;
}

export const ConversationPanel: React.FC<ConversationPanelProps> = ({
  width,
  height,
}) => {
  const messages = useStore((s) => s.messages);
  const scrollOffset = useStore((s) => s.conversationScrollOffset);
  const autoScroll = useStore((s) => s.config.autoScroll);
  const enableDiagramDetection = useStore((s) => s.config.enableDiagramDetection);

  // Detect diagrams in all messages
  const messageDiagrams = useMemo((): MessageDiagram[] => {
    if (!enableDiagramDetection) {
      return [];
    }

    const diagrams: MessageDiagram[] = [];
    let globalIndex = 0;

    for (const message of messages) {
      const detected = detectDiagrams(message.content, {
        minConfidence: 0.6,
        minLines: 3,
      });

      for (const diagram of detected) {
        diagrams.push({
          messageId: message.id,
          diagram,
          index: globalIndex++,
        });
      }
    }

    return diagrams;
  }, [messages, enableDiagramDetection]);

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

  // Get diagrams in visible messages
  const visibleDiagrams = useMemo(() => {
    const visibleMessageIds = new Set(visibleMessages.map((m) => m.id));
    return messageDiagrams.filter((md) => visibleMessageIds.has(md.messageId));
  }, [visibleMessages, messageDiagrams]);

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

      {/* Diagram indicator - shown when diagrams are detected */}
      {visibleDiagrams.length > 0 && (
        <Box justifyContent="center" marginTop={1}>
          <Text color="blue">
            [{visibleDiagrams.length} diagram{visibleDiagrams.length > 1 ? 's' : ''} detected - press 'd' to view]
          </Text>
        </Box>
      )}
    </Box>
  );
};

/** Hook to get message diagrams for external components */
export function useMessageDiagrams(): MessageDiagram[] {
  const messages = useStore((s) => s.messages);
  const enableDiagramDetection = useStore((s) => s.config.enableDiagramDetection);

  return useMemo((): MessageDiagram[] => {
    if (!enableDiagramDetection) {
      return [];
    }

    const diagrams: MessageDiagram[] = [];
    let globalIndex = 0;

    for (const message of messages) {
      const detected = detectDiagrams(message.content, {
        minConfidence: 0.6,
        minLines: 3,
      });

      for (const diagram of detected) {
        diagrams.push({
          messageId: message.id,
          diagram,
          index: globalIndex++,
        });
      }
    }

    return diagrams;
  }, [messages, enableDiagramDetection]);
}
