import React from 'react';
// FIX: Replaced non-existent `ScaleIcon` with the correct `SetScaleIcon` component to resolve an import error.
import { GridIcon, LightModeIcon, DarkModeIcon, SetScaleIcon, CloseIcon } from './Icons';

interface GridControlsProps {
  isOpen: boolean;
  onClose: () => void;
  gridVisible: boolean;
  onToggleGrid: () => void;
  gridStyle: 'light' | 'dark';
  onSetGridStyle: (style: 'light' | 'dark') => void;
  onStartScale: () => void;
  gridScaleFactor: number;
  onOpenScaleModal: () => void;
}

const ToolButton: React.FC<{ title: string; onClick: () => void; active?: boolean; children: React.ReactNode; }> = ({ title, onClick, active = false, children }) => (
  <button
    title={title}
    onClick={onClick}
    className={`p-3 w-[60px] h-[60px] flex items-center justify-center rounded-lg transition-colors duration-150 ${active ? 'bg-stone-500 text-white' : 'bg-stone-700 text-stone-300 hover:bg-stone-600 hover:text-white'}`}
  >
    {children}
  </button>
);

export const GridControls: React.FC<GridControlsProps> = ({
  isOpen,
  onClose,
  gridVisible,
  onToggleGrid,
  gridStyle,
  onSetGridStyle,
  onStartScale,
  onOpenScaleModal,
  gridScaleFactor,
}) => {
  if (!isOpen) return null;

  return (
    <div className="absolute top-0 left-[68px] h-full bg-stone-800 shadow-2xl z-20 flex flex-col p-2 gap-2">
        <ToolButton title="Close" onClick={onClose}><CloseIcon className="w-7 h-7" /></ToolButton>
        <div className="border-t border-stone-700 my-1"></div>
        <ToolButton title={gridVisible ? "Hide Grid" : "Show Grid"} onClick={onToggleGrid} active={gridVisible}>
            <GridIcon className="w-7 h-7" />
        </ToolButton>
        <ToolButton 
            title={gridStyle === 'light' ? "Switch to Dark Grid" : "Switch to Light Grid"}
            onClick={() => onSetGridStyle(gridStyle === 'light' ? 'dark' : 'light')}
        >
            {gridStyle === 'light' ? <DarkModeIcon className="w-7 h-7"/> : <LightModeIcon className="w-7 h-7" />}
        </ToolButton>
        <ToolButton title={`Set feet per square (${gridScaleFactor} ft)`} onClick={onOpenScaleModal}>
            <span className="text-xl font-bold">{gridScaleFactor}</span>
        </ToolButton>
         <ToolButton title="Set Scale from Map" onClick={onStartScale}>
            <SetScaleIcon className="w-7 h-7" />
        </ToolButton>
    </div>
  );
};