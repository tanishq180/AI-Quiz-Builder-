import React, { useState } from 'react';
import { ArrowRight, User, Hash, Layers, Clock, BookOpen, Sparkles, Zap, Shield, Flame, Library, Skull, UserCheck } from 'lucide-react';
import { sounds } from '../utils/soundEffects';

const POPULAR_TOPICS = [
  'React Performance Optimization',
  'World War II Pacific Theater',
  'Quantum Computing & Physics',
  'Cybersecurity & Network Protocols',
  'System Design & Microservices',
  'Deep Learning & Transformers'
];

const AVATARS = ['⚡', '🧠', '🚀', '👾', '🐱', '🦊', '🐉', '🎮', '🎯', '🔮'];

const DIFFICULTIES = [
  { level: 'Easy', desc: 'Core fundamentals', badge: '1x Multiplier' },
  { level: 'Medium', desc: 'Standard trivia depth', badge: '1.5x Multiplier' },
  { level: 'Hard', desc: 'Nuanced edge cases', badge: '2x Multiplier' }
];

export default function LobbyCreation({ 
  onCreateRoom, 
  onJoinRoom, 
  isConnecting, 
  onOpenCreatorPortal,
  onOpenLibrary 
}) {
  const [tab, setTab] = useState('host'); // 'host' | 'solo' | 'join'
  
  // Host & Solo state
  const [hostName, setHostName] = useState('');
  const [topic, setTopic] = useState('React Performance Optimization');
  const [difficulty, setDifficulty] = useState('Medium');
  const [questionCount, setQuestionCount] = useState(5);
  const [timePerQuestion, setTimePerQuestion] = useState(15);
  const [selectedAvatar, setSelectedAvatar] = useState('⚡');
  const [gameMode, setGameMode] = useState('STANDARD'); // 'STANDARD' | 'BATTLE_ROYALE'

  // Join state
  const [joinName, setJoinName] = useState('');
  const [roomCode, setRoomCode] = useState('');

  const sanitize = (val, max = 50) => String(val || '').replace(/[<>]/g, '').trim().slice(0, max);

  const handleHostSubmit = (e) => {
    e.preventDefault();
    const cleanName = sanitize(hostName, 24);
    if (!cleanName) return;

    sounds.playPop();
    onCreateRoom({
      hostName: cleanName,
      topic: sanitize(topic, 100) || 'General Science',
      difficulty,
      questionCount,
      timePerQuestion,
      avatarSeed: selectedAvatar,
      gameMode,
      isSolo: false
    });
  };

  const handleSoloSubmit = (e) => {
    e.preventDefault();
    const cleanName = sanitize(hostName, 24) || 'Solo Scholar';

    sounds.playPop();
    onCreateRoom({
      hostName: cleanName,
      topic: sanitize(topic, 100) || 'General Science',
      difficulty,
      questionCount,
      timePerQuestion,
      avatarSeed: selectedAvatar,
      gameMode: 'SOLO_PRACTICE',
      isSolo: true
    });
  };

  const handleJoinSubmit = (e) => {
    e.preventDefault();
    const cleanName = sanitize(joinName, 24);
    const cleanCode = sanitize(roomCode, 6).toUpperCase();
    if (!cleanName || !cleanCode) return;

    sounds.playPop();
    onJoinRoom({
      username: cleanName,
      roomCode: cleanCode,
      avatarSeed: selectedAvatar
    });
  };

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-4 sm:py-8 animate-fade-in">
      
      {/* Studio Linear Hero */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 mb-3 shadow-inner">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>Real-Time Anti-Cheat Quiz Engine</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-2 bg-gradient-to-b from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent">
          Multiplayer AI Quiz Arena
        </h1>
        <p className="text-zinc-400 text-xs sm:text-sm max-w-md mx-auto leading-relaxed">
          Synthesize custom multiplayer trivia or study self-paced in solo mode with unique AI question streams.
        </p>
      </div>

      {/* Modern Segmented Switcher */}
      <div className="flex p-1.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-xl mb-6 shadow-lg">
        <button
          onClick={() => { sounds.playPop(); setTab('host'); }}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer ${
            tab === 'host'
              ? 'bg-white text-zinc-950 font-semibold shadow-md'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          Host Arena
        </button>

        <button
          onClick={() => { sounds.playPop(); setTab('solo'); }}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            tab === 'solo'
              ? 'bg-white text-zinc-950 font-semibold shadow-md'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5 text-indigo-500" />
          <span>Solo Practice</span>
        </button>

        <button
          onClick={() => { sounds.playPop(); setTab('join'); }}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer ${
            tab === 'join'
              ? 'bg-white text-zinc-950 font-semibold shadow-md'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          Join Room
        </button>
      </div>

      {/* Avatar Picker Panel */}
      <div className="p-4 rounded-2xl studio-card mb-6">
        <div className="flex items-center justify-between mb-2.5">
          <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
            Player Avatar
          </label>
          <span className="text-[11px] text-zinc-500 font-mono">Selected: {selectedAvatar}</span>
        </div>
        <div className="flex items-center justify-between gap-1.5 overflow-x-auto pb-1">
          {AVATARS.map((av) => (
            <button
              key={av}
              type="button"
              onClick={() => { sounds.playPop(); setSelectedAvatar(av); }}
              className={`w-10 h-10 rounded-xl text-lg flex items-center justify-center transition-all cursor-pointer ${
                selectedAvatar === av
                  ? 'bg-indigo-600/30 text-white border-2 border-indigo-400 shadow-lg shadow-indigo-500/20 scale-105'
                  : 'bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 border border-white/[0.06] hover:scale-102'
              }`}
            >
              {av}
            </button>
          ))}
        </div>
      </div>

      {/* Main Studio Form Panel */}
      <div className="studio-panel rounded-2xl p-6 sm:p-8">
        {tab === 'host' || tab === 'solo' ? (
          <form onSubmit={tab === 'solo' ? handleSoloSubmit : handleHostSubmit} className="space-y-6">
            
            {/* Host / Solo Name */}
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-2">
                {tab === 'solo' ? 'Your Name' : 'Host Name'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={hostName}
                  onChange={(e) => setHostName(e.target.value)}
                  placeholder={tab === 'solo' ? 'e.g. Solo Explorer' : 'e.g. Alex Turing'}
                  maxLength={24}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#0e1019]/90 border border-white/[0.09] focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 focus:outline-none text-xs sm:text-sm text-white placeholder-zinc-500 transition shadow-inner"
                />
              </div>
            </div>

            {/* Game Mode Selector (Visible in Multiplayer Host tab) */}
            {tab === 'host' && (
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-2">
                  Match Gameplay Mode
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => { sounds.playPop(); setGameMode('STANDARD'); }}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                      gameMode === 'STANDARD'
                        ? 'bg-indigo-600/20 border-indigo-500/80 text-white shadow-md'
                        : 'bg-white/[0.03] border-white/[0.07] text-zinc-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-semibold text-xs text-white">
                      <Zap className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Standard Arena</span>
                    </div>
                    <div className="text-[10px] text-zinc-400 mt-1">Full match points leaderboard</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => { sounds.playPop(); setGameMode('BATTLE_ROYALE'); }}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                      gameMode === 'BATTLE_ROYALE'
                        ? 'bg-rose-600/20 border-rose-500/80 text-white shadow-md'
                        : 'bg-white/[0.03] border-white/[0.07] text-zinc-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-semibold text-xs text-rose-300">
                      <Skull className="w-3.5 h-3.5 text-rose-400" />
                      <span>Battle Royale</span>
                    </div>
                    <div className="text-[10px] text-zinc-400 mt-1">Lowest scorer eliminated each round</div>
                  </button>
                </div>
              </div>
            )}

            {/* Custom Topic Prompt */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-zinc-300">
                  Topic Prompt
                </label>
                <span className="text-[10px] font-mono text-indigo-400 px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20">
                  Gemini 2.0 AI
                </span>
              </div>
              <textarea
                required
                rows={2}
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. React Performance Optimization, WWII Pacific Theater..."
                maxLength={100}
                className="w-full px-4 py-2.5 rounded-xl bg-[#0e1019]/90 border border-white/[0.09] focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 focus:outline-none text-xs sm:text-sm text-white placeholder-zinc-500 transition resize-none shadow-inner"
              />

              {/* Popular Topic Pills */}
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {POPULAR_TOPICS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => { sounds.playPop(); setTopic(t); }}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-zinc-200 border border-white/[0.07] transition cursor-pointer"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty Level Selector */}
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-2">
                Difficulty Level
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {DIFFICULTIES.map((diff) => (
                  <button
                    key={diff.level}
                    type="button"
                    onClick={() => { sounds.playPop(); setDifficulty(diff.level); }}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      difficulty === diff.level
                        ? 'bg-indigo-600/20 border-indigo-500/80 text-white shadow-lg shadow-indigo-500/10'
                        : 'bg-white/[0.03] border-white/[0.07] hover:border-white/[0.15] text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <div className="font-semibold text-xs text-white">{diff.level}</div>
                    <div className="text-[10px] text-zinc-400 leading-tight mt-1">{diff.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Sliders: Question Count & Time Per Question */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              
              <div className="studio-card p-3.5 rounded-xl">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-indigo-400" />
                    Questions
                  </span>
                  <span className="text-xs font-mono font-bold text-white px-2 py-0.5 rounded bg-white/[0.06] border border-white/[0.08]">
                    {questionCount} Qs
                  </span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="12"
                  value={questionCount}
                  onChange={(e) => setQuestionCount(Number(e.target.value))}
                  className="w-full accent-indigo-400 cursor-pointer"
                />
              </div>

              <div className="studio-card p-3.5 rounded-xl">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-400" />
                    {tab === 'solo' ? 'Timer (Self-paced)' : 'Round Timer'}
                  </span>
                  <span className="text-xs font-mono font-bold text-white px-2 py-0.5 rounded bg-white/[0.06] border border-white/[0.08]">
                    {timePerQuestion}s
                  </span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="45"
                  step="5"
                  value={timePerQuestion}
                  onChange={(e) => setTimePerQuestion(Number(e.target.value))}
                  className="w-full accent-indigo-400 cursor-pointer"
                />
              </div>

            </div>

            {/* Submit Action Button */}
            <button
              type="submit"
              disabled={isConnecting}
              className="w-full py-3.5 rounded-xl studio-btn-primary flex items-center justify-center gap-2 text-xs sm:text-sm transition disabled:opacity-50 cursor-pointer group"
            >
              <span>
                {isConnecting 
                  ? 'Connecting...' 
                  : tab === 'solo' 
                    ? 'Launch Solo Practice Mode' 
                    : gameMode === 'BATTLE_ROYALE' 
                      ? 'Launch Battle Royale Arena' 
                      : 'Create Multiplayer Room'}
              </span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </form>
        ) : (
          <form onSubmit={handleJoinSubmit} className="space-y-6">
            {/* Join Name */}
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-2">
                Your Player Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={joinName}
                  onChange={(e) => setJoinName(e.target.value)}
                  placeholder="e.g. Jordan"
                  maxLength={24}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#0e1019]/90 border border-white/[0.09] focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 focus:outline-none text-xs sm:text-sm text-white placeholder-zinc-500 transition shadow-inner"
                />
              </div>
            </div>

            {/* Room Code */}
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-2">
                6-Character Room Key
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                  <Hash className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  placeholder="e.g. ZC5JG4"
                  maxLength={6}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#0e1019]/90 border border-white/[0.09] focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 focus:outline-none text-base font-mono tracking-widest text-indigo-300 placeholder-zinc-600 transition uppercase shadow-inner"
                />
              </div>
            </div>

            {/* Submit Join Button */}
            <button
              type="submit"
              disabled={isConnecting}
              className="w-full py-3.5 rounded-xl studio-btn-primary flex items-center justify-center gap-2 text-xs sm:text-sm transition disabled:opacity-50 cursor-pointer group"
            >
              <span>{isConnecting ? 'Connecting...' : 'Join Arena'}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </form>
        )}
      </div>

      {/* Feature Callout Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-6">
        {/* PDF Creator Callout */}
        {onOpenCreatorPortal && (
          <div 
            onClick={() => { sounds.playPop(); onOpenCreatorPortal(); }}
            className="p-4 rounded-2xl studio-card-interactive cursor-pointer flex items-center justify-between transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 group-hover:scale-105 transition-transform">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-white group-hover:text-indigo-200 transition">
                  PDF / Word Creator
                </div>
                <div className="text-[11px] text-zinc-400">
                  Upload chapters or notes
                </div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-white group-hover:translate-x-1 transition-all shrink-0 ml-2" />
          </div>
        )}

        {/* Quiz Library Callout */}
        {onOpenLibrary && (
          <div 
            onClick={() => { sounds.playPop(); onOpenLibrary(); }}
            className="p-4 rounded-2xl studio-card-interactive cursor-pointer flex items-center justify-between transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 group-hover:scale-105 transition-transform">
                <Library className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-white group-hover:text-cyan-200 transition">
                  Quiz Library & Anki
                </div>
                <div className="text-[11px] text-zinc-400">
                  Saved question banks
                </div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-white group-hover:translate-x-1 transition-all shrink-0 ml-2" />
          </div>
        )}
      </div>

    </div>
  );
}
