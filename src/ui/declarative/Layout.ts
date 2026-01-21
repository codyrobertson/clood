/**
 * Dimension and Spacing Utilities (UOW-0803)
 *
 * Provides utilities for parsing and handling dimension strings
 * and spacing values for declarative UI components.
 */

import { Dimension, Spacing } from '../../protocol/schema/UILayout.js';

/**
 * Parsed dimension result
 */
export interface ParsedDimension {
  type: 'px' | 'percent' | 'auto' | 'fill';
  value: number;
}

/**
 * Parse a dimension value into a structured format
 *
 * @param dimension - The dimension value to parse (number, string like "50%", "auto", or "fill")
 * @returns Parsed dimension object
 */
export function parseDimension(dimension: Dimension): ParsedDimension {
  // Handle number (pixels)
  if (typeof dimension === 'number') {
    return { type: 'px', value: dimension };
  }

  // Handle string values
  if (dimension === 'auto') {
    return { type: 'auto', value: 0 };
  }

  if (dimension === 'fill') {
    return { type: 'fill', value: 100 };
  }

  // Handle percentage strings (e.g., "50%")
  if (typeof dimension === 'string' && dimension.endsWith('%')) {
    const value = parseFloat(dimension.slice(0, -1));
    if (!isNaN(value)) {
      return { type: 'percent', value };
    }
  }

  // Default to auto for unknown values
  return { type: 'auto', value: 0 };
}

/**
 * Calculate the actual pixel value for a dimension
 *
 * @param dimension - The dimension to calculate
 * @param containerSize - The size of the container (for percentage calculations)
 * @returns The calculated pixel value
 */
export function calculateDimensionPx(
  dimension: Dimension | undefined,
  containerSize: number
): number | undefined {
  if (dimension === undefined) {
    return undefined;
  }

  const parsed = parseDimension(dimension);

  switch (parsed.type) {
    case 'px':
      return parsed.value;
    case 'percent':
      return Math.floor((parsed.value / 100) * containerSize);
    case 'fill':
      return containerSize;
    case 'auto':
      return undefined;
    default:
      return undefined;
  }
}

/**
 * Check if a dimension is flexible (auto or fill)
 */
export function isFlexibleDimension(dimension: Dimension | undefined): boolean {
  if (dimension === undefined) return true;
  if (dimension === 'auto' || dimension === 'fill') return true;
  return false;
}

/**
 * Check if a dimension is a percentage
 */
export function isPercentageDimension(dimension: Dimension | undefined): boolean {
  if (dimension === undefined) return false;
  if (typeof dimension === 'string' && dimension.endsWith('%')) return true;
  return false;
}

/**
 * Check if a dimension is a fixed pixel value
 */
export function isFixedDimension(dimension: Dimension | undefined): boolean {
  return typeof dimension === 'number';
}

/**
 * Spacing utilities
 */

/**
 * Default spacing value (no spacing)
 */
export const DEFAULT_SPACING: Required<Spacing> = {
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
};

/**
 * Normalize spacing to have all values defined
 */
export function normalizeSpacing(spacing: Spacing | undefined): Required<Spacing> {
  if (!spacing) {
    return { ...DEFAULT_SPACING };
  }

  return {
    top: spacing.top ?? 0,
    right: spacing.right ?? 0,
    bottom: spacing.bottom ?? 0,
    left: spacing.left ?? 0,
  };
}

/**
 * Create uniform spacing (same value for all sides)
 */
export function uniformSpacing(value: number): Required<Spacing> {
  return {
    top: value,
    right: value,
    bottom: value,
    left: value,
  };
}

/**
 * Create symmetric spacing (same horizontal, same vertical)
 */
export function symmetricSpacing(vertical: number, horizontal: number): Required<Spacing> {
  return {
    top: vertical,
    right: horizontal,
    bottom: vertical,
    left: horizontal,
  };
}

/**
 * Create spacing from shorthand notation
 * Supports: single value, two values (vert, horiz), four values (top, right, bottom, left)
 */
export function spacingFromArray(values: number[]): Required<Spacing> {
  switch (values.length) {
    case 1:
      return uniformSpacing(values[0]!);
    case 2:
      return symmetricSpacing(values[0]!, values[1]!);
    case 4:
      return {
        top: values[0]!,
        right: values[1]!,
        bottom: values[2]!,
        left: values[3]!,
      };
    default:
      return { ...DEFAULT_SPACING };
  }
}

/**
 * Get total horizontal spacing (left + right)
 */
export function horizontalSpacing(spacing: Spacing | undefined): number {
  const normalized = normalizeSpacing(spacing);
  return normalized.left + normalized.right;
}

/**
 * Get total vertical spacing (top + bottom)
 */
export function verticalSpacing(spacing: Spacing | undefined): number {
  const normalized = normalizeSpacing(spacing);
  return normalized.top + normalized.bottom;
}

/**
 * Add two spacing objects together
 */
