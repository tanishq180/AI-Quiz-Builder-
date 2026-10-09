import React, { useState } from 'react';
import { X, Key, Check, ExternalLink, ShieldCheck } from 'lucide-react';
import { sounds } from '../utils/soundEffects';

export default function ApiKeyModal({ isOpen, onClose, currentKey, onSaveKey }) {
  const [keyInput, setKeyInput] = useState(currentKey || '');
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e) => {
    e.preventDefault();
    sounds.playPop();
    onSaveKey(keyInput.trim());
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 700);
  };

  const handleClear = () => {
    sounds.playPop();
    setKeyInput('');
    onSaveKey('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-sm studio-panel rounded-2xl p-6 relative border border-white/[0.12] shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.08] transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-3.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Key className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Gemini API Key</h3>
            <p className="text-[11px] text-zinc-400 font-mono">Personal AI Studio Credentials</p>
          </div>
        </div>

        <p className="text-xs text-zinc-300 leading-relaxed mb-4">
          By default, the backend handles question generation. You can supply your own Google Gemini API key to avoid shared quotas.
        </p>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <input
              type="password"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0e1019]/90 border border-white/[0.1] focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 focus:outline-none text-xs text-white placeholder-zinc-500 font-mono transition shadow-inner"
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-zinc-400">
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 transition underline underline-offset-2"
            >
              Get free Gemini key <ExternalLink className="w-2.5 h-2.5" />
            </a>
            {currentKey && (
              <button
                type="button"
                onClick={handleClear}
                className="text-zinc-400 hover:text-rose-400 transition cursor-pointer"
              >
                Clear Key
              </button>
            )}
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl studio-btn-primary text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-lg"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5" /> Saved
                </>
              ) : (
                'Save Key'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
