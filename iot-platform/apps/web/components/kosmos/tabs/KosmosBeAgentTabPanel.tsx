'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useAppDispatch } from '@/lib/store';
import { updateKosmosWidgetConfig } from '@/lib/store/slices/dashboardSlice';
import { useLicense } from '@/lib/hooks/useLicense';
import { useBeAgentChat } from '@/lib/hooks/useBeAgentChat';
import type {
  KosmosPage,
  BeAgentTabConfig,
  BeAgentModule,
  BeAgentStatusRow,
  BeAgentFleetMetric,
  BeAgentAction,
} from '../types';

/* ── helpers ── */
function shortId() { return Math.random().toString(36).slice(2, 10); }

interface ChatMsg {
  id: string;
  kind: 'system' | 'agent' | 'user-q' | 'typing';
  label: string;
  text: string;
}

const TAG_STYLES: Record<string, React.CSSProperties> = {
  green: {
    background: 'rgba(0,176,80,0.15)',
    border: '1px solid var(--k-green)',
    color: 'var(--k-green)',
  },
  amber: {
    background: 'rgba(255,184,0,0.1)',
    border: '1px solid var(--k-amber)',
    color: 'var(--k-amber)',
  },
  blue: {
    background: 'rgba(21,96,189,0.2)',
    border: '1px solid var(--k-border-bright)',
    color: 'var(--k-soft)',
  },
  red: {
    background: 'rgba(220,50,50,0.15)',
    border: '1px solid rgba(220,50,50,0.6)',
    color: '#ff6060',
  },
};

const LEVEL_BORDER: Record<string, string> = {
  ok: 'var(--k-green)',
  info: 'var(--k-soft)',
  warn: 'var(--k-amber)',
};

function Tag({ type, value }: { type: string; value: string }) {
  const s = TAG_STYLES[type] ?? TAG_STYLES.blue;
  return (
    <span
      style={{
        ...s,
        padding: '2px 7px',
        borderRadius: 2,
        fontFamily: 'var(--k-font-tech)',
        fontSize: 9,
        letterSpacing: 1,
        whiteSpace: 'nowrap',
      }}
    >
      {value}
    </span>
  );
}

interface Props {
  page: KosmosPage;
  editMode: boolean;
  onConfigChange?: () => void;
}

