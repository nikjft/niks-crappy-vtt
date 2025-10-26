import React from 'react';
import { PathIcon, CircleIcon, SquareIcon, TriangleIcon, LineIcon, CloseIcon, TrashIcon } from './Icons';
import { Measurement } from '../types';

interface MeasureControlsProps {
  onSelectTool: (tool: Measurement['type'] | null) => void;
  activeTool: Measurement['type'] | null;
  onConfirmClearAllEffects: () => void;
}

const ToolButton: React.FC<{
    title: string;
    tool?: Measurement['type'];
    activeTool?: Measurement['type'] | null;
    onClick: (tool?: Measurement['type']) => void;
    children: React.ReactNode;
}> = ({ title, tool, activeTool, onClick, children }) => (
    <button
        title={title}
        onClick={() => onClick(tool)}
        className={`p-3 w-[60px] h-[60px] flex items-center justify-center rounded-lg transition-colors duration-150 ${activeTool === tool ? 'bg-stone-500 text-white' : 'bg-stone-700 text-stone-300 hover:bg-stone-600 hover:text-white'}`}
    >
        {children}
    </button>
);

export const MeasureControls: React.FC<MeasureControlsProps> = ({ onSelectTool, activeTool, onConfirmClearAllEffects }) => {
  return (
    <div className="h-full bg-stone-800 shadow-2xl flex flex-col p-2 gap-2">
        <ToolButton title="Path Tool" tool="path" activeTool={activeTool} onClick={() => onSelectTool('path')}>
            <PathIcon className="w-7 h-7" />
        </ToolButton>
        <ToolButton title="Line Tool" tool="line-rect" activeTool={activeTool} onClick={() => onSelectTool('line-rect')}>
            <LineIcon className="w-7 h-7" />
        </ToolButton>
        <ToolButton title="Circle Tool" tool="circle" activeTool={activeTool} onClick={() => onSelectTool('circle')}>
            <CircleIcon className="w-7 h-7" />
        </ToolButton>
        <ToolButton title="Square Tool" tool="square" activeTool={activeTool} onClick={() => onSelectTool('square')}>
            <SquareIcon className="w-7 h-7" />
        </ToolButton>
        <ToolButton title="Cone Tool" tool="cone" activeTool={activeTool} onClick={() => onSelectTool('cone')}>
            <TriangleIcon className="w-7 h-7" />
        </ToolButton>
        <div className="border-t border-stone-700 my-1"></div>
        <button
            title="Clear All Persistent Effects"
            onClick={onConfirmClearAllEffects}
            className="p-3 w-[60px] h-[60px] flex items-center justify-center rounded-lg transition-colors duration-150 bg-stone-600 text-stone-200 hover:bg-red-600"
        >
            <TrashIcon className="w-7 h-7" />
        </button>
    </div>
  );
};