import { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';

export function PageTransition({ children }) {
  const location = useLocation();
  const [displayChildren, setDisplayChildren] = useState(children);
  const [transitionStage, setTransitionStage] = useState('enter');
  const prevPath = useRef(location.pathname);
  const rafRef = useRef(null);

  useEffect(() => {
    if (location.pathname !== prevPath.current) {
      prevPath.current = location.pathname;
      setTransitionStage('exit');

      const timeout = setTimeout(() => {
        cancelAnimationFrame(rafRef.current);
        setDisplayChildren(children);

        rafRef.current = requestAnimationFrame(() => {
          setTransitionStage('enter');
        });
      }, 150);

      return () => clearTimeout(timeout);
    } else {
      setDisplayChildren(children);
    }
  }, [location.pathname, children]);

  const stageClasses = {
    exit: 'opacity-0 translate-y-3 scale-[0.995]',
    enter: 'opacity-100 translate-y-0 scale-100',
  };

  return (
    <div
      className={`transition-all duration-300 ease-out ${stageClasses[transitionStage] || ''}`}
      style={{ minHeight: 'inherit' }}
    >
      {displayChildren}
    </div>
  );
}
