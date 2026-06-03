import React, { useState, useRef, useEffect } from 'react';
import api from '../utils/api';

// ============================================================
// STYLE HELPERS — injected once into <head>
// ============================================================
const CSS = `
  /* ── Floating Button ── */
  .siabot-fab {
    position: fixed;
    bottom: 28px;
    right: 28px;
    z-index: 9999;
    width: 58px;
    height: 58px;
    border-radius: 50%;
    border: none;
    cursor: pointer;
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%);
    color: #fff;
    font-size: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 6px 24px rgba(99,102,241,0.55);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }
  .siabot-fab:hover {
    transform: scale(1.1);
    box-shadow: 0 10px 32px rgba(99,102,241,0.7);
  }
  .siabot-fab .siabot-badge {
    position: absolute;
    top: 2px;
    right: 2px;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: #22c55e;
    border: 2px solid #fff;
  }

  /* ── Chat Panel ── */
  .siabot-panel {
    position: fixed;
    bottom: 100px;
    right: 28px;
    z-index: 9998;
    width: 360px;
    max-height: 540px;
    border-radius: 20px;
    background: #ffffff;
    box-shadow: 0 20px 60px rgba(0,0,0,0.18);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    animation: siabot-slide-in 0.25s cubic-bezier(0.4,0,0.2,1);
  }
  @keyframes siabot-slide-in {
    from { opacity: 0; transform: translateY(20px) scale(0.96); }
    to   { opacity: 1; transform: translateY(0)   scale(1);    }
  }

  /* ── Header ── */
  .siabot-header {
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 60%, #a855f7 100%);
    padding: 16px 18px;
    display: flex;
    align-items: center;
    gap: 12px;
    color: #fff;
  }
  .siabot-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: rgba(255,255,255,0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    flex-shrink: 0;
  }
  .siabot-header-info { flex: 1; }
  .siabot-header-info strong { display: block; font-size: 14px; font-weight: 700; }
  .siabot-header-info span  { font-size: 11px; opacity: 0.85; }
  .siabot-close-btn {
    background: rgba(255,255,255,0.2);
    border: none;
    color: #fff;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    cursor: pointer;
    font-size: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s;
  }
  .siabot-close-btn:hover { background: rgba(255,255,255,0.35); }

  /* ── Messages ── */
  .siabot-messages {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    background: #f8f7ff;
    scrollbar-width: thin;
    scrollbar-color: #c4b5fd transparent;
  }
  .siabot-messages::-webkit-scrollbar { width: 4px; }
  .siabot-messages::-webkit-scrollbar-track { background: transparent; }
  .siabot-messages::-webkit-scrollbar-thumb { background: #c4b5fd; border-radius: 4px; }

  .siabot-bubble-wrap {
    display: flex;
    align-items: flex-end;
    gap: 8px;
  }
  .siabot-bubble-wrap.user  { flex-direction: row-reverse; }
  .siabot-bubble-icon {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
  }
  .siabot-bubble-wrap.bot  .siabot-bubble-icon { background: linear-gradient(135deg,#6366f1,#a855f7); color:#fff; }
  .siabot-bubble-wrap.user .siabot-bubble-icon { background: #e0e7ff; color: #6366f1; }

  .siabot-bubble {
    max-width: 82%;
    padding: 10px 14px;
    border-radius: 16px;
    font-size: 13px;
    line-height: 1.55;
    white-space: pre-wrap;
    word-break: break-word;
    text-align: left !important;
  }
  .siabot-bubble-wrap.bot  .siabot-bubble {
    background: #fff;
    color: #1e1b4b;
    border-bottom-left-radius: 4px;
    box-shadow: 0 2px 8px rgba(99,102,241,0.08);
  }
  .siabot-bubble-wrap.user .siabot-bubble {
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    color: #fff;
    border-bottom-right-radius: 4px;
  }

  /* -- Markdown Styles -- */
  .siabot-markdown p { margin-bottom: 8px; }
  .siabot-markdown p:last-child { margin-bottom: 0; }
  .siabot-markdown strong { font-weight: 700; color: inherit; }
  .siabot-markdown code {
    background: rgba(0,0,0,0.06);
    padding: 2px 4px;
    border-radius: 4px;
    font-family: monospace;
    font-size: 12px;
  }
  .siabot-markdown pre {
    background: #1e1b4b;
    color: #e0e7ff;
    padding: 10px;
    border-radius: 8px;
    overflow-x: auto;
    margin: 8px 0;
  }
  .siabot-markdown pre code {
    background: transparent;
    color: inherit;
    padding: 0;
  }
  .siabot-markdown ul, .siabot-markdown ol {
    margin-top: 4px;
    margin-bottom: 8px;
    padding-left: 20px;
  }
  .siabot-markdown li { margin-bottom: 4px; }

  /* ── Typing indicator ── */
  .siabot-typing {
    display: flex;
    gap: 5px;
    align-items: center;
    padding: 4px 2px;
  }
  .siabot-typing span {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #8b5cf6;
    animation: siabot-bounce 1.2s infinite ease-in-out;
  }
  .siabot-typing span:nth-child(2) { animation-delay: 0.2s; }
  .siabot-typing span:nth-child(3) { animation-delay: 0.4s; }
  @keyframes siabot-bounce {
    0%,80%,100% { transform: translateY(0);    opacity: 0.4; }
    40%          { transform: translateY(-6px); opacity: 1;   }
  }

  /* ── Input Row ── */
  .siabot-input-row {
    padding: 12px 14px;
    background: #fff;
    display: flex;
    gap: 8px;
    align-items: flex-end;
    border-top: 1px solid #ede9fe;
  }
  .siabot-textarea {
    flex: 1;
    background: #ffffff !important;
    color: #1e1b4b !important;
    border: 1.5px solid #ede9fe;
    border-radius: 12px;
    padding: 9px 12px;
    font-size: 13px;
    resize: none;
    outline: none;
    font-family: inherit;
    max-height: 100px;
    overflow-y: auto;
    line-height: 1.4;
    transition: border-color 0.2s;
  }
  .siabot-textarea:focus { border-color: #8b5cf6; }
  .siabot-textarea::placeholder { color: #a5b4fc; }
  .siabot-send-btn {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    border: none;
    background: linear-gradient(135deg,#6366f1,#8b5cf6);
    color: #fff;
    font-size: 16px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: transform 0.15s, box-shadow 0.15s;
  }
  .siabot-send-btn:hover:not(:disabled)  { transform: scale(1.1); box-shadow: 0 4px 12px rgba(99,102,241,0.4); }
  .siabot-send-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  /* ── Greeting chip ── */
  .siabot-greeting {
    background: #ede9fe;
    border-radius: 12px;
    padding: 10px 14px;
    font-size: 12px;
    color: #5b21b6;
    text-align: center;
    line-height: 1.5;
  }

  @media (max-width: 480px) {
    .siabot-panel { width: calc(100vw - 32px); right: 16px; bottom: 88px; }
    .siabot-fab   { right: 16px; bottom: 20px; }
  }
`;

