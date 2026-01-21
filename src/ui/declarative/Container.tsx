/**
 * Declarative Container Component (UOW-0802)
 *
 * A flexible container component that supports layout direction,
 * gap, border, padding, and recursive child rendering.
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Spacing, Border, Dimension } from '../../protocol/schema/UILayout.js';
import {
  spacingToInkPadding,
  spacingToInkMargin,
  toInkBorderStyle,
  calculateDimensionPx,
} from './Layout.js';
import { ComponentRegistry, ComponentSpec } from './ComponentRegistry.js';

/**
 * Container props
 */
export interface ContainerProps {
  /** Unique container ID */
  id: string;
  /** Layout direction */
  direction?: 'row' | 'column';
  /** Gap between children */
  gap?: number;
  /** Padding inside container */
  padding?: Spacing;
  /** Margin outside container */
  margin?: Spacing;
  /** Border configuration */
  border?: Border;
  /** Container width */
  width?: Dimension;
  /** Container height */
  height?: Dimension;
  /** Min width */
  minWidth?: number;
  /** Max width */
  maxWidth?: number;
  /** Min height */
  minHeight?: number;
  /** Max height */
  maxHeight?: number;
  /** Whether container is visible */
  visible?: boolean;
  /** Whether container has focus */
  focused?: boolean;
  /** Child components (as specs for declarative rendering) */
  children?: ComponentSpec[] | React.ReactNode;
  /** Align items along cross axis */
  alignItems?: 'flex-start' | 'center' | 'flex-end' | 'stretch';
  /** Justify content along main axis */
  justifyContent?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly';
  /** Allow children to wrap */
  flexWrap?: 'nowrap' | 'wrap' | 'wrap-reverse';
  /** Background color */
  backgroundColor?: string;
  /** Title for the container (displayed in border) */
  title?: string;
  /** Container available width for percentage calculations */
  containerWidth?: number;
  /** Container available height for percentage calculations */
  containerHeight?: number;
}

/**
 * Container component - renders children in a flexible layout
 */
export const Container: React.FC<ContainerProps> = ({
  id: _id,
  direction = 'column',
  gap,
  padding,
  margin,
  border,
  width,
  height,
  minWidth,
  maxWidth: _maxWidth,
  minHeight,
  maxHeight: _maxHeight,
  visible = true,
  focused = false,
  children,
  alignItems,
  justifyContent,
  flexWrap,
  backgroundColor: _backgroundColor,
  title,
  containerWidth = 80,
  containerHeight = 24,
}) => {
  if (!visible) {
    return null;
  }

  // Calculate actual dimensions
  const actualWidth = calculateDimensionPx(width, containerWidth);
  const actualHeight = calculateDimensionPx(height, containerHeight);

  // Convert spacing to Ink props
  const paddingProps = spacingToInkPadding(padding);
  const marginProps = spacingToInkMargin(margin);

  // Convert border to Ink style
  const borderStyle = toInkBorderStyle(border?.style);

  // Render children
  const renderChildren = () => {
    if (!children) {
      return null;
    }

    // If children are React nodes, render directly
    if (React.isValidElement(children) || typeof children === 'string' || typeof children === 'number') {
      return children;
    }

    // If children is an array, check if it's component specs or React nodes
    if (Array.isArray(children)) {
      // Check if first item looks like a ComponentSpec
      const firstChild = children[0];
      if (firstChild && typeof firstChild === 'object' && 'type' in firstChild && 'id' in firstChild) {
        // Render as component specs
        return ComponentRegistry.renderAll(children as ComponentSpec[], {
          containerWidth: actualWidth ?? containerWidth,
          containerHeight: actualHeight ?? containerHeight,
        });
      }

      // Otherwise treat as React nodes
      return children as React.ReactNode;
    }

    return null;
  };

  // Build box props with all optional properties included conditionally
  const boxProps: React.ComponentProps<typeof Box> = {
    flexDirection: direction,
    gap,
    ...paddingProps,
    ...marginProps,
    alignItems,
    justifyContent,
    flexWrap,
    // Dimensions
    ...(actualWidth !== undefined && { width: actualWidth }),
    ...(actualHeight !== undefined && { height: actualHeight }),
    ...(minWidth !== undefined && { minWidth }),
    ...(minHeight !== undefined && { minHeight }),
    // Border
    ...(borderStyle && { borderStyle }),
    ...(borderStyle && border?.color && !focused && { borderColor: border.color }),
    ...(borderStyle && focused && { borderColor: 'cyan' }),
  };

  // Handle titled container with custom border rendering
  if (title && borderStyle) {
    return (
      <Box flexDirection="column" {...marginProps}>
        <TitledBorder
          title={title}
          borderStyle={border?.style || 'single'}
          borderColor={focused ? 'cyan' : border?.color}
          width={actualWidth}
        >
          <Box
            flexDirection={direction}
            gap={gap}
            {...paddingProps}
            alignItems={alignItems}
            justifyContent={justifyContent}
            flexWrap={flexWrap}
          >
            {renderChildren()}
          </Box>
        </TitledBorder>
      </Box>
    );
  }

  return <Box {...boxProps}>{renderChildren()}</Box>;
};

