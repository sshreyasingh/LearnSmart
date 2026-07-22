import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { initMermaid } from '../../utils/mermaidConfig';

function LoadingState({ message }) {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="text-center">
        <svg className="animate-spin h-8 w-8 text-primary-500 mx-auto mb-3" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-surface-500 text-sm">{message || 'Rendering diagram...'}</p>
      </div>
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div className="flex items-center justify-center py-16">
      <p className="text-surface-400 text-sm">{message || 'No diagram data available.'}</p>
    </div>
  );
}

function ErrorState({ message }) {
  return (
    <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
      <p className="text-red-600 text-sm">Diagram error: {message}</p>
    </div>
  );
}

export default function MermaidDiagram({
  code,
  id = 'mermaid-diagram',
  loading = false,
  error = null,
  emptyMessage = 'No diagram data available.',
  loadingMessage = 'Rendering diagram...',
  className = '',
}) {
  const [svg, setSvg] = useState('');
  const [renderError, setRenderError] = useState(null);
  const containerRef = useRef(null);
  const renderId = useRef(0);

  useEffect(() => {
    initMermaid();
  }, []);

  useEffect(() => {
    if (!code || loading) return;
    let cancelled = false;
    const currentRenderId = ++renderId.current;

    const render = async () => {
      try {
        const uniqueId = `${id}-${currentRenderId}`;
        const { svg: renderedSvg } = await mermaid.render(uniqueId, code);
        if (!cancelled) {
          setSvg(renderedSvg);
          setRenderError(null);
        }
      } catch (err) {
        console.error('[MermaidDiagram] Render failed:', err);
        if (!cancelled) {
          try {
            const sanitized = code.replace(/[^\x20-\x7E\n]/g, '');
            const fallbackId = `${id}-fallback-${currentRenderId}`;
            const { svg: fallbackSvg } = await mermaid.render(fallbackId, sanitized);
            if (!cancelled) {
              setSvg(fallbackSvg);
              setRenderError(null);
            }
          } catch (fallbackErr) {
            if (!cancelled) {
              setRenderError(err.message || 'Failed to render diagram');
              setSvg('');
            }
          }
        }
      }
    };

    render();
    return () => {
      cancelled = true;
    };
  }, [code, id, loading]);

  useEffect(() => {
    if (svg && containerRef.current) {
      const svgEl = containerRef.current.querySelector('svg');
      if (svgEl) {
        svgEl.style.maxWidth = '100%';
        svgEl.style.height = 'auto';
      }
    }
  }, [svg]);

  if (loading) return <LoadingState message={loadingMessage} />;
  if (error || renderError) return <ErrorState message={error || renderError} />;
  if (!code) return <EmptyState message={emptyMessage} />;

  return (
    <div className={`overflow-x-auto ${className}`}>
      <div
        ref={containerRef}
        className="mermaid-wrapper min-w-max"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </div>
  );
}
