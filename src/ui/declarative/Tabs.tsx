/**
 * Declarative Tabs Component (UOW-0810)
 *
 * Tab navigation for terminal UI.
 */

import React from 'react';
import { Box, Text, useInput } from 'ink';

export interface Tab {
  id: string;
  label: string;
  icon?: string;
  disabled?: boolean;
  badge?: string | number;
}

export interface TabsProps {
  /** Tab definitions */
  tabs: Tab[];
  /** Currently active tab ID */
  activeTab: string;
  /** Whether tabs have focus */
  focused?: boolean;
  /** Tab style */
  style?: 'default' | 'boxed' | 'underline' | 'pills';
  /** Called when tab changes */
  onChange?: (tabId: string) => void;
  /** Tab content render function */
  children?: (activeTabId: string) => React.ReactNode;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  focused = false,
  style = 'default',
  onChange,
  children,
}) => {
  // Handle keyboard navigation
  useInput(
    (input, key) => {
      if (!focused || tabs.length === 0) return;

      const currentIndex = tabs.findIndex((t) => t.id === activeTab);
      const enabledTabs = tabs.filter((t) => !t.disabled);

      if (key.leftArrow || input === 'h') {
        // Move to previous enabled tab
        for (let i = currentIndex - 1; i >= 0; i--) {
          const tab = tabs[i];
          if (tab && !tab.disabled) {
            onChange?.(tab.id);
            return;
          }
        }
        // Wrap to end
        for (let i = tabs.length - 1; i > currentIndex; i--) {
          const tab = tabs[i];
          if (tab && !tab.disabled) {
            onChange?.(tab.id);
            return;
          }
        }
        return;
      }

      if (key.rightArrow || input === 'l') {
        // Move to next enabled tab
        for (let i = currentIndex + 1; i < tabs.length; i++) {
          const tab = tabs[i];
          if (tab && !tab.disabled) {
            onChange?.(tab.id);
            return;
          }
        }
        // Wrap to start
        for (let i = 0; i < currentIndex; i++) {
          const tab = tabs[i];
          if (tab && !tab.disabled) {
            onChange?.(tab.id);
            return;
          }
        }
        return;
      }

      // Number keys to jump to tab
      const num = parseInt(input, 10);
      if (num >= 1 && num <= enabledTabs.length) {
        const targetTab = enabledTabs[num - 1];
        if (targetTab) {
          onChange?.(targetTab.id);
        }
      }
    },
    { isActive: focused }
  );

  const renderTab = (tab: Tab, _index: number) => {
    const isActive = tab.id === activeTab;
    const isDisabled = tab.disabled;

    const content = (
      <>
        {tab.icon && <Text>{tab.icon} </Text>}
        <Text>{tab.label}</Text>
        {tab.badge !== undefined && (
          <Text color="red"> ({tab.badge})</Text>
        )}
      </>
    );

    switch (style) {
      case 'boxed':
        return (
          <Box
            key={tab.id}
            borderStyle={isActive ? 'single' : undefined}
            borderColor={isActive ? 'cyan' : undefined}
            paddingX={1}
          >
            <Text
              color={isDisabled ? 'gray' : isActive ? 'cyan' : undefined}
              bold={isActive}
              dimColor={isDisabled}
            >
              {content}
            </Text>
          </Box>
        );

      case 'underline':
        return (
          <Box key={tab.id} flexDirection="column">
            <Box paddingX={1}>
              <Text
                color={isDisabled ? 'gray' : isActive ? 'cyan' : undefined}
                bold={isActive}
                dimColor={isDisabled}
              >
                {content}
              </Text>
            </Box>
            {isActive && (
              <Text color="cyan">{'─'.repeat(tab.label.length + 2)}</Text>
            )}
          </Box>
        );

      case 'pills':
        return (
          <Box key={tab.id} marginRight={1}>
            <Text
              backgroundColor={isActive ? 'cyan' : undefined}
              color={isActive ? 'black' : isDisabled ? 'gray' : undefined}
              dimColor={isDisabled}
            >
              {' '}{tab.icon && `${tab.icon} `}{tab.label}{' '}
            </Text>
          </Box>
        );

      default: // 'default'
        return (
          <Box key={tab.id} marginRight={2}>
            <Text
              color={isDisabled ? 'gray' : isActive ? 'cyan' : undefined}
              bold={isActive}
              dimColor={isDisabled}
              underline={isActive}
            >
              {focused && isActive ? '▸ ' : '  '}
              {content}
            </Text>
          </Box>
        );
    }
  };

  return (
    <Box flexDirection="column">
      {/* Tab bar */}
      <Box>
        {tabs.map((tab, i) => renderTab(tab, i))}
      </Box>

      {/* Content area */}
      {children && (
        <Box marginTop={1}>
          {children(activeTab)}
        </Box>
      )}
    </Box>
  );
};

