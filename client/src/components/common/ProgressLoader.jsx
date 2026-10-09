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
    <div className="page-container max-w-xl mx-auto text-center py-16">
      {!isError ? (
        <div className="relative w-20 h-20 mx-auto mb-8">
          <svg className="animate-spin h-20 w-20 text-primary-500" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
      ) : (
        <div className="w-20 h-20 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <svg className="h-10 w-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L4.08 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
      )}

      <p className="text-surface-800 font-bold text-xl mb-2">{message}</p>
      {subPhase && <p className="text-sm text-surface-500 mb-5">{subPhase}</p>}

      <div className="flex items-center justify-center gap-1.5 mt-6">
        {phases.slice(0, -1).map((p, i) => {
          let bg = 'bg-surface-200';
          if (i < currentIdx) bg = 'bg-primary-500/100';
          else if (i === currentIdx && !isError) bg = 'bg-primary-500 animate-pulse';
          else if (i === currentIdx && isError) bg = 'bg-red-900/150';
          return (
            <div key={p} className="flex items-center gap-1.5">
              <div className={`w-3.5 h-3.5 rounded-full transition-all duration-300 ${bg}`} />
              {i < phases.length - 2 && (
                <div className={`w-8 h-0.5 rounded-full transition-all duration-300 ${i < currentIdx ? 'bg-primary-500/100' : 'bg-surface-200'}`} />
              )}
            </div>
          );
        })}
      </div>
      <div className="flex justify-center gap-3 mt-2">
        {phases.slice(0, -1).map((p, i) => (
          <span key={p} className={`text-[10px] font-semibold uppercase tracking-wide ${i <= currentIdx && !isError ? 'text-surface-600' : i === currentIdx && isError ? 'text-red-400' : 'text-surface-400'}`}>
            {i === 0 ? 'Clone' : i === 1 ? 'Parse' : i === 2 ? 'Summarize' : i === 3 ? 'AI Analyze' : 'Build'}
          </span>
        ))}
      </div>

      {!isError && (
        <p className="text-xs text-surface-400 mt-8">
          This may take a moment. The AI is thoroughly analyzing your codebase.
        </p>
      )}
    </div>
  );
}
