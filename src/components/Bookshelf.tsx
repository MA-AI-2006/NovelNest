import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Book, ReadingStatus, BookNote } from '../types';
import { 
  BookOpen, Star, Trash2, Edit2, Check, Bookmark, Plus, X, ListCollapse,
  ChevronRight, Calendar, ArrowUpRight, HelpCircle, AlertCircle, Save,
  Sparkles, Send, RefreshCw, MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface BookshelfProps {
  onStartReading?: (book: { id: string; title: string; author: string; pageCount?: number; initialPage?: number }) => void;
}

export const Bookshelf: React.FC<BookshelfProps> = ({ onStartReading }) => {
  const { 
    books, updateBookStatus, updateBookProgress, rateBook, 
    reviewBook, addBookNote, deleteBookNote, removeBook 
  } = useApp();

  const [filter, setFilter] = useState<ReadingStatus | 'all'>('all');
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  
  // Note inputs
  const [notePage, setNotePage] = useState<number | ''>('');
  const [noteChapter, setNoteChapter] = useState('');
  const [noteContent, setNoteContent] = useState('');

  // Review inputs
  const [tempReview, setTempReview] = useState('');
  const [isEditingReview, setIsEditingReview] = useState(false);

  // Manual page inputs
  const [editProgressId, setEditProgressId] = useState<string | null>(null);
  const [customProgressPage, setCustomProgressPage] = useState<number>(0);

  // AI Companion States
  const [showCompanion, setShowCompanion] = useState(false);
  const [companionInput, setCompanionInput] = useState('');
  const [companionHistory, setCompanionHistory] = useState<{ role: 'user' | 'model'; text: string }[]>([]);
  const [isCompanionLoading, setIsCompanionLoading] = useState(false);
  const [companionError, setCompanionError] = useState<string | null>(null);

  // Lazy Reviewer States
  const [showLazyPrompt, setShowLazyPrompt] = useState(false);
  const [lazyAnswers, setLazyAnswers] = useState({
    q1: '😭 Crying in a corner, emotionally destroyed',
    q2: '',
    q3: '☕ Cozy, slow-burn, perfect for a rainy day'
  });
  const [isLazyDrafting, setIsLazyDrafting] = useState(false);

  // Reset companion & wizard states when active book changes
  useEffect(() => {
    setShowCompanion(false);
    setCompanionInput('');
    setCompanionHistory([]);
    setCompanionError(null);
    setIsCompanionLoading(false);
    setShowLazyPrompt(false);
    setLazyAnswers({
      q1: '😭 Crying in a corner, emotionally destroyed',
      q2: '',
      q3: '☕ Cozy, slow-burn, perfect for a rainy day'
    });
  }, [selectedBookId]);

  // Filter books
  const filteredBooks = books.filter(b => filter === 'all' || b.status === filter);

  // Colors based on genre/preset
  const getBookSpineColor = (index: number, status: ReadingStatus) => {
    if (status === 'read') return 'bg-brand-sage';
    if (status === 'DNF') return 'bg-brand-navy/60';
    const colors = [
      'bg-brand-clay',
      'bg-brand-sand',
      'bg-emerald-500',
      'bg-amber-500',
      'bg-indigo-500',
      'bg-rose-500'
    ];
    return colors[index % colors.length];
  };

  const handleLogProgress = (book: Book, newPage: number) => {
    updateBookProgress(book.id, newPage);
    setEditProgressId(null);
  };

  const handleAddNote = (bookId: string) => {
    if (!noteContent.trim()) return;
    addBookNote(
      bookId, 
      noteContent,
      notePage === '' ? undefined : Number(notePage), 
      noteChapter ? noteChapter : undefined
    );
    // Reset fields
    setNotePage('');
    setNoteChapter('');
    setNoteContent('');
  };

  const handlePublishReview = (bookId: string) => {
    reviewBook(bookId, tempReview);
    setIsEditingReview(false);
  };

  const handleSendCompanionMessage = async (e?: React.FormEvent, customMsg?: string) => {
    if (e) e.preventDefault();
    const queryText = customMsg || companionInput;
    if (!queryText.trim() || !activeBook || isCompanionLoading) return;

    const userMsg = { role: 'user' as const, text: queryText };
    setCompanionHistory(prev => [...prev, userMsg]);
    if (!customMsg) setCompanionInput('');
    setIsCompanionLoading(true);
    setCompanionError(null);

    try {
      const response = await fetch('/api/ai/companion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookTitle: activeBook.title,
          bookAuthor: activeBook.authors.join(', '),
          currentPage: activeBook.currentPage,
          pageCount: activeBook.pageCount,
          query: queryText,
          history: companionHistory
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to generate companion response');
      }

      const data = await response.json();
      setCompanionHistory(prev => [...prev, { role: 'model', text: data.text }]);
    } catch (err: any) {
      console.error(err);
      setCompanionError(err.message || 'Connecting to reading companion failed.');
    } finally {
      setIsCompanionLoading(false);
    }
  };

  const handleGenerateLazyReview = async () => {
    if (!activeBook || isLazyDrafting) return;
    setIsLazyDrafting(true);
    try {
      const response = await fetch('/api/ai/lazy-reviewer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: activeBook.title,
          author: activeBook.authors.join(', '),
          answers: lazyAnswers
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to draft review');
      }

      const data = await response.json();
      setTempReview(data.draft);
      setIsEditingReview(true);
      setShowLazyPrompt(false);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to draft review using Gemini.');
    } finally {
      setIsLazyDrafting(false);
    }
  };

  const activeBook = books.find(b => b.id === selectedBookId);

  return (
    <div className="space-y-6">
      {/* Dynamic Status Tabs & Visual Shelf */}
      <div className="rounded-3xl border-4 border-brand-navy bg-brand-paper p-5 shadow-[6px_6px_0px_0px_var(--color-brand-navy)]">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
          <div>
            <h2 className="text-xl font-extrabold text-brand-navy">Interactive Playful Bookshelf</h2>
            <p className="text-xs font-semibold text-brand-navy/60">Organize and track your books with responsive visual cues</p>
          </div>
          
          {/* Status Tabs */}
          <div className="flex flex-wrap gap-1.5 bg-white border-2 border-brand-navy p-1 rounded-2xl w-full sm:w-auto justify-center">
            {([
              { key: 'all', label: 'All Books' },
              { key: 'reading', label: 'Reading' },
              { key: 'read', label: 'Read' },
              { key: 'TBR', label: 'TBR' },
              { key: 'DNF', label: 'DNF' }
            ] as { key: ReadingStatus | 'all'; label: string }[]).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`px-3 py-1 text-xs font-bold rounded-xl transition-all ${
                  filter === tab.key 
                    ? 'bg-brand-clay text-white shadow-sm' 
                    : 'text-brand-navy hover:bg-brand-paper'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Interactive Shelf Illustration */}
        <div className="relative border-4 border-brand-navy rounded-2xl bg-gradient-to-b from-brand-paper/50 to-brand-paper overflow-hidden p-6 pt-12 min-h-48 flex flex-col justify-end">
          {filteredBooks.length === 0 ? (
            <div className="text-center py-6">
              <HelpCircle className="h-8 w-8 text-brand-navy/30 mx-auto mb-2 animate-bounce" />
              <p className="text-xs font-bold text-brand-navy/60 uppercase">This shelf is currently vacant</p>
              <p className="text-[10px] text-brand-navy/50 font-medium">Use the "Global Library Finder" tab to add your books!</p>
            </div>
          ) : (
            <div className="flex flex-wrap items-end justify-center gap-2 sm:gap-3 px-2">
              {filteredBooks.map((book, index) => {
                const heightPercent = Math.max(70, Math.min(100, Math.round((book.pageCount / 1000) * 30 + 70)));
                const widthPixels = book.status === 'read' ? 'w-8 sm:w-10' : 'w-7 sm:w-9';
                const progressPercent = book.pageCount > 0 ? Math.round((book.currentPage / book.pageCount) * 100) : 0;
                
                return (
                  <motion.div
                    key={book.id}
                    whileHover={{ y: -10, scale: 1.05 }}
                    onClick={() => {
                      setSelectedBookId(book.id);
                      setTempReview(book.review || '');
                    }}
                    className="flex flex-col items-center cursor-pointer group"
                  >
                    {/* Spine */}
                    <div 
                      className={`relative rounded-t-lg border-2 border-brand-navy ${getBookSpineColor(index, book.status)} flex flex-col justify-between p-1 shadow-md transition-all`}
                      style={{ 
                        height: `${heightPercent}px`,
                        width: `${widthPixels}` 
                      }}
                    >
                      {/* Top Stripe */}
                      <div className="w-full h-1 border-b border-brand-navy/30 bg-white/20 rounded-t-sm" />
                      
                      {/* Vertical text inside book spine */}
                      <div className="h-full flex items-center justify-center overflow-hidden">
                        <span 
                          className="text-[8px] font-extrabold text-brand-navy tracking-tight truncate uppercase rotate-90 select-none whitespace-nowrap origin-center"
                          style={{ maxWidth: `${heightPercent - 30}px` }}
                        >
                          {book.title}
                        </span>
                      </div>

                      {/* Progress bar inside book spine bottom */}
                      <div className="w-full bg-brand-navy/20 h-1.5 rounded-full overflow-hidden border border-brand-navy/20">
                        <div className="bg-white h-full" style={{ width: `${progressPercent}%` }} />
                      </div>
                    </div>

                    {/* Miniature indicator dots or shelf alignment details */}
                    <div className="h-2 w-2 rounded-full border border-brand-navy bg-brand-sand shadow-sm mt-1 group-hover:scale-125 transition-transform" />
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Wooden Shelf Base */}
          <div className="h-4 w-full bg-amber-800 border-t-4 border-brand-navy rounded-b-md shadow-inner flex items-center justify-between px-4 mt-1">
            <span className="text-[7px] font-extrabold text-white/50 uppercase tracking-widest font-mono select-none">Est. 2026 Library Shelf</span>
            <div className="flex gap-2">
              <span className="h-1 w-1 rounded-full bg-white/30" />
              <span className="h-1 w-1 rounded-full bg-white/30" />
            </div>
          </div>
        </div>
      </div>

      {/* Grid of details & Book list */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Book List Sidebar / Cards */}
        <div className={`space-y-3 lg:col-span-7 ${!activeBook ? 'lg:col-span-12' : ''}`}>
          {filteredBooks.map((book) => {
            const isSelected = book.id === selectedBookId;
            const progressPercent = book.pageCount > 0 ? Math.round((book.currentPage / book.pageCount) * 100) : 0;
            
            return (
              <motion.div
                key={book.id}
                layoutId={`shelf-card-${book.id}`}
                className={`rounded-2xl border-2 border-brand-navy bg-white p-4 shadow-[4px_4px_0px_0px_var(--color-brand-navy)] hover:shadow-[6px_6px_0px_0px_var(--color-brand-navy)] transition-all ${
                  isSelected ? 'ring-2 ring-brand-clay bg-brand-cream/30' : ''
                }`}
              >
                <div className="flex gap-4">
                  {/* Book Cover / Action */}
                  <div 
                    onClick={() => {
                      setSelectedBookId(book.id);
                      setTempReview(book.review || '');
                    }}
                    className="h-24 w-16 shrink-0 rounded-lg border border-brand-navy overflow-hidden cursor-pointer bg-brand-paper shadow-sm"
                  >
                    <img
                      src={book.thumbnail}
                      alt={book.title}
                      className="h-full w-full object-cover hover:scale-105 transition-transform"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  {/* Body Info */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start gap-1">
                        <h3 
                          onClick={() => {
                            setSelectedBookId(book.id);
                            setTempReview(book.review || '');
                          }}
                          className="text-sm font-extrabold text-brand-navy truncate hover:text-brand-clay cursor-pointer"
                        >
                          {book.title}
                        </h3>
                        
                        {/* Status Label Pill */}
                        <span className={`text-[9px] font-bold uppercase border-2 border-brand-navy px-1.5 py-0.5 rounded-lg shrink-0 ${
                          book.status === 'reading' ? 'bg-brand-sand text-brand-navy' :
                          book.status === 'read' ? 'bg-brand-sage text-white' :
                          book.status === 'DNF' ? 'bg-brand-navy text-white' :
                          'bg-brand-paper text-brand-navy'
                        }`}>
                          {book.status}
                        </span>
                      </div>
                      
                      <p className="text-xs font-semibold text-brand-navy/60 truncate">
                        {book.authors.join(', ')}
                      </p>

                      {/* Interactive Stars Rating bar */}
                      <div className="flex items-center gap-1 mt-1.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => rateBook(book.id, star)}
                            className="p-0.5 text-brand-navy hover:scale-125 transition-transform"
                          >
                            <Star 
                              className={`h-4.5 w-4.5 ${
                                star <= book.userRating 
                                  ? 'fill-brand-sand text-brand-navy' 
                                  : 'text-brand-navy/20'
                              }`} 
                            />
                          </button>
                        ))}
                        {book.userRating > 0 && (
                          <span className="text-[10px] font-extrabold text-brand-navy/60 ml-1">({book.userRating}/5)</span>
                        )}
                      </div>
                    </div>

                    {/* Progress tracking row */}
                    <div className="mt-3 space-y-1.5">
                      <div className="flex justify-between items-center text-xs font-semibold text-brand-navy/70">
                        <div className="flex items-center gap-1">
                          <BookOpen className="h-3.5 w-3.5 text-brand-clay" />
                          <span>Progress: {book.currentPage} / {book.pageCount} pgs</span>
                        </div>
                        <span className="font-mono text-[10px] font-bold bg-brand-paper px-1.5 py-0.5 rounded-md border border-brand-navy/20">{progressPercent}%</span>
                      </div>
                      
                      {/* Solid bar progress */}
                      <div className="w-full h-3.5 rounded-xl border-2 border-brand-navy bg-brand-paper overflow-hidden">
                        <div 
                          className="bg-brand-sage h-full border-r border-brand-navy transition-all duration-300" 
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>

                      {/* Log progress slider/triggers */}
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-1">
                          {editProgressId === book.id ? (
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                min={0}
                                max={book.pageCount}
                                value={customProgressPage}
                                onChange={(e) => setCustomProgressPage(Number(e.target.value))}
                                className="w-16 rounded-lg border-2 border-brand-navy px-1.5 py-0.5 text-xs font-bold outline-none bg-white"
                              />
                              <button
                                onClick={() => handleLogProgress(book, customProgressPage)}
                                className="p-1 rounded-lg border-2 border-brand-navy bg-brand-sage hover:bg-brand-sage/90 text-white"
                              >
                                <Check className="h-3.5 w-3.5 stroke-[3]" />
                              </button>
                              <button
                                onClick={() => setEditProgressId(null)}
                                className="p-1 rounded-lg border border-brand-navy bg-white hover:bg-brand-paper text-brand-navy"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  setEditProgressId(book.id);
                                  setCustomProgressPage(book.currentPage);
                                }}
                                className="text-[10px] font-extrabold uppercase bg-brand-paper border border-brand-navy/35 rounded-lg px-2 py-0.5 text-brand-navy hover:bg-brand-sand transition-colors"
                              >
                                Update Progress
                              </button>
                              <button
                                onClick={() => onStartReading?.({
                                  id: book.id,
                                  title: book.title,
                                  author: book.authors.join(', '),
                                  pageCount: book.pageCount,
                                  initialPage: book.currentPage || 1
                                })}
                                className="text-[10px] font-extrabold uppercase bg-[#FF6B6B] text-white border border-brand-navy/35 rounded-lg px-2 py-0.5 hover:bg-[#FF6B6B]/90 transition-all flex items-center gap-0.5 shadow-[1.5px_1.5px_0px_0px_var(--color-brand-navy)] hover:shadow-none hover:translate-x-[0.5px] hover:translate-y-[0.5px]"
                              >
                                📖 Read Now
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Fast Status Change Actions */}
                        <div className="flex gap-1">
                          {(['reading', 'read', 'DNF', 'TBR'] as ReadingStatus[]).map((st) => (
                            book.status !== st && (
                              <button
                                key={st}
                                onClick={() => updateBookStatus(book.id, st)}
                                className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-white border border-brand-navy/30 text-brand-navy/70 hover:bg-brand-paper hover:text-brand-navy hover:border-brand-navy transition-colors capitalize"
                              >
                                to {st}
                              </button>
                            )
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Detailed Book Focus Panel */}
        <AnimatePresence>
          {activeBook && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="lg:col-span-5 rounded-3xl border-4 border-brand-navy bg-brand-cream p-5 shadow-[6px_6px_0px_0px_var(--color-brand-navy)] space-y-5"
            >
              {/* Header */}
              <div className="flex justify-between items-start">
                <div className="min-w-0">
                  <h3 className="text-base font-extrabold text-brand-navy truncate leading-tight">
                    {activeBook.title}
                  </h3>
                  <p className="text-xs font-semibold text-brand-clay truncate">
                    By {activeBook.authors.join(', ')}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedBookId(null)}
                  className="p-1 rounded-full border-2 border-brand-navy hover:bg-brand-sand transition-colors text-brand-navy shrink-0 ml-2"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Cover info panel */}
              <div className="bg-brand-paper rounded-2xl border-2 border-brand-navy p-3 flex gap-3">
                <img
                  src={activeBook.thumbnail}
                  alt={activeBook.title}
                  className="h-20 w-14 object-cover rounded-md border border-brand-navy bg-white shadow-sm shrink-0"
                  referrerPolicy="no-referrer"
                />
                <div className="flex-1 min-w-0 flex flex-col justify-between text-xs font-semibold text-brand-navy/70 py-0.5">
                  <p className="truncate">Category: {activeBook.categories.slice(0, 1).join(', ') || 'General'}</p>
                  <p>Published: {activeBook.publishedDate || 'Unknown'}</p>
                  <p className="text-[10px] text-brand-navy/50 font-medium">Added to shelf: {activeBook.dateAdded}</p>
                  <button
                    onClick={() => {
                      if (window.confirm(`Are you sure you want to remove "${activeBook.title}" from your library bookshelf?`)) {
                        removeBook(activeBook.id);
                        setSelectedBookId(null);
                      }
                    }}
                    className="text-[10px] font-bold text-red-500 uppercase flex items-center gap-0.5 hover:underline mt-1 w-max"
                  >
                    <Trash2 className="h-3 w-3" /> Delete Book
                  </button>
                </div>
              </div>

              {/* Immersive Reader Trigger Button */}
              <button
                onClick={() => onStartReading?.({
                  id: activeBook.id,
                  title: activeBook.title,
                  author: activeBook.authors.join(', '),
                  pageCount: activeBook.pageCount,
                  initialPage: activeBook.currentPage || 1
                })}
                className="w-full py-3 bg-[#4ECDC4] hover:bg-[#4ECDC4]/95 text-brand-navy border-2 border-brand-navy rounded-2xl font-black flex items-center justify-center gap-2 shadow-[3.5px_3.5px_0px_0px_var(--color-brand-navy)] hover:shadow-none hover:translate-x-[1.5px] hover:translate-y-[1.5px] transition-all"
                id="active-book-reader-btn"
              >
                <BookOpen className="h-5 w-5" /> Launch Immersive Digital Reader
              </button>

              {/* Spoiler-Safe AI Reading Companion */}
              <div className="rounded-2xl border-2 border-brand-navy bg-white overflow-hidden shadow-[3px_3px_0px_0px_var(--color-brand-navy)]">
                <button
                  type="button"
                  onClick={() => setShowCompanion(!showCompanion)}
                  className="w-full flex items-center justify-between p-3.5 bg-brand-sand/15 text-brand-navy hover:bg-brand-sand/30 transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-brand-clay animate-pulse" />
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider">Spoiler-Safe AI Companion</h4>
                      <p className="text-[10px] font-semibold text-brand-navy/60">Ask plot & character questions safely up to page {activeBook.currentPage}</p>
                    </div>
                  </div>
                  <ChevronRight className={`h-4.5 w-4.5 transition-transform ${showCompanion ? 'rotate-90' : ''}`} />
                </button>

                {showCompanion && (
                  <div className="p-3 border-t-2 border-brand-navy space-y-3 bg-brand-cream/10">
                    <div className="flex items-center gap-1.5 p-2 rounded-xl bg-brand-sage/10 border border-brand-sage/30 text-[10px] font-semibold text-brand-navy/85">
                      <span className="text-xs">🛡️</span>
                      <span><strong>Spoiler protection active:</strong> AI is constrained to plot details up to page {activeBook.currentPage} of {activeBook.pageCount}.</span>
                    </div>

                    {/* Chat Messages */}
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {companionHistory.length === 0 ? (
                        <div className="text-center py-4 text-brand-navy/40">
                          <p className="text-[10px] font-bold uppercase tracking-wider">No questions asked yet</p>
                          <p className="text-[9px] font-medium">Click a suggestion or ask below!</p>
                        </div>
                      ) : (
                        companionHistory.map((msg, idx) => (
                          <div
                            key={idx}
                            className={`p-2.5 rounded-xl border max-w-[90%] text-xs font-medium leading-relaxed ${
                              msg.role === 'user'
                                ? 'bg-brand-paper border-brand-navy/20 text-brand-navy ml-auto rounded-tr-none'
                                : 'bg-brand-sage/15 border-brand-sage/40 text-brand-navy mr-auto rounded-tl-none'
                            }`}
                          >
                            <p>{msg.text}</p>
                          </div>
                        ))
                      )}

                      {isCompanionLoading && (
                        <div className="bg-brand-sand/10 border border-brand-sand/30 p-2.5 rounded-xl mr-auto max-w-[90%] text-xs font-semibold text-brand-navy/70 flex items-center gap-2">
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          <span>Gemini is analyzing page {activeBook.currentPage}...</span>
                        </div>
                      )}

                      {companionError && (
                        <div className="bg-red-50 border border-red-200 text-red-600 p-2 rounded-xl text-[10px] font-bold">
                          {companionError}
                        </div>
                      )}
                    </div>

                    {/* Suggestion Chips */}
                    <div className="flex flex-wrap gap-1">
                      {[
                        "Who is the main protagonist?",
                        `Summarize plot up to page ${activeBook.currentPage}`,
                        "What is the main conflict so far?",
                        "Describe the theme in 1 sentence"
                      ].map((chip) => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => handleSendCompanionMessage(undefined, chip)}
                          disabled={isCompanionLoading || activeBook.currentPage === 0}
                          className="text-[9px] font-extrabold uppercase px-2 py-1 rounded-lg border border-brand-navy/25 bg-white text-brand-navy hover:bg-brand-sand hover:border-brand-navy disabled:opacity-40 transition-colors"
                        >
                          {chip}
                        </button>
                      ))}
                    </div>

                    {/* Input Area */}
                    <form onSubmit={handleSendCompanionMessage} className="flex gap-1.5">
                      <input
                        type="text"
                        value={companionInput}
                        onChange={(e) => setCompanionInput(e.target.value)}
                        placeholder={activeBook.currentPage === 0 ? "Log pages read to start chatting!" : "Ask anything about current plot..."}
                        disabled={isCompanionLoading || activeBook.currentPage === 0}
                        className="flex-1 bg-white border-2 border-brand-navy rounded-xl px-2.5 py-1.5 text-xs font-bold text-brand-navy outline-none placeholder:text-brand-navy/35 focus:ring-1 focus:ring-brand-clay"
                      />
                      <button
                        type="submit"
                        disabled={isCompanionLoading || !companionInput.trim() || activeBook.currentPage === 0}
                        className="p-1.5 bg-brand-clay hover:bg-brand-clay/95 disabled:opacity-45 text-white border border-brand-navy rounded-xl shadow-[1.5px_1.5px_0px_0px_var(--color-brand-navy)] hover:shadow-none hover:translate-x-[0.5px] hover:translate-y-[0.5px] transition-all"
                      >
                        <Send className="h-4.5 w-4.5" />
                      </button>
                    </form>
                  </div>
                )}
              </div>

              {/* Thoughts & Notes logger (Bento section) */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-brand-navy/70 flex items-center gap-1">
                    <ListCollapse className="h-4 w-4 text-brand-clay" /> Thoughts log
                  </h4>
                  <span className="text-[10px] font-bold bg-brand-paper border border-brand-navy/20 px-2 py-0.5 rounded-full text-brand-navy">
                    {activeBook.notes?.length || 0} entries
                  </span>
                </div>

                {/* Add new thought */}
                <div className="rounded-2xl border-2 border-brand-navy bg-white p-3 space-y-2">
                  <div className="flex gap-2">
                    <div className="flex items-center gap-1 bg-brand-paper px-2 py-1 rounded-xl border border-brand-navy/20 w-1/2">
                      <span className="text-[10px] font-bold text-brand-navy/50 font-mono">Pg:</span>
                      <input
                        type="number"
                        placeholder="Page"
                        value={notePage}
                        onChange={(e) => setNotePage(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full bg-transparent text-xs font-bold outline-none text-brand-navy"
                      />
                    </div>
                    <div className="flex items-center gap-1 bg-brand-paper px-2 py-1 rounded-xl border border-brand-navy/20 w-1/2">
                      <span className="text-[10px] font-bold text-brand-navy/50">Ch:</span>
                      <input
                        type="text"
                        placeholder="Chapter"
                        value={noteChapter}
                        onChange={(e) => setNoteChapter(e.target.value)}
                        className="w-full bg-transparent text-xs font-bold outline-none text-brand-navy"
                      />
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <textarea
                      placeholder="Write your quick reading thoughts or favorite quotes here..."
                      rows={2}
                      value={noteContent}
                      onChange={(e) => setNoteContent(e.target.value)}
                      className="w-full bg-brand-paper/40 border-2 border-brand-navy rounded-xl p-2 text-xs font-bold text-brand-navy outline-none focus:bg-white transition-colors placeholder:text-brand-navy/35"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={() => handleAddNote(activeBook.id)}
                      disabled={!noteContent.trim()}
                      className="px-3 py-1 bg-brand-clay hover:bg-brand-clay/90 disabled:opacity-40 text-white rounded-xl text-xs font-bold flex items-center gap-1 border border-brand-navy shadow-[2px_2px_0px_0px_var(--color-brand-navy)] disabled:shadow-none hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
                    >
                      <Plus className="h-3.5 w-3.5 stroke-[3]" /> Log Thought
                    </button>
                  </div>
                </div>

                {/* Notes List with Scroll */}
                <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                  {(!activeBook.notes || activeBook.notes.length === 0) ? (
                    <div className="text-center py-4 rounded-xl border-2 border-dashed border-brand-navy/15 bg-brand-paper/30">
                      <p className="text-[10px] font-extrabold uppercase text-brand-navy/40">No logged thoughts yet</p>
                    </div>
                  ) : (
                    activeBook.notes.map((note) => (
                      <div key={note.id} className="p-2.5 rounded-xl border border-brand-navy bg-white shadow-sm flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                          <div className="flex flex-wrap gap-1 mb-1">
                            {note.page !== undefined && (
                              <span className="text-[9px] font-bold bg-brand-sand/30 border border-brand-sand px-1.5 py-0.2 rounded-md text-brand-navy">
                                Page {note.page}
                              </span>
                            )}
                            {note.chapter && (
                              <span className="text-[9px] font-bold bg-brand-paper border border-brand-navy/20 px-1.5 py-0.2 rounded-md text-brand-navy truncate max-w-32">
                                {note.chapter}
                              </span>
                            )}
                          </div>
                          
                          {/* Note Delete */}
                          <button
                            onClick={() => deleteBookNote(activeBook.id, note.id)}
                            className="text-red-500 hover:scale-110 p-0.5 rounded transition-transform"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                        <p className="text-xs font-medium text-brand-navy/85 leading-relaxed">
                          {note.content}
                        </p>
                        <span className="text-[8px] font-mono font-bold text-brand-navy/40 mt-1 self-end">
                          {new Date(note.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Book Review Forum Composer */}
              <div className="border-t-2 border-dashed border-brand-navy/20 pt-4 space-y-2">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-brand-navy/70 flex items-center gap-1">
                  <Star className="h-4 w-4 text-brand-sand" /> Community Book Review
                </h4>

                {showLazyPrompt ? (
                  <div className="p-3.5 rounded-2xl border-2 border-brand-navy bg-brand-cream/40 space-y-3 shadow-inner">
                    <div className="flex justify-between items-center pb-1.5 border-b border-brand-navy/10">
                      <h5 className="text-[11px] font-black uppercase text-brand-navy flex items-center gap-1">
                        <Sparkles className="h-3.5 w-3.5 text-brand-clay animate-spin" style={{ animationDuration: '3s' }} /> Lazy Reviewer Wizard
                      </h5>
                      <button
                        type="button"
                        onClick={() => setShowLazyPrompt(false)}
                        className="text-brand-navy hover:text-brand-clay"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="space-y-2 text-xs">
                      {/* Q1 */}
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-brand-navy/70 uppercase">1. How did the ending make you feel?</label>
                        <select
                          value={lazyAnswers.q1}
                          onChange={(e) => setLazyAnswers(prev => ({ ...prev, q1: e.target.value }))}
                          className="w-full bg-white border border-brand-navy/30 rounded-lg px-2 py-1 font-semibold text-brand-navy text-[11px]"
                        >
                          <option value="😭 Crying in a corner, emotionally destroyed">😭 Crying in a corner, emotionally destroyed</option>
                          <option value="🥰 Extremely satisfied and smiling">🥰 Extremely satisfied and smiling</option>
                          <option value="😡 Wanted to throw the book out of a window in anger">😡 Wanted to throw the book out of a window</option>
                          <option value="🤔 Deeply confused, I need a therapy session">🤔 Deeply confused, I need a therapy session</option>
                          <option value="😴 Totally bored, fell asleep twice">😴 Totally bored, fell asleep twice</option>
                        </select>
                      </div>

                      {/* Q2 */}
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-brand-navy/70 uppercase">2. Which character did you want to throw into the sun, and why?</label>
                        <input
                          type="text"
                          value={lazyAnswers.q2}
                          onChange={(e) => setLazyAnswers(prev => ({ ...prev, q2: e.target.value }))}
                          placeholder="e.g. The dense hero, or 'None, they are all precious'"
                          className="w-full bg-white border border-brand-navy/30 rounded-lg px-2 py-1 font-semibold text-brand-navy text-[11px] outline-none"
                        />
                      </div>

                      {/* Q3 */}
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-brand-navy/70 uppercase">3. Describe the book's pacing:</label>
                        <select
                          value={lazyAnswers.q3}
                          onChange={(e) => setLazyAnswers(prev => ({ ...prev, q3: e.target.value }))}
                          className="w-full bg-white border border-brand-navy/30 rounded-lg px-2 py-1 font-semibold text-brand-navy text-[11px]"
                        >
                          <option value="☕ Cozy, slow-burn, perfect for a rainy day">☕ Cozy, slow-burn, perfect for a rainy day</option>
                          <option value="⚡ Zooming at supersonic speed with crazy twists">⚡ Zooming at supersonic speed with crazy twists</option>
                          <option value="🐢 Extremely sluggish and hard to climb through">🐢 Extremely sluggish and hard to climb through</option>
                          <option value="🎢 A wild roller coaster with zero breathing room">🎢 A wild roller coaster with zero breathing room</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex gap-1.5 pt-1.5 justify-end">
                      <button
                        type="button"
                        onClick={() => setShowLazyPrompt(false)}
                        className="px-2.5 py-1 text-[10px] font-bold rounded-lg border border-brand-navy text-brand-navy bg-white hover:bg-brand-paper"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleGenerateLazyReview}
                        disabled={isLazyDrafting || !lazyAnswers.q2.trim()}
                        className="px-3 py-1 text-[10px] font-black rounded-lg border border-brand-navy bg-brand-clay text-white hover:bg-brand-clay/90 disabled:opacity-50 flex items-center gap-1 shadow-[2px_2px_0px_0px_var(--color-brand-navy)] disabled:shadow-none hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
                      >
                        {isLazyDrafting ? (
                          <>
                            <RefreshCw className="h-3 w-3 animate-spin" /> Drafting...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-3 w-3" /> Draft with Gemini
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : null}

                {isEditingReview ? (
                  <div className="space-y-2">
                    <textarea
                      placeholder="Write a comprehensive book review to share in the reading circle forum..."
                      rows={3}
                      value={tempReview}
                      onChange={(e) => setTempReview(e.target.value)}
                      className="w-full bg-white border-2 border-brand-navy rounded-xl p-2.5 text-xs font-medium text-brand-navy outline-none placeholder:text-brand-navy/35 focus:ring-2 focus:ring-brand-clay/20"
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => setIsEditingReview(false)}
                        className="px-3 py-1.5 rounded-xl border border-brand-navy bg-white hover:bg-brand-paper text-xs font-bold text-brand-navy"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handlePublishReview(activeBook.id)}
                        className="px-3.5 py-1.5 rounded-xl border-2 border-brand-navy bg-brand-sage hover:bg-brand-sage/90 text-xs font-bold text-white shadow-[2px_2px_0px_0px_var(--color-brand-navy)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] transition-all flex items-center gap-1"
                      >
                        <Save className="h-3.5 w-3.5" /> Publish to Forum
                      </button>
                    </div>
                  </div>
                ) : !showLazyPrompt ? (
                  <div className="p-3 rounded-2xl border-2 border-brand-navy bg-white shadow-sm flex flex-col gap-2">
                    {activeBook.review ? (
                      <>
                        <p className="text-xs font-semibold text-brand-navy/80 italic leading-relaxed">
                          "{activeBook.review}"
                        </p>
                        <div className="flex gap-2 justify-end">
                          <button
                            type="button"
                            onClick={() => setShowLazyPrompt(true)}
                            className="text-[10px] font-bold text-brand-clay flex items-center gap-0.5 hover:underline"
                          >
                            <Sparkles className="h-3 w-3" /> Re-draft with AI
                          </button>
                          <button
                            onClick={() => setIsEditingReview(true)}
                            className="text-[10px] font-bold text-brand-clay flex items-center gap-0.5 hover:underline"
                          >
                            <Edit2 className="h-3 w-3" /> Edit Review
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-2 space-y-2">
                        <p className="text-xs text-brand-navy/50 font-medium">You haven't published a review for this book yet.</p>
                        <div className="flex justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => setIsEditingReview(true)}
                            className="px-3 py-1 border-2 border-brand-navy rounded-xl text-xs font-bold bg-brand-sand text-brand-navy hover:bg-brand-sand/85 hover:-translate-y-0.5 transition-all shadow-[2px_2px_0px_0px_var(--color-brand-navy)]"
                          >
                            Write a Review
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowLazyPrompt(true)}
                            className="px-3 py-1 border-2 border-brand-navy rounded-xl text-xs font-bold bg-brand-clay text-white hover:bg-brand-clay/90 hover:-translate-y-0.5 transition-all shadow-[2px_2px_0px_0px_var(--color-brand-navy)] flex items-center gap-1"
                          >
                            <Sparkles className="h-3.5 w-3.5" /> Lazy Reviewer 🪄
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
