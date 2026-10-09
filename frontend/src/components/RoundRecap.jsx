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
    <div className="w-full max-w-4xl mx-auto px-4 py-6 sm:py-8 animate-fade-in">
      
      {/* Top Header Pill */}
      <div className="flex items-center justify-between mb-5">
        <span className="text-xs font-mono uppercase tracking-wider text-indigo-300 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20">
          Round {questionIndex + 1} of {totalQuestions} Concluded
        </span>
        <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono">
          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
          <span>Synchronizing next round...</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Left Column: Full Answer Breakdown */}
        <div className="lg:col-span-2 space-y-4">
          {hasReview ? (
            <div className="studio-panel rounded-2xl p-6 sm:p-7">
              
              <div className="flex items-center justify-between text-xs text-zinc-400 mb-3">
                <span className="font-mono text-[11px] uppercase tracking-wider text-indigo-400">
                  Question Review
                </span>
                <div className="flex items-center gap-2">
                  {isCorrect ? (
                    <span className="font-mono text-xs text-emerald-300 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 flex items-center gap-1 font-semibold">
                      <Check className="w-3.5 h-3.5" /> +{lastAnswerResult.pointsEarned} pts
                    </span>
                  ) : (
                    <span className="font-mono text-xs text-rose-300 bg-rose-500/10 px-2.5 py-1 rounded-lg border border-rose-500/20 font-semibold">
                      {lastAnswerResult.timedOut ? 'Time Expired' : 'Incorrect'} (+0 pts)
                    </span>
                  )}
                </div>
              </div>

              {/* Question Text */}
              <h3 className="text-base sm:text-lg font-medium text-white leading-relaxed mb-4">
                {lastQuestion.question}
              </h3>

              {/* 4 Options breakdown */}
              <div className="space-y-2.5 mb-4">
                {lastQuestion.options.map((optText, idx) => {
                  const isTheCorrectOpt = correctIdx === idx;
                  const isUserSelection = lastAnswerResult.userAnswer === idx;

                  let optClass = "bg-white/[0.03] border-white/[0.07] text-zinc-400";
                  if (isTheCorrectOpt) {
                    optClass = "bg-emerald-500/15 border-emerald-500/40 text-emerald-200 font-medium shadow-sm";
                  } else if (isUserSelection && !isCorrect) {
                    optClass = "bg-rose-500/15 border-rose-500/40 text-rose-200 font-medium";
                  }

                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border text-xs sm:text-sm flex items-center justify-between transition ${optClass}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-lg font-mono text-[11px] flex items-center justify-center border font-semibold ${
                          isTheCorrectOpt
                            ? 'bg-emerald-500 text-white border-emerald-400'
                            : 'bg-white/[0.06] text-zinc-400 border-white/[0.1]'
                        }`}>
                          {OPTION_LABELS[idx]}
                        </span>
                        <span className="truncate">{optText}</span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isTheCorrectOpt && (
                          <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-400 font-semibold">
                            <Check className="w-3.5 h-3.5" /> Correct Answer
                          </span>
                        )}
                        {isUserSelection && !isTheCorrectOpt && (
                          <span className="flex items-center gap-1 text-[11px] font-mono text-rose-400 font-semibold">
                            <X className="w-3.5 h-3.5" /> Your Pick
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {lastQuestion.explanation && (
                <div className="pt-3 border-t border-white/[0.08] text-xs text-zinc-300 leading-relaxed">
                  <span className="font-semibold text-indigo-300">Explanation: </span>
                  {lastQuestion.explanation}
                </div>
              )}

            </div>
          ) : (
            <div className="studio-panel rounded-2xl p-6 text-center text-zinc-400 text-sm">
              Round summary data synchronized.
            </div>
          )}
        </div>

        {/* Right Column: Round Leaderboard */}
        <div className="lg:col-span-1">
          <div className="studio-panel rounded-2xl p-5 sticky top-20">
            <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-400 mb-3 pb-2 border-b border-white/[0.08] flex items-center gap-2">
              <Award className="w-4 h-4 text-indigo-400" />
              Round Standings
            </h3>

            <div className="space-y-2">
              {leaderboard && leaderboard.map((p, rank) => {
                const isMe = p.socketId === currentSocketId;
                return (
                  <div
                    key={p.socketId}
                    className={`p-3 rounded-xl flex items-center justify-between text-xs transition ${
                      isMe 
                        ? 'bg-indigo-600/20 border border-indigo-500/40 text-white font-medium' 
                        : 'bg-white/[0.03] border border-white/[0.06] text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <span className="font-mono text-xs font-bold text-zinc-500 w-4">
                        {rank + 1}
                      </span>
                      <span className="text-base">{p.avatarSeed || '⚡'}</span>
                      <span className="truncate">{p.username}</span>
                    </div>

                    <div className="font-mono font-bold text-indigo-300 text-xs">
                      {p.score || 0} pts
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
