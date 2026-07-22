import { Children, cloneElement } from 'react';
import { useScrollReveal, useScrollRevealStagger } from '../../hooks/useScrollReveal';

const animationClasses = {
  fadeUp: 'opacity-0 translate-y-8',
  fadeIn: 'opacity-0',
  fadeRight: 'opacity-0 -translate-x-8',
  fadeLeft: 'opacity-0 translate-x-8',
  scaleUp: 'opacity-0 scale-95',
  scaleDown: 'opacity-0 scale-105',
};

const visibleClasses = {
  fadeUp: 'opacity-100 translate-y-0',
  fadeIn: 'opacity-100',
  fadeRight: 'opacity-100 translate-x-0',
  fadeLeft: 'opacity-100 translate-x-0',
  scaleUp: 'opacity-100 scale-100',
  scaleDown: 'opacity-100 scale-100',
};

const transitions = {
  smooth: 'transition-all duration-700 ease-out',
  spring: 'transition-all duration-600 ease-out',
  fast: 'transition-all duration-400 ease-out',
  slow: 'transition-all duration-1000 ease-out',
};

export function ScrollReveal({
  children,
  animation = 'fadeUp',
  transition = 'smooth',
  delay = 0,
  threshold = 0.15,
  triggerOnce = true,
  className = '',
  as: Tag = 'div',
}) {
  const { ref, isVisible } = useScrollReveal({ threshold, triggerOnce });

  return (
    <Tag
      ref={ref}
      className={`${animationClasses[animation] || animationClasses.fadeUp} ${transitions[transition]} ${className}`}
      style={{
        transitionDelay: `${delay}ms`,
        ...(isVisible ? { opacity: 1, transform: 'none' } : {}),
      }}
    >
      {children}
    </Tag>
  );
}

export function StaggerChildren({
  children,
  animation = 'fadeUp',
  transition = 'smooth',
  baseDelay = 80,
  threshold = 0.1,
  className = '',
  as: Tag = 'div',
}) {
  const childArray = Children.toArray(children).filter(Boolean);
  const { ref, visibleItems } = useScrollRevealStagger(childArray.length, baseDelay, { threshold });

  return (
    <Tag ref={ref} className={className}>
      {childArray.map((child, i) =>
        cloneElement(child, {
          key: child.key || i,
          className: `${child.props.className || ''} ${animationClasses[animation] || animationClasses.fadeUp} ${transitions[transition]}`,
          style: {
            ...(child.props.style || {}),
            transitionDelay: `${i * baseDelay}ms`,
            ...(visibleItems.has(i) ? { opacity: 1, transform: 'none' } : {}),
          },
        })
      )}
    </Tag>
  );
}

export function FadeIn({ children, delay = 0, className = '', as: Tag = 'div' }) {
  return (
    <ScrollReveal animation="fadeIn" transition="smooth" delay={delay} className={className} as={Tag}>
      {children}
    </ScrollReveal>
  );
}
