/**
 * Declarative Badge Component (UOW-0809)
 *
 * Status badges and labels for terminal UI.
 */

import React from 'react';
import { Box, Text } from 'ink';

export type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info';
export type BadgeSize = 'small' | 'medium' | 'large';

const VARIANT_COLORS: Record<BadgeVariant, { bg: string; fg: string }> = {
  default: { bg: 'gray', fg: 'white' },
  primary: { bg: 'blue', fg: 'white' },
  success: { bg: 'green', fg: 'white' },
  warning: { bg: 'yellow', fg: 'black' },
  error: { bg: 'red', fg: 'white' },
  info: { bg: 'cyan', fg: 'black' },
};

export interface BadgeProps {
  /** Badge text */
  children: string;
  /** Badge variant */
  variant?: BadgeVariant;
  /** Badge size */
  size?: BadgeSize;
  /** Icon to show before text */
  icon?: string;
  /** Make badge bold */
  bold?: boolean;
  /** Use outline style instead of filled */
  outline?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'medium',
  icon,
  bold = false,
  outline = false,
}) => {
  const colors = VARIANT_COLORS[variant];

  const padding = {
    small: '',
    medium: ' ',
    large: '  ',
  }[size];

  const content = icon ? `${icon} ${children}` : children;

  if (outline) {
    return (
      <Text color={colors.bg as Parameters<typeof Text>[0]['color']} bold={bold}>
        [{content}]
      </Text>
    );
  }

  return (
    <Text
      backgroundColor={colors.bg as Parameters<typeof Text>[0]['backgroundColor']}
      color={colors.fg as Parameters<typeof Text>[0]['color']}
      bold={bold}
    >
      {padding}{content}{padding}
    </Text>
  );
};

/**
 * Status badge with predefined states
 */
export interface StatusBadgeProps {
  status: 'active' | 'inactive' | 'pending' | 'success' | 'error' | 'warning';
  label?: string;
  showIcon?: boolean;
}

const STATUS_CONFIG: Record<StatusBadgeProps['status'], { icon: string; variant: BadgeVariant; defaultLabel: string }> = {
  active: { icon: '●', variant: 'success', defaultLabel: 'Active' },
  inactive: { icon: '○', variant: 'default', defaultLabel: 'Inactive' },
  pending: { icon: '◐', variant: 'warning', defaultLabel: 'Pending' },
  success: { icon: '✔', variant: 'success', defaultLabel: 'Success' },
  error: { icon: '✖', variant: 'error', defaultLabel: 'Error' },
  warning: { icon: '⚠', variant: 'warning', defaultLabel: 'Warning' },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  showIcon = true,
}) => {
  const config = STATUS_CONFIG[status];

  return (
    <Badge
      variant={config.variant}
      icon={showIcon ? config.icon : undefined}
    >
      {label ?? config.defaultLabel}
    </Badge>
  );
};

/**
 * Count badge (notification style)
 */
export interface CountBadgeProps {
  count: number;
  max?: number;
  variant?: BadgeVariant;
  showZero?: boolean;
}

export const CountBadge: React.FC<CountBadgeProps> = ({
  count,
  max = 99,
  variant = 'error',
  showZero = false,
}) => {
  if (count === 0 && !showZero) {
    return null;
  }

  const displayCount = count > max ? `${max}+` : String(count);

  return (
    <Badge variant={variant} size="small">
      {displayCount}
    </Badge>
  );
};

/**
 * Tag badge (removable)
 */
export interface TagProps {
  children: string;
  color?: string;
  onRemove?: () => void;
}

export const Tag: React.FC<TagProps> = ({
  children,
  color = 'cyan',
  onRemove,
}) => {
  return (
    <Box>
      <Text color={color as Parameters<typeof Text>[0]['color']}>
        {children}
      </Text>
      {onRemove && (
        <Text dimColor> ×</Text>
      )}
    </Box>
  );
};

/**
 * Tag group
 */
export interface TagGroupProps {
  tags: Array<{ id: string; label: string; color?: string }>;
  onRemove?: (id: string) => void;
}

export const TagGroup: React.FC<TagGroupProps> = ({
  tags,
  onRemove,
}) => {
  return (
    <Box gap={1} flexWrap="wrap">
      {tags.map((tag) => (
        <Tag
          key={tag.id}
          color={tag.color}
          onRemove={onRemove ? () => onRemove(tag.id) : undefined}
        >
          {tag.label}
        </Tag>
      ))}
    </Box>
  );
};

/**
 * Priority badge
 */
export interface PriorityBadgeProps {
  priority: 'critical' | 'high' | 'medium' | 'low';
  showLabel?: boolean;
}

const PRIORITY_CONFIG: Record<PriorityBadgeProps['priority'], { icon: string; color: string; label: string }> = {
  critical: { icon: '🔴', color: 'red', label: 'Critical' },
  high: { icon: '🟠', color: 'red', label: 'High' },
  medium: { icon: '🟡', color: 'yellow', label: 'Medium' },
  low: { icon: '🟢', color: 'green', label: 'Low' },
};

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({
  priority,
  showLabel = true,
}) => {
  const config = PRIORITY_CONFIG[priority];

  return (
    <Box>
      <Text>{config.icon}</Text>
      {showLabel && (
        <Text color={config.color as Parameters<typeof Text>[0]['color']}> {config.label}</Text>
      )}
    </Box>
  );
};

/**
 * Version badge
 */
export interface VersionBadgeProps {
  version: string;
  preRelease?: boolean;
}

export const VersionBadge: React.FC<VersionBadgeProps> = ({
  version,
  preRelease = false,
}) => {
  return (
    <Badge
      variant={preRelease ? 'warning' : 'info'}
      icon="v"
    >
      {version}
    </Badge>
  );
};

/**
 * Dot indicator (small status dot)
 */
export interface DotIndicatorProps {
  status: 'online' | 'offline' | 'away' | 'busy';
  label?: string;
}

const DOT_COLORS: Record<DotIndicatorProps['status'], string> = {
  online: 'green',
  offline: 'gray',
  away: 'yellow',
  busy: 'red',
};

export const DotIndicator: React.FC<DotIndicatorProps> = ({
  status,
  label,
}) => {
  const color = DOT_COLORS[status];

  return (
    <Box>
      <Text color={color as Parameters<typeof Text>[0]['color']}>●</Text>
      {label && <Text> {label}</Text>}
    </Box>
  );
};

/**
 * Keyboard shortcut badge
 */
export interface KeyBadgeProps {
  keys: string[];
}

export const KeyBadge: React.FC<KeyBadgeProps> = ({ keys }) => {
  return (
    <Box gap={0}>
      {keys.map((key, i) => (
        <React.Fragment key={i}>
          <Text backgroundColor="gray" color="white"> {key} </Text>
          {i < keys.length - 1 && <Text dimColor>+</Text>}
        </React.Fragment>
      ))}
    </Box>
  );
};
