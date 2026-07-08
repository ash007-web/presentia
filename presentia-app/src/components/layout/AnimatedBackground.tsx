import React from 'react';

const AnimatedBackground: React.FC = () => (
  <div className="bg-fx">
    <div className="bg-blob b1" />
    <div className="bg-blob b2" />
    <div className="bg-blob b3" />
    <svg className="bg-lines" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <line x1="0" y1="10%" x2="100%" y2="35%" stroke="#4FA2CF" strokeOpacity="0.05" strokeWidth="1"/>
      <line x1="0" y1="70%" x2="100%" y2="40%" stroke="#4FA2CF" strokeOpacity="0.045" strokeWidth="1"/>
      <line x1="20%" y1="0" x2="60%" y2="100%" stroke="#8EC4E3" strokeOpacity="0.04" strokeWidth="1"/>
    </svg>
    <div className="bg-noise" />
  </div>
);

export default AnimatedBackground;
