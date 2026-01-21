/**
 * Declarative Accordion Component (UOW-1003)
 *
 * Collapsible content panels for terminal UI.
 */

import React from 'react';
import { Box, Text, useInput } from 'ink';

export interface AccordionItem {
  id: string;
  title: string;
  content: React.ReactNode;
  disabled?: boolean;
}

export interface AccordionProps {
  /** Accordion items */
  items: AccordionItem[];
  /** Expanded item IDs */
  expandedIds?: string[];
  /** Only allow one item expanded at a time */
  exclusive?: boolean;
  /** Whether accordion has focus */
  focused?: boolean;
  /** Currently focused item index */
  focusedIndex?: number;
  /** Called when expanded state changes */
  onToggle?: (id: string, expanded: boolean) => void;
  /** Called when focus changes */
  onFocusChange?: (index: number) => void;
}

export const Accordion: React.FC<AccordionProps> = ({
  items,
  expandedIds = [],
  exclusive: _exclusive = false,
  focused = false,
  focusedIndex = 0,
  onToggle,
  onFocusChange,
}) => {
  useInput(
    (input, key) => {
      if (!focused || items.length === 0) return;

      // Navigate up
      if (key.upArrow || input === 'k') {
        const newIndex = Math.max(0, focusedIndex - 1);
        if (newIndex !== focusedIndex) {
          onFocusChange?.(newIndex);
        }
        return;
      }

      // Navigate down
      if (key.downArrow || input === 'j') {
        const newIndex = Math.min(items.length - 1, focusedIndex + 1);
        if (newIndex !== focusedIndex) {
          onFocusChange?.(newIndex);
        }
        return;
      }

      // Toggle
      if (key.return || input === ' ') {
        const item = items[focusedIndex];
        if (item && !item.disabled) {
          const isExpanded = expandedIds.includes(item.id);
          onToggle?.(item.id, !isExpanded);
        }
      }
    },
    { isActive: focused }
  );

  return (
    <Box flexDirection="column">
      {items.map((item, index) => {
        const isExpanded = expandedIds.includes(item.id);
        const isFocused = focused && index === focusedIndex;

        return (
          <Box key={item.id} flexDirection="column" marginBottom={1}>
            {/* Header */}
            <Box
              borderStyle={isFocused ? 'single' : undefined}
              borderColor={isFocused ? 'cyan' : undefined}
              paddingX={1}
            >
              <Text color={item.disabled ? 'gray' : isFocused ? 'cyan' : undefined}>
                {isExpanded ? '▼' : '▶'}
              </Text>
              <Text
                bold={isFocused}
                color={item.disabled ? 'gray' : isFocused ? 'cyan' : undefined}
                dimColor={item.disabled}
              >
                {' '}{item.title}
              </Text>
            </Box>

            {/* Content */}
            {isExpanded && (
              <Box
                marginLeft={2}
                marginTop={1}
                paddingLeft={1}
                borderStyle="single"
                borderColor="gray"
              >
                {item.content}
              </Box>
            )}
          </Box>
        );
      })}
    </Box>
  );
};

/**
 * Simple collapsible section
 */
export interface CollapsibleProps {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  icon?: string;
}

export const Collapsible: React.FC<CollapsibleProps> = ({
  title,
  children,
  defaultExpanded = false,
  icon,
}) => {
  const [expanded, _setExpanded] = React.useState(defaultExpanded);

  return (
    <Box flexDirection="column">
      <Box>
        <Text color="cyan">{expanded ? '▼' : '▶'} </Text>
        {icon && <Text>{icon} </Text>}
        <Text bold>{title}</Text>
      </Box>
      {expanded && (
        <Box marginLeft={2} marginTop={1}>
          {children}
        </Box>
      )}
    </Box>
  );
};

/**
 * Details/Summary pattern
 */
export interface DetailsProps {
  summary: string;
  children: React.ReactNode;
  open?: boolean;
  onToggle?: (open: boolean) => void;
}

export const Details: React.FC<DetailsProps> = ({
  summary,
  children,
  open = false,
  onToggle: _onToggle,
}) => {
  return (
    <Box flexDirection="column">
      <Box>
        <Text color="cyan">{open ? '▾' : '▸'} </Text>
        <Text>{summary}</Text>
      </Box>
      {open && (
        <Box marginLeft={2} marginTop={1}>
          {children}
        </Box>
      )}
    </Box>
  );
};

/**
 * Step-by-step accordion (wizard style)
 */
export interface StepAccordionProps {
  steps: Array<{
    id: string;
    title: string;
    content: React.ReactNode;
    completed?: boolean;
    error?: string;
  }>;
  currentStep: number;
  onStepChange?: (step: number) => void;
}

export const StepAccordion: React.FC<StepAccordionProps> = ({
  steps,
  currentStep,
  onStepChange: _onStepChange,
}) => {
  return (
    <Box flexDirection="column">
      {steps.map((step, index) => {
        const isCurrent = index === currentStep;
        const isCompleted = step.completed;
        const isPast = index < currentStep;
        const isFuture = index > currentStep;

        let statusIcon = '○';
        let statusColor: Parameters<typeof Text>[0]['color'] = 'gray';

        if (isCompleted) {
          statusIcon = '✔';
          statusColor = 'green';
        } else if (step.error) {
          statusIcon = '✖';
          statusColor = 'red';
        } else if (isCurrent) {
          statusIcon = '●';
          statusColor = 'cyan';
        }

        return (
          <Box key={step.id} flexDirection="column" marginBottom={1}>
            {/* Step header */}
            <Box>
              <Text color={statusColor}>{statusIcon} </Text>
              <Text dimColor>{index + 1}. </Text>
              <Text
                bold={isCurrent}
                color={isCurrent ? 'cyan' : isPast ? 'green' : 'gray'}
                dimColor={isFuture}
              >
                {step.title}
              </Text>
            </Box>

            {/* Step content (only show current) */}
            {isCurrent && (
              <Box
                marginLeft={3}
                marginTop={1}
                paddingLeft={1}
                borderStyle="single"
                borderColor="cyan"
              >
                <Box flexDirection="column">
                  {step.content}
                  {step.error && (
                    <Box marginTop={1}>
                      <Text color="red">{step.error}</Text>
                    </Box>
                  )}
                </Box>
              </Box>
            )}
          </Box>
        );
      })}
    </Box>
  );
};
