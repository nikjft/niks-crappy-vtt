import React from 'react';
import { LibraryIcon, NewWindowIcon, RulerIcon, FogIcon } from './Icons';

type ActiveToolbar = 'library' | 'measure' | 'fog' | null;

interface ToolbarProps {
  onToggleLibrary: () => void;
  onToggleMeasureControls: () => void;
  onToggleFogControls: () => void;
  onOpenPlayerWindow: () => void;
  isMeasureControlsDisabled?: boolean;
  isFogControlsDisabled?: boolean;
  activeToolbar?: ActiveToolbar;
}

const ToolbarButton: React.FC<{ onClick: () => void; children: React.ReactNode; title: string, disabled?: boolean, active?: boolean }> = ({ onClick, children, title, disabled = false, active = false }) => (
    <button 
        onClick={onClick}
        title={title}
        disabled={disabled}
        className={`p-3 rounded-lg transition-colors duration-150 ${disabled ? 'text-stone-600 cursor-not-allowed' : active ? 'bg-stone-700 text-stone-100' : 'text-stone-400 hover:text-stone-100 hover:bg-stone-700'}`}
    >
        {children}
    </button>
);

export const Toolbar: React.FC<ToolbarProps> = ({ 
    onToggleLibrary, 
    onToggleMeasureControls,
    onToggleFogControls,
    onOpenPlayerWindow, 
    isMeasureControlsDisabled,
    isFogControlsDisabled,
    activeToolbar,
}) => {
  return (
    <div className="absolute top-0 left-0 h-full bg-stone-900 p-2 flex flex-col items-center justify-between z-30">
      <div className="flex flex-col items-center gap-2">
        <ToolbarButton onClick={onToggleLibrary} title="Image Library" active={activeToolbar === 'library'}>
          <LibraryIcon className="w-7 h-7" />
        </ToolbarButton>
        <ToolbarButton onClick={onToggleMeasureControls} title="Measure Tools" disabled={isMeasureControlsDisabled} active={activeToolbar === 'measure'}>
            <RulerIcon className="w-7 h-7" />
        </ToolbarButton>
        <ToolbarButton onClick={onToggleFogControls} title="Fog of War" disabled={isFogControlsDisabled} active={activeToolbar === 'fog'}>
            <FogIcon className="w-7 h-7" />
        </ToolbarButton>
      </div>
      <div className="flex flex-col items-center gap-2">
        <ToolbarButton onClick={onOpenPlayerWindow} title="Open Player Window">
          <NewWindowIcon className="w-7 h-7" />
        </ToolbarButton>
      </div>
    </div>
  );
};