/**
 * Titled border component for containers with titles
 */
interface TitledBorderProps {
  title: string;
  borderStyle: string;
  borderColor?: string;
  width?: number;
  children: React.ReactNode;
}

const BORDER_CHARS: Record<string, { tl: string; tr: string; bl: string; br: string; h: string; v: string }> = {
  single: { tl: '┌', tr: '┐', bl: '└', br: '┘', h: '─', v: '│' },
  double: { tl: '╔', tr: '╗', bl: '╚', br: '╝', h: '═', v: '║' },
  round: { tl: '╭', tr: '╮', bl: '╰', br: '╯', h: '─', v: '│' },
  bold: { tl: '┏', tr: '┓', bl: '┗', br: '┛', h: '━', v: '┃' },
};

const TitledBorder: React.FC<TitledBorderProps> = ({
  title,
  borderStyle,
  borderColor,
  width = 40,
  children,
}) => {
  const chars = BORDER_CHARS[borderStyle] ?? BORDER_CHARS.single;
  const innerWidth = Math.max(10, width - 2);
  const titleDisplay = title.length > innerWidth - 4 ? title.slice(0, innerWidth - 7) + '...' : title;
  const paddingLength = Math.max(0, innerWidth - titleDisplay.length - 3);

  if (!chars) {
    return <Box flexDirection="column">{children}</Box>;
  }

  return (
    <Box flexDirection="column">
      {/* Top border with title */}
      <Text color={borderColor}>
        {chars.tl}
        {chars.h}
        {' '}
        {titleDisplay}
        {' '}
        {chars.h.repeat(paddingLength)}
        {chars.tr}
      </Text>

      {/* Content with side borders */}
      <Box flexDirection="row">
        <Text color={borderColor}>{chars.v}</Text>
        <Box flexGrow={1}>{children}</Box>
        <Text color={borderColor}>{chars.v}</Text>
      </Box>

      {/* Bottom border */}
      <Text color={borderColor}>
        {chars.bl}
        {chars.h.repeat(innerWidth)}
        {chars.br}
      </Text>
    </Box>
  );
};

/**
 * Row Container - horizontal layout shorthand
 */
export interface RowProps extends Omit<ContainerProps, 'direction'> {}

export const Row: React.FC<RowProps> = (props) => {
  return <Container {...props} direction="row" />;
};

/**
 * Column Container - vertical layout shorthand
 */
export interface ColumnProps extends Omit<ContainerProps, 'direction'> {}

export const Column: React.FC<ColumnProps> = (props) => {
  return <Container {...props} direction="column" />;
};

/**
 * Stack Container - vertically stacked items with consistent gap
 */
export interface StackProps extends Omit<ContainerProps, 'direction' | 'gap'> {
  spacing?: number;
}

export const Stack: React.FC<StackProps> = ({ spacing = 1, ...props }) => {
  return <Container {...props} direction="column" gap={spacing} />;
};

/**
 * Inline Container - horizontally arranged items with consistent gap
 */
export interface InlineProps extends Omit<ContainerProps, 'direction' | 'gap'> {
  spacing?: number;
}

