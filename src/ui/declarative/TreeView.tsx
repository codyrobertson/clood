/**
 * Declarative TreeView Component (UOW-1002)
 *
 * Hierarchical tree display for terminal UI.
 */

import React, { useCallback } from 'react';
import { Box, Text, useInput } from 'ink';

export interface TreeNode {
  id: string;
  label: string;
  icon?: string;
  children?: TreeNode[];
  data?: unknown;
}

export interface TreeViewProps {
  /** Root nodes */
  nodes: TreeNode[];
  /** Currently selected node ID */
  selectedId?: string;
  /** Expanded node IDs */
  expandedIds?: string[];
  /** Whether tree has focus */
  focused?: boolean;
  /** Show lines connecting nodes */
  showLines?: boolean;
  /** Called when selection changes */
  onSelect?: (node: TreeNode) => void;
  /** Called when node is activated (Enter) */
  onActivate?: (node: TreeNode) => void;
  /** Called when expanded state changes */
  onToggle?: (nodeId: string, expanded: boolean) => void;
}

export const TreeView: React.FC<TreeViewProps> = ({
  nodes,
  selectedId,
  expandedIds = [],
  focused = false,
  showLines = true,
  onSelect,
  onActivate,
  onToggle,
}) => {
  // Flatten tree for navigation
  const flattenTree = useCallback((
    nodeList: TreeNode[],
    depth: number = 0,
    prefix: string = ''
  ): Array<{ node: TreeNode; depth: number; prefix: string; isLast: boolean }> => {
    const result: Array<{ node: TreeNode; depth: number; prefix: string; isLast: boolean }> = [];

    nodeList.forEach((node, index) => {
      const isLast = index === nodeList.length - 1;
      result.push({ node, depth, prefix, isLast });

      if (node.children && expandedIds.includes(node.id)) {
        const childPrefix = prefix + (showLines ? (isLast ? '  ' : '│ ') : '  ');
        result.push(...flattenTree(node.children, depth + 1, childPrefix));
      }
    });

    return result;
  }, [expandedIds, showLines]);

  const flatNodes = flattenTree(nodes);
  const selectedIndex = flatNodes.findIndex((f) => f.node.id === selectedId);

  // Handle keyboard navigation
  useInput(
    (input, key) => {
      if (!focused || flatNodes.length === 0) return;

      // Navigate up
      if (key.upArrow || input === 'k') {
        if (selectedIndex > 0) {
          const prevNode = flatNodes[selectedIndex - 1];
          if (prevNode) {
            onSelect?.(prevNode.node);
          }
        }
        return;
      }

      // Navigate down
      if (key.downArrow || input === 'j') {
        if (selectedIndex < flatNodes.length - 1) {
          const nextNode = flatNodes[selectedIndex + 1];
          if (nextNode) {
            onSelect?.(nextNode.node);
          }
        }
        return;
      }

      // Expand/collapse
      if (key.leftArrow || input === 'h') {
        const current = flatNodes[selectedIndex];
        if (current && current.node.children && expandedIds.includes(current.node.id)) {
          onToggle?.(current.node.id, false);
        } else if (current && current.depth > 0) {
          // Navigate to parent
          for (let i = selectedIndex - 1; i >= 0; i--) {
            const item = flatNodes[i];
            if (item && item.depth < current.depth) {
              onSelect?.(item.node);
              break;
            }
          }
        }
        return;
      }

      if (key.rightArrow || input === 'l') {
        const current = flatNodes[selectedIndex];
        if (current && current.node.children) {
          if (!expandedIds.includes(current.node.id)) {
            onToggle?.(current.node.id, true);
          } else if (current.node.children.length > 0) {
            // Navigate to first child
            const firstChild = flatNodes[selectedIndex + 1];
            if (firstChild) {
              onSelect?.(firstChild.node);
            }
          }
        }
        return;
      }

      // Activate
      if (key.return) {
        const current = flatNodes[selectedIndex];
        if (current) {
          onActivate?.(current.node);
        }
        return;
      }

      // Toggle
      if (input === ' ') {
        const current = flatNodes[selectedIndex];
        if (current && current.node.children) {
          onToggle?.(current.node.id, !expandedIds.includes(current.node.id));
        }
      }
    },
    { isActive: focused }
  );

  const renderNode = (
    node: TreeNode,
    depth: number,
    prefix: string,
    isLast: boolean
  ) => {
    const isSelected = node.id === selectedId;
    const isExpanded = expandedIds.includes(node.id);
    const hasChildren = node.children && node.children.length > 0;

    // Build line prefix
    let linePrefix = '';
    if (showLines && depth > 0) {
      linePrefix = prefix + (isLast ? '└─' : '├─');
    } else if (depth > 0) {
      linePrefix = '  '.repeat(depth);
    }

    // Expand/collapse indicator
    let expandIcon = ' ';
    if (hasChildren) {
      expandIcon = isExpanded ? '▼' : '▶';
    }

    return (
      <Box key={node.id}>
        <Text dimColor>{linePrefix}</Text>
        <Text color={isSelected && focused ? 'cyan' : 'gray'}>{expandIcon} </Text>
        {node.icon && <Text>{node.icon} </Text>}
        <Text
          color={isSelected && focused ? 'cyan' : undefined}
          bold={isSelected}
          backgroundColor={isSelected && focused ? 'blue' : undefined}
        >
          {node.label}
        </Text>
      </Box>
    );
  };

  return (
    <Box flexDirection="column">
      {flatNodes.map(({ node, depth, prefix, isLast }) =>
        renderNode(node, depth, prefix, isLast)
      )}
    </Box>
  );
};

