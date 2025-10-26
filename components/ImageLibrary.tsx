import React, { useState, useRef, DragEvent, useCallback } from 'react';
import { LibraryState, ImageEntry, Folder } from '../types';
import { TrashIcon, FolderIcon, UploadIcon, ReloadIcon, MapIcon, FolderPlusIcon, GridIcon, LightModeIcon, DarkModeIcon, SetScaleIcon, ChevronDownIcon, CheckIcon, CrosshairsIcon } from './Icons';

interface ImageLibraryProps {
  library: LibraryState;
  blankMap: ImageEntry | null;
  saveLibrary: (library: LibraryState) => void;
  onImageSelect: (image: ImageEntry) => void;
  addImage: (file: File) => void;
  onConfirmRemoveImage: (imageId: string, imageName: string) => void;
  onOpenAddFolderModal: () => void;
  removeFolder: (folderId: string) => void;
  renameFolder: (folderId: string, newName: string) => void;
  onConfirmReloadImageState: () => void;
  gridVisible: boolean;
  onToggleGrid: () => void;
  gridStyle: 'light' | 'dark';
  onSetGridStyle: (style: 'light' | 'dark') => void;
  onStartScale: () => void;
  onStartCalibration: () => void;
  gridScaleFactor: number;
  onOpenScaleModal: () => void;
  loadedImageId?: string;
  onSetBackgroundColor: (color: string) => void;
}

const GridControlButton: React.FC<{ title: string; onClick: () => void; active?: boolean; children: React.ReactNode; }> = ({ title, onClick, active = false, children }) => (
    <button
      title={title}
      onClick={onClick}
      className={`p-2 h-12 flex-1 flex items-center justify-center rounded-lg transition-colors duration-150 ${active ? 'bg-stone-500 text-white' : 'bg-stone-700 text-stone-300 hover:bg-stone-600 hover:text-white'}`}
    >
      {children}
    </button>
  );

const ColorButton: React.FC<{ color: string, name: string, onClick: (color: string) => void }> = ({ color, name, onClick }) => (
    <button
        title={`Set background to ${name}`}
        onClick={() => onClick(color)}
        className="w-8 h-8 rounded-full border-2 border-stone-600 hover:border-white transition-colors"
        style={{ backgroundColor: color }}
    />
);

