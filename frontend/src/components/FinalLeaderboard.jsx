import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, RotateCcw, Home, X, Check, BookOpen, Clock } from 'lucide-react';
import { sounds } from '../utils/soundEffects';

export default function FinalLeaderboard({
  gameOverData,
  currentSocketId,
  isHost,
  onPlayAgain,
  onLeaveGame
}) {
  const { topic, difficulty, leaderboard, podium, playerBreakdowns } = gameOverData;
  const [reviewModalPlayer, setReviewModalPlayer] = useState(null);

  // Subtle monochromatic confetti celebration
  useEffect(() => {
    sounds.playVictory();

    const end = Date.now() + 1.8 * 1000;
    // Elegant neutral / platinum / silver palette
    const colors = ['#ffffff', '#e4e4e7', '#a1a1aa', '#71717a', '#52525b'];

    (function frame() {
      confetti({
        particleCount: 2,
        angle: 60,
        spread: 45,
        origin: { x: 0 },
        colors: colors
      });
      confetti({
        particleCount: 2,
        angle: 120,
        spread: 45,
        origin: { x: 1 },
        colors: colors
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    })();
  }, []);

  const first = podium?.first;
  const second = podium?.second;
  const third = podium?.third;

  const targetPlayerAnswers = reviewModalPlayer ? playerBreakdowns?.[reviewModalPlayer] || [] : [];
  const targetPlayerInfo = reviewModalPlayer ? leaderboard?.find(p => p.socketId === reviewModalPlayer) : null;

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-8 sm:py-10 animate-fade-in relative">
      
      {/* Title Header */}
      <div className="text-center mb-8">
        <span className="inline-block text-[11px] font-mono text-zinc-400 px-2.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 mb-2">
          Quiz Complete • {difficulty || 'Standard'}
        </span>
        <h1 className="text-2xl sm:text-3xl font-semibold text-zinc-100 tracking-tight">
          Final Results
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 mt-1">
          {topic}
        </p>
      </div>

      {/* Minimalist Architectural Podium (2 - 1 - 3) */}
      <div className="flex items-end justify-center gap-3 sm:gap-4 mb-10 pt-4">
        
        {/* 2nd Place */}
        {second ? (
          <div className="flex flex-col items-center w-24 sm:w-28">
            <div className="text-xl mb-1">{second.avatarSeed || '⚡'}</div>
            <span className="text-xs font-medium text-zinc-300 truncate max-w-full text-center">
              {second.username}
            </span>
            <span className="text-[11px] font-mono text-zinc-400">
              {second.score} pts
            </span>
            <div className="w-full h-20 sm:h-24 mt-2 rounded-t-lg bg-zinc-900 border-t border-x border-zinc-800 flex items-center justify-center font-mono text-xs text-zinc-400">
              2nd
            </div>
          </div>
        ) : <div className="w-24 sm:w-28" />}

        {/* 1st Place */}
        {first && (
          <div className="flex flex-col items-center w-28 sm:w-32">
            <div className="text-2xl mb-1">{first.avatarSeed || '⚡'}</div>
            <span className="text-xs sm:text-sm font-semibold text-zinc-100 truncate max-w-full text-center">
              {first.username}
            </span>
            <span className="text-xs font-mono font-medium text-zinc-300">
              {first.score} pts
            </span>
            <div className="w-full h-28 sm:h-32 mt-2 rounded-t-lg bg-zinc-850 border-t border-x border-zinc-700 flex items-center justify-center font-mono text-sm text-zinc-200">
              1st
            </div>
          </div>
        )}

        {/* 3rd Place */}
        {third ? (
          <div className="flex flex-col items-center w-24 sm:w-28">
            <div className="text-xl mb-1">{third.avatarSeed || '⚡'}</div>
            <span className="text-xs font-medium text-zinc-300 truncate max-w-full text-center">
              {third.username}
            </span>
            <span className="text-[11px] font-mono text-zinc-400">
              {third.score} pts
            </span>
            <div className="w-full h-16 sm:h-18 mt-2 rounded-t-lg bg-zinc-900 border-t border-x border-zinc-800 flex items-center justify-center font-mono text-xs text-zinc-500">
              3rd
            </div>
          </div>
        ) : <div className="w-24 sm:w-28" />}

      </div>

      {/* Ranked Standings List */}
      <div className="minimal-panel rounded-2xl p-5 sm:p-6 mb-6">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-zinc-800">
          <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-400">
            Ranked Leaderboard
          </h3>
          <span className="text-[11px] text-zinc-500">Click Review to inspect questions</span>
        </div>

        <div className="space-y-1.5">
          {leaderboard.map((player, idx) => {
            const isMe = player.socketId === currentSocketId;
            return (
              <div
                key={player.socketId}
                className={`p-3 rounded-xl flex items-center justify-between border transition ${
                  isMe 
                    ? 'bg-zinc-850/80 border-zinc-700 text-zinc-100' 
                    : 'bg-zinc-900/60 border-zinc-800/80 hover:border-zinc-700 text-zinc-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-zinc-500 w-4">
                    #{idx + 1}
                  </span>
                  <span className="text-lg">{player.avatarSeed || '⚡'}</span>
                  <div>
                    <div className="font-medium text-xs sm:text-sm text-zinc-100 flex items-center gap-1.5">
                      {player.username}
                      {isMe && <span className="text-[10px] text-zinc-400 font-mono">(You)</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 sm:gap-4">
                  <span className="font-mono text-xs sm:text-sm text-zinc-300">
                    {player.score || 0} pts
                  </span>
                  <button
                    onClick={() => {
                      sounds.playPop();
                      setReviewModalPlayer(player.socketId);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700 text-xs flex items-center gap-1 transition cursor-pointer"
                  >
                    <BookOpen className="w-3 h-3 text-zinc-400" />
                    Review
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        {isHost ? (
          <button
            onClick={() => {
              sounds.playPop();
              onPlayAgain();
            }}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-medium text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Play Again
          </button>
        ) : (
          <div className="text-xs text-zinc-500">
            Waiting for host to restart game...
          </div>
        )}

        <button
          onClick={() => {
            sounds.playPop();
            onLeaveGame();
          }}
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs sm:text-sm font-medium border border-zinc-800 flex items-center justify-center gap-2 transition cursor-pointer"
        >
          <Home className="w-3.5 h-3.5" />
          Main Menu
        </button>
      </div>

      {/* Dedicated Review Modal (Minimalist) */}
      {reviewModalPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/85 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-xl max-h-[82vh] flex flex-col minimal-panel rounded-2xl p-5 relative overflow-hidden">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xl">{targetPlayerInfo?.avatarSeed || '⚡'}</span>
                <div>
                  <h3 className="text-sm font-semibold text-zinc-100">
                    {targetPlayerInfo?.username} — Review
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    Total: {targetPlayerInfo?.score || 0} pts
                  </p>
                </div>
              </div>

              <button
                onClick={() => setReviewModalPlayer(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Questions List */}
            <div className="overflow-y-auto py-3 space-y-3 pr-1 flex-1">
              {targetPlayerAnswers.length === 0 ? (
                <div className="text-center text-xs text-zinc-500 py-6">
                  No questions found for this session.
                </div>
              ) : (
                targetPlayerAnswers.map((item, idx) => {
                  const isCorrect = item.userAnswer === item.correctIndex;
                  return (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/60"
                    >
                      <div className="flex items-center justify-between text-xs text-zinc-400 mb-1.5">
                        <span className="font-mono text-[11px]">
                          Q{idx + 1}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] text-zinc-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {item.timeSpent}s
                          </span>
                          <span className="font-mono text-[11px] text-zinc-300">
                            +{item.pointsEarned} pts
                          </span>
                        </div>
                      </div>

                      <h4 className="text-xs sm:text-sm font-medium text-zinc-200 mb-2.5">
                        {item.question}
                      </h4>

                      {/* Options */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mb-2">
                        {item.options.map((opt, optIdx) => {
                          const isUserChoice = item.userAnswer === optIdx;
                          const isTheCorrectOpt = item.correctIndex === optIdx;

                          let optClass = "bg-zinc-950/70 border-zinc-850 text-zinc-500";
                          if (isTheCorrectOpt) {
                            optClass = "bg-zinc-800/90 border-zinc-600 text-zinc-200 font-medium";
                          } else if (isUserChoice && !isCorrect) {
                            optClass = "bg-zinc-900 border-zinc-700 text-zinc-400";
                          }

                          return (
                            <div
                              key={optIdx}
                              className={`p-2 rounded-lg border text-xs flex items-center justify-between ${optClass}`}
                            >
                              <span className="truncate">{opt}</span>
                              {isTheCorrectOpt && <Check className="w-3.5 h-3.5 text-zinc-300 shrink-0 ml-1" />}
                            </div>
                          );
                        })}
                      </div>

                      {/* Explanation */}
                      {item.explanation && (
                        <div className="p-2.5 rounded-lg bg-zinc-950/80 border border-zinc-850 text-[11px] text-zinc-400 leading-relaxed">
                          <strong className="text-zinc-300">Explanation:</strong> {item.explanation}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-zinc-800 flex justify-end shrink-0">
              <button
                onClick={() => setReviewModalPlayer(null)}
                className="px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
