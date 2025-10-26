import React from 'react';
import { useWindowSync } from '../hooks/useWindowSync';
import { Viewport } from './Viewport';
import { ViewportState } from '../types';
import { useFullScreen } from '../hooks/useFullScreen';
import { FullScreenIcon, ExitFullScreenIcon } from './Icons';

const PlayerView: React.FC = () => {
    const initialViewportState: ViewportState = {
        imageId: null,
        imageUrl: null,
        imageWidth: 0,
        imageHeight: 0,
        scale: 1,
        translateX: 0,
        translateY: 0,
    };
    
    // Player view only receives state, never sets it.
    const [viewportState] = useWindowSync(initialViewportState);
    const { isFullScreen, toggleFullScreen } = useFullScreen();
    
    const masterViewportSize = 
      (viewportState.masterViewportWidth && viewportState.masterViewportHeight) 
      ? { width: viewportState.masterViewportWidth, height: viewportState.masterViewportHeight }
      : undefined;

    return (
        <div className="w-screen h-screen relative">
            <Viewport
                state={viewportState}
                isInteractive={false}
                masterViewportSize={masterViewportSize}
            />
            <button
              onClick={toggleFullScreen}
              className="absolute top-5 right-5 p-3 rounded-full bg-stone-700/50 hover:bg-stone-600/70 text-white transition-all duration-150 shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-400 z-20"
              title={isFullScreen ? 'Exit Full Screen' : 'Enter Full Screen'}
            >
              {isFullScreen ? <ExitFullScreenIcon className="w-6 h-6" /> : <FullScreenIcon className="w-6 h-6" />}
            </button>
        </div>
    );
};

export default PlayerView;