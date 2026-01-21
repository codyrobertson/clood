/**
 * Main Application Component
 *
 * The root component that orchestrates the entire TUI layout.
 * Uses flexbox (via Yoga/Ink) to create a responsive terminal interface.
 */

import React, { useEffect, useState } from 'react';
import { Box, useApp, useInput, useStdout } from 'ink';
import { useStore } from '../store/index.js';
import { Header } from './components/Header.js';
import { ConversationPanel } from './components/ConversationPanel.js';
import { TasksPanel } from './components/TasksPanel.js';
import { DocumentPanel } from './components/DocumentPanel.js';
import { StatusBar } from './components/StatusBar.js';
import { NotificationArea } from './components/NotificationArea.js';
import { DebugPanel } from './components/DebugPanel.js';
import { HelpModal } from './components/HelpModal.js';
import { useEventStream } from '../core/useEventStream.js';
import { useKeyboardNavigation } from './hooks/useKeyboardNavigation.js';

export interface AppProps {
  /** Path to session JSONL log file */
  sessionPath?: string;
  /** Enable debug mode */
  debug?: boolean;
}

export const App: React.FC<AppProps> = ({ sessionPath, debug = false }) => {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const terminalWidth = stdout?.columns ?? 80;
  const terminalHeight = stdout?.rows ?? 24;

  // Local UI state
  const [showHelp, setShowHelp] = useState(false);

  // Global state
  const viewMode = useStore((s) => s.viewMode);
  const showTasksPanel = useStore((s) => s.showTasksPanel);
  const currentDocument = useStore((s) => s.currentDocument);
  const setDebug = useStore((s) => s.setDebug);
  const debugEnabled = useStore((s) => s.debug);

  // Initialize debug mode
  useEffect(() => {
    setDebug(debug);
  }, [debug, setDebug]);

  // Connect to event stream
  useEventStream(sessionPath);

  // Handle keyboard navigation
  useKeyboardNavigation();

  // Handle quit shortcut and help toggle
  useInput((input, key) => {
    if (input === 'q' && key.ctrl) {
      exit();
    }
    // Toggle help modal
    if (input === '?') {
      setShowHelp((prev) => !prev);
      return;
    }
    // Escape to close help, document viewer, or return to normal mode
    if (key.escape) {
      if (showHelp) {
        setShowHelp(false);
      } else if (viewMode === 'document') {
        useStore.getState().closeDocument();
      }
    }
  });

  // Calculate layout dimensions
  const sidebarWidth = showTasksPanel ? Math.min(30, Math.floor(terminalWidth * 0.25)) : 0;
  const mainWidth = terminalWidth - sidebarWidth;
  const contentHeight = terminalHeight - 4; // Header (1) + StatusBar (1) + padding (2)

  // Document view mode - full screen document
  if (viewMode === 'document' && currentDocument) {
    return (
      <Box flexDirection="column" width={terminalWidth} height={terminalHeight}>
        <Header title={`Document: ${currentDocument.title}`} />
        <DocumentPanel
          document={currentDocument}
          width={terminalWidth}
          height={contentHeight}
        />
        <StatusBar hint="Press ESC or Q to close document" />
        <NotificationArea />
      </Box>
    );
  }

  // Help modal overlay
  if (showHelp) {
    return (
      <Box flexDirection="column" width={terminalWidth} height={terminalHeight} justifyContent="center" alignItems="center">
        <HelpModal onClose={() => setShowHelp(false)} />
      </Box>
    );
  }

  // Normal view mode - conversation with optional tasks sidebar
  return (
    <Box flexDirection="column" width={terminalWidth} height={terminalHeight}>
      <Header title="Clood TUI" />

      <Box flexDirection="row" flexGrow={1}>
        {/* Main conversation area */}
        <Box flexDirection="column" width={mainWidth}>
          <ConversationPanel width={mainWidth} height={contentHeight} />
        </Box>

        {/* Tasks sidebar */}
        {showTasksPanel && (
          <Box
            flexDirection="column"
            width={sidebarWidth}
            borderStyle="single"
            borderColor="gray"
            paddingX={1}
          >
            <TasksPanel width={sidebarWidth - 4} height={contentHeight - 2} />
          </Box>
        )}
      </Box>

      <StatusBar />
      <NotificationArea />

      {/* Debug panel (shown only in debug mode) */}
      {debugEnabled && <DebugPanel />}
    </Box>
  );
};
