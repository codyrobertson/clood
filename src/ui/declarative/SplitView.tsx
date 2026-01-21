/**
 * Declarative SplitView Component (UOW-0816)
 *
 * Renders a split pane view with horizontal or vertical orientation.
 * Supports keyboard-based resize and focus management between panes.
 * Emits pane.resize events on resize operations.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Box, Text, useInput } from 'ink';
import { UIEventEmitter } from './EventEmitter.js';
import { ComponentRegistry, ComponentSpec } from './ComponentRegistry.js';

/**
 * Pane resize UI event
 */
export interface PaneResizeUIEvent {
  type: 'pane.resize';
  componentId: string;
  timestamp: string;
  data: {
    ratio: number;
    previousRatio: number;
    direction: 'increase' | 'decrease';
  };
}

/**
 * Pane focus change UI event
 */
export interface PaneFocusUIEvent {
  type: 'pane.focus';
  componentId: string;
  timestamp: string;
  data: {
    pane: 'primary' | 'secondary';
    previousPane: 'primary' | 'secondary';
  };
}

/**
 * Emit pane resize event
 */
export function emitPaneResize(
  componentId: string,
  ratio: number,
  previousRatio: number,
  direction: 'increase' | 'decrease'
): void {
  UIEventEmitter.emit({
    type: 'pane.resize' as 'button.click', // Type workaround for extensibility
    componentId,
    data: { ratio, previousRatio, direction },
  });
}

/**
 * Emit pane focus event
 */
export function emitPaneFocus(
  componentId: string,
  pane: 'primary' | 'secondary',
  previousPane: 'primary' | 'secondary'
): void {
  UIEventEmitter.emit({
    type: 'pane.focus' as 'button.click', // Type workaround for extensibility
    componentId,
    data: { pane, previousPane },
  });
}

export interface SplitViewProps {
  /** Unique component ID */
  id: string;
  /** Split orientation */
  orientation?: 'horizontal' | 'vertical';
  /** Initial split ratio (0-1, default 0.5) */
  ratio?: number;
  /** Minimum ratio for primary pane */
  minRatio?: number;
  /** Maximum ratio for primary pane */
  maxRatio?: number;
  /** Resize step (how much to adjust on each key press) */
  resizeStep?: number;
  /** Primary pane content (left or top) */
  primary?: React.ReactNode | ComponentSpec;
  /** Secondary pane content (right or bottom) */
  secondary?: React.ReactNode | ComponentSpec;
  /** Show divider between panes */
  showDivider?: boolean;
  /** Divider character (horizontal: '|', vertical: '-') */
  dividerChar?: string;
  /** Divider color */
  dividerColor?: string;
  /** Whether component is visible */
  visible?: boolean;
  /** Whether component has focus */
  focused?: boolean;
  /** Currently focused pane */
  focusedPane?: 'primary' | 'secondary';
  /** Total width available (for horizontal split) */
  width?: number;
  /** Total height available (for vertical split) */
  height?: number;
  /** Called when ratio changes */
  onRatioChange?: (ratio: number) => void;
  /** Called when focused pane changes */
  onFocusChange?: (pane: 'primary' | 'secondary') => void;
}