export const ImageLibrary: React.FC<ImageLibraryProps> = ({
  library,
  blankMap,
  saveLibrary,
  onImageSelect,
  addImage,
  onConfirmRemoveImage,
  onOpenAddFolderModal,
  removeFolder,
  renameFolder,
  onConfirmReloadImageState,
  gridVisible,
  onToggleGrid,
  gridStyle,
  onSetGridStyle,
  onStartScale,
  onStartCalibration,
  gridScaleFactor,
  onOpenScaleModal,
  loadedImageId,
  onSetBackgroundColor,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['uncategorized']));
  const [draggedItem, setDraggedItem] = useState<{ type: 'image' | 'folder'; id: string } | null>(null);
  const [editingFolder, setEditingFolder] = useState<{ id: string; name: string } | null>(null);

  const unfiledImages = [...library.unfiled].sort((a, b) => a.name.localeCompare(b.name));
  const sortedFolders = [...library.folders].sort((a, b) => a.name.localeCompare(b.name));

  const handleAddImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      addImage(e.target.files[0]);
    }
    // Reset file input to allow uploading the same file again
    if(e.target) e.target.value = '';
  };
  
  const handleRenameFolder = () => {
    if (editingFolder && editingFolder.name.trim()) {
      renameFolder(editingFolder.id, editingFolder.name.trim());
    }
    setEditingFolder(null);
  }

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  };

  const onDragStart = (e: DragEvent, type: 'image' | 'folder', id: string) => {
    e.dataTransfer.effectAllowed = 'move';
    setDraggedItem({ type, id });
  };
  
  const onDragOver = (e: DragEvent) => {
      e.preventDefault();
  };

  const onDrop = useCallback((e: DragEvent, targetFolderId: string | null) => {
    e.preventDefault();
    if (!draggedItem || !blankMap || draggedItem.id === blankMap.id) return;

    const { type, id } = draggedItem;
    const newLibrary = JSON.parse(JSON.stringify(library));
    
    if (type === 'image') {
        let image: ImageEntry | undefined;
        let sourceFolder: Folder | undefined | { images: ImageEntry[] } = newLibrary.folders.find((f: Folder) => f.images.some(i => i.id === id));
        if (sourceFolder) {
            const imgIndex = sourceFolder.images.findIndex(i => i.id === id);
            [image] = sourceFolder.images.splice(imgIndex, 1);
        } else {
             const imgIndex = newLibrary.unfiled.findIndex(i => i.id === id);
             if (imgIndex > -1) {
                [image] = newLibrary.unfiled.splice(imgIndex, 1);
             }
        }
        
        if (image) {
            if (targetFolderId) {
                const targetFolder = newLibrary.folders.find((f: Folder) => f.id === targetFolderId);
                targetFolder?.images.push(image);
            } else {
                newLibrary.unfiled.push(image);
            }
        }
    }
    
    saveLibrary(newLibrary);
    setDraggedItem(null);
  }, [draggedItem, library, saveLibrary, blankMap]);

  const isUncategorizedLoaded = unfiledImages.some(img => img.id === loadedImageId);

  return (
    <div className="h-full w-80 bg-stone-800 shadow-2xl flex flex-col text-stone-200">
        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm" />
        <div className="flex justify-between items-center p-2 gap-2 border-b border-stone-700">
            <div className="flex items-center gap-2">
                <ColorButton color="#FFFFFF" name="White" onClick={onSetBackgroundColor} />
                <ColorButton color="#A8A29E" name="Gray" onClick={onSetBackgroundColor} />
                <ColorButton color="#F5E5C9" name="Parchment" onClick={onSetBackgroundColor} />
            </div>
            <div className="flex items-center">
                <button onClick={handleAddImageClick} title="Add Image" className="text-stone-300 hover:text-white p-2 hover:bg-stone-700 rounded"><UploadIcon className="w-6 h-6"/></button>
                <button onClick={onOpenAddFolderModal} title="Add Folder" className="text-stone-300 hover:text-white p-2 hover:bg-stone-700 rounded"><FolderPlusIcon className="w-6 h-6"/></button>
                <button onClick={onConfirmReloadImageState} title="Reload Map State" className="text-stone-300 hover:text-white p-2 hover:bg-stone-700 rounded"><ReloadIcon className="w-6 h-6"/></button>
            </div>
        </div>
        <div className="flex-grow overflow-y-auto p-2 pr-1">
            {blankMap && (
                 <div
                    onClick={() => onImageSelect(blankMap)}
                    className="flex items-center justify-between p-2 rounded hover:bg-stone-700 cursor-pointer"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <MapIcon className="w-5 h-5 text-green-400" />
                      <span className="truncate">{blankMap.name}</span>
                    </div>
                    {loadedImageId === blankMap.id && <CheckIcon className="w-5 h-5 text-green-400" />}
                </div>
            )}
            <div onDragOver={onDragOver} onDrop={(e) => onDrop(e, null)}>
                <div className="flex items-center justify-between p-2 rounded hover:bg-stone-700 cursor-pointer" onClick={() => toggleFolder('uncategorized')}>
                    <div className="flex items-center gap-2">
                        <ChevronDownIcon className={`w-5 h-5 text-stone-400 transition-transform ${expandedFolders.has('uncategorized') ? 'rotate-0' : '-rotate-90'}`} />
                        <FolderIcon className="w-5 h-5 text-stone-400" />
                        <span className="font-semibold">Uncategorized</span>
                    </div>
                    {isUncategorizedLoaded && <CheckIcon className="w-5 h-5 text-green-400" />}
                </div>
                 {expandedFolders.has('uncategorized') && (
                    <div className="pl-6 border-l-2 border-stone-700">
                        {unfiledImages.map(image => (
                            <div key={image.id} draggable onDragStart={(e) => onDragStart(e, 'image', image.id)}
                                className="flex items-center justify-between p-2 rounded hover:bg-stone-600 cursor-pointer">
                                <div className="flex items-center gap-2 truncate" onClick={() => onImageSelect(image)}>
                                    <span className="truncate">{image.name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {image.id === loadedImageId && <CheckIcon className="w-5 h-5 text-green-400" />}
                                    <button onClick={() => onConfirmRemoveImage(image.id, image.name)} className="text-stone-500 hover:text-red-500"><TrashIcon className="w-4 h-4"/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            {sortedFolders.map(folder => {
                const isFolderLoaded = folder.images.some(img => img.id === loadedImageId);
                return (
                    <div key={folder.id} onDragOver={onDragOver} onDrop={(e) => onDrop(e, folder.id)}>
                        <div className="flex items-center justify-between p-2 rounded hover:bg-stone-700 cursor-pointer">
                            <div className="flex items-center gap-2" onClick={() => toggleFolder(folder.id)}>
                                <ChevronDownIcon className={`w-5 h-5 text-stone-400 transition-transform ${expandedFolders.has(folder.id) ? 'rotate-0' : '-rotate-90'}`} />
                                <FolderIcon className="w-5 h-5 text-blue-400" />
                                {editingFolder?.id === folder.id ? (
                                    <input
                                        type="text"
                                        value={editingFolder.name}
                                        onChange={(e) => setEditingFolder({ ...editingFolder, name: e.target.value })}
                                        onBlur={handleRenameFolder}
                                        onKeyDown={(e) => { if (e.key === 'Enter') handleRenameFolder(); if (e.key === 'Escape') setEditingFolder(null); }}
                                        onClick={e => e.stopPropagation()}
                                        className="bg-stone-900 text-white rounded px-1 -my-1"
                                        autoFocus
                                    />
                                ) : (
                                    <span onDoubleClick={() => setEditingFolder({ id: folder.id, name: folder.name })}>{folder.name}</span>
                                )}
                            </div>
                             <div className="flex items-center gap-2">
                                {isFolderLoaded && <CheckIcon className="w-5 h-5 text-green-400" />}
                                <button onClick={() => removeFolder(folder.id)} className="text-stone-500 hover:text-red-500"><TrashIcon className="w-4 h-4"/></button>
                             </div>
                        </div>
                        {expandedFolders.has(folder.id) && (
                            <div className="pl-6 border-l-2 border-stone-700">
                                {folder.images.slice().sort((a, b) => a.name.localeCompare(b.name)).map(image => (
                                    <div key={image.id} draggable onDragStart={(e) => onDragStart(e, 'image', image.id)}
                                        className="flex items-center justify-between p-2 rounded hover:bg-stone-600 cursor-pointer">
                                        <span className="truncate" onClick={() => onImageSelect(image)}>{image.name}</span>
                                        <div className="flex items-center gap-2">
                                            {image.id === loadedImageId && <CheckIcon className="w-5 h-5 text-green-400" />}
                                            <button onClick={() => onConfirmRemoveImage(image.id, image.name)} className="text-stone-500 hover:text-red-500"><TrashIcon className="w-4 h-4"/></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
      <div className="mt-auto p-2 border-t border-stone-700 flex flex-wrap items-center gap-2">
        <GridControlButton title={gridVisible ? "Hide Grid" : "Show Grid"} onClick={onToggleGrid} active={gridVisible}>
            <GridIcon className="w-6 h-6" />
        </GridControlButton>
        <GridControlButton 
            title={gridStyle === 'light' ? "Switch to Dark Grid" : "Switch to Light Grid"}
            onClick={() => onSetGridStyle(gridStyle === 'light' ? 'dark' : 'light')}
        >
            {gridStyle === 'light' ? <DarkModeIcon className="w-6 h-6"/> : <LightModeIcon className="w-6 h-6" />}
        </GridControlButton>
        <GridControlButton title={`Set feet per square (${gridScaleFactor} ft)`} onClick={onOpenScaleModal}>
            <span className="text-lg font-bold">{gridScaleFactor}</span>
        </GridControlButton>
         <GridControlButton title="Set Scale from Map" onClick={onStartScale}>
            <SetScaleIcon className="w-6 h-6" />
        </GridControlButton>
        <GridControlButton title="Calibrate Display" onClick={onStartCalibration}>
            <CrosshairsIcon className="w-6 h-6" />
        </GridControlButton>
      </div>
       <style>{`
          .overflow-y-auto::-webkit-scrollbar { width: 8px; }
          .overflow-y-auto::-webkit-scrollbar-track { background: transparent; }
          .overflow-y-auto::-webkit-scrollbar-thumb { background-color: #57534e; border-radius: 20px; border: 2px solid #292524; }
      `}</style>
    </div>
  );
};