export function addSpacing(a: Spacing | undefined, b: Spacing | undefined): Required<Spacing> {
  const normalizedA = normalizeSpacing(a);
  const normalizedB = normalizeSpacing(b);

  return {
    top: normalizedA.top + normalizedB.top,
    right: normalizedA.right + normalizedB.right,
    bottom: normalizedA.bottom + normalizedB.bottom,
    left: normalizedA.left + normalizedB.left,
  };
}

/**
 * Scale spacing by a factor
 */
export function scaleSpacing(spacing: Spacing | undefined, factor: number): Required<Spacing> {
  const normalized = normalizeSpacing(spacing);

  return {
    top: Math.round(normalized.top * factor),
    right: Math.round(normalized.right * factor),
    bottom: Math.round(normalized.bottom * factor),
    left: Math.round(normalized.left * factor),
  };
}

/**
 * Convert spacing to Ink Box padding props
 */
export function spacingToInkPadding(spacing: Spacing | undefined): {
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
} {
  if (!spacing) return {};

  const props: {
    paddingTop?: number;
    paddingRight?: number;
    paddingBottom?: number;
    paddingLeft?: number;
  } = {};

  if (spacing.top !== undefined && spacing.top > 0) props.paddingTop = spacing.top;
  if (spacing.right !== undefined && spacing.right > 0) props.paddingRight = spacing.right;
  if (spacing.bottom !== undefined && spacing.bottom > 0) props.paddingBottom = spacing.bottom;
  if (spacing.left !== undefined && spacing.left > 0) props.paddingLeft = spacing.left;

  return props;
}

/**
 * Convert spacing to Ink Box margin props
 */
export function spacingToInkMargin(spacing: Spacing | undefined): {
  marginTop?: number;
  marginRight?: number;
  marginBottom?: number;
  marginLeft?: number;
} {
  if (!spacing) return {};

  const props: {
    marginTop?: number;
    marginRight?: number;
    marginBottom?: number;
    marginLeft?: number;
  } = {};

  if (spacing.top !== undefined && spacing.top > 0) props.marginTop = spacing.top;
  if (spacing.right !== undefined && spacing.right > 0) props.marginRight = spacing.right;
  if (spacing.bottom !== undefined && spacing.bottom > 0) props.marginBottom = spacing.bottom;
  if (spacing.left !== undefined && spacing.left > 0) props.marginLeft = spacing.left;

  return props;
}

/**
 * Gap utilities for flexbox layouts
 */

/**
 * Calculate gap values for a container
 */
export interface GapProps {
  gap?: number;
  columnGap?: number;
  rowGap?: number;
}

/**
 * Normalize gap to consistent format
 */
export function normalizeGap(gap: number | GapProps | undefined): GapProps {
  if (gap === undefined) {
    return {};
  }

  if (typeof gap === 'number') {
    return { gap };
  }

  return gap;
}

/**
 * Border style mapping for Ink
 */
export type InkBorderStyle = 'single' | 'double' | 'round' | 'bold' | 'singleDouble' | 'doubleSingle' | 'classic';

/**
 * Convert declarative border style to Ink border style
 */
export function toInkBorderStyle(style: string | undefined): InkBorderStyle | undefined {
  if (!style || style === 'none') {
    return undefined;
  }

  const styleMap: Record<string, InkBorderStyle> = {
    single: 'single',
    double: 'double',
    round: 'round',
    bold: 'bold',
    classic: 'classic',
  };

  return styleMap[style];
}

/**
 * Layout calculation helpers
 */

/**
 * Distribute available space among children with different dimension specs
 */
export function distributeSpace(
  available: number,
  dimensions: (Dimension | undefined)[],
  gap: number = 0
): number[] {
  const totalGap = gap * Math.max(0, dimensions.length - 1);
  const effectiveAvailable = available - totalGap;

  // First pass: calculate fixed and percentage sizes
  let fixedTotal = 0;
  let percentTotal = 0;
  let flexCount = 0;

  const parsed = dimensions.map((dim) => {
    if (dim === undefined || dim === 'auto' || dim === 'fill') {
      flexCount++;
      return { type: 'flex' as const, value: 0 };
    }

    const p = parseDimension(dim);
    if (p.type === 'px') {
      fixedTotal += p.value;
      return { type: 'fixed' as const, value: p.value };
    }
    if (p.type === 'percent') {
      const pxValue = Math.floor((p.value / 100) * effectiveAvailable);
      percentTotal += pxValue;
      return { type: 'percent' as const, value: pxValue };
    }

    flexCount++;
    return { type: 'flex' as const, value: 0 };
  });

  // Second pass: distribute remaining space to flex items
  const remaining = Math.max(0, effectiveAvailable - fixedTotal - percentTotal);
  const flexSize = flexCount > 0 ? Math.floor(remaining / flexCount) : 0;

  return parsed.map((p) => {
    if (p.type === 'flex') {
      return flexSize;
    }
    return p.value;
  });
}

/**
 * Clamp a value between min and max
 */
export function clampDimension(value: number, min?: number, max?: number): number {
  let result = value;
  if (min !== undefined) result = Math.max(result, min);
  if (max !== undefined) result = Math.min(result, max);
  return result;
}
