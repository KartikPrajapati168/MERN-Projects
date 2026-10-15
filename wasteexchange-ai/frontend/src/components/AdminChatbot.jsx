// src/components/AdminChatbot.jsx
import React, { useState, useRef, useEffect } from 'react';
import API from '../utils/api';

const SUGGESTED_QUESTIONS = [
  'How many users are there in my website?',
  'What is the total revenue?',
  'How many pending verifications?',
  'How many deals are completed?',
  'What is the platform commission earned?',
  'Top 5 materials being traded?',
];

const AdminChatbot = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'bot',
      text: "Hi Admin 👋 I'm your WasteExchange AI assistant. Ask me anything about your marketplace — users, deals, revenue, listings, etc.",
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const sendMessage = async (q) => {
    const question = (q || input).trim();
    if (!question || loading) return;

    setMessages((prev) => [...prev, { role: 'user', text: question }]);
    setInput('');
    setLoading(true);

    try {
      const res = await API.post('/chatbot/ask', { question }, { timeout: 90000 });
      const answer = res.data?.answer || 'No response.';
      setMessages((prev) => [...prev, { role: 'bot', text: answer }]);
    } catch (err) {
      const msg = err.response?.data?.msg || err.message || 'Something went wrong.';
      setMessages((prev) => [...prev, { role: 'bot', text: `⚠️ ${msg}`, error: true }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          width: 56,
          height: 56,
          borderRadius: '50%',
          border: 'none',
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          color: 'white',
          fontSize: '1.4rem',
          cursor: 'pointer',
          boxShadow: '0 8px 24px rgba(99,102,241,0.4)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'transform 0.2s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.08)')}
        onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        title="Ask AI"
      >
        {open ? '✕' : '💬'}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          style={{
            position: 'fixed',
            bottom: 92,
            right: 24,
            width: 380,
            maxWidth: 'calc(100vw - 32px)',
            height: 540,
            maxHeight: 'calc(100vh - 120px)',
            background: '#1a1a2e',
            borderRadius: 16,
            border: '1px solid rgba(139,92,246,0.3)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 9999,
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '14px 18px',
              background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.1))',
              borderBottom: '1px solid rgba(139,92,246,0.2)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1rem',
              }}
            >
              🤖
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ color: 'white', fontWeight: 700, fontSize: '0.9rem' }}>
                Admin Assistant
              </div>
              <div style={{ color: '#22c55e', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: '#22c55e',
                    display: 'inline-block',
                  }}
                />
                Powered by Gemini
              </div>
            </div>
          </div>

          {/* Messages */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '14px 14px 8px',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            {messages.map((m, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                <div
                  style={{
                    maxWidth: '85%',
                    padding: '9px 13px',
                    borderRadius: m.role === 'user'
                      ? '14px 14px 4px 14px'
                      : '14px 14px 14px 4px',
                    background: m.role === 'user'
                      ? '#6366f1'
                      : m.error
                      ? 'rgba(248,113,113,0.15)'
                      : 'rgba(255,255,255,0.05)',
                    color: m.role === 'user'
                      ? 'white'
                      : m.error
                      ? '#f87171'
                      : '#e5e7eb',
                    fontSize: '0.85rem',
                    lineHeight: 1.5,
                    whiteSpace: 'pre-wrap',
                    border: m.role === 'user'
                      ? 'none'
                      : m.error
                      ? '1px solid rgba(248,113,113,0.3)'
                      : '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  {m.text}
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div
                  style={{
                    padding: '9px 13px',
                    borderRadius: '14px 14px 14px 4px',
                    background: 'rgba(255,255,255,0.05)',
                    color: '#9ca3af',
                    fontSize: '0.85rem',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <i className="fas fa-spinner fa-spin me-2"></i>
                  Thinking...
                </div>
              </div>
            )}

            {/* Suggestions — only if no user message yet */}
            {messages.length === 1 && !loading && (
              <div style={{ marginTop: 8 }}>
                <div
                  style={{
                    fontSize: '0.7rem',
                    color: '#6b7280',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginBottom: 8,
                  }}
                >
                  Try asking:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {SUGGESTED_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      onClick={() => sendMessage(q)}
                      style={{
                        padding: '8px 12px',
                        borderRadius: 8,
                        border: '1px solid rgba(139,92,246,0.25)',
                        background: 'rgba(139,92,246,0.06)',
                        color: '#a78bfa',
                        fontSize: '0.78rem',
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = 'rgba(139,92,246,0.15)')
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = 'rgba(139,92,246,0.06)')
                      }
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div
            style={{
              padding: '10px 12px',
              borderTop: '1px solid rgba(255,255,255,0.05)',
              display: 'flex',
              gap: 8,
            }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Ask about users, deals, revenue..."
              disabled={loading}
              style={{
                flex: 1,
                padding: '9px 12px',
                borderRadius: 9,
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.04)',
                color: 'white',
                fontSize: '0.85rem',
                outline: 'none',
              }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              style={{
                padding: '0 16px',
                borderRadius: 9,
                border: 'none',
                background:
                  loading || !input.trim()
                    ? 'rgba(255,255,255,0.08)'
                    : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: loading || !input.trim() ? '#6b7280' : 'white',
                cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                fontSize: '0.95rem',
              }}
            >
              <i className="fas fa-paper-plane"></i>
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminChatbot;