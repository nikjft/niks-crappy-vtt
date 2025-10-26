import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Toolbar } from './Toolbar';
import { Viewport } from './Viewport';
import { ImageLibrary } from './ImageLibrary';
import { MeasureControls } from './MeasureControls';
import { FogControls } from './FogControls';
import { NavControls } from './NavControls';
import { Modal } from './Modal';
import { ConfirmationModal } from './ConfirmationModal';
import { PinIcon, CheckIcon, CloseIcon, ReloadIcon, FullScreenIcon, ExitFullScreenIcon } from './Icons';
import { useWindowSync } from '../hooks/useWindowSync';
import { useImageLibrary } from '../hooks/useImageLibrary';
import { useFullScreen } from '../hooks/useFullScreen';
import { ViewportState, ImageEntry, Measurement, FogTool, FogPath } from '../types';

type MeasurementStage = null | 'setWidth' | 'setLength';
type ActiveToolbar = 'library' | 'measure' | 'fog' | null;


const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
};

const MasterView: React.FC = () => {
  const initialViewportState: ViewportState = {
    imageId: null,
    imageUrl: null,
    imageType: 'image',
    thumbnailUrl: undefined,
    imageWidth: 0,
    imageHeight: 0,
    scale: 1,
    translateX: 0,
    translateY: 0,
    masterViewportWidth: window.innerWidth,
    masterViewportHeight: window.innerHeight,
    gridVisible: true,
    gridStyle: 'dark',
    pixelsPerInch: 72,
    gridScaleFactor: 5,
    gridOrigin: { x: 0, y: 0 },
    measurements: [],
    fogPaths: [],
    backgroundColor: '#44403c', // stone-700
  };
  
  const [isPaused, setIsPaused] = useState(false);
  const [viewportState, setSyncedViewportState] = useWindowSync(initialViewportState, { isMaster: true, isPaused });
  const { library, blankMap, saveLibrary, addImage, updateImage, removeImage, addFolder, removeFolder, renameFolder } = useImageLibrary();
  const { isFullScreen, toggleFullScreen } = useFullScreen();
  
  const [activeToolbar, setActiveToolbar] = useState<ActiveToolbar>('library');
  const [isGridScaleModalOpen, setIsGridScaleModalOpen] = useState(false);
  const [isAddFolderModalOpen, setIsAddFolderModalOpen] = useState(false);
  const [isCalibrationModalOpen, setIsCalibrationModalOpen] = useState(false);
  const [tempDpi, setTempDpi] = useState(96);
  const [newFolderName, setNewFolderName] = useState('');
  const [tempGridScale, setTempGridScale] = useState(viewportState.gridScaleFactor ?? 5);

  const [isScaling, setIsScaling] = useState(false);
  const [scalePoints, setScalePoints] = useState<{x: number; y: number}[]>([]);
  const [activeMeasureTool, setActiveMeasureTool] = useState<Measurement['type'] | null>(null);
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [measurementStage, setMeasurementStage] = useState<MeasurementStage>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, measurementId: string } | null>(null);
  const [selectedEffectId, setSelectedEffectId] = useState<string | null>(null);
  const [isDraggingEffect, setIsDraggingEffect] = useState(false);
  const [rotatingEffectId, setRotatingEffectId] = useState<string | null>(null);
  const rotationStartData = useRef<{ initialObjectRotation: number; initialMouseAngle: number; origin: {x: number, y: number} } | null>(null);
  const lastDragPoint = useRef({ x: 0, y: 0 });
  const lastInteractionCoords = useRef<{ clientX: number; clientY: number } | null>(null);

  const [activeFogTool, setActiveFogTool] = useState<FogTool | null>(null);
  const [isFogVisibleForMaster, setIsFogVisibleForMaster] = useState(true);
  const [currentFogPath, setCurrentFogPath] = useState<{x: number; y: number}[]>([]);
  const [fogMousePosition, setFogMousePosition] = useState<{x: number; y: number} | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const [confirmation, setConfirmation] = useState<{
    isOpen: boolean;
    title: string;
    message: React.ReactNode;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const setViewportState = useCallback((state: ViewportState | ((prevState: ViewportState) => ViewportState)) => {
    const resolveState = (s: ViewportState | ((prevState: ViewportState) => ViewportState)) => {
      if (typeof s === 'function') {
        return (prevState: ViewportState) => {
          const newState = s(prevState);
          return {
            ...newState,
            masterViewportWidth: viewportRef.current?.clientWidth ?? window.innerWidth,
            masterViewportHeight: viewportRef.current?.clientHeight ?? window.innerHeight,
          };
        };
      }
      return {
        ...s,
        masterViewportWidth: viewportRef.current?.clientWidth ?? window.innerWidth,
        masterViewportHeight: viewportRef.current?.clientHeight ?? window.innerHeight,
      };
    };
    setSyncedViewportState(resolveState(state));
  }, [setSyncedViewportState]);
  
  const debouncedViewportState = useDebounce(viewportState, 500);
  const currentImage = useMemo(() => {
    const currentId = viewportState.imageId;
    if (!currentId || currentId === blankMap?.id) {
        return blankMap || null;
    }
    const allImages = [...library.unfiled, ...library.folders.flatMap(f => f.images)];
    return allImages.find(img => img.id === currentId);
  }, [viewportState.imageId, library, blankMap]);
  
  useEffect(() => {
      if (debouncedViewportState && currentImage && updateImage) {
          const updatedImage: ImageEntry = {
              ...currentImage,
              savedState: debouncedViewportState,
          };
          updateImage(updatedImage);
      }
  }, [debouncedViewportState, currentImage, updateImage]);


  useEffect(() => {
    const viewportEl = viewportRef.current;
    if (!viewportEl) return;
    const resizeObserver = new ResizeObserver(() => {
        setSyncedViewportState(currentState => ({
            ...currentState,
            masterViewportWidth: viewportEl.clientWidth,
            masterViewportHeight: viewportEl.clientHeight,
        }));
    });
    resizeObserver.observe(viewportEl);
    return () => { if (viewportEl) { resizeObserver.unobserve(viewportEl); } };
  }, [setSyncedViewportState]);

  const handleImageSelect = useCallback((image: ImageEntry) => {
    const { clientWidth = 0, clientHeight = 0 } = viewportRef.current ?? {};
    if (image.id === blankMap?.id) {
      const stateToLoad = image.savedState || { ...initialViewportState, imageUrl: null, imageId: blankMap.id, imageType: 'image', thumbnailUrl: undefined };
      setViewportState({ ...stateToLoad, imageUrl: null, imageId: blankMap.id, imageType: 'image', thumbnailUrl: undefined });
      return;
    }

    let stateToLoad: ViewportState;
    if (image.savedState) {
        stateToLoad = image.savedState;
    } else {
        const scaleX = clientWidth / image.width;
        const scaleY = clientHeight / image.height;
        const newScale = Math.min(scaleX, scaleY, 1);
        const newTranslateX = (clientWidth - image.width * newScale) / 2;
        const newTranslateY = (clientHeight - image.height * newScale) / 2;
        const pixelsPerInch = image.dpi || 72;
        stateToLoad = { 
          ...initialViewportState,
          imageUrl: image.dataUrl,
          imageHeight: image.height,
          imageWidth: image.width,
          scale: newScale,
          translateX: newTranslateX,
          translateY: newTranslateY,
          pixelsPerInch,
          imageType: image.type,
          thumbnailUrl: image.thumbnailUrl,
        };
    }
    setViewportState({ 
        ...stateToLoad, 
        imageUrl: image.dataUrl, 
        imageHeight: image.height, 
        imageWidth: image.width, 
        imageId: image.id,
        imageType: image.type,
        thumbnailUrl: image.thumbnailUrl,
    });
    // Keep library open for map switching
  }, [setViewportState, initialViewportState, blankMap]);

  const handleOpenPlayerWindow = () => window.open('/#/player', 'DND_VTT_Player', 'width=800,height=600');
  
  const handleFitToScreen = useCallback(() => {
    const { clientWidth: vw, clientHeight: vh } = viewportRef.current ?? { clientWidth: 0, clientHeight: 0 };
    const { imageWidth: iw, imageHeight: ih } = viewportState;

    if (!vw || !vh) return;

    if (!iw || !ih) { // No image, fit to a default size
        setViewportState(s => ({ ...s, scale: 1, translateX: vw / 4, translateY: vh / 4 }));
        return;
    }
    
    const scaleX = vw / iw; const scaleY = vh / ih;
    const newScale = Math.min(scaleX, scaleY);
    const newTranslateX = (vw - iw * newScale) / 2;
    const newTranslateY = (vh - ih * newScale) / 2;
    setViewportState(s => ({ ...s, scale: newScale, translateX: newTranslateX, translateY: newTranslateY }));
  }, [viewportState.imageWidth, viewportState.imageHeight, setViewportState]);

  const handleActualSize = useCallback(() => {
    if (!viewportRef.current) return;
    const { clientWidth: vw, clientHeight: vh } = viewportRef.current;
    const { pixelsPerInch = 72 } = viewportState;
    
    const calibratedDpi = localStorage.getItem('vtt-calibrated-dpi');
    const screenDpi = calibratedDpi ? parseFloat(calibratedDpi) : 96; // Fallback to 96 DPI
    
    const newScale = screenDpi / pixelsPerInch;
    const centerX = vw / 2;
    const centerY = vh / 2;

    setViewportState(s => {
      const clampedNewScale = Math.max(0.1, Math.min(10, newScale));
      const newTranslateX = centerX - (centerX - s.translateX) * (clampedNewScale / s.scale);
      const newTranslateY = centerY - (centerY - s.translateY) * (clampedNewScale / s.scale);
      return { ...s, scale: clampedNewScale, translateX: newTranslateX, translateY: newTranslateY };
    });
  }, [setViewportState, viewportState.pixelsPerInch]);
  
  const handleZoom = (factor: number) => {
      if (!viewportRef.current) return;
      const { clientWidth: vw, clientHeight: vh } = viewportRef.current;
      const centerX = vw / 2; const centerY = vh / 2;
      setViewportState(s => {
        const newScale = Math.max(0.1, Math.min(10, s.scale * factor));
        const newTranslateX = centerX - (centerX - s.translateX) * (newScale / s.scale);
        const newTranslateY = centerY - (centerY - s.translateY) * (newScale / s.scale);
        return { ...s, scale: newScale, translateX: newTranslateX, translateY: newTranslateY };
      });
  }
  
  const handleToggleToolbar = (toolbar: ActiveToolbar) => {
    setActiveToolbar(prev => (prev === toolbar ? null : toolbar));
  };
  
  const finalizeCurrentMeasurement = useCallback((e?: { clientX: number; clientY: number }) => {
    if (!isMeasuring) return;

    const lastMeasurement = viewportState.measurements?.[viewportState.measurements.length - 1];

    if (lastMeasurement && !lastMeasurement.isPlaced) {
      const isInvalid = (lastMeasurement.type === 'path' && lastMeasurement.points.length < 2) ||
                        (lastMeasurement.type === 'line-rect' && lastMeasurement.points.length < 3) ||
                        (['circle', 'square', 'cone'].includes(lastMeasurement.type) && lastMeasurement.points.length < 2);

      if (isInvalid) {
        setViewportState(s => ({ ...s, measurements: s.measurements?.slice(0, -1) }));
      } else {
        setViewportState(s => {
            const measurements = [...(s.measurements || [])];
            const currentMeasure = measurements[measurements.length - 1];
            if (currentMeasure.type === 'path' && currentMeasure.points.length > 2) {
                currentMeasure.points.pop();
            }
            currentMeasure.isPlaced = true;
            return { ...s, measurements };
        });
        
        const event = e || lastInteractionCoords.current;
        if (event) {
            setContextMenu({ x: event.clientX, y: event.clientY, measurementId: lastMeasurement.id });
        }
      }
    }

    setIsMeasuring(false);
    setMeasurementStage(null);
    setActiveMeasureTool(null);
  }, [isMeasuring, viewportState.measurements, setViewportState]);

  useEffect(() => {
    if (activeToolbar !== 'measure' && isMeasuring) {
      setViewportState(s => ({ ...s, measurements: s.measurements?.filter(m => m.isPlaced) }));
      setIsMeasuring(false);
      setMeasurementStage(null);
      setActiveMeasureTool(null);
    }
    if (activeToolbar !== 'fog') {
      setActiveFogTool(null);
      setCurrentFogPath([]);
      setFogMousePosition(null);
    }
    if (activeToolbar && activeToolbar !== 'library' && isScaling){
      setIsScaling(false);
      setScalePoints([]);
    }
  }, [activeToolbar, isMeasuring, isScaling, setViewportState]);
  
  const handleToggleMeasureControls = () => handleToggleToolbar('measure');
  const handleToggleFogControls = () => handleToggleToolbar('fog');

  const handleSelectMeasureTool = (tool: Measurement['type'] | null) => { 
    if (isMeasuring) {
        finalizeCurrentMeasurement();
    }
    setActiveMeasureTool(t => t === tool ? null : tool); 
    setIsMeasuring(false); 
    setContextMenu(null);
    setSelectedEffectId(null);
  };
  
  const handleSelectFogTool = (tool: FogTool | null) => { setCurrentFogPath([]); setActiveFogTool(t => t === tool ? null : tool); };
  
  const confirmClearFog = () => {
    setConfirmation({
        isOpen: true,
        title: "Clear All Fog",
        message: "Are you sure you want to remove all fog from the map?",
        onConfirm: () => setViewportState(s => ({...s, fogPaths: []}))
    });
  };

  const confirmHideAll = () => {
    setConfirmation({
        isOpen: true,
        title: "Obscure Map",
        message: "Are you sure you want to cover the entire map in fog?",
        onConfirm: () => {
            if (viewportState.imageUrl) {
                setViewportState(s => ({ 
                    ...s, 
                    fogPaths: [{
                        type: 'add',
                        path: [
                            {x:0, y:0}, 
                            {x:s.imageWidth, y:0}, 
                            {x:s.imageWidth, y:s.imageHeight}, 
                            {x:0, y:s.imageHeight}
                        ]
                    }]
                }));
            } else {
                const largeDim = 50000;
                setViewportState(s => ({
                    ...s,
                    fogPaths: [{
                        type: 'add',
                        path: [
                            { x: -largeDim, y: -largeDim },
                            { x: largeDim, y: -largeDim },
                            { x: largeDim, y: largeDim },
                            { x: -largeDim, y: largeDim },
                        ]
                    }]
                }));
            }
        }
    });
  };
  
  const handleStartScale = () => { setIsScaling(true); setActiveToolbar(null); };
  const handleSetScalePoint = (point: {x: number, y: number}) => setScalePoints(prev => [...prev, point]);
  
  const handleStartCalibration = useCallback(() => {
    const { pixelsPerInch = 72, scale } = viewportState;
    const effectiveDpi = (pixelsPerInch || 72) * scale;
    setTempDpi(Math.round(effectiveDpi));
    setIsCalibrationModalOpen(true);
  }, [viewportState.scale, viewportState.pixelsPerInch]);
  
  const handleCalibrationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('vtt-calibrated-dpi', tempDpi.toString());
    setIsCalibrationModalOpen(false);
  };


  useEffect(() => {
      if (scalePoints.length === 2) {
          const [p1, p2] = scalePoints;
          const distance = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
          if (distance > 0) {
              setViewportState(s => ({ ...s, pixelsPerInch: distance, gridOrigin: p1 }));
          }
          setIsScaling(false);
          setScalePoints([]);
      }
  }, [scalePoints, setViewportState]);

  const closeFogPath = useCallback(() => {
    if (activeFogTool && currentFogPath.length >= 3) {
      setViewportState(s => {
        const newFogPath: FogPath = { type: activeFogTool, path: [...currentFogPath] };
        return {...s, fogPaths: [...(s.fogPaths || []), newFogPath]};
      });
      setCurrentFogPath([]);
      setFogMousePosition(null);
    }
  }, [activeFogTool, currentFogPath, setViewportState]);

  const handleDismissMeasurement = useCallback((measurementId: string) => {
      setViewportState(s => ({...s, measurements: s.measurements?.filter(m => m.id !== measurementId)}));
      setContextMenu(null);
  }, [setViewportState]);
  
  const handleMakePersistent = useCallback((measurementId: string) => {
    setViewportState(s => ({
        ...s,
        measurements: s.measurements?.map(m => m.id === measurementId ? { ...m, isPersistent: true, isPlaced: true } : m)
    }));
    setContextMenu(null);
  }, [setViewportState]);

  useEffect(() => {
    if (!contextMenu) return;

    const handleClickOutside = (event: MouseEvent) => {
        if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
            handleDismissMeasurement(contextMenu.measurementId);
        }
    };
    
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
        clearTimeout(timer);
        document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [contextMenu, handleDismissMeasurement]);

  const handleDeleteEffect = (id: string) => {
      setViewportState(s => ({...s, measurements: s.measurements?.filter(m => m.id !== id)}));
      if (selectedEffectId === id) setSelectedEffectId(null);
  }

  const confirmClearAllEffects = useCallback(() => {
    setConfirmation({
        isOpen: true,
        title: "Clear All Effects",
        message: "Are you sure you want to remove all persistent effects?",
        onConfirm: () => {
            setViewportState(s => ({ ...s, measurements: s.measurements?.filter(m => !m.isPlaced) ?? [] }));
        }
    });
  }, [setViewportState]);

  const confirmReloadImageState = useCallback(() => {
    if (!currentImage) return;

    const onConfirm = () => {
        const { clientWidth = 0, clientHeight = 0 } = viewportRef.current ?? {};
        
        if (currentImage.id === blankMap?.id) {
            setViewportState(s => ({
                ...initialViewportState,
                imageUrl: null,
                imageId: blankMap.id,
                imageType: 'image',
                thumbnailUrl: undefined,
                gridVisible: s.gridVisible,
                gridStyle: s.gridStyle,
                pixelsPerInch: s.pixelsPerInch,
                gridScaleFactor: s.gridScaleFactor,
            }));
            return;
        }

        const image = currentImage;
        const scaleX = clientWidth / image.width;
        const scaleY = clientHeight / image.height;
        const newScale = Math.min(scaleX, scaleY, 1);
        const newTranslateX = (clientWidth - image.width * newScale) / 2;
        const newTranslateY = (clientHeight - image.height * newScale) / 2;
        const pixelsPerInch = image.dpi || 72;
        
        setViewportState(s => ({
            ...s,
            imageUrl: image.dataUrl,
            imageId: image.id,
            imageWidth: image.width,
            imageHeight: image.height,
            scale: newScale,
            translateX: newTranslateX,
            translateY: newTranslateY,
            pixelsPerInch,
            measurements: [],
            imageType: image.type,
            thumbnailUrl: image.thumbnailUrl,
            fogPaths: [],
            gridOrigin: { x: 0, y: 0 },
        }));
    };

    setConfirmation({
        isOpen: true,
        title: "Reset Map State",
        message: "Are you sure you want to clear all effects and fog for this map?",
        onConfirm,
    });
  }, [setViewportState, currentImage, initialViewportState, blankMap]);
  
  const confirmRemoveImage = (imageId: string, imageName: string) => {
    setConfirmation({
      isOpen: true,
      title: "Delete Map",
      message: <>Are you sure you want to delete <span className="font-bold">{imageName}</span>? This cannot be undone.</>,
      onConfirm: () => removeImage(imageId),
    });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        if (activeFogTool) closeFogPath();
        else if (isMeasuring) finalizeCurrentMeasurement();
      }
      if (e.key === 'Escape') {
          if (isMeasuring) {
              setViewportState(s => ({ ...s, measurements: s.measurements?.slice(0, -1) }));
              setIsMeasuring(false);
              setMeasurementStage(null);
              setActiveMeasureTool(null);
          }
          if (isScaling) {
              setIsScaling(false);
              setScalePoints([]);
          }
          setActiveFogTool(null);
          setCurrentFogPath([]);
          setContextMenu(null);
          setSelectedEffectId(null);
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedEffectId) {
          handleDeleteEffect(selectedEffectId);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [closeFogPath, finalizeCurrentMeasurement, activeFogTool, isMeasuring, selectedEffectId, setViewportState, isScaling]);

  const handleViewportInteraction = useCallback((type: 'down' | 'move' | 'up', point: {x: number; y: number;}, e: { clientX: number, clientY: number } | undefined, measurementId: string | undefined, source: 'mouse' | 'touch', handleType?: 'rotate') => {
    if (contextMenu && type === 'down') {
        return;
    }
    
    if (e) lastInteractionCoords.current = e;

    if (type === 'up') {
        if (isDraggingEffect) setIsDraggingEffect(false);
        if (rotatingEffectId) {
            setRotatingEffectId(null);
            rotationStartData.current = null;
        }

        if (source === 'touch' && isMeasuring) {
            const isFinalizableTool = activeMeasureTool && (['circle', 'square', 'cone'].includes(activeMeasureTool) || (activeMeasureTool === 'line-rect' && measurementStage === 'setLength'));
            if (isFinalizableTool) {
                finalizeCurrentMeasurement(e);
            }
        }
        return;
    }
    
    if (handleType === 'rotate' && measurementId) {
        const measurement = viewportState.measurements?.find(m => m.id === measurementId);
        if (!measurement) return;

        if (type === 'down') {
            setRotatingEffectId(measurementId);
            const origin = measurement.points[0];
            const initialMouseAngle = Math.atan2(point.y - origin.y, point.x - origin.x) * 180 / Math.PI;
            rotationStartData.current = {
                initialObjectRotation: measurement.rotation || 0,
                initialMouseAngle,
                origin,
            };
            return;
        }
    }
    
    if (type === 'move' && rotatingEffectId && rotationStartData.current) {
        const { origin, initialMouseAngle, initialObjectRotation } = rotationStartData.current;
        const currentMouseAngle = Math.atan2(point.y - origin.y, point.x - origin.x) * 180 / Math.PI;
        const deltaAngle = currentMouseAngle - initialMouseAngle;
        const newRotation = initialObjectRotation + deltaAngle;

        setViewportState(s => ({
            ...s,
            measurements: s.measurements?.map(m =>
                m.id === rotatingEffectId ? { ...m, rotation: newRotation } : m
            )
        }));
        return;
    }

    if (isMeasuring && type === 'down' && activeMeasureTool) {
      const isTwoClickTool = ['circle', 'square', 'cone'].includes(activeMeasureTool);

      if (isTwoClickTool && source === 'mouse') {
        finalizeCurrentMeasurement(e);
        return;
      }
      if (activeMeasureTool === 'line-rect' && measurementStage === 'setLength' && source === 'mouse') {
        finalizeCurrentMeasurement(e);
        return;
      }

      if (activeMeasureTool === 'path') {
        setViewportState(s => {
          const measurements = [...(s.measurements || [])];
          const currentMeasure = measurements[measurements.length - 1];
          currentMeasure.points[currentMeasure.points.length - 1] = point;
          currentMeasure.points.push(point);
          return { ...s, measurements };
        });
        return;
      } else if (activeMeasureTool === 'line-rect' && measurementStage === 'setWidth') {
        setViewportState(s => {
            const measurements = [...(s.measurements || [])];
            const currentMeasure = measurements[measurements.length - 1];
            currentMeasure.points[1] = point;
            currentMeasure.points.push(point);
            return { ...s, measurements };
        });
        setMeasurementStage('setLength');
        return;
      }
    }

    if (type === 'down') {
      if (!measurementId) {
        setContextMenu(null);
      }
    }
    
    if (measurementId && type === 'down' && !handleType) {
        const isAnyToolActive = !!activeMeasureTool || !!activeFogTool || isScaling;
        if (!isAnyToolActive) {
            setSelectedEffectId(measurementId);
            setIsDraggingEffect(true);
            lastDragPoint.current = point;
            setActiveMeasureTool(null);
            if (isMeasuring) {
                setViewportState(s => ({ ...s, measurements: s.measurements?.slice(0, -1) }));
                setIsMeasuring(false);
                setMeasurementStage(null);
            }
            return;
        }
    }
    
    if (isDraggingEffect && selectedEffectId && type === 'move') {
        const dx = point.x - lastDragPoint.current.x;
        const dy = point.y - lastDragPoint.current.y;
        setViewportState(s => ({
            ...s,
            measurements: s.measurements?.map(m => {
                if (m.id === selectedEffectId) {
                    return { ...m, points: m.points.map(p => ({ x: p.x + dx, y: p.y + dy })) };
                }
                return m;
            })
        }));
        lastDragPoint.current = point;
        return;
    }

    if (activeMeasureTool && type === 'down' && !isMeasuring) {
      setIsMeasuring(true);
      const color = 'rgba(59, 130, 246, 0.5)';
      const newMeasurement: Measurement = { id: self.crypto.randomUUID(), type: activeMeasureTool, points: [point, point], isPlaced: false, color, isPersistent: false };
      setViewportState(s => ({ ...s, measurements: [...(s.measurements || []), newMeasurement] }));
      if (activeMeasureTool === 'line-rect') setMeasurementStage('setWidth');
      return;
    }
    
    if (type === 'move' && isMeasuring) {
      setViewportState(s => {
        const measurements = [...(s.measurements || [])];
        if (measurements.length === 0) return s;
        const currentMeasure = measurements[measurements.length - 1];
        if (currentMeasure && !currentMeasure.isPlaced) {
            const pointIndex = (activeMeasureTool === 'line-rect' && measurementStage === 'setLength') ? 2 : currentMeasure.points.length - 1;
            currentMeasure.points[pointIndex] = point;
        }
        return { ...s, measurements };
      });
      return;
    }
    
    if (type === 'down' && !measurementId) {
        setSelectedEffectId(null);
    }

    if (activeFogTool) {
        if (type === 'down' && e) {
            if (currentFogPath.length > 0) {
                const startPoint = currentFogPath[0];
                const screenStartPoint = { x: startPoint.x * viewportState.scale + viewportState.translateX, y: startPoint.y * viewportState.scale + viewportState.translateY };
                const clickPoint = { x: e.clientX, y: e.clientY };
                const distance = Math.hypot(clickPoint.x - screenStartPoint.x, clickPoint.y - screenStartPoint.y);
                if (distance < 15 && currentFogPath.length >= 3) {
                    closeFogPath();
                    return;
                }
            }
            setCurrentFogPath(prev => [...prev, point]);
        } else if (type === 'move') {
            setFogMousePosition(point);
        }
    } else if (type === 'move') {
        setFogMousePosition(null);
    }
  }, [activeMeasureTool, isMeasuring, viewportState, setViewportState, finalizeCurrentMeasurement, activeFogTool, currentFogPath, closeFogPath, isDraggingEffect, selectedEffectId, measurementStage, contextMenu, rotatingEffectId]);

  const handleViewportDoubleClick = (point: {x:number, y:number}, e: React.MouseEvent<SVGElement>) => {
    if (isMeasuring && activeMeasureTool === 'path') {
        setViewportState(s => {
            const measurements = [...(s.measurements || [])];
            if (!measurements.length) return s;
            const currentMeasure = measurements[measurements.length - 1];
            currentMeasure.points.pop(); // remove ghost point from first click
            return { ...s, measurements };
        });
        finalizeCurrentMeasurement(e);
    } else if (activeFogTool) {
        closeFogPath();
    }
  };

  const handleViewportContextMenu = (point: {x: number, y: number}, e: React.MouseEvent<SVGElement>) => {
    if (isMeasuring) {
      if (activeMeasureTool === 'path' && (viewportState.measurements?.slice(-1)[0]?.points.length ?? 0) > 2) {
        setViewportState(s => {
            const measurements = [...(s.measurements || [])];
            if (!measurements.length) return s;
            const currentMeasure = measurements[measurements.length - 1];
            currentMeasure.points.pop();
            return { ...s, measurements };
        });
      }
      finalizeCurrentMeasurement(e);
    }
  };

  const handleGridScaleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setViewportState(s => ({...s, gridScaleFactor: tempGridScale}));
    setIsGridScaleModalOpen(false);
  }

  const handleAddFolderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addFolder(newFolderName);
    setNewFolderName('');
    setIsAddFolderModalOpen(false);
  }
  
  const handleSetBackgroundColor = (color: string) => {
    setViewportState(s => ({ ...s, backgroundColor: color }));
  };

  const isMasterToolActive = isScaling || !!activeMeasureTool || !!activeFogTool;

  return (
    <div className="w-screen h-screen relative overflow-hidden bg-stone-900">
      <Toolbar
        onToggleLibrary={() => handleToggleToolbar('library')}
        onToggleMeasureControls={handleToggleMeasureControls}
        onToggleFogControls={handleToggleFogControls}
        onOpenPlayerWindow={handleOpenPlayerWindow}
        activeToolbar={activeToolbar}
      />
      
      <div className="absolute top-0 left-[68px] h-full z-20">
        {activeToolbar === 'library' && (
          <ImageLibrary 
            library={library} 
            blankMap={blankMap}
            saveLibrary={saveLibrary} 
            onImageSelect={handleImageSelect} 
            addImage={addImage} 
            onConfirmRemoveImage={confirmRemoveImage} 
            onOpenAddFolderModal={() => setIsAddFolderModalOpen(true)}
            removeFolder={removeFolder}
            renameFolder={renameFolder} 
            onConfirmReloadImageState={confirmReloadImageState}
            gridVisible={viewportState.gridVisible ?? false} 
            onToggleGrid={() => setViewportState(s=>({...s, gridVisible: !s.gridVisible}))} 
            gridStyle={viewportState.gridStyle ?? 'dark'} 
            onSetGridStyle={(style) => setViewportState(s=>({...s, gridStyle: style}))} 
            onStartScale={handleStartScale} 
            onStartCalibration={handleStartCalibration}
            onOpenScaleModal={() => setIsGridScaleModalOpen(true)} 
            gridScaleFactor={viewportState.gridScaleFactor ?? 5}
            loadedImageId={currentImage?.id}
            onSetBackgroundColor={handleSetBackgroundColor}
          />
        )}
        {activeToolbar === 'measure' && (
          <MeasureControls 
            onSelectTool={handleSelectMeasureTool} 
            activeTool={activeMeasureTool} 
            onConfirmClearAllEffects={confirmClearAllEffects} 
          />
        )}
        {activeToolbar === 'fog' && (
          <FogControls 
            onSelectTool={handleSelectFogTool} 
            activeTool={activeFogTool} 
            onConfirmClearAll={confirmClearFog} 
            onConfirmHideAll={confirmHideAll}
            isFogVisibleForMaster={isFogVisibleForMaster}
            onToggleFogVisibility={() => setIsFogVisibleForMaster(v => !v)}
          />
        )}
      </div>

      <main 
        ref={viewportRef} 
        className="absolute top-0 h-full overflow-hidden"
        style={{ left: `68px`, right: '0px' }}
      >
        <Viewport
          state={viewportState}
          setState={setViewportState}
          isInteractive={true}
          isScaling={isScaling}
          onSetScalePoint={handleSetScalePoint}
          scalePoints={scalePoints}
          activeMeasureTool={activeMeasureTool}
          onInteraction={handleViewportInteraction}
          onDoubleClick={handleViewportDoubleClick}
          onContextMenu={handleViewportContextMenu}
          activeFogTool={activeFogTool}
          currentFogPath={currentFogPath}
          fogMousePosition={fogMousePosition}
          selectedEffectId={selectedEffectId}
          onDeleteEffect={handleDeleteEffect}
          isMasterToolActive={isMasterToolActive}
          isFogVisibleForMaster={isFogVisibleForMaster}
        />
        {(isScaling || (activeMeasureTool && !isMeasuring)) && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/70 text-white p-4 rounded-lg z-50 text-center pointer-events-none">
                <h3 className="text-lg font-bold">{isScaling ? 'Set Scale for 1 Inch' : 'Measure Distance'}</h3>
                <p>{isScaling ? (scalePoints.length === 0 ? 'Click the first point.' : 'Click the second point.') : 'Click a start point on the map.'}</p>
            </div>
        )}
        {contextMenu && (
            <div ref={contextMenuRef} style={{ position: 'fixed', top: contextMenu.y, left: contextMenu.x }} className="bg-stone-800 rounded-lg shadow-xl flex z-50">
                <button onClick={() => handleMakePersistent(contextMenu.measurementId)} title="Make Persistent" className="p-3 text-stone-300 hover:bg-stone-700 hover:text-white rounded-l-lg"><PinIcon className="w-6 h-6" /></button>
                <button onClick={() => handleDismissMeasurement(contextMenu.measurementId)} title="Dismiss" className="p-3 text-stone-300 hover:bg-stone-700 hover:text-white rounded-r-lg"><CheckIcon className="w-6 h-6" /></button>
            </div>
        )}
        <ConfirmationModal
            isOpen={confirmation.isOpen}
            onClose={() => setConfirmation({ ...confirmation, isOpen: false })}
            onConfirm={confirmation.onConfirm}
            title={confirmation.title}
            message={confirmation.message}
        />
        <Modal 
            isOpen={isGridScaleModalOpen}
            onClose={() => setIsGridScaleModalOpen(false)}
            title="Set Grid Scale"
        >
            <form onSubmit={handleGridScaleSubmit}>
                <label htmlFor="grid-scale-input" className="block mb-2 text-stone-300">Feet per square:</label>
                <input 
                    type="number"
                    id="grid-scale-input"
                    value={tempGridScale}
                    onChange={e => setTempGridScale(parseInt(e.target.value, 10) || 0)}
                    className="w-full bg-stone-700 rounded px-3 py-2 text-center outline-none focus:ring-2 focus:ring-blue-500 text-stone-100 text-lg"
                />
                <div className="mt-4 flex justify-end items-center gap-2">
                    <button 
                        type="button" 
                        onClick={() => setIsGridScaleModalOpen(false)}
                        className="p-3 bg-stone-700 hover:bg-stone-600 rounded-lg text-stone-300 hover:text-white"
                        title="Cancel"
                    >
                        <CloseIcon className="w-6 h-6" />
                    </button>
                    <button 
                        type="button" 
                        onClick={() => setTempGridScale(5)}
                        className="p-3 bg-stone-700 hover:bg-stone-600 rounded-lg text-stone-300 hover:text-white"
                        title="Reset to 5ft"
                    >
                        <ReloadIcon className="w-6 h-6" />
                    </button>
                    <button 
                        type="submit" 
                        className="p-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-white"
                        title="Set Scale"
                    >
                        <CheckIcon className="w-6 h-6" />
                    </button>
                </div>
            </form>
        </Modal>
        <Modal 
            isOpen={isAddFolderModalOpen}
            onClose={() => setIsAddFolderModalOpen(false)}
            title="Add New Folder"
        >
            <form onSubmit={handleAddFolderSubmit}>
                <label htmlFor="folder-name-input" className="block mb-2 text-stone-300">Folder Name:</label>
                <input 
                    type="text"
                    id="folder-name-input"
                    value={newFolderName}
                    onChange={e => setNewFolderName(e.target.value)}
                    className="w-full bg-stone-700 rounded px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 text-stone-100 text-lg"
                    autoFocus
                />
                <button type="submit" className="mt-4 w-full bg-blue-600 hover:bg-blue-700 rounded px-4 py-2 text-white font-bold">
                    Create Folder
                </button>
            </form>
        </Modal>
        <Modal 
            isOpen={isCalibrationModalOpen}
            onClose={() => setIsCalibrationModalOpen(false)}
            title="Calibrate Display DPI"
        >
            <form onSubmit={handleCalibrationSubmit}>
                <label htmlFor="dpi-input" className="block mb-2 text-stone-300">
                    Set your screen's calculated Dots Per Inch (DPI):
                </label>
                <input 
                    type="number"
                    id="dpi-input"
                    value={tempDpi}
                    onChange={e => setTempDpi(parseInt(e.target.value, 10) || 0)}
                    className="w-full bg-stone-700 rounded px-3 py-2 text-center outline-none focus:ring-2 focus:ring-blue-500 text-stone-100 text-lg"
                    autoFocus
                />
                <div className="mt-4 flex justify-end items-center gap-2">
                    <button 
                        type="button" 
                        onClick={() => setIsCalibrationModalOpen(false)}
                        className="p-3 bg-stone-700 hover:bg-stone-600 rounded-lg text-stone-300 hover:text-white"
                        title="Cancel"
                    >
                        <CloseIcon className="w-6 h-6" />
                    </button>
                    <button 
                        type="submit" 
                        className="p-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-white"
                        title="Save Calibration"
                    >
                        <CheckIcon className="w-6 h-6" />
                    </button>
                </div>
            </form>
        </Modal>

        <button
          onClick={toggleFullScreen}
          className="absolute top-5 right-5 p-3 rounded-full bg-stone-700 hover:bg-stone-600 text-white transition-all duration-150 shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-400 z-20"
          title={isFullScreen ? 'Exit Full Screen' : 'Enter Full Screen'}
        >
          {isFullScreen ? <ExitFullScreenIcon className="w-6 h-6" /> : <FullScreenIcon className="w-6 h-6" />}
        </button>
        <NavControls 
            onZoomIn={() => handleZoom(1.2)} 
            onZoomOut={() => handleZoom(0.8)} 
            onFit={handleFitToScreen} 
            onActualSize={handleActualSize}
            isPaused={isPaused}
            onTogglePause={() => setIsPaused(p => !p)}
        />
      </main>
    </div>
  );
};

export default MasterView;