let cssInjected = false;
function injectCSS() {
  if (cssInjected) return;
  cssInjected = true;
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function ChatBot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => { injectCSS(); }, []);

  useEffect(() => {
    if (open && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, open, loading]);

  // Auto-resize textarea
  const handleInput = (e) => {
    setInput(e.target.value);
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = Math.min(ta.scrollHeight, 100) + 'px';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { role: 'user', text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setLoading(true);

    // Build history for the API (exclude the last user message — it's the current one)
    const history = newMessages.slice(0, -1).map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      text: m.text,
    }));

    try {
      const res = await api.post('/chat', { message: text, history });
      setMessages(prev => [...prev, { role: 'model', text: res.data.reply }]);
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Gagal terhubung ke Pak Dwi. Coba lagi.';
      setMessages(prev => [...prev, { role: 'model', text: `⚠️ ${errMsg}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        className="siabot-fab"
        onClick={() => setOpen(o => !o)}
        title="Tanya Pak Dwi"
        aria-label="Buka asisten akademik"
      >
        {open ? '✕' : '👨‍🏫'}
        {!open && <span className="siabot-badge" />}
      </button>

      {/* Chat Panel */}
      {open && (
        <div className="siabot-panel" role="dialog" aria-label="SIA-BOT Asisten Akademik">
          {/* Header */}
          <div className="siabot-header">
            <div className="siabot-avatar">👨‍🏫</div>
            <div className="siabot-header-info">
              <strong>Pak Dwi</strong>
              <span>Dosen Pembimbing • Aktif</span>
            </div>
            <button className="siabot-close-btn" onClick={() => setOpen(false)} aria-label="Tutup">✕</button>
          </div>

          {/* Messages */}
          <div className="siabot-messages">
            {messages.length === 0 && (
              <div className="siabot-greeting">
                👋 Halo! Saya <strong>Pak Dwi</strong>.<br />
                Ada materi kuliah yang masih membingungkan? Tanyakan saja ke Bapak! 📚
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`siabot-bubble-wrap ${msg.role === 'user' ? 'user' : 'bot'}`}>
                <div className="siabot-bubble-icon">
                  {msg.role === 'user' ? '🎓' : '👨‍🏫'}
                </div>
                <div className="siabot-bubble">
                  {msg.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="siabot-bubble-wrap bot">
                <div className="siabot-bubble-icon">👨‍🏫</div>
                <div className="siabot-bubble">
                  <div className="siabot-typing">
                    <span /><span /><span />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="siabot-input-row">
            <textarea
              ref={textareaRef}
              className="siabot-textarea"
              rows={1}
              placeholder="Tanya tentang materi kuliah..."
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              disabled={loading}
            />
            <button
              className="siabot-send-btn"
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              aria-label="Kirim"
            >
              ➤
            </button>
          </div>
        </div>
      )}
    </>
  );
}
