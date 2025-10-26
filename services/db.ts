import { ImageEntry, LibraryState, Folder } from '../types';

const DB_NAME = 'DND_VTT_DB';
const DB_VERSION = 1;
const IMAGE_STORE_NAME = 'images';
const LIBRARY_STORE_NAME = 'library';
const LIBRARY_KEY = 'main-library';

let db: IDBDatabase;

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (db) {
      return resolve(db);
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('Error opening DB', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(IMAGE_STORE_NAME)) {
        db.createObjectStore(IMAGE_STORE_NAME, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(LIBRARY_STORE_NAME)) {
        db.createObjectStore(LIBRARY_STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

export const getImageFromDB = async (id: string): Promise<ImageEntry | undefined> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([IMAGE_STORE_NAME], 'readonly');
        const store = transaction.objectStore(IMAGE_STORE_NAME);
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

export const addImageToDB = async (image: ImageEntry): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([IMAGE_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(IMAGE_STORE_NAME);
    const request = store.put(image);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const updateImageInDB = async (image: ImageEntry): Promise<void> => {
  return addImageToDB(image); // IDB's `put` handles both creation and updates.
};

export const deleteImageFromDB = async (id: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([IMAGE_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(IMAGE_STORE_NAME);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const getLibraryState = async (): Promise<LibraryState | null> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([LIBRARY_STORE_NAME], 'readonly');
        const store = transaction.objectStore(LIBRARY_STORE_NAME);
        const request = store.get(LIBRARY_KEY);
        request.onsuccess = async () => {
            if (request.result) {
                const libraryData = request.result.data;
                const allImageIds = [...libraryData.unfiled, ...libraryData.folders.flatMap((f: Folder) => f.images)].map(img => img.id);
                
                const imageTransaction = db.transaction([IMAGE_STORE_NAME], 'readonly');
                const imageStore = imageTransaction.objectStore(IMAGE_STORE_NAME);

                const images: { [id: string]: ImageEntry } = {};
                
                let completed = 0;
                if (allImageIds.length === 0) {
                    resolve(libraryData);
                    return;
                }

                allImageIds.forEach(id => {
                    const imgRequest = imageStore.get(id);
                    imgRequest.onsuccess = () => {
                        if(imgRequest.result) {
                            images[id] = imgRequest.result;
                        }
                        completed++;
                        if (completed === allImageIds.length) {
                             const hydratedLibrary: LibraryState = {
                                unfiled: libraryData.unfiled.map((i: {id: string}) => images[i.id]).filter(Boolean),
                                folders: libraryData.folders.map((f: {id: string; name: string; images: {id: string}[]}) => ({
                                    ...f,
                                    images: f.images.map(i => images[i.id]).filter(Boolean)
                                }))
                            };
                            resolve(hydratedLibrary);
                        }
                    };
                    imgRequest.onerror = () => { // Still count as completed to not hang
                        completed++;
                         if (completed === allImageIds.length) {
                            // ... resolve with what we have
                         }
                    }
                });
            } else {
                resolve(null);
            }
        };
        request.onerror = () => reject(request.error);
    });
};

export const saveLibraryState = async (state: LibraryState): Promise<void> => {
    const db = await openDB();

    const strippedState = {
        unfiled: state.unfiled.map(i => ({ id: i.id, name: i.name })),
        folders: state.folders.map(f => ({
            id: f.id,
            name: f.name,
            images: f.images.map(i => ({ id: i.id, name: i.name }))
        }))
    };

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([LIBRARY_STORE_NAME], 'readwrite');
        const store = transaction.objectStore(LIBRARY_STORE_NAME);
        const request = store.put({ id: LIBRARY_KEY, data: strippedState });
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};