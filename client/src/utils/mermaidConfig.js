import mermaid from 'mermaid';

let initialized = false;

export function initMermaid() {
  if (initialized) return;
  initialized = true;
  mermaid.initialize({
    startOnLoad: false,
    theme: 'base',
    themeVariables: {
      primaryColor: '#C9EDDC',
      primaryBorderColor: '#059669',
      primaryTextColor: '#1f2937',
      lineColor: '#94a3b8',
      secondaryColor: '#e0e7ff',
      tertiaryColor: '#f0fdf4',
      backgroundColor: 'transparent',
      mainBkg: '#ffffff',
      nodeBorder: '#d1d5db',
      clusterBkg: '#f9fafb',
      clusterBorder: '#e5e7eb',
      titleColor: '#111827',
      edgeLabelBackground: '#ffffff',
      nodeTextColor: '#1f2937',
    },
    flowchart: { useMaxWidth: true, htmlLabels: true, curve: 'basis' },
    sequence: { useMaxWidth: true, showSequenceNumbers: true },
    er: { useMaxWidth: true, layoutDirection: 'TB' },
    securityLevel: 'loose',
  });
}
