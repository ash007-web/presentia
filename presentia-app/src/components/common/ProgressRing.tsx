import React, { useEffect, useState } from 'react';

interface Props { completed: number; total: number; }

const ProgressRing: React.FC<Props> = ({ completed, total }) => {
  const [offset, setOffset] = useState(452.4);
  const [pct, setPct] = useState(0);
  const pctTarget = Math.round((completed / total) * 100);

  useEffect(() => {
    const t = setTimeout(() => {
      const circumference = 452.4;
      setOffset(circumference - (pctTarget / 100) * circumference);
      const dur = 1400; const start = performance.now();
      const tick = (now: number) => {
        const p = Math.min((now - start) / dur, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        setPct(Math.round(pctTarget * eased));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, 300);
    return () => clearTimeout(t);
  }, [pctTarget]);

  return (
    <div style={{ position: 'relative', width: 168, height: 168, margin: '6px auto 18px' }}>
      <svg width="168" height="168" viewBox="0 0 168 168" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="84" cy="84" r="72" fill="none" stroke="#D6E8F2" strokeWidth="14"/>
        <circle cx="84" cy="84" r="72" fill="none" stroke="#4FA2CF" strokeWidth="14" strokeLinecap="round"
          strokeDasharray="452.4" strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1.4s cubic-bezier(.16,.84,.44,1)' }}/>
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div className="num" style={{ fontSize: 32, fontWeight: 700 }}>{pct}%</div>
        <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>{completed} of {total} done</div>
      </div>
    </div>
  );
};

export default ProgressRing;
