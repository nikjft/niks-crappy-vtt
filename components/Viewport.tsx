import React, { useRef, useState, useEffect, WheelEvent, TouchEvent, useCallback } from 'react';
import { ViewportState, Measurement, FogTool, FogPath } from '../types';
import { TrashIcon } from './Icons';

interface ViewportProps {
  state: ViewportState;
  setState?: (state: ViewportState | ((prevState: ViewportState) => ViewportState)) => void;
  isInteractive: boolean;
  masterViewportSize?: { width: number; height: number };
  isScaling?: boolean;
  onSetScalePoint?: (point: {x: number; y: number}) => void;
  scalePoints?: {x: number; y: number}[];
  activeMeasureTool?: Measurement['type'] | null;
  onInteraction?: (type: 'down' | 'move' | 'up', point: {x: number, y: number}, e: { clientX: number, clientY: number } | undefined, measurementId: string | undefined, source: 'mouse' | 'touch', handleType?: 'rotate') => void;
  onDoubleClick?: (point: {x: number, y: number}, e: React.MouseEvent<SVGElement>) => void;
  onContextMenu?: (point: {x: number, y: number}, e: React.MouseEvent<SVGElement>) => void;
  activeFogTool?: FogTool | null;
  currentFogPath?: {x: number; y: number}[];
  fogMousePosition?: {x: number; y: number} | null;
  selectedEffectId?: string | null;
  onDeleteEffect?: (id: string) => void;
  isMasterToolActive?: boolean;
  isFogVisibleForMaster?: boolean;
}

const pointsToPath = (points: {x: number; y: number}[], close: boolean = false): string => {
    if (points.length === 0) return '';
    const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    return close ? `${path} Z` : path;
};

