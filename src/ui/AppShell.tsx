/**
 * AppShell Component (UOW-0301, UOW-0302, UOW-0303)
 *
 * Provides the main application layout with fixed slots:
 * - Header (top)
 * - Main content area (center)
 * - Sidebar (right, toggleable)
 * - Status bar (bottom)
 * - Modal overlay (fullscreen when active)
 */

import React, { ReactNode, useMemo } from 'react';
import { Box, useStdout } from 'ink';

export interface AppShellSlots {
  /** Header component (top) */
  header?: ReactNode;
  /** Main content area */
  main: ReactNode;
  /** Sidebar component (right side) */
  sidebar?: ReactNode;
  /** Status bar component (bottom) */
  statusBar?: ReactNode;
  /** Notification area */
  notifications?: ReactNode;
  /** Modal overlay (renders above everything) */
  modal?: ReactNode;
}

export interface AppShellProps extends AppShellSlots {
  /** Whether to show the sidebar */
  showSidebar?: boolean;
  /** Fixed sidebar width (default: 30) */
  sidebarWidth?: number;
  /** Sidebar width as percentage (overrides fixed width) */
  sidebarWidthPercent?: number;
  /** Header height (default: 1) */
  headerHeight?: number;
  /** Status bar height (default: 1) */
  statusBarHeight?: number;
  /** Enable full-screen modal mode */
  modalMode?: boolean;
  /** Debug mode */
  debug?: boolean;
}

export interface LayoutDimensions {
  terminalWidth: number;
  terminalHeight: number;
  mainWidth: number;
  sidebarWidth: number;
  contentHeight: number;
  headerHeight: number;
  statusBarHeight: number;
}

/**
 * Calculate layout dimensions based on terminal size and config
 */
export function calculateLayoutDimensions(
  terminalWidth: number,
  terminalHeight: number,
  options: {
    showSidebar: boolean;
    sidebarWidth: number;
    sidebarWidthPercent?: number;
    headerHeight: number;
    statusBarHeight: number;
  }
): LayoutDimensions {
  let sidebarWidth = 0;

  if (options.showSidebar) {
    if (options.sidebarWidthPercent) {
      sidebarWidth = Math.floor(terminalWidth * (options.sidebarWidthPercent / 100));
    } else {
      sidebarWidth = Math.min(options.sidebarWidth, Math.floor(terminalWidth * 0.4));
    }
  }

  const mainWidth = terminalWidth - sidebarWidth;
  const contentHeight = terminalHeight - options.headerHeight - options.statusBarHeight;

  return {
    terminalWidth,
    terminalHeight,
    mainWidth,
    sidebarWidth,
    contentHeight,
    headerHeight: options.headerHeight,
    statusBarHeight: options.statusBarHeight,
  };
}

export const AppShell: React.FC<AppShellProps> = ({
  header,
  main,
  sidebar,
  statusBar,
  notifications,
  modal,
  showSidebar = true,
  sidebarWidth = 30,
  sidebarWidthPercent,
  headerHeight = 1,
  statusBarHeight = 1,
  modalMode = false,
}) => {
  const { stdout } = useStdout();
  const terminalWidth = stdout?.columns ?? 80;
  const terminalHeight = stdout?.rows ?? 24;

  const dimensions = useMemo(
    () =>
      calculateLayoutDimensions(terminalWidth, terminalHeight, {
        showSidebar: showSidebar && !!sidebar,
        sidebarWidth,
        sidebarWidthPercent,
        headerHeight,
        statusBarHeight,
      }),
    [terminalWidth, terminalHeight, showSidebar, sidebar, sidebarWidth, sidebarWidthPercent, headerHeight, statusBarHeight]
  );

  // Modal mode - full screen overlay
  if (modalMode && modal) {
    return (
      <Box
        flexDirection="column"
        width={dimensions.terminalWidth}
        height={dimensions.terminalHeight}
        justifyContent="center"
        alignItems="center"
      >
        {modal}
      </Box>
    );
  }

  return (
    <Box flexDirection="column" width={dimensions.terminalWidth} height={dimensions.terminalHeight}>
      {/* Header slot */}
      {header && (
        <Box height={dimensions.headerHeight} width="100%">
          {header}
        </Box>
      )}

      {/* Main content area with optional sidebar */}
      <Box flexDirection="row" flexGrow={1}>
        {/* Main content */}
        <Box flexDirection="column" width={dimensions.mainWidth}>
          {main}
        </Box>

        {/* Sidebar */}
        {showSidebar && sidebar && (
          <Box
            flexDirection="column"
            width={dimensions.sidebarWidth}
            borderStyle="single"
            borderColor="gray"
          >
            {sidebar}
          </Box>
        )}
      </Box>

      {/* Status bar slot */}
      {statusBar && (
        <Box height={dimensions.statusBarHeight} width="100%">
          {statusBar}
        </Box>
      )}

      {/* Notification area */}
      {notifications}

      {/* Modal overlay (non-blocking) */}
      {!modalMode && modal}
    </Box>
  );
};

/**
 * Hook to get current layout dimensions
 */
export function useLayoutDimensions(options: {
  showSidebar?: boolean;
  sidebarWidth?: number;
  sidebarWidthPercent?: number;
  headerHeight?: number;
  statusBarHeight?: number;
} = {}): LayoutDimensions {
  const { stdout } = useStdout();
  const terminalWidth = stdout?.columns ?? 80;
  const terminalHeight = stdout?.rows ?? 24;

  return useMemo(
    () =>
      calculateLayoutDimensions(terminalWidth, terminalHeight, {
        showSidebar: options.showSidebar ?? true,
        sidebarWidth: options.sidebarWidth ?? 30,
        sidebarWidthPercent: options.sidebarWidthPercent,
        headerHeight: options.headerHeight ?? 1,
        statusBarHeight: options.statusBarHeight ?? 1,
      }),
    [
      terminalWidth,
      terminalHeight,
      options.showSidebar,
      options.sidebarWidth,
      options.sidebarWidthPercent,
      options.headerHeight,
      options.statusBarHeight,
    ]
  );
}
