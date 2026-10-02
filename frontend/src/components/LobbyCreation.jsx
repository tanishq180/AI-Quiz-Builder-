import React, { useState } from 'react';
import { Plus, ArrowRight, User, Hash, Sliders, Layers, Clock, Gauge, BookOpen } from 'lucide-react';
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
  { level: 'Easy', desc: 'Core fundamentals' },
  { level: 'Medium', desc: 'Standard trivia' },
  { level: 'Hard', desc: 'Edge cases & depth' }
];

export default function LobbyCreation({ onCreateRoom, onJoinRoom, isConnecting, onOpenCreatorPortal }) {
  const [tab, setTab] = useState('host'); // 'host' or 'join'
  
  // Host state
  const [hostName, setHostName] = useState('');
  const [topic, setTopic] = useState('React Performance Optimization');
  const [difficulty, setDifficulty] = useState('Medium');
  const [questionCount, setQuestionCount] = useState(5);
  const [timePerQuestion, setTimePerQuestion] = useState(15);
  const [selectedAvatar, setSelectedAvatar] = useState('⚡');

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
      avatarSeed: selectedAvatar
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
    <div className="w-full max-w-xl mx-auto px-4 py-8 sm:py-12 animate-fade-in">
      
      {/* Subtle Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-100 mb-2">
          Multiplayer AI Quiz Arena
        </h1>
        <p className="text-zinc-400 text-xs sm:text-sm max-w-md mx-auto">
          Create or join live trivia rooms with unique, anti-cheat question streams generated in real time.
        </p>
      </div>

      {/* Segmented Switcher */}
      <div className="flex p-1 rounded-xl bg-zinc-900 border border-zinc-800 mb-6">
        <button
          onClick={() => { sounds.playPop(); setTab('host'); }}
          className={`flex-1 py-2 px-3 rounded-lg text-xs sm:text-sm font-medium transition-all ${
            tab === 'host'
              ? 'bg-zinc-800 text-zinc-100 shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Create Room
        </button>

        <button
          onClick={() => { sounds.playPop(); setTab('join'); }}
          className={`flex-1 py-2 px-3 rounded-lg text-xs sm:text-sm font-medium transition-all ${
            tab === 'join'
              ? 'bg-zinc-800 text-zinc-100 shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Join With Code
        </button>

        {onOpenCreatorPortal && (
          <button
            onClick={() => { sounds.playPop(); onOpenCreatorPortal(); }}
            className="flex-1 py-2 px-3 rounded-lg text-xs sm:text-sm font-medium transition-all text-zinc-400 hover:text-zinc-100 flex items-center justify-center gap-1.5"
          >
            <BookOpen className="w-3.5 h-3.5 text-zinc-400" />
            <span>PDF Creator</span>
          </button>
        )}
      </div>

      {/* Avatar Picker */}
      <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 mb-5">
        <label className="block text-[11px] font-medium uppercase tracking-wider text-zinc-400 mb-2">
          Select Avatar
        </label>
        <div className="flex items-center justify-between gap-1.5 overflow-x-auto pb-0.5">
          {AVATARS.map((av) => (
            <button
              key={av}
              type="button"
              onClick={() => { sounds.playPop(); setSelectedAvatar(av); }}
              className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all ${
                selectedAvatar === av
                  ? 'bg-zinc-800 text-white border border-zinc-600 scale-105'
                  : 'bg-zinc-900/80 hover:bg-zinc-800/50 text-zinc-400 border border-zinc-800/60'
              }`}
            >
              {av}
            </button>
          ))}
        </div>
      </div>

      {/* Form Content */}
      <div className="minimal-panel rounded-2xl p-5 sm:p-7">
        {tab === 'host' ? (
          <form onSubmit={handleHostSubmit} className="space-y-5">
            
            {/* Host Name */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                Your Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={hostName}
                  onChange={(e) => setHostName(e.target.value)}
                  placeholder="e.g. Alex"
                  maxLength={24}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800 focus:border-zinc-500 focus:outline-none text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 transition"
                />
              </div>
            </div>

            {/* Custom Topic Prompt */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-zinc-400">
                  Topic Prompt
                </label>
                <span className="text-[10px] text-zinc-500">Gemini LLM</span>
              </div>
              <textarea
                required
                rows={2}
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. React Performance Optimization, WWII Pacific Theater..."
                maxLength={100}
                className="w-full px-3.5 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 focus:border-zinc-500 focus:outline-none text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 transition resize-none"
              />

              {/* Minimal Topic Chips */}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {POPULAR_TOPICS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => { sounds.playPop(); setTopic(t); }}
                    className="text-[11px] px-2 py-0.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 transition"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty Level Selector */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                Difficulty
              </label>
              <div className="grid grid-cols-3 gap-2">
                {DIFFICULTIES.map((diff) => (
                  <button
                    key={diff.level}
                    type="button"
                    onClick={() => { sounds.playPop(); setDifficulty(diff.level); }}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      difficulty === diff.level
                        ? 'bg-zinc-800/90 border-zinc-600 text-zinc-100'
                        : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 text-zinc-400'
                    }`}
                  >
                    <div className="font-medium text-xs text-zinc-200">{diff.level}</div>
                    <div className="text-[10px] text-zinc-500 leading-tight mt-0.5">{diff.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Sliders: Question Count & Time Per Question */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              
              <div className="bg-zinc-900/60 p-3 rounded-xl border border-zinc-800/80">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs font-medium text-zinc-400 flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-zinc-400" />
                    Questions
                  </span>
                  <span className="text-xs font-mono text-zinc-300">{questionCount} Qs</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="12"
                  value={questionCount}
                  onChange={(e) => setQuestionCount(Number(e.target.value))}
                  className="w-full accent-zinc-400 cursor-pointer"
                />
              </div>

              <div className="bg-zinc-900/60 p-3 rounded-xl border border-zinc-800/80">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs font-medium text-zinc-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-zinc-400" />
                    Time Limit
                  </span>
                  <span className="text-xs font-mono text-zinc-300">{timePerQuestion}s</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="45"
                  step="5"
                  value={timePerQuestion}
                  onChange={(e) => setTimePerQuestion(Number(e.target.value))}
                  className="w-full accent-zinc-400 cursor-pointer"
                />
              </div>

            </div>

            {/* Minimalist Submit Host Button */}
            <button
              type="submit"
              disabled={isConnecting}
              className="w-full py-3 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-medium text-xs sm:text-sm flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
            >
              <span>{isConnecting ? 'Creating...' : 'Create Room'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        ) : (
          <form onSubmit={handleJoinSubmit} className="space-y-5">
            {/* Join Name */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                Your Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={joinName}
                  onChange={(e) => setJoinName(e.target.value)}
                  placeholder="e.g. Jordan"
                  maxLength={24}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800 focus:border-zinc-500 focus:outline-none text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 transition"
                />
              </div>
            </div>

            {/* Room Code */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                6-Character Room Code
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                  <Hash className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  placeholder="e.g. ZC5JG4"
                  maxLength={6}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800 focus:border-zinc-500 focus:outline-none text-sm font-mono tracking-widest text-zinc-200 placeholder-zinc-600 transition uppercase"
                />
              </div>
            </div>

            {/* Submit Join Button */}
            <button
              type="submit"
              disabled={isConnecting}
              className="w-full py-3 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-medium text-xs sm:text-sm flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
            >
              <span>{isConnecting ? 'Connecting...' : 'Join Room'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        )}
      </div>

      {/* Creator Portal Callout Banner */}
      {onOpenCreatorPortal && (
        <div 
          onClick={() => { sounds.playPop(); onOpenCreatorPortal(); }}
          className="mt-6 p-4 rounded-xl bg-zinc-900/40 hover:bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700 cursor-pointer flex items-center justify-between transition-all group shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 group-hover:text-zinc-100 transition">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-medium text-zinc-200">
                Have a textbook chapter or lecture PDF?
              </div>
              <div className="text-[11px] text-zinc-400">
                Use the Creator Portal to set topic-wise question distributions directly from your document.
              </div>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-200 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
        </div>
      )}

    </div>
  );
}
