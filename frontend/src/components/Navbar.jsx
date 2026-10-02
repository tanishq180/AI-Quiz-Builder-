import React, { useState } from 'react';
import { Volume2, VolumeX, KeyRound, Wifi, WifiOff, Terminal, BookOpen } from 'lucide-react';
import { sounds } from '../utils/soundEffects';

export default function Navbar({ 
  isConnected, 
  onOpenApiKeyModal, 
  hasCustomApiKey, 
  isCreatorPortalOpen, 
  onToggleCreatorPortal, 
  canToggleCreator 
}) {
  const [isMuted, setIsMuted] = useState(sounds.isMuted());

  const handleToggleSound = () => {
    const muted = sounds.toggleMute();
    setIsMuted(muted);
    if (!muted) sounds.playPop();
  };

  return (
    <header className="w-full border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        
        {/* Minimalist Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300">
            <Terminal className="w-3.5 h-3.5" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold tracking-tight text-zinc-100">
              QuizVerse
            </span>
            <span className="text-[10px] font-mono text-zinc-400 px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800">
              AI
            </span>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Subtle Connection Status */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-zinc-400 bg-zinc-900/80 border border-zinc-800">
            <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500/80' : 'bg-zinc-600'}`} />
            <span className="hidden sm:inline text-[11px]">{isConnected ? 'Connected' : 'Offline'}</span>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={handleToggleSound}
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            className="p-1.5 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition border border-zinc-800"
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-zinc-500" /> : <Volume2 className="w-3.5 h-3.5 text-zinc-300" />}
          </button>

          {/* Creator Portal Toggle (Visible when in lobby select mode) */}
          {canToggleCreator && (
            <button
              onClick={() => { sounds.playPop(); onToggleCreatorPortal(); }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition border ${
                isCreatorPortalOpen
                  ? 'bg-zinc-100 text-zinc-950 font-medium border-zinc-200'
                  : 'bg-zinc-900/80 text-zinc-300 hover:text-zinc-100 border-zinc-800 hover:bg-zinc-800'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px]">
                {isCreatorPortalOpen ? 'Quick Arena' : 'Creator Portal'}
              </span>
            </button>
          )}

          {/* API Key Modal Button */}
          <button
            onClick={onOpenApiKeyModal}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition border ${
              hasCustomApiKey 
                ? 'bg-zinc-800/80 text-zinc-200 border-zinc-700' 
                : 'bg-zinc-900/80 text-zinc-400 hover:text-zinc-200 border-zinc-800 hover:bg-zinc-800'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5 text-zinc-400" />
            <span className="hidden sm:inline text-[11px]">{hasCustomApiKey ? 'Gemini Key' : 'API Key'}</span>
          </button>
        </div>

      </div>
    </header>
  );
}
