import { useState, useRef, useEffect } from 'react';
import api from '../../api/client';
import { getAccessToken } from '../../utils/storage';

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user';
  const isCached = msg.fromCache;
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm ${isUser ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-800'}`}>
        {isCached && (
          <div className="flex items-center gap-1 mb-1">
            <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">CACHED</span>
          </div>
        )}
        <div className="whitespace-pre-wrap break-words">{msg.content}</div>
        {msg.fileRefs && msg.fileRefs.length > 0 && (
          <div className="mt-2 pt-2 border-t border-white/20">
            {msg.fileRefs.map((ref, i) => (
              <div key={i} className="text-xs opacity-70 font-mono">{ref.filePath}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SuggestedQuestions({ questions, onSelect }) {
  if (!questions || questions.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {questions.map((q, i) => (
        <button
          key={i}
          onClick={() => onSelect(q)}
          className="text-xs px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full hover:bg-indigo-100 border border-indigo-100 transition-colors"
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
          } catch {
            // skip parse errors
          }
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
    <div className="bg-[#C9EDDC] rounded-2xl shadow-sm border border-emerald-200 p-6 mt-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4">💬 Ask About This Project</h2>

      {messages.length === 0 && !streaming && (
        <p className="text-sm text-gray-500 mb-4">
          Ask questions about your codebase. The AI has context from the analysis and can explain how things work, suggest improvements, or find specific code.
        </p>
      )}

      <div className="max-h-96 overflow-y-auto mb-4 space-y-1">
        {messages.map((msg, i) => (
          <MessageBubble key={i} msg={msg} />
        ))}

        {streaming && streamingContent && (
          <div className="flex justify-start mb-3">
            <div className="max-w-[80%] rounded-xl px-4 py-2.5 bg-gray-100 text-gray-800 text-sm">
              <div className="whitespace-pre-wrap break-words">{streamingContent}</div>
              <span className="inline-block w-2 h-4 bg-gray-400 animate-pulse ml-0.5 align-middle"></span>
            </div>
          </div>
        )}

        {streaming && !streamingContent && (
          <div className="flex justify-start mb-3">
            <div className="bg-gray-100 rounded-xl px-4 py-2.5">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 px-3 py-2 rounded text-xs mb-3">{error}</div>
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
          className="flex-1 border border-emerald-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 bg-white"
        />
        <button
          onClick={() => sendMessage()}
          disabled={streaming || !input.trim()}
          className="bg-primary-600 text-white px-5 py-2.5 rounded-lg hover:bg-primary-700 font-medium text-sm disabled:opacity-50 transition-colors"
        >
          {streaming ? '...' : 'Send'}
        </button>
      </div>
    </div>
  );
}
