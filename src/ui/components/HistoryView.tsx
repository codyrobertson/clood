/**
 * History View Component (UOW-0414)
 *
 * Renders conversation transcript as a scrollable document panel.
 * Supports:
 * - Scrolling through message history
 * - Markdown rendering for message content
 * - Code block syntax highlighting
 * - Message role-based styling
 * - Keyboard navigation
 */

import React, { useMemo, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import type { Message } from '../../types/index.js';
import { useStore } from '../../store/index.js';
import { parseMarkdown } from '../markdown/MarkdownParser.js';
import { MarkdownRenderer } from '../markdown/MarkdownRenderer.js';

/**
 * Props for the HistoryView component
 */
export interface HistoryViewProps {
  /** Messages to display (if not using store) */
  messages?: Message[];
  /** Maximum width for the view */
  width: number;
  /** Maximum height for the view */
  height: number;
  /** Initial scroll position */
  initialScrollOffset?: number;
  /** Whether to show timestamps */
  showTimestamps?: boolean;
  /** Whether to show message borders */
  showBorders?: boolean;
  /** Whether to enable syntax highlighting */
  syntaxHighlight?: boolean;
  /** Callback when scroll position changes */
  onScrollChange?: (offset: number) => void;
  /** Whether this view has keyboard focus */
  focused?: boolean;
  /** Title for the panel */
  title?: string;
}

/**
 * Role configuration for styling
 */
interface RoleConfig {
  color: string;
  label: string;
  borderColor: string;
}

const ROLE_CONFIGS: Record<string, RoleConfig> = {
  user: {
    color: 'cyan',
    label: 'You',
    borderColor: 'cyan',
  },
  assistant: {
    color: 'green',
    label: 'Claude',
    borderColor: 'green',
  },
  system: {
    color: 'gray',
    label: 'System',
    borderColor: 'gray',
  },
};

/**
 * Get role configuration with fallback
 */
function getRoleConfig(role: string): RoleConfig {
  return ROLE_CONFIGS[role] ?? {
    color: 'white',
    label: role,
    borderColor: 'white',
  };
}

/**
 * Format a timestamp for display
 */
function formatTimestamp(date: Date | undefined): string {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

/**
 * Calculate total rendered height for a message
 * This is an estimate based on content length and width
 */
function estimateMessageHeight(message: Message, width: number): number {
  const content = message.content;
  const lines = content.split('\n');
  let height = 3; // Header + padding

  for (const line of lines) {
    // Estimate wrapped lines
    height += Math.max(1, Math.ceil(line.length / (width - 4)));
  }

  return height + 1; // Add margin
}

/**
 * Single message renderer within history view
 */
interface HistoryMessageProps {
  message: Message;
  maxWidth: number;
  showTimestamp: boolean;
  showBorder: boolean;
  syntaxHighlight: boolean;
  isStreaming: boolean;
}

const HistoryMessage: React.FC<HistoryMessageProps> = ({
  message,
  maxWidth,
  showTimestamp,
  showBorder,
  syntaxHighlight,
  isStreaming,
}) => {
  const roleConfig = getRoleConfig(message.role);
  const timestamp = showTimestamp ? formatTimestamp(message.timestamp) : '';

  // Parse markdown content
  const markdownNodes = useMemo(() => {
    return parseMarkdown(message.content);
  }, [message.content]);

  const contentWidth = maxWidth - (showBorder ? 4 : 2);

  return (
    <Box
      flexDirection="column"
      marginBottom={1}
      borderStyle={showBorder ? 'single' : undefined}
      borderColor={showBorder ? roleConfig.borderColor : undefined}
      paddingX={1}
      width={maxWidth}
    >
      {/* Message header */}
      <Box justifyContent="space-between">
        <Text bold color={roleConfig.color}>
          {roleConfig.label}
          {isStreaming && <Text color="yellow"> [streaming...]</Text>}
        </Text>
        {timestamp && <Text dimColor>{timestamp}</Text>}
      </Box>

      {/* Message content with markdown rendering */}
      <Box flexDirection="column" marginTop={1}>
        <MarkdownRenderer
          nodes={markdownNodes}
          width={contentWidth}
          options={{
            useColors: true,
            syntaxHighlight,
            codeBlockBorder: true,
            showLanguageLabel: true,
          }}
        />
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

/**
 * HistoryView - Main component for rendering scrollable conversation history
 */
export const HistoryView: React.FC<HistoryViewProps> = ({
  messages: propMessages,
  width,
  height,
  initialScrollOffset = 0,
  showTimestamps = true,
  showBorders = true,
  syntaxHighlight = true,
  onScrollChange,
  focused = false,
  title = 'Conversation History',
}) => {
  // Use store messages if not provided via props
  const storeMessages = useStore((s) => s.messages);
  const streamingMessageId = useStore((s) => s.streamingMessageId);
  const setConversationScroll = useStore((s) => s.setConversationScroll);
  const conversationScrollOffset = useStore((s) => s.conversationScrollOffset);

  const messages = propMessages ?? storeMessages;
  const scrollOffset = propMessages ? initialScrollOffset : conversationScrollOffset;

  // Calculate scroll metrics
  const { visibleMessages, totalHeight, scrollInfo } = useMemo(() => {
    if (messages.length === 0) {
      return {
        visibleMessages: [],
        totalHeight: 0,
        scrollInfo: { start: 0, end: 0, total: 0, canScrollUp: false, canScrollDown: false },
      };
    }

    // Calculate heights for all messages
    const contentWidth = width - 4;
    const messageHeights = messages.map((m) => estimateMessageHeight(m, contentWidth));
    const totalHeight = messageHeights.reduce((sum, h) => sum + h, 0);

    // Calculate which messages are visible
    const visibleHeight = height - 4; // Account for header and footer
    let currentHeight = 0;
    let startIdx = 0;
    let endIdx = messages.length;

    // Find start index based on scroll offset
    for (let i = 0; i < messages.length; i++) {
      const msgHeight = messageHeights[i] ?? 0;
      if (currentHeight + msgHeight > scrollOffset) {
        startIdx = i;
        break;
      }
      currentHeight += msgHeight;
    }

    // Find end index based on visible height
    currentHeight = 0;
    for (let i = startIdx; i < messages.length; i++) {
      const msgHeight = messageHeights[i] ?? 0;
      currentHeight += msgHeight;
      if (currentHeight >= visibleHeight) {
        endIdx = i + 1;
        break;
      }
    }

    const visibleMessages = messages.slice(startIdx, endIdx);
    const canScrollUp = scrollOffset > 0;
    const canScrollDown = scrollOffset + visibleHeight < totalHeight;

    return {
      visibleMessages,
      totalHeight,
      scrollInfo: {
        start: startIdx + 1,
        end: Math.min(endIdx, messages.length),
        total: messages.length,
        canScrollUp,
        canScrollDown,
      },
    };
  }, [messages, width, height, scrollOffset]);

  // Handle keyboard scrolling
  const handleScroll = useCallback(
    (direction: 'up' | 'down' | 'pageup' | 'pagedown' | 'home' | 'end') => {
      const visibleHeight = height - 4;
      let newOffset = scrollOffset;

      switch (direction) {
        case 'up':
          newOffset = Math.max(0, scrollOffset - 3);
          break;
        case 'down':
          newOffset = Math.min(totalHeight - visibleHeight, scrollOffset + 3);
          break;
        case 'pageup':
          newOffset = Math.max(0, scrollOffset - visibleHeight);
          break;
        case 'pagedown':
          newOffset = Math.min(totalHeight - visibleHeight, scrollOffset + visibleHeight);
          break;
        case 'home':
          newOffset = 0;
          break;
        case 'end':
          newOffset = Math.max(0, totalHeight - visibleHeight);
          break;
      }

      if (newOffset !== scrollOffset) {
        if (propMessages) {
          onScrollChange?.(newOffset);
        } else {
          setConversationScroll(newOffset);
        }
      }
    },
    [scrollOffset, totalHeight, height, propMessages, onScrollChange, setConversationScroll]
  );

  // Keyboard input handling
  useInput(
    (input, key) => {
      if (!focused) return;

      if (key.upArrow) {
        handleScroll('up');
      } else if (key.downArrow) {
        handleScroll('down');
      } else if (key.pageUp) {
        handleScroll('pageup');
      } else if (key.pageDown) {
        handleScroll('pagedown');
      } else if (input === 'g' && key.shift) {
        // Shift+G = end
        handleScroll('end');
      } else if (input === 'g') {
        // g = home
        handleScroll('home');
      }
    },
    { isActive: focused }
  );

  // Empty state
  if (messages.length === 0) {
    return (
      <Box
        flexDirection="column"
        width={width}
        height={height}
        borderStyle="single"
        borderColor="blue"
      >
        <Box paddingX={1} borderBottom>
          <Text bold color="blue">
            {title}
          </Text>
        </Box>
        <Box flexGrow={1} justifyContent="center" alignItems="center">
          <Text dimColor>No conversation history</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      flexDirection="column"
      width={width}
      height={height}
      borderStyle="single"
      borderColor={focused ? 'cyan' : 'blue'}
    >
      {/* Header */}
      <Box justifyContent="space-between" paddingX={1} borderBottom>
        <Text bold color="blue">
          {title}
          {focused && <Text color="cyan"> [focused]</Text>}
        </Text>
        <Text dimColor>
          Messages {scrollInfo.start}-{scrollInfo.end} of {scrollInfo.total}
        </Text>
      </Box>

      {/* Message content */}
      <Box flexDirection="column" paddingX={1} flexGrow={1} overflowY="hidden">
        {visibleMessages.map((message) => (
          <HistoryMessage
            key={message.id}
            message={message}
            maxWidth={width - 4}
            showTimestamp={showTimestamps}
            showBorder={showBorders}
            syntaxHighlight={syntaxHighlight}
            isStreaming={message.id === streamingMessageId}
          />
        ))}
      </Box>

      {/* Scroll indicators */}
      <Box justifyContent="space-between" paddingX={1}>
        <Text dimColor>{scrollInfo.canScrollUp ? '\u25b2 More above' : ''}</Text>
        <Text dimColor>{scrollInfo.canScrollDown ? '\u25bc More below' : ''}</Text>
      </Box>

      {/* Keyboard hints */}
      {focused && (
        <Box justifyContent="center" paddingX={1}>
          <Text dimColor>
            \u2191\u2193: Scroll | PgUp/PgDn: Page | g/G: Home/End
          </Text>
        </Box>
      )}
    </Box>
  );
};

/**
 * Standalone history view that manages its own state
 * Useful for exporting conversation history or viewing in a separate panel
 */
export interface StandaloneHistoryViewProps {
  messages: Message[];
  width: number;
  height: number;
  title?: string;
  /** Whether this view has keyboard focus */
  focused?: boolean;
}

export const StandaloneHistoryView: React.FC<StandaloneHistoryViewProps> = ({
  messages,
  width,
  height,
  title = 'History',
  focused = true,
}) => {
  const [scrollOffset, setScrollOffset] = React.useState(0);

  return (
    <HistoryView
      messages={messages}
      width={width}
      height={height}
      initialScrollOffset={scrollOffset}
      onScrollChange={setScrollOffset}
      focused={focused}
      title={title}
    />
  );
};

/**
 * Export conversation history to markdown format
 */
export function exportHistoryToMarkdown(messages: Message[]): string {
  const lines: string[] = ['# Conversation History', ''];

  for (const message of messages) {
    const roleConfig = getRoleConfig(message.role);
    const timestamp = message.timestamp
      ? ` (${formatTimestamp(message.timestamp)})`
      : '';

    lines.push(`## ${roleConfig.label}${timestamp}`);
    lines.push('');
    lines.push(message.content);
    lines.push('');

    if (message.metadata?.toolCalls && message.metadata.toolCalls.length > 0) {
      lines.push('*Tool calls:*');
      for (const call of message.metadata.toolCalls) {
        lines.push(`- \`${call.name}\`: ${call.status}`);
      }
      lines.push('');
    }

    lines.push('---');
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Export conversation history to plain text format
 */
export function exportHistoryToText(messages: Message[]): string {
  const lines: string[] = [];

  for (const message of messages) {
    const roleConfig = getRoleConfig(message.role);
    const timestamp = message.timestamp
      ? ` [${formatTimestamp(message.timestamp)}]`
      : '';

    lines.push(`=== ${roleConfig.label}${timestamp} ===`);
    lines.push(message.content);
    lines.push('');
  }

  return lines.join('\n');
}
