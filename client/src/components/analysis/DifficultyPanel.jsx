import { useState, useEffect } from 'react';

function AnimatedNumber({ value, decimals = 1 }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const target = value;
    const duration = 800;
    const start = performance.now();

    const tick = (now) => {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(+(target * eased).toFixed(decimals));
      if (progress < 1) requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }, [value, decimals]);

  return <span>{display.toFixed(decimals)}</span>;
}

function RadialGauge({ value, max, color, size = 140, strokeWidth = 14 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(1, value / max);
  const offset = circumference * (1 - progress);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={`gaugeGrad-${color.replace('#', '')}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="1" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e5e7eb" strokeWidth={strokeWidth} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={`url(#gaugeGrad-${color.replace('#', '')})`}
          strokeWidth={strokeWidth} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s ease-out' }} />
      </svg>
      <span className="absolute text-3xl font-extrabold" style={{ color }}>
        <AnimatedNumber value={value} decimals={1} />
      </span>
      <span className="absolute text-xs text-surface-400 mt-10">/ {max}</span>
    </div>
  );
}

function DimensionBar({ label, score, color, detail }) {
  const pct = Math.min(100, (score / 10) * 100);

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-semibold text-surface-700">{label}</span>
        <span className="text-xs font-medium text-surface-500">{detail}</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1 bg-surface-100 rounded-full h-3 overflow-hidden">
          <div className="h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden"
            style={{ width: `${pct}%`, backgroundColor: color }}>
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0" />
          </div>
        </div>
        <span className="text-sm font-bold text-surface-800 w-10 text-right tabular-nums">
          <AnimatedNumber value={score} decimals={1} />
        </span>
      </div>
    </div>
  );
}

const LEVEL_COLORS = {
  Beginner: '#22c55e',
  Intermediate: '#3b82f6',
  Advanced: '#f59e0b',
  Expert: '#ef4444',
};

export function DifficultyPanel({ difficulty }) {
  if (!difficulty) return null;

  const { score, level, levelColor, levelDescription, dimensions, summary } = difficulty;
  const color = levelColor || LEVEL_COLORS[level] || '#3b82f6';

  return (
    <div className="section-card overflow-hidden p-0">
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-xl font-bold text-surface-900">Project Difficulty</h2>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-white shadow-sm"
            style={{ backgroundColor: color }}>
            {level}
          </span>
        </div>
        <p className="text-sm text-surface-500">{summary}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 border-t border-surface-300">
        <div className="flex flex-col items-center justify-center bg-surface-100/40 p-6 lg:border-r border-surface-300">
          <RadialGauge value={score} max={10} color={color} size={140} strokeWidth={14} />
          <p className="text-xs text-surface-400 mt-3 text-center max-w-[180px] leading-relaxed">{levelDescription}</p>
        </div>

        <div className="lg:col-span-2 flex flex-col justify-center p-6 space-y-5">
          <DimensionBar label="Size" score={dimensions?.size || 0} color="#3b82f6"
            detail="LOC & file count" />
          <DimensionBar label="Complexity" score={dimensions?.complexity || 0} color="#f59e0b"
            detail="Cyclomatic & cognitive" />
          <DimensionBar label="Architecture" score={dimensions?.architecture || 0} color="#ef4444"
            detail="Depth, deps & circularity" />
          <DimensionBar label="Code Surface" score={dimensions?.surface || 0} color="#8b5cf6"
            detail="Routes, async & classes" />
          <DimensionBar label="Maintainability" score={dimensions?.quality || 0} color="#22c55e"
            detail="Code quality index" />
        </div>
      </div>
    </div>
  );
}
