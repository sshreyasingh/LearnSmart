import { useState, useEffect, useRef } from 'react';
import api from '../../api/client';

const PHASE_LABELS = {
  cloning: 'Cloning repository...',
  reading_files: 'Parsing code structure...',
  chunking: 'Building hierarchical summaries...',
  embedding: 'Running AI analysis...',
  building_index: 'Building visualizations & metrics...',
  ready: 'Analysis complete!',
  error: 'An error occurred',
};

const POLL_INTERVAL = 2000;
const MAX_POLLS = 60;

export default function ProgressLoader({ projectId }) {
  const [phase, setPhase] = useState(null);
  const [message, setMessage] = useState('Connecting...');
  const [subPhase, setSubPhase] = useState('');
  const pollRef = useRef(null);
  const countRef = useRef(0);

  useEffect(() => {
    if (!projectId) return;

    let cancelled = false;
    countRef.current = 0;

    const poll = async () => {
      if (cancelled || countRef.current >= MAX_POLLS) return;
      countRef.current++;

      try {
        const res = await api.get(`/progress/${projectId}`);
        const data = res.data.data;
        setPhase(data.phase);
        setMessage(PHASE_LABELS[data.phase] || data.message || 'Working...');
        if (data.message) setSubPhase(data.message);

        if (data.phase === 'ready' || data.phase === 'error') return;
      } catch {
        if (!cancelled) setMessage('Waiting for analysis...');
      }

      if (!cancelled) pollRef.current = setTimeout(poll, POLL_INTERVAL);
    };

    poll();

    return () => {
      cancelled = true;
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, [projectId]);

  const phases = ['cloning', 'reading_files', 'chunking', 'embedding', 'building_index', 'ready'];
  const currentIdx = phases.indexOf(phase);
  const isError = phase === 'error';

  return (
    <div className="max-w-xl mx-auto px-4 py-16 text-center">
      {!isError ? (
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-6"></div>
      ) : (
        <div className="text-5xl mb-4">⚠️</div>
      )}

      <p className="text-gray-800 font-semibold text-lg mb-2">{message}</p>
      {subPhase && <p className="text-sm text-gray-500 mb-4">{subPhase}</p>}

      <div className="flex items-center justify-center gap-1.5 mt-4">
        {phases.slice(0, -1).map((p, i) => {
          let bg = 'bg-gray-200';
          if (i < currentIdx) bg = 'bg-green-500';
          else if (i === currentIdx) bg = 'bg-primary-500 animate-pulse';
          return (
            <div key={p} className="flex items-center gap-1.5">
              <div className={`w-3 h-3 rounded-full ${bg}`}></div>
              {i < phases.length - 2 && (
                <div className={`w-6 h-0.5 ${i < currentIdx ? 'bg-green-500' : 'bg-gray-200'}`}></div>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex justify-center gap-4 mt-2">
        {phases.slice(0, -1).map((p, i) => (
          <span key={p} className={`text-[10px] ${i <= currentIdx ? 'text-gray-600' : 'text-gray-400'}`}>
            {i === 0 ? 'Clone' : i === 1 ? 'Parse' : i === 2 ? 'Summarize' : i === 3 ? 'AI Analyze' : 'Build'}
          </span>
        ))}
      </div>

      {!isError && (
        <p className="text-xs text-gray-400 mt-6">
          This may take a moment. The AI is thoroughly analyzing your codebase.
        </p>
      )}
    </div>
  );
}
