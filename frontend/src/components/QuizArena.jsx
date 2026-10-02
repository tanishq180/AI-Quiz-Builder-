import React, { useState, useEffect } from 'react';
import { Clock, Check, X, Award, AlertCircle, Compass, Loader2 } from 'lucide-react';
import { sounds } from '../utils/soundEffects';

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

export default function QuizArena({
  questionData,
  roundStatus = 'ACTIVE_QUESTION', // 'WAITING_FOR_PLAYERS' | 'ACTIVE_QUESTION' | 'REVEAL_ANSWER'
  answerRevealData = null,
  transitionSecondsRemaining = null,
  onSubmitAnswer,
  leaderboard,
  currentSocketId,
  serverAuthoritativeTime
}) {
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(questionData.timeLimit || 15);

  const isRevealPhase = roundStatus === 'REVEAL_ANSWER';
  const totalTime = questionData.timeLimit || 15;
  const progressRatio = Math.max(0, timeRemaining / totalTime);

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
  }, [questionData.id, questionData.roundStartTime, totalTime]);

  // Handle optimistic answer submission
  const handleSelectOption = (idx) => {
    if (isRevealPhase || hasSubmitted || timeRemaining <= 0) return;
    sounds.playPop();
    setSelectedIndex(idx);
    setHasSubmitted(true);
    onSubmitAnswer(questionData.questionIndex, idx);
  };

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

  // Transition countdown calculations
  const transitionTotal = answerRevealData?.transitionDuration || 5;
  const currentTransitionSec = typeof transitionSecondsRemaining === 'number' 
    ? transitionSecondsRemaining 
    : transitionTotal;
  const transitionProgress = Math.max(0, Math.min(100, (currentTransitionSec / transitionTotal) * 100));

  const timerStrokeColor = timeRemaining > 4 ? 'stroke-zinc-300' : 'stroke-zinc-500';
  const myPlayer = leaderboard?.find(p => p.socketId === currentSocketId);

  // Identify correct answer index and user's choice
  const correctIndex = answerRevealData ? answerRevealData.correctIndex : null;
  const finalUserAnswer = answerRevealData ? answerRevealData.userAnswer : selectedIndex;

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6 animate-fade-in">
      
      {/* Top Header: Progress & Synchronized Round Clock */}
      <div className="flex items-center justify-between gap-4 mb-5">
        
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="px-3 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-300">
            {questionData.questionIndex + 1} / {questionData.totalQuestions}
          </span>

          {myPlayer?.streak > 1 && (
            <span className="px-2.5 py-1 rounded-lg bg-zinc-800 text-zinc-200 border border-zinc-700 text-xs font-mono">
              {myPlayer.streak}x Streak
            </span>
          )}

          {/* Phase Badge */}
          <span className={`px-2.5 py-1 rounded-lg text-xs font-mono border transition-colors ${
            isRevealPhase
              ? 'bg-zinc-800 text-zinc-200 border-zinc-600'
              : 'bg-zinc-900 text-zinc-400 border-zinc-800'
          }`}>
            {isRevealPhase ? 'REVEAL PHASE' : 'ANSWERING'}
          </span>

          {questionData.subFocus && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900/60 border border-zinc-800 text-xs text-zinc-400">
              <Compass className="w-3.5 h-3.5 text-zinc-400" />
              <span className="truncate max-w-[220px] text-[11px]">
                {questionData.subFocus}
              </span>
            </div>
          )}
        </div>

        {/* Minimalist Clock & Transition Indicator (Fixed width/height container to avoid layout shift) */}
        <div className="flex items-center gap-2.5 min-w-[130px] justify-end">
          {!isRevealPhase ? (
            <>
              <div className="relative w-10 h-10 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 36 36">
                  <circle
                    cx="18"
                    cy="18"
                    r="15.9155"
                    fill="none"
                    className="stroke-zinc-800"
                    strokeWidth="2.5"
                  />
                  <circle
                    cx="18"
                    cy="18"
                    r="15.9155"
                    fill="none"
                    className={`transition-all duration-100 ${timerStrokeColor}`}
                    strokeWidth="2.5"
                    strokeDasharray="100, 100"
                    strokeDashoffset={100 - progressRatio * 100}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute font-mono text-xs font-medium text-zinc-200">
                  {Math.ceil(timeRemaining)}
                </div>
              </div>
              <span className="text-xs font-mono text-zinc-500 hidden sm:inline">
                {timeRemaining}s
              </span>
            </>
          ) : (
            <div className="flex items-center gap-1.5 text-xs font-mono text-zinc-300 bg-zinc-900 px-2.5 py-1.5 rounded-lg border border-zinc-800">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-400" />
              <span>Next in {currentTransitionSec}s</span>
            </div>
          )}
        </div>

      </div>

      {/* Transition Progress Bar (Fixed reserved line above grid, zero height impact on question card) */}
      <div className="w-full h-1 bg-zinc-900 rounded-full mb-4 overflow-hidden">
        {isRevealPhase ? (
          <div 
            className="h-full bg-zinc-400 rounded-full transition-all duration-1000 ease-linear"
            style={{ width: `${transitionProgress}%` }}
          />
        ) : (
          <div className="h-full bg-transparent" />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        
        {/* Main Quiz Area */}
        <div className="lg:col-span-3 space-y-4">
          
          {/* Question Card (Static height & content - never shifts between active & reveal) */}
          <div 
            key={questionData.id}
            className="minimal-panel rounded-2xl p-5 sm:p-7 relative"
          >
            <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 mb-2">
              Question {questionData.questionIndex + 1} of {questionData.totalQuestions}
            </div>

            <h2 className="text-base sm:text-lg font-medium text-zinc-100 leading-relaxed">
              {questionData.question}
            </h2>
          </div>

          {/* 4 Option Buttons (Layout, padding, border-2 remain 100% static) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {questionData.options.map((optionText, idx) => {
              const isSelectedByUser = finalUserAnswer === idx;
              const isCorrectAnswer = isRevealPhase && correctIndex === idx;
              const isWrongSelection = isRevealPhase && isSelectedByUser && !answerRevealData?.isCorrect;

              // 1. Conditional Highlighting Logic
              // Stable base classes: border-2 to avoid layout shifts when color changes
              let cardStyle = "bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-850 text-zinc-300";
              let labelStyle = "bg-zinc-850 border-zinc-800 text-zinc-400";

              if (isRevealPhase) {
                if (isCorrectAnswer) {
                  // The Correct Answer: Simultaneously highlight actual correct option in green
                  cardStyle = "bg-green-500 text-white border-green-700 font-medium shadow-sm";
                  labelStyle = "bg-green-600 border-green-700 text-white font-bold";
                } else if (isWrongSelection) {
                  // User's Incorrect Selection: If user selected wrong answer, highlight specifically in red
                  cardStyle = "bg-red-500 text-white border-red-700 font-medium shadow-sm";
                  labelStyle = "bg-red-600 border-red-700 text-white font-bold";
                } else {
                  // Unselected/Neutral Options: Fade out in disabled state
                  cardStyle = "opacity-50 cursor-not-allowed bg-zinc-900/40 border-zinc-850 text-zinc-400";
                  labelStyle = "bg-zinc-900 border-zinc-850 text-zinc-500";
                }
              } else if (isSelectedByUser) {
                // Optimistic UI during ACTIVE_QUESTION
                cardStyle = "bg-zinc-800 border-zinc-500 text-zinc-100";
                labelStyle = "bg-zinc-700 border-zinc-600 text-zinc-100";
              }

              return (
                <button
                  key={idx}
                  onClick={() => handleSelectOption(idx)}
                  disabled={isRevealPhase || hasSubmitted || timeRemaining <= 0}
                  className={`p-4 rounded-xl border-2 text-left flex items-start gap-3 transition-colors duration-150 relative ${
                    isRevealPhase ? 'pointer-events-none' : ''
                  } disabled:cursor-not-allowed ${cardStyle}`}
                >
                  {/* Fixed-size Option Letter badge */}
                  <div className={`w-6 h-6 rounded-md font-mono text-[11px] flex items-center justify-center shrink-0 border transition-colors ${labelStyle}`}>
                    {OPTION_LABELS[idx]}
                  </div>

                  {/* Option Text (flex-1 ensures width remains completely static) */}
                  <span className="text-xs sm:text-sm font-normal flex-1 pt-0.5 leading-snug">
                    {optionText}
                  </span>

                  {/* Fixed-size slot for icon so option text never wraps or jumps */}
                  <div className="w-5 h-5 flex items-center justify-center shrink-0 self-center">
                    {isRevealPhase && isCorrectAnswer && (
                      <Check className="w-4 h-4 text-white" />
                    )}
                    {isRevealPhase && isWrongSelection && (
                      <X className="w-4 h-4 text-white" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Reveal Feedback & AI Explanation Banner */}
          {isRevealPhase && answerRevealData && (
            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/90 animate-fade-in text-xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {answerRevealData.isCorrect ? (
                    <div className="flex items-center gap-1.5 text-zinc-200 font-medium">
                      <Check className="w-4 h-4 text-green-400" />
                      <span>Correct Answer</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-zinc-300 font-medium">
                      <AlertCircle className="w-4 h-4 text-red-400" />
                      <span>
                        {answerRevealData.timedOut ? "Time Expired" : "Incorrect Answer"}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 font-mono text-zinc-300">
                  {answerRevealData.isCorrect ? (
                    <span className="text-green-400 font-semibold">
                      +{answerRevealData.pointsEarned} pts
                    </span>
                  ) : (
                    <span className="text-zinc-500">+0 pts</span>
                  )}
                  <span className="text-zinc-400 font-normal">
                    Total: {answerRevealData.totalScore}
                  </span>
                </div>
              </div>

              {answerRevealData.explanation && (
                <p className="text-zinc-400 leading-relaxed pt-2 border-t border-zinc-800 text-[11px]">
                  <strong className="text-zinc-300">Explanation:</strong> {answerRevealData.explanation}
                </p>
              )}
            </div>
          )}

          {/* Submission status notice during ACTIVE_QUESTION */}
          {!isRevealPhase && hasSubmitted && (
            <div className="p-3 rounded-lg bg-zinc-900/40 border border-zinc-800 text-center text-xs text-zinc-400 flex items-center justify-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-pulse" />
              Answer submitted. Waiting for round timer...
            </div>
          )}

        </div>

        {/* Live Standings Sidebar */}
        <div className="lg:col-span-1">
          <div className="minimal-panel rounded-2xl p-4 sticky top-20">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-zinc-800">
              <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-zinc-400" />
                Standings
              </h3>
              <span className="text-[10px] text-zinc-500 font-mono">Live</span>
            </div>

            <div className="space-y-1.5">
              {leaderboard && leaderboard.map((p, rank) => {
                const isMe = p.socketId === currentSocketId;
                return (
                  <div
                    key={p.socketId}
                    className={`p-2 rounded-lg flex items-center justify-between text-xs transition ${
                      isMe 
                        ? 'bg-zinc-800/80 border border-zinc-700 text-zinc-100' 
                        : 'bg-zinc-900/40 border border-zinc-800/60 text-zinc-400'
                    }`}
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <span className="font-mono text-[10px] text-zinc-500 w-3">
                        {rank + 1}
                      </span>
                      <span className="text-sm shrink-0">{p.avatarSeed || '⚡'}</span>
                      <span className="truncate text-xs font-medium">
                        {p.username}
                      </span>
                    </div>

                    <div className="text-right shrink-0 font-mono text-zinc-300 text-xs">
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
