import React, { useState } from 'react';
import { Copy, Check, Play, Shield, Users, Clock, HelpCircle, Crown, Sparkles, UserX } from 'lucide-react';
import { sounds } from '../utils/soundEffects';

export default function WaitingLobby({
  room,
  currentSocketId,
  onStartQuiz,
  onToggleReady,
  onKickPlayer,
  isGenerating
}) {
  const [copied, setCopied] = useState(false);
  const isHost = room.hostSocketId === currentSocketId;
  const myPlayer = room.players.find(p => p.socketId === currentSocketId);
  const readyCount = room.players.filter(p => p.isReady).length;
  const difficulty = room.settings?.difficulty || 'Medium';

  const handleCopyCode = () => {
    sounds.playPop();
    navigator.clipboard.writeText(room.roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStart = () => {
    sounds.playPop();
    onStartQuiz();
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-6 sm:py-8 animate-fade-in">
      
      {/* Room Information Studio Panel */}
      <div className="studio-panel rounded-2xl p-6 sm:p-8 mb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/[0.05] blur-[80px] rounded-full pointer-events-none" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className="text-[11px] font-mono uppercase tracking-wider text-indigo-300 px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20">
                Lobby Active
              </span>
              <span className="text-[11px] font-mono text-zinc-300 px-2.5 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.08]">
                {difficulty}
              </span>
              <span className="text-xs text-zinc-400 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08]">
                <Users className="w-3.5 h-3.5 text-indigo-400" />
                {room.players.length} {room.players.length === 1 ? 'Player' : 'Players'}
              </span>
            </div>
            
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-snug">
              {room.topic}
            </h2>

            <div className="flex items-center gap-4 mt-3 text-xs text-zinc-400">
              <span className="flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-zinc-400" />
                {room.settings.questionCount} Questions
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-zinc-400" />
                {room.settings.timePerQuestion}s per round
              </span>
            </div>
          </div>

          {/* High-Tech Room Code Box */}
          <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-[#0f111a]/90 border border-white/[0.1] w-full md:w-auto shadow-xl">
            <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 mb-1">
              Room Key
            </span>
            <div className="flex items-center gap-3">
              <span className="text-3xl sm:text-4xl font-mono font-bold tracking-widest text-indigo-300">
                {room.roomCode}
              </span>
              <button
                onClick={handleCopyCode}
                title="Copy Room Key"
                className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-white border border-white/[0.1] transition cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 font-mono">
              {copied ? '✓ Copied to clipboard' : 'Share with opponents'}
            </span>
          </div>

        </div>
      </div>

      {/* Anti-Peeking Technology Notice */}
      <div className="p-3.5 rounded-2xl studio-card mb-6 flex items-center gap-3 text-xs text-zinc-400">
        <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shrink-0">
          <Shield className="w-4 h-4" />
        </div>
        <span>
          <strong className="text-zinc-200">Anti-Screen Peeking Active:</strong> Each participant receives unique question angles and randomized option layouts in real time.
        </span>
      </div>

      {/* Connected Players Roster */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-400 flex items-center gap-2">
            <span>Participants</span>
            <span className="px-2 py-0.5 rounded-full bg-white/[0.05] text-zinc-300 text-[10px]">
              {readyCount}/{room.players.length} Ready
            </span>
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {room.players.map((p) => {
            const isThisHost = p.socketId === room.hostSocketId;
            const isMe = p.socketId === currentSocketId;
            return (
              <div
                key={p.socketId}
                className={`p-3.5 rounded-2xl border flex items-center justify-between transition-all ${
                  isMe 
                    ? 'border-indigo-500/50 bg-indigo-500/[0.07] shadow-lg shadow-indigo-500/5' 
                    : 'border-white/[0.07] studio-card'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-xl shadow-inner">
                    {p.avatarSeed || '⚡'}
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-semibold text-white flex items-center gap-1.5">
                      <span className="truncate max-w-[110px]">{p.username}</span>
                      {isMe && <span className="text-[10px] text-indigo-300 font-mono">(You)</span>}
                    </div>
                    <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                      {isThisHost ? (
                        <>
                          <Crown className="w-3 h-3 text-amber-400" /> Host
                        </>
                      ) : (
                        'Player'
                      )}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isThisHost ? (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-mono bg-amber-500/10 text-amber-300 border border-amber-500/20">
                      Host
                    </span>
                  ) : p.isReady ? (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 flex items-center gap-1">
                      <Check className="w-3 h-3 text-emerald-400" /> Ready
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-mono text-zinc-500 bg-white/[0.02] border border-white/[0.06]">
                      Waiting
                    </span>
                  )}

                  {isHost && !isThisHost && (
                    <button
                      onClick={() => onKickPlayer?.(p.socketId)}
                      title={`Remove ${p.name}`}
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition cursor-pointer"
                    >
                      <UserX className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Controls Bar */}
      <div className="studio-panel rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        {!isHost ? (
          <button
            onClick={() => {
              sounds.playPop();
              onToggleReady();
            }}
            className={`w-full sm:w-auto px-6 py-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer ${
              myPlayer?.isReady
                ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/40 shadow-lg shadow-emerald-500/10'
                : 'studio-btn-secondary'
            }`}
          >
            <Check className="w-4 h-4" />
            {myPlayer?.isReady ? "Ready (Click to unready)" : 'Mark as Ready'}
          </button>
        ) : (
          <div className="text-xs text-zinc-400 text-center sm:text-left flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
            <span>Ready to initiate match once players are assembled.</span>
          </div>
        )}

        {isHost && (
          <button
            onClick={handleStart}
            disabled={isGenerating || room.players.length === 0}
            className="w-full sm:w-auto px-7 py-3 rounded-xl studio-btn-primary text-xs sm:text-sm flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer shadow-xl group"
          >
            <Play className="w-4 h-4 fill-current group-hover:scale-110 transition-transform" />
            <span>{isGenerating ? 'Synthesizing Quizzes...' : 'Launch Quiz Match'}</span>
          </button>
        )}
      </div>

    </div>
  );
}
