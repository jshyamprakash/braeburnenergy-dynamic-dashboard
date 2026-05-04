'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/lib/store';
import {
  selectKosmosPages,
  selectKosmosActivePage,
  selectKosmosSharedWithUsers,
  selectKosmosSharedPageIds,
  addKosmosPage,
  addCombustionDlPage,
  removeKosmosPage,
  renameKosmosPage,
  setKosmosActivePage,
  reorderKosmosPages,
  addKosmosWidget,
  removeKosmosWidget,
  updateKosmosWidgetLayout,
  updateKosmosWidgetConfig,
  setKosmosSharedWithUsers,
  setKosmosSharedPageIds,
  initKosmosFromBackend,
  saveKosmosToBackend,
  resetActiveMandatoryPage,
} from '@/lib/store/slices/dashboardSlice';
import type { KosmosWidget } from './types';
import { PALETTE_ENTRIES } from './types';
import { useLicense } from '@/lib/hooks/useLicense';
import { UnifiedCanvas } from './UnifiedCanvas';
import { WidgetConfigPanel } from './WidgetConfigPanel';
import { WidgetPalette } from './WidgetPalette';
import ShareUsersModal from './ShareUsersModal';
import { KosmosArchitectureTabPanel } from './tabs/KosmosArchitectureTabPanel';
import { KosmosBeAgentTabPanel } from './tabs/KosmosBeAgentTabPanel';
import { KosmosOverviewTabPanel } from './tabs/KosmosOverviewTabPanel';
import { KosmosCombustionDlTabPanel } from './tabs/KosmosCombustionDlTabPanel';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/utils/toast';

/* ─────────────────── helpers ─────────────────── */

const TAB_ICON: Record<string, string> = {
  overview: '◈',
  combustionDl: '◑',
  beAgent: '⟳',
  kosmosArchitecture: '⬡',
};

