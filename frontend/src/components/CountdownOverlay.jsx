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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md animate-fade-in pointer-events-none">
      <div className="relative flex flex-col items-center justify-center text-center">
        {/* Glowing atmospheric halo */}
        <div className="absolute w-64 h-64 bg-indigo-500/20 blur-[90px] rounded-full -z-10 animate-pulse" />

        <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full studio-panel flex items-center justify-center border-2 border-indigo-400/60 shadow-2xl shadow-indigo-500/30">
          <div className="text-6xl sm:text-7xl font-mono font-extrabold text-white tracking-tight drop-shadow-lg">
            {count > 0 ? count : 'GO!'}
          </div>
        </div>

        <p className="mt-5 text-xs font-mono uppercase tracking-widest text-indigo-300 font-semibold px-4 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 shadow-inner">
          {count > 0 ? 'Synchronizing Round...' : 'Arena Live!'}
        </p>
      </div>
    </div>
  );
}
