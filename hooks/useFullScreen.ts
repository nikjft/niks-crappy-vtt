import { useState, useEffect, useCallback } from 'react';

export const useFullScreen = () => {
    const [isFullScreen, setIsFullScreen] = useState(!!document.fullscreenElement);

    const handleFullScreenChange = useCallback(() => {
        setIsFullScreen(!!document.fullscreenElement);
    }, []);

    useEffect(() => {
        document.addEventListener('fullscreenchange', handleFullScreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullScreenChange);
    }, [handleFullScreenChange]);

    const toggleFullScreen = useCallback(() => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    }, []);

    return { isFullScreen, toggleFullScreen };
};