export function KosmosBeAgentTabPanel({ page, editMode, onConfigChange }: Props) {
  const dispatch = useAppDispatch();
  const { isModuleEnabled } = useLicense();
  const { sendMessage, isStreaming, tokens, error, clearChat } = useBeAgentChat();

  /* ── Find widget & config ── */
  const widget = page.widgets.find((w) => w.type === 'beAgentTabConfig');
  const cfg = (widget?.config ?? {}) as BeAgentTabConfig;

  const modules: BeAgentModule[] = cfg.modules ?? [];
  const platformStatus: BeAgentStatusRow[] = cfg.platformStatus ?? [];
  const fleetOverview: BeAgentFleetMetric[] = cfg.fleetOverview ?? [];
  const recentActions: BeAgentAction[] = cfg.recentActions ?? [];
  const deviceId = (cfg.deviceId as string) || undefined;

  /* ── Persist helper ── */
  const persist = useCallback(
    (partial: Partial<BeAgentTabConfig>) => {
      if (!widget) return;
      dispatch(
        updateKosmosWidgetConfig({
          pageId: page.id,
          widgetId: widget.id,
          config: { ...cfg, ...partial },
        })
      );
      onConfigChange?.();
    },
    [widget, dispatch, page.id, cfg, onConfigChange]
  );

  /* ── Selected module ── */
  const [selectedIdx, setSelectedIdx] = useState(0);
  const selMod = modules[selectedIdx] ?? modules[0];

  /* ── Chat ── */
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      id: shortId(),
      kind: 'system',
      label: 'SYSTEM',
      text: 'BE Agent™ online. Kosmos platform active. All sensor streams nominal.',
    },
    {
      id: shortId(),
      kind: 'agent',
      label: 'BE AGENT',
      text: 'Combustion dynamics module running. Current anomaly score: 0.14 — nominal. CD pressure showing stable DLE operation at 84% load. Fuel H₂ fraction 3.2% — CalorieSense™ adapted.',
    },
    {
      id: shortId(),
      kind: 'user-q',
      label: 'OPERATOR',
      text: 'What is the risk of lean blowout given current fuel quality?',
    },
    {
      id: shortId(),
      kind: 'agent',
      label: 'BE AGENT',
      text: 'Lean blowout risk is currently LOW (9% classifier probability). H₂ fraction at 3.2% provides additional flame stability margin vs. pure methane. DFT dominant frequency 186 Hz is within normal DLE range. Hurst exponent 0.63 indicates persistent, stable combustion dynamics. No precursor signatures present. Recommend monitoring VIB-X bearing channel — mildly elevated at 2.1 mm/s.',
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [currentAgentMsgId, setCurrentAgentMsgId] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  // Handle incoming tokens from hook
  useEffect(() => {
    if (tokens.length === 0 || !currentAgentMsgId) return;
    const fullText = tokens.join('');
    setMessages((prev) =>
      prev.map((m) =>
        m.id === currentAgentMsgId ? { ...m, text: fullText } : m
      )
    );
  }, [tokens, currentAgentMsgId]);

  // When streaming stops, clear the current message ID
  useEffect(() => {
    if (!isStreaming && currentAgentMsgId) {
      setCurrentAgentMsgId(null);
    }
  }, [isStreaming, currentAgentMsgId]);

  const sendChat = useCallback(() => {
    const txt = chatInput.trim();
    if (!txt || isStreaming || !isModuleEnabled('be_agent')) return;

    setChatInput('');
    const msgId = shortId();
    setMessages((prev) => [
      ...prev,
      { id: shortId(), kind: 'user-q', label: 'OPERATOR', text: txt },
    ]);

    // Start agent message
    const agentMsgId = shortId();
    setCurrentAgentMsgId(agentMsgId);
    setMessages((prev) => [
      ...prev,
      { id: agentMsgId, kind: 'agent', label: 'BE AGENT™', text: '' },
    ]);

    // Send to backend (fire-and-forget, streaming via Socket.io)
    sendMessage(txt, deviceId);
  }, [chatInput, isStreaming, isModuleEnabled, sendMessage, deviceId]);

  /* ── Edit states ── */
  const [editingModIdx, setEditingModIdx] = useState<number | null>(null);
  const [editModBuf, setEditModBuf] = useState<BeAgentModule | null>(null);
  const [editingDetailDesc, setEditingDetailDesc] = useState(false);
  const [detailDescBuf, setDetailDescBuf] = useState('');

  useEffect(() => { setEditingDetailDesc(false); }, [selectedIdx]);

  /* ── Card style ── */
  const cardStyle: React.CSSProperties = {
    background: 'var(--k-bg-card)',
    border: '1px solid var(--k-border)',
    borderRadius: 4,
    overflow: 'hidden',
    flexShrink: 0,
  };

  function CardHeader({ icon, title, badge }: { icon?: string; title: string; badge?: React.ReactNode }) {
    return (
      <>
        <div style={{ height: 2, background: 'linear-gradient(90deg, transparent, var(--k-base), transparent)' }} />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '10px 14px 8px',
            borderBottom: '1px solid var(--k-border)',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--k-font-display)',
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: 2,
              color: 'var(--k-soft)',
            }}
          >
            {icon} {title}
          </span>
          {badge}
        </div>
      </>
    );
  }

  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        display: 'grid',
        gridTemplateColumns: '320px 1fr 320px',
        gap: 12,
        height: '100%',
        padding: 16,
        overflow: 'hidden',
      }}
    >
      {/* ═══════════════════════════════════════
          LEFT: Module Roster
      ════════════════════════════════════════ */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0, overflow: 'auto', ...cardStyle }}>
        {/* accent */}
        <div style={{ height: 2, background: 'linear-gradient(90deg, transparent, var(--k-base), transparent)', flexShrink: 0 }} />

        {/* header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '10px 14px 8px',
            borderBottom: '1px solid var(--k-border)',
            flexShrink: 0,
          }}
        >
          <span style={{ fontFamily: 'var(--k-font-display)', fontSize: 12, fontWeight: 600, letterSpacing: 2, color: 'var(--k-soft)' }}>
            ⟳ BE AGENT™ MODULES
          </span>
          <span
            style={{
              fontSize: 9,
              background: 'rgba(21,96,189,0.2)',
              border: '1px solid var(--k-border-bright)',
              color: 'var(--k-soft)',
              padding: '2px 6px',
              borderRadius: 2,
              fontFamily: 'var(--k-font-tech)',
              letterSpacing: 1,
            }}
          >
            v2.1
          </span>
        </div>

        {/* module rows */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {modules.map((mod, idx) => {
            const isSelected = idx === selectedIdx;
            const isActive = mod.status === 'ACTIVE';

            if (editMode && editingModIdx === idx && editModBuf) {
              return (
                <div
                  key={mod.id}
                  style={{
                    background: 'rgba(6,15,30,0.9)',
                    border: '1px solid var(--k-border-bright)',
                    borderRadius: '0 3px 3px 0',
                    borderLeft: `3px solid var(--k-amber)`,
                    padding: '8px 10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                  }}
                >
                  <input
                    value={editModBuf.name}
                    onChange={(e) => setEditModBuf({ ...editModBuf, name: e.target.value })}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      borderBottom: '1px solid var(--k-border-bright)',
                      color: 'var(--k-pale)',
                      fontFamily: 'var(--k-font-display)',
                      fontSize: 12,
                      outline: 'none',
                      width: '100%',
                    }}
                    placeholder="Module name"
                  />
                  <input
                    value={editModBuf.desc}
                    onChange={(e) => setEditModBuf({ ...editModBuf, desc: e.target.value })}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      borderBottom: '1px solid var(--k-border)',
                      color: 'var(--k-text-dim)',
                      fontFamily: 'var(--k-font-main)',
                      fontSize: 11,
                      outline: 'none',
                      width: '100%',
                    }}
                    placeholder="Description"
                  />
                  <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                    <button
                      onClick={() => {
                        const next = [...modules];
                        next[idx] = { ...editModBuf, status: editModBuf.status === 'ACTIVE' ? 'IDLE' : 'ACTIVE' };
                        setEditModBuf(next[idx]);
                      }}
                      style={{
                        background: editModBuf.status === 'ACTIVE' ? 'rgba(0,176,80,0.2)' : 'rgba(60,60,80,0.3)',
                        border: `1px solid ${editModBuf.status === 'ACTIVE' ? 'var(--k-green)' : 'var(--k-border)'}`,
                        color: editModBuf.status === 'ACTIVE' ? 'var(--k-green)' : 'var(--k-text-dim)',
                        padding: '2px 6px',
                        borderRadius: 2,
                        fontSize: 9,
                        cursor: 'pointer',
                        fontFamily: 'var(--k-font-tech)',
                        letterSpacing: 1,
                      }}
                    >
                      {editModBuf.status}
                    </button>
                    <button
                      onClick={() => {
                        const next = [...modules];
                        next[idx] = editModBuf;
                        persist({ modules: next });
                        setEditingModIdx(null);
                        setEditModBuf(null);
                      }}
                      style={{
                        background: 'rgba(0,176,80,0.2)',
                        border: '1px solid var(--k-green)',
                        color: 'var(--k-green)',
                        padding: '2px 8px',
                        borderRadius: 2,
                        fontSize: 9,
                        cursor: 'pointer',
                        fontFamily: 'var(--k-font-tech)',
                        letterSpacing: 1,
                      }}
                    >
                      SAVE
                    </button>
                    <button
                      onClick={() => { setEditingModIdx(null); setEditModBuf(null); }}
                      style={{
                        background: 'transparent',
                        border: '1px solid var(--k-border)',
                        color: 'var(--k-text-dim)',
                        padding: '2px 6px',
                        borderRadius: 2,
                        fontSize: 9,
                        cursor: 'pointer',
                        fontFamily: 'var(--k-font-tech)',
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={mod.id}
                onClick={() => setSelectedIdx(idx)}
                onDoubleClick={() => {
                  if (editMode) {
                    setEditingModIdx(idx);
                    setEditModBuf({ ...mod });
                  }
                }}
                style={{
                  position: 'relative',
                  background: isSelected ? 'rgba(21,96,189,0.1)' : 'rgba(6,15,30,0.7)',
                  border: '1px solid var(--k-border)',
                  borderLeft: `3px solid ${isActive ? 'var(--k-green)' : 'var(--k-base)'}`,
                  borderRadius: '0 3px 3px 0',
                  padding: '8px 40px 8px 10px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  userSelect: 'none',
                }}
              >
                <div
                  style={{
                    fontFamily: 'var(--k-font-display)',
                    fontSize: 13,
                    fontWeight: 600,
                    letterSpacing: 1,
                    color: 'var(--k-pale)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {mod.name}
                </div>
                <div
                  style={{
                    fontFamily: 'var(--k-font-main)',
                    fontSize: 11,
                    color: 'var(--k-text-dim)',
                    marginTop: 2,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {mod.desc}
                </div>
                <span
                  style={{
                    position: 'absolute',
                    right: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontFamily: 'var(--k-font-tech)',
                    fontSize: 10,
                    letterSpacing: 1,
                    color: isActive ? 'var(--k-green)' : 'var(--k-mid)',
                  }}
                >
                  {isActive ? '● ACTIVE' : '○ IDLE'}
                </span>
              </div>
            );
          })}

          {/* Add module button (edit mode) */}
          {editMode && (
            <button
              onClick={() => {
                const newMod: BeAgentModule = {
                  id: shortId(),
                  name: 'New Module',
                  desc: 'Description',
                  status: 'IDLE',
                  detailDesc: 'Module description.',
                  metrics: [
                    { label: 'METRIC 1', value: '—', color: 'var(--k-soft)' },
                    { label: 'METRIC 2', value: '—', color: 'var(--k-soft)' },
                    { label: 'METRIC 3', value: '—', color: 'var(--k-soft)' },
                  ],
                };
                persist({ modules: [...modules, newMod] });
              }}
              style={{
                background: 'transparent',
                border: '1px dashed var(--k-border)',
                color: 'var(--k-text-dim)',
                padding: '6px',
                borderRadius: 3,
                cursor: 'pointer',
                fontFamily: 'var(--k-font-tech)',
                fontSize: 10,
                letterSpacing: 1,
                textAlign: 'center',
                width: '100%',
              }}
            >
              + ADD MODULE
            </button>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════
          CENTER: Detail + Chat
      ════════════════════════════════════════ */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, overflow: 'hidden', minWidth: 0 }}>
        {/* Module Detail Card */}
        {selMod && (
          <div style={{ ...cardStyle, flexShrink: 0 }}>
            <div style={{ height: 2, background: 'linear-gradient(90deg, transparent, var(--k-green), transparent)' }} />
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 14px 8px',
                borderBottom: '1px solid var(--k-border)',
              }}
            >
              <span style={{ fontFamily: 'var(--k-font-display)', fontSize: 13, fontWeight: 600, letterSpacing: 2, color: 'var(--k-soft)' }}>
                ◈ {selMod.name.toUpperCase()}
              </span>
              <Tag type={selMod.status === 'ACTIVE' ? 'green' : 'amber'} value={selMod.status} />
            </div>
            <div style={{ padding: '12px 14px' }}>
              {editMode && editingDetailDesc ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                  <textarea
                    value={detailDescBuf}
                    onChange={(e) => setDetailDescBuf(e.target.value)}
                    rows={4}
                    autoFocus
                    style={{
                      background: 'var(--k-bg-card)',
                      border: '1px solid var(--k-border)',
                      color: 'var(--k-text-secondary)',
                      fontFamily: 'var(--k-font-main)',
                      fontSize: 13,
                      borderRadius: 2,
                      padding: 6,
                      resize: 'vertical',
                      outline: 'none',
                      width: '100%',
                      lineHeight: 1.6,
                    }}
                  />
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => {
                        const next = modules.map((m, i) => i === selectedIdx ? { ...m, detailDesc: detailDescBuf } : m);
                        persist({ modules: next });
                        setEditingDetailDesc(false);
                      }}
                      style={{
                        background: 'rgba(0,176,80,0.2)',
                        border: '1px solid var(--k-green)',
                        color: 'var(--k-green)',
                        padding: '2px 10px',
                        borderRadius: 2,
                        fontSize: 9,
                        cursor: 'pointer',
                        fontFamily: 'var(--k-font-tech)',
                        letterSpacing: 1,
                      }}
                    >
                      SAVE
                    </button>
                    <button
                      onClick={() => setEditingDetailDesc(false)}
                      style={{
                        background: 'transparent',
                        border: '1px solid var(--k-border)',
                        color: 'var(--k-text-dim)',
                        padding: '2px 8px',
                        borderRadius: 2,
                        fontSize: 9,
                        cursor: 'pointer',
                        fontFamily: 'var(--k-font-tech)',
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ) : (
                <p
                  style={{
                    fontFamily: 'var(--k-font-main)',
                    fontSize: 13,
                    color: 'var(--k-text-secondary)',
                    lineHeight: 1.6,
                    margin: 0,
                    marginBottom: 12,
                    cursor: editMode ? 'pointer' : 'default',
                  }}
                  title={editMode ? 'Click to edit description' : undefined}
                  onClick={() => {
                    if (editMode) {
                      setDetailDescBuf(selMod.detailDesc ?? '');
                      setEditingDetailDesc(true);
                    }
                  }}
                >
                  {selMod.detailDesc}
                </p>
              )}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Tag type="green" value="BRAEBURN ENERGY" />
                <Tag type="blue" value="OEM-AGNOSTIC" />
                <Tag type="blue" value="KOSMOS CORTEX™" />
              </div>
            </div>
          </div>
        )}

        {/* Chat Card */}
        <div
          style={{
            ...cardStyle,
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            overflow: 'hidden',
          }}
        >
          <div style={{ height: 2, background: 'linear-gradient(90deg, transparent, var(--k-base), transparent)', flexShrink: 0 }} />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px 14px 8px',
              borderBottom: '1px solid var(--k-border)',
              flexShrink: 0,
            }}
          >
            <span style={{ fontFamily: 'var(--k-font-display)', fontSize: 12, fontWeight: 600, letterSpacing: 2, color: 'var(--k-soft)' }}>
              ⟳ BE AGENT™ — NATURAL LANGUAGE INTERFACE
            </span>
            <Tag type="green" value="ONLINE" />
          </div>

          {/* Messages area */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: 10,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              background: 'rgba(6,15,30,0.5)',
            }}
          >
            {messages.map((msg) => {
              const isUser = msg.kind === 'user-q';
              const borderStyle =
                msg.kind === 'system'
                  ? '2px solid var(--k-mid)'
                  : msg.kind === 'agent'
                  ? '2px solid var(--k-green)'
                  : '2px solid var(--k-base)';
              const bgStyle =
                msg.kind === 'system'
                  ? 'rgba(13,60,122,0.3)'
                  : msg.kind === 'agent'
                  ? 'rgba(0,176,80,0.1)'
                  : 'rgba(21,96,189,0.15)';

              return (
                <div
                  key={msg.id}
                  style={{
                    alignSelf: isUser ? 'flex-end' : 'flex-start',
                    maxWidth: '85%',
                    background: bgStyle,
                    borderLeft: isUser ? undefined : borderStyle,
                    borderRight: isUser ? borderStyle : undefined,
                    padding: '7px 10px',
                    borderRadius: 3,
                  }}
                >
                  <div
                    style={{
                      fontFamily: 'var(--k-font-tech)',
                      fontSize: 9,
                      letterSpacing: 1,
                      opacity: 0.7,
                      marginBottom: 4,
                      color:
                        msg.kind === 'agent'
                          ? 'var(--k-green)'
                          : msg.kind === 'user-q'
                          ? 'var(--k-soft)'
                          : 'var(--k-mid)',
                    }}
                  >
                    {msg.label}
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--k-font-main)',
                      fontSize: 12,
                      color: 'var(--k-text-primary)',
                      lineHeight: 1.5,
                    }}
                  >
                    {msg.text}
                  </div>
                </div>
              );
            })}

            {/* Error message */}
            {error && (
              <div
                style={{
                  alignSelf: 'flex-start',
                  background: 'rgba(220,50,50,0.15)',
                  borderLeft: '2px solid #ff6060',
                  padding: '10px 14px',
                  borderRadius: 3,
                  color: '#ff6060',
                  fontSize: 12,
                  fontFamily: 'var(--k-font-tech)',
                }}
              >
                {error}
              </div>
            )}

            {/* Typing indicator */}
            {isStreaming && (
              <div
                style={{
                  alignSelf: 'flex-start',
                  background: 'rgba(0,176,80,0.1)',
                  borderLeft: '2px solid var(--k-green)',
                  padding: '10px 14px',
                  borderRadius: 3,
                  display: 'flex',
                  gap: 4,
                  alignItems: 'center',
                }}
              >
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    style={{
                      width: 4,
                      height: 4,
                      borderRadius: '50%',
                      background: 'var(--k-green)',
                      display: 'inline-block',
                      animation: `beAgentDot 1.2s ease-in-out ${i * 0.2}s infinite`,
                    }}
                  />
                ))}
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input row */}
          <div
            style={{
              padding: '8px 10px',
              borderTop: '1px solid var(--k-border)',
              display: 'flex',
              gap: 6,
              flexShrink: 0,
            }}
          >
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') sendChat(); }}
              placeholder={isModuleEnabled('be_agent') ? 'Query BE Agent™...' : 'BE Agent not enabled'}
              disabled={!isModuleEnabled('be_agent')}
              style={{
                flex: 1,
                background: 'rgba(6,15,30,0.8)',
                border: '1px solid var(--k-border)',
                borderRadius: 3,
                padding: '7px 10px',
                color: 'var(--k-text-primary)',
                fontFamily: 'var(--k-font-main)',
                fontSize: 12,
                outline: 'none',
                opacity: !isModuleEnabled('be_agent') ? 0.5 : 1,
              }}
            />
            <button
              onClick={sendChat}
              disabled={isStreaming || !chatInput.trim() || !isModuleEnabled('be_agent')}
              style={{
                background: (isStreaming || !isModuleEnabled('be_agent')) ? 'rgba(21,96,189,0.3)' : 'var(--k-base)',
                border: 'none',
                borderRadius: 3,
                padding: '7px 14px',
                color: 'white',
                fontFamily: 'var(--k-font-tech)',
                fontSize: 10,
                letterSpacing: 1,
                cursor: (isStreaming || !isModuleEnabled('be_agent')) ? 'default' : 'pointer',
                transition: 'background 0.15s',
              }}
            >
              ▶ ASK
            </button>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════
          RIGHT: Status + Fleet + Actions
      ════════════════════════════════════════ */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, overflow: 'auto', height: '100%' }}>
        {/* Platform Status Card */}
        <div style={{ ...cardStyle }}>
          <CardHeader icon="▣" title="PLATFORM STATUS" />
          <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {platformStatus.map((row, i) => (
              <div
                key={row.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '4px 0',
                }}
              >
                {editMode ? (
                  <input
                    value={row.label}
                    onChange={(e) => {
                      const next = platformStatus.map((r, ri) => ri === i ? { ...r, label: e.target.value } : r);
                      persist({ platformStatus: next });
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      borderBottom: '1px solid var(--k-border)',
                      color: 'var(--k-text-dim)',
                      fontFamily: 'var(--k-font-tech)',
                      fontSize: 10,
                      letterSpacing: 1,
                      outline: 'none',
                      width: '50%',
                    }}
                  />
                ) : (
                  <span
                    style={{
                      fontFamily: 'var(--k-font-tech)',
                      fontSize: 10,
                      color: 'var(--k-text-dim)',
                      letterSpacing: 1,
                    }}
                  >
                    {row.label}
                  </span>
                )}
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  {editMode ? (
                    <>
                      <input
                        value={row.value}
                        onChange={(e) => {
                          const next = platformStatus.map((r, ri) => ri === i ? { ...r, value: e.target.value } : r);
                          persist({ platformStatus: next });
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          borderBottom: '1px solid var(--k-border)',
                          color: 'var(--k-text-primary)',
                          fontFamily: 'var(--k-font-tech)',
                          fontSize: 9,
                          letterSpacing: 1,
                          outline: 'none',
                          width: 60,
                          textAlign: 'right',
                        }}
                      />
                      <select
                        value={row.tagType}
                        onChange={(e) => {
                          const next = platformStatus.map((r, ri) => ri === i ? { ...r, tagType: e.target.value as any } : r);
                          persist({ platformStatus: next });
                        }}
                        style={{
                          background: 'var(--k-bg-card)',
                          border: '1px solid var(--k-border)',
                          color: 'var(--k-text-dim)',
                          fontSize: 9,
                          borderRadius: 2,
                          padding: '1px 2px',
                          cursor: 'pointer',
                        }}
                      >
                        <option value="green">green</option>
                        <option value="amber">amber</option>
                        <option value="blue">blue</option>
                        <option value="red">red</option>
                      </select>
                    </>
                  ) : (
                    <Tag type={row.tagType} value={row.value} />
                  )}
                </div>
              </div>
            ))}
            {editMode && (
              <button
                onClick={() => {
                  persist({
                    platformStatus: [
                      ...platformStatus,
                      { id: shortId(), label: 'NEW ROW', value: 'VALUE', tagType: 'blue' },
                    ],
                  });
                }}
                style={{
                  background: 'transparent',
                  border: '1px dashed var(--k-border)',
                  color: 'var(--k-text-dim)',
                  padding: '4px',
                  borderRadius: 2,
                  cursor: 'pointer',
                  fontFamily: 'var(--k-font-tech)',
                  fontSize: 9,
                  letterSpacing: 1,
                  marginTop: 4,
                }}
              >
                + ADD ROW
              </button>
            )}
          </div>
        </div>

        {/* Fleet Overview Card */}
        <div style={{ ...cardStyle }}>
          <CardHeader icon="◆" title="FLEET OVERVIEW" />
          <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {fleetOverview.map((item, i) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '4px 0',
                }}
              >
                {editMode ? (
                  <>
                    <input
                      value={item.label}
                      onChange={(e) => {
                        const next = fleetOverview.map((r, ri) => ri === i ? { ...r, label: e.target.value } : r);
                        persist({ fleetOverview: next });
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        borderBottom: '1px solid var(--k-border)',
                        color: 'var(--k-text-dim)',
                        fontFamily: 'var(--k-font-tech)',
                        fontSize: 10,
                        letterSpacing: 1,
                        outline: 'none',
                        width: '45%',
                      }}
                    />
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      <input
                        value={item.value}
                        onChange={(e) => {
                          const next = fleetOverview.map((r, ri) => ri === i ? { ...r, value: e.target.value } : r);
                          persist({ fleetOverview: next });
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          borderBottom: '1px solid var(--k-border)',
                          color: item.color,
                          fontFamily: 'var(--k-font-display)',
                          fontSize: 14,
                          outline: 'none',
                          width: 70,
                          textAlign: 'right',
                        }}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <span
                      style={{
                        fontFamily: 'var(--k-font-tech)',
                        fontSize: 10,
                        color: 'var(--k-text-dim)',
                        letterSpacing: 1,
                      }}
                    >
                      {item.label}
                    </span>
                    <span
                      style={{
                        fontFamily: 'var(--k-font-tech)',
                        fontSize: 11,
                        color: item.color,
                      }}
                    >
                      {item.value}
                    </span>
                  </>
                )}
              </div>
            ))}
            {editMode && (
              <button
                onClick={() => {
                  persist({
                    fleetOverview: [
                      ...fleetOverview,
                      { id: shortId(), label: 'NEW METRIC', value: '—', color: 'var(--k-soft)' },
                    ],
                  });
                }}
                style={{
                  background: 'transparent',
                  border: '1px dashed var(--k-border)',
                  color: 'var(--k-text-dim)',
                  padding: '4px',
                  borderRadius: 2,
                  cursor: 'pointer',
                  fontFamily: 'var(--k-font-tech)',
                  fontSize: 9,
                  letterSpacing: 1,
                  marginTop: 4,
                }}
              >
                + ADD METRIC
              </button>
            )}
          </div>
        </div>

        {/* Recent Agent Actions Card */}
        <div style={{ ...cardStyle, flex: 1 }}>
          <CardHeader icon="◈" title="RECENT AGENT ACTIONS" />
          <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {recentActions.map((action, i) => (
              <div
                key={action.id}
                style={{
                  padding: '6px 8px',
                  borderLeft: `3px solid ${LEVEL_BORDER[action.level] ?? 'var(--k-border)'}`,
                  background: 'rgba(6,15,30,0.5)',
                  borderRadius: '0 3px 3px 0',
                }}
              >
                {editMode ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      <input
                        value={action.time}
                        onChange={(e) => {
                          const next = recentActions.map((r, ri) => ri === i ? { ...r, time: e.target.value } : r);
                          persist({ recentActions: next });
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          borderBottom: '1px solid var(--k-border)',
                          color: 'var(--k-text-dim)',
                          fontFamily: 'var(--k-font-tech)',
                          fontSize: 9,
                          outline: 'none',
                          width: 60,
                        }}
                      />
                      <select
                        value={action.level}
                        onChange={(e) => {
                          const next = recentActions.map((r, ri) => ri === i ? { ...r, level: e.target.value as any } : r);
                          persist({ recentActions: next });
                        }}
                        style={{
                          background: 'var(--k-bg-card)',
                          border: '1px solid var(--k-border)',
                          color: 'var(--k-text-dim)',
                          fontSize: 9,
                          borderRadius: 2,
                          padding: '1px 2px',
                          cursor: 'pointer',
                        }}
                      >
                        <option value="ok">ok</option>
                        <option value="info">info</option>
                        <option value="warn">warn</option>
                      </select>
                    </div>
                    <input
                      value={action.msg}
                      onChange={(e) => {
                        const next = recentActions.map((r, ri) => ri === i ? { ...r, msg: e.target.value } : r);
                        persist({ recentActions: next });
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        borderBottom: '1px solid var(--k-border)',
                        color: 'var(--k-text-primary)',
                        fontFamily: 'var(--k-font-main)',
                        fontSize: 11,
                        outline: 'none',
                        width: '100%',
                      }}
                    />
                  </div>
                ) : (
                  <>
                    <div
                      style={{
                        fontFamily: 'var(--k-font-tech)',
                        fontSize: 9,
                        color: 'var(--k-text-dim)',
                        letterSpacing: 1,
                        marginBottom: 2,
                      }}
                    >
                      {action.time}
                    </div>
                    <div
                      style={{
                        fontFamily: 'var(--k-font-main)',
                        fontSize: 12,
                        color: 'var(--k-text-primary)',
                      }}
                    >
                      {action.msg}
                    </div>
                  </>
                )}
              </div>
            ))}
            {editMode && (
              <button
                onClick={() => {
                  persist({
                    recentActions: [
                      ...recentActions,
                      { id: shortId(), time: '00:00:00', msg: 'New action entry', level: 'info' },
                    ],
                  });
                }}
                style={{
                  background: 'transparent',
                  border: '1px dashed var(--k-border)',
                  color: 'var(--k-text-dim)',
                  padding: '4px',
                  borderRadius: 2,
                  cursor: 'pointer',
                  fontFamily: 'var(--k-font-tech)',
                  fontSize: 9,
                  letterSpacing: 1,
                  marginTop: 4,
                }}
              >
                + ADD ACTION
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Typing animation keyframes ── */}
      <style>{`
        @keyframes beAgentDot {
          0%, 100% { transform: scale(0.6); opacity: 0.5; }
          50% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