const MeasurementShape: React.FC<{measurement: Measurement, pixelsPerInch: number, gridScaleFactor: number, scale: number, isSelected: boolean, isLightBackground: boolean}> = ({ measurement, pixelsPerInch, gridScaleFactor, scale, isSelected, isLightBackground }) => {
    const { points, type, isPersistent, isPlaced, rotation = 0 } = measurement;
    
    const fill = 'rgba(37, 99, 235, 0.5)';
    const stroke = 'rgba(29, 78, 216, 1)';
    const strokeWidth = isSelected ? 4 / scale : 2 / scale;
    
    if (points.length < 2 && !measurement.isPlaced) return null;

    const startPoint = points[0];
    const endPoint = points[points.length - 1];

    const dx = endPoint.x - startPoint.x;
    const dy = endPoint.y - startPoint.y;
    const pixelDist = Math.sqrt(dx * dx + dy * dy);

    const textFill = isLightBackground ? '#1c1917' : '#FFFFFF';
    const textStroke = isLightBackground ? '#FFFFFF' : '#000000';
    
    const textStyle: React.CSSProperties = {
        fontSize: `${16 / scale}px`,
        fill: textFill,
        textAnchor: 'middle',
        paintOrder: 'stroke',
        stroke: textStroke,
        strokeWidth: `${4 / scale}px`,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        pointerEvents: 'none',
        fontWeight: 'bold',
        dominantBaseline: 'middle',
    };
    
    const offsetAmount = (pixelsPerInch || 72) / 2 + 8 / scale;
    
    const getFeetDist = (pixelDist: number) => Math.round((pixelDist / (pixelsPerInch || 72)) * gridScaleFactor);

    switch (type) {
        case 'path': {
            let totalPixelDist = 0;
            for (let i = 0; i < points.length - 1; i++) {
                const p1 = points[i];
                const p2 = points[i + 1];
                totalPixelDist += Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
            }

            const feetDist = getFeetDist(totalPixelDist);
            const textToShow = `${feetDist} ft`;

            const lastSegmentStart = points.length > 1 ? points[points.length - 2] : startPoint;
            const lastSegmentEnd = endPoint;
            const angle = Math.atan2(lastSegmentEnd.y - lastSegmentStart.y, lastSegmentEnd.x - lastSegmentStart.x) * 180 / Math.PI;
            const textX = (lastSegmentStart.x + lastSegmentEnd.x) / 2;
            const textY = (lastSegmentStart.y + lastSegmentEnd.y) / 2;

            return <g>
                <polyline points={points.map(p => `${p.x},${p.y}`).join(' ')} stroke={stroke} strokeWidth={isPersistent ? strokeWidth : 3/scale} fill="none" />
                {feetDist > 0 && !isPersistent && <text x={textX} y={textY} style={textStyle} transform={`rotate(${angle} ${textX} ${textY}) translate(0, ${-offsetAmount})`}>{textToShow}</text>}
            </g>;
        }
        case 'circle': {
            const feetDist = getFeetDist(pixelDist);
            const textToShow = `${feetDist} ft`;
            return <g transform={`rotate(${rotation} ${startPoint.x} ${startPoint.y})`}>
                <circle cx={startPoint.x} cy={startPoint.y} r={pixelDist} stroke={stroke} strokeWidth={isPersistent ? strokeWidth : 2/scale} fill={fill} />
                {pixelDist > 0 && !isPersistent && <text x={startPoint.x} y={startPoint.y - offsetAmount} style={textStyle}>{textToShow}</text>}
                {isPersistent && isPlaced && (
                    <circle
                        data-handle="rotate"
                        cx={endPoint.x}
                        cy={endPoint.y}
                        r={8 / scale}
                        fill="white"
                        stroke="black"
                        strokeWidth={2 / scale}
                        style={{ cursor: 'alias', pointerEvents: 'all' }}
                    />
                )}
            </g>;
        }
        case 'square': {
            const feetDist = getFeetDist(pixelDist * 2);
            const textToShow = `${feetDist} ft`;
            const halfSide = pixelDist;
            
            const pVecX = -dy / (pixelDist || 1);
            const pVecY = dx / (pixelDist || 1);

            const squarePoints = [
                { x: startPoint.x + dx + pVecX * halfSide, y: startPoint.y + dy + pVecY * halfSide },
                { x: startPoint.x + dx - pVecX * halfSide, y: startPoint.y + dy - pVecY * halfSide },
                { x: startPoint.x - dx - pVecX * halfSide, y: startPoint.y - dy - pVecY * halfSide },
                { x: startPoint.x - dx + pVecX * halfSide, y: startPoint.y - dy + pVecY * halfSide },
            ];

            return <g transform={`rotate(${rotation} ${startPoint.x} ${startPoint.y})`}>
                <polygon points={squarePoints.map(p => `${p.x},${p.y}`).join(' ')} stroke={stroke} strokeWidth={isPersistent ? strokeWidth : 2/scale} fill={fill} />
                {pixelDist > 0 && !isPersistent && <text x={startPoint.x} y={startPoint.y - offsetAmount} style={textStyle}>{textToShow}</text>}
                {isPersistent && isPlaced && (
                     <circle
                        data-handle="rotate"
                        cx={squarePoints[0].x}
                        cy={squarePoints[0].y}
                        r={8 / scale}
                        fill="white"
                        stroke="black"
                        strokeWidth={2 / scale}
                        style={{ cursor: 'alias', pointerEvents: 'all' }}
                    />
                )}
            </g>;
        }
        case 'cone': {
            const feetDist = getFeetDist(pixelDist);
            const textToShow = `${feetDist} ft`;
            const halfBase = pixelDist / 2;
            const angle = Math.atan2(dy, dx) * 180 / Math.PI;
            const textX = startPoint.x + dx / 2;
            const textY = startPoint.y + dy / 2;

            const conePoints = [{x: 0, y: 0}, {x: pixelDist, y: -halfBase}, {x: pixelDist, y: halfBase}];
            const coneHandlePoint = conePoints[2];
            return <g>
                 <g transform={`translate(${startPoint.x} ${startPoint.y}) rotate(${angle + rotation})`}>
                    <polygon points={conePoints.map(p => `${p.x},${p.y}`).join(' ')} stroke={stroke} strokeWidth={isPersistent ? strokeWidth : 2/scale} fill={fill} />
                     {isPersistent && isPlaced && (
                         <circle
                            data-handle="rotate"
                            cx={coneHandlePoint.x}
                            cy={coneHandlePoint.y}
                            r={8 / scale}
                            fill="white"
                            stroke="black"
                            strokeWidth={2 / scale}
                            style={{ cursor: 'alias', pointerEvents: 'all' }}
                        />
                    )}
                </g>
                {pixelDist > 0 && !isPersistent && <text x={textX} y={textY} style={textStyle} transform={`rotate(${angle} ${textX} ${textY}) translate(0, ${-offsetAmount})`}>{textToShow}</text>}
            </g>;
        }
        case 'line-rect': {
            if (points.length < 2) return null;
            const p1 = points[0];
            const p2 = points[1];

            const width = Math.hypot(p2.x - p1.x, p2.y - p1.y) * 2;
            const feetWidth = getFeetDist(width);
            const textToShowWidth = `${feetWidth} ft`;

            if (points.length < 3 && !isPlaced) {
                const halfWidthVec = { x: p2.x - p1.x, y: p2.y - p1.y };
                const lineAngle = Math.atan2(halfWidthVec.y, halfWidthVec.x) * 180 / Math.PI;
                const textX = (p1.x + p2.x) / 2;
                const textY = (p1.y + p2.y) / 2;
        
                return <g style={{ pointerEvents: 'none' }}>
                    <line x1={p1.x - halfWidthVec.x} y1={p1.y - halfWidthVec.y} x2={p1.x + halfWidthVec.x} y2={p1.y + halfWidthVec.y} stroke={stroke} strokeWidth={3/scale} />
                    {width > 0 && <text x={textX} y={textY} style={textStyle} transform={`rotate(${lineAngle} ${textX} ${textY}) translate(0, ${-offsetAmount})`}>{textToShowWidth}</text>}
                </g>;
            }
        
            const p3 = points[points.length - 1];
            const lengthVec = { x: p3.x - p1.x, y: p3.y - p1.y };
            const length = Math.hypot(lengthVec.x, lengthVec.y);
            
            const feetLength = getFeetDist(length);
            const textToShowLength = `${feetLength} ft`;

            const rotationAngleDeg = Math.atan2(lengthVec.y, lengthVec.x) * 180 / Math.PI;
            const totalRotation = rotationAngleDeg + (rotation || 0);
            
            const textCenter = { x: p1.x + lengthVec.x / 2, y: p1.y + lengthVec.y / 2 };

            const completeText = `${textToShowLength} x ${textToShowWidth}`;

            return <g>
                 <g transform={`translate(${p1.x} ${p1.y}) rotate(${totalRotation})`}>
                    <rect 
                        x={0}
                        y={-width / 2}
                        width={length}
                        height={width}
                        stroke={stroke} 
                        strokeWidth={isPersistent ? strokeWidth : 2/scale} 
                        fill={fill} 
                    />
                    {isPersistent && isPlaced && (
                        <circle
                            data-handle="rotate"
                            cx={length}
                            cy={-width/2}
                            r={8 / scale}
                            fill="white"
                            stroke="black"
                            strokeWidth={2 / scale}
                            style={{ cursor: 'alias', pointerEvents: 'all' }}
                        />
                    )}
                </g>
                 {!isPersistent && (
                    <text x={textCenter.x} y={textCenter.y} style={textStyle} transform={`rotate(${rotationAngleDeg} ${textCenter.x} ${textCenter.y}) translate(0, ${-offsetAmount})`}>{isPlaced ? completeText : textToShowLength}</text>
                 )}
            </g>;
        }
        default: return null;
    }
}

