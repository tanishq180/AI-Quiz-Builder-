import React, { useState, useEffect } from 'react';
import { X, Library, Search, Play, BookOpen, Clock, Download, FileText, CheckCircle2, Sparkles, Trash2 } from 'lucide-react';
import { sounds } from '../utils/soundEffects';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

export default function QuizLibraryModal({ isOpen, onClose, onLaunchQuiz }) {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [launchingId, setLaunchingId] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchLibraryQuizzes();
    }
  }, [isOpen]);

  const fetchLibraryQuizzes = async (query = '') => {
    setLoading(true);
    try {
      const url = query 
        ? `${BACKEND_URL}/api/library?search=${encodeURIComponent(query)}` 
        : `${BACKEND_URL}/api/library`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setQuizzes(data.quizzes || []);
        if (data.quizzes && data.quizzes.length > 0 && !selectedQuiz) {
          setSelectedQuiz(data.quizzes[0]);
        }
      }
    } catch (err) {
      console.warn('Error fetching library quizzes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchLibraryQuizzes(searchQuery);
  };

  const handleLaunch = async (quiz) => {
    sounds.playPop();
    setLaunchingId(quiz._id);
    try {
      const res = await fetch(`${BACKEND_URL}/api/library/${quiz._id}/launch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hostName: 'Library Host',
          timePerQuestion: 15
        })
      });
      const data = await res.json();
      if (data.success) {
        onLaunchQuiz(data);
        onClose();
      }
    } catch (err) {
      console.error('Launch quiz error:', err);
    } finally {
      setLaunchingId(null);
    }
  };

  // Export questions to Anki Flashcard CSV
  const handleExportAnki = (quiz) => {
    sounds.playPop();
    if (!quiz || !Array.isArray(quiz.questions)) return;

    let csvContent = "data:text/csv;charset=utf-8,Front,Back\n";
    quiz.questions.forEach((q) => {
      const front = `"${q.question.replace(/"/g, '""')}"`;
      const correctOption = q.options[q.correctIndex] || '';
      const back = `"${correctOption.replace(/"/g, '""')} - ${q.explanation ? q.explanation.replace(/"/g, '""') : ''}"`;
      csvContent += `${front},${back}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${quiz.title.replace(/[^a-z0-9]/gi, '_')}_anki_flashcards.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Printable Study Worksheet
  const handlePrintStudySheet = (quiz) => {
    sounds.playPop();
    if (!quiz) return;

    const printWindow = window.open('', '_blank');
    const questionsHtml = quiz.questions.map((q, idx) => `
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

    const answerKeyHtml = quiz.questions.map((q, idx) => `
      <div style="margin-bottom: 12px;">
        <strong>Q${idx + 1}:</strong> [ ${String.fromCharCode(65 + q.correctIndex)} ] ${q.options[q.correctIndex]}
        <div style="font-size: 12px; color: #555; margin-left: 16px;">${q.explanation || ''}</div>
      </div>
    `).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${quiz.title} — Study Worksheet</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.5; padding: 40px; color: #111; }
            h1 { font-size: 24px; border-bottom: 2px solid #333; padding-bottom: 8px; margin-bottom: 4px; }
            .meta { color: #666; font-size: 13px; margin-bottom: 30px; }
            .answer-key { margin-top: 50px; border-top: 2px dashed #999; padding-top: 24px; page-break-before: always; }
          </style>
        </head>
        <body>
          <h1>${quiz.title}</h1>
          <div class="meta">Topic: ${quiz.topic} • Difficulty: ${quiz.difficulty} • Total Questions: ${quiz.questions.length}</div>
          <h2>Practice Questions</h2>
          ${questionsHtml}
          <div class="answer-key">
            <h2>Answer Key & AI Explanations</h2>
            ${answerKeyHtml}
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-4xl max-h-[85vh] flex flex-col studio-panel rounded-2xl p-6 relative overflow-hidden border border-white/[0.12] shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Library className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>Quiz Library & Question Bank</span>
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                  {quizzes.length} Saved
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Browse pre-built quizzes, launch rooms instantly, or export to Anki flashcards & printouts.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.08] transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="pt-4 pb-2 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search quizzes by title or topic..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0e1019]/90 border border-white/[0.09] text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition shadow-inner"
            />
          </div>
        </form>

        {/* Main Content Split: Left List, Right Inspector */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 overflow-hidden flex-1 py-2">
          
          {/* Quiz Cards List (2 cols) */}
          <div className="md:col-span-2 overflow-y-auto space-y-2.5 pr-1">
            {loading ? (
              <div className="text-center py-8 text-xs text-zinc-500">Loading library...</div>
            ) : quizzes.length === 0 ? (
              <div className="text-center py-10 text-xs text-zinc-500">
                No saved quizzes found. Create a quiz using PDF Creator or Host Arena to save it here!
              </div>
            ) : (
              quizzes.map((quiz) => {
                const isSelected = selectedQuiz?._id === quiz._id;
                return (
                  <div
                    key={quiz._id}
                    onClick={() => { sounds.playPop(); setSelectedQuiz(quiz); }}
                    className={`p-3.5 rounded-xl border text-left transition cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600/20 border-indigo-500/50 text-white shadow-lg shadow-indigo-500/10'
                        : 'studio-card hover:border-white/[0.15] text-zinc-300'
                    }`}
                  >
                    <div className="font-semibold text-xs text-white truncate mb-1">
                      {quiz.title}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-zinc-400 font-mono">
                      <span>{quiz.questionCount || quiz.questions?.length || 0} Qs</span>
                      <span>•</span>
                      <span>{quiz.difficulty || 'Medium'}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Quiz Details Inspector (3 cols) */}
          <div className="md:col-span-3 studio-panel rounded-xl p-4 flex flex-col justify-between overflow-hidden">
            {selectedQuiz ? (
              <>
                <div className="overflow-y-auto pr-1 space-y-3 flex-1">
                  <div>
                    <h3 className="text-base font-bold text-white mb-1">
                      {selectedQuiz.title}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-zinc-400 flex-wrap">
                      <span className="px-2 py-0.5 rounded bg-white/[0.05] border border-white/[0.08] text-[11px] font-mono">
                        {selectedQuiz.topic}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-white/[0.05] border border-white/[0.08] text-[11px] font-mono">
                        {selectedQuiz.difficulty}
                      </span>
                      <span className="text-[11px]">
                        {selectedQuiz.questions?.length} Questions
                      </span>
                    </div>
                  </div>

                  {/* Question Preview List */}
                  <div className="space-y-2 pt-2">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 block">
                      Questions Preview
                    </span>
                    {selectedQuiz.questions?.slice(0, 5).map((q, qIdx) => (
                      <div key={qIdx} className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06] text-xs">
                        <div className="font-medium text-white mb-1">
                          {qIdx + 1}. {q.question}
                        </div>
                        <div className="text-[11px] text-emerald-400 font-mono">
                          ✓ {q.options?.[q.correctIndex]}
                        </div>
                      </div>
                    ))}
                    {selectedQuiz.questions?.length > 5 && (
                      <div className="text-center text-[11px] text-zinc-500 font-mono">
                        + {selectedQuiz.questions.length - 5} more questions
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Action Controls */}
                <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between gap-2 shrink-0">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleExportAnki(selectedQuiz)}
                      title="Download Anki Flashcard CSV"
                      className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs text-zinc-300 hover:text-white flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Anki (.csv)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handlePrintStudySheet(selectedQuiz)}
                      title="Print Study Worksheet & Answer Key"
                      className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs text-zinc-300 hover:text-white flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Print Sheet</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleLaunch(selectedQuiz)}
                    disabled={launchingId === selectedQuiz._id}
                    className="px-4 py-1.5 rounded-xl studio-btn-primary text-xs font-semibold flex items-center gap-1.5 transition shadow-lg cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{launchingId === selectedQuiz._id ? 'Launching...' : 'Launch Room'}</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-xs text-zinc-500 m-auto">
                Select a quiz from the list to preview and launch.
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
