/**
 * Help Modal Component
 *
 * Displays keyboard shortcuts and help information.
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Modal } from './Modal.js';

export interface HelpModalProps {
  onClose: () => void;
}

interface ShortcutGroup {
  title: string;
  shortcuts: Array<{
    key: string;
    description: string;
  }>;
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: 'Navigation',
    shortcuts: [
      { key: '↑/k', description: 'Scroll up' },
      { key: '↓/j', description: 'Scroll down' },
      { key: 'PgUp', description: 'Page up' },
      { key: 'PgDn', description: 'Page down' },
      { key: 'g', description: 'Go to top' },
      { key: 'G', description: 'Go to bottom' },
    ],
  },
  {
    title: 'Panels',
    shortcuts: [
      { key: 't', description: 'Toggle tasks panel' },
      { key: 'a', description: 'Toggle auto-scroll' },
      { key: '?', description: 'Show this help' },
    ],
  },
  {
    title: 'Document View',
    shortcuts: [
      { key: 'ESC', description: 'Close document' },
      { key: 'q', description: 'Close document' },
    ],
  },
  {
    title: 'Application',
    shortcuts: [
      { key: 'Ctrl+Q', description: 'Quit application' },
      { key: 'Ctrl+C', description: 'Interrupt/Quit' },
    ],
  },
];

export const HelpModal: React.FC<HelpModalProps> = ({ onClose }) => {
  return (
    <Modal
      title="Keyboard Shortcuts"
      onClose={onClose}
      width={50}
      borderColor="cyan"
    >
      {SHORTCUT_GROUPS.map((group) => (
        <Box key={group.title} flexDirection="column" marginBottom={1}>
          <Text bold color="cyan">
            {group.title}
          </Text>
          {group.shortcuts.map((shortcut, index) => (
            <Box key={index} paddingLeft={1}>
              <Box width={12}>
                <Text color="yellow">{shortcut.key}</Text>
              </Box>
              <Text>{shortcut.description}</Text>
            </Box>
          ))}
        </Box>
      ))}

      <Box marginTop={1} flexDirection="column">
        <Text bold color="cyan">
          About
        </Text>
        <Box paddingLeft={1}>
          <Text dimColor>
            Clood TUI - Claude Code Dynamic Terminal UI
          </Text>
        </Box>
        <Box paddingLeft={1}>
          <Text dimColor>
            Version 1.0.0
          </Text>
        </Box>
      </Box>
    </Modal>
  );
};
