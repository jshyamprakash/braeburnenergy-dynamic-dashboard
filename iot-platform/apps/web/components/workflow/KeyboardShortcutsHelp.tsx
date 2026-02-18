'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/components/Modal';

interface KeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Keyboard Shortcuts Help Dialog
 *
 * Displays all available keyboard shortcuts for the workflow editor
 */
export default function KeyboardShortcutsHelp({ isOpen, onClose }: KeyboardShortcutsHelpProps) {
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    setIsMac(/Mac|iPhone|iPad|iPod/.test(navigator.platform));
  }, []);

  const shortcuts = [
    {
      category: 'File Operations',
      items: [
        {
          key: isMac ? '⌘S' : 'Ctrl+S',
          description: 'Save workflow',
        },
        {
          key: isMac ? '⌘E' : 'Ctrl+E',
          description: 'Export workflow as JSON',
        },
      ],
    },
    {
      category: 'Execution',
      items: [
        {
          key: isMac ? '⌘R' : 'Ctrl+R',
          description: 'Run workflow with execution input',
        },
      ],
    },
    {
      category: 'Editing',
      items: [
        {
          key: 'Delete',
          description: 'Delete selected node',
        },
        {
          key: 'Click node',
          description: 'Select node for configuration',
        },
        {
          key: 'Click canvas',
          description: 'Deselect current node',
        },
      ],
    },
    {
      category: 'Help',
      items: [
        {
          key: '?',
          description: 'Show this keyboard shortcuts help',
        },
      ],
    },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Keyboard Shortcuts" size="md">
      <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
        Master these shortcuts to work faster in the workflow editor
      </p>

      <div className="space-y-6 max-h-96 overflow-y-auto">
        {shortcuts.map((group) => (
          <div key={group.category}>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              {group.category}
            </h3>
            <div className="space-y-2">
              {group.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-start gap-4">
                  <kbd className="px-2 py-1 text-sm font-semibold text-gray-900 bg-gray-100 border border-gray-300 rounded-lg dark:bg-gray-700 dark:text-white dark:border-gray-600 whitespace-nowrap">
                    {item.key}
                  </kbd>
                  <span className="text-sm text-gray-600 dark:text-gray-300 text-right flex-1">
                    {item.description}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="pt-4 mt-6 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          💡 Tip: Keyboard shortcuts don't work when focused on text inputs
        </p>
      </div>
    </Modal>
  );
}
