# Week 3.7 Feature Tasks (Max 15)

## Phase 1: Modal Structure & Layout
1. Create `SettingsModal.tsx` with overlay, dialog container, header/footer
2. Add isOpen/onClose props, Escape key handler, click-outside-to-close
3. Implement dark mode styling (consistent with app theme)
4. Add modal state to builder page, wire to handleSettings

## Phase 2: Form Fields
5. Name input with validation (required, 1-100 chars, real-time feedback)
6. Description textarea with character counter (max 500 chars)
7. Priority dropdown (HIGH/MEDIUM/LOW) with styled select
8. Enabled toggle switch with label
9. Tags input with add/remove chips or comma-separated textarea

## Phase 3: Form Logic & Validation
10. Initialize form state from current workflow metadata (useEffect)
11. Implement controlled form inputs with onChange handlers
12. Client-side validation: check all constraints before submit
13. Unsaved changes detection: compare form state with initial values
14. Show warning modal if user closes with unsaved changes

## Phase 4: API Integration & Polish
15. Wire form submit to PATCH `/workflows/:id`, sync Redux state, toast notifications
