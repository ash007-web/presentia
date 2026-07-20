import React, { useState, useEffect, useRef } from 'react';
import Reveal from '../../components/common/Reveal';
import { getRawStudents, createStudent, updateStudent, deleteStudent, importStudents, updateStudentTitle } from '../../services/studentService';
import { getSettings } from '../../services/settingsService';
import { initialsOf } from '../../utils/helpers';
import { notify } from '../../utils/notify';

type Status = 'all' | 'completed' | 'pending' | 'absent' | 'skipped';

const statusMeta: Record<string, { label: string; cls: string }> = {
  completed: { label: 'Completed', cls: 'badge-completed' },
  pending: { label: 'Pending', cls: 'badge-pending' },
  absent: { label: 'Absent', cls: 'badge-absent' },
  skipped: { label: 'Skipped', cls: 'badge-skipped' },
};

const Students: React.FC = () => {
  const [search, setSearch] = useState('');
  const [activeStatus, setActiveStatus] = useState<Status>('all');
  const [studentsList, setStudentsList] = useState<any[]>([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 10;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingTitleId, setSavingTitleId] = useState<string | null>(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [currentStudent, setCurrentStudent] = useState<any>(null);
  const [formData, setFormData] = useState({ rollNo: '', name: '', admissionNo: '', title: '' });
  
  // Import state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [activeCycleLabel, setActiveCycleLabel] = useState('');

  useEffect(() => {
    getSettings().then((s: any) => {
      if (s?.currentCycle) {
        setActiveCycleLabel(`Cycle ${s.currentCycle.cycleNumber} · ${s.currentCycle.semester}`);
      }
    }).catch(console.error);
  }, []);

  const loadData = () => {
    setLoading(true);
    setError('');
    getRawStudents({ page, limit, search })
      .then(data => { 
        setStudentsList(data.students || []);
        setTotalStudents(data.total || 0);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message || 'Failed to load students');
        setLoading(false);
      });
  };

  useEffect(() => {
    // Debounce search
    const timer = setTimeout(() => {
      setPage(1); // Reset to first page on search
      loadData();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    loadData();
  }, [page, limit]);

  // Client side filtering for status (since the backend doesn't fully support it on /students yet)
  // Ideally, this should be done on the backend.
  const filtered = studentsList.filter(s => {
    const sStatus = s.status ? s.status.toLowerCase() : 'pending';
    const matchStatus = activeStatus === 'all' || sStatus === activeStatus;
    
    return matchStatus;
  });

  const totalPages = Math.ceil(totalStudents / limit) || 1;

  const handleTitleChange = async (id: string, newTitle: string) => {
    setSavingTitleId(id);
    try {
      await updateStudentTitle(id, newTitle);
      setStudentsList(prev => prev.map(s => s._id === id ? { ...s, title: newTitle } : s));
    } catch (err) {
      console.error('Failed to update title', err);
      // Revert title locally or show error toast
    } finally {
      setSavingTitleId(null);
    }
  };

  const handleOpenModal = (mode: 'add' | 'edit', student: any = null) => {
    setModalMode(mode);
    setCurrentStudent(student);
    if (student) {
      setFormData({ rollNo: student.rollNo, name: student.name, admissionNo: student.admissionNo || '', title: student.title || '' });
    } else {
      setFormData({ rollNo: '', name: '', admissionNo: '', title: '' });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentStudent(null);
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (modalMode === 'add') {
        await createStudent(formData);
        notify('Student Added', `${formData.name} was successfully registered.`);
      } else if (modalMode === 'edit' && currentStudent) {
        await updateStudent(currentStudent._id, formData);
        notify('Student Updated', `${formData.name}'s profile was updated.`);
      }
      handleCloseModal();
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to save student');
    }
  };

  const handleDeleteStudent = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this student?')) {
      try {
        await deleteStudent(id);
        loadData();
        notify('Student Deleted', 'The student record was removed.', 'high');
      } catch (err: any) {
        alert(err.message || 'Failed to delete student');
      }
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    try {
      await importStudents(file);
      notify('Import Completed', 'The student roster was successfully imported.');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to import students');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const pillStatuses: Status[] = ['all', 'completed', 'pending', 'absent', 'skipped'];
  const pillLabels: Record<Status, string> = { all: 'All', completed: 'Completed', pending: 'Pending', absent: 'Absent', skipped: 'Skipped' };

  return (
    <main style={{ maxWidth: 1400, margin: '0 auto', padding: '36px 40px 80px' }}>
      <Reveal style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, marginBottom: 28, flexWrap: 'wrap' }}>
        <div>
          <p className="eyebrow"><span className="dot" />{activeCycleLabel || 'Presentia'}</p>
          <h1 style={{ fontSize: 32, fontWeight: 600, marginBottom: 8 }}>Students</h1>
          <p style={{ color: 'var(--ink-soft)', fontSize: 15, maxWidth: 560 }}>Manage rosters, track presentation status, and review ratings across every cycle.</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <input type="file" accept=".xlsx,.xls" style={{ display: 'none' }} ref={fileInputRef} onChange={handleImport} />
          <button className="btn-secondary" onClick={() => fileInputRef.current?.click()} disabled={isImporting} style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid var(--line)', padding: '10px 18px', borderRadius: 100, fontSize: 14, fontWeight: 600, cursor: isImporting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg viewBox="0 0 24 24" fill="none" style={{ width: 15, height: 15 }}><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            {isImporting ? 'Importing...' : 'Import Topics'}
          </button>
          <button className="btn-primary" onClick={() => handleOpenModal('add')}>
            <svg viewBox="0 0 24 24" fill="none" style={{ width: 15, height: 15 }}><path d="M12 5v14M5 12h14" stroke="white" strokeWidth="2.2" strokeLinecap="round"/></svg>
            Add Student
          </button>
        </div>
      </Reveal>

      {/* Toolbar */}
      <Reveal delay={70} style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24, flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', flex: 1 }}>
          <div className="search-box" style={{ flex: 1, minWidth: 240, maxWidth: 380 }}>
            <svg viewBox="0 0 24 24" fill="none" style={{ width: 16, height: 16, color: 'var(--ink-faint)', flexShrink: 0 }}><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2"/><path d="M21 21l-4.3-4.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or roll number…" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {pillStatuses.map(st => (
               <button key={st} className={`filter-pill${activeStatus === st ? ' active' : ''}`} onClick={() => setActiveStatus(st)}>
                 {pillLabels[st]}
               </button>
            ))}
          </div>
        </div>
      </Reveal>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '40vh' }}><div style={{ width: 40, height: 40, border: '3px solid var(--line)', borderTopColor: 'var(--primary-blue)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /></div>
      ) : error ? (
        <div style={{ textAlign: 'center', marginTop: 100 }}><h3 style={{color:'var(--primary-red)'}}>Failed to load</h3><p style={{color:'var(--ink-soft)', marginBottom: 20}}>{error}</p><button className="btn-primary" onClick={loadData}>Retry</button></div>
      ) : (
      <>
        {/* Table */}
      <Reveal delay={140}>
        <div className="card" style={{ padding: '10px 16px 16px', overflowX: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '88px minmax(150px,1.1fr) minmax(220px,2fr) 84px 130px 118px', alignItems: 'center', gap: 14, padding: '14px 14px', minWidth: 800 }}>
            {['Roll No.','Name','Presentation Title','Rating','Status','Actions'].map((h, i) => (
              <span key={h} style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--ink-faint)', textAlign: i === 5 ? 'right' : 'left' }}>{h}</span>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 20px 56px', textAlign: 'center' }}>
              <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>No students found</h3>
              <p style={{ fontSize: '13.5px', color: 'var(--ink-soft)', maxWidth: 320, marginBottom: 20 }}>Try adjusting your search term or filters.</p>
              <button onClick={() => { setSearch(''); setActiveStatus('all'); }} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 20px', borderRadius: 100, background: 'rgba(255,255,255,0.6)', border: '1px solid var(--line)', fontSize: 13, fontWeight: 600, color: 'var(--primary-blue)', cursor: 'pointer' }}>
                Clear filters
              </button>
            </div>
          ) : (
            <div style={{ minWidth: 800 }}>
              {filtered.map((s, i) => {
                const sStatus = s.status ? s.status.toLowerCase() : 'pending';
                const meta = statusMeta[sStatus] || statusMeta.pending;
                return (
                  <div key={s._id || s.rollNo} style={{ display: 'grid', gridTemplateColumns: '88px minmax(150px,1.1fr) minmax(220px,2fr) 84px 130px 118px', alignItems: 'center', gap: 14, padding: '12px 14px', borderRadius: 16, transition: 'background .3s, transform .3s', borderBottom: i < filtered.length - 1 ? '1px solid rgba(79,162,207,0.08)' : 'none' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(79,162,207,0.06)'; (e.currentTarget as HTMLElement).style.transform = 'translateX(2px)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.transform = 'translateX(0)'; }}>
                    <div className="num" style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--ink-soft)' }}>{s.rollNo}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                      <div className="avatar-sm">{initialsOf(s.name)}</div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '13.5px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
                        {(s.subject || s.faculty || s.duration) && (
                          <div style={{ fontSize: '11px', color: 'var(--ink-soft)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {[s.subject, s.faculty, s.duration ? `${Math.floor(s.duration / 60)}m ${s.duration % 60}s` : null].filter(Boolean).join(' • ')}
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ position: 'relative' }}>
                      <input 
                        defaultValue={s.title} 
                        placeholder="Add a presentation title…" 
                        disabled={sStatus === 'absent'} 
                        style={{ width: '100%', border: '1px solid transparent', background: 'transparent', fontSize: '13.5px', color: 'var(--ink)', padding: '8px 10px', borderRadius: 9, transition: 'all .25s', fontFamily: 'inherit', cursor: sStatus === 'absent' ? 'not-allowed' : 'text', opacity: sStatus === 'absent' ? 0.4 : 1 }}
                        onFocus={e => { e.target.style.background = 'var(--white)'; e.target.style.borderColor = 'var(--primary-blue)'; e.target.style.boxShadow = '0 0 0 4px rgba(79,162,207,0.12)'; }}
                        onBlur={e => { 
                          e.target.style.background = 'transparent'; e.target.style.borderColor = 'transparent'; e.target.style.boxShadow = 'none'; 
                          if (e.target.value !== s.title) handleTitleChange(s._id, e.target.value);
                        }}
                      />
                      {savingTitleId === s._id && (
                        <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, border: '2px solid var(--line)', borderTopColor: 'var(--primary-blue)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                      )}
                    </div>
                    <div>
                      {s.overallRating ? (
                        <div className="num" style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 700, fontSize: '13.5px', color: 'var(--primary-blue)' }}>
                          <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 12, height: 12 }}><path d="M12 2l2.9 6.6 7.1.6-5.4 4.6 1.7 6.9L12 17l-6.3 3.7 1.7-6.9-5.4-4.6 7.1-.6z"/></svg>
                          {s.overallRating.toFixed(1)}
                        </div>
                      ) : <span style={{ color: 'var(--ink-faint)' }}>—</span>}
                    </div>
                    <span className={`badge ${meta.cls}`}>{meta.label}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                      {[
                        { icon: <svg viewBox="0 0 24 24" fill="none"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" stroke="currentColor" strokeWidth="2"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/></svg>, danger: false, title: 'View', action: () => alert('View details not fully implemented') },
                        { icon: <svg viewBox="0 0 24 24" fill="none"><path d="M4 20l4-1 11-11-3-3L5 16l-1 4z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/></svg>, danger: false, title: 'Edit', action: () => handleOpenModal('edit', s) },
                        { icon: <svg viewBox="0 0 24 24" fill="none"><path d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m-8 0l1 12a2 2 0 002 2h4a2 2 0 002-2l1-12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>, danger: true, title: 'Delete', action: () => handleDeleteStudent(s._id) },
                      ].map((btn, j) => (
                        <button key={j} title={btn.title} onClick={btn.action} style={{ width: 30, height: 30, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-soft)', transition: 'all .2s', cursor: 'pointer', background: 'transparent', border: 'none', outline: 'none' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = btn.danger ? 'rgba(215,25,32,0.1)' : 'rgba(79,162,207,0.12)'; (e.currentTarget as HTMLElement).style.color = btn.danger ? 'var(--primary-red)' : 'var(--primary-blue)'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--ink-soft)'; }}>
                          <span style={{ width: '14.5px', height: '14.5px', display: 'flex' }}>{btn.icon}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 14px 6px', borderTop: '1px solid var(--line)', marginTop: 10 }}>
            <div style={{ fontSize: '12.5px', color: 'var(--ink-soft)' }}>Showing <b style={{ color: 'var(--ink)' }}>{filtered.length}</b> of <b style={{ color: 'var(--ink)' }}>{totalStudents}</b> students</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button className="icon-btn" style={{ width: 30, height: 30, cursor: page <= 1 ? 'not-allowed' : 'pointer' }} disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                <svg viewBox="0 0 24 24" fill="none" style={{ width: 14, height: 14, color: page <= 1 ? 'var(--line)' : 'var(--ink-soft)' }}><path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
              <span className="num" style={{ fontSize: '12.5px', color: 'var(--ink-soft)', padding: '0 6px' }}>{page} / {totalPages}</span>
              <button className="icon-btn" style={{ width: 30, height: 30, cursor: page >= totalPages ? 'not-allowed' : 'pointer' }} disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                <svg viewBox="0 0 24 24" fill="none" style={{ width: 14, height: 14, color: page >= totalPages ? 'var(--line)' : 'var(--ink-soft)' }}><path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>
          </div>
        </div>
      </Reveal>
      </>
      )}

      {/* Modal for Add/Edit Student */}
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(21,36,48,0.28)', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'var(--glass)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.7)', borderRadius: 20, padding: 32, width: '90%', maxWidth: 440, boxShadow: 'var(--shadow-lg)' }}>
            <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 20 }}>{modalMode === 'add' ? 'Add Student' : 'Edit Student'}</h2>
            <form onSubmit={handleSaveStudent} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink-soft)', marginBottom: 6 }}>Roll Number*</label>
                <input type="text" value={formData.rollNo} onChange={e => setFormData({ ...formData, rollNo: e.target.value })} required style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--line)', background: 'rgba(255,255,255,0.6)', outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink-soft)', marginBottom: 6 }}>Full Name*</label>
                <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--line)', background: 'rgba(255,255,255,0.6)', outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink-soft)', marginBottom: 6 }}>Admission Number</label>
                <input type="text" value={formData.admissionNo} onChange={e => setFormData({ ...formData, admissionNo: e.target.value })} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--line)', background: 'rgba(255,255,255,0.6)', outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink-soft)', marginBottom: 6 }}>Presentation Title</label>
                <input type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--line)', background: 'rgba(255,255,255,0.6)', outline: 'none' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 10 }}>
                <button type="button" onClick={handleCloseModal} style={{ padding: '10px 18px', borderRadius: 100, border: 'none', background: 'transparent', fontWeight: 600, cursor: 'pointer', color: 'var(--ink-soft)' }}>Cancel</button>
                <button type="submit" className="btn-primary">Save Student</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </main>
  );
};

export default Students;
