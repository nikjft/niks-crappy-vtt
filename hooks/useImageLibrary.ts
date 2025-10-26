import { useState, useEffect, useCallback } from 'react';
import { ImageEntry, LibraryState, Folder } from '../types';
import { addImageToDB, deleteImageFromDB, getLibraryState, saveLibraryState, updateImageInDB, getImageFromDB } from '../services/db';

const defaultLibraryState: LibraryState = {
  folders: [],
  unfiled: [],
};

export const BLANK_MAP_ID = '_blank_';

const getDpiFromBuffer = (buffer: ArrayBuffer): number | null => {
    const dataView = new DataView(buffer);

    // Check for JPEG (starts with 0xFFD8)
    if (dataView.getUint16(0) === 0xFFD8) {
        let offset = 2;
        while (offset < dataView.byteLength) {
            if (offset + 4 > dataView.byteLength) break;
            const marker = dataView.getUint16(offset);
            offset += 2;

            if (marker === 0xFFE0) { // APP0 (JFIF segment)
                const length = dataView.getUint16(offset);
                if (offset + length > dataView.byteLength) break;
                // Check for 'JFIF\0' identifier
                if (dataView.getUint32(offset + 2) === 0x4A464946 && dataView.getUint8(offset + 6) === 0x00) {
                    const units = dataView.getUint8(offset + 7);
                    const xDensity = dataView.getUint16(offset + 8);
                    if (units === 1) return xDensity; // 1 = Dots per inch
                    if (units === 2) return Math.round(xDensity * 2.54); // 2 = Dots per cm
                }
                offset += length;
            } else if (marker >= 0xFFC0 && marker <= 0xFFCF && marker !== 0xFFC4 && marker !== 0xFFC8) {
                // SOF markers, which stop the scan for metadata markers
                break;
            } else if (marker >> 8 === 0xFF) { // Any other marker
                const length = dataView.getUint16(offset);
                if (offset + length > dataView.byteLength) break;
                offset += length;
            } else {
                break; // Not a marker, something is wrong
            }
        }
    }
    // Check for PNG (starts with 89 50 4E 47 0D 0A 1A 0A)
    else if (dataView.getUint32(0) === 0x89504E47 && dataView.getUint32(4) === 0x0D0A1A0A) {
        let offset = 8;
        while (offset < dataView.byteLength) {
            if (offset + 8 > dataView.byteLength) break;
            const length = dataView.getUint32(offset);
            const chunkType = dataView.getUint32(offset + 4);
            
            if (chunkType === 0x70485973) { // pHYs chunk
                if (offset + length + 12 > dataView.byteLength) break;
                const pixelsPerUnitX = dataView.getUint32(offset + 8);
                const unitSpecifier = dataView.getUint8(offset + 16);
                if (unitSpecifier === 1) { // Unit is the meter
                    return Math.round(pixelsPerUnitX / 39.3701); // Pixels per meter to DPI
                }
                break; // Found pHYs, no need to search further.
            }
             if (chunkType === 0x49454E44) break; // IEND chunk
            offset += length + 12; // chunk_length + chunk_type + chunk_data + CRC
        }
    }
    
    return null;
}

const generateVideoThumbnail = (videoFile: File): Promise<{ thumbnailUrl: string, dataUrl: string, width: number, height: number }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(videoFile);
    reader.onload = (readerEvent) => {
      const videoDataUrl = readerEvent.target?.result as string;

      const video = document.createElement('video');
      video.style.display = 'none';
      video.muted = true;
      video.playsInline = true;

      video.onloadedmetadata = () => {
        video.currentTime = 0.1; // Seek to a very early frame to ensure it's loaded
      };

      video.onseeked = () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          try { document.body.removeChild(video); } catch (e) {}
          return reject(new Error('Could not get canvas context'));
        }
        ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        const thumbnailUrl = canvas.toDataURL('image/jpeg');
        document.body.removeChild(video); // Clean up
        resolve({
          thumbnailUrl,
          dataUrl: videoDataUrl,
          width: video.videoWidth,
          height: video.videoHeight,
        });
      };

      video.onerror = (e) => {
        try { document.body.removeChild(video); } catch (err) {}
        reject(e);
      };
      
      video.src = videoDataUrl;
      document.body.appendChild(video); // Must be in DOM for some browsers to load
    };
    reader.onerror = reject;
  });
};


