import React, { useEffect, useRef } from 'react';

interface Props { data: number[]; labels: string[]; todayIndex: number; }

const TrendChart: React.FC<Props> = ({ data, labels, todayIndex }) => {
  const lineRef = useRef<SVGPathElement>(null);
  const areaRef = useRef<SVGPathElement>(null);
  const dotRef = useRef<SVGCircleElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const w = 300, h = 120, p = 6;
    const max = Math.max(...data), min = Math.min(...data);
    const pts = data.map((v, i) => {
      const x = p + i * ((w - p * 2) / (data.length - 1));
      const y = h - p - ((v - min) / (max - min || 1)) * (h - p * 2);
      return [x, y];
    });
    let line = `M ${pts[0][0]} ${pts[0][1]}`;
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
      const mx = (x0 + x1) / 2;
      line += ` C ${mx} ${y0}, ${mx} ${y1}, ${x1} ${y1}`;
    }
    const area = line + ` L ${pts[pts.length - 1][0]} ${h} L ${pts[0][0]} ${h} Z`;
    const lp = lineRef.current, ap = areaRef.current, dp = dotRef.current;
    if (!lp || !ap || !dp) return;
    lp.setAttribute('d', line); ap.setAttribute('d', area);
    const len = lp.getTotalLength();
    lp.style.strokeDasharray = len + ''; lp.style.strokeDashoffset = len + '';
    dp.setAttribute('cx', pts[pts.length - 1][0] + '');
    dp.setAttribute('cy', pts[pts.length - 1][1] + '');

    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        lp.style.transition = 'stroke-dashoffset 1.6s cubic-bezier(.16,.84,.44,1)';
        lp.style.strokeDashoffset = '0';
        ap.style.transition = 'opacity 1.2s ease .4s'; ap.style.opacity = '1';
        setTimeout(() => { dp.style.transition = 'r .4s ease'; dp.setAttribute('r', '4'); }, 1400);
        io.unobserve(entry.target);
      }
    }, { threshold: 0.3 });
    if (svgRef.current) io.observe(svgRef.current);
    return () => io.disconnect();
  }, [data]);

  return (
    <>
      <svg ref={svgRef} width="100%" height="120" viewBox="0 0 300 120" preserveAspectRatio="none">
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4FA2CF" stopOpacity="0.35"/>
            <stop offset="100%" stopColor="#4FA2CF" stopOpacity="0"/>
          </linearGradient>
        </defs>
        <path ref={areaRef} fill="url(#areaGrad)" opacity="0" d=""/>
        <path ref={lineRef} fill="none" stroke="#4FA2CF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" d=""/>
        <circle ref={dotRef} r="0" fill="#4FA2CF"/>
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, padding: '0 2px' }}>
        {labels.map((l, i) => (
          <span key={l} style={{ fontSize: 11, color: i === todayIndex ? 'var(--primary-blue)' : 'var(--ink-faint)', fontWeight: i === todayIndex ? 700 : 500 }}>{l}</span>
        ))}
      </div>
    </>
  );
};

export default TrendChart;
