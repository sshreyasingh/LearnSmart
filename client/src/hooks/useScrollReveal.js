import { useRef, useState, useEffect, useCallback } from 'react';

const defaultOptions = {
  threshold: 0.15,
  rootMargin: '0px 0px -40px 0px',
  triggerOnce: true,
};

export function useScrollReveal(options = {}) {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const [hasTriggered, setHasTriggered] = useState(false);
  const opts = { ...defaultOptions, ...options };

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const ratio = entry.intersectionRatio;
        if (opts.triggerOnce && hasTriggered) return;

        const progress = Math.min(1, ratio / opts.threshold);
        requestAnimationFrame(() => {
          if (ratio > 0) {
            setIsVisible(true);
            if (ratio >= opts.threshold && !hasTriggered) {
              setHasTriggered(true);
            }
            node.style.setProperty('--reveal-progress', progress.toFixed(3));
          } else {
            setIsVisible(false);
          }
          node.style.setProperty('--reveal-ratio', ratio.toFixed(3));
        });
      },
      { threshold: [0, 0.15, 0.3, 0.5, 0.75, 1], rootMargin: opts.rootMargin }
    );

    requestAnimationFrame(() => observer.observe(node));
    return () => observer.disconnect();
  }, [hasTriggered, opts]);

  return { ref, isVisible, hasTriggered };
}

export function useScrollRevealStagger(count, baseDelay = 80, options = {}) {
  const { ref, isVisible } = useScrollReveal(options);
  const [visibleItems, setVisibleItems] = useState(new Set());

  useEffect(() => {
    if (!isVisible) return;

    const timeouts = [];
    for (let i = 0; i < count; i++) {
      const t = setTimeout(() => {
        setVisibleItems((prev) => new Set([...prev, i]));
      }, baseDelay * i);
      timeouts.push(t);
    }

    return () => timeouts.forEach(clearTimeout);
  }, [isVisible, count, baseDelay]);

  return { ref, isVisible, visibleItems };
}