const InteractiveMeasurementWrapper: React.FC<React.PropsWithChildren<{ measurement: Measurement; isSelected: boolean; scale: number; onDelete?: (id: string) => void; isMasterToolActive?: boolean; }>> = ({ measurement, isSelected, scale, onDelete, children, isMasterToolActive }) => {
    const { id, isPersistent } = measurement;
    const bboxRef = useRef<SVGGElement>(null);
    const [bbox, setBbox] = useState<DOMRect | null>(null);

    useEffect(() => {
        if (bboxRef.current) {
            setBbox(bboxRef.current.getBBox());
        }
    }, [measurement.points, isSelected, scale, measurement.rotation]);

    const iconSize = 24 / scale;
    const centerX = bbox ? bbox.x + bbox.width / 2 : 0;
    const centerY = bbox ? bbox.y + bbox.height / 2 : 0;
    
    return (
        <g ref={bboxRef} data-id={id} style={{ pointerEvents: (measurement.isPlaced && !isMasterToolActive) ? 'all' : 'none', cursor: 'move' }}>
            {children}
            {isSelected && isPersistent && onDelete && bbox && (bbox.width > 0 || bbox.height > 0) && (
                <foreignObject x={centerX - iconSize / 2} y={centerY - iconSize / 2} width={iconSize} height={iconSize} style={{overflow: 'visible'}}>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onDelete(id); }}
                        className="p-1 bg-stone-700 rounded-full text-white hover:bg-red-600 transition-all flex items-center justify-center"
                        style={{width: `${iconSize}px`, height: `${iconSize}px`}}
                        aria-label="Delete effect"
                    >
                        <TrashIcon style={{width: `${16/scale}px`, height: `${16/scale}px`}} />
                    </button>
                </foreignObject>
            )}
        </g>
    );
};