export const useImageLibrary = () => {
  const [library, setLibrary] = useState<LibraryState>(defaultLibraryState);
  const [blankMap, setBlankMap] = useState<ImageEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadLibrary = async () => {
      setIsLoading(true);
      const [savedState, blankMapImageState] = await Promise.all([
        getLibraryState(),
        getImageFromDB(BLANK_MAP_ID)
      ]);
      
      const blankMapEntry: ImageEntry = {
        id: BLANK_MAP_ID,
        name: 'Blank Map',
        dataUrl: BLANK_MAP_ID,
        type: 'image',
        width: 0,
        height: 0,
        savedState: blankMapImageState?.savedState,
      };
      setBlankMap(blankMapEntry);

      if (savedState) {
        setLibrary(savedState);
      } else {
        setLibrary(defaultLibraryState);
      }
      setIsLoading(false);
    };
    loadLibrary();
  }, []);

  const saveLibrary = useCallback(async (newLibraryState: LibraryState) => {
    setLibrary(newLibraryState);
    await saveLibraryState(newLibraryState);
  }, []);

  const addImage = useCallback(async (file: File) => {
    if (file.type.startsWith('video/')) {
        try {
            const { thumbnailUrl, dataUrl, width, height } = await generateVideoThumbnail(file);
            const newVideo: ImageEntry = {
                id: self.crypto.randomUUID(),
                name: file.name,
                dataUrl,
                thumbnailUrl,
                type: 'video',
                width,
                height,
            };
            await addImageToDB(newVideo);
            const newLibraryState = { ...library, unfiled: [...library.unfiled, newVideo] };
            await saveLibrary(newLibraryState);
        } catch (error) {
            console.error("Error processing video file:", error);
        }
        return;
    }
    
    // Default to image processing for other file types
    const dataUrlPromise = new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });

    const bufferPromise = file.arrayBuffer();

    try {
        const [dataUrl, buffer] = await Promise.all([dataUrlPromise, bufferPromise]);
        const dpi = getDpiFromBuffer(buffer);

        const img = new Image();
        img.onload = async () => {
            const newImage: ImageEntry = {
                id: self.crypto.randomUUID(),
                name: file.name,
                dataUrl,
                type: 'image',
                width: img.naturalWidth,
                height: img.naturalHeight,
                dpi: dpi ?? undefined,
            };
            await addImageToDB(newImage);
            const newLibraryState = { ...library, unfiled: [...library.unfiled, newImage] };
            await saveLibrary(newLibraryState);
        };
        img.src = dataUrl;
    } catch (error) {
        console.error("Error processing image file:", error);
    }
  }, [library, saveLibrary]);
  
  const updateImage = useCallback(async (updatedImage: ImageEntry) => {
      if (updatedImage.id === BLANK_MAP_ID) {
        await updateImageInDB(updatedImage);
        setBlankMap(updatedImage);
        return;
      }
    
      await updateImageInDB(updatedImage);
      const update = (images: ImageEntry[]) => images.map(img => img.id === updatedImage.id ? updatedImage : img);

      setLibrary(prev => ({
          ...prev,
          unfiled: update(prev.unfiled),
          folders: prev.folders.map(f => ({
              ...f,
              images: update(f.images),
          }))
      }));
  }, []);

  const removeImage = useCallback(async (imageId: string) => {
    if (imageId === BLANK_MAP_ID) return; // Cannot delete the blank map state entry
    const newLibraryState: LibraryState = {
        unfiled: library.unfiled.filter(img => img.id !== imageId),
        folders: library.folders.map(folder => ({
            ...folder,
            images: folder.images.filter(img => img.id !== imageId)
        }))
    };
    await deleteImageFromDB(imageId);
    await saveLibrary(newLibraryState);
  }, [library, saveLibrary]);

  const addFolder = useCallback(async (name: string) => {
    if (!name.trim()) return;
    const newFolder: Folder = {
      id: self.crypto.randomUUID(),
      name,
      images: [],
    };
    const newLibraryState = { ...library, folders: [...library.folders, newFolder] };
    await saveLibrary(newLibraryState);
  }, [library, saveLibrary]);

  const removeFolder = useCallback(async (folderId: string) => {
    const folderToRemove = library.folders.find(f => f.id === folderId);
    if (!folderToRemove) return;
    
    // Move images from deleted folder to unfiled
    const newUnfiled = [...library.unfiled, ...folderToRemove.images];
    const newFolders = library.folders.filter(f => f.id !== folderId);

    const newLibraryState: LibraryState = {
        unfiled: newUnfiled,
        folders: newFolders
    };
    await saveLibrary(newLibraryState);
  }, [library, saveLibrary]);
  
  const renameFolder = useCallback(async (folderId: string, newName: string) => {
    if (!newName.trim()) return;
    const newLibraryState = {
      ...library,
      folders: library.folders.map(f => f.id === folderId ? { ...f, name: newName } : f)
    };
    await saveLibrary(newLibraryState);
  }, [library, saveLibrary]);

  return { library, blankMap, saveLibrary, isLoading, addImage, updateImage, removeImage, addFolder, removeFolder, renameFolder };
};