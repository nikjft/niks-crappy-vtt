
import React, { useState, useEffect } from 'react';
import MasterView from './components/MasterView';
import PlayerView from './components/PlayerView';
import { useServiceWorker } from './hooks/useServiceWorker';
import { ReloadIcon } from './components/Icons';

const App: React.FC = () => {
  const [view, setView] = useState(window.location.hash);
  const { isUpdateAvailable, updateAssets } = useServiceWorker();

  useEffect(() => {
    const handleHashChange = () => {
      setView(window.location.hash);
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  const viewComponent = view === '#/player' ? <PlayerView /> : <MasterView />;

  return (
    <>
      {viewComponent}
      {isUpdateAvailable && (
        <div className="fixed bottom-4 right-4 bg-blue-600 text-white p-4 rounded-lg shadow-lg z-50 flex items-center gap-4 animate-fade-in-up">
          <span>A new version is available.</span>
          <button
            onClick={updateAssets}
            className="flex items-center gap-2 bg-white text-blue-600 font-bold py-2 px-3 rounded hover:bg-blue-100 transition-colors"
          >
            <ReloadIcon className="w-5 h-5" />
            <span>Reload</span>
          </button>
        </div>
      )}
      <style>{`
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.3s ease-out forwards;
        }
      `}</style>
    </>
  );
};

export default App;