function useKosmosTime() {
  const [t, setT] = useState('');
  useEffect(() => {
    const update = () =>
      setT(new Date().toLocaleTimeString('en-GB', { hour12: false }));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);
  return t;
}

function getNextRow(widgets: KosmosWidget[]): number {
  if (!widgets.length) return 0;
  return Math.max(...widgets.map((w) => w.layout.y + w.layout.h));
}

function buildNewWidget(
  type: string,
  widgets: KosmosWidget[],
  mandatoryType?: 'overview' | 'combustionDl' | 'beAgent' | 'kosmosArchitecture'
): KosmosWidget {
  const entry = PALETTE_ENTRIES.find((p) => p.type === type);
  const slot = widgets.length % 8;
  const isPixelWidget =
    (mandatoryType === 'combustionDl' && entry?.tabScope === 'combustionDl') ||
    (mandatoryType === 'overview' && entry?.tabScope === 'overview');
  const y = isPixelWidget && entry ? entry.defaultLayout.y + slot * 20 : getNextRow(widgets);
  const widget = {
    id: `w_${Math.random().toString(36).slice(2, 10)}`,
    type: type as any,
    config: entry ? { ...entry.defaultConfig } : {},
    layout: entry
      ? isPixelWidget
        ? { ...entry.defaultLayout, x: entry.defaultLayout.x + slot * 20, y }
        : { ...entry.defaultLayout, x: 0, y }
      : { x: 0, y, w: 16, h: 16 },
  };
  return widget;
}

/* ─────────────────── component ─────────────────── */

interface KosmosShellProps {
  dashboardId: string;
  applicationId: string;
  viewOnly?: boolean;
  readOnly?: boolean; // ADR-045: read-only for Viewer kiosk
  skipInit?: boolean; // when true, skip initKosmosFromBackend (viewer provides pages directly)
}

/**
 * KosmosShell — the full-screen Kosmos dashboard builder/viewer (ADR-044 unified canvas).
 *
 * Layout: fixed inset-0, flex column.
 * Body: flex row with UnifiedCanvas (flex-1) + optional WidgetConfigPanel (320px).
 * WidgetPalette: fixed left overlay when open in edit mode.
 * readOnly: when true (Viewer kiosk), hides share/edit/delete buttons.
 */
export function KosmosShell({ dashboardId, applicationId, viewOnly = false, readOnly = false, skipInit = false }: KosmosShellProps) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const pages = useAppSelector(selectKosmosPages);
  const activePageId = useAppSelector(selectKosmosActivePage);
  const sharedWithUsers = useAppSelector(selectKosmosSharedWithUsers);
  const sharedPageIds = useAppSelector(selectKosmosSharedPageIds);
  const { isModuleEnabled } = useLicense();

  const [editMode, setEditMode] = useState(false);
  const [editSubMode, setEditSubMode] = useState<'layout' | 'config'>('layout');
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [shareLoading, setShareLoading] = useState(false);
  const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);

  const time = useKosmosTime();
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Filter pages by license modules
  const allowedPages = pages.filter((page) => {
    if (!page.mandatoryType) return true;
    if (page.mandatoryType === 'combustionDl') return isModuleEnabled('combustion_dl');
    if (page.mandatoryType === 'beAgent') return isModuleEnabled('be_agent');
    return true; // overview, kosmosArchitecture always shown
  });

  const activePage = allowedPages.find((p) => p.id === activePageId) ?? allowedPages[0] ?? null;
  const selectedWidget = activePage?.widgets.find((w) => w.id === selectedWidgetId) ?? null;

  /* ── Load on mount ── */
  useEffect(() => {
    if (skipInit) return;
    if (!dashboardId || !applicationId) return;
    dispatch(initKosmosFromBackend({ dashboardId, applicationId }));
  }, [dashboardId, applicationId, dispatch, skipInit]);

  /* ── Auto-switch to allowed page if current is hidden by license ── */
  useEffect(() => {
    if (allowedPages.length === 0) return;
    if (!activePageId || !activePage) {
      if (allowedPages.length > 0) {
        dispatch(setKosmosActivePage(allowedPages[0].id));
      }
    } else if (!allowedPages.find((p) => p.id === activePageId)) {
      dispatch(setKosmosActivePage(allowedPages[0].id));
    }
  }, [allowedPages, activePageId, activePage, dispatch]);

  /* ── Auto-save (debounced 2s) ── */
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initSaveDone = useRef(false);
  const triggerSave = useCallback(() => {
    if (viewOnly) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      dispatch(saveKosmosToBackend({ dashboardId, applicationId }));
    }, 2000);
  }, [dispatch, dashboardId, applicationId, viewOnly]);

  const flushSave = useCallback(() => {
    if (viewOnly) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = null;
    dispatch(saveKosmosToBackend({ dashboardId, applicationId }));
  }, [dispatch, dashboardId, applicationId, viewOnly]);

  /* ── Flush pending save on page unload ── */
  useEffect(() => {
    const handleUnload = () => {
      if (saveTimer.current && !viewOnly) {
        clearTimeout(saveTimer.current);
        dispatch(saveKosmosToBackend({ dashboardId, applicationId }));
      }
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [dispatch, dashboardId, applicationId, viewOnly]);

  /* ── Persist re-seeded pages after initial backend load ── */
  useEffect(() => {
    if (pages.length > 0 && !initSaveDone.current && !skipInit) {
      initSaveDone.current = true;
      triggerSave();
    }
  }, [pages.length, skipInit, triggerSave]);

  /* ── Tab management ── */
  const handleAddPage = () => {
    dispatch(addKosmosPage({ name: `Page ${pages.length + 1}` }));
    triggerSave();
  };

  const handleAddCombustionDlPage = () => {
    dispatch(addCombustionDlPage());
    triggerSave();
  };

  const handleRemovePage = (id: string) => {
    if (pages.length <= 1) {
      toast.error('Cannot remove the last page');
      return;
    }
    dispatch(removeKosmosPage(id));
    triggerSave();
  };

  const handleStartRename = (id: string, currentName: string) => {
    setRenamingId(id);
    setRenameValue(currentName);
    setTimeout(() => renameInputRef.current?.focus(), 50);
  };

  const handleFinishRename = () => {
    if (renamingId && renameValue.trim()) {
      dispatch(renameKosmosPage({ id: renamingId, name: renameValue.trim() }));
      triggerSave();
    }
    setRenamingId(null);
  };

  /* ── Widget management ── */
  const handleDrop = useCallback(
    (widgetType: string) => {
      if (!activePage) return;
      const entry = PALETTE_ENTRIES.find((p) => p.type === widgetType);
      if (!entry) return;

      if (entry.tabScope === 'overview' && activePage.mandatoryType !== 'overview') return;
      if (entry.tabScope === 'combustionDl' && activePage.mandatoryType !== 'combustionDl') return;

      const widget = buildNewWidget(widgetType, activePage.widgets, activePage.mandatoryType);
      dispatch(addKosmosWidget({ pageId: activePage.id, widget }));
      triggerSave();
    },
    [activePage, dispatch, triggerSave]
  );

  const handleRemoveWidget = useCallback(
    (widgetId: string) => {
      if (!activePage) return;
      dispatch(removeKosmosWidget({ pageId: activePage.id, widgetId }));
      setSelectedWidgetId(null);
      triggerSave();
    },
    [activePage, dispatch, triggerSave]
  );

  const handleLayoutChange = useCallback(
    (layouts: Array<{ i: string; x: number; y: number; w: number; h: number }>) => {
      if (!activePage) return;
      layouts.forEach((l) => {
        dispatch(
          updateKosmosWidgetLayout({
            pageId: activePage.id,
            widgetId: l.i,
            layout: { x: l.x, y: l.y, w: l.w, h: l.h },
          })
        );
      });
      triggerSave();
    },
    [activePage, dispatch, triggerSave]
  );

  const handleSelect = useCallback(
    (widgetId: string | null) => {
      setSelectedWidgetId(widgetId);
    },
    []
  );

  /* ── Share (ADR-045: user-based) ── */
  const handleOpenShareModal = () => {
    setShareModalOpen(true);
  };

  const handleSaveSharedUsers = (userIds: string[], pageIds: string[]) => {
    dispatch(setKosmosSharedWithUsers(userIds));
    dispatch(setKosmosSharedPageIds(pageIds));
  };

  /* ── Project (kiosk view) ── */
  const handleProject = () => {
    window.open(`/dashboards/${dashboardId}/view?applicationId=${applicationId}`, '_blank');
  };

  /* ── Render ── */
  return (
    <div
      className="kosmos-root"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div className="kosmos-grid-bg" />
      <div className="kosmos-scanline" />

      {/* ── Header ── */}
      <header className="k-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            className="k-btn k-btn-ghost"
            onClick={() =>
              readOnly
                ? router.push('/viewer')
                : router.push(`/applications/${applicationId}`)
            }
            style={{ marginRight: 8 }}
          >
            ← BACK
          </button>
          <div
            style={{
              width: 36, height: 36, background: 'var(--k-base)', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--k-font-display)', fontSize: 15, fontWeight: 700,
              color: 'white', border: '2px solid var(--k-soft)', flexShrink: 0,
            }}
          >
            3≡
          </div>
          <div>
            <div style={{ fontFamily: 'var(--k-font-display)', fontSize: 18, fontWeight: 700, letterSpacing: 2, color: 'white', lineHeight: 1 }}>
              BRAEBURN ENERGY
            </div>
            <div style={{ fontFamily: 'var(--k-font-tech)', fontSize: 10, color: 'var(--k-green)', letterSpacing: 3, textTransform: 'uppercase' }}>
              BE THE FUTURE
            </div>
          </div>
        </div>

        <div style={{ fontFamily: 'var(--k-font-display)', fontSize: 22, fontWeight: 700, letterSpacing: 4, color: 'var(--k-ultra-light)', textShadow: '0 0 20px rgba(111,170,230,0.5)' }}>
          KOSMOS CORTEX<span style={{ color: 'var(--k-green)' }}>™</span> PLATFORM
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--k-font-tech)', fontSize: 11, color: 'var(--k-text-secondary)' }}>
            <span>
              <span className="k-blink" style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: 'var(--k-green)', boxShadow: '0 0 8px var(--k-green)', marginRight: 5 }} />
              EDGE: ONLINE
            </span>
            <span style={{ color: 'var(--k-pale)' }}>{time}</span>
            <span className="k-blink" style={{ background: 'rgba(0,176,80,0.15)', border: '1px solid var(--k-green)', color: 'var(--k-green)', padding: '2px 10px', borderRadius: 2, fontSize: 10, letterSpacing: 2 }}>
              ● LIVE
            </span>
          </div>

          {!readOnly && (
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                className={editMode ? 'k-btn k-btn-primary' : 'k-btn k-btn-ghost'}
                onClick={() => {
                  const wasEditing = editMode;
                  setEditMode(!editMode);
                  if (wasEditing) {
                    setPaletteOpen(false);
                    setSelectedWidgetId(null);
                    setEditSubMode('layout');
                    flushSave();
                  }
                }}
              >
                {editMode ? 'EDITING' : 'EDIT'}
              </button>

              {editMode && (
                <>
                  <button
                    className={editSubMode === 'layout' ? 'k-btn k-btn-primary' : 'k-btn k-btn-ghost'}
                    title="Layout mode — drag and resize widgets"
                    onClick={() => {
                      setEditSubMode('layout');
                      setSelectedWidgetId(null);
                    }}
                  >
                    ⇄ LAYOUT
                  </button>
                  <button
                    className={editSubMode === 'config' ? 'k-btn k-btn-primary' : 'k-btn k-btn-ghost'}
                    title="Config mode — click a widget to configure it"
                    onClick={() => {
                      setEditSubMode('config');
                      setPaletteOpen(false);
                    }}
                  >
                    ⚙ CONFIG
                  </button>
                </>
              )}

              {editMode && editSubMode === 'layout' && (
                <button className="k-btn k-btn-ghost" onClick={() => setPaletteOpen(!paletteOpen)}>
                  {paletteOpen ? 'HIDE PALETTE' : 'WIDGETS'}
                </button>
              )}

              {editMode && activePage?.isMandatory && (
                <button
                  className="k-btn k-btn-ghost"
                  onClick={() => {
                    if (window.confirm('Reset this page to defaults? All widget configurations will be cleared.')) {
                      dispatch(resetActiveMandatoryPage());
                      setSelectedWidgetId(null);
                      flushSave();
                    }
                  }}
                >
                  ↻ RESET PAGE
                </button>
              )}

              <button className="k-btn k-btn-ghost" onClick={handleProject}>
                ⬡ PROJECT
              </button>

              <button
                className="k-btn k-btn-ghost"
                onClick={handleOpenShareModal}
                disabled={shareLoading}
              >
                👥 SHARE
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ── Tab strip ── */}
      <div className="k-nav-tabs">
        {allowedPages.map((page) => (
          <div
            key={page.id}
            className={`k-nav-tab ${page.id === activePageId ? 'active' : ''}`}
            onClick={() => dispatch(setKosmosActivePage(page.id))}
            onDoubleClick={() => editMode && !readOnly && !page.isMandatory && handleStartRename(page.id, page.name)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, paddingRight: editMode && !readOnly ? 8 : 18 }}
          >
            {renamingId === page.id && !readOnly && !page.isMandatory ? (
              <input
                ref={renameInputRef}
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={handleFinishRename}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleFinishRename();
                  if (e.key === 'Escape') setRenamingId(null);
                }}
                style={{
                  background: 'transparent', border: 'none', borderBottom: '1px solid var(--k-green)',
                  color: 'white', fontFamily: 'var(--k-font-display)', fontSize: 13, fontWeight: 600,
                  letterSpacing: 1.5, outline: 'none', width: Math.max(60, renameValue.length * 9),
                }}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span>{page.mandatoryType ? `${TAB_ICON[page.mandatoryType] ?? ''} ${page.name}` : page.name}</span>
            )}
            {editMode && !readOnly && pages.length > 1 && !page.isMandatory && (
              <span
                onClick={(e) => { e.stopPropagation(); handleRemovePage(page.id); }}
                style={{ color: 'var(--k-text-dim)', fontSize: 11, lineHeight: 1, cursor: 'pointer', marginLeft: 2 }}
              >
                ×
              </span>
            )}
          </div>
        ))}

        {editMode && !readOnly && pages.length > allowedPages.length && (
          <div style={{ marginLeft: 8, fontFamily: 'var(--k-font-tech)', fontSize: 9, color: 'var(--k-text-dim)', display: 'flex', alignItems: 'center' }}>
            {pages.length - allowedPages.length} hidden by license
          </div>
        )}

        {editMode && !readOnly && (
          <button
            onClick={handleAddPage}
            style={{
              padding: '6px 12px', background: 'none', border: '1px dashed var(--k-border)',
              borderBottom: 'none', borderRadius: '4px 4px 0 0', color: 'var(--k-text-dim)',
              cursor: 'pointer', fontFamily: 'var(--k-font-tech)', fontSize: 14, lineHeight: 1,
              transition: 'all 0.2s', alignSelf: 'flex-end',
            }}
          >
            +
          </button>
        )}
        {editMode && !readOnly && isModuleEnabled('combustion_dl') && (
          <button
            onClick={handleAddCombustionDlPage}
            title="Add Combustion DL Tab"
            style={{
              padding: '6px 12px', background: 'none', border: '1px dashed var(--k-border)',
              borderBottom: 'none', borderRadius: '4px 4px 0 0', color: 'var(--k-text-dim)',
              cursor: 'pointer', fontFamily: 'var(--k-font-tech)', fontSize: 12, lineHeight: 1,
              transition: 'all 0.2s', alignSelf: 'flex-end', marginLeft: 4,
            }}
          >
            ◑+
          </button>
        )}
      </div>

      {/* ── Body: Canvas + optional WidgetConfigPanel ── */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'row',
          overflow: 'hidden',
          position: 'relative',
          zIndex: 5,
          marginLeft: paletteOpen ? 200 : 0,
          transition: 'margin-left 0.25s ease',
        }}
      >
        {activePage ? (
          <>
            {/* Render canvas based on page type */}
            {activePage.mandatoryType === 'overview' ? (
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <KosmosOverviewTabPanel
                  page={activePage}
                  editMode={editMode}
                  layoutLocked={editMode && editSubMode === 'config'}
                  onDrop={handleDrop}
                  onLayoutChange={(pageId, layouts) => {
                    layouts.forEach((layout) => {
                      dispatch(
                        updateKosmosWidgetLayout({
                          pageId,
                          widgetId: layout.i,
                          layout: { x: layout.x, y: layout.y, w: layout.w, h: layout.h },
                        })
                      );
                    });
                    triggerSave();
                  }}
                  onRemoveWidget={handleRemoveWidget}
                  onConfigChange={() => triggerSave()}
                  onSelect={handleSelect}
                  selectedWidgetId={selectedWidgetId}
                />
              </div>
            ) : activePage.mandatoryType === 'combustionDl' ? (
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <KosmosCombustionDlTabPanel
                  page={activePage}
                  editMode={editMode}
                  layoutLocked={editMode && editSubMode === 'config'}
                  onDrop={handleDrop}
                  onLayoutChange={(pageId, layouts) => {
                    layouts.forEach((layout) => {
                      dispatch(
                        updateKosmosWidgetLayout({
                          pageId,
                          widgetId: layout.i,
                          layout: { x: layout.x, y: layout.y, w: layout.w, h: layout.h },
                        })
                      );
                    });
                    triggerSave();
                  }}
                  onRemoveWidget={handleRemoveWidget}
                  onConfigChange={() => triggerSave()}
                  onSelect={handleSelect}
                  selectedWidgetId={selectedWidgetId}
                />
              </div>
            ) : activePage.mandatoryType === 'kosmosArchitecture' ? (
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <KosmosArchitectureTabPanel
                  page={activePage}
                  editMode={editMode}
                  onConfigChange={() => {
                    triggerSave();
                  }}
                />
              </div>
            ) : activePage.mandatoryType === 'beAgent' ? (
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <KosmosBeAgentTabPanel page={activePage} editMode={editMode} onConfigChange={() => triggerSave()} />
              </div>
            ) : (
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <UnifiedCanvas
                  widgets={activePage.widgets}
                  editMode={editMode}
                  layoutLocked={editMode && editSubMode === 'config'}
                  onDrop={handleDrop}
                  onRemove={handleRemoveWidget}
                  onLayoutChange={handleLayoutChange}
                  onSelect={handleSelect}
                  selectedWidgetId={selectedWidgetId}
                />
              </div>
            )}

            {/* Config panel — only in CONFIG sub-mode when a widget is selected */}
            {editMode && editSubMode === 'config' && selectedWidget && (
              <WidgetConfigPanel
                pageId={activePage.id}
                widget={selectedWidget}
                applicationId={applicationId}
                onClose={() => setSelectedWidgetId(null)}
                onConfigChange={() => triggerSave()}
              />
            )}
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontFamily: 'var(--k-font-display)', fontSize: 18, color: 'var(--k-text-dim)', letterSpacing: 3 }}>
              NO PAGES
            </div>
            {!viewOnly && (
              <button className="k-btn k-btn-primary" onClick={handleAddPage}>
                + ADD PAGE
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <footer className="k-footer">
        <span>
          <span style={{ color: 'var(--k-green)', fontWeight: 700, letterSpacing: 1 }}>
            KOSMOS CORTEX<span style={{ color: 'var(--k-base)' }}>™</span>
          </span>
          {' '}— Braeburn Energy Platform
        </span>
        <span style={{ display: 'flex', gap: 16 }}>
          {editMode && <span style={{ color: 'var(--k-amber)' }}>● EDIT MODE</span>}
          {sharedWithUsers.length > 0 && (
            <span style={{ color: 'var(--k-green)' }}>
              👥 SHARED ({sharedWithUsers.length})
              {sharedPageIds.length > 0 && sharedPageIds.length < allowedPages.length
                ? ` — ${sharedPageIds.length} tab${sharedPageIds.length !== 1 ? 's' : ''}`
                : ''}
            </span>
          )}
          <span>{allowedPages.length} PAGE{allowedPages.length !== 1 ? 'S' : ''}{pages.length > allowedPages.length ? ` (${pages.length - allowedPages.length} hidden)` : ''}</span>
        </span>
      </footer>

      {/* ── Widget palette overlay ── */}
      {paletteOpen && !readOnly && (
        <WidgetPalette
          onClose={() => setPaletteOpen(false)}
          activeMandatoryType={activePage?.mandatoryType}
        />
      )}

      {/* ── Share Users Modal (ADR-045) ── */}
      {shareModalOpen && (
        <ShareUsersModal
          dashboardId={dashboardId}
          currentSharedUsers={sharedWithUsers}
          currentSharedPageIds={sharedPageIds}
          availablePages={allowedPages}
          onClose={() => setShareModalOpen(false)}
          onSaved={handleSaveSharedUsers}
        />
      )}
    </div>
  );
}