/**
 * Vertical tabs
 */
export interface VerticalTabsProps {
  tabs: Tab[];
  activeTab: string;
  focused?: boolean;
  onChange?: (tabId: string) => void;
  children?: (activeTabId: string) => React.ReactNode;
}

export const VerticalTabs: React.FC<VerticalTabsProps> = ({
  tabs,
  activeTab,
  focused = false,
  onChange,
  children,
}) => {
  useInput(
    (input, key) => {
      if (!focused || tabs.length === 0) return;

      const currentIndex = tabs.findIndex((t) => t.id === activeTab);

      if (key.upArrow || input === 'k') {
        for (let i = currentIndex - 1; i >= 0; i--) {
          const tab = tabs[i];
          if (tab && !tab.disabled) {
            onChange?.(tab.id);
            return;
          }
        }
        return;
      }

      if (key.downArrow || input === 'j') {
        for (let i = currentIndex + 1; i < tabs.length; i++) {
          const tab = tabs[i];
          if (tab && !tab.disabled) {
            onChange?.(tab.id);
            return;
          }
        }
      }
    },
    { isActive: focused }
  );

  return (
    <Box>
      {/* Sidebar */}
      <Box flexDirection="column" borderStyle="single" borderColor="gray" paddingRight={1}>
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <Box key={tab.id} paddingX={1}>
              <Text
                color={tab.disabled ? 'gray' : isActive ? 'cyan' : undefined}
                bold={isActive}
                backgroundColor={isActive ? 'blue' : undefined}
              >
                {focused && isActive ? '▸' : ' '} {tab.icon && `${tab.icon} `}{tab.label}
              </Text>
            </Box>
          );
        })}
      </Box>

      {/* Content */}
      {children && (
        <Box flexGrow={1} paddingLeft={1}>
          {children(activeTab)}
        </Box>
      )}
    </Box>
  );
};

/**
 * Simple tab bar without content area
 */
export interface TabBarProps {
  items: string[];
  selected: number;
  focused?: boolean;
  onChange?: (index: number) => void;
}

export const TabBar: React.FC<TabBarProps> = ({
  items,
  selected,
  focused = false,
  onChange,
}) => {
  useInput(
    (_input, key) => {
      if (!focused) return;

      if (key.leftArrow && selected > 0) {
        onChange?.(selected - 1);
      } else if (key.rightArrow && selected < items.length - 1) {
        onChange?.(selected + 1);
      }
    },
    { isActive: focused }
  );

  return (
    <Box>
      {items.map((item, i) => (
        <Box key={i} marginRight={1}>
          <Text
            color={i === selected ? 'cyan' : undefined}
            bold={i === selected}
            underline={i === selected}
          >
            {item}
          </Text>
        </Box>
      ))}
    </Box>
  );
};

/**
 * Tab panel container
 */
export interface TabPanelProps {
  id: string;
  activeId: string;
  children: React.ReactNode;
}

export const TabPanel: React.FC<TabPanelProps> = ({
  id,
  activeId,
  children,
}) => {
  if (id !== activeId) return null;
  return <>{children}</>;
};

/**
 * Breadcrumb-style tabs
 */
export interface BreadcrumbTabsProps {
  items: Array<{ id: string; label: string }>;
  activeId: string;
  onChange?: (id: string) => void;
}

export const BreadcrumbTabs: React.FC<BreadcrumbTabsProps> = ({
  items,
  activeId,
  onChange: _onChange,
}) => {
  const activeIndex = items.findIndex((i) => i.id === activeId);

  return (
    <Box>
      {items.map((item, i) => {
        const isActive = item.id === activeId;
        const isPast = i < activeIndex;

        return (
          <React.Fragment key={item.id}>
            <Text
              color={isActive ? 'cyan' : isPast ? 'green' : 'gray'}
              bold={isActive}
            >
              {item.label}
            </Text>
            {i < items.length - 1 && (
              <Text dimColor> › </Text>
            )}
          </React.Fragment>
        );
      })}
    </Box>
  );
};
