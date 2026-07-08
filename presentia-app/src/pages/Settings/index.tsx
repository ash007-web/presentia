import React, { useState, useEffect, useRef } from 'react';
import Reveal from '../../components/common/Reveal';
import { getSettings, updateSettings, getCycles, startNewCycle, archiveCycle, resetCycle, deleteCycleData, renameCycle } from '../../services/settingsService';
import { notify } from '../../utils/notify';

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Local state for forms
  const [formData, setFormData] = useState<any>({});
  
  // Cycles
  const [cycles, setCycles] = useState<any[]>([]);
  const [newCycleNum, setNewCycleNum] = useState('');
  const [newSem, setNewSem] = useState('');
  const [cycleLoading, setCycleLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playPreview = (soundName: string, vol: number) => {
    if (!soundName || soundName === 'none') return;
    if (!audioRef.current) {
      audioRef.current = new Audio(`/sounds/${soundName}.wav`);
    } else {
      audioRef.current.src = `/sounds/${soundName}.wav`;
    }
    audioRef.current.volume = (vol ?? 70) / 100;
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(() => {});
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [sets, cycs] = await Promise.all([getSettings(), getCycles()]);
      setFormData(sets || {
        defaultDuration: 120,
        warningThreshold: 45,
        criticalThreshold: 15,
        animationMode: 'full',
        bellEnabled: true,
        bellSound: 'chime',
        volume: 70,
        warnTone: true,
        alarmTone: true
      });
      setCycles(cycs || []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleChange = (k: string, v: any) => {
    setFormData((prev: any) => {
      const next = { ...prev, [k]: v };
      if (next.bellEnabled && (k === 'bellSound' || k === 'volume')) {
        playPreview(next.bellSound, next.volume);
      }
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings(formData);
      await loadData();
      notify('Settings Saved', 'Application configuration updated successfully.');
    } catch (err) {
      alert('Failed to save settings');
    }
    setSaving(false);
  };

  const handleStartCycle = async () => {
    if (!newCycleNum || !newSem) return alert('Enter cycle number and semester');
    setCycleLoading(true);
    try {
      await startNewCycle(Number(newCycleNum), newSem);
      setNewCycleNum(''); setNewSem('');
      await loadData();
      notify('Cycle Created', `Cycle ${newCycleNum} (${newSem}) has been started.`);
    } catch (err: any) {
      alert(err.message || 'Failed to start cycle');
    }
    setCycleLoading(false);
  };

  const handleArchive = async (id: string) => {
    if (!window.confirm("Archive this cycle?")) return;
    setCycleLoading(true);
    try {
      await archiveCycle(id);
      await loadData();
      notify('Cycle Archived', 'The selected cycle has been archived successfully.');
    } catch (err) { alert('Failed'); }
    setCycleLoading(false);
  };

  const handleReset = async (id: string) => {
    if (!window.confirm("DANGER: This will delete all presentations in this cycle. Are you sure?")) return;
    setCycleLoading(true);
    try {
      await resetCycle(id);
      await loadData();
      notify('Data Reset', 'All presentation records in the cycle have been deleted.', 'high');
    } catch (err) { alert('Failed'); }
    setCycleLoading(false);
  };

  const handleDeleteCycle = async (id: string) => {
    if (!window.confirm("DANGER: This will PERMANENTLY delete the cycle and all its presentations. Are you absolutely sure?")) return;
    setCycleLoading(true);
    try {
      await deleteCycleData(id);
      await loadData();
      notify('Cycle Deleted', 'The cycle and its presentations have been permanently removed.', 'high');
    } catch (err: any) { alert(err.message || 'Failed to delete cycle'); }
    setCycleLoading(false);
  };

  const handleRenameCycle = async (id: string, currentSem: string) => {
    const newSem = window.prompt("Enter new semester name:", currentSem);
    if (!newSem || newSem === currentSem) return;
    setCycleLoading(true);
    try {
      await renameCycle(id, { semester: newSem });
      await loadData();
      notify('Cycle Renamed', `Cycle has been renamed to ${newSem}.`);
    } catch (err) { alert('Failed'); }
    setCycleLoading(false);
  };

  const handleSetCurrentCycle = async (id: string) => {
    if (!window.confirm("Set this as the current active cycle?")) return;
    setCycleLoading(true);
    try {
      await updateSettings({ currentCycle: id });
      await loadData();
      notify('Active Cycle Changed', 'The selected cycle is now active.');
    } catch (err) { alert('Failed'); }
    setCycleLoading(false);
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '40vh' }}><div style={{ width: 40, height: 40, border: '3px solid var(--line)', borderTopColor: 'var(--primary-blue)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /></div>;

  return (
    <main style={{ maxWidth: 1000, margin: '0 auto', padding: '36px 40px 80px' }}>
      <Reveal style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 32, fontWeight: 600, marginBottom: 8 }}>Settings</h1>
        <p style={{ color: 'var(--ink-soft)', fontSize: 15 }}>Configure presentation rules, manage cycles, and customize the interface.</p>
      </Reveal>

      <Reveal delay={70}>
        <div style={{ display: 'flex', gap: 10, marginBottom: 24, borderBottom: '1px solid var(--line)', paddingBottom: 16 }}>
          {['general', 'cycles', 'audio'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: '8px 16px', borderRadius: 100, fontSize: 14, fontWeight: 600, textTransform: 'capitalize', cursor: 'pointer', transition: 'all .25s', border: 'none', background: activeTab === tab ? 'var(--light-blue)' : 'transparent', color: activeTab === tab ? 'var(--primary-blue)' : 'var(--ink-soft)' }}>
              {tab}
            </button>
          ))}
        </div>
      </Reveal>

      <Reveal delay={140}>
        <div className="card">
          {activeTab === 'general' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 480 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, borderBottom: '1px solid var(--line)', paddingBottom: 10 }}>Timer Configuration</h3>
                
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink-soft)', marginBottom: 6 }}>Default Presentation Duration (sec)</label>
                  <input type="number" value={formData.defaultDuration || ''} onChange={e => handleChange('defaultDuration', parseInt(e.target.value))} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--line)', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink-soft)', marginBottom: 6 }}>Warning Threshold (sec left)</label>
                  <input type="number" value={formData.warningThreshold || ''} onChange={e => handleChange('warningThreshold', parseInt(e.target.value))} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--line)', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink-soft)', marginBottom: 6 }}>Critical Threshold (sec left)</label>
                  <input type="number" value={formData.criticalThreshold || ''} onChange={e => handleChange('criticalThreshold', parseInt(e.target.value))} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--line)', outline: 'none' }} />
                </div>

                <h3 style={{ fontSize: 16, fontWeight: 600, borderBottom: '1px solid var(--line)', paddingBottom: 10, marginTop: 10 }}>Interface</h3>
                
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink-soft)', marginBottom: 6 }}>Animation Mode</label>
                  <select value={formData.animationMode || 'full'} onChange={e => handleChange('animationMode', e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--line)', outline: 'none' }}>
                    <option value="full">Full Animations</option>
                    <option value="reduced">Reduced Motion</option>
                    <option value="none">No Animations</option>
                  </select>
                </div>
              </div>
              
              <div style={{ marginTop: 10 }}>
                <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Settings'}</button>
              </div>
            </div>
          )}

          {activeTab === 'cycles' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, borderBottom: '1px solid var(--line)', paddingBottom: 10 }}>Start New Cycle</h3>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink-soft)', marginBottom: 6 }}>Cycle Number</label>
                    <input type="number" value={newCycleNum} onChange={e => setNewCycleNum(e.target.value)} style={{ width: 140, padding: '10px 14px', borderRadius: 10, border: '1px solid var(--line)', outline: 'none' }} placeholder="e.g. 5" />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink-soft)', marginBottom: 6 }}>Semester</label>
                    <input type="text" value={newSem} onChange={e => setNewSem(e.target.value)} style={{ width: 200, padding: '10px 14px', borderRadius: 10, border: '1px solid var(--line)', outline: 'none' }} placeholder="e.g. Semester 6" />
                  </div>
                  <button className="btn-primary" onClick={handleStartCycle} disabled={cycleLoading} style={{ padding: '11px 24px' }}>Start Cycle</button>
                </div>

                <h3 style={{ fontSize: 16, fontWeight: 600, borderBottom: '1px solid var(--line)', paddingBottom: 10, marginTop: 16 }}>Past Cycles</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {cycles.length === 0 ? <p style={{ fontSize: 13, color: 'var(--ink-soft)' }}>No cycles found.</p> : cycles.map(c => (
                    <div key={c._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.5)', border: c.endDate ? '1px solid var(--line)' : '1px solid var(--primary-blue)' }}>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 600 }}>Cycle {c.cycleNumber}</div>
                        <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{c.semester} · Started {new Date(c.startDate).toLocaleDateString()} {c.endDate && `· Ended ${new Date(c.endDate).toLocaleDateString()}`}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        {c.endDate && <button onClick={() => handleSetCurrentCycle(c._id)} disabled={cycleLoading} style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)', padding: '6px 12px', borderRadius: 100, border: '1px solid var(--line)', background: 'white', cursor: 'pointer' }}>Set Current</button>}
                        <button onClick={() => handleRenameCycle(c._id, c.semester)} disabled={cycleLoading} style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)', padding: '6px 12px', borderRadius: 100, border: '1px solid var(--line)', background: 'white', cursor: 'pointer' }}>Rename</button>
                        {!c.endDate && <button onClick={() => handleArchive(c._id)} disabled={cycleLoading} style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)', padding: '6px 12px', borderRadius: 100, border: '1px solid var(--line)', background: 'white', cursor: 'pointer' }}>Archive</button>}
                        <button onClick={() => handleReset(c._id)} disabled={cycleLoading} style={{ fontSize: 12, fontWeight: 600, color: 'var(--primary-red)', padding: '6px 12px', borderRadius: 100, border: '1px solid rgba(215,25,32,0.3)', background: 'rgba(215,25,32,0.05)', cursor: 'pointer' }}>Reset Data</button>
                        <button onClick={() => handleDeleteCycle(c._id)} disabled={cycleLoading} style={{ fontSize: 12, fontWeight: 600, color: 'white', padding: '6px 12px', borderRadius: 100, border: 'none', background: 'var(--primary-red)', cursor: 'pointer' }}>Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'audio' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 480 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, borderBottom: '1px solid var(--line)', paddingBottom: 10 }}>Audio & Alerts</h3>
              
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>Master Audio</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Enable sounds across the app</div>
                </div>
                <label style={{ position: 'relative', display: 'inline-block', width: 44, height: 24 }}>
                  <input type="checkbox" checked={formData.bellEnabled} onChange={e => handleChange('bellEnabled', e.target.checked)} style={{ opacity: 0, width: 0, height: 0 }} />
                  <span style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: formData.bellEnabled ? 'var(--primary-blue)' : 'var(--line)', transition: '.4s', borderRadius: 34 }}>
                    <span style={{ position: 'absolute', content: '""', height: 18, width: 18, left: 3, bottom: 3, backgroundColor: 'white', transition: '.4s', borderRadius: '50%', transform: formData.bellEnabled ? 'translateX(20px)' : 'none' }}/>
                  </span>
                </label>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink-soft)', marginBottom: 6 }}>Bell Sound</label>
                <select value={formData.bellSound || 'chime'} onChange={e => handleChange('bellSound', e.target.value)} disabled={!formData.bellEnabled} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--line)', outline: 'none', opacity: formData.bellEnabled ? 1 : 0.5 }}>
                  <option value="chime">Soft Chime</option>
                  <option value="bell">Classic Bell</option>
                  <option value="beep">Digital Beep</option>
                  <option value="none">None</option>
                </select>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-soft)' }}>Volume</label>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{formData.volume}%</span>
                </div>
                <input type="range" min="0" max="100" value={formData.volume || 70} onChange={e => handleChange('volume', parseInt(e.target.value))} disabled={!formData.bellEnabled} style={{ width: '100%', opacity: formData.bellEnabled ? 1 : 0.5 }} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Warning Tone</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>Play sound when warning threshold is reached</div>
                </div>
                <input type="checkbox" checked={formData.warnTone} onChange={e => handleChange('warnTone', e.target.checked)} disabled={!formData.bellEnabled} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Alarm Tone</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>Play sound when overtime begins</div>
                </div>
                <input type="checkbox" checked={formData.alarmTone} onChange={e => handleChange('alarmTone', e.target.checked)} disabled={!formData.bellEnabled} />
              </div>

              <div style={{ marginTop: 20 }}>
                <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Audio Settings'}</button>
              </div>
            </div>
          )}
        </div>
      </Reveal>
    </main>
  );
};

export default Settings;
