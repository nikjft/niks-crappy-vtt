import React from 'react';
import { ZoomInIcon, ZoomOutIcon, FitToScreenIcon, ActualSizeIcon, PauseIcon, PlayIcon } from './Icons';

interface NavControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  onActualSize: () => void;
  isPaused: boolean;
  onTogglePause: () => void;
}

const NavButton: React.FC<{ onClick: () => void; children: React.ReactNode; active?: boolean, title?: string }> = ({ onClick, children, active = false, title }) => (
  <button
    onClick={onClick}
    title={title}
    className={`p-3 rounded-full ${active ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-stone-700 hover:bg-stone-600 text-white'} transition-all duration-150 shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-400`}
  >
    {children}
  </button>
);


export const NavControls: React.FC<NavControlsProps> = ({ onZoomIn, onZoomOut, onFit, onActualSize, isPaused, onTogglePause }) => {
  return (
    <div className="absolute bottom-5 right-5 flex flex-col gap-3 z-20">
      <NavButton onClick={onZoomIn} title="Zoom In"><ZoomInIcon className="w-6 h-6" /></NavButton>
      <NavButton onClick={onZoomOut} title="Zoom Out"><ZoomOutIcon className="w-6 h-6" /></NavButton>
      <NavButton onClick={onTogglePause} active={isPaused} title={isPaused ? "Resume Sync" : "Pause Sync"}>
        {isPaused ? <PlayIcon className="w-6 h-6" /> : <PauseIcon className="w-6 h-6" />}
      </NavButton>
      <NavButton onClick={onFit} title="Fit to Screen"><FitToScreenIcon className="w-6 h-6" /></NavButton>
      <NavButton onClick={onActualSize} title="Actual Size (100%)"><ActualSizeIcon className="w-6 h-6" /></NavButton>
    </div>
  );
};
