import { useRef, useEffect, useState, useCallback } from 'react';

export function useParallax(speed = 0.3, { disabled = false, maxOffset = 80 } = {}) {
  const ref = useRef(null);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    if (disabled) return;

    let raf;
    const handleScroll = () => {
      if (!ref.current) return;

      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const rect = ref.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const elementCenter = rect.top + rect.height / 2;
        const viewportCenter = viewportHeight / 2;
        const distanceFromCenter = elementCenter - viewportCenter;
        const maxDistance = viewportHeight / 2 + rect.height / 2;
        const rawOffset = (distanceFromCenter / maxDistance) * maxOffset * speed;
        const clamped = Math.max(-maxOffset, Math.min(maxOffset, rawOffset));
        setOffset(clamped);
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => {
      window.removeEventListener('scroll', handleScroll);
      cancelAnimationFrame(raf);
    };
  }, [speed, disabled, maxOffset]);

  return { ref, offset };
}

export function useFloatingParallax({ speed = 1, amplitude = 10, period = 3000 } = {}) {
  const ref = useRef(null);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    let raf;
    let start;

    const animate = (timestamp) => {
      if (!start) start = timestamp;
      const elapsed = timestamp - start;
      const raw = Math.sin((elapsed / period) * Math.PI * 2) * amplitude * speed;
      setOffset(raw);
      raf = requestAnimationFrame(animate);
    };

    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [speed, amplitude, period]);

  return { ref, offset };
}
