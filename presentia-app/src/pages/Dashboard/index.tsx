import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Reveal from '../../components/common/Reveal';
import ProgressRing from '../../components/common/ProgressRing';
import AnimatedNumber from '../../components/common/AnimatedNumber';
import TrendChart from '../../components/charts/TrendChart';
import { getDashboardStats, getWeeklyTrend } from '../../services/dashboardService';
import { getRecentPresentations } from '../../services/presentationService';
import { useTimetableIST } from '../../hooks/useTimetableIST';
import { addRipple, fmtDuration } from '../../utils/helpers';

const StarIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 12, height: 12 }}>
    <path d="M12 2l2.9 6.6 7.1.6-5.4 4.6 1.7 6.9L12 17l-6.3 3.7 1.7-6.9-5.4-4.6 7.1-.6z"/>
  </svg>
);

const SkeletonCard = () => (
  <div className="card" style={{ height: '100%' }}>
    {[1,2,3].map(i => (
      <div key={i} style={{ height: 18, background: 'rgba(79,162,207,0.08)', borderRadius: 8, marginBottom: 14, width: `${70 + i * 10}%`, animation: 'pulse 1.5s ease-in-out infinite' }}/>
    ))}
  </div>
);

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const quickStartRef = useRef<HTMLButtonElement>(null);
  const [schedule, setSchedule] = useState<any[]>([]);
  const [recentPresentations, setRecentPresentations] = useState<any[]>([]);
  const [dashData, setDashData] = useState<any>(null);
  const [weeklyTrend, setWeeklyTrend] = useState<{ counts: number[]; labels: string[]; todayIndex: number; total: number }>({ counts: [0,0,0,0,0,0], labels: ['Mon','Tue','Wed','Thu','Fri','Sat'], todayIndex: 5, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { currentFaculty, currentSubject } = useTimetableIST();

  const loadData = () => {
    setLoading(true);
    setError('');
    Promise.all([getDashboardStats(), getRecentPresentations(), getWeeklyTrend()])
      .then(([dash, recent, trend]) => {
        setDashData(dash.data);
        setSchedule(dash.data?.todaysSchedule || []);
        setRecentPresentations(recent?.data?.presentations || []);
        setWeeklyTrend(trend);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load dashboard data');
        setLoading(false);
      });
  };

  useEffect(() => { 
    loadData();
    const interval = setInterval(() => {
      Promise.all([getDashboardStats()]).then(([dash]) => {
        setDashData(dash.data);
        setSchedule(dash.data?.todaysSchedule || []);
      }).catch(console.error);
    }, 30000); // poll every 30s
    
    // Reload when user comes back to this tab
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        Promise.all([getDashboardStats()]).then(([dash]) => {
          setDashData(dash.data);
          setSchedule(dash.data?.todaysSchedule || []);
        }).catch(console.error);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const handleQuickStart = (e: React.MouseEvent<HTMLButtonElement>) => {
    addRipple(e, e.currentTarget);
    setTimeout(() => navigate('/presentation'), 200);
  };

  const avgDurationSec = dashData?.averageDuration || 0;
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  if (error) {
    return (
      <div style={{ textAlign: 'center', marginTop: 100 }}>
        <h3 style={{color:'var(--primary-red)'}}>Failed to load</h3>
        <p style={{color:'var(--ink-soft)', marginBottom: 20}}>{error}</p>
        <button className="btn-primary" onClick={loadData}>Retry</button>
      </div>
    );
  }

  return (
    <main style={{ maxWidth: 1400, margin: '0 auto', padding: '36px 40px 80px' }}>
      {/* Welcome */}
      <Reveal style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, marginBottom: 32, flexWrap: 'wrap' }}>
        <div>
          <p className="eyebrow"><span className="dot" />{today}</p>
          <h1 style={{ fontSize: 32, fontWeight: 600, marginBottom: 8 }}>Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}{currentFaculty ? `, ${currentFaculty}` : ''} 👋</h1>
          <p style={{ color: 'var(--ink-soft)', fontSize: 15, maxWidth: 480 }}>Here's what's happening in today's presentation session — live and up to date.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button ref={quickStartRef} className="btn-primary" onClick={handleQuickStart}>
            <svg viewBox="0 0 24 24" fill="none" style={{ width: 15, height: 15 }}>
              <path d="M6 4l14 8-14 8V4z" fill="white"/>
            </svg>
            Quick Start Presentation
          </button>
        </div>
      </Reveal>

      {/* Row 1: Session / Progress / Next */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(12,1fr)', gap: 24, marginBottom: 24, alignItems: 'stretch' }}>
        <Reveal delay={70} style={{ gridColumn: 'span 5' }}>
          {loading ? <SkeletonCard /> : (
          <div className="card" style={{ height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
              <span className="badge badge-live"><span className="dot" />Live Session</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)', background: 'rgba(21,36,48,0.045)', padding: '6px 12px', borderRadius: 100 }}>
                {dashData?.currentCycle ? `Cycle ${dashData.currentCycle.cycleNumber} · ${dashData.currentCycle.semester}` : 'No Active Cycle'}
              </span>
            </div>
            <div style={{ marginBottom: 22 }}>
              <div style={{ fontSize: 12, color: 'var(--ink-faint)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Current Subject · Auto-detected</div>
              <div style={{ fontSize: 27, fontWeight: 600 }}>{currentSubject || 'No Subject Active'}</div>
            </div>
            <div style={{ height: 1, background: 'var(--line)', margin: '4px 0 20px' }}/>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
              <div className="avatar-md">{currentFaculty ? currentFaculty.substring(0,2).toUpperCase() : 'NK'}</div>
              <div>
                <div style={{ fontSize: '14.5px', fontWeight: 600 }}>{currentFaculty}</div>
                <div style={{ fontSize: '12.5px', color: 'var(--ink-soft)' }}>Current Faculty</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginTop: 'auto' }}>
              {[
                { v: dashData?.completed || 0, l: 'Completed' },
                { v: dashData?.remaining || 0, l: 'Remaining' },
                { v: Math.floor((dashData?.totalTimeTaken || 0) / 60), l: 'Mins elapsed' }
              ].map(s => (
                <div key={s.l} style={{ background: 'rgba(255,255,255,0.55)', border: '1px solid var(--line)', borderRadius: 12, padding: '12px 14px' }}>
                  <div className="num" style={{ fontSize: 20, fontWeight: 700 }}><AnimatedNumber target={s.v} /></div>
                  <div style={{ fontSize: '11.5px', color: 'var(--ink-soft)', marginTop: 2 }}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>
          )}
        </Reveal>

        <Reveal delay={140} style={{ gridColumn: 'span 3' }}>
          {loading ? <SkeletonCard /> : (
          <div className="card" style={{ height: '100%', alignItems: 'center', textAlign: 'center', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, width: '100%' }}>
              <span style={{ fontSize: 15, fontWeight: 600 }}>Overall Progress</span>
            </div>
            <ProgressRing completed={dashData?.completed || 0} total={(dashData?.completed || 0) + (dashData?.remaining || 0)} />
            <div style={{ display: 'flex', gap: 18, marginTop: 'auto' }}>
              {[{ c: 'var(--primary-blue)', l: 'Completed' }, { c: 'var(--light-blue)', l: 'Remaining' }].map(item => (
                <div key={item.l} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: '12.5px', color: 'var(--ink-soft)' }}>
                  <span style={{ width: 9, height: 9, borderRadius: 3, background: item.c }}/>{item.l}
                </div>
              ))}
            </div>
          </div>
          )}
        </Reveal>

        <Reveal delay={210} style={{ gridColumn: 'span 4' }}>
          {loading ? <SkeletonCard /> : (
          <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'linear-gradient(155deg,rgba(255,255,255,0.75),rgba(214,232,242,0.55))', position: 'relative', overflow: 'hidden' }}>
            <span className="badge badge-live" style={{ width: 'fit-content' }}><span className="dot" />Up Next</span>
            <div style={{ fontSize: 24, fontWeight: 600, margin: '16px 0 8px' }}>{dashData?.nextStudent?.name || 'No Pending Students'}</div>
            <span style={{ display: 'inline-flex', fontSize: '11.5px', fontWeight: 600, color: 'var(--ink-soft)', background: 'rgba(255,255,255,0.7)', padding: '5px 11px', borderRadius: 100, border: '1px solid var(--line)', width: 'fit-content' }}>Roll No. {dashData?.nextStudent?.rollNo || 'N/A'}</span>
            <p style={{ fontSize: '13.5px', color: 'var(--ink-soft)', marginTop: 12, lineHeight: 1.5 }}>Next in line for {currentSubject || 'presentation'}.</p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: 20 }}>
              <button onClick={() => navigate('/presentation')} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 600, color: 'var(--primary-blue)', background: 'none', border: 'none', cursor: 'pointer' }}>
                <svg viewBox="0 0 24 24" fill="none" style={{ width: 14, height: 14 }}><path d="M6 4l14 8-14 8V4z" fill="currentColor"/></svg>
                Start presentation
              </button>
              <div className="avatar-sm" style={{ width: 32, height: 32, fontSize: 12 }}>{dashData?.nextStudent?.name ? dashData.nextStudent.name.split(' ').map((n: string) => n[0]).join('').substring(0,2).toUpperCase() : '?'}</div>
            </div>
          </div>
          )}
        </Reveal>
      </section>

      {/* Row 2: Schedule / Leaderboard / Stats */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(12,1fr)', gap: 24, marginBottom: 24, alignItems: 'stretch' }}>
        <Reveal delay={70} style={{ gridColumn: 'span 5' }}>
          {loading ? <SkeletonCard /> : (
          <div className="card" style={{ height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <span style={{ fontSize: 15, fontWeight: 600 }}>Today's Schedule</span>
              <button onClick={() => navigate('/timetable')} style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--primary-blue)', background: 'none', border: 'none', cursor: 'pointer' }}>View timetable →</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 352, overflowY: 'auto', paddingRight: 6 }}>
              {schedule.length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--ink-soft)', padding: 10 }}>No schedule today</div>
              ) : schedule.map((item: any, i: number) => {
                const [startH, startM] = item.startTime.split(':').map(Number);
                const [endH, endM] = item.endTime.split(':').map(Number);
                const now = new Date();
                const curM = now.getHours() * 60 + now.getMinutes();
                const sM = startH * 60 + startM;
                const eM = endH * 60 + endM;
                const status = curM >= sM && curM <= eM ? 'live' : (curM > eM ? 'done' : 'upcoming');
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 10px', borderRadius: 14, background: status === 'live' ? 'rgba(79,162,207,0.09)' : 'transparent', border: status === 'live' ? '1px solid rgba(79,162,207,0.25)' : '1px solid transparent', transition: 'background .25s' }}>
                    <div className="num" style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-soft)', width: 74, flexShrink: 0 }}>{item.startTime}</div>
                    <div style={{ width: 3, alignSelf: 'stretch', borderRadius: 3, background: status === 'live' ? 'var(--primary-blue)' : 'var(--line)', flexShrink: 0 }}/>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{item.subject}</div>
                      <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 1 }}>{item.faculty}</div>
                    </div>
                    <span className={`badge badge-${status}`}>
                      {status === 'live' ? <><span className="dot"/>Live</> : status === 'done' ? 'Done' : 'Upcoming'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          )}
        </Reveal>

        <Reveal delay={140} style={{ gridColumn: 'span 4' }}>
          {loading ? <SkeletonCard /> : (
          <div className="card" style={{ height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <span style={{ fontSize: 15, fontWeight: 600 }}>Top 5 Leaderboard</span>
              <button onClick={() => navigate('/leaderboard')} style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--primary-blue)', background: 'none', border: 'none', cursor: 'pointer' }}>View all →</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {(!dashData?.topFive || dashData.topFive.length === 0) ? (
                <div style={{ fontSize: 13, color: 'var(--ink-soft)', padding: 10 }}>No presentations completed yet</div>
              ) : dashData.topFive.map((item: any, idx: number) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 10, borderRadius: 14, transition: 'background .25s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(79,162,207,0.05)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <div className="num" style={{ width: 24, fontWeight: 700, fontSize: 14, color: idx === 0 ? 'var(--primary-blue)' : 'var(--ink-faint)', textAlign: 'center', flexShrink: 0 }}>{idx + 1}</div>
                  <div className="avatar-sm">{item.student?.name ? item.student.name.split(' ').map((w:string)=>w[0]).slice(0,2).join('') : '?'}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13.5px', fontWeight: 600 }}>{item.student?.name || 'Unknown'}</div>
                    <div style={{ fontSize: '11.5px', color: 'var(--ink-soft)' }}>{item.subject}</div>
                  </div>
                  <div className="num" style={{ fontWeight: 700, fontSize: 14, color: 'var(--primary-blue)' }}>{(item.overallRating || 0).toFixed ? item.overallRating.toFixed(1) : item.overallRating}</div>
                </div>
              ))}
            </div>
          </div>
          )}
        </Reveal>

        <Reveal delay={210} style={{ gridColumn: 'span 3' }}>
          {loading ? <SkeletonCard /> : (
          <div className="card" style={{ height: '100%' }}>
            <div style={{ marginBottom: 18 }}><span style={{ fontSize: 15, fontWeight: 600 }}>Statistics</span></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, height: 'calc(100% - 40px)' }}>
              {[
                { icon: '★', v: parseFloat(dashData?.averageRating || 0), decimal: 1, l: 'Average Rating' },
                { icon: '⏱', v: null, text: avgDurationSec > 0 ? fmtDuration(Math.round(avgDurationSec)) : '0 min', l: 'Avg. Presentation Time' },
                { icon: '☰', v: (dashData?.completed || 0), decimal: 0, l: 'Completed Presentations' },
                { icon: '🏆', v: null, text: dashData?.topFive?.[0]?.student?.name || 'N/A', l: 'Top Performer' },
              ].map((s, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,0.55)', border: '1px solid var(--line)', borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div style={{ width: 26, height: 26, borderRadius: 8, background: 'var(--light-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10, fontSize: 13, color: 'var(--primary-blue)' }}>{s.icon}</div>
                  <div className="num" style={{ fontSize: 18, fontWeight: 700, wordBreak: 'break-word' }}>
                    {s.v !== null ? <AnimatedNumber target={s.v} decimal={s.decimal} /> : s.text}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 2 }}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>
          )}
        </Reveal>
      </section>

      {/* Row 3: Recent / Trend */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(12,1fr)', gap: 24, alignItems: 'stretch' }}>
        <Reveal delay={70} style={{ gridColumn: 'span 8' }}>
          {loading ? <SkeletonCard /> : (
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <span style={{ fontSize: 15, fontWeight: 600 }}>Recent Presentations</span>
              <button onClick={() => navigate('/reports')} style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--primary-blue)', background: 'none', border: 'none', cursor: 'pointer' }}>View history →</button>
            </div>
            <table className="recent-table">
              <thead><tr><th>Student</th><th>Faculty</th><th>Rating</th><th>Duration</th><th>Time</th></tr></thead>
              <tbody>
                {recentPresentations.length === 0 ? (
                  <tr><td colSpan={5} style={{textAlign: 'center', color: 'var(--ink-soft)', padding: 20}}>No recent presentations</td></tr>
                ) : recentPresentations.map((p: any, i: number) => (
                  <tr key={i}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="avatar-xs">{p.student?.name ? p.student.name.substring(0,2).toUpperCase() : '?'}</div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{p.student?.name || 'Unknown'}</div>
                          <div style={{ fontSize: '11.5px', color: 'var(--ink-soft)' }}>{p.subject}</div>
                        </div>
                      </div>
                    </td>
                    <td>{p.faculty}</td>
                    <td><div className="rating-cell" style={{ color: 'var(--primary-blue)' }}><StarIcon/>{(p.overallRating || 0).toFixed ? (p.overallRating || 0).toFixed(1) : 0}</div></td>
                    <td><span className="num" style={{ fontWeight: 600 }}>{p.actualDuration ? fmtDuration(p.actualDuration) : '—'}</span></td>
                    <td style={{ color: 'var(--ink-soft)', fontSize: '12.5px' }}>{new Date(p.updatedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </Reveal>

        <Reveal delay={140} style={{ gridColumn: 'span 4' }}>
          {loading ? <SkeletonCard /> : (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ marginBottom: 2 }}><span style={{ fontSize: 15, fontWeight: 600 }}>Weekly Completion Trend</span></div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
              <div className="num" style={{ fontSize: 26, fontWeight: 700 }}>{weeklyTrend.total}</div>
              <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--primary-blue)' }}>this week</div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 14 }}>Presentations completed, Mon–Sat</div>
            <div style={{ marginTop: 'auto' }}>
              <TrendChart
                data={weeklyTrend.counts.length > 1 ? weeklyTrend.counts : [0,0,0,0,0,0]}
                labels={weeklyTrend.labels}
                todayIndex={weeklyTrend.todayIndex}
              />
            </div>
          </div>
          )}
        </Reveal>
      </section>
    </main>
  );
};

export default Dashboard;
