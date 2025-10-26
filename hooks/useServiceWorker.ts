import { useState, useEffect } from 'react';

export const useServiceWorker = () => {
    const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
    const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

    useEffect(() => {
        if (!('serviceWorker' in navigator)) {
            return;
        }

        navigator.serviceWorker.ready.then(reg => {
            // Check for an update already waiting
            if (reg.waiting) {
                setIsUpdateAvailable(true);
                setWaitingWorker(reg.waiting);
                return;
            }

            // Listen for new updates
            reg.addEventListener('updatefound', () => {
                const newWorker = reg.installing;
                if (newWorker) {
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                             setIsUpdateAvailable(true);
                             setWaitingWorker(newWorker);
                        }
                    });
                }
            });
        });

        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (refreshing) return;
            window.location.reload();
            refreshing = true;
        });
    }, []);

    const updateAssets = () => {
        if (waitingWorker) {
            waitingWorker.postMessage({ type: 'SKIP_WAITING' });
        }
    };

    return { isUpdateAvailable, updateAssets };
};
