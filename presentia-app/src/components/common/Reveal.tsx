import React, { useEffect, useRef } from 'react';

interface Props { children: React.ReactNode; delay?: number; className?: string; style?: React.CSSProperties; }

const Reveal: React.FC<Props> = ({ children, delay = 0, className = '', style }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    el.style.transitionDelay = delay + 'ms';
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { el.classList.add('in-view'); io.unobserve(el); }
    }, { threshold: 0.1 });
    io.observe(el);
    return () => io.disconnect();
  }, [delay]);
  return <div ref={ref} className={`reveal ${className}`} style={style}>{children}</div>;
};

export default Reveal;
