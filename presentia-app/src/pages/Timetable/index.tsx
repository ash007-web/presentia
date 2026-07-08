import React, { useState, useEffect } from 'react';
import Reveal from '../../components/common/Reveal';
import { getTimetable, saveTimetableDay, getSubjectFaculty, getTodayOverrides, createOverride, deleteOverride } from '../../services/timetableService';
import { getSettings } from '../../services/settingsService';
import { notify } from '../../utils/notify';

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const PERIODS = [
  '08:45 – 09:45',
  '09:45 – 10:45',
  '11:00 – 12:00',
  '12:00 – 13:00',
  '14:00 – 15:00',
  '15:00 – 16:00',
  '16:00 – 17:00'
];

const Timetable: React.FC = () => {
  const [tt, setTt] = useState<Record<string, any[]>>({
    Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: []
  });
  const [subjectFaculty, setSubjectFaculty] = useState<Record<string,string>>({});
  const [subjectList, setSubjectList] = useState<string[]>([]);
  
  const [activeCycleLabel, setActiveCycleLabel] = useState('');
  
  const [editing, setEditing] = useState<{day:string;i:number}|null>(null);
  const [savedCells, setSavedCells] = useState<Set<string>>(new Set());
  
  // Overrides list from backend
  const [overrides, setOverrides] = useState<any[]>([]);
  
  const [openForm, setOpenForm] = useState<number|null>(null);
  const [formData, setFormData] = useState<{subject:string;faculty:string}>({ subject:'', faculty:'' });

  const loadData = async () => {
    try {
      const [ttData, sfData, ovData] = await Promise.all([
        getTimetable(),
        getSubjectFaculty(),
        getTodayOverrides()
      ]);
      setTt(ttData);
      setSubjectFaculty(sfData);
      const keys = Object.keys(sfData);
      setSubjectList(keys);
      if (keys.length > 0) setFormData({ subject: keys[0], faculty: sfData[keys[0]] });
      setOverrides(ovData);
    } catch (err) {
      console.error('Failed to load timetable', err);
    }
  };

  useEffect(() => { 
    loadData();
    getSettings().then((s: any) => {
      if (s?.currentCycle) {
        setActiveCycleLabel(`Cycle ${s.currentCycle.cycleNumber} · ${s.currentCycle.semester}`);
      }
    }).catch(console.error);
    const interval = setInterval(() => {
      loadData();
    }, 60000); // 1 minute
    return () => clearInterval(interval);
  }, []);

  const commitEdit = async (day:string, i:number, newSubject:string) => {
    const dayList = tt[day] || [];
    const dayPeriods = dayList.map((p: any) => ({ ...p })); // deep-copy

    const newFaculty = subjectFaculty[newSubject] || '';
    
    // Ensure array has enough elements, preserving existing period timing
    while (dayPeriods.length <= i) {
      const [startH, startM] = (PERIODS[dayPeriods.length] || '08:45 – 09:45').split(' – ')[0].replace('–','').trim().split(':').map(Number);
      dayPeriods.push({
        periodIndex: dayPeriods.length,
        subject: '',
        faculty: '',
        startTime: `${String(startH).padStart(2,'0')}:${String(startM||0).padStart(2,'0')}`,
        endTime: `${String(startH+1).padStart(2,'0')}:${String(startM||0).padStart(2,'0')}`
      });
    }
    
    // Update only subject+faculty, keep all other period fields intact
    dayPeriods[i] = { ...dayPeriods[i], subject: newSubject, faculty: newFaculty, periodIndex: i };
    
    // Optimistic update
    setTt(prev => ({ ...prev, [day]: dayPeriods }));
    const key = `${day}-${i}`;
    setSavedCells(prev => new Set(prev).add(key));
    setTimeout(() => setSavedCells(c => { const n = new Set(c); n.delete(key); return n; }), 1300);
    setEditing(null);

    // Save to DB
    try {
      await saveTimetableDay(day, dayPeriods);
      loadData();
      notify('Timetable Updated', `${day} schedule updated.`);
    } catch (err) {
      alert('Failed to save timetable change');
      loadData();
    }
  };

  const handleCreateOverride = async (i:number) => {
    try {
      await createOverride(i, formData.subject, formData.faculty);
      setOpenForm(null);
      loadData();
      notify('Override Applied', `Period ${i+1} overridden with ${formData.subject}.`, 'high');
    } catch (err: any) {
      alert(err.message || 'Failed to create override');
    }
  };

  const handleDeleteOverride = async (id: string) => {
    try {
      await deleteOverride(id);
      loadData();
      notify('Override Removed', 'Timetable override was cleared.', 'low');
    } catch (err: any) {
      alert(err.message || 'Failed to delete override');
    }
  };

  // Map overrides by period index for easy lookup
  const overrideMap: Record<number, any> = {};
  overrides.forEach(ov => { overrideMap[ov.periodIndex] = ov; });

  // Fix Timezone Logic: Use IST for current day and time
  const getISTData = () => {
    const istString = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
    const istDate = new Date(istString);
    const todayStr = istDate.toLocaleDateString('en-US', { weekday: 'long' });
    const currentMinutes = istDate.getHours() * 60 + istDate.getMinutes();
    return { todayStr, currentMinutes };
  };

  const { todayStr, currentMinutes } = getISTData();

  // Compute Active and Next Periods in Frontend
  let activePeriodIndex = -1;
  let activePeriod: any = null;
  let nextPeriod: any = null;

  const todayPeriods = tt[todayStr] || [];

  for (let i = 0; i < PERIODS.length; i++) {
    const [startStr, endStr] = PERIODS[i].split(' – ');
    const [sh, sm] = startStr.split(':').map(Number);
    const [eh, em] = endStr.split(':').map(Number);
    const startMins = sh * 60 + sm;
    const endMins = eh * 60 + em;
    if (currentMinutes >= startMins && currentMinutes < endMins) {
      activePeriodIndex = i;
      break;
    }
  }

  const resolvePeriodData = (index: number) => {
    if (index < 0 || index >= PERIODS.length) return null;
    const [startStr, endStr] = PERIODS[index].split(' – ');
    const origP = todayPeriods[index] || {};
    const ov = overrideMap[index];
    const subject = ov ? ov.subject : (origP.subject || '');
    const faculty = ov ? ov.faculty : (origP.faculty || '');
    if (!subject) return null;
    return { periodIndex: index, subject, faculty, startTime: startStr, endTime: endStr };
  };

  activePeriod = resolvePeriodData(activePeriodIndex);

  if (activePeriodIndex !== -1) {
    for (let i = activePeriodIndex + 1; i < PERIODS.length; i++) {
      const p = resolvePeriodData(i);
      if (p) { nextPeriod = p; break; }
    }
  } else {
    for (let i = 0; i < PERIODS.length; i++) {
      const [startStr] = PERIODS[i].split(' – ');
      const [sh, sm] = startStr.split(':').map(Number);
      if (currentMinutes < sh * 60 + sm) {
        const p = resolvePeriodData(i);
        if (p) { nextPeriod = p; break; }
      }
    }
  }

  return (
    <main style={{ maxWidth:1400, margin:'0 auto', padding:'36px 40px 80px' }}>
      <Reveal style={{ display:'flex',alignItems:'flex-end',justifyContent:'space-between',gap:24,marginBottom:28,flexWrap:'wrap' }}>
        <div>
          <p className="eyebrow"><span className="dot"/>{activeCycleLabel || 'Presentia'}</p>
          <h1 style={{ fontSize:32,fontWeight:600,marginBottom:8 }}>Timetable Management</h1>
          <p style={{ color:'var(--ink-soft)',fontSize:15,maxWidth:560 }}>Click any period to edit it in place. The current subject is highlighted automatically.</p>
        </div>
        <div style={{ display:'flex',alignItems:'center',gap:7,padding:'9px 16px',borderRadius:100,background:'rgba(255,255,255,0.55)',border:'1px solid var(--line)',fontSize:'12.5px',fontWeight:600,color:'var(--ink-soft)' }}>
          <svg viewBox="0 0 24 24" fill="none" style={{ width:13,height:13 }}><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/><path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          Current Day: {todayStr}
        </div>
      </Reveal>

      {/* Live Info Card */}
      <Reveal delay={30} style={{ marginBottom:28 }}>
        <div className="card" style={{ display:'flex',alignItems:'center',justifyContent:'space-between',background:'linear-gradient(135deg, rgba(255,255,255,0.7) 0%, rgba(214,232,242,0.6) 100%)',border:'1px solid rgba(79,162,207,0.4)',boxShadow:'var(--shadow-sm)' }}>
          <div style={{ display:'flex',alignItems:'center',gap:24 }}>
            <div>
              <div style={{ fontSize:11,color:'var(--ink-soft)',textTransform:'uppercase',letterSpacing:'.05em',fontWeight:700,marginBottom:4 }}>Current Period</div>
              {activePeriod ? (
                <>
                  <div style={{ fontSize:20,fontWeight:700 }}>{activePeriod.subject}</div>
                  <div style={{ fontSize:14,color:'var(--ink-soft)',marginTop:2 }}>{activePeriod.faculty} (P{activePeriod.periodIndex+1})</div>
                </>
              ) : (
                <div style={{ fontSize:18,fontWeight:600,color:'var(--ink-faint)' }}>None / Free Period</div>
              )}
            </div>
            {nextPeriod && (
              <div style={{ paddingLeft:24,borderLeft:'1px solid rgba(79,162,207,0.3)' }}>
                <div style={{ fontSize:11,color:'var(--ink-soft)',textTransform:'uppercase',letterSpacing:'.05em',fontWeight:700,marginBottom:4 }}>Next Period</div>
                <div style={{ fontSize:16,fontWeight:600 }}>{nextPeriod.subject}</div>
                <div style={{ fontSize:13,color:'var(--ink-soft)',marginTop:1 }}>{nextPeriod.faculty} (P{nextPeriod.periodIndex+1})</div>
              </div>
            )}
          </div>
          {activePeriod && (
            <div style={{ textAlign:'right' }}>
              <div style={{ display:'flex',alignItems:'center',gap:6,justifyContent:'flex-end',fontSize:12,fontWeight:700,color:'var(--primary-blue)',marginBottom:4 }}>
                <span style={{ width:6,height:6,borderRadius:'50%',background:'var(--primary-blue)',animation:'pulseDot 1.8s infinite' }}/>
                Class in progress
              </div>
              <div style={{ fontFamily:"'Space Grotesk',monospace",fontSize:13,color:'var(--ink-soft)' }}>{activePeriod.startTime} – {activePeriod.endTime}</div>
            </div>
          )}
        </div>
      </Reveal>

      <div style={{ display:'grid',gridTemplateColumns:'1fr 340px',gap:24,alignItems:'start' }}>
        {/* Week grid */}
        <Reveal delay={70}>
          <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14 }}>
            <span style={{ fontSize:15,fontWeight:600 }}>Weekly Schedule</span>
            <span style={{ fontSize:12,color:'var(--ink-faint)' }}>7 periods · 1 hr each</span>
          </div>
          <div style={{ overflowX:'auto',paddingBottom:6 }}>
            <div style={{ display:'grid',gridTemplateColumns:'repeat(6,minmax(172px,1fr))',gap:14,minWidth:820 }}>
              {DAYS.map(day => {
                const isToday = day === todayStr;
                return (
                  <div key={day} style={{ display:'flex',flexDirection:'column',gap:10 }}>
                    <div style={{ textAlign:'center',padding:'6px 0 10px' }}>
                      <div style={{ fontSize:'13.5px',fontWeight:700,color:isToday?'var(--primary-blue)':'var(--ink)' }}>{day}</div>
                      {isToday && <span style={{ display:'inline-block',marginTop:5,fontSize:9,fontWeight:700,letterSpacing:'.07em',textTransform:'uppercase',padding:'3px 9px',borderRadius:100,background:'var(--light-blue)',color:'#2C7BA6' }}>Today</span>}
                    </div>
                    {PERIODS.map((time,i) => {
                      const isLive = isToday && i === activePeriodIndex;
                      const ov = isToday ? overrideMap[i] : null;
                      
                      const dayList = tt[day] || [];
                      const origP = dayList[i] || {};
                      
                      const subject = ov ? ov.subject : (origP.subject || '');
                      const faculty = ov ? ov.faculty : (origP.faculty || '');
                      
                      const isEditing = editing?.day === day && editing?.i === i;
                      const key = `${day}-${i}`;
                      const isSaved = savedCells.has(key);
                      
                      return (
                        <div key={i} onClick={()=>{ if(!isEditing) setEditing({day,i}); }}
                          style={{ position:'relative',background:isLive?'rgba(214,232,242,0.6)':'rgba(255,255,255,0.55)',border:isLive?'1px solid rgba(79,162,207,0.55)':ov?'1px solid rgba(215,25,32,0.3)':'1px solid rgba(255,255,255,0.7)',borderRadius:15,padding:'12px 13px 11px',boxShadow:isLive?'0 0 0 4px rgba(79,162,207,0.12),var(--shadow-md)':'var(--shadow-sm)',cursor:isEditing?'default':'pointer',transition:'transform .3s,box-shadow .3s,background .3s' }}>
                          {ov && <span style={{ position:'absolute',top:0,right:0,width:0,height:0,borderStyle:'solid',borderWidth:'0 18px 18px 0',borderColor:'transparent rgba(215,25,32,0.55) transparent transparent',borderTopRightRadius:15 }}/>}
                          {isSaved && <svg style={{ position:'absolute',top:8,right:9,width:13,height:13,color:'var(--primary-blue)' }} viewBox="0 0 24 24" fill="none"><path d="M5 12l4 4 10-10" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                          {isEditing ? (
                            <div style={{ display:'flex',flexDirection:'column',gap:6 }} onClick={e=>e.stopPropagation()}>
                              <span style={{ fontSize:10.5,fontFamily:"'Space Grotesk',monospace",color:'var(--ink-soft)' }}>P{i+1} · {time}</span>
                              <select className="mini-select" defaultValue={subject} style={{ width:'100%',fontSize:11,padding:'6px 7px',borderRadius:8,border:'1px solid var(--line)',background:'white',color:'var(--ink)',fontFamily:'inherit' }}
                                id={`subj-${key}`}>
                                <option value="">- None -</option>
                                {subjectList.map(s=><option key={s} value={s}>{s}</option>)}
                              </select>
                              <button onClick={()=>{ const el=document.getElementById(`subj-${key}`) as HTMLSelectElement|null; if(el) commitEdit(day,i,el.value); }} style={{ alignSelf:'flex-end',fontSize:10,fontWeight:700,color:'var(--primary-blue)',padding:'2px 4px',background:'none',border:'none',cursor:'pointer' }}>Done ✓</button>
                            </div>
                          ) : (
                            <>
                              <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:7 }}>
                                <span style={{ fontSize:10,fontWeight:700,color:'var(--ink-faint)',letterSpacing:'.04em' }}>P{i+1}</span>
                                <span style={{ fontFamily:"'Space Grotesk',monospace",fontSize:'10.5px',color:'var(--ink-soft)' }}>{time}</span>
                              </div>
                              <div style={{ fontSize:13,fontWeight:700,lineHeight:1.32,marginBottom:2 }}>{subject || <span style={{color:'var(--ink-faint)', fontWeight:500}}>Free Period</span>}</div>
                              {faculty && <div style={{ fontSize:11,color:'var(--ink-soft)' }}>{faculty}</div>}
                              {isLive && <div style={{ display:'flex',alignItems:'center',gap:4,fontSize:9,fontWeight:700,textTransform:'uppercase',letterSpacing:'.05em',color:'var(--primary-blue)',marginTop:6 }}>
                                <span style={{ width:5,height:5,borderRadius:'50%',background:'var(--primary-blue)',animation:'pulseDot 1.8s infinite' }}/> Live now
                              </div>}
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </Reveal>

        {/* Override panel */}
        <Reveal delay={140}>
          <div className="card" style={{ position:'sticky',top:100 }}>
            <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12 }}>
              <span style={{ fontSize:15,fontWeight:600 }}>Today's Override</span>
              <span style={{ display:'flex',alignItems:'center',gap:7,padding:'6px 12px',borderRadius:100,background:'rgba(255,255,255,0.55)',border:'1px solid var(--line)',fontSize:11,fontWeight:600,color:'var(--ink-soft)' }}>{todayStr}</span>
            </div>
            <div style={{ display:'flex',gap:9,fontSize:'11.5px',color:'var(--ink-soft)',lineHeight:1.5,background:'rgba(255,255,255,0.5)',border:'1px dashed var(--line)',borderRadius:13,padding:'11px 13px',marginBottom:18 }}>
              <svg viewBox="0 0 24 24" fill="none" style={{ width:15,height:15,color:'var(--primary-blue)',flexShrink:0,marginTop:1 }}><path d="M12 9v4M12 17h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/></svg>
              Overrides apply only to today's schedule and reset automatically at midnight.
            </div>
            <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
              {PERIODS.map((time,i) => {
                const isLive = i === activePeriodIndex;
                const ov = overrideMap[i];
                
                const dayList = tt[todayStr] || [];
                const origP = dayList[i] || {};
                const origSubject = origP.subject || '';
                const origFaculty = origP.faculty || '';
                
                const isFormOpen = openForm === i;
                
                return (
                  <div key={i} style={{ padding:'14px 15px',borderRadius:15,background:isLive?'rgba(214,232,242,0.4)':ov?'rgba(215,25,32,0.045)':'rgba(255,255,255,0.5)',border:isLive?'1px solid rgba(79,162,207,0.4)':ov?'1px solid rgba(215,25,32,0.28)':'1px solid var(--line)',transition:'all .3s' }}>
                    <div style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:10,marginBottom:2 }}>
                      <div>
                        <div style={{ fontFamily:"'Space Grotesk',monospace",fontSize:11,color:'var(--ink-soft)',marginBottom:3 }}>P{i+1} · {time}{isLive?<span style={{ color:'var(--primary-blue)',fontWeight:700 }}> · Live</span>:''}</div>
                        <div style={{ fontSize:'13.5px',fontWeight:600 }}>{ov?ov.subject:(origSubject || 'Free Period')}</div>
                        <div style={{ fontSize:'11.5px',color:'var(--ink-soft)' }}>{ov?ov.faculty:origFaculty}</div>
                        {ov && origSubject && <div style={{ textDecoration:'line-through',color:'var(--ink-faint)',fontSize:11,marginTop:4 }}>Originally {origSubject}</div>}
                      </div>
                      {ov ? <span style={{ fontSize:9,fontWeight:700,textTransform:'uppercase',letterSpacing:'.05em',padding:'4px 9px',borderRadius:100,background:'rgba(215,25,32,0.1)',color:'var(--primary-red)',whiteSpace:'nowrap' }}>Overridden</span>
                           : <button onClick={()=>setOpenForm(isFormOpen?null:i)} style={{ fontSize:11,fontWeight:700,color:'var(--primary-blue)',padding:'6px 12px',borderRadius:100,background:'var(--light-blue)',whiteSpace:'nowrap',border:'none',cursor:'pointer',transition:'all .2s' }}>Override</button>}
                    </div>
                    {ov && <button onClick={()=>handleDeleteOverride(ov._id)} style={{ fontSize:11,fontWeight:600,color:'var(--primary-red)',marginTop:8,background:'none',border:'none',cursor:'pointer' }}>Remove override</button>}
                    
                    {isFormOpen && !ov && (
                      <div style={{ marginTop:11,display:'flex',flexDirection:'column',gap:8 }}>
                        <select value={formData.subject} onChange={e=>setFormData(d=>({ ...d,subject:e.target.value,faculty:subjectFaculty[e.target.value]||'' }))} style={{ fontSize:12,padding:'9px 11px',borderRadius:10,border:'1px solid var(--line)',background:'white',color:'var(--ink)',fontFamily:'inherit' }}>
                          <option value="">- Select Subject -</option>
                          {subjectList.map(s=><option key={s} value={s}>{s}</option>)}
                        </select>
                        <select value={formData.faculty} onChange={e=>setFormData(d=>({ ...d,faculty:e.target.value }))} style={{ fontSize:12,padding:'9px 11px',borderRadius:10,border:'1px solid var(--line)',background:'white',color:'var(--ink)',fontFamily:'inherit' }}>
                          <option value="">- Select Faculty -</option>
                          {Array.from(new Set(Object.values(subjectFaculty))).map(f=><option key={f as string} value={f as string}>{f as string}</option>)}
                        </select>
                        <div style={{ display:'flex',gap:8,marginTop:2 }}>
                          <button onClick={()=>handleCreateOverride(i)} disabled={!formData.subject || !formData.faculty} style={{ flex:1,background:'var(--primary-blue)',color:'white',fontSize:12,fontWeight:700,padding:9,borderRadius:10,border:'none',cursor:'pointer',transition:'all .2s', opacity: (!formData.subject || !formData.faculty) ? 0.5 : 1 }}>Apply</button>
                          <button onClick={()=>setOpenForm(null)} style={{ fontSize:12,fontWeight:600,color:'var(--ink-soft)',padding:'9px 12px',background:'none',border:'none',cursor:'pointer' }}>Cancel</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </Reveal>
      </div>
    </main>
  );
};

export default Timetable;
