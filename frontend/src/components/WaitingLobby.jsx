import React, { useState } from 'react';
import { Copy, Check, Play, Shield, Users, Clock, HelpCircle } from 'lucide-react';
import { sounds } from '../utils/soundEffects';

export default function WaitingLobby({
  room,
  currentSocketId,
  onStartQuiz,
  onToggleReady,
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
    <div className="w-full max-w-3xl mx-auto px-4 py-8 animate-fade-in">
      
      {/* Room Information Panel */}
      <div className="minimal-panel rounded-2xl p-6 sm:p-7 mb-5">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-[11px] font-mono text-zinc-400 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800">
                LOBBY
              </span>
              <span className="text-[11px] font-mono text-zinc-400 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800">
                {difficulty}
              </span>
              <span className="text-xs text-zinc-400 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-zinc-400" />
                {room.players.length} {room.players.length === 1 ? 'Player' : 'Players'}
              </span>
            </div>
            
            <h2 className="text-xl sm:text-2xl font-semibold text-zinc-100 tracking-tight">
              {room.topic}
            </h2>

            <div className="flex items-center gap-4 mt-2 text-xs text-zinc-400">
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

          {/* Minimalist Room Code Box */}
          <div className="flex flex-col items-center justify-center p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 w-full md:w-auto">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 mb-1">
              Room Code
            </span>
            <div className="flex items-center gap-2.5">
              <span className="text-2xl sm:text-3xl font-mono font-bold tracking-widest text-zinc-100">
                {room.roomCode}
              </span>
              <button
                onClick={handleCopyCode}
                title="Copy Room Code"
                className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition"
              >
                {copied ? <Check className="w-4 h-4 text-zinc-200" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <span className="text-[10px] text-zinc-500 mt-1">
              {copied ? 'Copied' : 'Share with players'}
            </span>
          </div>

        </div>
      </div>

      {/* Subtle Notice */}
      <div className="p-3.5 rounded-xl bg-zinc-900/40 border border-zinc-800/80 mb-5 flex items-center gap-2.5 text-xs text-zinc-400">
        <Shield className="w-4 h-4 text-zinc-400 shrink-0" />
        <span>
          Each participant receives distinct sub-focus questions to prevent screen peeking.
        </span>
      </div>

      {/* Player Roster Grid */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-400">
            Connected Players ({readyCount}/{room.players.length} Ready)
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
          {room.players.map((p) => {
            const isThisHost = p.socketId === room.hostSocketId;
            const isMe = p.socketId === currentSocketId;
            return (
              <div
                key={p.socketId}
                className={`p-3.5 rounded-xl bg-zinc-900/70 border flex items-center justify-between transition-all ${
                  isMe ? 'border-zinc-600 bg-zinc-900' : 'border-zinc-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-lg">
                    {p.avatarSeed || '⚡'}
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-medium text-zinc-100 flex items-center gap-1">
                      {p.username}
                      {isMe && <span className="text-[10px] text-zinc-400 font-mono">(You)</span>}
                    </div>
                    <span className="text-[11px] text-zinc-500">
                      {isThisHost ? 'Host' : 'Player'}
                    </span>
                  </div>
                </div>

                <div>
                  {isThisHost ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-300 border border-zinc-700">
                      Host
                    </span>
                  ) : p.isReady ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-200 border border-zinc-700 flex items-center gap-1">
                      <Check className="w-3 h-3 text-zinc-400" /> Ready
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono text-zinc-500 border border-zinc-800">
                      Waiting
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Controls */}
      <div className="minimal-panel rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        {!isHost ? (
          <button
            onClick={() => {
              sounds.playPop();
              onToggleReady();
            }}
            className={`w-full sm:w-auto px-5 py-2.5 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition ${
              myPlayer?.isReady
                ? 'bg-zinc-800 text-zinc-100 border border-zinc-600'
                : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800'
            }`}
          >
            <Check className="w-3.5 h-3.5" />
            {myPlayer?.isReady ? "Ready (Click to unready)" : 'Mark as Ready'}
          </button>
        ) : (
          <div className="text-xs text-zinc-400 text-center sm:text-left">
            Start quiz when all players are ready.
          </div>
        )}

        {isHost && (
          <button
            onClick={handleStart}
            disabled={isGenerating || room.players.length === 0}
            className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 font-medium text-xs sm:text-sm flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            {isGenerating ? 'Generating Quizzes...' : 'Start Quiz'}
          </button>
        )}
      </div>

    </div>
  );
}
