import React, { useState, useRef, useEffect } from 'react';
import { Volume2, VolumeX, Volume1, KeyRound, Sparkles, BookOpen, Library, ChevronDown } from 'lucide-react';
import { sounds } from '../utils/soundEffects';

export default function Navbar({ 
  isConnected, 
  onOpenApiKeyModal, 
  hasCustomApiKey, 
  isCreatorPortalOpen, 
  onToggleCreatorPortal, 
  canToggleCreator,
  onOpenLibrary
}) {
  const [isMuted, setIsMuted] = useState(sounds.isMuted());
  const [volume, setVolume] = useState(Math.round(sounds.getVolume() * 100));
  const [showVolumePopover, setShowVolumePopover] = useState(false);
  const volumePopoverRef = useRef(null);

  const handleToggleSound = () => {
    const muted = sounds.toggleMute();
    setIsMuted(muted);
    if (!muted) sounds.playPop();
  };

  const handleVolumeChange = (e) => {
    const newVol = Number(e.target.value);
    setVolume(newVol);
    sounds.setVolume(newVol / 100);
    setIsMuted(newVol === 0);
  };

  // Close volume popover when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (volumePopoverRef.current && !volumePopoverRef.current.contains(e.target)) {
        setShowVolumePopover(false);
      }
    }
    if (showVolumePopover) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showVolumePopover]);

  return (
    <header className="w-full border-b border-white/[0.07] bg-[#090a0f]/80 backdrop-blur-xl sticky top-0 z-50 transition-all">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-15 flex items-center justify-between">
        
        {/* Sleek Linear-style Brand Logo */}
        <div className="flex items-center gap-3">
          <div className="relative group">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 p-[1px] shadow-lg shadow-indigo-500/20">
              <div className="w-full h-full bg-[#0d0f17] rounded-[11px] flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <div className="absolute -inset-1 bg-indigo-500/20 rounded-xl blur-sm -z-10 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold tracking-tight text-white flex items-center gap-1 font-heading">
              QuizVerse
            </span>
            <span className="text-[10px] font-mono tracking-wider uppercase text-indigo-300 px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20">
              Studio
            </span>
          </div>
        </div>

        {/* Right Controls & Telemetry */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Live Engine Connectivity Indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs text-zinc-300 bg-white/[0.04] border border-white/[0.08] shadow-inner">
            <span className="relative flex h-2 w-2">
              {isConnected && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              )}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isConnected ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            </span>
            <span className="hidden sm:inline text-[11px] font-medium text-zinc-400">
              {isConnected ? 'Engine Online' : 'Connecting...'}
            </span>
          </div>

          {/* Granular Audio Controls Popover */}
          <div className="relative" ref={volumePopoverRef}>
            <button
              onClick={() => setShowVolumePopover(!showVolumePopover)}
              title="Audio Volume Settings"
              className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-white transition border border-white/[0.08] cursor-pointer flex items-center gap-1"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-3.5 h-3.5 text-zinc-500" />
              ) : volume < 50 ? (
                <Volume1 className="w-3.5 h-3.5 text-zinc-200" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-zinc-200" />
              )}
            </button>

            {/* Volume Floating Popover */}
            {showVolumePopover && (
              <div className="absolute top-full right-0 mt-2 w-48 p-3 rounded-2xl studio-panel border border-white/[0.12] shadow-2xl z-50 animate-fade-in space-y-2">
                <div className="flex items-center justify-between text-[11px] font-mono text-zinc-300">
                  <span className="flex items-center gap-1.5">
                    <button 
                      type="button" 
                      onClick={handleToggleSound} 
                      className="hover:text-white transition cursor-pointer"
                    >
                      {isMuted ? 'Muted' : 'Volume'}
                    </button>
                  </span>
                  <span className="text-indigo-400 font-bold">{isMuted ? '0%' : `${volume}%`}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-full accent-indigo-400 cursor-pointer h-1.5 bg-white/[0.1] rounded-lg"
                />
              </div>
            )}
          </div>

          {/* Quiz Library Button */}
          {onOpenLibrary && (
            <button
              onClick={onOpenLibrary}
              title="Saved Quizzes & Question Bank"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white border border-white/[0.08] transition cursor-pointer"
            >
              <Library className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden md:inline text-[11px] font-medium">Library</span>
            </button>
          )}

          {/* Creator Portal Switcher */}
          {canToggleCreator && (
            <button
              onClick={() => { sounds.playPop(); onToggleCreatorPortal(); }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs transition border cursor-pointer ${
                isCreatorPortalOpen
                  ? 'bg-white text-zinc-950 font-semibold border-white shadow-md'
                  : 'bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white border-white/[0.08]'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px] font-medium">
                {isCreatorPortalOpen ? 'Arena' : 'PDF Creator'}
              </span>
            </button>
          )}

          {/* Personal API Key Modal Trigger */}
          <button
            onClick={onOpenApiKeyModal}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs transition border cursor-pointer ${
              hasCustomApiKey 
                ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30 font-medium' 
                : 'bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-white border-white/[0.08]'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[11px] font-medium">
              {hasCustomApiKey ? 'Custom Key' : 'API Key'}
            </span>
          </button>
        </div>

      </div>
    </header>
  );
}