export const Viewport: React.FC<ViewportProps> = ({ state, setState, isInteractive, masterViewportSize, isScaling, onSetScalePoint, scalePoints, activeMeasureTool, onInteraction, onDoubleClick, onContextMenu, activeFogTool, currentFogPath, fogMousePosition, selectedEffectId, onDeleteEffect, isMasterToolActive, isFogVisibleForMaster = true }) => {
  const { imageUrl, imageType, thumbnailUrl, imageWidth, imageHeight, scale, translateX, translateY, gridVisible, gridStyle, pixelsPerInch, gridScaleFactor, gridOrigin, measurements, fogPaths, backgroundColor } = state;
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const isPanning = useRef(false);
  const lastPanPoint = useRef({ x: 0, y: 0 });
  const isDrawingWithTouch = useRef(false);
  const lastTouchDistance = useRef(0);
  const [playerViewportSize, setPlayerViewportSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el || isInteractive) return;

    const observer = new ResizeObserver(() => {
      setPlayerViewportSize({ width: el.clientWidth, height: el.clientHeight });
    });
    observer.observe(el);

    setPlayerViewportSize({ width: el.clientWidth, height: el.clientHeight });

    return () => observer.disconnect();
  }, [isInteractive]);


  const handleZoom = (delta: number, centerX: number, centerY: number) => {
    if (!setState || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = centerX - rect.left;
    const mouseY = centerY - rect.top;
    setState(s => {
      const newScale = Math.max(0.1, Math.min(10, s.scale * (1 - delta)));
      const newTranslateX = mouseX - (mouseX - s.translateX) * (newScale / s.scale);
      const newTranslateY = mouseY - (mouseY - s.translateY) * (newScale / s.scale);
      return { ...s, scale: newScale, translateX: newTranslateX, translateY: newTranslateY };
    });
  };

  const handleWheel = (e: WheelEvent<HTMLDivElement>) => {
    if (!isInteractive || !setState) return;
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) handleZoom(e.deltaY * 0.005, e.clientX, e.clientY);
    else if (e.altKey) handleZoom(-e.deltaY * 0.005, e.clientX, e.clientY);
    else setState(s => ({ ...s, translateX: s.translateX - e.deltaX, translateY: s.translateY - e.deltaY }));
  };
  
  let finalTranslate = { x: translateX, y: translateY };
  if (masterViewportSize && !isInteractive && playerViewportSize.width > 0) {
      const { width: vwM, height: vhM } = masterViewportSize;
      const { width: vwP, height: vhP } = playerViewportSize;
      finalTranslate = {
          x: translateX + (vwP - vwM) / 2,
          y: translateY + (vhP - vhM) / 2,
      };
  }

  const getPointInImageCoords = useCallback((clientX: number, clientY: number) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const svg = svgRef.current;
    const point = svg.createSVGPoint();
    point.x = clientX;
    point.y = clientY;
    let ctm = svg.getScreenCTM();
    if (ctm) {
      ctm = ctm.inverse();
    }
    if (!ctm) return { x: 0, y: 0 };
    const svgPoint = point.matrixTransform(ctm);

    // De-transform point based on the <g> element's transform to get image-space coordinates
    return {
      x: (svgPoint.x - finalTranslate.x) / scale,
      y: (svgPoint.y - finalTranslate.y) / scale,
    };
  }, [finalTranslate.x, finalTranslate.y, scale]);

  const handleMouseDown = (e: React.MouseEvent<SVGElement>) => {
    if (!isInteractive) return;
    const point = getPointInImageCoords(e.clientX, e.clientY);
    const eventCoords = { clientX: e.clientX, clientY: e.clientY };
    
    const target = e.target as SVGElement;
    const gElement = target.closest('g[data-id]');
    const measurementId = gElement?.getAttribute('data-id') || undefined;

    const handleType = target.dataset.handle as 'rotate' | undefined;
    if (measurementId && handleType === 'rotate') {
        onInteraction?.('down', point, eventCoords, measurementId, 'mouse', 'rotate');
        return;
    }

    if (measurementId) {
        onInteraction?.('down', point, eventCoords, measurementId, 'mouse');
        return;
    }

    if (isScaling) { onSetScalePoint?.(point); return; }
    if (activeMeasureTool || (measurements && measurements.some(m=>!m.isPlaced)) || activeFogTool) {
        onInteraction?.('down', point, eventCoords, undefined, 'mouse'); return;
    }
    
    if (e.button !== 0) return;
    
    const isBackground = (target.dataset.background === 'true' || target === svgRef.current);

    if (isBackground && !gElement) {
        onInteraction?.('down', point, eventCoords, undefined, 'mouse');
        isPanning.current = true;
        lastPanPoint.current = { x: e.clientX, y: e.clientY };
        if(svgRef.current) svgRef.current.style.cursor = 'grabbing';
    }
  };
  
  const handleDoubleClick = (e: React.MouseEvent<SVGElement>) => {
    if (!isInteractive || !onDoubleClick) return;
    const point = getPointInImageCoords(e.clientX, e.clientY);
    onDoubleClick(point, e);
  };
  
  const handleContextMenu = (e: React.MouseEvent<SVGElement>) => {
    e.preventDefault();
    if (!isInteractive || !onContextMenu) return;
    const point = getPointInImageCoords(e.clientX, e.clientY);
    onContextMenu(point, e);
  }

  const handleMouseMove = (e: React.MouseEvent<SVGElement>) => {
    if (!isInteractive) return;
    const point = getPointInImageCoords(e.clientX, e.clientY);
    const eventCoords = { clientX: e.clientX, clientY: e.clientY };
    if (isPanning.current && setState) {
        const dx = e.clientX - lastPanPoint.current.x;
        const dy = e.clientY - lastPanPoint.current.y;
        setState(s => ({ ...s, translateX: s.translateX + dx, translateY: s.translateY + dy }));
        lastPanPoint.current = { x: e.clientX, y: e.clientY };
    } else {
        onInteraction?.('move', point, eventCoords, undefined, 'mouse');
    }
  };

  const handleMouseUpOrLeave = (e: React.MouseEvent<SVGElement>) => {
    if (!isInteractive) return;
    isPanning.current = false;
    onInteraction?.('up', getPointInImageCoords(e.clientX, e.clientY), { clientX: e.clientX, clientY: e.clientY }, undefined, 'mouse');
    if (svgRef.current) {
       svgRef.current.style.cursor = isScaling || activeMeasureTool || activeFogTool ? 'crosshair' : 'grab';
    }
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isInteractive) return;
    const isToolActive = isScaling || activeMeasureTool || (measurements && measurements.some(m=>!m.isPlaced)) || activeFogTool;

    if (e.touches.length === 1 && isToolActive) {
      isDrawingWithTouch.current = true;
      isPanning.current = false;
      const touch = e.touches[0];
      const point = getPointInImageCoords(touch.clientX, touch.clientY);
      onInteraction?.('down', point, { clientX: touch.clientX, clientY: touch.clientY }, undefined, 'touch');
      return;
    }

    if (e.touches.length === 1) { isPanning.current = true; lastPanPoint.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; } else if (e.touches.length === 2) { isPanning.current = false; lastTouchDistance.current = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); }
  };
  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isInteractive || !setState) return; e.preventDefault();
    if (e.touches.length === 1 && isDrawingWithTouch.current) {
      const touch = e.touches[0];
      const point = getPointInImageCoords(touch.clientX, touch.clientY);
      onInteraction?.('move', point, { clientX: touch.clientX, clientY: touch.clientY }, undefined, 'touch');
      return;
    }

    if (e.touches.length === 1 && isPanning.current) { const dx = e.touches[0].clientX - lastPanPoint.current.x; const dy = e.touches[0].clientY - lastPanPoint.current.y; setState(s => ({ ...s, translateX: s.translateX + dx, translateY: s.translateY + dy })); lastPanPoint.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; } else if (e.touches.length === 2) { const newDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); const zoomRatio = newDist / lastTouchDistance.current; const center = { x: (e.touches[0].clientX + e.touches[1].clientX) / 2, y: (e.touches[0].clientY + e.touches[1].clientY) / 2 }; if (containerRef.current) { const rect = containerRef.current.getBoundingClientRect(); const touchX = center.x - rect.left; const touchY = center.y - rect.top; setState(s => { const newScale = Math.max(0.1, Math.min(10, s.scale * zoomRatio)); const newTranslateX = touchX - (touchX - s.translateX) * (newScale / s.scale); const newTranslateY = touchY - (touchY - s.translateY) * (newScale / s.scale); return { ...s, scale: newScale, translateX: newTranslateX, translateY: newTranslateY }; }); } lastTouchDistance.current = newDist; }
  };
  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isInteractive) return;
    if (isDrawingWithTouch.current) {
      const touch = e.changedTouches[0];
      if (touch) {
        const point = getPointInImageCoords(touch.clientX, touch.clientY);
        onInteraction?.('up', point, { clientX: touch.clientX, clientY: touch.clientY }, undefined, 'touch');
      }
      isDrawingWithTouch.current = false;
    }
    isPanning.current = false;
    lastTouchDistance.current = 0;
  };
  
  const isToolActive = !!activeMeasureTool || !!activeFogTool || !!selectedEffectId || (measurements && measurements.some(m => !m.isPlaced));
  const cursorStyle = isInteractive && (isScaling || isToolActive) ? 'crosshair' : (isInteractive ? 'grab' : 'default');
  const interactiveStyles: React.CSSProperties = { touchAction: isInteractive ? 'none' : 'auto' };
  
  const containerStyle: React.CSSProperties = {
    ...interactiveStyles,
    backgroundColor: backgroundColor || '#1c1917',
  };

  const largeDim = 100000;
  const gridColor = (gridStyle === 'light' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)');
  const gridSize = pixelsPerInch || 72;

  return (
    <div ref={containerRef} className="w-full h-full overflow-hidden relative" style={containerStyle} onWheel={handleWheel} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
      <svg ref={svgRef} className="w-full h-full" style={{ cursor: cursorStyle }} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUpOrLeave} onMouseLeave={handleMouseUpOrLeave} onDoubleClick={handleDoubleClick} onContextMenu={handleContextMenu}>
        <defs>
          {gridVisible && (
            <pattern id="gridPattern" width={gridSize} height={gridSize} patternUnits="userSpaceOnUse">
              <path d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`} fill="none" stroke={gridColor} strokeWidth={1} />
            </pattern>
          )}
          <mask id="fog-mask">
              <rect x={-largeDim} y={-largeDim} width={largeDim*2} height={largeDim*2} fill="white" />
              {fogPaths?.map((fogPath, i) => (
                  <path key={`fog-reveal-${i}`} d={pointsToPath(fogPath.path, true)} fill={fogPath.type === 'remove' ? 'black' : 'transparent'} />
              ))}
          </mask>
          <mask id="fog-draw-mask">
              <rect x={-largeDim} y={-largeDim} width={largeDim*2} height={largeDim*2} fill="black" />
              {fogPaths?.map((fogPath, i) => (
                  <path key={`fog-draw-${i}`} d={pointsToPath(fogPath.path, true)} fill={fogPath.type === 'add' ? 'white' : 'black'} />
              ))}
          </mask>
        </defs>

        <g transform={`translate(${finalTranslate.x} ${finalTranslate.y}) scale(${scale})`}>
          <rect data-background="true" x={-largeDim} y={-largeDim} width={largeDim*2} height={largeDim*2} fill={backgroundColor || '#44403c'} />
          
          {imageUrl && (
            imageType === 'video' ? (
                isInteractive ? ( // Master view shows thumbnail
                    <image
                        href={thumbnailUrl}
                        x={0}
                        y={0}
                        width={imageWidth}
                        height={imageHeight}
                        style={{ imageRendering: scale > 2 ? 'pixelated' : 'auto' }}
                        pointerEvents="none"
                    />
                ) : ( // Player view shows looping video
                    <foreignObject x={0} y={0} width={imageWidth} height={imageHeight} pointerEvents="none">
                        <video
                            src={imageUrl}
                            width={imageWidth}
                            height={imageHeight}
                            autoPlay
                            loop
                            muted
                            playsInline
                            style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                        />
                    </foreignObject>
                )
            ) : ( // Default is image/gif
                <image 
                  href={imageUrl}
                  x={0}
                  y={0}
                  width={imageWidth}
                  height={imageHeight}
                  style={{ imageRendering: scale > 2 ? 'pixelated' : 'auto' }}
                  pointerEvents="none"
                />
            )
          )}

          {gridVisible && pixelsPerInch && (
             <rect
                x={-largeDim}
                y={-largeDim}
                width={largeDim * 2}
                height={largeDim * 2}
                fill="url(#gridPattern)"
                transform={`translate(${(gridOrigin?.x ?? 0)} ${(gridOrigin?.y ?? 0)})`}
                pointerEvents="none"
            />
          )}

          {measurements?.map(m => (
              <InteractiveMeasurementWrapper key={m.id} measurement={m} isSelected={m.id === selectedEffectId} scale={scale} onDelete={onDeleteEffect} isMasterToolActive={isMasterToolActive}>
                  <MeasurementShape measurement={m} pixelsPerInch={pixelsPerInch || 72} gridScaleFactor={gridScaleFactor || 5} scale={scale} isSelected={m.id === selectedEffectId} isLightBackground={backgroundColor === '#FFFFFF' || backgroundColor === '#F5E5C9'} />
              </InteractiveMeasurementWrapper>
          ))}
          
          {(!isInteractive || isFogVisibleForMaster) && (
            <rect x={-largeDim} y={-largeDim} width={largeDim*2} height={largeDim*2} fill="black" fillOpacity={isInteractive ? 0.5 : 0.9} mask="url(#fog-draw-mask)" pointerEvents="none" />
          )}

          {currentFogPath && currentFogPath.length > 0 && (
            <g style={{ pointerEvents: 'none' }}>
                <path d={pointsToPath(currentFogPath)} stroke="rgba(0, 255, 255, 0.8)" strokeWidth={3/scale} fill="none" strokeDasharray={`${6/scale} ${4/scale}`}/>
                {fogMousePosition && <line x1={currentFogPath[currentFogPath.length - 1].x} y1={currentFogPath[currentFogPath.length - 1].y} x2={fogMousePosition.x} y2={fogMousePosition.y} stroke="rgba(0, 255, 255, 0.8)" strokeWidth={3/scale} strokeDasharray={`${6/scale} ${4/scale}`} />}
                <circle cx={currentFogPath[0].x} cy={currentFogPath[0].y} r={8/scale} fill="rgba(0, 255, 255, 0.8)" />
            </g>
          )}
        </g>
      </svg>
      
      {isScaling && scalePoints && scalePoints.length === 1 && (
        <div className="absolute w-4 h-4 bg-red-600 rounded-full pointer-events-none opacity-80 ring-2 ring-white/75" style={{ left: `${finalTranslate.x + scalePoints[0].x * scale}px`, top: `${finalTranslate.y + scalePoints[0].y * scale}px`, transform: `translate(-50%, -50%)` }} />
      )}
    </div>
  );
};