import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ViewportState, DND_VTT_CHANNEL } from '../types';

export const useWindowSync = (
  initialState: ViewportState,
  options: { isMaster?: boolean; isPaused?: boolean } = {}
): [ViewportState, (newState: React.SetStateAction<ViewportState>) => void] => {
  const { isMaster = false, isPaused = false } = options;
  const [state, setState] = useState<ViewportState>(initialState);
  const channelRef = useRef<BroadcastChannel | null>(null);

  // Main effect for listening and setting up the channel
  useEffect(() => {
    channelRef.current = new BroadcastChannel(DND_VTT_CHANNEL);

    const handleMessage = (event: MessageEvent) => {
      // Master should not sync from clients
      if (isMaster) return;
      
      // Ignore state requests
      if (event.data?.type === 'REQUEST_STATE') return;
      
      setState(event.data);
    };

    channelRef.current.addEventListener('message', handleMessage);

    // If we're a client, request the current state upon connection
    if (!isMaster) {
        channelRef.current.postMessage({ type: 'REQUEST_STATE' });
    }

    return () => {
      if (channelRef.current) {
        channelRef.current.removeEventListener('message', handleMessage);
        channelRef.current.close();
      }
    };
  }, [isMaster]);

  // Effect for master to respond to state requests
  useEffect(() => {
    if (!isMaster) return; // Only master responds

    const channel = new BroadcastChannel(DND_VTT_CHANNEL);
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'REQUEST_STATE') {
        channel.postMessage(state);
      }
    };
    channel.addEventListener('message', handleMessage);
    return () => {
      channel.removeEventListener('message', handleMessage);
      channel.close();
    };
  }, [isMaster, state]);

  // Effect to sync when un-pausing
  const wasPaused = useRef(isPaused);
  useEffect(() => {
    if (isMaster && wasPaused.current && !isPaused) {
      if (channelRef.current) {
        channelRef.current.postMessage(state);
      }
    }
    wasPaused.current = isPaused;
  }, [isMaster, isPaused, state]);

  const setSyncedState = useCallback((newState: React.SetStateAction<ViewportState>) => {
    setState(prevState => {
        const updatedState = typeof newState === 'function' ? newState(prevState) : newState;
        if(isMaster && !isPaused && channelRef.current) {
            channelRef.current.postMessage(updatedState);
        }
        return updatedState;
    });
  }, [isMaster, isPaused]);

  return [state, setSyncedState];
};
