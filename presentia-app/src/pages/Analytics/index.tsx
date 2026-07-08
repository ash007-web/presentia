import React, { useState, useEffect } from 'react';
import Reveal from '../../components/common/Reveal';
import { getAnalyticsOverview, getFacultyAnalytics, getSubjectAnalytics, getStudentAnalytics } from '../../services/analyticsService';
import { fmtDuration } from '../../utils/helpers';

const Analytics: React.FC = () => {
  const [overview, setOverview] = useState<any>(null);
  const [faculty, setFaculty] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getAnalyticsOverview(),
      getFacultyAnalytics(),
      getSubjectAnalytics(),
      getStudentAnalytics()
    ]).then(([o, f, s, st]) => {
      setOverview(o);
      setFaculty(f);
      setSubjects(s);
      setStudents(st);
      setLoading(false);
    }).catch(err => {
      console.error("Failed to load analytics", err);
      setLoading(false);
    });
  }, []);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '40vh' }}><div style={{ width: 40, height: 40, border: '3px solid var(--line)', borderTopColor: 'var(--primary-blue)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /></div>;

  return (
    <main style={{ maxWidth: 1400, margin: '0 auto', padding: '36px 40px 80px' }}>
      <Reveal style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 32, fontWeight: 600, marginBottom: 8 }}>Analytics & Insights</h1>
        <p style={{ color: 'var(--ink-soft)', fontSize: 15 }}>Comprehensive performance metrics across all faculties, subjects, and students.</p>
      </Reveal>

      {/* Overview Cards */}
      <Reveal delay={70}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 32 }}>
          {[
            { label: 'Total Presentations', val: overview?.totalPresentations || 0 },
            { label: 'Avg Rating', val: (overview?.averageRating || 0).toFixed(1) + ' ★' },
            { label: 'Avg Duration', val: fmtDuration(overview?.averageDuration || 0) },
            { label: 'Total Time Spent', val: Math.round((overview?.totalDuration || 0)/60) + ' mins' }
          ].map((s, i) => (
            <div key={i} className="card" style={{ padding: '20px 24px' }}>
              <div style={{ fontSize: 13, color: 'var(--ink-soft)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>{s.label}</div>
              <div className="num" style={{ fontSize: 28, fontWeight: 700, color: 'var(--primary-blue)' }}>{s.val}</div>
            </div>
          ))}
        </div>
      </Reveal>

      {/* Grid: Faculty & Subjects */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
        <Reveal delay={140}>
          <div className="card" style={{ height: '100%' }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Faculty Performance</h3>
            <table className="recent-table">
              <thead><tr><th style={{textAlign:'left'}}>Faculty</th><th>Presentations</th><th>Avg Rating</th></tr></thead>
              <tbody>
                {faculty.map((f, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{f._id}</td>
                    <td style={{ textAlign: 'center' }}>{f.count}</td>
                    <td style={{ textAlign: 'center', color: 'var(--primary-blue)', fontWeight: 700 }}>{(f.avgRating || 0).toFixed(1)}</td>
                  </tr>
                ))}
                {faculty.length === 0 && <tr><td colSpan={3} style={{textAlign:'center', color:'var(--ink-faint)', padding: 20}}>No data available</td></tr>}
              </tbody>
            </table>
          </div>
        </Reveal>

        <Reveal delay={210}>
          <div className="card" style={{ height: '100%' }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Subject Breakdown</h3>
            <table className="recent-table">
              <thead><tr><th style={{textAlign:'left'}}>Subject</th><th>Presentations</th><th>Avg Rating</th></tr></thead>
              <tbody>
                {subjects.map((s, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{s._id}</td>
                    <td style={{ textAlign: 'center' }}>{s.count}</td>
                    <td style={{ textAlign: 'center', color: 'var(--primary-blue)', fontWeight: 700 }}>{(s.avgRating || 0).toFixed(1)}</td>
                  </tr>
                ))}
                {subjects.length === 0 && <tr><td colSpan={3} style={{textAlign:'center', color:'var(--ink-faint)', padding: 20}}>No data available</td></tr>}
              </tbody>
            </table>
          </div>
        </Reveal>
      </div>

      {/* Top Students */}
      <Reveal delay={280}>
        <div className="card">
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Top Rated Students</h3>
          <table className="recent-table">
            <thead><tr><th style={{textAlign:'left'}}>Roll No</th><th style={{textAlign:'left'}}>Name</th><th>Presentations</th><th>Avg Rating</th></tr></thead>
            <tbody>
              {students.slice(0, 10).map((st, i) => (
                <tr key={i}>
                  <td style={{ color: 'var(--ink-soft)', fontWeight: 600 }}>{st.student?.rollNo}</td>
                  <td style={{ fontWeight: 600 }}>{st.student?.name}</td>
                  <td style={{ textAlign: 'center' }}>{st.count}</td>
                  <td style={{ textAlign: 'center', color: 'var(--primary-blue)', fontWeight: 700 }}>{(st.avgRating || 0).toFixed(1)}</td>
                </tr>
              ))}
              {students.length === 0 && <tr><td colSpan={4} style={{textAlign:'center', color:'var(--ink-faint)', padding: 20}}>No data available</td></tr>}
            </tbody>
          </table>
        </div>
      </Reveal>
    </main>
  );
};

export default Analytics;
