'use client';

import { useEffect } from 'react';

interface KeyboardShortcutHandlers {
  onSave?: () => void;
  onRun?: () => void;
  onExport?: () => void;
  onDelete?: () => void;
  onShowHelp?: () => void;
}

/**
 * Hook for handling workflow editor keyboard shortcuts
 *
 * Shortcuts:
 * - Cmd/Ctrl+S: Save workflow
 * - Cmd/Ctrl+R: Run/Execute workflow
 * - Cmd/Ctrl+E: Export workflow
 * - Delete: Delete selected node
 * - ?: Show keyboard shortcuts help
 */
export function useWorkflowKeyboardShortcuts({
  onSave,
  onRun,
  onExport,
  onDelete,
  onShowHelp,
}: KeyboardShortcutHandlers) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform);
      const isModifierPressed = isMac ? event.metaKey : event.ctrlKey;

      // Check if focus is on an input/textarea to avoid interfering with typing
      const isInputFocused =
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement;

      // Cmd/Ctrl+S: Save
      if (isModifierPressed && event.key === 's') {
        event.preventDefault();
        onSave?.();
        return;
      }

      // Cmd/Ctrl+R: Run
      if (isModifierPressed && event.key === 'r') {
        event.preventDefault();
        onRun?.();
        return;
      }

      // Cmd/Ctrl+E: Export
      if (isModifierPressed && event.key === 'e') {
        event.preventDefault();
        onExport?.();
        return;
      }

      // Delete: Delete selected node (only if not typing)
      if (event.key === 'Delete' && !isInputFocused) {
        event.preventDefault();
        onDelete?.();
        return;
      }

      // ?: Show help (only if not typing)
      if ((event.key === '?' || event.shiftKey && event.key === '/') && !isInputFocused) {
        event.preventDefault();
        onShowHelp?.();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSave, onRun, onExport, onDelete, onShowHelp]);
}