export const SplitView: React.FC<SplitViewProps> = ({
  id,
  orientation = 'horizontal',
  ratio: initialRatio = 0.5,
  minRatio = 0.1,
  maxRatio = 0.9,
  resizeStep = 0.05,
  primary,
  secondary,
  showDivider = true,
  dividerChar,
  dividerColor = 'gray',
  visible = true,
  focused = false,
  focusedPane: controlledFocusedPane,
  width = 80,
  height = 24,
  onRatioChange,
  onFocusChange,
}) => {
  // State for ratio (controlled or uncontrolled)
  const [internalRatio, setInternalRatio] = useState(initialRatio);
  const currentRatio = initialRatio !== undefined ? initialRatio : internalRatio;

  // State for focused pane
  const [internalFocusedPane, setInternalFocusedPane] = useState<'primary' | 'secondary'>('primary');
  const currentFocusedPane = controlledFocusedPane ?? internalFocusedPane;

  // Calculate pane dimensions
  const dimensions = useMemo(() => {
    const dividerSize = showDivider ? 1 : 0;

    if (orientation === 'horizontal') {
      const availableWidth = width - dividerSize;
      const primaryWidth = Math.floor(availableWidth * currentRatio);
      const secondaryWidth = availableWidth - primaryWidth;
      return {
        primaryWidth,
        primaryHeight: height,
        secondaryWidth,
        secondaryHeight: height,
        dividerWidth: dividerSize,
        dividerHeight: height,
      };
    } else {
      const availableHeight = height - dividerSize;
      const primaryHeight = Math.floor(availableHeight * currentRatio);
      const secondaryHeight = availableHeight - primaryHeight;
      return {
        primaryWidth: width,
        primaryHeight,
        secondaryWidth: width,
        secondaryHeight,
        dividerWidth: width,
        dividerHeight: dividerSize,
      };
    }
  }, [orientation, width, height, currentRatio, showDivider]);

  // Handle resize
  const handleResize = useCallback(
    (direction: 'increase' | 'decrease') => {
      const previousRatio = currentRatio;
      const delta = direction === 'increase' ? resizeStep : -resizeStep;
      const newRatio = Math.max(minRatio, Math.min(maxRatio, currentRatio + delta));

      if (newRatio !== currentRatio) {
        setInternalRatio(newRatio);
        onRatioChange?.(newRatio);
        emitPaneResize(id, newRatio, previousRatio, direction);
      }
    },
    [currentRatio, resizeStep, minRatio, maxRatio, id, onRatioChange]
  );

  // Handle focus switch
  const handleFocusSwitch = useCallback(
    (newPane: 'primary' | 'secondary') => {
      if (newPane !== currentFocusedPane) {
        const previousPane = currentFocusedPane;
        setInternalFocusedPane(newPane);
        onFocusChange?.(newPane);
        emitPaneFocus(id, newPane, previousPane);
      }
    },
    [currentFocusedPane, id, onFocusChange]
  );

  // Handle keyboard input
  useInput(
    (input, key) => {
      if (!focused) return;

      // Switch focus between panes
      if (key.tab) {
        handleFocusSwitch(currentFocusedPane === 'primary' ? 'secondary' : 'primary');
        return;
      }

      // Resize panes with Ctrl+Arrow or +/-
      if (orientation === 'horizontal') {
        // Horizontal: Ctrl+Left/Right or +/-
        if ((key.ctrl && key.leftArrow) || input === '-') {
          handleResize('decrease');
          return;
        }
        if ((key.ctrl && key.rightArrow) || input === '+' || input === '=') {
          handleResize('increase');
          return;
        }
      } else {
        // Vertical: Ctrl+Up/Down or +/-
        if ((key.ctrl && key.upArrow) || input === '-') {
          handleResize('decrease');
          return;
        }
        if ((key.ctrl && key.downArrow) || input === '+' || input === '=') {
          handleResize('increase');
          return;
        }
      }

      // Focus switching with h/l (horizontal) or j/k (vertical)
      if (orientation === 'horizontal') {
        if (input === 'h' || key.leftArrow) {
          handleFocusSwitch('primary');
          return;
        }
        if (input === 'l' || key.rightArrow) {
          handleFocusSwitch('secondary');
          return;
        }
      } else {
        if (input === 'k' || key.upArrow) {
          handleFocusSwitch('primary');
          return;
        }
        if (input === 'j' || key.downArrow) {
          handleFocusSwitch('secondary');
          return;
        }
      }

      // Reset to 50%
      if (input === 'r') {
        const previousRatio = currentRatio;
        const newRatio = 0.5;
        if (newRatio !== currentRatio) {
          setInternalRatio(newRatio);
          onRatioChange?.(newRatio);
          emitPaneResize(id, newRatio, previousRatio, newRatio > previousRatio ? 'increase' : 'decrease');
        }
      }
    },
    { isActive: focused }
  );

  if (!visible) {
    return null;
  }

  // Render pane content
  const renderContent = (content: React.ReactNode | ComponentSpec | undefined) => {
    if (!content) return null;

    // Check if it's a ComponentSpec
    if (typeof content === 'object' && content !== null && 'type' in content && 'id' in content) {
      return ComponentRegistry.render(content as ComponentSpec);
    }

    return content;
  };

  // Determine divider character
  const getDividerChar = () => {
    if (dividerChar) return dividerChar;
    return orientation === 'horizontal' ? '│' : '─';
  };

  // Render divider
  const renderDivider = () => {
    if (!showDivider) return null;

    const char = getDividerChar();

    if (orientation === 'horizontal') {
      // Vertical divider line
      return (
        <Box flexDirection="column" width={1}>
          {Array.from({ length: dimensions.dividerHeight }).map((_, i) => (
            <Text key={i} color={dividerColor}>
              {char}
            </Text>
          ))}
        </Box>
      );
    } else {
      // Horizontal divider line
      return (
        <Box>
          <Text color={dividerColor}>{char.repeat(dimensions.dividerWidth)}</Text>
        </Box>
      );
    }
  };

  // Render primary pane
  const renderPrimaryPane = () => {
    const isPrimaryFocused = focused && currentFocusedPane === 'primary';
    return (
      <Box
        width={dimensions.primaryWidth}
        height={dimensions.primaryHeight}
        flexDirection="column"
        borderStyle={isPrimaryFocused ? 'round' : undefined}
        borderColor={isPrimaryFocused ? 'cyan' : undefined}
      >
        {renderContent(primary)}
      </Box>
    );
  };

  // Render secondary pane
  const renderSecondaryPane = () => {
    const isSecondaryFocused = focused && currentFocusedPane === 'secondary';
    return (
      <Box
        width={dimensions.secondaryWidth}
        height={dimensions.secondaryHeight}
        flexDirection="column"
        borderStyle={isSecondaryFocused ? 'round' : undefined}
        borderColor={isSecondaryFocused ? 'cyan' : undefined}
      >
        {renderContent(secondary)}
      </Box>
    );
  };

  return (
    <Box flexDirection={orientation === 'horizontal' ? 'row' : 'column'}>
      {renderPrimaryPane()}
      {renderDivider()}
      {renderSecondaryPane()}
    </Box>
  );
};

