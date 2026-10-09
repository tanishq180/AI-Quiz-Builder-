import React, { useEffect, useState, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { 
  RotateCcw, Home, X, Check, BookOpen, Clock, Target, Zap, Award, 
  Crown, Trophy, Sparkles, Download, FileText, BookmarkPlus, CheckCircle2, 
  TrendingUp, AlertTriangle, ChevronRight
} from 'lucide-react';
import { sounds } from '../utils/soundEffects';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

export default function FinalLeaderboard({
  gameOverData,
  currentSocketId,
  isHost,
  onPlayAgain,
  onLeaveGame
}) {
  const { topic, difficulty, leaderboard, podium, playerBreakdowns, questions } = gameOverData;
  const [reviewModalPlayer, setReviewModalPlayer] = useState(null);
  const [isSavedToLibrary, setIsSavedToLibrary] = useState(false);
  const [savingLibrary, setSavingLibrary] = useState(false);

  // Modern celebration confetti
  useEffect(() => {
    sounds.playVictory();

    const end = Date.now() + 2 * 1000;
    const colors = ['#6366f1', '#a855f7', '#38bdf8', '#ffffff', '#fbbf24'];

    (function frame() {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: colors
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
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

  // Personal metrics calculations for the current local player
  const myPlayerAnswers = playerBreakdowns?.[currentSocketId] || [];
  const myPlayerInfo = leaderboard?.find(p => p.socketId === currentSocketId);
  const myRank = leaderboard && currentSocketId 
    ? leaderboard.findIndex(p => p.socketId === currentSocketId) + 1 
    : 0;

  const totalQuestions = myPlayerAnswers.length || 0;
  const correctCount = myPlayerAnswers.filter(a => a.userAnswer === a.correctIndex).length;
  const accuracyPct = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  const timesSpent = myPlayerAnswers.map(a => Number(a.timeSpent) || 0).filter(t => t > 0);
  const avgSpeed = timesSpent.length > 0 
    ? (timesSpent.reduce((a, b) => a + b, 0) / timesSpent.length).toFixed(1) 
    : '0.0';
  const fastestSpeed = timesSpent.length > 0 
    ? Math.min(...timesSpent).toFixed(1) 
    : '0.0';

  // Section 5.3: Weak Area Diagnostic & Topic Analytics
  const topicDiagnostics = useMemo(() => {
    if (!myPlayerAnswers || myPlayerAnswers.length === 0) return [];

    // Group answers by topic or subfocus or question subject
    const clusters = {};
    myPlayerAnswers.forEach((ans, idx) => {
      // Use subFocus if available, or categorize by first 3 words / topic
      const clusterKey = ans.subFocus || topic || 'General Concepts';
      if (!clusters[clusterKey]) {
        clusters[clusterKey] = {
          name: clusterKey,
          total: 0,
          correct: 0,
          questions: []
        };
      }
      clusters[clusterKey].total += 1;
      if (ans.userAnswer === ans.correctIndex) {
        clusters[clusterKey].correct += 1;
      }
      clusters[clusterKey].questions.push(ans);
    });

    return Object.values(clusters).map(c => {
      const acc = Math.round((c.correct / c.total) * 100);
      let status = 'mastered';
      let statusText = 'Mastered';
      let recommendation = 'High proficiency demonstrated. Ready for advanced modules.';

      if (acc < 50) {
        status = 'critical';
        statusText = 'Needs Review';
        recommendation = 'Focus revision on foundational principles and definitions here.';
      } else if (acc < 80) {
        status = 'moderate';
        statusText = 'Reinforce';
        recommendation = 'Solid intuition; practice time management and edge-case questions.';
      }

      return {
        ...c,
        accuracy: acc,
        status,
        statusText,
        recommendation
      };
    });
  }, [myPlayerAnswers, topic]);

  // Handle Save Quiz to Library
  const handleSaveToLibrary = async () => {
    sounds.playPop();
    const quizQuestions = questions || myPlayerAnswers.map(a => ({
      question: a.question,
      options: a.options,
      correctIndex: a.correctIndex,
      explanation: a.explanation
    }));

    if (!quizQuestions || quizQuestions.length === 0) return;

    setSavingLibrary(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/library`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: topic || 'Custom AI Generated Quiz',
          topic: topic || 'General',
          difficulty: difficulty || 'Medium',
          questions: quizQuestions,
          tags: [topic?.toLowerCase().replace(/\s+/g, '-'), difficulty?.toLowerCase()].filter(Boolean)
        })
      });
      const data = await res.json();
      if (data.success) {
        setIsSavedToLibrary(true);
      }
    } catch (err) {
      console.error('Failed to save quiz to library:', err);
    } finally {
      setSavingLibrary(false);
    }
  };

  // Export Anki CSV
  const handleExportAnki = () => {
    sounds.playPop();
    const quizQuestions = questions || myPlayerAnswers;
    if (!quizQuestions || quizQuestions.length === 0) return;

    let csvContent = "data:text/csv;charset=utf-8,Front,Back\n";
    quizQuestions.forEach((q) => {
      const front = `"${q.question.replace(/"/g, '""')}"`;
      const correctOption = q.options[q.correctIndex] || '';
      const back = `"${correctOption.replace(/"/g, '""')} - ${q.explanation ? q.explanation.replace(/"/g, '""') : ''}"`;
      csvContent += `${front},${back}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${(topic || 'quiz').replace(/[^a-z0-9]/gi, '_')}_anki_flashcards.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Printable Worksheet
  const handleExportWorksheet = () => {
    sounds.playPop();
    const quizQuestions = questions || myPlayerAnswers;
    if (!quizQuestions || quizQuestions.length === 0) return;

    const printWindow = window.open('', '_blank');
    const questionsHtml = quizQuestions.map((q, idx) => `
      <div style="margin-bottom: 24px; page-break-inside: avoid;">
        <p style="font-weight: 600; font-size: 14px; margin-bottom: 8px;">
          ${idx + 1}. ${q.question}
        </p>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-left: 16px;">
          ${q.options.map((opt, oIdx) => `
            <div>
              <span style="font-weight: 500;">[ ${String.fromCharCode(65 + oIdx)} ]</span> ${opt}
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');

    const answerKeyHtml = quizQuestions.map((q, idx) => `
      <div style="margin-bottom: 12px;">
        <strong>Q${idx + 1}:</strong> [ ${String.fromCharCode(65 + q.correctIndex)} ] ${q.options[q.correctIndex]}
        <div style="font-size: 12px; color: #555; margin-left: 16px;">${q.explanation || ''}</div>
      </div>
    `).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${topic || 'Quiz'} - Study Worksheet</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: #111; }
            h1 { font-size: 24px; margin-bottom: 4px; }
            .meta { color: #666; font-size: 13px; margin-bottom: 30px; }
            .section-title { font-size: 18px; margin-top: 40px; border-bottom: 2px solid #ddd; padding-bottom: 6px; margin-bottom: 20px; }
            .page-break { page-break-before: always; }
          </style>
        </head>
        <body>
          <h1>${topic || 'Quiz'} Worksheet</h1>
          <div class="meta">Difficulty: ${difficulty || 'Standard'} • Total Questions: ${quizQuestions.length} • Generated by AI Quiz Builder</div>
          ${questionsHtml}
          <div class="page-break"></div>
          <h2 class="section-title">Answer Key & Explanations</h2>
          ${answerKeyHtml}
          <script>window.onload = function() { window.print(); };</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const targetPlayerAnswers = reviewModalPlayer ? playerBreakdowns?.[reviewModalPlayer] || [] : [];
  const targetPlayerInfo = reviewModalPlayer ? leaderboard?.find(p => p.socketId === reviewModalPlayer) : null;
  const targetTotalQ = targetPlayerAnswers.length || 0;
  const targetCorrect = targetPlayerAnswers.filter(a => a.userAnswer === a.correctIndex).length;
  const targetAcc = targetTotalQ > 0 ? Math.round((targetCorrect / targetTotalQ) * 100) : 0;
  const targetTimes = targetPlayerAnswers.map(a => Number(a.timeSpent) || 0).filter(t => t > 0);
  const targetAvgSpeed = targetTimes.length > 0 
    ? (targetTimes.reduce((a, b) => a + b, 0) / targetTimes.length).toFixed(1) 
    : '0.0';

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6 sm:py-10 animate-fade-in relative">
      
      {/* Title Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono uppercase tracking-wider text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 mb-3">
          <Trophy className="w-3.5 h-3.5 text-amber-400" />
          <span>Match Concluded • {difficulty || 'Standard'}</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight bg-gradient-to-b from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent">
          Final Standings
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-md mx-auto truncate">
          {topic}
        </p>
      </div>

      {/* Sleek Modern Podium (2 - 1 - 3) */}
      <div className="flex items-end justify-center gap-3 sm:gap-5 mb-8 pt-6">
        
        {/* 2nd Place */}
        {second ? (
          <div className="flex flex-col items-center w-24 sm:w-32">
            <span className="text-2xl sm:text-3xl mb-1">{second.avatarSeed || '🥈'}</span>
            <span className="text-xs font-semibold text-white truncate max-w-full text-center">
              {second.username}
            </span>
            <span className="text-[11px] font-mono text-zinc-400 mb-2">{second.score} pts</span>
            <div className="w-full h-24 sm:h-28 rounded-t-xl bg-gradient-to-t from-zinc-800 to-zinc-700/60 border-t border-x border-zinc-600/40 flex items-center justify-center font-mono font-bold text-lg text-zinc-300 shadow-lg">
              2
            </div>
          </div>
        ) : (
          <div className="w-24 sm:w-32" />
        )}

        {/* 1st Place */}
        {first && (
          <div className="flex flex-col items-center w-28 sm:w-36 -mt-4">
            <Crown className="w-6 h-6 text-amber-400 mb-1 animate-bounce" />
            <span className="text-3xl sm:text-4xl mb-1">{first.avatarSeed || '👑'}</span>
            <span className="text-xs sm:text-sm font-bold text-white truncate max-w-full text-center">
              {first.username}
            </span>
            <span className="text-xs font-mono font-bold text-amber-300 mb-2">{first.score} pts</span>
            <div className="w-full h-32 sm:h-36 rounded-t-xl bg-gradient-to-t from-amber-900/60 via-amber-800/40 to-amber-700/60 border-t border-x border-amber-500/40 flex items-center justify-center font-mono font-bold text-2xl text-amber-300 shadow-xl shadow-amber-500/10">
              1
            </div>
          </div>
        )}

        {/* 3rd Place */}
        {third ? (
          <div className="flex flex-col items-center w-24 sm:w-32">
            <span className="text-2xl sm:text-3xl mb-1">{third.avatarSeed || '🥉'}</span>
            <span className="text-xs font-semibold text-white truncate max-w-full text-center">
              {third.username}
            </span>
            <span className="text-[11px] font-mono text-zinc-400 mb-2">{third.score} pts</span>
            <div className="w-full h-18 sm:h-22 rounded-t-xl bg-gradient-to-t from-amber-950/40 to-amber-900/30 border-t border-x border-amber-800/40 flex items-center justify-center font-mono font-bold text-lg text-amber-600 shadow-md">
              3
            </div>
          </div>
        ) : (
          <div className="w-24 sm:w-32" />
        )}

      </div>

      {/* Personal Performance Dashboard Studio Panel */}
      <div className="studio-panel rounded-2xl p-6 mb-7 relative overflow-hidden">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-sm font-bold text-white">
              {myPlayerInfo?.avatarSeed || '⚡'}
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">
                Personal Telemetry Brief
              </h2>
              <span className="text-[11px] text-zinc-400 font-mono">
                Operative: {myPlayerInfo?.username || 'You'} • Placed #{myRank} of {leaderboard.length}
              </span>
            </div>
          </div>

          <div className="text-right font-mono">
            <div className="text-lg font-bold text-indigo-300">
              {myPlayerInfo?.score || 0}
            </div>
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Final Score</span>
          </div>
        </div>

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          
          {/* Rank */}
          <div className="p-3.5 rounded-xl studio-card">
            <div className="flex items-center gap-1.5 text-zinc-400 text-[11px] mb-1">
              <Award className="w-3.5 h-3.5 text-indigo-400" />
              <span>Placement</span>
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-white">
              #{myRank}
            </div>
            <span className="text-[10px] text-zinc-500 font-mono">of {leaderboard.length} participants</span>
          </div>

          {/* Accuracy */}
          <div className="p-3.5 rounded-xl studio-card">
            <div className="flex items-center gap-1.5 text-zinc-400 text-[11px] mb-1">
              <Target className="w-3.5 h-3.5 text-emerald-400" />
              <span>Accuracy</span>
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-400">
              {accuracyPct}%
            </div>
            <span className="text-[10px] text-zinc-500 font-mono">{correctCount}/{totalQuestions} correct</span>
          </div>

          {/* Speed Metrics */}
          <div className="p-3.5 rounded-xl studio-card">
            <div className="flex items-center gap-1.5 text-zinc-400 text-[11px] mb-1">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>Avg Speed</span>
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-white">
              {avgSpeed}s
            </div>
            <span className="text-[10px] text-zinc-500 font-mono">Fastest: {fastestSpeed}s</span>
          </div>

          {/* Streak & Review Shortcut */}
          <div className="p-3.5 rounded-xl studio-card flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-zinc-400 text-[11px] mb-1">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Top Streak</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-amber-300">
                {myPlayerInfo?.streak || 0}x
              </div>
            </div>
            <button
              onClick={() => {
                sounds.playPop();
                setReviewModalPlayer(currentSocketId);
              }}
              className="mt-1 text-[11px] text-indigo-300 hover:text-white flex items-center gap-1 font-medium transition cursor-pointer"
            >
              <span>Inspect Answers →</span>
            </button>
          </div>
        </div>
      </div>

      {/* Section 5.3: Weak Area Diagnostic & Topic Analytics */}
      {topicDiagnostics.length > 0 && (
        <div className="studio-panel rounded-2xl p-6 mb-7">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/[0.08]">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-400" />
              <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-300 font-semibold">
                Weak Area Diagnostic & Targeted Revision
              </h3>
            </div>
            <span className="text-[11px] text-zinc-400 font-mono">
              AI Diagnostic Matrix
            </span>
          </div>

          <div className="space-y-3">
            {topicDiagnostics.map((diag, idx) => {
              const isMastered = diag.status === 'mastered';
              const isCritical = diag.status === 'critical';

              return (
                <div
                  key={idx}
                  className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                    isCritical
                      ? 'bg-rose-500/[0.06] border-rose-500/25'
                      : isMastered
                        ? 'bg-emerald-500/[0.04] border-emerald-500/20'
                        : 'bg-amber-500/[0.04] border-amber-500/20'
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-white">
                        {diag.name}
                      </span>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                        isCritical
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          : isMastered
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      }`}>
                        {diag.statusText} • {diag.accuracy}%
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      {diag.recommendation}
                    </p>
                  </div>

                  <div className="shrink-0 text-right font-mono text-xs">
                    <span className="text-zinc-300 font-bold">{diag.correct} / {diag.total}</span>
                    <span className="text-zinc-500 text-[10px] block">Questions Correct</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Educational Export & Question Bank Actions Bar (Sections 5.1 & 5.2) */}
      <div className="studio-card rounded-2xl p-4 sm:p-5 mb-7 flex flex-col sm:flex-row items-center justify-between gap-4 border border-indigo-500/20 bg-indigo-500/[0.03]">
        <div>
          <div className="text-xs font-semibold text-white flex items-center gap-2 mb-1">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Educational Tooling & Question Bank</span>
          </div>
          <p className="text-[11px] text-zinc-400">
            Export questions for flashcard revision or store directly into your permanent Question Bank.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          <button
            onClick={handleExportAnki}
            className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] text-zinc-300 border border-white/[0.08] text-xs font-medium flex items-center justify-center gap-1.5 transition cursor-pointer"
            title="Download Anki Flashcards CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Anki CSV</span>
          </button>

          <button
            onClick={handleExportWorksheet}
            className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] text-zinc-300 border border-white/[0.08] text-xs font-medium flex items-center justify-center gap-1.5 transition cursor-pointer"
            title="Printable Study Sheet & Answer Key"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Worksheet</span>
          </button>

          <button
            onClick={handleSaveToLibrary}
            disabled={isSavedToLibrary || savingLibrary}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
              isSavedToLibrary
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 cursor-default'
                : 'studio-btn-primary shadow-lg shadow-indigo-500/20'
            }`}
          >
            {isSavedToLibrary ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Saved in Library</span>
              </>
            ) : (
              <>
                <BookmarkPlus className="w-3.5 h-3.5" />
                <span>{savingLibrary ? 'Saving...' : 'Save to Bank'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Ranked Standings List */}
      <div className="studio-panel rounded-2xl p-6 mb-7">
        <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-white/[0.08]">
          <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-300 font-semibold">
            Complete Player Standings
          </h3>
          <span className="text-[11px] text-zinc-500">Click Review to inspect questions</span>
        </div>

        <div className="space-y-2">
          {leaderboard.map((player, idx) => {
            const isMe = player.socketId === currentSocketId;
            return (
              <div
                key={player.socketId}
                className={`p-3.5 rounded-xl flex items-center justify-between border transition ${
                  isMe 
                    ? 'bg-indigo-600/20 border-indigo-500/40 text-white shadow-sm' 
                    : 'bg-white/[0.03] border-white/[0.06] hover:border-white/[0.12] text-zinc-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-bold text-zinc-500 w-5">
                    #{idx + 1}
                  </span>
                  <span className="text-xl">{player.avatarSeed || '⚡'}</span>
                  <div>
                    <div className="text-xs sm:text-sm font-semibold flex items-center gap-2">
                      <span>{player.username}</span>
                      {isMe && (
                        <span className="text-[9px] font-mono bg-indigo-500/30 text-indigo-200 px-1.5 py-0.5 rounded border border-indigo-500/40">
                          YOU
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      {playerBreakdowns?.[player.socketId]?.filter(a => a.userAnswer === a.correctIndex).length || 0} correct answers
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right font-mono font-bold text-sm text-indigo-300">
                    {player.score || 0} pts
                  </div>
                  <button
                    onClick={() => {
                      sounds.playPop();
                      setReviewModalPlayer(player.socketId);
                    }}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition cursor-pointer text-xs flex items-center gap-1 font-mono"
                  >
                    <span>Review</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Match Actions Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/[0.08]">
        {isHost ? (
          <button
            onClick={() => {
              sounds.playPop();
              onPlayAgain();
            }}
            className="w-full sm:w-auto px-7 py-3 rounded-xl studio-btn-primary text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 transition cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            Play Again
          </button>
        ) : (
          <div className="text-xs text-zinc-400">
            Waiting for host to initiate rematch...
          </div>
        )}

        <button
          onClick={() => {
            sounds.playPop();
            onLeaveGame();
          }}
          className="w-full sm:w-auto px-6 py-3 rounded-xl studio-btn-secondary text-xs sm:text-sm font-medium flex items-center justify-center gap-2 transition cursor-pointer"
        >
          <Home className="w-4 h-4" />
          Main Menu
        </button>
      </div>

      {/* Dedicated Review Modal */}
      {reviewModalPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-xl max-h-[82vh] flex flex-col studio-panel rounded-2xl p-6 relative overflow-hidden border border-white/[0.15] shadow-2xl">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{targetPlayerInfo?.avatarSeed || '⚡'}</span>
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    {targetPlayerInfo?.username} — Performance Inspection
                  </h3>
                  <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-400 mt-0.5">
                    <span className="text-indigo-300 font-bold">{targetPlayerInfo?.score || 0} pts</span>
                    <span>•</span>
                    <span>{targetAcc}% Acc ({targetCorrect}/{targetTotalQ})</span>
                    <span>•</span>
                    <span>Avg: {targetAvgSpeed}s</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setReviewModalPlayer(null)}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.08] transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Questions List */}
            <div className="overflow-y-auto py-3.5 space-y-3.5 pr-1 flex-1">
              {targetPlayerAnswers.length === 0 ? (
                <div className="text-center text-xs text-zinc-500 py-8">
                  No recorded question telemetry found for this session.
                </div>
              ) : (
                targetPlayerAnswers.map((item, idx) => {
                  const isCorrect = item.userAnswer === item.correctIndex;
                  return (
                    <div
                      key={idx}
                      className="p-4 rounded-xl border border-white/[0.07] bg-white/[0.02]"
                    >
                      <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
                        <span className="font-mono text-[11px] font-bold text-indigo-400">
                          Question {idx + 1}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] text-zinc-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {item.timeSpent}s
                          </span>
                          <span className={`font-mono text-[11px] font-bold ${isCorrect ? 'text-emerald-400' : 'text-zinc-500'}`}>
                            +{item.pointsEarned} pts
                          </span>
                        </div>
                      </div>

                      <h4 className="text-xs sm:text-sm font-medium text-white mb-3">
                        {item.question}
                      </h4>

                      {/* Options */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2.5">
                        {item.options.map((opt, optIdx) => {
                          const isUserChoice = item.userAnswer === optIdx;
                          const isTheCorrectOpt = item.correctIndex === optIdx;

                          let optClass = "bg-white/[0.02] border-white/[0.05] text-zinc-500";
                          if (isTheCorrectOpt) {
                            optClass = "bg-emerald-500/15 border-emerald-500/40 text-emerald-200 font-medium";
                          } else if (isUserChoice && !isCorrect) {
                            optClass = "bg-rose-500/15 border-rose-500/40 text-rose-200";
                          }

                          return (
                            <div
                              key={optIdx}
                              className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${optClass}`}
                            >
                              <span className="truncate">{opt}</span>
                              {isTheCorrectOpt && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 ml-1" />}
                            </div>
                          );
                        })}
                      </div>

                      {/* Explanation */}
                      {item.explanation && (
                        <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-[11px] text-zinc-300 leading-relaxed">
                          <strong className="text-indigo-300">AI Context:</strong> {item.explanation}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-3.5 border-t border-white/[0.08] flex justify-end shrink-0">
              <button
                onClick={() => setReviewModalPlayer(null)}
                className="px-5 py-2 rounded-xl studio-btn-secondary text-xs font-semibold transition cursor-pointer"
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
