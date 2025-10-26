import React from 'react';
import { FogTool } from '../types';
import { CloudIcon, CloudOffIcon, MoonIcon, SunIcon, CloseIcon, EyeIcon, EyeOffIcon } from './Icons';

interface FogControlsProps {
  onSelectTool: (tool: FogTool | null) => void;
  activeTool: FogTool | null;
  onConfirmClearAll: () => void;
  onConfirmHideAll: () => void;
  isFogVisibleForMaster: boolean;
  onToggleFogVisibility: () => void;
}

const ToolButton: React.FC<{
    title: string;
    tool?: FogTool;
    activeTool?: FogTool | null;
    onClick: (tool?: FogTool) => void;
    children: React.ReactNode;
    active?: boolean;
}> = ({ title, tool, activeTool, onClick, children, active }) => (
    <button
        title={title}
        onClick={() => onClick(tool)}
        className={`p-3 w-[60px] h-[60px] flex items-center justify-center rounded-lg transition-colors duration-150 ${active || activeTool === tool ? 'bg-stone-500 text-white' : 'bg-stone-700 text-stone-300 hover:bg-stone-600 hover:text-white'}`}
    >
        {children}
    </button>
);

export const FogControls: React.FC<FogControlsProps> = ({ onSelectTool, activeTool, onConfirmClearAll, onConfirmHideAll, isFogVisibleForMaster, onToggleFogVisibility }) => {
  return (
    <div className="h-full bg-stone-800 shadow-2xl flex flex-col p-2 gap-2">
        <ToolButton title="Add Fog" tool="add" activeTool={activeTool} onClick={() => onSelectTool('add')}>
            <CloudIcon className="w-7 h-7" />
        </ToolButton>
        <ToolButton title="Remove Fog" tool="remove" activeTool={activeTool} onClick={() => onSelectTool('remove')}>
            <CloudOffIcon className="w-7 h-7" />
        </ToolButton>
        <ToolButton title={isFogVisibleForMaster ? "Hide Fog Layer" : "Show Fog Layer"} active={!isFogVisibleForMaster} onClick={onToggleFogVisibility}>
            {isFogVisibleForMaster ? <EyeIcon className="w-7 h-7" /> : <EyeOffIcon className="w-7 h-7" />}
        </ToolButton>
        <div className="border-t border-stone-700 my-1"></div>
        <button
          title="Hide All"
          onClick={onConfirmHideAll}
          className="p-3 w-[60px] h-[60px] flex items-center justify-center rounded-lg transition-colors duration-150 bg-stone-600 text-stone-200 hover:bg-stone-700"
        >
            <MoonIcon className="w-7 h-7" />
        </button>
        <button
          title="Clear All Fog"
          onClick={onConfirmClearAll}
          className="p-3 w-[60px] h-[60px] flex items-center justify-center rounded-lg transition-colors duration-150 bg-stone-600 text-stone-200 hover:bg-red-600"
        >
            <SunIcon className="w-7 h-7" />
        </button>
    </div>
  );
};