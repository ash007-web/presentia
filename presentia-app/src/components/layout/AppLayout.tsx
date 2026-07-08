import React from 'react';
import { Outlet } from 'react-router-dom';
import AnimatedBackground from './AnimatedBackground';
import Topbar from './Topbar';

const AppLayout: React.FC = () => (
  <>
    <AnimatedBackground />
    <Topbar />
    <Outlet />
  </>
);

export default AppLayout;