/**
 * LeftRightSplit - Convenience component for horizontal split
 */
export interface LeftRightSplitProps extends Omit<SplitViewProps, 'orientation' | 'primary' | 'secondary'> {
  left?: React.ReactNode | ComponentSpec;
  right?: React.ReactNode | ComponentSpec;
}

export const LeftRightSplit: React.FC<LeftRightSplitProps> = ({ left, right, ...props }) => {
  return <SplitView {...props} orientation="horizontal" primary={left} secondary={right} />;
};

/**
 * TopBottomSplit - Convenience component for vertical split
 */
export interface TopBottomSplitProps extends Omit<SplitViewProps, 'orientation' | 'primary' | 'secondary'> {
  top?: React.ReactNode | ComponentSpec;
  bottom?: React.ReactNode | ComponentSpec;
}

export const TopBottomSplit: React.FC<TopBottomSplitProps> = ({ top, bottom, ...props }) => {
  return <SplitView {...props} orientation="vertical" primary={top} secondary={bottom} />;
};

/**
 * ThreePaneSplit - Three pane layout with main content and sidebars
 */
export interface ThreePaneSplitProps {
  id: string;
  leftWidth?: number;
  rightWidth?: number;
  left?: React.ReactNode;
  center?: React.ReactNode;
  right?: React.ReactNode;
  showDividers?: boolean;
  width?: number;
  height?: number;
  focused?: boolean;
  visible?: boolean;
}

export const ThreePaneSplit: React.FC<ThreePaneSplitProps> = ({
  id,
  leftWidth = 20,
  rightWidth = 20,
  left,
  center,
  right,
  showDividers = true,
  width = 80,
  height = 24,
  focused = false,
  visible = true,
}) => {
  if (!visible) return null;

  const dividerSize = showDividers ? 2 : 0;
  const centerWidth = width - leftWidth - rightWidth - dividerSize;

  return (
    <Box flexDirection="row">
      {/* Left pane */}
      <Box width={leftWidth} height={height} flexDirection="column">
        {left}
      </Box>

      {/* Left divider */}
      {showDividers && (
        <Box flexDirection="column" width={1}>
          {Array.from({ length: height }).map((_, i) => (
            <Text key={`${id}-ldiv-${i}`} color="gray">
              {'│'}
            </Text>
          ))}
        </Box>
      )}

      {/* Center pane */}
      <Box
        width={centerWidth}
        height={height}
        flexDirection="column"
        borderStyle={focused ? 'round' : undefined}
        borderColor={focused ? 'cyan' : undefined}
      >
        {center}
      </Box>

      {/* Right divider */}
      {showDividers && (
        <Box flexDirection="column" width={1}>
          {Array.from({ length: height }).map((_, i) => (
            <Text key={`${id}-rdiv-${i}`} color="gray">
              {'│'}
            </Text>
          ))}
        </Box>
      )}

      {/* Right pane */}
      <Box width={rightWidth} height={height} flexDirection="column">
        {right}
      </Box>
    </Box>
  );
};
