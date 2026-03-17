'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { useAppDispatch } from '@/lib/store';
import { updateKosmosWidgetConfig } from '@/lib/store/slices/dashboardSlice';
import type { KosmosPage, PlatSubsection, PlatCard } from '../types';

interface PlatformArchitectureBlockProps {
  page: KosmosPage;
  editMode: boolean;
  onConfigChange: (subsections: PlatSubsection[]) => void;
}

/**
 * PlatformArchitectureBlock — renders architecture subsections with editable cards.
 * Each subsection is a layer with a title and flex row of cards.
 * In edit mode: inline editing for titles and cards, add/remove buttons.
 */
export function PlatformArchitectureBlock({
  page,
  editMode,
  onConfigChange,
}: PlatformArchitectureBlockProps) {
  const dispatch = useAppDispatch();

  // Get the platformArchitecture widget config
  const archWidget = page.widgets.find((w) => w.type === 'platformArchitecture');
  const config = archWidget?.config ?? { subsections: [] };
  const subsections = (config.subsections ?? []) as PlatSubsection[];

  const [editingSubsectionId, setEditingSubsectionId] = useState<string | null>(null);
  const [editingSubsectionTitle, setEditingSubsectionTitle] = useState('');
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editingCardText, setEditingCardText] = useState('');

  // Update Redux when local changes happen
  const handleUpdate = useCallback(
    (newSubsections: PlatSubsection[]) => {
      if (archWidget) {
        dispatch(
          updateKosmosWidgetConfig({
            pageId: page.id,
            widgetId: archWidget.id,
            config: { subsections: newSubsections },
          })
        );
      }
      onConfigChange(newSubsections);
    },
    [archWidget, dispatch, page.id, onConfigChange]
  );

  // Rename subsection
  const handleStartRenameSub = (id: string, currentTitle: string) => {
    setEditingSubsectionId(id);
    setEditingSubsectionTitle(currentTitle);
  };

  const handleFinishRenameSub = () => {
    if (editingSubsectionId) {
      const updated = subsections.map((s) =>
        s.id === editingSubsectionId ? { ...s, title: editingSubsectionTitle } : s
      );
      handleUpdate(updated);
    }
    setEditingSubsectionId(null);
  };

  // Delete subsection
  const handleDeleteSub = (id: string) => {
    const updated = subsections.filter((s) => s.id !== id);
    handleUpdate(updated);
  };

  // Start editing card
  const handleStartEditCard = (subId: string, cardId: string, currentText: string) => {
    setEditingCardId(`${subId}:${cardId}`);
    setEditingCardText(currentText);
  };

  // Finish editing card
  const handleFinishEditCard = (subId: string) => {
    if (editingCardId?.startsWith(`${subId}:`)) {
      const cardId = editingCardId.split(':')[1];
      const updated = subsections.map((s) =>
        s.id === subId
          ? {
              ...s,
              cards: s.cards.map((c) =>
                c.id === cardId ? { ...c, text: editingCardText } : c
              ),
            }
          : s
      );
      handleUpdate(updated);
    }
    setEditingCardId(null);
  };

  // Delete card
  const handleDeleteCard = (subId: string, cardId: string) => {
    const updated = subsections.map((s) =>
      s.id === subId
        ? { ...s, cards: s.cards.filter((c) => c.id !== cardId) }
        : s
    );
    handleUpdate(updated);
  };

  // Add card to subsection
  const handleAddCard = (subId: string) => {
    const updated = subsections.map((s) =>
      s.id === subId
        ? {
            ...s,
            cards: [...s.cards, { id: `card_${Math.random().toString(36).slice(2, 10)}`, text: 'New Item' }],
          }
        : s
    );
    handleUpdate(updated);
  };

  // Add subsection
  const handleAddSub = () => {
    const newSub: PlatSubsection = {
      id: `sub_${Math.random().toString(36).slice(2, 10)}`,
      title: `Layer ${subsections.length}`,
      style: 'pb-deep',
      borderColor: 'rgba(60,140,211,0.3)',
      cards: [],
    };
    handleUpdate([...subsections, newSub]);
  };

  return (
    <div
      style={{
        background: 'var(--k-bg-card)',
        border: '1px solid var(--k-border)',
        borderRadius: 4,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      <div style={{ height: 2, background: 'linear-gradient(90deg, transparent, var(--k-base), transparent)' }} />
      {/* Header */}
      <div
        style={{
          padding: '10px 14px 8px',
          borderBottom: '1px solid var(--k-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        <div style={{ fontFamily: 'var(--k-font-display)', fontSize: 12, fontWeight: 600, letterSpacing: '2px', color: 'var(--k-soft)' }}>
          ⬡ KOSMOS CORTEX™ — PLATFORM ARCHITECTURE
        </div>
        <div style={{ fontSize: 10, background: 'rgba(21,96,189,0.2)', border: '1px solid var(--k-border-bright)', color: 'var(--k-pale)', padding: '2px 8px', borderRadius: 2, fontFamily: 'var(--k-font-tech)' }}>
          BRAEBURN ENERGY
        </div>
      </div>

      {/* Subsections */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {subsections.map((sub, idx) => (
          <div key={sub.id}>
            <PlatSubsectionRow
              subsection={sub}
              editMode={editMode}
              isEditing={editingSubsectionId === sub.id}
              editingTitle={editingSubsectionTitle}
              editingCardId={editingCardId}
              editingCardText={editingCardText}
              onStartRenameSub={() => handleStartRenameSub(sub.id, sub.title)}
              onFinishRenameSub={handleFinishRenameSub}
              onSetTitle={setEditingSubsectionTitle}
              onDeleteSub={() => handleDeleteSub(sub.id)}
              onStartEditCard={(cardId, text) => handleStartEditCard(sub.id, cardId, text)}
              onFinishEditCard={() => handleFinishEditCard(sub.id)}
              onSetCardText={setEditingCardText}
              onDeleteCard={(cardId) => handleDeleteCard(sub.id, cardId)}
              onAddCard={() => handleAddCard(sub.id)}
            />
            {idx < subsections.length - 1 && (
              <div style={{ textAlign: 'center', color: 'var(--k-mid)', fontSize: 18, lineHeight: 1 }}>
                ⇅
              </div>
            )}
          </div>
        ))}

        {/* Add subsection button */}
        {editMode && (
          <button
            onClick={handleAddSub}
            style={{
              alignSelf: 'flex-start',
              padding: '8px 12px',
              background: 'transparent',
              border: '1px dashed var(--k-border)',
              borderRadius: 3,
              color: 'var(--k-text-dim)',
              fontSize: 11,
              fontFamily: 'var(--k-font-tech)',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--k-green)';
              e.currentTarget.style.color = 'var(--k-green)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--k-border)';
              e.currentTarget.style.color = 'var(--k-text-dim)';
            }}
          >
            + ADD SUBSECTION
          </button>
        )}
      </div>
    </div>
  );
}

interface PlatSubsectionRowProps {
  subsection: PlatSubsection;
  editMode: boolean;
  isEditing: boolean;
  editingTitle: string;
  editingCardId: string | null;
  editingCardText: string;
  onStartRenameSub: () => void;
  onFinishRenameSub: () => void;
  onSetTitle: (val: string) => void;
  onDeleteSub: () => void;
  onStartEditCard: (cardId: string, text: string) => void;
  onFinishEditCard: () => void;
  onSetCardText: (val: string) => void;
  onDeleteCard: (cardId: string) => void;
  onAddCard: () => void;
}

/**
 * PlatSubsectionRow — renders a single subsection layer with cards and controls.
 * Uses ResizeObserver to detect row width and disable "Add Card" when full.
 */
function PlatSubsectionRow({
  subsection,
  editMode,
  isEditing,
  editingTitle,
  editingCardId,
  editingCardText,
  onStartRenameSub,
  onFinishRenameSub,
  onSetTitle,
  onDeleteSub,
  onStartEditCard,
  onFinishEditCard,
  onSetCardText,
  onDeleteCard,
  onAddCard,
}: PlatSubsectionRowProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(600);
  const [canAddCard, setCanAddCard] = useState(true);

  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width;
      setContainerWidth(width);

      // Estimate total card width: each card ~(text.length * 8 + 28px) + gaps
      const estimatedWidth = subsection.cards.reduce((sum, card) => {
        return sum + (Math.max(card.text.length * 7, 60) + 28 + 10); // text + padding + gap
      }, 0);

      // Check if we can fit another card (estimate ~80px minimum for new card)
      setCanAddCard(estimatedWidth + 90 < width - 20);
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, [subsection.cards]);

  return (
    <div
      style={{
        position: 'relative',
        border: `1px solid ${subsection.borderColor}`,
        borderRadius: 4,
        padding: '12px 16px',
      }}
    >
      {/* Layer label */}
      <div
        style={{
          position: 'absolute',
          top: -10,
          left: 12,
          fontSize: 10,
          fontFamily: 'var(--k-font-tech)',
          background: 'var(--k-bg-card)',
          padding: '0 8px',
          color: subsection.labelColor || 'var(--k-text-secondary)',
          letterSpacing: '2px',
        }}
      >
        {isEditing ? (
          <input
            autoFocus
            value={editingTitle}
            onChange={(e) => onSetTitle(e.target.value)}
            onBlur={onFinishRenameSub}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onFinishRenameSub();
              if (e.key === 'Escape') onStartRenameSub();
            }}
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: '1px solid var(--k-green)',
              color: 'var(--k-green)',
              fontFamily: 'var(--k-font-tech)',
              fontSize: 10,
              outline: 'none',
              padding: 0,
              letterSpacing: 1,
            }}
          />
        ) : (
          <span
            onClick={editMode ? onStartRenameSub : undefined}
            style={{ cursor: editMode ? 'pointer' : 'default' }}
          >
            {subsection.title}
            {editMode && <span style={{ marginLeft: 4, opacity: 0.5 }}>✎</span>}
          </span>
        )}
      </div>

      {/* Cards container */}
      <div
        ref={containerRef}
        style={{
          display: 'flex',
          gap: 10,
          flexWrap: 'wrap',
          alignItems: 'center',
          marginTop: 4,
        }}
      >
        {subsection.cards.map((card) => {
          const isCardEditing = editingCardId === `${subsection.id}:${card.id}`;
          return (
            <div key={card.id} style={{ display: 'flex', gap: 6, alignItems: 'center', position: 'relative' }}>
              {isCardEditing ? (
                <input
                  autoFocus
                  value={editingCardText}
                  onChange={(e) => onSetCardText(e.target.value)}
                  onBlur={onFinishEditCard}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') onFinishEditCard();
                    if (e.key === 'Escape') onFinishEditCard();
                  }}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 3,
                    border: `1px solid var(--k-green)`,
                    background: 'transparent',
                    fontFamily: 'var(--k-font-display)',
                    fontSize: 13,
                    fontWeight: 600,
                    letterSpacing: 1,
                    color: 'white',
                    outline: 'none',
                  }}
                />
              ) : (
                <div
                  onClick={editMode ? () => onStartEditCard(card.id, card.text) : undefined}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 3,
                    border: `1px solid ${getCardBorderColor(subsection.style)}`,
                    fontFamily: 'var(--k-font-display)',
                    fontSize: 13,
                    fontWeight: 600,
                    letterSpacing: 1,
                    color: getCardTextColor(subsection.style),
                    whiteSpace: 'nowrap',
                    backgroundColor: getCardBgColor(subsection.style),
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    if (editMode) {
                      e.currentTarget.style.borderColor = 'var(--k-green)';
                      e.currentTarget.style.boxShadow = '0 0 8px rgba(0,176,80,0.15)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.borderColor = getCardBorderColor(subsection.style);
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  {card.text}
                </div>
              )}

              {/* Delete card button */}
              {editMode && !isCardEditing && (
                <button
                  onClick={() => onDeleteCard(card.id)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--k-text-dim)',
                    cursor: 'pointer',
                    fontSize: 11,
                    padding: '2px 4px',
                    transition: 'color 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'var(--k-red)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'var(--k-text-dim)';
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          );
        })}

        {/* Add card button */}
        {editMode && (
          <button
            onClick={onAddCard}
            disabled={!canAddCard}
            title={canAddCard ? '' : 'Row full'}
            style={{
              padding: '4px 8px',
              background: canAddCard ? 'transparent' : 'rgba(100,100,100,0.2)',
              border: `1px dashed ${canAddCard ? 'var(--k-border)' : 'rgba(100,100,100,0.3)'}`,
              borderRadius: 3,
              color: canAddCard ? 'var(--k-text-dim)' : 'rgba(100,100,100,0.5)',
              fontSize: 10,
              fontFamily: 'var(--k-font-tech)',
              cursor: canAddCard ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              if (canAddCard) {
                e.currentTarget.style.borderColor = 'var(--k-green)';
                e.currentTarget.style.color = 'var(--k-green)';
              }
            }}
            onMouseLeave={(e) => {
              if (canAddCard) {
                e.currentTarget.style.borderColor = 'var(--k-border)';
                e.currentTarget.style.color = 'var(--k-text-dim)';
              }
            }}
          >
            + ADD
          </button>
        )}
      </div>

      {/* Delete subsection button */}
      {editMode && (
        <button
          onClick={onDeleteSub}
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            background: 'transparent',
            border: 'none',
            color: 'var(--k-text-dim)',
            cursor: 'pointer',
            fontSize: 11,
            padding: '2px 4px',
            transition: 'color 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--k-red)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--k-text-dim)';
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
}

/** Get border color for card based on subsection style */
function getCardBorderColor(style: string): string {
  switch (style) {
    case 'pb-deep':  return 'var(--k-base)';
    case 'pb-blue':  return 'var(--k-mid)';
    case 'pb-green': return 'var(--k-green)';
    case 'pb-teal':  return '#00B08C';
    default:         return 'var(--k-border)';
  }
}

/** Get text color for card based on subsection style */
function getCardTextColor(style: string): string {
  switch (style) {
    case 'pb-deep':  return 'var(--k-pale)';
    case 'pb-blue':  return 'var(--k-soft)';
    case 'pb-green': return 'var(--k-green)';
    case 'pb-teal':  return '#00D0A8';
    default:         return 'var(--k-text-primary)';
  }
}

/** Get background color for card based on subsection style */
function getCardBgColor(style: string): string {
  switch (style) {
    case 'pb-deep':
      return 'rgba(13,60,122,0.4)';
    case 'pb-blue':
      return 'rgba(21,96,189,0.15)';
    case 'pb-green':
      return 'rgba(0,176,80,0.12)';
    case 'pb-teal':
      return 'rgba(0,176,140,0.1)';
    default:
      return 'rgba(100,100,100,0.1)';
  }
}