/**
 * File tree component
 */
export interface FileTreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileTreeNode[];
}

export interface FileTreeProps {
  root: FileTreeNode;
  selectedPath?: string;
  expandedPaths?: string[];
  focused?: boolean;
  showHidden?: boolean;
  onSelect?: (path: string, type: 'file' | 'directory') => void;
  onActivate?: (path: string, type: 'file' | 'directory') => void;
  onToggle?: (path: string, expanded: boolean) => void;
}

const FILE_ICONS: Record<string, string> = {
  directory: '📁',
  file: '📄',
  js: '🟨',
  ts: '🔷',
  tsx: '⚛️',
  jsx: '⚛️',
  json: '📋',
  md: '📝',
  css: '🎨',
  html: '🌐',
  py: '🐍',
  go: '🐹',
  rs: '🦀',
  rb: '💎',
};

const getFileIcon = (node: FileTreeNode): string => {
  if (node.type === 'directory') {
    return FILE_ICONS.directory ?? '📁';
  }

  const ext = node.name.split('.').pop()?.toLowerCase() ?? '';
  return FILE_ICONS[ext] ?? FILE_ICONS.file ?? '📄';
};

export const FileTree: React.FC<FileTreeProps> = ({
  root,
  selectedPath,
  expandedPaths = [],
  focused = false,
  showHidden = false,
  onSelect,
  onActivate,
  onToggle,
}) => {
  // Convert to TreeNode format
  const convertToTreeNode = (node: FileTreeNode): TreeNode => ({
    id: node.path,
    label: node.name,
    icon: getFileIcon(node),
    children: node.children
      ?.filter((child) => showHidden || !child.name.startsWith('.'))
      .sort((a, b) => {
        // Directories first
        if (a.type !== b.type) {
          return a.type === 'directory' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      })
      .map(convertToTreeNode),
    data: node,
  });

  const treeNodes = [convertToTreeNode(root)];

  return (
    <TreeView
      nodes={treeNodes}
      selectedId={selectedPath}
      expandedIds={expandedPaths}
      focused={focused}
      onSelect={(node) => {
        const data = node.data as FileTreeNode;
        onSelect?.(data.path, data.type);
      }}
      onActivate={(node) => {
        const data = node.data as FileTreeNode;
        onActivate?.(data.path, data.type);
      }}
      onToggle={onToggle}
    />
  );
};

/**
 * Simple expandable list
 */
export interface ExpandableListProps {
  items: Array<{
    id: string;
    title: string;
    content: React.ReactNode;
  }>;
  expandedIds?: string[];
  onToggle?: (id: string, expanded: boolean) => void;
}

export const ExpandableList: React.FC<ExpandableListProps> = ({
  items,
  expandedIds = [],
  onToggle: _onToggle,
}) => {
  return (
    <Box flexDirection="column">
      {items.map((item) => {
        const isExpanded = expandedIds.includes(item.id);

        return (
          <Box key={item.id} flexDirection="column">
            <Box>
              <Text color="cyan">{isExpanded ? '▼' : '▶'} </Text>
              <Text bold>{item.title}</Text>
            </Box>
            {isExpanded && (
              <Box marginLeft={2} marginTop={1} marginBottom={1}>
                {item.content}
              </Box>
            )}
          </Box>
        );
      })}
    </Box>
  );
};
