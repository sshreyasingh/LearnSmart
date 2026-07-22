import { useState, useRef, useEffect } from 'react';
import api from '../../api/client';
import { getAccessToken } from '../../utils/storage';

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 animate-fade-in-up`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? 'bg-primary-600 text-white rounded-br-lg shadow-md'
            : 'bg-surface-100 border border-surface-200 text-surface-800 rounded-bl-lg shadow-sm'
        }`}
      >
        {msg.fromCache && (
          <span className="inline-block text-[10px] bg-amber-100 text-amber-400 px-2 py-0.5 rounded-full font-semibold mb-1.5">
            Cached
          </span>
        )}
        <div className="whitespace-pre-wrap break-words">{msg.content}</div>
        {msg.fileRefs?.length > 0 && (
          <div className={`mt-2 pt-2 border-t ${isUser ? 'border-white/20' : 'border-surface-200'}`}>
            {msg.fileRefs.map((ref, i) => (
              <div key={i} className={`text-xs font-mono ${isUser ? 'text-white/70' : 'text-surface-400'}`}>
                {ref.filePath}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SuggestedQuestions({ questions, onSelect }) {
  if (!questions?.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-3">
      {questions.map((q, i) => (
        <button
          key={i}
          onClick={() => onSelect(q)}
          className="text-xs px-3 py-1.5 bg-indigo-900/20 text-indigo-600 rounded-full hover:bg-indigo-100 border border-indigo-500/20 font-medium transition-colors"
        >
          {q}
        </button>
      ))}
    </div>
  );
}

export default function AIChat({ projectId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [error, setError] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    if (messages.length > 0 || streamingContent) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, streamingContent]);

  const sendMessage = async (text) => {
    const trimmed = (text || input).trim();
    if (!trimmed || streaming) return;

    setError('');
    setInput('');
    setSuggestions([]);

    const userMsg = { role: 'user', content: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setStreaming(true);
    setStreamingContent('');

    try {
      const token = getAccessToken();
      const baseURL = api.defaults.baseURL || '/api';
      const res = await fetch(`${baseURL}/chat/${projectId}/ask-stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ question: trimmed, sessionId }),
      });

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullContent = '';
      let newSessionId = sessionId;
      let newSuggestions = [];
      let wasCached = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ') || line === 'data: [DONE]') continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'chunk') {
              fullContent += data.content;
              setStreamingContent(fullContent);
            } else if (data.type === 'cache_hit') {
              wasCached = true;
            } else if (data.type === 'done') {
              newSessionId = data.sessionId;
              newSuggestions = data.suggestedFollowUps || [];
              if (data.fromCache) wasCached = true;
            } else if (data.type === 'error') {
              setError(data.message);
            }
          } catch { /* skip parse errors */ }
        }
      }

      if (fullContent) {
        setMessages((prev) => [...prev, { role: 'assistant', content: fullContent, fromCache: wasCached }]);
      }
      if (newSessionId) setSessionId(newSessionId);
      if (newSuggestions.length > 0) setSuggestions(newSuggestions);
    } catch (err) {
      setError(err.message || 'Failed to get response');
    } finally {
      setStreaming(false);
      setStreamingContent('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="section-card">
      <div className="flex items-center gap-2 mb-1">
        <h2 className="text-xl font-bold text-surface-900">Ask About This Project</h2>
      </div>

      {messages.length === 0 && !streaming && (
        <p className="text-sm text-surface-500 mb-4">
          Ask questions about your codebase. The AI has context from the analysis and can explain how things work.
        </p>
      )}

      <div className="max-h-[450px] overflow-y-auto mb-4 scrollbar-thin pr-1">
        {messages.map((msg, i) => (
          <MessageBubble key={i} msg={msg} />
        ))}

        {streaming && streamingContent && (
          <div className="flex justify-start mb-4">
            <div className="max-w-[80%] rounded-2xl rounded-bl-lg px-4 py-3 bg-surface-100 border border-surface-200 shadow-sm text-sm">
              <div className="whitespace-pre-wrap break-words">{streamingContent}</div>
              <span className="inline-block w-2 h-5 bg-primary-400 animate-pulse ml-0.5 align-middle rounded-sm" />
            </div>
          </div>
        )}

        {streaming && !streamingContent && (
          <div className="flex justify-start mb-4">
            <div className="bg-surface-100 border border-surface-200 rounded-2xl rounded-bl-lg px-5 py-3 shadow-sm">
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 bg-surface-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2.5 h-2.5 bg-surface-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2.5 h-2.5 bg-surface-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-900/15 text-red-400 px-3 py-2 rounded-xl text-xs mb-3">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}

      <SuggestedQuestions questions={suggestions} onSelect={sendMessage} />

      <div className="flex gap-2 mt-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question about this project..."
          disabled={streaming}
          className="input-field flex-1 disabled:opacity-50"
        />
        <button
          onClick={() => sendMessage()}
          disabled={streaming || !input.trim()}
          className="btn-primary px-5 py-2.5"
        >
          {streaming ? '...' : 'Send'}
        </button>
      </div>
    </div>
  );
}
