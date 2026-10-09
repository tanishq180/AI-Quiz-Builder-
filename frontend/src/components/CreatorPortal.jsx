import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  FileText, 
  Layers, 
  Plus, 
  Trash2, 
  AlertCircle, 
  Loader2, 
  Sparkles, 
  ChevronDown, 
  ChevronUp, 
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Check,
  BookOpen,
  RefreshCw,
  X
} from 'lucide-react';
import { sounds } from '../utils/soundEffects';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

const AVATARS = ['⚡', '🧠', '🚀', '👾', '🐱', '🦊', '🐉', '🎮', '🎯', '🔮'];
const DIFFICULTIES = [
  { level: 'Easy', desc: 'Core facts & fundamentals' },
  { level: 'Medium', desc: 'Comprehensive conceptual depth' },
  { level: 'Hard', desc: 'Analytical nuance & edge cases' }
];

export default function CreatorPortal({ onQuizCreated, customApiKey, currentSocketId, onCancel }) {
  // Step state: 'UPLOAD' | 'ANALYZING' | 'CONFIG' | 'GENERATING' | 'REVIEW'
  const [step, setStep] = useState('UPLOAD');
  
  // File state
  const [file, setFile] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  // Analysis Result
  const [extractedData, setExtractedData] = useState(null); // { text, pageCount, filename, suggestedTopics, previewSnippet }
  const [showPreview, setShowPreview] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Configuration Form State
  const [hostName, setHostName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('⚡');
  const [totalQuestions, setTotalQuestions] = useState(5);
  const [difficulty, setDifficulty] = useState('Medium');
  const [timePerQuestion, setTimePerQuestion] = useState(15);

  // Topic-wise Split: Array of { id, topic, questionCount }
  const [topicDistribution, setTopicDistribution] = useState([]);

  // Generated Questions Review State (Pre-Game Question Review & Edit)
  const [generatedQuestions, setGeneratedQuestions] = useState([]);
  const [pendingRoomInfo, setPendingRoomInfo] = useState(null);

  // Calculate total allocated questions
  const totalAllocated = topicDistribution.reduce((sum, item) => sum + (Number(item.questionCount) || 0), 0);
  const isAllocationBalanced = totalAllocated === Number(totalQuestions);

  // Drag and Drop Handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelection(e.target.files[0]);
    }
  };

  const handleFileSelection = (selectedFile) => {
    setErrorMsg('');
    if (!selectedFile.name.toLowerCase().endsWith('.pdf') && selectedFile.type !== 'application/pdf') {
      setErrorMsg('Please select a valid PDF file (.pdf).');
      return;
    }

    if (selectedFile.size > 25 * 1024 * 1024) {
      setErrorMsg('File size exceeds the 25MB limit. Please upload a smaller chapter or document.');
      return;
    }

    setFile(selectedFile);
    sounds.playPop();
    // Proceed directly to analyzing document
    uploadAndAnalyzeDocument(selectedFile);
  };

  const uploadAndAnalyzeDocument = async (pdfFile) => {
    setStep('ANALYZING');
    setErrorMsg('');

    const formData = new FormData();
    formData.append('pdf', pdfFile);

    try {
      const response = await fetch(`${BACKEND_URL}/api/parse-pdf`, {
        method: 'POST',
        body: formData
      });

      const rawText = await response.text();
      let data;
      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch {
        throw new Error(`Server returned unexpected response (status ${response.status}). Ensure backend is running.`);
      }

      if (!response.ok || !data.success) {
        throw new Error(data.message || `Failed to parse PDF document (status ${response.status}).`);
      }

      setExtractedData(data);

      // Initialize default topic distribution based on extracted topics
      const suggested = Array.isArray(data.suggestedTopics) && data.suggestedTopics.length > 0
        ? data.suggestedTopics
        : ['Core Principles', 'Practical Applications'];

      // Distribute initial 5 questions evenly across topics
      const initialTotal = 5;
      setTotalQuestions(initialTotal);

      const countPerTopic = Math.floor(initialTotal / suggested.length);
      let remainder = initialTotal % suggested.length;

      const initialDistribution = suggested.map((topicName, idx) => {
        const allocated = countPerTopic + (remainder > 0 ? 1 : 0);
        if (remainder > 0) remainder -= 1;
        return {
          id: `topic-${idx}-${Date.now()}`,
          topic: topicName,
          questionCount: Math.max(1, allocated)
        };
      });

      setTopicDistribution(initialDistribution);
      setStep('CONFIG');
      sounds.playPop();
    } catch (err) {
      console.error('PDF Parse Error:', err);
      setErrorMsg(err.message || 'Error parsing document. Please try a different PDF.');
      setStep('UPLOAD');
    }
  };

  // Dynamic Topic List Handlers
  const handleAddTopic = () => {
    sounds.playPop();
    const newId = `topic-${Date.now()}`;
    setTopicDistribution(prev => [
      ...prev,
      { id: newId, topic: '', questionCount: 1 }
    ]);
  };

  const handleRemoveTopic = (id) => {
    if (topicDistribution.length <= 1) return;
    sounds.playPop();
    setTopicDistribution(prev => prev.filter(t => t.id !== id));
  };

  const handleTopicNameChange = (id, newName) => {
    setTopicDistribution(prev =>
      prev.map(t => t.id === id ? { ...t, topic: newName } : t)
    );
  };

  const handleTopicCountChange = (id, newCount) => {
    const parsed = Math.max(1, Math.min(15, Number(newCount) || 1));
    setTopicDistribution(prev =>
      prev.map(t => t.id === id ? { ...t, questionCount: parsed } : t)
    );
  };

  // Auto-distribute helper
  const handleAutoDistribute = () => {
    sounds.playPop();
    const count = Number(totalQuestions) || 5;
    const numTopics = topicDistribution.length;
    if (numTopics === 0) return;

    const base = Math.floor(count / numTopics);
    let rem = count % numTopics;

    setTopicDistribution(prev =>
      prev.map(item => {
        const extra = rem > 0 ? 1 : 0;
        if (rem > 0) rem -= 1;
        return {
          ...item,
          questionCount: Math.max(1, base + extra)
        };
      })
    );
  };

  // Submit and Generate Quiz
  const handleGenerateQuiz = async (e) => {
    e.preventDefault();
    if (!hostName.trim()) {
      setErrorMsg('Please enter a Host name.');
      return;
    }

    if (!isAllocationBalanced) {
      setErrorMsg(`Topic question allocation must equal the total number of questions (${totalQuestions}). Current: ${totalAllocated}.`);
      return;
    }

    // Verify all topics have names
    const hasEmptyTopic = topicDistribution.some(t => !t.topic.trim());
    if (hasEmptyTopic) {
      setErrorMsg('Please ensure all topic fields have descriptive names.');
      return;
    }

    setStep('GENERATING');
    setErrorMsg('');
    sounds.playPop();

    try {
      const payload = {
        pdfText: extractedData.extractedText,
        filename: extractedData.filename,
        pageCount: extractedData.pageCount,
        totalQuestions: Number(totalQuestions),
        difficulty,
        topicDistribution: topicDistribution.map(t => ({
          topic: t.topic.trim(),
          questionCount: Number(t.questionCount)
        })),
        hostName: hostName.trim(),
        avatarSeed: selectedAvatar,
        timePerQuestion: Number(timePerQuestion),
        customApiKey: customApiKey || null,
        hostSocketId: currentSocketId || null,
        sourceTitle: extractedData.filename
      };

      const response = await fetch(`${BACKEND_URL}/api/generate-from-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const rawResult = await response.text();
      let result;
      try {
        result = rawResult ? JSON.parse(rawResult) : {};
      } catch {
        throw new Error(`Server returned unexpected response (status ${response.status}). Ensure backend is running.`);
      }

      if (!response.ok || !result.success) {
        throw new Error(result.message || `Failed to synthesize quiz questions from PDF (status ${response.status}).`);
      }

      console.log(`[Creator Portal] Quiz synthesized! Entering Review step for Room: ${result.roomCode}`);
      setGeneratedQuestions(result.questions || []);
      setPendingRoomInfo({
        roomCode: result.roomCode,
        room: result.room,
        hostName: hostName.trim(),
        avatarSeed: selectedAvatar
      });
      setStep('REVIEW');
      sounds.playCountdownEnd();

    } catch (err) {
      console.error('Quiz Generation Error:', err);
      setErrorMsg(err.message || 'Encountered an issue during question generation. Please verify your PDF content.');
      setStep('CONFIG');
    }
  };

  // Question Review & Customization Handlers
  const handleEditQuestionText = (index, newText) => {
    setGeneratedQuestions(prev => prev.map((q, idx) => idx === index ? { ...q, question: newText } : q));
  };

  const handleEditOption = (qIndex, optIndex, newOptText) => {
    setGeneratedQuestions(prev => prev.map((q, idx) => {
      if (idx !== qIndex) return q;
      const updatedOpts = [...q.options];
      updatedOpts[optIndex] = newOptText;
      return { ...q, options: updatedOpts };
    }));
  };

  const handleSetCorrectIndex = (qIndex, optIndex) => {
    sounds.playPop();
    setGeneratedQuestions(prev => prev.map((q, idx) => idx === qIndex ? { ...q, correctIndex: optIndex } : q));
  };

  const handleEditExplanation = (index, newExplanation) => {
    setGeneratedQuestions(prev => prev.map((q, idx) => idx === index ? { ...q, explanation: newExplanation } : q));
  };

  const handleDeleteQuestion = (index) => {
    if (generatedQuestions.length <= 1) return;
    sounds.playPop();
    setGeneratedQuestions(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleAddCustomQuestion = () => {
    sounds.playPop();
    setGeneratedQuestions(prev => [
      ...prev,
      {
        id: `custom-q-${Date.now()}`,
        question: 'New Question Prompt',
        options: ['Choice A', 'Choice B', 'Choice C', 'Choice D'],
        correctIndex: 0,
        explanation: 'Verified factual explanation.',
        subFocus: 'Custom Question'
      }
    ]);
  };

  const handleConfirmDeployLobby = () => {
    sounds.playCountdownEnd();
    if (onQuizCreated && pendingRoomInfo) {
      onQuizCreated({
        ...pendingRoomInfo,
        questions: generatedQuestions
      });
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-4 sm:py-8 animate-fade-in">
      
      {/* Portal Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <BookOpen className="w-4 h-4" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Creator Studio
            </h1>
            <span className="text-[10px] font-mono tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
              PDF Engine
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Synthesize highly structured quizzes directly from textbook chapters and study guides.
          </p>
        </div>

        {onCancel && (
          <button
            onClick={() => { sounds.playPop(); onCancel(); }}
            className="text-xs text-zinc-300 hover:text-white px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] transition cursor-pointer"
          >
            Back to Quick Arena
          </button>
        )}
      </div>

      {/* Global Error Banner */}
      {errorMsg && (
        <div className="mb-6 p-4 rounded-xl bg-rose-950/80 border border-rose-500/40 flex items-start gap-3 text-xs text-rose-200 shadow-xl animate-fade-in">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">{errorMsg}</div>
          <button 
            onClick={() => setErrorMsg('')} 
            className="text-rose-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* STEP 1: PDF UPLOAD ZONE */}
      {step === 'UPLOAD' && (
        <div className="space-y-6">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 sm:p-12 text-center transition-all ${
              isDragOver
                ? 'border-indigo-400 bg-indigo-500/10 shadow-xl shadow-indigo-500/10'
                : 'border-white/[0.1] bg-white/[0.02] hover:border-indigo-500/50 hover:bg-white/[0.04]'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileInputChange}
              accept=".pdf,application/pdf"
              className="hidden"
            />

            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-inner">
              <UploadCloud className="w-7 h-7 text-indigo-300" />
            </div>

            <h3 className="text-sm sm:text-base font-semibold text-white mb-1.5">
              Drag and drop your PDF here, or <span className="text-indigo-400 underline underline-offset-2">browse files</span>
            </h3>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto mb-4 leading-relaxed">
              Upload textbook chapters, lecture slides, papers, or technical manuals (up to 25MB).
            </p>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-[11px] text-zinc-400 font-mono">
              <FileText className="w-3.5 h-3.5 text-indigo-400" />
              <span>Standard text-based PDF documents supported</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl studio-card flex items-start gap-3.5 text-xs text-zinc-400">
            <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-zinc-200">Strict Curriculum Grounding: </span>
              Questions will be constructed exclusively from the verified contents of your document, strictly conforming to your custom topic-wise distribution.
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: DOCUMENT ANALYSIS STATE */}
      {step === 'ANALYZING' && (
        <div className="studio-panel rounded-2xl p-10 text-center animate-fade-in space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Loader2 className="w-7 h-7 animate-spin text-indigo-400" />
          </div>

          <div>
            <h3 className="text-base font-semibold text-white">Analyzing Document...</h3>
            <p className="text-xs text-zinc-400 mt-1 max-w-md mx-auto leading-relaxed">
              Extracting raw text, computing chapter breakdown, and scanning prospective sub-topics for your curriculum.
            </p>
          </div>

          {file && (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-zinc-300 font-mono">
              <FileText className="w-3.5 h-3.5 text-indigo-400" />
              <span className="truncate max-w-[220px]">{file.name}</span>
              <span className="text-zinc-500">({(file.size / (1024 * 1024)).toFixed(2)} MB)</span>
            </div>
          )}
        </div>
      )}

      {/* STEP 3: CONFIGURATION FORM */}
      {step === 'CONFIG' && extractedData && (
        <form onSubmit={handleGenerateQuiz} className="space-y-6 animate-fade-in">
          
          {/* Document Summary Card */}
          <div className="p-4 sm:p-5 rounded-2xl studio-card flex flex-col gap-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-white truncate max-w-[260px] sm:max-w-md">
                    {extractedData.filename}
                  </div>
                  <div className="text-[11px] text-zinc-400 flex items-center gap-2 mt-0.5">
                    <span>{extractedData.pageCount} Pages</span>
                    <span>•</span>
                    <span>{(extractedData.totalCharacters / 1000).toFixed(1)}k characters parsed</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowPreview(!showPreview)}
                  className="text-[11px] text-zinc-300 hover:text-white px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center gap-1.5 transition cursor-pointer"
                >
                  {showPreview ? 'Hide Snippet' : 'View Snippet'}
                  {showPreview ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setExtractedData(null);
                    setStep('UPLOAD');
                  }}
                  title="Upload different PDF"
                  className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.08] transition cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Document Preview Snippet */}
            {showPreview && extractedData.previewSnippet && (
              <div className="p-3.5 rounded-xl bg-[#08090d]/90 border border-white/[0.08] text-[11px] font-mono text-zinc-400 max-h-40 overflow-y-auto leading-relaxed whitespace-pre-wrap">
                {extractedData.previewSnippet}...
              </div>
            )}
          </div>

          {/* Host Setup & Avatar */}
          <div className="p-5 rounded-2xl studio-panel space-y-4">
            <div className="text-xs font-mono uppercase tracking-wider text-zinc-400">
              Host Setup
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-2">
                  Host Name
                </label>
                <input
                  type="text"
                  required
                  maxLength={24}
                  value={hostName}
                  onChange={(e) => setHostName(e.target.value)}
                  placeholder="e.g. Professor Smith"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0e1019]/90 border border-white/[0.09] text-white text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition shadow-inner"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-2">
                  Host Avatar
                </label>
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {AVATARS.map((av) => (
                    <button
                      key={av}
                      type="button"
                      onClick={() => { sounds.playPop(); setSelectedAvatar(av); }}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm transition shrink-0 cursor-pointer ${
                        selectedAvatar === av
                          ? 'bg-indigo-600/30 border-2 border-indigo-400 text-white shadow-md'
                          : 'bg-white/[0.04] border border-white/[0.07] text-zinc-400 hover:text-white'
                      }`}
                    >
                      {av}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Global Parameters: Total Questions, Difficulty, Round Timer */}
          <div className="p-5 rounded-2xl studio-panel space-y-4">
            <div className="text-xs font-mono uppercase tracking-wider text-zinc-400">
              Quiz Parameters
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Total Question Count */}
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-2">
                  Total Questions
                </label>
                <select
                  value={totalQuestions}
                  onChange={(e) => {
                    const newTotal = Number(e.target.value);
                    setTotalQuestions(newTotal);
                  }}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#0e1019]/90 border border-white/[0.09] text-white text-xs focus:outline-none focus:border-indigo-500 transition cursor-pointer"
                >
                  {[3, 4, 5, 6, 8, 10, 12, 15].map((cnt) => (
                    <option key={cnt} value={cnt} className="bg-zinc-900">{cnt} Questions</option>
                  ))}
                </select>
              </div>

              {/* Difficulty Level */}
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-2">
                  Difficulty Level
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#0e1019]/90 border border-white/[0.09] text-white text-xs focus:outline-none focus:border-indigo-500 transition cursor-pointer"
                >
                  {DIFFICULTIES.map((d) => (
                    <option key={d.level} value={d.level} className="bg-zinc-900">{d.level}</option>
                  ))}
                </select>
              </div>

              {/* Round Timer */}
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-2">
                  Time Per Question
                </label>
                <select
                  value={timePerQuestion}
                  onChange={(e) => setTimePerQuestion(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#0e1019]/90 border border-white/[0.09] text-white text-xs focus:outline-none focus:border-indigo-500 transition cursor-pointer"
                >
                  <option value={10} className="bg-zinc-900">10 Seconds (Fast)</option>
                  <option value={15} className="bg-zinc-900">15 Seconds (Standard)</option>
                  <option value={20} className="bg-zinc-900">20 Seconds (Moderate)</option>
                  <option value={30} className="bg-zinc-900">30 Seconds (Relaxed)</option>
                </select>
              </div>
            </div>
          </div>

          {/* DYNAMIC TOPIC-WISE SPLIT */}
          <div className="p-5 rounded-2xl studio-panel space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-mono uppercase tracking-wider text-white font-semibold">
                    Topic-Wise Split (Curriculum Allocation)
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Define exactly how many questions will be generated for each specific chapter or topic.
                </p>
              </div>

              {/* Allocation Tally Badge */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleAutoDistribute}
                  className="text-[11px] px-3 py-1 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300 hover:text-white transition cursor-pointer"
                >
                  Auto-Distribute
                </button>
                <div className={`px-3 py-1 rounded-full text-[11px] font-mono border font-semibold ${
                  isAllocationBalanced
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                    : totalAllocated < totalQuestions
                      ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                      : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                }`}>
                  Allocated: {totalAllocated} / {totalQuestions}
                </div>
              </div>
            </div>

            {/* List of Dynamic Topic Rows */}
            <div className="space-y-2.5 pt-1">
              {topicDistribution.map((item, index) => (
                <div 
                  key={item.id}
                  className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#08090d]/80 border border-white/[0.08] transition-all focus-within:border-indigo-500/50"
                >
                  <span className="text-[11px] font-mono font-bold text-zinc-500 w-5 text-center">
                    {index + 1}.
                  </span>

                  {/* Topic Name */}
                  <input
                    type="text"
                    required
                    placeholder="e.g. Thermodynamics, Fluid Dynamics, Entropy"
                    value={item.topic}
                    onChange={(e) => handleTopicNameChange(item.id, e.target.value)}
                    className="flex-1 bg-transparent px-2 py-1 text-xs text-white placeholder:text-zinc-600 focus:outline-none"
                  />

                  {/* Question Count Selector */}
                  <div className="flex items-center gap-1.5 shrink-0 bg-white/[0.04] px-2.5 py-1 rounded-lg border border-white/[0.08]">
                    <span className="text-[10px] text-zinc-400 font-mono">Qty:</span>
                    <input
                      type="number"
                      min={1}
                      max={15}
                      value={item.questionCount}
                      onChange={(e) => handleTopicCountChange(item.id, e.target.value)}
                      className="w-10 bg-transparent text-center text-xs font-mono font-bold text-indigo-300 focus:outline-none"
                    />
                  </div>

                  {/* Remove Row Button */}
                  <button
                    type="button"
                    disabled={topicDistribution.length <= 1}
                    onClick={() => handleRemoveTopic(item.id)}
                    title={topicDistribution.length <= 1 ? "At least one topic required" : "Remove topic"}
                    className="p-1.5 text-zinc-400 hover:text-rose-400 disabled:opacity-30 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add Topic Row Button */}
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={handleAddTopic}
                className="inline-flex items-center gap-1.5 text-xs text-zinc-300 hover:text-white px-3.5 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Topic Row
              </button>

              {/* Status helper label */}
              {!isAllocationBalanced && (
                <span className="text-[11px] font-mono text-amber-400">
                  {totalAllocated < totalQuestions
                    ? `${totalQuestions - totalAllocated} remaining to allocate`
                    : `Exceeds total questions by ${totalAllocated - totalQuestions}`}
                </span>
              )}
            </div>
          </div>

          {/* Action Button: Generate Quiz & Launch Arena */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={!isAllocationBalanced || !hostName.trim()}
              className="w-full py-3.5 px-4 rounded-xl studio-btn-primary font-semibold text-xs sm:text-sm disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center justify-center gap-2 shadow-xl cursor-pointer"
            >
              <span>Synthesize Curriculum & Launch Arena</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {!isAllocationBalanced && (
              <p className="text-center text-[11px] text-zinc-400 mt-2 font-mono">
                Make sure your topic question count ({totalAllocated}) equals total questions ({totalQuestions}).
              </p>
            )}
          </div>

        </form>
      )}

      {/* STEP 4: SYNTHESIZING STATE */}
      {step === 'GENERATING' && (
        <div className="studio-panel rounded-2xl p-10 text-center animate-fade-in space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Loader2 className="w-7 h-7 animate-spin text-indigo-400" />
          </div>

          <div>
            <h3 className="text-base font-semibold text-white">
              Synthesizing Custom Curriculum...
            </h3>
            <p className="text-xs text-zinc-400 mt-1 max-w-md mx-auto leading-relaxed">
              Grounding questions strictly within the provided document and enforcing your topic-wise distribution.
            </p>
          </div>

          <div className="max-w-xs mx-auto p-4 rounded-xl bg-[#08090d]/80 border border-white/[0.08] text-[11px] font-mono text-zinc-400 text-left space-y-1">
            <div className="text-zinc-200 font-sans font-semibold mb-1">Curriculum Targets:</div>
            {topicDistribution.map((t, idx) => (
              <div key={idx} className="truncate text-zinc-300">
                • {t.topic || 'General'}: <span className="text-indigo-400 font-bold">{t.questionCount} Qs</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STEP 5: PRE-GAME QUESTION REVIEW & CUSTOMIZATION */}
      {step === 'REVIEW' && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Review Action Header */}
          <div className="p-5 rounded-2xl studio-panel flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="p-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                </span>
                <h2 className="text-sm sm:text-base font-semibold text-white">
                  Review & Inspect Questions
                </h2>
                <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                  {generatedQuestions.length} Questions
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                Fine-tune wording, switch verified correct answers, or add custom questions before launching the arena.
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => { sounds.playPop(); setStep('CONFIG'); }}
                className="text-xs text-zinc-300 hover:text-white px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] transition flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Config</span>
              </button>

              <button
                type="button"
                onClick={handleConfirmDeployLobby}
                className="text-xs sm:text-sm font-semibold studio-btn-primary px-4 py-2 rounded-xl transition flex items-center gap-2 shadow-xl cursor-pointer"
              >
                <span>Deploy Lobby</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Question List */}
          <div className="space-y-4">
            {generatedQuestions.map((q, qIdx) => (
              <div 
                key={q.id || `review-q-${qIdx}`}
                className="studio-panel rounded-2xl p-5 space-y-3.5"
              >
                {/* Question Header & Subfocus */}
                <div className="flex items-center justify-between gap-2 border-b border-white/[0.08] pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-lg bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                      Q{qIdx + 1}
                    </span>
                    {q.subFocus && (
                      <span className="text-[11px] text-zinc-400 truncate max-w-[240px] sm:max-w-sm">
                        {q.subFocus}
                      </span>
                    )}
                  </div>

                  {generatedQuestions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleDeleteQuestion(qIdx)}
                      className="text-zinc-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-white/[0.04] transition cursor-pointer"
                      title="Delete this question"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Question Textarea */}
                <div>
                  <label className="block text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-1.5">
                    Question Prompt
                  </label>
                  <textarea
                    rows={2}
                    value={q.question}
                    onChange={(e) => handleEditQuestionText(qIdx, e.target.value)}
                    className="w-full text-xs sm:text-sm text-white bg-[#0e1019]/90 border border-white/[0.09] rounded-xl p-3 focus:outline-none focus:border-indigo-500 transition resize-none shadow-inner"
                    placeholder="Enter question text..."
                  />
                </div>

                {/* 4 Options Grid */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
                    Options (Click circle to select the verified correct answer)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {q.options.map((opt, optIdx) => {
                      const isCorrect = q.correctIndex === optIdx;
                      return (
                        <div 
                          key={optIdx}
                          className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition ${
                            isCorrect 
                              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200' 
                              : 'bg-white/[0.03] border-white/[0.07] hover:border-white/[0.12]'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => handleSetCorrectIndex(qIdx, optIdx)}
                            className={`w-5 h-5 rounded-full shrink-0 flex items-center justify-center border transition cursor-pointer ${
                              isCorrect
                                ? 'bg-emerald-500 border-emerald-400 text-zinc-950 shadow-sm'
                                : 'border-zinc-700 hover:border-zinc-400 text-transparent'
                            }`}
                            title={isCorrect ? 'Correct Answer' : 'Click to make correct answer'}
                          >
                            <Check className="w-3 h-3 stroke-[3]" />
                          </button>

                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => handleEditOption(qIdx, optIdx, e.target.value)}
                            className="flex-1 bg-transparent text-xs text-white focus:outline-none"
                            placeholder={`Option ${String.fromCharCode(65 + optIdx)}`}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Explanation */}
                <div>
                  <label className="block text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-1.5">
                    Explanation (Post-Round Reveal)
                  </label>
                  <input
                    type="text"
                    value={q.explanation || ''}
                    onChange={(e) => handleEditExplanation(qIdx, e.target.value)}
                    className="w-full text-xs text-zinc-200 bg-[#0e1019]/70 border border-white/[0.09] rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500 transition shadow-inner"
                    placeholder="Brief explanation for players..."
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Footer Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3.5 pt-2">
            <button
              type="button"
              onClick={handleAddCustomQuestion}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl studio-btn-secondary text-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Custom Question</span>
            </button>

            <button
              type="button"
              onClick={handleConfirmDeployLobby}
              className="w-full sm:w-auto px-7 py-3 rounded-xl studio-btn-primary font-semibold text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-xl cursor-pointer"
            >
              <span>Confirm & Launch Arena ({generatedQuestions.length} Questions)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      )}

    </div>
  );
}
