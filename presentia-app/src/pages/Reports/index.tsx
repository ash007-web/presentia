import React, { useState, useRef, useEffect } from 'react';
import Reveal from '../../components/common/Reveal';
import AnimatedNumber from '../../components/common/AnimatedNumber';
import { getReports, exportReportXLSX, downloadBlob } from '../../services/reportService';
import { getSettings } from '../../services/settingsService';
import { fmtDuration, fmtDate, initialsOf, addRipple } from '../../utils/helpers';
import { notify } from '../../utils/notify';

interface ExportEntry { name:string; meta:string; date:string; size:string; format:string; isNew?:boolean; }

const Reports: React.FC = () => {
  const [filters, setFilters] = useState({ cycle:'all',subject:'all',faculty:'all',from:'',to:'',student:'' });
  const [isExporting, setIsExporting] = useState(false);
  const [exports, setExports] = useState<ExportEntry[]>([]);
  const exportBtnRef = useRef<HTMLButtonElement>(null);
  const [reportRecords, setReportRecords] = useState<any[]>([]);
  const [defaultDuration, setDefaultDuration] = useState(120);
  const [activeCycleLabel, setActiveCycleLabel] = useState('');
  
  // Dynamic filter options derived from records
  // cycleOptions: [{id, label}], subjectOptions/facultyOptions: string[]
  const [cycleOptions, setCycleOptions] = useState<{id:string; label:string}[]>([]);
  const [subjectOptions, setSubjectOptions] = useState<string[]>([]);
  const [facultyOptions, setFacultyOptions] = useState<string[]>([]);

  useEffect(() => {
    getReports().then(data => {
      const records = data || [];
      setReportRecords(records);
      // Extract unique cycles keeping both _id and display label
      const cycleMap = new Map<string, string>();
      records.forEach((p: any) => {
        if (p.cycle?._id && p.cycle.cycleNumber !== undefined) {
          cycleMap.set(p.cycle._id, `Cycle ${p.cycle.cycleNumber}`);
        }
      });
      const cycles = Array.from(cycleMap.entries()).map(([id, label]) => ({ id, label }));
      cycles.sort((a, b) => a.label.localeCompare(b.label));
      setCycleOptions(cycles);
      const subjects = Array.from(new Set(records.map((p: any) => p.subject).filter(Boolean))) as string[];
      const faculties = Array.from(new Set(records.map((p: any) => p.faculty).filter(Boolean))) as string[];
      setSubjectOptions(subjects.sort());
      setFacultyOptions(faculties.sort());
    });
    getSettings().then((s: any) => {
      if (s?.defaultDuration) setDefaultDuration(s.defaultDuration);
      if (s?.currentCycle) {
        setActiveCycleLabel(`Cycle ${s.currentCycle.cycleNumber} · ${s.currentCycle.semester}`);
      }
    });
  }, []);

  const safeDate = (d: any) => {
    if (!d) return null;
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? null : dt;
  };

  const filtered = reportRecords.map((p: any) => ({
    id: p._id,
    name: p.student?.name || 'Unknown',
    roll: p.student?.rollNo || '',
    subject: p.subject || '',
    faculty: p.faculty || '',
    cycleLabel: p.cycle ? `Cycle ${p.cycle.cycleNumber}` : '',
    cycleId: p.cycle?._id || '',
    rating: p.overallRating || 0,
    duration: p.actualDuration || 0,
    date: p.presentationDate || p.createdAt
  })).filter((r: any) => {
    if(filters.cycle!=='all' && r.cycleId !== filters.cycle) return false;
    if(filters.subject!=='all'&&r.subject!==filters.subject) return false;
    if(filters.faculty!=='all'&&r.faculty!==filters.faculty) return false;
    const d = safeDate(r.date);
    if(filters.from && d && d < new Date(filters.from)) return false;
    if(filters.to && d && d > new Date(filters.to)) return false;
    const t=filters.student.trim().toLowerCase();
    if(t&&!r.name.toLowerCase().includes(t)&&!r.roll.toLowerCase().includes(t)) return false;
    return true;
  });

  const avgRating = filtered.length ? filtered.reduce((a,r)=>a+r.rating,0)/filtered.length : 0;
  const avgDuration = filtered.length ? Math.round(filtered.reduce((a,r)=>a+r.duration,0)/filtered.length) : 0;
  const uniqueStudents = new Set(filtered.map(r=>r.roll)).size;

  const startExport = async () => {
    setIsExporting(true);
    
    try {
      const blob = await exportReportXLSX({
        ids: filtered.map(r => r.id).join(','),
        cycle: filters.cycle !== 'all' ? filters.cycle : undefined,
        subject: filters.subject !== 'all' ? filters.subject : undefined,
        faculty: filters.faculty !== 'all' ? filters.faculty : undefined,
        startDate: filters.from || undefined,
        endDate: filters.to || undefined,
      });
      
      const cycleLabel = cycleOptions.find(c => c.id === filters.cycle)?.label;
      const cycleL = filters.cycle === 'all' ? '' : `_${(cycleLabel || filters.cycle).replace(/\s/g,'_')}`;
      const dateString = new Date().toISOString().split('T')[0];
      const filename = `Presentia_Report${cycleL}_${dateString}.xlsx`;
      const sz = Math.round(blob.size / 1024);
      
      downloadBlob(blob, filename);
      
      setExports(prev => [{ 
        name: filename, 
        meta:`${filters.cycle==='all'?'All cycles':(cycleLabel||filters.cycle)} · ${filters.subject==='all'?'All subjects':filters.subject}`, 
        date: new Date().toLocaleString('en-IN', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }), 
        size:`${sz} KB`, 
        format: 'XLSX', 
        isNew:true 
      }, ...prev]);
      
      notify('Export Successful', `${filename} downloaded successfully.`);
    } catch (err) {
      notify('Export Failed', 'Failed to export report. Please try again.', 'high');
    } finally {
      setIsExporting(false);
    }
  };

  const fileIconSVG = (fmt:string) => {
    if(fmt==='PDF') return <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>;
    if(fmt==='CSV') return <><rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.8"/><path d="M3 10h18M9 10v10" stroke="currentColor" strokeWidth="1.8"/></>;
    return <><rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.8"/><path d="M8 9l8 6M16 9l-8 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></>;
  };

  return (
    <main style={{ maxWidth:1360,margin:'0 auto',padding:'36px 40px 80px' }}>
      {/* Header */}
      <Reveal style={{ display:'flex',alignItems:'flex-end',justifyContent:'space-between',gap:24,marginBottom:26,flexWrap:'wrap' }}>
        <div>
          <p className="eyebrow"><span className="dot"/>{activeCycleLabel || 'Presentia'}</p>
          <h1 style={{ fontSize:32,fontWeight:600,marginBottom:8 }}>Reports</h1>
          <p style={{ color:'var(--ink-soft)',fontSize:15,maxWidth:560 }}>Filter presentation records across any cycle, subject or student, then export a clean copy.</p>
        </div>
        <div style={{ position:'relative' }}>
          <button ref={exportBtnRef} disabled={isExporting} className="btn-primary" onClick={e=>{ addRipple(e,e.currentTarget); startExport(); }} style={{ opacity: isExporting ? 0.75 : 1, cursor: isExporting ? 'not-allowed' : 'pointer' }}>
            {isExporting ? (
              <svg viewBox="0 0 24 24" fill="none" style={{ width:15,height:15, animation: 'spin 1.5s linear infinite' }}><path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" style={{ width:15,height:15 }}><path d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            )}
            {isExporting ? 'Exporting...' : 'Export Report'}
          </button>
        </div>
      </Reveal>

      <Reveal delay={70} style={{ display:'flex',alignItems:'center',gap:12,marginBottom:24,flexWrap:'wrap' }}>
        {/* Cycle filter */}
        <div className="select-wrap">
          <select className="select-input" value={filters.cycle} onChange={e=>setFilters(f=>({...f,cycle:e.target.value}))}>
            <option value="all">All cycles</option>
            {cycleOptions.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          <svg viewBox="0 0 24 24" fill="none" style={{ position:'absolute',right:13,top:'50%',transform:'translateY(-50%)',width:12,height:12,color:'var(--ink-faint)',pointerEvents:'none' }}><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        {/* Subject filter */}
        <div className="select-wrap">
          <select className="select-input" value={filters.subject} onChange={e=>setFilters(f=>({...f,subject:e.target.value}))}>
            <option value="all">All subjects</option>
            {subjectOptions.map(s=><option key={s} value={s}>{s}</option>)}
          </select>
          <svg viewBox="0 0 24 24" fill="none" style={{ position:'absolute',right:13,top:'50%',transform:'translateY(-50%)',width:12,height:12,color:'var(--ink-faint)',pointerEvents:'none' }}><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        {/* Faculty filter */}
        <div className="select-wrap">
          <select className="select-input" value={filters.faculty} onChange={e=>setFilters(f=>({...f,faculty:e.target.value}))}>
            <option value="all">All faculty</option>
            {facultyOptions.map(f=><option key={f} value={f}>{f}</option>)}
          </select>
          <svg viewBox="0 0 24 24" fill="none" style={{ position:'absolute',right:13,top:'50%',transform:'translateY(-50%)',width:12,height:12,color:'var(--ink-faint)',pointerEvents:'none' }}><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <input type="date" value={filters.from} onChange={e=>setFilters(f=>({...f,from:e.target.value}))} style={{ padding:'10px 14px',borderRadius:100,background:'rgba(255,255,255,0.55)',border:'1px solid var(--line)',fontSize:13,fontWeight:600,color:'var(--ink-soft)' }}/>
        <span style={{ fontSize:12,color:'var(--ink-faint)' }}>to</span>
        <input type="date" value={filters.to} onChange={e=>setFilters(f=>({...f,to:e.target.value}))} style={{ padding:'10px 14px',borderRadius:100,background:'rgba(255,255,255,0.55)',border:'1px solid var(--line)',fontSize:13,fontWeight:600,color:'var(--ink-soft)' }}/>
        <div className="search-box" style={{ minWidth:200 }}>
          <svg viewBox="0 0 24 24" fill="none" style={{ width:15,height:15,color:'var(--ink-faint)',flexShrink:0 }}><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2"/><path d="M21 21l-4.3-4.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          <input type="text" value={filters.student} onChange={e=>setFilters(f=>({...f,student:e.target.value}))} placeholder="Search student…"/>
        </div>
        <button onClick={()=>setFilters({cycle:'all',subject:'all',faculty:'all',from:'',to:'',student:''})} style={{ fontSize:'12.5px',fontWeight:600,color:'var(--ink-faint)',padding:'8px 4px',background:'none',border:'none',cursor:'pointer',transition:'color .2s' }}>Clear filters</button>
      </Reveal>

      {/* Summary cards */}
      <section style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:20,marginBottom:28 }}>
        {[
          { v:filtered.length, decimal:0, l:'Matching Presentations' },
          { v:avgRating, decimal:2, l:'Average Rating' },
          { v:null, text:fmtDuration(avgDuration), l:'Avg. Presentation Time' },
          { v:uniqueStudents, decimal:0, l:'Students Covered' },
        ].map((s,i)=>(
          <Reveal key={i} delay={i*50}>
            <div className="card" style={{ display:'flex',flexDirection:'column',gap:10 }}>
              <div style={{ width:38,height:38,borderRadius:11,background:'var(--light-blue)',display:'flex',alignItems:'center',justifyContent:'center' }}>
                <svg viewBox="0 0 24 24" fill="none" style={{ width:17,height:17,color:'var(--primary-blue)' }}>
                  {i===0?<><rect x="3" y="4" width="18" height="4" rx="1" stroke="currentColor" strokeWidth="2"/><rect x="3" y="10" width="18" height="4" rx="1" stroke="currentColor" strokeWidth="2"/><rect x="3" y="16" width="18" height="4" rx="1" stroke="currentColor" strokeWidth="2"/></>
                  :i===1?<path d="M12 2l2.9 6.6 7.1.6-5.4 4.6 1.7 6.9L12 17l-6.3 3.7 1.7-6.9-5.4-4.6 7.1-.6z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
                  :i===2?<><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/><path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></>
                  :<><path d="M17 21v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><circle cx="10" cy="7" r="4" stroke="currentColor" strokeWidth="2"/></>}
                </svg>
              </div>
              <div className="num" style={{ fontSize:30,fontWeight:700 }}>
                {s.v!==null?<AnimatedNumber target={s.v} decimal={s.decimal}/>:s.text}
              </div>
              <div style={{ fontSize:'12.5px',color:'var(--ink-soft)' }}>{s.l}</div>
            </div>
          </Reveal>
        ))}
      </section>

      <div style={{ display:'grid',gridTemplateColumns:'1.6fr 1fr',gap:24,alignItems:'start' }}>
        {/* Preview table */}
        <Reveal delay={70}>
          <div className="card">
            <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18 }}>
              <span style={{ fontSize:15,fontWeight:600 }}>Report Preview</span>
            </div>
            <table className="recent-table">
              <thead><tr><th>Student</th><th>Faculty</th><th>Cycle</th><th>Rating</th><th>Duration</th><th>Date</th></tr></thead>
              <tbody>
                {filtered.length===0 ? (
                  <tr><td colSpan={6} style={{ textAlign:'center',padding:'40px 10px',color:'var(--ink-faint)',fontSize:13 }}>No records match these filters. Try widening your date range or clearing a filter.</td></tr>
                ) : filtered.slice(0,8).map((r,i) => (
                  <tr key={i}>
                    <td><div style={{ display:'flex',alignItems:'center',gap:10 }}>
                      <div className="avatar-xs">{initialsOf(r.name)}</div>
                      <div><div style={{ fontWeight:600 }}>{r.name}</div><div style={{ fontSize:'11.5px',color:'var(--ink-soft)' }}>{r.subject}</div></div>
                    </div></td>
                    <td>{r.faculty}</td><td>{r.cycleLabel}</td>
                    <td><div className="rating-cell" style={{ color:'var(--primary-blue)' }}><svg viewBox="0 0 24 24" fill="currentColor" style={{ width:12,height:12 }}><path d="M12 2l2.9 6.6 7.1.6-5.4 4.6 1.7 6.9L12 17l-6.3 3.7 1.7-6.9-5.4-4.6 7.1-.6z"/></svg>{r.rating.toFixed(1)}</div></td>
                    <td><span className="num" style={{ fontWeight:600,color:r.duration>defaultDuration?'var(--primary-red)':'inherit' }}>{fmtDuration(r.duration)}</span></td>
                    <td style={{ color:'var(--ink-soft)',fontSize:'12.5px' }}>{fmtDate(r.date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 10px 0',borderTop:'1px solid var(--line)',marginTop:6,fontSize:'12.5px',color:'var(--ink-soft)' }}>
              <span>Showing <b style={{ color:'var(--ink)' }}>{Math.min(filtered.length,8)}</b> of <b style={{ color:'var(--ink)' }}>{reportRecords.length}</b> total records</span>
              <span>{filtered.length} match current filters</span>
            </div>
          </div>
        </Reveal>

        {/* Recent exports */}
        <Reveal delay={140}>
          <div className="card">
            <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18 }}>
              <span style={{ fontSize:15,fontWeight:600 }}>Recent Exports</span>
            </div>
            <div style={{ display:'flex',flexDirection:'column',gap:4 }}>
              {exports.map((exp,i)=>(
                <div key={i} style={{ display:'flex',alignItems:'center',gap:14,padding:'14px 10px',borderRadius:14,transition:'background .3s',animation:exp.isNew?'exportEnter .6s var(--ease)':undefined }}>
                  <div style={{ width:40,height:40,borderRadius:11,background:'var(--light-blue)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
                    <svg viewBox="0 0 24 24" fill="none" style={{ width:18,height:18,color:'var(--primary-blue)' }}>{fileIconSVG(exp.format)}</svg>
                  </div>
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ fontSize:'13.5px',fontWeight:600,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>{exp.name}</div>
                    <div style={{ fontSize:'11.5px',color:'var(--ink-soft)',marginTop:1 }}>{exp.meta} · {exp.date}</div>
                  </div>
                  <div className="num" style={{ fontSize:12,color:'var(--ink-faint)',width:60,textAlign:'right',flexShrink:0 }}>{exp.size}</div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>

    </main>
  );
};

export default Reports;
