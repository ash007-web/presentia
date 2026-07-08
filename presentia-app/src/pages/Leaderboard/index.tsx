import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Reveal from '../../components/common/Reveal';
import { getLeaderboardWithHistory, exportLeaderboardData } from '../../services/leaderboardService';
import { downloadBlob } from '../../services/reportService';
import { notify } from '../../utils/notify';

const Leaderboard: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'current' | 'overall'>('current');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    setLoading(true);
    getLeaderboardWithHistory(activeTab).then(res => {
      setData(res || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [activeTab]);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const { blob, filename } = await exportLeaderboardData(activeTab, search);
      downloadBlob(blob, filename);
      notify('Export Successful', 'Leaderboard downloaded successfully.');
    } catch (err) {
      notify('Export Failed', 'Unable to download leaderboard.', 'high');
    } finally {
      setIsExporting(false);
    }
  };

  const filteredData = data.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    (s.rollNo && String(s.rollNo).toLowerCase().includes(search.toLowerCase()))
  );

  const top3 = filteredData.slice(0, 3);

  const podiumOrder = [
    top3[1] ? { ...top3[1], podiumRank: 2 } : null,
    top3[0] ? { ...top3[0], podiumRank: 1 } : null,
    top3[2] ? { ...top3[2], podiumRank: 3 } : null
  ];

  const getTrend = (history: number[]) => {
    if (!history || history.length < 2) return { text: '→ Stable', color: 'var(--ink-soft)' };
    const last = history[history.length - 1];
    const prev = history[history.length - 2];
    if (last > prev) return { text: '↑ Improving', color: 'var(--primary-blue)' };
    if (last < prev) return { text: '↓ Needs Attention', color: '#D71920' };
    return { text: '→ Stable', color: 'var(--ink-soft)' };
  };

  return (
    <main style={{ maxWidth: 1400, margin: '0 auto', padding: '36px 40px 80px' }}>
      <style>
        {`
          .podium-container { display: flex; justify-content: center; align-items: flex-end; gap: 24px; margin-bottom: 48px; min-height: 320px; }
          .podium-card { flex: 1 1 0; max-width: 280px; width: 100%; border-radius: 24px; padding: 28px 24px; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; position: relative; transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.4s; }
          .podium-card:hover { transform: translateY(-8px); }
          .podium-center { height: 280px; background: linear-gradient(145deg, rgba(255,255,255,1), rgba(246,250,253,0.9)); border: 1px solid rgba(79,162,207,0.3); box-shadow: 0 20px 40px -12px rgba(79,162,207,0.15); z-index: 2; }
          .podium-side { height: 240px; background: linear-gradient(145deg, rgba(255,255,255,0.8), rgba(250,250,250,0.6)); border: 1px solid rgba(255,255,255,0.8); box-shadow: 0 12px 24px -8px rgba(21,36,48,0.06); }
          
          .rank-table-grid { display: grid; grid-template-columns: 70px 100px minmax(180px, 1.5fr) 130px 140px 130px 150px 110px; align-items: center; gap: 16px; padding: 18px 24px; }
          .rank-row { border-bottom: 1px solid rgba(79,162,207,0.08); transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); border-radius: 16px; background: transparent; margin-bottom: 4px; }
          .rank-row:hover { background: rgba(255,255,255,0.8); box-shadow: 0 8px 20px -8px rgba(21,36,48,0.08); transform: scale(1.002) translateY(-1px); border-bottom-color: transparent; }

          @media (max-width: 992px) {
            .podium-container { gap: 16px; min-height: 280px; }
            .podium-center { height: 240px; }
            .podium-side { height: 210px; }
          }
          @media (max-width: 768px) {
            .podium-container { flex-direction: column; align-items: center; gap: 24px; }
            .podium-card { max-width: 100%; height: auto !important; padding: 20px; flex-direction: row; align-items: center; justify-content: space-between; }
            .podium-card > .medal-icon { position: static; margin-bottom: 0; margin-right: 16px; font-size: 28px !important; }
            .podium-card > .rank-bg { display: none; }
            .podium-card > .score-badge { margin-top: 0 !important; }
            .podium-order-1 { order: 1; }
            .podium-order-2 { order: 2; }
            .podium-order-3 { order: 3; }
          }
        `}
      </style>

      <Reveal style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, marginBottom: 40, flexWrap: 'wrap' }}>
        <div>
          <p className="eyebrow"><span className="dot" />Current Cycle Rankings</p>
          <h1 style={{ fontSize: 32, fontWeight: 600, marginBottom: 8 }}>Leaderboard</h1>
          <p style={{ color: 'var(--ink-soft)', fontSize: 15, maxWidth: 560 }}>Top performing students based on presentation evaluations.</p>
        </div>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="search-box" style={{ width: 220, background: 'var(--glass)', border: '1px solid var(--line)' }}>
            <svg viewBox="0 0 24 24" fill="none" style={{ width: 14, height: 14, color: 'var(--ink-faint)' }}><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2"/><path d="M21 21l-4.3-4.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search students..." style={{ background: 'transparent' }} />
          </div>
          <div style={{ display: 'flex', gap: 4, padding: 5, background: 'rgba(255,255,255,0.6)', borderRadius: 100, border: '1px solid var(--line)', backdropFilter: 'blur(8px)' }}>
            {['current', 'overall'].map(t => (
              <button key={t} onClick={() => setActiveTab(t as 'current' | 'overall')}
                style={{ padding: '8px 20px', borderRadius: 100, fontSize: 13, fontWeight: 600, textTransform: 'capitalize', border: 'none', transition: 'all .25s', cursor: 'pointer', background: activeTab === t ? 'white' : 'transparent', color: activeTab === t ? 'var(--ink)' : 'var(--ink-soft)', boxShadow: activeTab === t ? '0 2px 8px rgba(21,36,48,0.06)' : 'none' }}>
                {t === 'current' ? 'Current Cycle' : 'All Time'}
              </button>
            ))}
          </div>
          <button onClick={handleExport} disabled={isExporting} className="btn-secondary" style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid var(--line)', padding: '10px 18px', borderRadius: 100, fontSize: 13, fontWeight: 600, cursor: isExporting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8, opacity: isExporting ? 0.7 : 1 }}>
            {isExporting ? (
              <div style={{ width: 14, height: 14, border: '2px solid var(--primary-blue)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            ) : (
              <svg viewBox="0 0 24 24" fill="none" style={{ width: 14, height: 14 }}><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            )}
            {isExporting ? 'Exporting...' : 'Export'}
          </button>
        </div>
      </Reveal>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0' }}><div style={{ width: 40, height: 40, border: '3px solid var(--line)', borderTopColor: 'var(--primary-blue)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /></div>
      ) : data.length === 0 ? (
        <Reveal delay={70}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px 20px', textAlign: 'center', background: 'var(--glass)', borderRadius: 24, border: '1px solid var(--line)' }}>
            <div style={{ width: 120, height: 120, marginBottom: 24, opacity: 0.8 }}>
              <svg viewBox="0 0 24 24" fill="none" style={{ width: '100%', height: '100%', color: 'var(--light-blue)' }}>
                <path d="M12 2l2.9 6.6 7.1.6-5.4 4.6 1.7 6.9L12 17l-6.3 3.7 1.7-6.9-5.4-4.6 7.1-.6z" fill="currentColor" opacity="0.5"/>
                <circle cx="12" cy="12" r="10" stroke="var(--primary-blue)" strokeWidth="1" strokeDasharray="4 4" />
              </svg>
            </div>
            <h3 style={{ fontSize: 22, fontWeight: 600, marginBottom: 12 }}>No presentations completed yet.</h3>
            <p style={{ fontSize: 15, color: 'var(--ink-soft)', maxWidth: 400, marginBottom: 32, lineHeight: 1.5 }}>Start your first session to begin tracking performance and building the leaderboard.</p>
            <button onClick={() => navigate('/presentation')} className="btn-primary" style={{ padding: '14px 32px', fontSize: 15 }}>
              <svg viewBox="0 0 24 24" fill="none" style={{ width: 16, height: 16, marginRight: 8 }}><path d="M6 4l14 8-14 8V4z" fill="white"/></svg>
              Start First Presentation
            </button>
          </div>
        </Reveal>
      ) : (
        <>
          <Reveal delay={70}>
            <div className="podium-container">
              {podiumOrder.map((item, idx) => {
                if (!item) return <div key={idx} className="podium-card" style={{ visibility: 'hidden' }} />;
                const isCenter = item.podiumRank === 1;
                const medal = isCenter ? '🥇' : item.podiumRank === 2 ? '🥈' : '🥉';
                
                return (
                  <div key={item.rollNo} className={`podium-card podium-order-${item.podiumRank} ${isCenter ? 'podium-center' : 'podium-side'}`}>
                    <div className="medal-icon" style={{ position: 'absolute', top: -24, fontSize: 42, filter: 'drop-shadow(0 8px 12px rgba(0,0,0,0.15))', zIndex: 10 }}>{medal}</div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, width: '100%' }}>
                      <div className="rank-bg" style={{ fontSize: isCenter ? 84 : 64, fontWeight: 800, color: 'rgba(79,162,207,0.06)', marginTop: 10, lineHeight: 0.8, letterSpacing: '-0.04em' }}>
                        {item.podiumRank}
                      </div>
                      
                      <div style={{ textAlign: 'center', marginTop: isCenter ? 12 : 8, width: '100%' }}>
                        <div style={{ fontSize: isCenter ? 19 : 17, fontWeight: 700, color: 'var(--ink)', marginBottom: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                        <div style={{ fontSize: 13, color: 'var(--ink-soft)', fontWeight: 600, letterSpacing: '0.02em', textTransform: 'uppercase' }}>Roll No. {item.rollNo}</div>
                      </div>
                    </div>

                    <div className="score-badge" style={{ marginTop: 'auto', background: isCenter ? 'var(--primary-blue)' : 'var(--ink)', color: 'white', padding: '8px 20px', borderRadius: 100, fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, boxShadow: isCenter ? '0 8px 20px -6px rgba(79,162,207,0.4)' : '0 8px 20px -6px rgba(21,36,48,0.3)' }}>
                      <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 15, height: 15 }}><path d="M12 2l2.9 6.6 7.1.6-5.4 4.6 1.7 6.9L12 17l-6.3 3.7 1.7-6.9-5.4-4.6 7.1-.6z"/></svg>
                      {(item.averageRating || 0).toFixed(2)}
                    </div>
                  </div>
                );
              })}
            </div>
          </Reveal>

          <Reveal delay={140}>
            <div className="card" style={{ padding: '8px 12px', overflowX: 'auto', background: 'var(--glass)', border: '1px solid var(--line)', borderRadius: 24 }}>
              <div style={{ minWidth: 960 }}>
                <div className="rank-table-grid" style={{ borderBottom: '1px solid var(--line)', padding: '16px 24px', marginBottom: 8 }}>
                  {['Rank', 'Roll No', 'Student Name', 'Presentations', 'Avg Rating', 'Highest Rating', 'Trend', 'Status'].map((h, i) => (
                    <span key={h} style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--ink-faint)', textAlign: i === 7 ? 'right' : 'left' }}>{h}</span>
                  ))}
                </div>
              
                {filteredData.map((row, i) => {
                  const rank = i + 1;
                  const isTop3 = rank <= 3;
                  const trend = getTrend(row.ratingHistory);
                  const highestRating = row.ratingHistory && row.ratingHistory.length > 0 ? Math.max(...row.ratingHistory) : row.averageRating;
                  
                  return (
                    <div key={i} className="rank-table-grid rank-row" style={{ background: isTop3 ? 'rgba(255,255,255,0.6)' : 'transparent', border: isTop3 ? '1px solid rgba(255,255,255,0.8)' : '1px solid transparent', borderBottom: '1px solid rgba(79,162,207,0.08)' }}>
                      
                      <div className="num" style={{ fontSize: 15, fontWeight: 700, color: rank === 1 ? '#D97706' : rank === 2 ? '#4B5563' : rank === 3 ? '#92400E' : 'var(--ink-faint)' }}>
                        #{rank}
                      </div>

                      <div className="num" style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-soft)' }}>
                        {row.rollNo || 'N/A'}
                      </div>

                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {row.name}
                      </div>

                      <div style={{ fontSize: 13, color: 'var(--ink-soft)', fontWeight: 500 }}>
                        {row.count || 0} completed
                      </div>

                      <div className="num" style={{ fontSize: 15, fontWeight: 700, color: 'var(--primary-blue)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 12, height: 12 }}><path d="M12 2l2.9 6.6 7.1.6-5.4 4.6 1.7 6.9L12 17l-6.3 3.7 1.7-6.9-5.4-4.6 7.1-.6z"/></svg>
                        {(row.averageRating || 0).toFixed(2)}
                      </div>

                      <div className="num" style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-soft)' }}>
                        {(highestRating || 0).toFixed(2)}
                      </div>

                      <div style={{ fontSize: 13, fontWeight: 600, color: trend.color }}>
                        {trend.text}
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <span className="badge badge-completed">Completed</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Reveal>
        </>
      )}
    </main>
  );
};

export default Leaderboard;
