import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import { NotificationProvider } from './context/NotificationContext';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Students = lazy(() => import('./pages/Students'));
const Presentation = lazy(() => import('./pages/Presentation'));
const Leaderboard = lazy(() => import('./pages/Leaderboard'));
const Timetable = lazy(() => import('./pages/Timetable'));
const Reports = lazy(() => import('./pages/Reports'));
const Settings = lazy(() => import('./pages/Settings'));
const Analytics = lazy(() => import('./pages/Analytics'));

const Loader = () => (
  <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:'60vh' }}>
    <div style={{ width:40,height:40,borderRadius:'50%',border:'3px solid var(--line)',borderTopColor:'var(--primary-blue)',animation:'spin .8s linear infinite' }}/>
  </div>
);

const App: React.FC = () => (
  <NotificationProvider>
    <BrowserRouter>
      <Suspense fallback={<Loader/>}>
        <Routes>
          <Route element={<AppLayout/>}>
            <Route index element={<Dashboard/>}/>
            <Route path="students" element={<Students/>}/>
            <Route path="leaderboard" element={<Leaderboard/>}/>
            <Route path="timetable" element={<Timetable/>}/>
            <Route path="reports" element={<Reports/>}/>
            <Route path="settings" element={<Settings/>}/>
            <Route path="analytics" element={<Analytics/>}/>
          </Route>
          {/* Presentation has its own minimal layout */}
          <Route path="presentation" element={<Presentation/>}/>
        </Routes>
      </Suspense>
    </BrowserRouter>
  </NotificationProvider>
);

export default App;