export const Inline: React.FC<InlineProps> = ({ spacing = 1, ...props }) => {
  return <Container {...props} direction="row" gap={spacing} />;
};

/**
 * Center Container - centers content both horizontally and vertically
 */
export interface CenterProps extends Omit<ContainerProps, 'alignItems' | 'justifyContent'> {}

export const Center: React.FC<CenterProps> = (props) => {
  return <Container {...props} alignItems="center" justifyContent="center" />;
};

/**
 * Spacer - flexible space that expands to fill available space
 */
export interface SpacerProps {
  /** Flex grow value */
  flex?: number;
}

export const Spacer: React.FC<SpacerProps> = ({ flex = 1 }) => {
  return <Box flexGrow={flex} />;
};

/**
 * Divider - horizontal or vertical line separator
 */
export interface DividerProps {
  /** Divider direction */
  direction?: 'horizontal' | 'vertical';
  /** Divider character */
  char?: string;
  /** Divider length (for horizontal) or height (for vertical) */
  length?: number;
  /** Divider color */
  color?: string;
}

export const Divider: React.FC<DividerProps> = ({
  direction = 'horizontal',
  char,
  length,
  color,
}) => {
  if (direction === 'horizontal') {
    const dividerChar = char || '─';
    const dividerLength = length || 40;
    return (
      <Box>
        <Text color={color} dimColor={!color}>
          {dividerChar.repeat(dividerLength)}
        </Text>
      </Box>
    );
  }

  // Vertical divider
  const dividerChar = char || '│';
  const dividerHeight = length || 1;
  return (
    <Box flexDirection="column">
      {Array.from({ length: dividerHeight }).map((_, i) => (
        <Text key={i} color={color} dimColor={!color}>
          {dividerChar}
        </Text>
      ))}
    </Box>
  );
};

/**
 * Card - container with border and optional title
 */
export interface CardProps extends ContainerProps {
  /** Card title */
  title?: string;
  /** Card variant */
  variant?: 'default' | 'outlined' | 'elevated';
}

export const Card: React.FC<CardProps> = ({
  variant = 'default',
  border,
  padding,
  ...props
}) => {
  const cardBorder = border || { style: variant === 'outlined' ? 'single' : 'round' };
  const cardPadding = padding || { top: 1, right: 2, bottom: 1, left: 2 };

  return <Container {...props} border={cardBorder} padding={cardPadding} />;
};

/**
 * Grid - simple grid layout using nested containers
 */
export interface GridProps {
  /** Unique grid ID */
  id: string;
  /** Number of columns */
  columns: number;
  /** Gap between items */
  gap?: number;
  /** Grid items (as ComponentSpec array) */
  items?: ComponentSpec[];
  /** Children (React nodes) */
  children?: React.ReactNode;
  /** Whether grid is visible */
  visible?: boolean;
}

export const Grid: React.FC<GridProps> = ({
  id,
  columns,
  gap = 1,
  items,
  children,
  visible = true,
}) => {
  if (!visible) {
    return null;
  }

  // If items are provided, chunk them into rows
  if (items && items.length > 0) {
    const rows: ComponentSpec[][] = [];
    for (let i = 0; i < items.length; i += columns) {
      rows.push(items.slice(i, i + columns));
    }

    return (
      <Box flexDirection="column" gap={gap}>
        {rows.map((row, rowIndex) => (
          <Box key={`${id}-row-${rowIndex}`} flexDirection="row" gap={gap}>
            {ComponentRegistry.renderAll(row)}
          </Box>
        ))}
      </Box>
    );
  }

  // If children are React nodes, render them in a grid
  if (children) {
    const childArray = React.Children.toArray(children);
    const rows: React.ReactNode[][] = [];

    for (let i = 0; i < childArray.length; i += columns) {
      rows.push(childArray.slice(i, i + columns));
    }

    return (
      <Box flexDirection="column" gap={gap}>
        {rows.map((row, rowIndex) => (
          <Box key={`${id}-row-${rowIndex}`} flexDirection="row" gap={gap}>
            {row}
          </Box>
        ))}
      </Box>
    );
  }

  return null;
};
