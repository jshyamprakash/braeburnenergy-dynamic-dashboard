'use client';

import { useState, useRef, useEffect } from 'react';

interface AgentChatProps {
  config: Record<string, any>;
}

export function AgentChat({ config }: AgentChatProps) {
  const { title = 'BE AGENT™', messages: initialMessages = [] } = config;
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Array<{ role: string; text: string }>>(initialMessages);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    setMessages((prev) => [
      ...prev,
      { role: 'user', text },
      { role: 'agent', text: 'Analysing operational parameters… Nominal state confirmed. No anomalies detected.' },
    ]);
    setInput('');
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div className="k-card-title">{title}</div>

      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          padding: '6px 0',
        }}
      >
        {messages.map((msg, i) => {
          const isUser = msg.role === 'user';
          const isSystem = msg.role === 'system';
          return (
            <div
              key={i}
              style={{
                padding: '6px 8px',
                borderRadius: 2,
                fontFamily: 'var(--k-font-main)',
                fontSize: 11,
                lineHeight: 1.6,
                color: isSystem ? 'var(--k-soft)' : isUser ? 'var(--k-pale)' : 'var(--k-green)',
                borderLeft: isUser ? undefined : `2px solid ${isSystem ? 'var(--k-base)' : 'var(--k-green)'}`,
                borderRight: isUser ? '2px solid var(--k-base)' : undefined,
                background: 'rgba(255,255,255,0.02)',
                textAlign: isUser ? 'right' : 'left',
              }}
            >
              {!isUser && (
                <div
                  style={{
                    fontFamily: 'var(--k-font-tech)',
                    fontSize: 8,
                    letterSpacing: 2,
                    marginBottom: 3,
                    textTransform: 'uppercase',
                    opacity: 0.7,
                  }}
                >
                  {isSystem ? 'SYSTEM' : 'BE AGENT™'}
                </div>
              )}
              {msg.text}
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: 4, paddingTop: 6, borderTop: '1px solid var(--k-border)' }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask the agent…"
          style={{
            flex: 1,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid var(--k-border)',
            borderRadius: 2,
            color: 'var(--k-pale)',
            fontFamily: 'var(--k-font-tech)',
            fontSize: 11,
            padding: '4px 8px',
            outline: 'none',
          }}
        />
        <button
          onClick={handleSend}
          className="k-btn k-btn-ghost"
          style={{ padding: '4px 10px', fontSize: 10 }}
        >
          SEND
        </button>
      </div>
    </div>
  );
}
