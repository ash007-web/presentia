import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { pad, initialsOf } from '../../utils/helpers';
import { useNotifications } from '../../context/NotificationContext';
import { getCurrentTimetableInfo } from '../../services/timetableService';

const NAV_LINKS = [
  { to: '/', label: 'Dashboard' },
  { to: '/presentation', label: 'Presentations' },
  { to: '/students', label: 'Students' },
  { to: '/leaderboard', label: 'Leaderboard' },
  { to: '/timetable', label: 'Timetable' },
  { to: '/reports', label: 'Reports' },
  { to: '/analytics', label: 'Analytics' },
  { to: '/settings', label: 'Settings' },
];

const PAGES = [
  { label: 'Dashboard', path: '/' },
  { label: 'Presentations', path: '/presentation' },
  { label: 'Students', path: '/students' },
  { label: 'Leaderboard', path: '/leaderboard' },
  { label: 'Timetable', path: '/timetable' },
  { label: 'Reports', path: '/reports' },
  { label: 'Analytics', path: '/analytics' },
  { label: 'Settings', path: '/settings' },
];

const Topbar: React.FC = () => {
  const { notifications, markAsRead, clearAll } = useNotifications();
  const [time, setTime] = useState('');
  const [date, setDate] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ label: string; path: string }[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const searchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [facultyName, setFacultyName] = useState('Navyamol K T');

  useEffect(() => {
    const fetchFaculty = () => {
      getCurrentTimetableInfo().then(ttInfo => {
        setFacultyName(ttInfo.activePeriod ? ttInfo.activePeriod.faculty : (ttInfo.defaultFaculty || 'Navyamol K T'));
      }).catch(console.error);
    };
    fetchFaculty();
    const intervalId = setInterval(fetchFaculty, 30000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      let h = now.getHours();
      const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      setTime(`${pad(h)}:${pad(now.getMinutes())}:${pad(now.getSeconds())} ${ampm}`);
      setDate(now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    };
    updateClock();
    const id = setInterval(updateClock, 1000);
    return () => clearInterval(id);
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
        setSearchQuery('');
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (searchOpen) setTimeout(() => searchInputRef.current?.focus(), 50);
  }, [searchOpen]);

  const handleSearch = (q: string) => {
    setSearchQuery(q);
    if (!q.trim()) { setSearchResults([]); return; }
    const results = PAGES.filter(p => p.label.toLowerCase().includes(q.toLowerCase()));
    setSearchResults(results);
  };

  const showClock = location.pathname === '/';

  return (
    <header className="topbar">
      <div className="brand" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div className="brand-mark" style={{ width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img src="/presentia.svg" alt="Presentia" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
        <div style={{ fontFamily: "'Clash Display',sans-serif", fontSize: 16, fontWeight: 600 }}>
          Presentia<span style={{ color: 'var(--primary-blue)' }}>.</span>
        </div>
      </div>

      <nav style={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'nowrap', overflowX: 'auto' }}>
        {NAV_LINKS.map(link => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === '/'}
            style={({ isActive }) => ({
              fontSize: '13px', fontWeight: 500, padding: '7px 12px', borderRadius: 10,
              transition: 'all .25s', whiteSpace: 'nowrap',
              color: isActive ? 'var(--primary-blue)' : 'var(--ink-soft)',
              background: isActive ? 'var(--light-blue)' : 'transparent',
            })}
          >
            {link.label}
          </NavLink>
        ))}
      </nav>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {showClock && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '11px 18px', borderRadius: 100, background: 'var(--glass)', border: '1px solid var(--line)', boxShadow: 'var(--shadow-sm)', backdropFilter: 'blur(12px)' }}>
            <svg viewBox="0 0 24 24" fill="none" style={{ width: 15, height: 15, color: 'var(--primary-blue)' }}>
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
              <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span className="num" style={{ fontSize: '14.5px', fontWeight: 600 }}>{time}</span>
            <span style={{ fontSize: 12, color: 'var(--ink-soft)', borderLeft: '1px solid var(--line)', paddingLeft: 9 }}>{date}</span>
          </div>
        )}

        {/* Search */}
        <div ref={searchRef} style={{ position: 'relative' }}>
          <button className="icon-btn" aria-label="Search" onClick={() => setSearchOpen(o => !o)}>
            <svg viewBox="0 0 24 24" fill="none" style={{ width: 16, height: 16, color: 'var(--ink-soft)' }}>
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2"/>
              <path d="M21 21l-4.3-4.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
          {searchOpen && (
            <div style={{ position: 'absolute', top: 'calc(100% + 10px)', right: 0, width: 280, background: 'var(--glass)', backdropFilter: 'blur(22px)', border: '1px solid rgba(255,255,255,0.75)', borderRadius: 16, boxShadow: 'var(--shadow-lg)', padding: 10, zIndex: 60 }}>
              <input
                ref={searchInputRef}
                value={searchQuery}
                onChange={e => handleSearch(e.target.value)}
                placeholder="Navigate to…"
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--line)', background: 'rgba(255,255,255,0.7)', fontSize: 13, fontFamily: 'inherit', outline: 'none' }}
              />
              {searchResults.length > 0 && (
                <div style={{ marginTop: 6 }}>
                  {searchResults.map(r => (
                    <button key={r.path} onClick={() => { navigate(r.path); setSearchOpen(false); setSearchQuery(''); }}
                      style={{ width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: 10, border: 'none', background: 'transparent', fontSize: 13, fontWeight: 600, color: 'var(--ink)', cursor: 'pointer', transition: 'background .2s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(79,162,207,0.1)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      {r.label}
                    </button>
                  ))}
                </div>
              )}
              {searchQuery && searchResults.length === 0 && (
                <div style={{ padding: '10px 12px', fontSize: 12, color: 'var(--ink-faint)' }}>No pages found for "{searchQuery}"</div>
              )}
            </div>
          )}
        </div>

        {/* Notifications */}
        <div ref={notifRef} style={{ position: 'relative' }}>
          <button className="icon-btn" aria-label="Notifications" style={{ position: 'relative' }} onClick={() => setNotifOpen(o => !o)}>
            <svg viewBox="0 0 24 24" fill="none" style={{ width: 16, height: 16, color: 'var(--ink-soft)' }}>
              <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
              <path d="M13.7 21a2 2 0 01-3.4 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            {notifications.some(n => !n.read) && <span style={{ position: 'absolute', top: 7, right: 7, width: 7, height: 7, borderRadius: '50%', background: 'var(--accent-red)', boxShadow: '0 0 0 2px rgba(255,255,255,0.9)' }} />}
          </button>
          {notifOpen && (
            <div style={{ position: 'absolute', top: 'calc(100% + 10px)', right: 0, width: 320, background: 'var(--glass)', backdropFilter: 'blur(22px)', border: '1px solid rgba(255,255,255,0.75)', borderRadius: 18, boxShadow: 'var(--shadow-lg)', padding: '14px 0', zIndex: 60, maxHeight: 400, overflowY: 'auto' }}>
              <div style={{ padding: '0 16px 10px', fontSize: 13, fontWeight: 700, borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between' }}>
                <span>Notifications</span>
                {notifications.length > 0 && <span onClick={clearAll} style={{ fontSize: 11, cursor: 'pointer', color: 'var(--ink-soft)' }}>Clear All</span>}
              </div>
              {notifications.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', fontSize: 12, color: 'var(--ink-soft)' }}>No new notifications</div>
              ) : (
                notifications.map((n) => (
                  <div key={n.id} onClick={() => markAsRead(n.id)} style={{ display: 'flex', gap: 10, padding: '12px 16px', cursor: 'pointer', transition: 'background .2s', opacity: n.read ? 0.6 : 1 }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(79,162,207,0.06)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: !n.read ? (n.priority === 'high' ? 'var(--primary-red)' : 'var(--primary-blue)') : 'var(--line)', marginTop: 5, flexShrink: 0 }}/>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600 }}>{n.title}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>{n.description}</div>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--ink-faint)', whiteSpace: 'nowrap' }}>
                      {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* User Profile */}
        <div ref={profileRef} style={{ position: 'relative' }}>
          <button onClick={() => setProfileOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '5px 12px 5px 5px', borderRadius: 100, background: 'rgba(255,255,255,0.6)', border: '1px solid var(--line)', cursor: 'pointer' }}>
            <div className="avatar-sm">{initialsOf(facultyName) || 'NK'}</div>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{facultyName}</span>
          </button>
          {profileOpen && (
            <div style={{ position: 'absolute', top: 'calc(100% + 10px)', right: 0, width: 220, background: 'var(--glass)', backdropFilter: 'blur(22px)', border: '1px solid rgba(255,255,255,0.75)', borderRadius: 18, boxShadow: 'var(--shadow-lg)', padding: '10px 0', zIndex: 60 }}>
              <div style={{ padding: '10px 16px 14px', borderBottom: '1px solid var(--line)' }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{facultyName}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Faculty · Computer Science</div>
              </div>
              {[
                { label: 'Settings', path: '/settings' },
                { label: 'Analytics', path: '/analytics' },
              ].map(item => (
                <button key={item.path} onClick={() => { navigate(item.path); setProfileOpen(false); }}
                  style={{ width: '100%', textAlign: 'left', padding: '11px 16px', background: 'none', border: 'none', fontSize: 13, fontWeight: 600, color: 'var(--ink)', cursor: 'pointer', transition: 'background .2s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(79,162,207,0.08)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Topbar;
