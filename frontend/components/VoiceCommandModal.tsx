'use client';

import React, { useState } from 'react';
import { 
  Mic, 
  Volume2, 
  Sparkles, 
  X, 
  ArrowRight, 
  Radio, 
  CheckCircle2,
  Globe2,
  AlertCircle,
  Play
} from 'lucide-react';
import { sendVoiceCommand } from '../lib/api';
import { NavTab } from './NavigationSidebar';

interface VoiceCommandModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab?: (tab: NavTab) => void;
}

const INDIAN_LANGUAGES = [
  { code: 'en-IN', name: 'English (India)' },
  { code: 'hi-IN', name: 'Hindi (हिंदी)' },
  { code: 'bn-IN', name: 'Bengali (বাংলা)' },
  { code: 'te-IN', name: 'Telugu (తెలుగు)' },
  { code: 'ta-IN', name: 'Tamil (தமிழ்)' },
  { code: 'or-IN', name: 'Odia (ଓଡ଼ିଆ)' },
  { code: 'gu-IN', name: 'Gujarati (ગુજરાતી)' },
  { code: 'kn-IN', name: 'Kannada (ಕನ್ನಡ)' },
];

export const VoiceCommandModal: React.FC<VoiceCommandModalProps> = ({
  isOpen,
  onClose,
  onNavigateTab
}) => {
  const [selectedLang, setSelectedLang] = useState('en-IN');
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [speechNotice, setSpeechNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any | null>(null);
  const [ttsPlaying, setTtsPlaying] = useState(false);

  if (!isOpen) return null;

  const sampleCommands = [
    { text: "Show severe-risk hospitals in Vizag.", tab: 'infrastructure' as NavTab },
    { text: "Show route risk to District Hospital Puri.", tab: 'route-risk' as NavTab },
    { text: "Compare latest and previous forecast runs.", tab: 'forecast-evolution' as NavTab },
    { text: "Explain why Puri South sector is evaluated as severe risk.", tab: 'command-center' as NavTab },
    { text: "Generate incident briefing for State Disaster Management Authority.", tab: 'reports' as NavTab }
  ];

  const handleExecuteVoice = async (cmdText: string, suggestedTab?: NavTab, isDemo = false) => {
    setTranscript(cmdText);
    setLoading(true);
    setResponse(null);
    setSpeechNotice(null);
    try {
      const result = await sendVoiceCommand(cmdText, selectedLang, isDemo, isDemo ? cmdText : undefined);
      const data = result?.data || result;
      setResponse(data);

      // Play Text-to-Speech if text returned
      const textToSpeak = data?.speech_text || data?.explanation || data?.text;
      if (textToSpeak) {
        playTtsAudio(textToSpeak, selectedLang);
      }
    } catch (err: any) {
      console.error(err);
      setResponse({
        transcript: cmdText,
        intent: "voice_error",
        explanation: "Voice command processing failed or backend was unreachable: " + (err.message || ''),
        status: "FAILED"
      });
    } finally {
      setLoading(false);
      setIsListening(false);
    }
  };

  const playTtsAudio = (text: string, lang = 'en-IN') => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.onstart = () => setTtsPlaying(true);
      utterance.onend = () => setTtsPlaying(false);
      utterance.onerror = () => setTtsPlaying(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  const toggleBrowserListen = () => {
    if (typeof window === 'undefined') return;

    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      setSpeechNotice("Browser SpeechRecognition API is not available in this environment. Use text input or click 'TRY DEMO VOICE COMMAND'.");
      return;
    }

    try {
      setSpeechNotice(null);
      const recognition = new SpeechRec();
      recognition.lang = selectedLang;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const spoken = event.results[0][0].transcript;
        setTranscript(spoken);
        handleExecuteVoice(spoken, undefined, false);
      };

      recognition.onerror = (e: any) => {
        console.warn('Speech recognition error:', e);
        setIsListening(false);
        setSpeechNotice(`Microphone recognition message: ${e?.error || 'No speech detected or permission required.'}`);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err: any) {
      console.warn('Could not start Web Speech:', err);
      setIsListening(false);
      setSpeechNotice(`Speech recognition failed to initialize: ${err?.message || 'Permission denied.'}`);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-[#080d1a] border border-[#1e293b] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#0f172a] border-b border-[#1e293b] p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-600 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-950/50">
              <Mic className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-100 font-mono text-sm tracking-wide">VOICE COMMAND CENTER</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950 text-cyan-400 border border-cyan-800 font-bold">
                  STT → GEMINI → TTS
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                Google Cloud Speech-to-Text & Text-to-Speech Multilingual Command Pipeline
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Area */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* User-Controlled Language Selector (Section 33) */}
          <div className="flex items-center justify-between bg-[#0b1329] border border-[#1e293b] p-3 rounded-lg text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <Globe2 className="w-4 h-4 text-cyan-400" />
              <span className="font-mono font-bold">INPUT LOCALE / SPEECH LANGUAGE:</span>
            </div>
            <select
              value={selectedLang}
              onChange={(e) => setSelectedLang(e.target.value)}
              className="bg-[#050914] border border-[#334155] text-cyan-300 rounded px-2.5 py-1 text-xs font-mono focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              {INDIAN_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name} ({lang.code})
                </option>
              ))}
            </select>
          </div>

          {/* Voice Input Waveform / Trigger Area */}
          <div className="bg-[#0b1329] border border-[#1e293b] rounded-xl p-6 text-center space-y-4">
            <div className="flex items-center justify-center">
              <button
                onClick={toggleBrowserListen}
                disabled={loading}
                className={`w-20 h-20 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 ${
                  isListening
                    ? 'bg-rose-600 text-white ring-8 ring-rose-500/20 scale-105 animate-pulse'
                    : 'bg-gradient-to-tr from-cyan-600 to-blue-600 text-white hover:scale-105 hover:shadow-cyan-500/20'
                }`}
              >
                {isListening ? (
                  <Radio className="w-8 h-8 animate-spin" />
                ) : (
                  <Mic className="w-8 h-8" />
                )}
              </button>
            </div>

            <div>
              <h4 className="font-bold text-slate-100 text-sm">
                {isListening ? `Listening in ${INDIAN_LANGUAGES.find(l => l.code === selectedLang)?.name}...` : "Click Mic to Speak in Selected Language"}
              </h4>
              <p className="text-slate-400 text-xs mt-1">
                {transcript ? `"${transcript}"` : "Speaks directly to Gemini Copilot; executes backend deterministic tools."}
              </p>
            </div>

            {/* Explicit Notice if Speech Recognition was rejected or unavailable */}
            {speechNotice && (
              <div className="bg-amber-950/60 border border-amber-600/40 text-amber-200 text-xs p-2.5 rounded-lg flex items-center gap-2 max-w-md mx-auto text-left">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-[11px]">{speechNotice}</span>
              </div>
            )}

            {/* Explicit TRY DEMO VOICE COMMAND Button (Section 33) */}
            <div className="pt-1 flex items-center justify-center gap-3">
              <button
                onClick={() => handleExecuteVoice("Show severe-risk hospitals in Vizag.", undefined, true)}
                disabled={loading}
                className="bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold text-xs px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 font-mono uppercase tracking-wide transition-all"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>TRY DEMO VOICE COMMAND</span>
              </button>
            </div>

            {/* Manual text trigger */}
            <div className="flex items-center gap-2 max-w-md mx-auto pt-2">
              <input 
                type="text"
                placeholder="Or type operational command..."
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && transcript.trim()) {
                    handleExecuteVoice(transcript.trim());
                  }
                }}
                className="flex-1 bg-[#050914] border border-[#1e293b] rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
              />
              <button
                onClick={() => transcript.trim() && handleExecuteVoice(transcript.trim())}
                disabled={loading || !transcript.trim()}
                className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-bold px-3 py-1.5 rounded-lg font-mono"
              >
                Run
              </button>
            </div>
          </div>

          {/* Quick Command Chips */}
          <div className="space-y-2">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block font-bold">
              PRE-CONFIGURED OPERATIONAL VOICE DIRECTIVES
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {sampleCommands.map((cmd, idx) => (
                <button
                  key={idx}
                  onClick={() => handleExecuteVoice(cmd.text, cmd.tab, true)}
                  disabled={loading}
                  className="p-2.5 rounded-lg bg-[#0f172a] hover:bg-[#1e293b] border border-[#1e293b] hover:border-cyan-700/60 text-left transition-all group flex items-start gap-2"
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs text-slate-200 group-hover:text-cyan-300 font-medium leading-snug">
                      &quot;{cmd.text}&quot;
                    </p>
                    <span className="text-[10px] text-slate-500 font-mono">
                      Target: {cmd.tab}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Voice Response Area */}
          {loading && (
            <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6 text-center space-y-3 animate-pulse">
              <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-xs font-mono text-cyan-400">
                Processing Audio [{selectedLang}] → Routing Gemini Tool → Synthesizing Response...
              </p>
            </div>
          )}

          {response && !loading && (
            <div className="bg-[#0f172a] border border-cyan-900/60 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold font-mono text-slate-200 uppercase">
                    TOOL: {response.tool_invoked || response.intent || 'gemini_intent_router'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => playTtsAudio(response.speech_text || response.explanation || '', selectedLang)}
                    className="flex items-center gap-1 text-[11px] font-mono text-cyan-400 hover:text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>{ttsPlaying ? 'Playing Audio...' : 'Replay TTS'}</span>
                  </button>
                </div>
              </div>

              <div className="p-3 bg-[#080d1a] border border-[#1e293b] rounded-lg">
                <p className="text-xs text-slate-200 leading-relaxed font-sans">
                  {response.speech_text || response.explanation}
                </p>
              </div>

              {response.voice_metadata && (
                <div className="p-2 bg-[#050914] rounded border border-[#1e293b] text-[10px] font-mono text-slate-400 flex flex-wrap gap-x-4 gap-y-1">
                  <span>INPUT: <strong className="text-slate-200">{response.voice_metadata.input_source}</strong></span>
                  <span>LANG: <strong className="text-slate-200">{response.voice_metadata.language_name}</strong></span>
                  <span>TTS: <strong className="text-slate-200">{response.voice_metadata.tts_provider}</strong></span>
                </div>
              )}

              {response.evidence && (
                <div className="text-[11px] font-mono text-slate-400 space-y-1">
                  <span className="text-slate-500 block uppercase font-bold text-[10px]">Deterministic Evidence Context:</span>
                  <pre className="p-2 bg-[#050914] rounded border border-[#1e293b] text-slate-300 text-[10px] overflow-x-auto max-h-36">
                    {typeof response.evidence === 'object' ? JSON.stringify(response.evidence, null, 2) : response.evidence}
                  </pre>
                </div>
              )}

              {/* View Navigation Action */}
              <div className="flex justify-end pt-2">
                {sampleCommands.find(c => c.text === transcript)?.tab && (
                  <button
                    onClick={() => {
                      const match = sampleCommands.find(c => c.text === transcript);
                      if (match?.tab && onNavigateTab) {
                        onNavigateTab(match.tab);
                        onClose();
                      }
                    }}
                    className="flex items-center gap-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs px-3 py-1.5 rounded-lg shadow"
                  >
                    <span>Inspect In Relevant Dashboard View</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
