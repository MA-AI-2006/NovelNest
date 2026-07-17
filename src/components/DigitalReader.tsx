import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { 
  X, Play, Pause, RotateCcw, Save, Sparkles, Notebook, 
  Send, BookOpen, Clock, AlertCircle, HelpCircle, MessageSquare,
  Check, ChevronRight, Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DigitalReaderProps {
  bookId: string;
  title: string;
  author: string;
  pageCount?: number;
  initialPage?: number;
  onClose: () => void;
  onSaveProgress: (pagesReadThisSession: number, finalPage: number) => void;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

export const DigitalReader: React.FC<DigitalReaderProps> = ({
  bookId,
  title,
  author,
  pageCount = 300,
  initialPage = 1,
  onClose,
  onSaveProgress,
}) => {
  const { addBookNote, books } = useApp();
  
  // Find book on shelf to retrieve existing margin notes
  const bookOnShelf = books.find(b => b.id === bookId);

  // Focus Timer States
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Reading Progress States (Users log their actual reading metrics)
  const [sessionPagesRead, setSessionPagesRead] = useState<number>(0);
  const [currentPageNum, setCurrentPageNum] = useState<number>(() => {
    return initialPage > 0 ? initialPage : 1;
  });

  // Margin Notes Composer States
  const [noteContent, setNoteContent] = useState('');
  const [noteSuccess, setNoteSuccess] = useState(false);

  // AI Companion Chat States
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatError, setChatError] = useState('');
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Manage timer ticking
  useEffect(() => {
    if (timerActive) {
      timerRef.current = setInterval(() => {
        setTimerSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [timerActive]);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const handleToggleTimer = () => {
    setTimerActive(prev => !prev);
  };

  const handleResetTimer = () => {
    setTimerActive(false);
    setTimerSeconds(0);
  };

  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleAddMarginNote = () => {
    if (!noteContent.trim()) return;
    addBookNote(bookId, noteContent, currentPageNum, `Study Session Note`);
    setNoteContent('');
    setNoteSuccess(true);
    setTimeout(() => setNoteSuccess(false), 2000);
  };

  const handleSendChat = async () => {
    if (!chatInput.trim() || isChatLoading) return;
    setChatError('');
    const userQuery = chatInput;
    setChatInput('');
    
    // Optimistic Update
    const newHistory: ChatMessage[] = [...chatHistory, { role: 'user', text: userQuery }];
    setChatHistory(newHistory);
    setIsChatLoading(true);

    try {
      const response = await fetch('/api/ai/companion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookTitle: title,
          bookAuthor: author,
          currentPage: currentPageNum,
          pageCount: pageCount,
          query: userQuery,
          history: newHistory.slice(0, -1) // pass recent turns
        })
      });

      if (!response.ok) {
        throw new Error('AI companion suffered a connection block.');
      }

      const data = await response.json();
      if (data.text) {
        setChatHistory(prev => [...prev, { role: 'assistant', text: data.text }]);
      } else {
        throw new Error('Unrecognized response structure');
      }
    } catch (err: any) {
      setChatError(err.message || 'Connecting to companion failed.');
      console.error(err);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleFinishSession = () => {
    // Save actual pages logged during this session
    onSaveProgress(sessionPagesRead, currentPageNum);
  };

  // Safe bounds check for page inputs
  const handlePageNumChange = (val: number) => {
    const clean = Math.max(1, Math.min(pageCount, val));
    setCurrentPageNum(clean);
  };

  const handleSessionPagesChange = (val: number) => {
    const clean = Math.max(0, val);
    setSessionPagesRead(clean);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#FAF7F2] text-brand-navy font-sans select-none overflow-y-auto">
      
      {/* Aesthetic Study Room Header */}
      <header className="border-b-4 border-brand-navy bg-brand-paper py-3 px-4 sm:px-6 shadow-[0px_4px_0px_0px_var(--color-brand-navy)] shrink-0">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3">
          
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl border-2 border-brand-navy bg-[#4ECDC4] flex items-center justify-center text-brand-navy shadow-[2px_2px_0px_0px_var(--color-brand-navy)]">
              <Clock className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-tight truncate max-w-sm">{title}</h2>
              <p className="text-[10px] font-bold text-brand-navy/60 uppercase">Aesthetic Study Lounge • {author}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-brand-cream border-2 border-brand-navy rounded-xl text-xs font-bold text-brand-navy">
              <Sparkles className="h-3.5 w-3.5 text-brand-clay fill-brand-clay" />
              Spoiler-Safe Zone (Gemini powered)
            </div>
            <button
              onClick={handleFinishSession}
              className="flex items-center gap-2 px-4 py-1.5 rounded-xl border-2 border-brand-navy bg-[#FF6B6B] text-white text-xs font-black shadow-[3px_3px_0px_0px_var(--color-brand-navy)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
            >
              <Save className="h-4 w-4" /> Save Session & Exit
            </button>
          </div>

        </div>
      </header>

      {/* Main Lounge Board */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Left column: Aesthetic Timer + Activity Logger */}
        <section className="lg:col-span-4 flex flex-col gap-6">
          
          {/* Aesthetic Focus Timer Box */}
          <div className="rounded-3xl border-4 border-brand-navy bg-white p-5 shadow-[4px_4px_0px_0px_var(--color-brand-navy)] flex flex-col items-center justify-center text-center space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-brand-navy/60 w-full text-left border-b-2 border-dashed border-brand-navy/10 pb-2">
              ⏱️ Ambient Study Timer
            </h3>

            {/* Breathing Animation Pulse */}
            <div className="relative flex items-center justify-center">
              <div className={`absolute inset-0 h-28 w-28 rounded-full bg-[#4ECDC4]/10 border border-[#4ECDC4]/30 transition-all duration-[3000ms] ease-in-out ${timerActive ? 'scale-125 opacity-100' : 'scale-100 opacity-0'}`} />
              <div className="h-24 w-24 rounded-full border-4 border-brand-navy bg-brand-paper flex items-center justify-center shadow-inner relative z-10">
                <span className="text-2xl font-mono font-black text-brand-navy">{formatTime(timerSeconds)}</span>
              </div>
            </div>

            <p className="text-[10px] font-bold text-brand-navy/60 italic px-4 leading-relaxed">
              {timerActive ? 'Inhale peace... Exhale distractions. Dive deep into your book.' : 'Start the stopwatch below to keep time for your actual reading session.'}
            </p>

            {/* Stopwatch Actions */}
            <div className="flex gap-2.5">
              <button
                onClick={handleToggleTimer}
                className={`px-4 py-1.5 rounded-xl border-2 border-brand-navy text-xs font-black flex items-center gap-1 shadow-[2px_2px_0px_0px_var(--color-brand-navy)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 transition-all ${timerActive ? 'bg-[#FFE66D] text-brand-navy' : 'bg-[#4ECDC4] text-brand-navy'}`}
              >
                {timerActive ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                {timerActive ? 'Pause' : 'Start'}
              </button>
              <button
                onClick={handleResetTimer}
                className="px-4 py-1.5 rounded-xl border-2 border-brand-navy bg-white hover:bg-brand-paper text-brand-navy text-xs font-bold flex items-center gap-1 shadow-[2px_2px_0px_0px_var(--color-brand-navy)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 transition-all"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </button>
            </div>
          </div>

          {/* Genuine Activity Progress Logger */}
          <div className="rounded-3xl border-4 border-brand-navy bg-brand-cream/60 p-5 shadow-[4px_4px_0px_0px_var(--color-brand-navy)] space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-brand-navy/60 border-b-2 border-dashed border-brand-navy/10 pb-2">
              📝 Real Session logger
            </h3>

            <p className="text-[10px] font-bold text-brand-navy/70 leading-relaxed">
              Log actual page accomplishments for this session. This guarantees your visual trends and habit streaks represent real-life progress.
            </p>

            <div className="grid grid-cols-2 gap-3">
              {/* Actual Pages Read Input */}
              <div className="space-y-1">
                <label className="block text-[10px] font-black uppercase text-brand-navy/60">
                  Pages Read Today:
                </label>
                <input
                  type="number"
                  value={sessionPagesRead || ''}
                  onChange={(e) => handleSessionPagesChange(parseInt(e.target.value) || 0)}
                  className="w-full p-2.5 rounded-xl border-2 border-brand-navy bg-white text-xs font-black text-brand-navy outline-none"
                  placeholder="0 pages"
                  min="0"
                />
              </div>

              {/* Current Page Marker */}
              <div className="space-y-1">
                <label className="block text-[10px] font-black uppercase text-brand-navy/60">
                  I am on Page:
                </label>
                <input
                  type="number"
                  value={currentPageNum || ''}
                  onChange={(e) => handlePageNumChange(parseInt(e.target.value) || 1)}
                  className="w-full p-2.5 rounded-xl border-2 border-brand-navy bg-white text-xs font-black text-brand-navy outline-none"
                  placeholder="Page 1"
                  min="1"
                  max={pageCount}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-brand-navy/10 bg-white/50 p-2.5 flex gap-2 items-start text-[9px] font-bold text-brand-navy/60">
              <AlertCircle className="h-4 w-4 text-brand-clay shrink-0 mt-0.5" />
              <span>
                Total volume: <strong>{pageCount}</strong> pages. Saving logs will immediately synchronise your physical reading into your visual streak and weekly statistics dashboard!
              </span>
            </div>
          </div>

        </section>

        {/* Center column: Spoiler-Safe Reading Companion Chat */}
        <section className="lg:col-span-5 flex flex-col rounded-3xl border-4 border-brand-navy bg-white shadow-[6px_6px_0px_0px_var(--color-brand-navy)] overflow-hidden">
          
          {/* Chat Header */}
          <div className="bg-brand-paper border-b-2 border-brand-navy p-3 px-4 flex justify-between items-center shrink-0">
            <span className="text-[10px] font-black uppercase tracking-wider text-brand-navy flex items-center gap-1.5">
              <MessageSquare className="h-4 w-4 text-[#FF6B6B]" /> AI Library Companion
            </span>
            <span className="text-[9px] font-bold bg-white border border-brand-navy/20 text-brand-navy/60 px-2 py-0.5 rounded-full">
              Spoiler Limit: Page {currentPageNum}
            </span>
          </div>

          {/* Messages Flow Area */}
          <div className="flex-1 p-4 overflow-y-auto bg-brand-cream/10 space-y-3 flex flex-col justify-between min-h-[300px] max-h-[420px]">
            <div className="space-y-3">
              
              {/* Starter Message */}
              <div className="bg-brand-paper/50 border border-brand-navy/10 p-3 rounded-2xl text-xs space-y-1">
                <p className="font-extrabold text-[#FF6B6B] flex items-center gap-1 text-[10px] uppercase">
                  <Sparkles className="h-3.5 w-3.5" /> Aura Companion
                </p>
                <p className="font-medium text-brand-navy/80 leading-relaxed">
                  Welcome to your cozy reflection corner! I've loaded the full history of <strong>"{title}"</strong>. Ask me anything about the characters, symbols, plot, or atmosphere. 
                  <span className="block mt-1 bg-[#FFE66D]/20 border border-[#FFE66D]/40 p-1.5 rounded-lg text-[10px] text-brand-navy/70">
                    🔒 <strong>Spoiler-Proof Guard active:</strong> I will strictly never reference any events past page {currentPageNum}!
                  </span>
                </p>
              </div>

              {chatHistory.map((msg, idx) => (
                <div 
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] rounded-2xl border-2 border-brand-navy p-2.5 text-xs shadow-[2px_2px_0px_0px_var(--color-brand-navy)] ${msg.role === 'user' ? 'bg-[#FFE66D] text-brand-navy' : 'bg-white text-brand-navy'}`}>
                    <p className="font-semibold leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                  </div>
                </div>
              ))}

              {isChatLoading && (
                <div className="flex justify-start">
                  <div className="bg-brand-paper border border-brand-navy/20 p-2.5 rounded-2xl text-xs animate-pulse font-bold text-brand-navy flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-brand-clay animate-spin" />
                    Companion is translating pages...
                  </div>
                </div>
              )}

              {chatError && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-2.5 rounded-xl text-[10px] font-bold flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <span>{chatError}</span>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>
          </div>

          {/* Chat Inputs */}
          <div className="p-3 border-t-2 border-brand-navy bg-brand-paper shrink-0 flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
              placeholder={`Ask about characters up to page ${currentPageNum}...`}
              className="flex-1 p-2.5 rounded-xl border-2 border-brand-navy bg-white text-xs font-bold text-brand-navy outline-none placeholder:opacity-40"
              disabled={isChatLoading}
            />
            <button
              onClick={handleSendChat}
              disabled={!chatInput.trim() || isChatLoading}
              className="p-2.5 bg-[#4ECDC4] hover:bg-[#4ECDC4]/90 border-2 border-brand-navy rounded-xl shadow-[2px_2px_0px_0px_var(--color-brand-navy)] active:shadow-none active:translate-y-0.5 transition-all text-brand-navy disabled:opacity-45"
            >
              <Send className="h-4 w-4 stroke-[2.5]" />
            </button>
          </div>

        </section>

        {/* Right column: Margin Thoughts & Notes compilation */}
        <section className="lg:col-span-3 flex flex-col gap-6">
          
          {/* Jot Margin Notes */}
          <div className="rounded-3xl border-4 border-brand-navy bg-brand-paper p-5 shadow-[4px_4px_0px_0px_var(--color-brand-navy)] flex flex-col space-y-3">
            <h3 className="text-xs font-black uppercase tracking-widest text-brand-navy/60 border-b-2 border-dashed border-brand-navy/10 pb-2 flex items-center gap-1.5">
              <Notebook className="h-4 w-4 text-[#FF6B6B]" /> Margin Thoughts
            </h3>
            
            <p className="text-[10px] font-bold text-brand-navy/60">
              Inscribe reflections, questions, or memorable quotes directly on page {currentPageNum}.
            </p>

            <textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="What thought sparks on this page?..."
              className="w-full h-24 p-3 rounded-2xl border-2 border-brand-navy bg-white text-xs font-bold text-brand-navy placeholder:opacity-40 outline-none resize-none focus:ring-2 focus:ring-[#FF6B6B]/20 transition-all"
            />

            <button
              onClick={handleAddMarginNote}
              disabled={!noteContent.trim()}
              className="w-full py-2 bg-[#FF6B6B] text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 border-2 border-brand-navy shadow-[2px_2px_0px_0px_var(--color-brand-navy)] hover:shadow-none active:translate-y-0.5 transition-all disabled:opacity-40"
            >
              {noteSuccess ? (
                <>
                  <Check className="h-3.5 w-3.5 stroke-[3]" /> Saved to Margin!
                </>
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5 stroke-[3]" /> Log Thought on Page {currentPageNum}
                </>
              )}
            </button>
          </div>

          {/* Historical Notes Box */}
          <div className="rounded-3xl border-4 border-brand-navy bg-[#FFFDF9] p-5 shadow-[4px_4px_0px_0px_var(--color-brand-navy)] flex-1 flex flex-col overflow-hidden min-h-[200px]">
            <h3 className="text-xs font-black uppercase tracking-widest text-brand-navy/60 border-b-2 border-dashed border-brand-navy/10 pb-2 mb-3 flex items-center gap-1.5">
              <BookOpen className="h-4 w-4 text-[#4ECDC4]" /> Companion Journal
            </h3>

            <div className="flex-1 overflow-y-auto space-y-3 max-h-[160px] no-scrollbar">
              {bookOnShelf && bookOnShelf.notes && bookOnShelf.notes.length > 0 ? (
                bookOnShelf.notes.map(note => (
                  <div key={note.id} className="bg-brand-cream/30 border border-brand-navy/10 p-2.5 rounded-xl text-xs">
                    <div className="flex justify-between items-center mb-1 text-[9px] opacity-60 font-mono font-bold">
                      <span>Page {note.page}</span>
                      <span>{new Date(note.timestamp).toLocaleDateString()}</span>
                    </div>
                    <p className="font-semibold italic leading-snug text-brand-navy/90">"{note.content}"</p>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 opacity-45">
                  <HelpCircle className="h-7 w-7 text-brand-navy/30 mx-auto mb-1.5" />
                  <p className="text-[10px] font-bold">No margin thoughts recorded yet.</p>
                </div>
              )}
            </div>
          </div>

        </section>

      </main>

    </div>
  );
};
