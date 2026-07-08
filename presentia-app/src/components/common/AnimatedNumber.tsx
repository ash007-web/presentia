import React, { useEffect, useRef, useState } from 'react';

interface Props { target: number; decimal?: number; className?: string; }

const AnimatedNumber: React.FC<Props> = ({ target, decimal = 0, className = '' }) => {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    let animationFrameId: number;
    const dur = 1100; 
    const start = performance.now();
    
    const tick = (now: number) => {
      const p = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(parseFloat((target * eased).toFixed(decimal)));
      if (p < 1) animationFrameId = requestAnimationFrame(tick);
    };
    
    animationFrameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrameId);
  }, [target, decimal]);

  return <span ref={ref} className={className}>{value.toFixed(decimal)}</span>;
};

export default AnimatedNumber;
