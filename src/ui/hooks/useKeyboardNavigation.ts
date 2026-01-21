/**
 * Keyboard Navigation Hook
 *
 * Handles all keyboard shortcuts and navigation within the TUI.
 */

import { useInput } from 'ink';
import { useStore } from '../../store/index.js';

export function useKeyboardNavigation(): void {
  const viewMode = useStore((s) => s.viewMode);
  const setConversationScroll = useStore((s) => s.setConversationScroll);
  const setDocumentScroll = useStore((s) => s.setDocumentScroll);
  const conversationScrollOffset = useStore((s) => s.conversationScrollOffset);
  const documentScrollOffset = useStore((s) => s.documentScrollOffset);
  const toggleTasksPanel = useStore((s) => s.toggleTasksPanel);
  const closeDocument = useStore((s) => s.closeDocument);
  const messages = useStore((s) => s.messages);
  const currentDocument = useStore((s) => s.currentDocument);
  const updateConfig = useStore((s) => s.updateConfig);
  const config = useStore((s) => s.config);

  useInput((input, key) => {
    // Toggle tasks panel with 't'
    if (input === 't' || input === 'T') {
      toggleTasksPanel();
      return;
    }

    // Toggle auto-scroll with 'a'
    if (input === 'a' || input === 'A') {
      updateConfig({ autoScroll: !config.autoScroll });
      return;
    }

    // Close document with 'q' (in document view)
    if ((input === 'q' || input === 'Q') && viewMode === 'document') {
      closeDocument();
      return;
    }

    // Scrolling in document view
    if (viewMode === 'document' && currentDocument) {
      const lines = currentDocument.content.split('\n').length;
      const pageSize = 20;

      if (key.upArrow || input === 'k') {
        setDocumentScroll(Math.max(0, documentScrollOffset - 1));
      } else if (key.downArrow || input === 'j') {
        setDocumentScroll(Math.min(lines - 1, documentScrollOffset + 1));
      } else if (key.pageUp) {
        setDocumentScroll(Math.max(0, documentScrollOffset - pageSize));
      } else if (key.pageDown) {
        setDocumentScroll(Math.min(lines - pageSize, documentScrollOffset + pageSize));
      } else if (input === 'g') {
        // Go to top
        setDocumentScroll(0);
      } else if (input === 'G') {
        // Go to bottom
        setDocumentScroll(Math.max(0, lines - pageSize));
      }
      return;
    }

    // Scrolling in conversation view
    if (viewMode === 'normal') {
      const pageSize = 5;

      if (key.upArrow || input === 'k') {
        setConversationScroll(Math.max(0, conversationScrollOffset - 1));
        // Disable auto-scroll when manually scrolling
        if (config.autoScroll) {
          updateConfig({ autoScroll: false });
        }
      } else if (key.downArrow || input === 'j') {
        setConversationScroll(
          Math.min(messages.length - 1, conversationScrollOffset + 1)
        );
      } else if (key.pageUp) {
        setConversationScroll(Math.max(0, conversationScrollOffset - pageSize));
        if (config.autoScroll) {
          updateConfig({ autoScroll: false });
        }
      } else if (key.pageDown) {
        const newOffset = conversationScrollOffset + pageSize;
        setConversationScroll(Math.min(messages.length - 1, newOffset));
        // Re-enable auto-scroll if we're at the bottom
        if (newOffset >= messages.length - 1) {
          updateConfig({ autoScroll: true });
        }
      } else if (input === 'g') {
        // Go to top
        setConversationScroll(0);
        updateConfig({ autoScroll: false });
      } else if (input === 'G') {
        // Go to bottom and enable auto-scroll
        setConversationScroll(Math.max(0, messages.length - 1));
        updateConfig({ autoScroll: true });
      }
    }
  });
}
