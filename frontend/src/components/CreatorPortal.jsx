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
    <div className="w-full max-w-2xl mx-auto px-4 py-6 sm:py-10 animate-fade-in">
      
      {/* Portal Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300">
              <BookOpen className="w-4 h-4" />
            </span>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-100">
              Creator Portal
            </h1>
            <span className="text-[10px] font-mono tracking-wider px-2 py-0.5 rounded bg-zinc-800/80 text-zinc-300 border border-zinc-700">
              PDF CURRICULUM
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Synthesize highly structured quizzes directly from textbook chapters and study guides.
          </p>
        </div>

        {onCancel && (
          <button
            onClick={() => { sounds.playPop(); onCancel(); }}
            className="text-xs text-zinc-400 hover:text-zinc-200 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition"
          >
            Back to Quick Arena
          </button>
        )}
      </div>

      {/* Global Error Banner */}
      {errorMsg && (
        <div className="mb-6 p-3.5 rounded-xl bg-zinc-900 border border-zinc-700/80 flex items-start gap-2.5 text-xs text-zinc-200 shadow-sm animate-fade-in">
          <AlertCircle className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
          <div className="flex-1">{errorMsg}</div>
          <button 
            onClick={() => setErrorMsg('')} 
            className="text-zinc-400 hover:text-zinc-100 transition"
          >
            <X className="w-3.5 h-3.5" />
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
                ? 'border-zinc-400 bg-zinc-900/60'
                : 'border-zinc-800 bg-zinc-900/30 hover:border-zinc-700 hover:bg-zinc-900/50'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileInputChange}
              accept=".pdf,application/pdf"
              className="hidden"
            />

            <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400">
              <UploadCloud className="w-6 h-6 text-zinc-300" />
            </div>

            <h3 className="text-sm sm:text-base font-medium text-zinc-100 mb-1">
              Drag and drop your PDF here, or <span className="text-zinc-300 underline underline-offset-2">browse</span>
            </h3>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto mb-4">
              Upload textbook chapters, lecture slides, papers, or technical manuals (up to 25MB).
            </p>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900/80 border border-zinc-800 text-[11px] text-zinc-400 font-mono">
              <FileText className="w-3 h-3 text-zinc-400" />
              <span>Standard text-based PDF documents supported</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-900 flex items-start gap-3 text-xs text-zinc-400">
            <Sparkles className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-medium text-zinc-300">Strict Curriculum Grounding: </span>
              Questions will be constructed exclusively from the verified contents of your document, strictly conforming to your custom topic-wise distribution.
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: DOCUMENT ANALYSIS STATE */}
      {step === 'ANALYZING' && (
        <div className="minimal-panel rounded-2xl p-10 text-center animate-fade-in space-y-4">
          <div className="w-12 h-12 mx-auto rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300">
            <Loader2 className="w-6 h-6 animate-spin text-zinc-300" />
          </div>

          <div>
            <h3 className="text-base font-medium text-zinc-100">Analyzing Document...</h3>
            <p className="text-xs text-zinc-400 mt-1 max-w-md mx-auto">
              Extracting raw text, computing chapter breakdown, and scanning prospective sub-topics for your curriculum.
            </p>
          </div>

          {file && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 font-mono">
              <FileText className="w-3.5 h-3.5 text-zinc-400" />
              <span className="truncate max-w-[220px]">{file.name}</span>
              <span className="text-zinc-400">({(file.size / (1024 * 1024)).toFixed(2)} MB)</span>
            </div>
          )}
        </div>
      )}

      {/* STEP 3: CONFIGURATION FORM */}
      {step === 'CONFIG' && extractedData && (
        <form onSubmit={handleGenerateQuiz} className="space-y-6 animate-fade-in">
          
          {/* Document Summary Card */}
          <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FileText className="w-4 h-4 text-zinc-300" />
                <div>
                  <div className="text-xs font-medium text-zinc-100 truncate max-w-[280px] sm:max-w-md">
                    {extractedData.filename}
                  </div>
                  <div className="text-[11px] text-zinc-400 flex items-center gap-2">
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
                  className="text-[11px] text-zinc-400 hover:text-zinc-200 px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800 flex items-center gap-1 transition"
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
                  className="p-1 rounded text-zinc-400 hover:text-zinc-200 transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Document Preview Snippet */}
            {showPreview && extractedData.previewSnippet && (
              <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800/80 text-[11px] font-mono text-zinc-400 max-h-40 overflow-y-auto leading-relaxed whitespace-pre-wrap">
                {extractedData.previewSnippet}...
              </div>
            )}
          </div>

          {/* Host Setup & Avatar */}
          <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/80 space-y-4">
            <div className="text-xs font-medium text-zinc-300 tracking-wide uppercase">
              Host Setup
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">
                  Host Name
                </label>
                <input
                  type="text"
                  required
                  maxLength={24}
                  value={hostName}
                  onChange={(e) => setHostName(e.target.value)}
                  placeholder="e.g. Professor Smith"
                  className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-100 text-xs focus:outline-none focus:border-zinc-600 transition"
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">
                  Host Avatar
                </label>
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {AVATARS.map((av) => (
                    <button
                      key={av}
                      type="button"
                      onClick={() => { sounds.playPop(); setSelectedAvatar(av); }}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm transition shrink-0 ${
                        selectedAvatar === av
                          ? 'bg-zinc-800 border border-zinc-600 text-zinc-100 shadow-sm'
                          : 'bg-zinc-900 border border-zinc-800/80 text-zinc-400 hover:text-zinc-200'
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
          <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/80 space-y-4">
            <div className="text-xs font-medium text-zinc-300 tracking-wide uppercase">
              Quiz Parameters
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Total Question Count */}
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">
                  Total Questions
                </label>
                <select
                  value={totalQuestions}
                  onChange={(e) => {
                    const newTotal = Number(e.target.value);
                    setTotalQuestions(newTotal);
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-100 text-xs focus:outline-none focus:border-zinc-600 transition"
                >
                  {[3, 4, 5, 6, 8, 10, 12, 15].map((cnt) => (
                    <option key={cnt} value={cnt}>{cnt} Questions</option>
                  ))}
                </select>
              </div>

              {/* Difficulty Level */}
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">
                  Difficulty Level
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-100 text-xs focus:outline-none focus:border-zinc-600 transition"
                >
                  {DIFFICULTIES.map((d) => (
                    <option key={d.level} value={d.level}>{d.level}</option>
                  ))}
                </select>
              </div>

              {/* Round Timer */}
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">
                  Time Per Question
                </label>
                <select
                  value={timePerQuestion}
                  onChange={(e) => setTimePerQuestion(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-100 text-xs focus:outline-none focus:border-zinc-600 transition"
                >
                  <option value={10}>10 Seconds (Fast)</option>
                  <option value={15}>15 Seconds (Standard)</option>
                  <option value={20}>20 Seconds (Moderate)</option>
                  <option value={30}>30 Seconds (Relaxed)</option>
                </select>
              </div>
            </div>
          </div>

          {/* CRUCIAL REQUIREMENT: DYNAMIC TOPIC-WISE SPLIT */}
          <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-zinc-300" />
                  <span className="text-xs font-medium text-zinc-100 uppercase tracking-wide">
                    Topic-Wise Split (Crucial)
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
                  className="text-[11px] px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition"
                >
                  Auto-Distribute
                </button>
                <div className={`px-2.5 py-1 rounded text-[11px] font-mono border ${
                  isAllocationBalanced
                    ? 'bg-zinc-800 text-zinc-200 border-zinc-700'
                    : totalAllocated < totalQuestions
                      ? 'bg-zinc-900 text-zinc-400 border-zinc-800'
                      : 'bg-zinc-900 text-zinc-300 border-zinc-700'
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
                  className="flex items-center gap-2 p-2 rounded-lg bg-zinc-950 border border-zinc-800/80 transition-all focus-within:border-zinc-700"
                >
                  <span className="text-[11px] font-mono text-zinc-400 w-5 text-center">
                    {index + 1}.
                  </span>

                  {/* Topic Name */}
                  <input
                    type="text"
                    required
                    placeholder="e.g. Thermodynamics, Fluid Dynamics, Entropy"
                    value={item.topic}
                    onChange={(e) => handleTopicNameChange(item.id, e.target.value)}
                    className="flex-1 bg-transparent px-2 py-1 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
                  />

                  {/* Question Count Selector */}
                  <div className="flex items-center gap-1.5 shrink-0 bg-zinc-900 px-2 py-1 rounded border border-zinc-800">
                    <span className="text-[10px] text-zinc-400">Qty:</span>
                    <input
                      type="number"
                      min={1}
                      max={15}
                      value={item.questionCount}
                      onChange={(e) => handleTopicCountChange(item.id, e.target.value)}
                      className="w-10 bg-transparent text-center text-xs font-mono text-zinc-200 focus:outline-none"
                    />
                  </div>

                  {/* Remove Row Button */}
                  <button
                    type="button"
                    disabled={topicDistribution.length <= 1}
                    onClick={() => handleRemoveTopic(item.id)}
                    title={topicDistribution.length <= 1 ? "At least one topic required" : "Remove topic"}
                    className="p-1.5 text-zinc-400 hover:text-zinc-200 disabled:opacity-30 disabled:hover:text-zinc-600 transition"
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
                className="inline-flex items-center gap-1.5 text-xs text-zinc-300 hover:text-zinc-100 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Topic Row
              </button>

              {/* Status helper label */}
              {!isAllocationBalanced && (
                <span className="text-[11px] text-zinc-400">
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
              className="w-full py-3 px-4 rounded-xl bg-zinc-100 text-zinc-950 font-medium text-xs sm:text-sm hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center justify-center gap-2 shadow-sm"
            >
              <span>Generate Quiz & Launch Arena</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {!isAllocationBalanced && (
              <p className="text-center text-[11px] text-zinc-400 mt-2">
                Make sure your topic question count ({totalAllocated}) equals total questions ({totalQuestions}).
              </p>
            )}
          </div>

        </form>
      )}

      {/* STEP 4: SYNTHESIZING STATE */}
      {step === 'GENERATING' && (
        <div className="minimal-panel rounded-2xl p-10 text-center animate-fade-in space-y-4">
          <div className="w-12 h-12 mx-auto rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300">
            <Loader2 className="w-6 h-6 animate-spin text-zinc-300" />
          </div>

          <div>
            <h3 className="text-base font-medium text-zinc-100">
              Synthesizing Custom Curriculum...
            </h3>
            <p className="text-xs text-zinc-400 mt-1 max-w-md mx-auto">
              Grounding questions strictly within the provided document and enforcing your topic-wise distribution.
            </p>
          </div>

          <div className="max-w-xs mx-auto p-3 rounded-lg bg-zinc-900/60 border border-zinc-800/80 text-[11px] font-mono text-zinc-400 text-left space-y-1">
            <div className="text-zinc-300 font-sans font-medium">Topic Targets:</div>
            {topicDistribution.map((t, idx) => (
              <div key={idx} className="truncate">
                • {t.topic || 'General'}: {t.questionCount} Qs
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STEP 5: PRE-GAME QUESTION REVIEW & CUSTOMIZATION */}
      {step === 'REVIEW' && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Review Action Header */}
          <div className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1 rounded bg-zinc-800 text-zinc-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </span>
                <h2 className="text-sm sm:text-base font-semibold text-zinc-100">
                  Review & Customize Questions
                </h2>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                  {generatedQuestions.length} Questions
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                Fine-tune wording, switch correct answers, or add custom questions before launching the arena.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => { sounds.playPop(); setStep('CONFIG'); }}
                className="text-xs text-zinc-400 hover:text-zinc-200 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Config</span>
              </button>

              <button
                type="button"
                onClick={handleConfirmDeployLobby}
                className="text-xs sm:text-sm font-medium text-zinc-950 bg-zinc-100 hover:bg-zinc-200 px-4 py-2 rounded-xl transition flex items-center gap-2 shadow-sm"
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
                className="minimal-panel rounded-xl p-4 sm:p-5 border border-zinc-800/90 space-y-3"
              >
                {/* Question Header & Subfocus */}
                <div className="flex items-center justify-between gap-2 border-b border-zinc-800/60 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
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
                      className="text-zinc-500 hover:text-red-400 p-1 rounded hover:bg-zinc-900 transition"
                      title="Delete this question"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Question Textarea */}
                <div>
                  <label className="block text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-1">
                    Question Prompt
                  </label>
                  <textarea
                    rows={2}
                    value={q.question}
                    onChange={(e) => handleEditQuestionText(qIdx, e.target.value)}
                    className="w-full text-xs sm:text-sm text-zinc-100 bg-zinc-900/80 border border-zinc-800 rounded-lg p-2.5 focus:outline-none focus:border-zinc-600 transition resize-none"
                    placeholder="Enter question text..."
                  />
                </div>

                {/* 4 Options Grid */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
                    Options (Click circle to select the verified correct answer)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {q.options.map((opt, optIdx) => {
                      const isCorrect = q.correctIndex === optIdx;
                      return (
                        <div 
                          key={optIdx}
                          className={`flex items-center gap-2 p-2 rounded-lg border transition ${
                            isCorrect 
                              ? 'bg-emerald-950/20 border-emerald-500/50' 
                              : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => handleSetCorrectIndex(qIdx, optIdx)}
                            className={`w-5 h-5 rounded-full shrink-0 flex items-center justify-center border transition ${
                              isCorrect
                                ? 'bg-emerald-500 border-emerald-400 text-zinc-950'
                                : 'border-zinc-700 hover:border-zinc-500 text-transparent'
                            }`}
                            title={isCorrect ? 'Correct Answer' : 'Click to make correct answer'}
                          >
                            <Check className="w-3 h-3 stroke-[3]" />
                          </button>

                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => handleEditOption(qIdx, optIdx, e.target.value)}
                            className="flex-1 bg-transparent text-xs text-zinc-200 focus:outline-none focus:text-zinc-100"
                            placeholder={`Option ${String.fromCharCode(65 + optIdx)}`}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Explanation */}
                <div>
                  <label className="block text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-1">
                    Explanation (Post-Round Reveal)
                  </label>
                  <input
                    type="text"
                    value={q.explanation || ''}
                    onChange={(e) => handleEditExplanation(qIdx, e.target.value)}
                    className="w-full text-xs text-zinc-300 bg-zinc-900/60 border border-zinc-800 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-zinc-600 transition"
                    placeholder="Brief explanation for players..."
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Footer Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={handleAddCustomQuestion}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 transition flex items-center justify-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Custom Question</span>
            </button>

            <button
              type="button"
              onClick={handleConfirmDeployLobby}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-zinc-100 text-zinc-950 font-medium text-xs sm:text-sm hover:bg-zinc-200 transition flex items-center justify-center gap-2 shadow-sm"
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
