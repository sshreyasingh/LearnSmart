import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { initMermaid } from '../../utils/mermaidConfig';

function LoadingState({ message }) {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto" />
        <p className="text-gray-500 text-sm mt-3">{message || 'Rendering diagram...'}</p>
      </div>
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div className="flex items-center justify-center py-16">
      <p className="text-gray-400 text-sm">{message || 'No diagram data available.'}</p>
    </div>
  );
}

function ErrorState({ message }) {
  return (
    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
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
