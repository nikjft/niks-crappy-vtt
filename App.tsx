
import React, { useState, useEffect } from 'react';
import MasterView from './components/MasterView';
import PlayerView from './components/PlayerView';

const App: React.FC = () => {
  const [view, setView] = useState(window.location.hash);

  useEffect(() => {
    const handleHashChange = () => {
      setView(window.location.hash);
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  if (view === '#/player') {
    return <PlayerView />;
  }

  return <MasterView />;
};

export default App;
