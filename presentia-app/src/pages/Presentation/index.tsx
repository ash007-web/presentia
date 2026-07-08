import React, { useState, useEffect, useRef, useCallback } from 'react';
import { startPresentation, pausePresentation, resumePresentation, finishPresentation, submitEvaluation, skipEvaluation, resetSession as apiResetSession, overrideActiveStudent } from '../../services/presentationService';
import { CRITERIA_NAMES } from '../../utils/constants';
import { pad } from '../../utils/helpers';
import { notify } from '../../utils/notify';
import { useTimetableIST } from '../../hooks/useTimetableIST';

const CIRCUMFERENCE = 1068.14;

const AnimatedLoadingModal = ({ type }: { type: 'page' | 'start' }) => {
  const [msgIndex, setMsgIndex] = useState(0);
  const pageMessages = [
    "Loading timetable...",
    "Detecting current class...",
    "Syncing presentation queue...",
    "Preparing evaluation workspace...",
    "Almost ready..."
  ];
  const startMessages = [
    "Preparing timer...",
    "Loading student...",
    "Syncing presentation session...",
    "Finalizing workspace..."
  ];
  const messages = type === 'page' ? pageMessages : startMessages;

  useEffect(() => {
    const int = setInterval(() => {
      setMsgIndex(i => (i + 1) % messages.length);
    }, 600);
    return () => clearInterval(int);
  }, [messages.length]);

  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'rgba(21,36,48,0.1)', backdropFilter: 'blur(4px)', zIndex: 9999, animation: 'fadeIn 0.3s ease-out' }}>
      <div style={{ background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(24px) saturate(150%)', border: '1px solid rgba(255,255,255,0.7)', borderRadius: 24, padding: '40px 48px', width: '90%', maxWidth: 420, boxShadow: 'var(--shadow-xl)', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', animation: 'scaleUp 0.3s ease-out' }}>
        <div style={{ fontSize: 36, marginBottom: 16, animation: type === 'start' ? 'pulseScale 1.5s ease-in-out infinite' : 'none' }}>🎤</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>{type === 'page' ? 'Preparing Presentation' : 'Starting Presentation'}</h2>
        
        {type === 'page' && (
          <p style={{ fontSize: 14, color: 'var(--ink-soft)', marginBottom: 24, lineHeight: 1.5 }}>
            Loading today's session...<br/>Please wait a moment.
          </p>
        )}

        <div style={{ width: '100%', height: 4, background: 'rgba(79,162,207,0.15)', borderRadius: 4, overflow: 'hidden', position: 'relative', marginBottom: 16, marginTop: type === 'start' ? 24 : 0 }}>
          <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: '40%', background: 'var(--primary-blue)', borderRadius: 4, animation: 'progressIndeterminate 1.2s ease-in-out infinite' }} />
        </div>

        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary-blue)', height: 20, overflow: 'hidden', position: 'relative', width: '100%' }}>
          {messages.map((msg, i) => (
            <div key={i} style={{ position: 'absolute', width: '100%', left: 0, transition: 'all 0.3s ease', opacity: i === msgIndex ? 1 : 0, transform: `translateY(${(i - msgIndex) * 20}px)` }}>
              {msg}
            </div>
          ))}
        </div>
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleUp { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes pulseScale { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.15); } }
        @keyframes progressIndeterminate { 0% { left: -40%; } 100% { left: 100%; } }
      `}</style>
    </div>
  );
};

const Presentation: React.FC = () => {
  const { activePeriodIndex, nextPeriod, currentFaculty, currentSubject } = useTimetableIST();
  const [totalSeconds, setTotalSeconds] = useState(120);
  const [workflow, setWorkflow] = useState<any>(null);
  const [starting, setStarting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState(totalSeconds);
  const [overtime, setOvertime] = useState(0);
  const [running, setRunning] = useState(false);
  const [stage, setStage] = useState<'normal'|'warning'|'danger'>('normal');
  const [timerState, setTimerState] = useState('Ready');
  const [stageStatus, setStageStatus] = useState('Ready');
  const [evalOpen, setEvalOpen] = useState(false);
  const [evalSuccess, setEvalSuccess] = useState(false);
  const [scores, setScores] = useState<Record<number,number>>({ 0:0,1:0,2:0,3:0 });
  const [hoveredCriteria, setHoveredCriteria] = useState<Record<number,number>>({});
  const [evalComment, setEvalComment] = useState('');
  const [liveClock, setLiveClock] = useState('');
  const [everStarted, setEverStarted] = useState(false);
  const [selectModalOpen, setSelectModalOpen] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  
  const backendStateRef = useRef<string>('Idle');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ringRef = useRef<SVGCircleElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const settingsRef = useRef<any>(null);

  useEffect(() => {
    if (settings?.bellEnabled && settings.bellSound && settings.bellSound !== 'none') {
      audioRef.current = new Audio(`/sounds/${settings.bellSound}.wav`);
      audioRef.current.volume = (settings.volume ?? 70) / 100;
      audioRef.current.load();
    } else {
      audioRef.current = null;
    }
  }, [settings?.bellEnabled, settings?.bellSound, settings?.volume]);

  const loadState = () => {
    setLoading(true); setError('');
    Promise.all([
      import('../../services/presentationService').then(m => m.getSession()),
      import('../../services/presentationService').then(m => m.getQueue()),
      import('../../services/settingsService').then(m => m.getSettings())
    ]).then(([sessionRes, queueRes, settingsData]) => {
      const session = sessionRes.data;
      const queue = queueRes.data;
      
      setWorkflow({ session, queue });
      setSettings(settingsData);
      settingsRef.current = settingsData;
      const duration = session.duration || queue.duration || settingsData?.defaultDuration || 120;
      setTotalSeconds(duration);
      
      if (session.presentationRunning) {
        // Clear any stale interval first
        if (intervalRef.current) clearInterval(intervalRef.current);
        const elapsed = session.elapsed || 0;
        const remaining = Math.max(0, duration - elapsed);
        const ot = elapsed > duration ? elapsed - duration : 0;
        setRunning(true);
        setEverStarted(true);
        setTimeLeft(remaining);
        setOvertime(ot);
        setTimerState(ot > 0 ? 'Overtime' : 'Presenting');
        setStageStatus('Presenting');
        backendStateRef.current = 'Live';
        // Restart interval so timer ticks after page refresh
        intervalRef.current = setInterval(tick, 1000);
      } else if (session.status === 'Paused') {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setRunning(false);
        setTimerState('Paused'); setStageStatus('Paused');
        setTimeLeft(Math.max(0, duration - session.elapsed));
        setOvertime(session.elapsed > duration ? session.elapsed - duration : 0);
        backendStateRef.current = 'Paused';
      } else if (session.status === 'Evaluating') {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setRunning(false);
        setTimerState('Finished'); setStageStatus('Finished');
        backendStateRef.current = 'Evaluating';
        setEvalOpen(true);
      } else {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setTimeLeft(duration);
        backendStateRef.current = 'Idle';
      }
      setLoading(false);
    }).catch(err => {
      setError(err.message || 'Failed to load presentation engine');
      setLoading(false);
    });
  };

  useEffect(() => {
    loadState();
  }, []);


  const student = workflow?.session?.student || workflow?.queue?.currentStudent || workflow?.queue?.nextStudent; 
  const nextStudent: any = workflow?.queue?.nextStudent;

  // Clock
  useEffect(() => {
    const updateClock = () => {
      const now = new Date(); let h = now.getHours(); const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      setLiveClock(`${pad(h)}:${pad(now.getMinutes())}:${pad(now.getSeconds())} ${ampm}`);
    };
    updateClock(); const id = setInterval(updateClock, 1000);
    return () => clearInterval(id);
  }, []);

  const updateStage = useCallback((tl: number, ot: number) => {
    if (ot > 0) { setStage('danger'); return; }
    if (tl <= 15) setStage('danger');
    else if (tl <= 45) setStage('warning');
    else setStage('normal');
  }, []);

  const updateRing = useCallback((tl: number, ot: number, totalOpts?: number) => {
    if (!ringRef.current) return;
    if (ot > 0) { ringRef.current.style.strokeDashoffset = CIRCUMFERENCE + ''; return; }
    ringRef.current.style.strokeDashoffset = (CIRCUMFERENCE * (1 - tl / (totalOpts || totalSeconds))) + '';
  }, [totalSeconds]);

  const tick = useCallback(() => {
    setTimeLeft(prev => {
      if (prev > 0) {
        const next = prev - 1;
        updateStage(next, 0);
        updateRing(next, 0);
        
        const sets = settingsRef.current;
        if (sets?.bellEnabled && audioRef.current) {
          if (sets.warnTone && next === (sets.warningThreshold || 45)) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(e => console.log('Audio play failed', e));
          }
          if (sets.alarmTone && next === 0) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(e => console.log('Audio play failed', e));
          }
        }
        
        return next;
      } else {
        setOvertime(o => {
          const no = o + 1;
          setStage('danger');
          updateRing(0, no);
          return no;
        });
        return 0;
      }
    });
  }, [updateStage, updateRing]);

  const start = async () => {
    if (running || evalOpen || starting) return;
    setStarting(true);
    try {
      if (backendStateRef.current === 'Paused') {
        await resumePresentation();
      } else {
        await startPresentation(workflow?.queue?.nextStudent?._id);
      }
      setRunning(true); setEverStarted(true);
      setTimerState(overtime > 0 ? 'Overtime' : 'Presenting');
      setStageStatus('Presenting');
      backendStateRef.current = 'Live';
      intervalRef.current = setInterval(tick, 1000);
      notify('Session is Live', `Presentation started.`, 'high');
      loadState();
      setStarting(false);
    } catch(e) { 
      console.error(e); 
      setStarting(false); 
    }
  };

  const handleSelectStudent = async (studentId: string) => {
    if (running || evalOpen || starting) return;
    setStarting(true);
    try {
      await overrideActiveStudent(studentId);
      setSelectModalOpen(false);
      setRunning(true); setEverStarted(true);
      setTimerState('Presenting');
      setStageStatus('Presenting');
      backendStateRef.current = 'Live';
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(tick, 1000);
      notify('Session is Live', `Presentation resumed for selected student.`, 'high');
      loadState();
      setStarting(false);
    } catch (e) {
      console.error(e);
      notify('Error', 'Failed to select student.', 'high');
      setStarting(false);
    }
  };

  const pause = async () => {
    if (!running) return; 
    try {
      await pausePresentation();
      setRunning(false);
      if (intervalRef.current) clearInterval(intervalRef.current);
      setTimerState('Paused'); setStageStatus('Paused');
      backendStateRef.current = 'Paused';
      loadState();
      notify('Session Paused', 'The presentation timer has been paused.', 'normal');
    } catch(e) { console.error(e); }
  };

  const resetLocally = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRunning(false); setTimeLeft(totalSeconds); setOvertime(0);
    setTimerState('Ready'); setStageStatus('Ready'); setStage('normal');
    setEverStarted(false);
    if (ringRef.current) ringRef.current.style.strokeDashoffset = '0';
  };

  const reset = async () => {
    if (window.confirm("Are you sure you want to reset the current session?")) {
      try {
        await apiResetSession();
        resetLocally();
        loadState();
      } catch (e) {
        console.error(e);
      }
    }
  };

  const skip = async () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    try {
      const { skipPresentation } = await import('../../services/presentationService');
      await skipPresentation(workflow?.queue?.nextStudent?._id);
      setRunning(false); setTimerState('Skipped'); setStageStatus('Skipped');
      notify('Student Skipped', `${workflow?.queue?.nextStudent?.name || 'Student'} was skipped and moved back in queue.`, 'low');
      setTimeout(() => { loadState(); resetLocally(); }, 900);
    } catch(e) { console.error(e); }
  };

  const markAbs = async () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    try {
      const { markAbsent } = await import('../../services/presentationService');
      await markAbsent(workflow?.queue?.nextStudent?._id);
      setRunning(false); setTimerState('Absent'); setStageStatus('Absent');
      notify('Student Absent', `${workflow?.queue?.nextStudent?.name || 'Student'} marked absent.`, 'low');
      setTimeout(() => { loadState(); resetLocally(); }, 900);
    } catch(e) { console.error(e); }
  };

  const finish = async () => {
    try {
      await finishPresentation();
      if (intervalRef.current) clearInterval(intervalRef.current);
      setRunning(false); setTimerState('Finished'); setStageStatus('Finished');
      backendStateRef.current = 'Evaluating';
      notify('Evaluation Pending', 'Student evaluation is awaiting submission.', 'high');
      openEval();
    } catch(e) { console.error(e); }
  };

  const openEval = () => { setEvalOpen(true); setEvalSuccess(false); };
  
  const handleSkipEval = async () => {
    try {
      await skipEvaluation();
      setEvalOpen(false);
      resetLocally();
      loadState();
      notify('Evaluation Skipped', 'The evaluation step was skipped.', 'low');
    } catch (e) {
      console.error(e);
    }
  };

  const submitEval = async () => {
    try {
      await submitEvaluation({ overallRating: parseFloat(avgScore()), feedback: evalComment });
      setEvalSuccess(true);
      notify('Evaluation Submitted', `Student evaluation successfully saved. Queue advanced.`);
      setTimeout(() => {
        setEvalOpen(false);
        resetLocally(); setScores({ 0:0,1:0,2:0,3:0 }); setEvalComment('');
        loadState();
      }, 1300);
    } catch (e) { console.error(e); }
  };

  const submitRedo = async () => {
    try {
      await submitEvaluation({ overallRating: parseFloat(avgScore()), feedback: evalComment, status: 'Redo' });
      setEvalSuccess(true);
      notify('Student marked for Redo', `Student evaluation saved. Queue advanced.`);
      setTimeout(() => {
        setEvalOpen(false);
        resetLocally(); setScores({ 0:0,1:0,2:0,3:0 }); setEvalComment('');
        loadState();
      }, 1300);
    } catch (e) { console.error(e); }
  };

  const avgScore = () => {
    const vals = Object.values(scores).filter(v => v > 0);
    return vals.length ? (vals.reduce((a,b) => a+b,0)/vals.length).toFixed(1) : '0.0';
  };

  const fmtTime = (sec: number, ot: number) => {
    const s = ot > 0 ? ot : sec;
    const m = Math.floor(s / 60); const rem = s % 60;
    return `${ot > 0 ? '+' : ''}${m}:${rem.toString().padStart(2,'0')}`;
  };

  const ringColor = stage === 'danger' ? '#D71920' : stage === 'warning' ? '#E8963C' : '#4FA2CF';
  const timerColor = stage === 'danger' ? 'var(--primary-red)' : stage === 'warning' ? '#E8963C' : 'var(--ink)';
  const canFinish = (everStarted || overtime > 0) && !evalOpen;

  if (loading) return <AnimatedLoadingModal type="page" />;
  if (error) return <div style={{ textAlign: 'center', marginTop: 100 }}><h3 style={{color:'var(--primary-red)'}}>Failed to load</h3><p>{error}</p><button className="btn-primary" onClick={loadState}>Retry</button></div>;

  return (
    <>
      {starting && <AnimatedLoadingModal type="start" />}
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(21,36,48,0.28)', backdropFilter: 'blur(2px)', zIndex: 50, opacity: (evalOpen || selectModalOpen) ? 1 : 0, pointerEvents: (evalOpen || selectModalOpen) ? 'auto' : 'none', transition: 'opacity .5s' }} />

      {/* Select Student Modal */}
      {selectModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--glass)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.7)', borderRadius: 20, padding: 32, width: '90%', maxWidth: 500, maxHeight: '80vh', overflowY: 'auto', boxShadow: 'var(--shadow-lg)', display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: 20, fontWeight: 600 }}>Select Student</h2>
              <button onClick={() => setSelectModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-soft)' }}>
                <svg viewBox="0 0 24 24" fill="none" style={{ width: 20, height: 20 }}><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>
            
            {/* Skipped Students */}
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#E8963C', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.05em' }}>Skipped Students</h3>
              {(!workflow?.queue?.skippedStudents || workflow.queue.skippedStudents.length === 0) ? (
                <div style={{ fontSize: 13, color: 'var(--ink-soft)', padding: '10px 0' }}>No skipped students.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {workflow.queue.skippedStudents.map((s: any) => (
                    <button key={s._id} onClick={() => handleSelectStudent(s._id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.6)', border: '1px solid var(--line)', cursor: 'pointer', textAlign: 'left', transition: 'background .2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.9)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.6)'}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{s.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>Roll No: {s.rollNo} {s.title ? `· ${s.title}` : ''}</div>
                      </div>
                      <span className="badge badge-skipped">Skipped</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Absent Students */}
            <div style={{ marginTop: 10 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#D71920', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.05em' }}>Absent Students</h3>
              {(!workflow?.queue?.absentStudents || workflow.queue.absentStudents.length === 0) ? (
                <div style={{ fontSize: 13, color: 'var(--ink-soft)', padding: '10px 0' }}>No absent students.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {workflow.queue.absentStudents.map((s: any) => (
                    <button key={s._id} onClick={() => handleSelectStudent(s._id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.6)', border: '1px solid var(--line)', cursor: 'pointer', textAlign: 'left', transition: 'background .2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.9)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.6)'}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{s.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>Roll No: {s.rollNo} {s.title ? `· ${s.title}` : ''}</div>
                      </div>
                      <span className="badge badge-absent">Absent</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Redo Students */}
            <div style={{ marginTop: 10 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--primary-blue)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.05em' }}>Redo Students</h3>
              {(!workflow?.queue?.redoStudents || workflow.queue.redoStudents.length === 0) ? (
                <div style={{ fontSize: 13, color: 'var(--ink-soft)', padding: '10px 0' }}>No redo students.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {workflow.queue.redoStudents.map((s: any) => (
                    <button key={s._id} onClick={() => handleSelectStudent(s._id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.6)', border: '1px solid var(--line)', cursor: 'pointer', textAlign: 'left', transition: 'background .2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.9)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.6)'}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{s.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>Roll No: {s.rollNo} {s.title ? `· ${s.title}` : ''}</div>
                      </div>
                      <span className="badge badge-completed" style={{ background: 'var(--light-blue)', color: 'var(--primary-blue)' }}>Redo</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Eval panel */}
      <aside style={{ position: 'fixed', top: 0, right: 0, height: '100%', width: 'min(92vw,440px)', zIndex: 51, background: 'var(--glass)', backdropFilter: 'blur(24px) saturate(160%)', borderLeft: '1px solid rgba(255,255,255,0.7)', boxShadow: '-24px 0 60px -12px rgba(21,36,48,0.18)', transform: evalOpen ? 'translateX(0)' : 'translateX(100%)', transition: 'transform .55s', display: 'flex', flexDirection: 'column', padding: '30px 30px 26px', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        {!evalSuccess ? (
          <>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 22 }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 6 }}>Faculty Evaluation</h2>
                <p style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Rate <b>{student?.name}</b>'s presentation</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '18px 20px', borderRadius: 16, background: 'rgba(255,255,255,0.55)', border: '1px solid var(--line)', marginBottom: 22 }}>
              <div className="num" style={{ fontSize: 32, fontWeight: 700, color: 'var(--primary-blue)' }}>{avgScore()}</div>
              <div style={{ fontSize: '12.5px', color: 'var(--ink-soft)' }}>Overall average rating</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 20 }}>
              {CRITERIA_NAMES.map((name, ci) => (
                <div key={ci} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <span style={{ fontSize: '13.5px', fontWeight: 600 }}>{name}</span>
                  <div style={{ display: 'flex', gap: 4 }}
                    onMouseLeave={() => setHoveredCriteria(h => ({ ...h, [ci]: 0 }))}>
                    {[1,2,3,4,5].map(v => (
                      <button key={v} onMouseEnter={() => setHoveredCriteria(h => ({ ...h, [ci]: v }))}
                        onClick={() => setScores(s => { const ns = { ...s }; ns[ci] = v; return ns; })}
                        style={{ width: 22, height: 22, color: (hoveredCriteria[ci] || scores[ci]) >= v ? 'var(--primary-blue)' : 'var(--ink-faint)', transition: 'color .2s, transform .2s', transform: 'scale(1)', cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}>
                        <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '100%', height: '100%' }}><path d="M12 2l2.9 6.6 7.1.6-5.4 4.6 1.7 6.9L12 17l-6.3 3.7 1.7-6.9-5.4-4.6 7.1-.6z"/></svg>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginBottom: 22 }}>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--ink-soft)', marginBottom: 8 }}>Additional feedback (optional)</label>
              <textarea value={evalComment} onChange={e => setEvalComment(e.target.value)} placeholder="Notes on delivery, clarity, or content…" style={{ width: '100%', minHeight: 84, borderRadius: 14, border: '1px solid var(--line)', background: 'rgba(255,255,255,0.6)', padding: '12px 14px', fontSize: '13.5px', color: 'var(--ink)', resize: 'vertical', outline: 'none' }}/>
            </div>
            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button onClick={submitEval} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px 10px', borderRadius: 100, background: 'linear-gradient(135deg,var(--primary-blue),#3f8fbd)', color: 'white', fontSize: 14, fontWeight: 600, boxShadow: '0 10px 26px -8px rgba(79,162,207,0.65)' }}>
                  <svg viewBox="0 0 24 24" fill="none" style={{ width: 15, height: 15 }}><path d="M5 12l4 4 10-10" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Submit
                </button>
                <button onClick={submitRedo} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px 10px', borderRadius: 100, background: 'rgba(255,255,255,0.6)', border: '1px solid var(--line)', color: 'var(--ink)', fontSize: 14, fontWeight: 600 }}>
                  <svg viewBox="0 0 24 24" fill="none" style={{ width: 15, height: 15 }}><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Redo
                </button>
              </div>
              <button onClick={handleSkipEval} style={{ textAlign: 'center', fontSize: '12.5px', fontWeight: 600, color: 'var(--ink-faint)', padding: 8, background: 'none', border: 'none', cursor: 'pointer' }}>Skip evaluation</button>
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', margin: 'auto', gap: 14 }}>
            <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'var(--light-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg viewBox="0 0 24 24" fill="none" style={{ width: 26, height: 26, color: 'var(--primary-blue)' }}><path d="M5 12l4 4 10-10" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <h3 style={{ fontSize: 17, fontWeight: 600 }}>Evaluation submitted</h3>
            <p style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Loading the next student…</p>
          </div>
        )}
      </aside>

      {/* Minimal header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 36px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={() => window.history.length > 1 ? window.history.back() : window.location.href = '/dashboard'} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.55)', border: '1px solid var(--line)', color: 'var(--ink-soft)', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all .25s', outline: 'none' }} onMouseOver={e => e.currentTarget.style.background = 'white'} onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.55)'}>
            <svg viewBox="0 0 24 24" fill="none" style={{ width: 14, height: 14 }}><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Back
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: .85 }}>
            <div style={{ width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src="/presentia.svg" alt="Presentia" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <span style={{ fontFamily: "'Clash Display',sans-serif", fontSize: 14, fontWeight: 600, color: 'var(--ink-soft)' }}>Presentia</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 100, background: 'rgba(255,255,255,0.55)', border: '1px solid var(--line)' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary-blue)', animation: 'pulseDot 2s ease-in-out infinite' }}/>
          <span style={{ fontSize: '11.5px', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink-soft)' }}>{stageStatus}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="num" style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--ink-soft)' }}>{liveClock}</span>
        </div>
      </div>

      {/* Stage */}
      <main style={{ maxWidth: 920, margin: '0 auto', padding: '12px 32px 60px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'center', marginTop: 6, marginBottom: 22 }}>
          {[
            student?.rollNo || 'Pending', 
            `Subject · ${currentSubject || 'N/A'}`, 
            `Faculty · ${currentFaculty}`,
            activePeriodIndex !== -1 ? `Period ${activePeriodIndex + 1}` : 'Free Period',
            nextPeriod ? `Next · ${nextPeriod.subject}` : null
          ].filter(Boolean).map((chip, i) => (
            <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 15px', borderRadius: 100, background: 'rgba(255,255,255,0.55)', border: '1px solid var(--line)', fontSize: '12.5px', fontWeight: 600, color: 'var(--ink-soft)' }}>{chip}</span>
          ))}
        </div>
        <h1 style={{ fontSize: 'clamp(38px,5.6vw,68px)', fontWeight: 600, lineHeight: 1.05, marginBottom: 14 }}>{student?.name || 'No Student Next'}</h1>
        <p style={{ fontSize: 'clamp(16px,1.9vw,21px)', color: 'var(--ink-soft)', maxWidth: 640, marginBottom: 36, lineHeight: 1.5 }}>{student?.title}</p>

        {/* Timer */}
        <div style={{ position: 'relative', width: 'min(46vw,380px)', height: 'min(46vw,380px)', margin: '0 auto 18px', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: stage === 'danger' ? 'ringPulse 1s ease-in-out infinite' : 'none' }}>
          <svg viewBox="0 0 400 400" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
            <circle cx="200" cy="200" r="170" fill="none" stroke="rgba(79,162,207,0.14)" strokeWidth="14"/>
            <circle ref={ringRef} cx="200" cy="200" r="170" fill="none" strokeWidth="14" strokeLinecap="round" strokeDasharray="1068.14" strokeDashoffset="0" style={{ stroke: ringColor, transition: 'stroke-dashoffset 1s linear, stroke 1s ease' }}/>
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div className="num" style={{ fontSize: 'clamp(52px,7.5vw,92px)', fontWeight: 700, color: timerColor, transition: 'color 1s ease', letterSpacing: '-0.02em' }}>
              {fmtTime(timeLeft, overtime)}
            </div>
            <div style={{ fontSize: '12.5px', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--ink-faint)', marginTop: 8 }}>{timerState}</div>
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, flexWrap: 'wrap', marginTop: 8, marginBottom: 26 }}>
          {[
            { id: 'start', label: 'Start', icon: <path d="M6 4l14 8-14 8V4z" fill="white"/>, cls: 'ctrl-primary', disabled: running || evalOpen, onClick: start },
            { id: 'pause', label: 'Pause', icon: <><rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor"/></>, cls: 'ctrl-ghost', disabled: !running, onClick: pause },
            { id: 'select', label: 'Select Student', icon: <><circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2"/><path d="M5 21v-2a4 4 0 014-4h6a4 4 0 014 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></>, cls: 'ctrl-ghost', disabled: running || evalOpen, onClick: () => setSelectModalOpen(true) },
            { id: 'reset', label: 'Reset', icon: <><path d="M4 4v6h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M4.5 14a8 8 0 1 0 2-8.5L4 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></>, cls: 'ctrl-ghost', disabled: evalOpen, onClick: reset },
            { id: 'skip', label: 'Skip', icon: <><path d="M5 5l14 7-14 7V5z" fill="currentColor"/><rect x="19" y="5" width="2.5" height="14" fill="currentColor"/></>, cls: 'ctrl-warn', disabled: evalOpen, onClick: skip },
            { id: 'absent', label: 'Absent', icon: <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11H7v-2h10v2z" fill="currentColor"/>, cls: 'ctrl-warn', disabled: evalOpen, onClick: markAbs },
            { id: 'finish', label: 'Finish', icon: <path d="M5 12l4 4 10-10" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>, cls: 'ctrl-finish', disabled: !canFinish, onClick: finish },
          ].map(btn => (
            <button key={btn.id} disabled={btn.disabled} onClick={btn.onClick}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 24px', borderRadius: 100, fontSize: 14, fontWeight: 600, transition: 'transform .25s, box-shadow .25s, opacity .25s', position: 'relative', overflow: 'hidden', opacity: btn.disabled ? .35 : 1, cursor: btn.disabled ? 'not-allowed' : 'pointer',
                ...(btn.cls === 'ctrl-primary' ? { background: 'linear-gradient(135deg,var(--primary-blue),#3f8fbd)', color: 'white', boxShadow: '0 10px 26px -8px rgba(79,162,207,0.65)' }
                : btn.cls === 'ctrl-finish' ? { background: 'linear-gradient(135deg,#3f8fbd,var(--ink))', color: 'white', boxShadow: '0 10px 26px -8px rgba(21,36,48,0.4)' }
                : btn.cls === 'ctrl-warn' ? { background: 'rgba(215,25,32,0.07)', border: '1px solid rgba(215,25,32,0.22)', color: 'var(--primary-red)' }
                : { background: 'rgba(255,255,255,0.55)', border: '1px solid var(--line)', color: 'var(--ink-soft)' }) }}>
              <svg viewBox="0 0 24 24" fill="none" style={{ width: 15, height: 15 }}>{btn.icon}</svg>
              {btn.label}
            </button>
          ))}
        </div>
        <p style={{ fontSize: 13, color: 'var(--ink-faint)' }}>Next up: <b style={{ color: 'var(--ink-soft)', fontWeight: 600 }}>{nextStudent?.name} · {nextStudent?.rollNo}</b></p>
      </main>
    </>
  );
};

export default Presentation;
