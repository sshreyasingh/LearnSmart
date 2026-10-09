import { useState, useEffect, useCallback } from 'react';

export function useAnimatedValue(target, { duration = 800, easing = 'easeOutCubic', delay = 0, enabled = true } = {}) {
  const [value, setValue] = useState(0);
  const [animating, setAnimating] = useState(false);

  const easingFns = {
    easeOutCubic: (t) => 1 - Math.pow(1 - t, 3),
    easeOutExpo: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
    easeOutQuart: (t) => 1 - Math.pow(1 - t, 4),
    easeOutBack: (t) => {
      const c1 = 1.70158;
      const c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    },
    easeInOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    linear: (t) => t,
  };

  const ease = easingFns[easing] || easingFns.easeOutCubic;

  useEffect(() => {
    if (!enabled) {
      setValue(target);
      return;
    }

    let raf;
    let startTime;

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;

      if (elapsed < delay) {
        raf = requestAnimationFrame(animate);
        return;
      }

      const progress = Math.min(1, (elapsed - delay) / duration);
      const eased = ease(progress);
      setValue(target * eased);

      if (progress < 1) {
        raf = requestAnimationFrame(animate);
      } else {
        setAnimating(false);
      }
    };

    setAnimating(true);
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, delay, enabled]);

  const reset = useCallback(() => {
    setValue(0);
    setAnimating(false);
  }, []);

  return { value, animating, reset };
}

export function useCountUp(end, { suffix = '', decimals = 0, ...opts } = {}) {
  const { value } = useAnimatedValue(end, opts);
  const formatted = decimals > 0 ? value.toFixed(decimals) : Math.floor(value).toLocaleString();
  return `${formatted}${suffix}`;
}
