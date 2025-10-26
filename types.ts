export interface ImageEntry {
  id: string;
  name: string;
  dataUrl: string;
  thumbnailUrl?: string;
  type: 'image' | 'video';
  width: number;
  height: number;
  savedState?: ViewportState;
  dpi?: number;
}

export interface Folder {
  id: string;
  name:string;
  images: ImageEntry[];
}

export interface LibraryState {
  folders: Folder[];
  unfiled: ImageEntry[];
}

export interface Measurement {
  id: string;
  type: 'path' | 'circle' | 'square' | 'cone' | 'line-rect';
  points: { x: number; y: number }[];
  isPlaced: boolean;
  color: string;
  isPersistent: boolean;
  rotation?: number;
}

export type FogTool = 'add' | 'remove';

export interface FogPath {
  type: 'add' | 'remove';
  path: {x: number; y: number}[];
}

export interface ViewportState {
  imageId?: string | null;
  imageUrl: string | null;
  imageType?: 'image' | 'video';
  thumbnailUrl?: string;
  imageWidth: number;
  imageHeight: number;
  scale: number;
  translateX: number;
  translateY: number;
  masterViewportWidth?: number;
  masterViewportHeight?: number;
  gridVisible?: boolean;
  gridStyle?: 'light' | 'dark';
  pixelsPerInch?: number;
  gridScaleFactor?: number;
  gridOrigin?: { x: number; y: number };
  measurements?: Measurement[];
  fogPaths?: FogPath[];
  backgroundColor?: string;
}

export const DND_VTT_CHANNEL = 'dnd-vtt-sync-channel';