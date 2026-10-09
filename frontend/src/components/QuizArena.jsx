import React, { useState, useEffect } from 'react';
import { 
  Check, X, Award, AlertCircle, Compass, Loader2, ArrowRight, Flame, Clock, 
  Pause, Play, FastForward, Maximize2, Minimize2, Skull, Sparkles 
} from 'lucide-react';
import { sounds } from '../utils/soundEffects';

const OPTION_LABELS = ['A', 'B', 'C', 'D'];
const EMOJI_REACTIONS = ['🔥', '👏', '💡', '😱', '⚡', '🎉'];

export default function QuizArena({
  questionData,
  roundStatus = 'ACTIVE_QUESTION', // 'WAITING_FOR_PLAYERS' | 'ACTIVE_QUESTION' | 'REVEAL_ANSWER'
  answerRevealData = null,
  transitionSecondsRemaining = null,
  onSubmitAnswer,
  leaderboard,
  currentSocketId,
  serverAuthoritativeTime,
  onNextQuestion,
  isHost = false,
  isTimerPaused = false,
  onPauseTimer,
  onResumeTimer,
  onSkipQuestion,
  onSendReaction,
  incomingReaction = null,
  isEliminated = false
}) {
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(questionData.timeLimit || 15);
  const [floatingReactions, setFloatingReactions] = useState([]);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const isRevealPhase = roundStatus === 'REVEAL_ANSWER';
  const totalTime = questionData.timeLimit || 15;
  const progressRatio = Math.max(0, timeRemaining / totalTime);
  const isLastQuestion = (questionData.questionIndex + 1) >= questionData.totalQuestions;

  // Authoritative server timer synchronization during ACTIVE_QUESTION
  useEffect(() => {
    if (!isRevealPhase && typeof serverAuthoritativeTime === 'number') {
      setTimeRemaining(serverAuthoritativeTime);
    }
  }, [serverAuthoritativeTime, isRevealPhase]);

  // Reset local state when a new question arrives
  useEffect(() => {
    setSelectedIndex(null);
    setHasSubmitted(false);
    setTimeRemaining(questionData.timeLimit || 15);

    if (isTimerPaused) return;

    const startTime = questionData.roundStartTime || Date.now();
    const interval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      const rem = Math.max(0, totalTime - elapsed);
      setTimeRemaining(parseFloat(rem.toFixed(1)));

      if (rem <= 0) {
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [questionData.id, questionData.roundStartTime, totalTime, isTimerPaused]);

  // Handle incoming reactions for burst animation
  useEffect(() => {
    if (incomingReaction?.emoji) {
      const newBurst = {
        id: Date.now() + Math.random(),
        emoji: incomingReaction.emoji,
        senderName: incomingReaction.senderName || '',
        x: Math.floor(Math.random() * 70) + 15 // Random horizontal 15% - 85%
      };
      setFloatingReactions(prev => [...prev.slice(-15), newBurst]);

      const timer = setTimeout(() => {
        setFloatingReactions(prev => prev.filter(r => r.id !== newBurst.id));
      }, 2300);

      return () => clearTimeout(timer);
    }
  }, [incomingReaction]);

  // Fullscreen toggle handler
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  // Optimistic answer submission
  const handleSelectOption = (idx) => {
    if (isRevealPhase || hasSubmitted || timeRemaining <= 0 || isEliminated) return;
    sounds.playPop();
    setSelectedIndex(idx);
    setHasSubmitted(true);
    onSubmitAnswer(questionData.questionIndex, idx);
  };

  // Keyboard shortcut listener (A-D, Space/Enter for Next, F for fullscreen)
  useEffect(() => {
    function handleKeyDown(e) {
      // Don't trigger if user is typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      const key = e.key.toUpperCase();

      // Fullscreen shortcut
      if (key === 'F') {
        toggleFullscreen();
        return;
      }

      // Next question shortcut during reveal
      if (isRevealPhase && (e.code === 'Space' || e.key === 'Enter')) {
        e.preventDefault();
        sounds.playPop();
        onNextQuestion?.();
        return;
      }

      // Option selection shortcuts during active phase
      if (isRevealPhase || hasSubmitted || timeRemaining <= 0 || isEliminated) return;

      let index = -1;
      if (key === 'A' || key === '1') index = 0;
      else if (key === 'B' || key === '2') index = 1;
      else if (key === 'C' || key === '3') index = 2;
      else if (key === 'D' || key === '4') index = 3;

      if (index >= 0 && index < (questionData.options?.length || 4)) {
        handleSelectOption(index);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRevealPhase, hasSubmitted, timeRemaining, questionData.options, isEliminated, onNextQuestion]);

  // Sound triggers on answer reveal
  useEffect(() => {
    if (isRevealPhase && answerRevealData) {
      if (answerRevealData.isCorrect) {
        sounds.playCorrect();
      } else {
        sounds.playWrong();
      }
    }
  }, [isRevealPhase, answerRevealData]);

  // Reaction button trigger
  const handleEmojiClick = (emoji) => {
    sounds.playPop();
    // Add locally immediately
    const localBurst = {
      id: Date.now() + Math.random(),
      emoji,
      senderName: 'You',
      x: Math.floor(Math.random() * 60) + 20
    };
    setFloatingReactions(prev => [...prev.slice(-15), localBurst]);
    setTimeout(() => {
      setFloatingReactions(prev => prev.filter(r => r.id !== localBurst.id));
    }, 2300);

    onSendReaction?.(emoji);
  };

  // Transition countdown calculations
  const transitionTotal = answerRevealData?.transitionDuration || 5;
  const currentTransitionSec = typeof transitionSecondsRemaining === 'number' 
    ? transitionSecondsRemaining 
    : transitionTotal;
  const transitionProgress = Math.max(0, Math.min(100, (currentTransitionSec / transitionTotal) * 100));

  const timerStrokeColor = timeRemaining > 5 
    ? 'stroke-indigo-400' 
    : timeRemaining > 2 
      ? 'stroke-amber-400' 
      : 'stroke-rose-500';

  const myPlayer = leaderboard?.find(p => p.socketId === currentSocketId);
  const correctIndex = answerRevealData ? answerRevealData.correctIndex : null;
  const finalUserAnswer = answerRevealData ? answerRevealData.userAnswer : selectedIndex;

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-4 sm:py-6 animate-fade-in relative">

      {/* Floating Emoji Reaction Bursts Layer */}
      <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
        {floatingReactions.map(r => (
          <div
            key={r.id}
            className="absolute bottom-20 animate-float-up flex flex-col items-center drop-shadow-lg"
            style={{ left: `${r.x}%` }}
          >
            <span className="text-4xl sm:text-5xl select-none">{r.emoji}</span>
            {r.senderName && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-black/60 text-white backdrop-blur-sm mt-1 border border-white/10">
                {r.senderName}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Battle Royale Elimination Banner */}
      {isEliminated && (
        <div className="mb-4 p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-between text-rose-300 animate-fade-in">
          <div className="flex items-center gap-2.5">
            <Skull className="w-5 h-5 text-rose-400 animate-pulse" />
            <span className="text-xs font-semibold uppercase tracking-wider">
              Battle Royale Elimination — You are now in Spectator Mode
            </span>
          </div>
          <span className="text-[11px] font-mono text-zinc-400">
            Enjoy spectating & cheer via emoji reactions!
          </span>
        </div>
      )}

      {/* Top Header: Progress, Streak, Timer, Fullscreen */}
      <div className="flex items-center justify-between gap-4 mb-3">
        
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="px-3 py-1.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-xs font-mono font-medium text-white shadow-inner">
            Question {questionData.questionIndex + 1} of {questionData.totalQuestions}
          </span>

          {myPlayer?.streak > 1 && (
            <span className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border border-amber-500/30 text-xs font-mono font-bold shadow-lg shadow-amber-500/10">
              <Flame className="w-3.5 h-3.5 fill-current text-amber-400 animate-pulse" />
              {myPlayer.streak}x Streak
            </span>
          )}

          {/* Phase Badge */}
          <span className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium border transition-colors ${
            isRevealPhase
              ? 'bg-indigo-500/20 text-indigo-200 border-indigo-500/40 shadow-lg shadow-indigo-500/10'
              : isTimerPaused
                ? 'bg-amber-500/20 text-amber-200 border-amber-500/40'
                : 'bg-white/[0.04] text-zinc-400 border-white/[0.07]'
          }`}>
            {isRevealPhase ? 'REVEAL PHASE' : isTimerPaused ? 'PAUSED BY HOST' : 'ANSWERING'}
          </span>

          {questionData.subFocus && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.07] text-xs text-zinc-400">
              <Compass className="w-3.5 h-3.5 text-indigo-400" />
              <span className="truncate max-w-[220px] text-[11px]">
                {questionData.subFocus}
              </span>
            </div>
          )}
        </div>

        {/* Precision Clock, Fullscreen & Controls */}
        <div className="flex items-center gap-3 justify-end">
          <button
            onClick={toggleFullscreen}
            title="Toggle Fullscreen (F)"
            className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-zinc-400 hover:text-white hover:bg-white/[0.08] transition cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {!isRevealPhase ? (
            <div className="flex items-center gap-2.5">
              <div className="relative w-11 h-11 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90 transform drop-shadow-md" viewBox="0 0 36 36">
                  <circle
                    cx="18"
                    cy="18"
                    r="15.9155"
                    fill="none"
                    className="stroke-white/[0.06]"
                    strokeWidth="2.8"
                  />
                  <circle
                    cx="18"
                    cy="18"
                    r="15.9155"
                    fill="none"
                    className={`transition-all duration-100 ${timerStrokeColor}`}
                    strokeWidth="2.8"
                    strokeDasharray="100, 100"
                    strokeDashoffset={100 - progressRatio * 100}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute font-mono text-xs font-bold text-white">
                  {Math.ceil(timeRemaining)}
                </div>
              </div>
              <span className="text-xs font-mono text-zinc-400 hidden sm:inline">
                {timeRemaining}s
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-1.5 text-xs font-mono text-indigo-300 bg-indigo-500/10 px-3 py-2 rounded-xl border border-indigo-500/20">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                <span>Auto in {currentTransitionSec}s</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  sounds.playPop();
                  if (onNextQuestion) onNextQuestion();
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl studio-btn-primary text-xs font-semibold transition cursor-pointer"
                title={isLastQuestion ? "Show Final Leaderboard" : "Advance to Next Question (Space)"}
              >
                <span>{isLastQuestion ? 'Results' : 'Next'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

      </div>

      {/* Host Moderation Controls Bar (Section 4.1) */}
      {isHost && (
        <div className="mb-4 px-4 py-2.5 rounded-xl bg-amber-500/[0.06] border border-amber-500/25 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-amber-300 font-mono">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span>Host Controls:</span>
          </div>

          <div className="flex items-center gap-2">
            {!isRevealPhase && (
              isTimerPaused ? (
                <button
                  onClick={() => {
                    sounds.playPop();
                    onResumeTimer?.();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 font-medium flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Resume Timer</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    sounds.playPop();
                    onPauseTimer?.();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 font-medium flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Pause className="w-3.5 h-3.5" />
                  <span>Pause Timer</span>
                </button>
              )
            )}

            <button
              onClick={() => {
                sounds.playPop();
                onSkipQuestion?.();
              }}
              className="px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 border border-white/[0.08] font-medium flex items-center gap-1.5 transition cursor-pointer"
            >
              <FastForward className="w-3.5 h-3.5" />
              <span>Skip Question</span>
            </button>
          </div>
        </div>
      )}

      {/* Transition Progress Bar */}
      <div className="w-full h-1 bg-white/[0.05] rounded-full mb-5 overflow-hidden">
        {isRevealPhase ? (
          <div 
            className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-1000 ease-linear shadow-sm shadow-indigo-500/50"
            style={{ width: `${transitionProgress}%` }}
          />
        ) : (
          <div className="h-full bg-transparent" />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        
        {/* Main Quiz Area */}
        <div className="lg:col-span-3 space-y-4">
          
          {/* Question Studio Card */}
          <div 
            key={questionData.id}
            className="studio-panel rounded-2xl p-6 sm:p-8 relative overflow-hidden"
          >
            <div className="text-[11px] font-mono uppercase tracking-wider text-indigo-400 mb-2 flex items-center gap-2">
              <span>Telemetry Node</span>
              <span>•</span>
              <span>Round {questionData.questionIndex + 1}</span>
            </div>

            <h2 className="text-lg sm:text-xl font-medium text-white leading-relaxed">
              {questionData.question}
            </h2>
          </div>

          {/* 4 Option Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {questionData.options.map((optionText, idx) => {
              const isSelectedByUser = finalUserAnswer === idx;
              const isCorrectAnswer = isRevealPhase && correctIndex === idx;
              const isWrongSelection = isRevealPhase && isSelectedByUser && !answerRevealData?.isCorrect;

              let cardStyle = "studio-card-interactive text-zinc-200";
              let labelStyle = "bg-white/[0.06] border-white/[0.1] text-zinc-400";

              if (isRevealPhase) {
                if (isCorrectAnswer) {
                  cardStyle = "bg-emerald-500/20 text-emerald-100 border-2 border-emerald-400 font-medium shadow-lg shadow-emerald-500/20";
                  labelStyle = "bg-emerald-500 text-white border-emerald-400 font-bold";
                } else if (isWrongSelection) {
                  cardStyle = "bg-rose-500/20 text-rose-100 border-2 border-rose-400 font-medium shadow-lg shadow-rose-500/20";
                  labelStyle = "bg-rose-500 text-white border-rose-400 font-bold";
                } else {
                  cardStyle = "opacity-40 cursor-not-allowed bg-white/[0.02] border-white/[0.04] text-zinc-500";
                  labelStyle = "bg-white/[0.03] border-white/[0.06] text-zinc-600";
                }
              } else if (isSelectedByUser) {
                cardStyle = "bg-indigo-600/25 border-2 border-indigo-400 text-white shadow-xl shadow-indigo-500/20 scale-[1.01]";
                labelStyle = "bg-indigo-500 text-white border-indigo-400";
              }

              return (
                <button
                  key={idx}
                  onClick={() => handleSelectOption(idx)}
                  disabled={isRevealPhase || hasSubmitted || timeRemaining <= 0 || isEliminated}
                  className={`p-4 sm:p-5 rounded-2xl border text-left flex items-start gap-3.5 transition-all duration-150 relative cursor-pointer ${
                    isRevealPhase ? 'pointer-events-none' : ''
                  } disabled:cursor-not-allowed ${cardStyle}`}
                >
                  {/* Fixed-size Option Letter badge */}
                  <div className={`w-7 h-7 rounded-xl font-mono text-xs flex items-center justify-center shrink-0 border transition-colors shadow-inner ${labelStyle}`}>
                    {OPTION_LABELS[idx]}
                  </div>

                  {/* Option Text */}
                  <span className="text-xs sm:text-sm font-normal flex-1 pt-1 leading-snug">
                    {optionText}
                  </span>

                  {/* Icon slot */}
                  <div className="w-5 h-5 flex items-center justify-center shrink-0 self-center">
                    {isRevealPhase && isCorrectAnswer && (
                      <Check className="w-5 h-5 text-emerald-400" />
                    )}
                    {isRevealPhase && isWrongSelection && (
                      <X className="w-5 h-5 text-rose-400" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Reveal Feedback & AI Explanation Banner */}
          {isRevealPhase && answerRevealData && (
            <div className="p-5 rounded-2xl studio-panel border-white/[0.1] animate-fade-in text-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {answerRevealData.isCorrect ? (
                    <div className="flex items-center gap-2 text-emerald-300 font-semibold text-sm">
                      <div className="p-1 rounded-lg bg-emerald-500/20 border border-emerald-500/30">
                        <Check className="w-4 h-4 text-emerald-400" />
                      </div>
                      <span>Correct Answer</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-rose-300 font-semibold text-sm">
                      <div className="p-1 rounded-lg bg-rose-500/20 border border-rose-500/30">
                        <AlertCircle className="w-4 h-4 text-rose-400" />
                      </div>
                      <span>
                        {answerRevealData.timedOut ? "Time Limit Expired" : "Incorrect Answer"}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 font-mono text-xs">
                  {answerRevealData.isCorrect ? (
                    <span className="text-emerald-400 font-bold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                      +{answerRevealData.pointsEarned} pts
                    </span>
                  ) : (
                    <span className="text-zinc-500 px-2 py-0.5 rounded bg-white/[0.04]">+0 pts</span>
                  )}
                  <span className="text-zinc-300">
                    Total: {answerRevealData.totalScore}
                  </span>
                </div>
              </div>

              {answerRevealData.explanation && (
                <div className="pt-3 border-t border-white/[0.08] text-[12px] text-zinc-300 leading-relaxed">
                  <span className="font-semibold text-indigo-300">AI Context: </span>
                  {answerRevealData.explanation}
                </div>
              )}
            </div>
          )}

          {/* Action button to reveal next question */}
          {isRevealPhase && (
            <div className="p-4 sm:p-5 rounded-2xl studio-card flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in">
              <div className="text-xs text-zinc-400 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>
                  {isLastQuestion
                    ? 'Final question completed. Match standings ready!'
                    : `Round ${questionData.questionIndex + 1} finished. Advancing in ${currentTransitionSec}s (or press Space).`
                  }
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  sounds.playPop();
                  if (onNextQuestion) onNextQuestion();
                }}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl studio-btn-primary text-xs sm:text-sm font-semibold transition flex items-center justify-center gap-2 shadow-xl cursor-pointer"
              >
                <span>{isLastQuestion ? 'View Match Podium' : 'Advance Next Question'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Submission status notice during ACTIVE_QUESTION */}
          {!isRevealPhase && hasSubmitted && (
            <div className="p-3.5 rounded-xl studio-card text-center text-xs text-zinc-400 flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
              <span>Response recorded. Awaiting clock expiration or opponent submissions...</span>
            </div>
          )}

          {/* Live Emoji Reaction Bar (Section 4.3) */}
          <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-400">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Send Live Reaction:</span>
            </div>

            <div className="flex items-center gap-2">
              {EMOJI_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleEmojiClick(emoji)}
                  className="px-2.5 py-1.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] hover:scale-110 active:scale-95 transition-all text-base cursor-pointer"
                  title={`React with ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Live Standings Sidebar */}
        <div className="lg:col-span-1">
          <div className="studio-panel rounded-2xl p-4 sticky top-20">
            <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-white/[0.08]">
              <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-indigo-400" />
                Live Standings
              </h3>
              <span className="text-[10px] text-emerald-400 font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                Active
              </span>
            </div>

            <div className="space-y-2">
              {leaderboard && leaderboard.map((p, rank) => {
                const isMe = p.socketId === currentSocketId;
                return (
                  <div
                    key={p.socketId}
                    className={`p-2.5 rounded-xl flex items-center justify-between text-xs transition ${
                      isMe 
                        ? 'bg-indigo-600/20 border border-indigo-500/40 text-white shadow-sm' 
                        : 'bg-white/[0.03] border border-white/[0.06] text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <span className="font-mono text-[11px] font-bold text-zinc-500 w-3.5">
                        {rank + 1}
                      </span>
                      <span className="text-base shrink-0">{p.avatarSeed || '⚡'}</span>
                      <span className="truncate text-xs font-medium">
                        {p.username}
                      </span>
                      {p.isEliminated && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          DEAD
                        </span>
                      )}
                    </div>

                    <div className="text-right shrink-0 font-mono font-bold text-indigo-300 text-xs">
                      {p.score || 0}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
