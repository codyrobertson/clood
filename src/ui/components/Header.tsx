/**
 * Header Component
 *
 * Displays the application title and any global status indicators.
 */

import React from 'react';
import { Box, Text } from 'ink';

export interface HeaderProps {
  title?: string;
}

export const Header: React.FC<HeaderProps> = ({ title = 'Clood TUI' }) => {
  return (
    <Box
      borderStyle="single"
      borderColor="blue"
      paddingX={1}
      justifyContent="space-between"
    >
      <Text bold color="blue">
        {title}
      </Text>
      <Text dimColor>
        Ctrl+Q: Quit | T: Toggle Tasks | ?: Help
      </Text>
    </Box>
  );
};
