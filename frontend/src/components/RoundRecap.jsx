import React from 'react';
import { Check, X, Clock, Award, Compass, Sparkles } from 'lucide-react';

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

export default function RoundRecap({
  roundData,
  currentSocketId,
  lastQuestion,
  lastAnswerResult
}) {
  const { questionIndex, totalQuestions, leaderboard } = roundData;
  const topPlayer = leaderboard?.[0];

  const hasReview = lastQuestion && lastAnswerResult;
  const isCorrect = lastAnswerResult?.isCorrect;
  const correctIdx = lastAnswerResult?.correctIndex;

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-8 animate-fade-in">
      
      {/* Top Header Pill */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-[11px] font-mono text-zinc-400 px-2.5 py-0.5 rounded bg-zinc-900 border border-zinc-800">
          Round {questionIndex + 1} of {totalQuestions} Answered
        </span>
        <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-mono">
          <span className="w-2 h-2 rounded-full bg-zinc-400 animate-ping" />
          <span>Next question loading...</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Left Column: Full Answer Breakdown for the question just answered (2 columns) */}
        <div className="lg:col-span-2 space-y-4">
          {hasReview ? (
            <div className="minimal-panel rounded-2xl p-5 sm:p-6">
              
              <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
                <span className="font-mono text-[11px] uppercase tracking-wider text-zinc-500">
                  Question Review
                </span>
                <div className="flex items-center gap-2">
                  {isCorrect ? (
                    <span className="font-mono text-[11px] text-zinc-100 bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700 flex items-center gap-1">
                      <Check className="w-3 h-3 text-zinc-300" /> +{lastAnswerResult.pointsEarned} pts
                    </span>
                  ) : (
                    <span className="font-mono text-[11px] text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                      {lastAnswerResult.timedOut ? 'Time Expired' : 'Incorrect'} (+0 pts)
                    </span>
                  )}
                </div>
              </div>

              {/* Question Text */}
              <h3 className="text-sm sm:text-base font-medium text-zinc-100 leading-relaxed mb-4">
                {lastQuestion.question}
              </h3>

              {/* 4 Options breakdown */}
              <div className="space-y-2 mb-4">
                {lastQuestion.options.map((optText, idx) => {
                  const isTheCorrectOpt = correctIdx === idx;
                  const isUserSelection = lastAnswerResult.userAnswer === idx;

                  let optClass = "bg-zinc-900/50 border-zinc-850 text-zinc-400";
                  if (isTheCorrectOpt) {
                    optClass = "bg-zinc-800/90 border-zinc-600 text-zinc-100 font-medium";
                  } else if (isUserSelection && !isCorrect) {
                    optClass = "bg-zinc-900 border-zinc-750 text-zinc-300";
                  }

                  return (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-xl border text-xs flex items-center justify-between transition ${optClass}`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={`w-5 h-5 rounded font-mono text-[10px] flex items-center justify-center border ${
                          isTheCorrectOpt
                            ? 'bg-zinc-700 text-zinc-100 border-zinc-500'
                            : 'bg-zinc-850 text-zinc-500 border-zinc-800'
                        }`}>
                          {OPTION_LABELS[idx]}
                        </span>
                        <span className="truncate">{optText}</span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {isTheCorrectOpt && (
                          <span className="flex items-center gap-1 text-[11px] font-mono text-zinc-300">
                            <Check className="w-3.5 h-3.5" /> Correct Answer
                          </span>
                        )}
                        {isUserSelection && !isTheCorrectOpt && (
                          <span className="flex items-center gap-1 text-[11px] font-mono text-zinc-500">
                            <X className="w-3.5 h-3.5" /> Your Pick
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* AI Explanation */}
              {lastAnswerResult.explanation && (
                <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-850 text-xs text-zinc-400 leading-relaxed">
                  <strong className="text-zinc-200">AI Explanation:</strong> {lastAnswerResult.explanation}
                </div>
              )}

            </div>
          ) : (
            <div className="minimal-panel rounded-2xl p-6 text-center text-xs text-zinc-500">
              Question recorded. Next round preparing...
            </div>
          )}
        </div>

        {/* Right Column: Standings (1 column) */}
        <div className="lg:col-span-1">
          <div className="minimal-panel rounded-2xl p-4 sm:p-5 sticky top-20">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-zinc-800">
              <h4 className="text-xs font-medium uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-zinc-400" />
                Scores
              </h4>
              <span className="text-[10px] font-mono text-zinc-500">Round {questionIndex + 1}</span>
            </div>

            <div className="space-y-1.5">
              {leaderboard && leaderboard.map((p, idx) => {
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
                      <span className="font-mono text-[10px] text-zinc-500 w-3">{idx + 1}</span>
                      <span className="text-sm shrink-0">{p.avatarSeed || '⚡'}</span>
                      <span className="truncate font-medium text-xs">
                        {p.username}
                        {isMe && <span className="text-[10px] text-zinc-400 font-mono ml-1">(You)</span>}
                      </span>
                    </div>
                    <span className="font-mono text-zinc-300 text-xs shrink-0">
                      {p.score || 0}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Loading progress bar */}
            <div className="mt-4 pt-3 border-t border-zinc-800/80">
              <div className="flex justify-between text-[10px] font-mono text-zinc-500 mb-1">
                <span>Loading Next Question</span>
                <span>...</span>
              </div>
              <div className="w-full h-1 rounded-full bg-zinc-850 overflow-hidden">
                <div className="h-full bg-zinc-400 rounded-full animate-pulse w-3/4 transition-all duration-300" />
              </div>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
