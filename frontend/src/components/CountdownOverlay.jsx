import React, { useEffect } from 'react';
import { sounds } from '../utils/soundEffects';

export default function CountdownOverlay({ count }) {
  useEffect(() => {
    if (count > 0) {
      sounds.playCountdownTick();
    } else {
      sounds.playStartHorn();
    }
  }, [count]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/90 backdrop-blur-sm animate-fade-in pointer-events-none">
      <div className="flex flex-col items-center justify-center text-center">
        <div className="text-7xl sm:text-8xl font-mono font-bold text-zinc-100 tracking-tight transition-transform duration-200">
          {count > 0 ? count : 'START'}
        </div>
        <p className="mt-4 text-xs font-mono uppercase tracking-widest text-zinc-400">
          Synchronizing Round...
        </p>
      </div>
    </div>
  );
}
