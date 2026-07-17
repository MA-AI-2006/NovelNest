import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Book, ReadingStatus } from '../types';
import { Search, Plus, BookOpen, User, Check, Bookmark, Calendar, ArrowRight, Loader2, Sparkles, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface BookSearchProps {
  onStartReading?: (book: { id: string; title: string; author: string; pageCount?: number; initialPage?: number }) => void;
}

export const BookSearch: React.FC<BookSearchProps> = ({ onStartReading }) => {
  const { addBook, books } = useApp();
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedBook, setSelectedBook] = useState<any | null>(null);
  const [addStatus, setAddStatus] = useState<ReadingStatus>('TBR');

  // Vibe search states
  const [searchMode, setSearchMode] = useState<'standard' | 'vibe'>('standard');
  const [vibeInput, setVibeInput] = useState('');
  const [isVibeLoading, setIsVibeLoading] = useState(false);
  const [vibeError, setVibeError] = useState('');

  // Popular search suggestions
  const suggestions = [
    'Harry Potter',
    'Dune',
    'Pride and Prejudice',
    'Atomic Habits',
    'The Alchemist',
    'Percy Jackson'
  ];

  // Curated list of Vibe presets
  const vibePresets = [
    'cozy slow-burn fantasy with small-town vibes',
    'mind-bending sci-fi mystery with an unreliable narrator',
    'heartbreaking historical fiction drama set in Paris',
    'spooky gothic horror centering a dark ancient library'
  ];

  const handleVibeSearch = async (promptText: string) => {
    if (!promptText.trim()) return;
    setIsVibeLoading(true);
    setVibeError('');
    setSearchResults([]);
    setSelectedBook(null);

    try {
      const response = await fetch('/api/ai/vibe-discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vibePrompt: promptText,
          availableBooks: books
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to analyze requested vibe.');
      }

      const data = await response.json();
      const recs = data.recommendations || [];

      // Enrich with Google Books data in the background
      const enrichedResults = await Promise.all(recs.map(async (rec: any) => {
        try {
          let gbRes = await fetch(
            `/api/books/search?q=${encodeURIComponent(rec.title + ' ' + rec.author)}&maxResults=1`
          ).catch(() => null);

          // Fallback to direct client-side fetch if proxy is unavailable or failed
          if (!gbRes || !gbRes.ok) {
            gbRes = await fetch(
              `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(rec.title + ' ' + rec.author)}&maxResults=1`
            ).catch(() => null);
          }

          if (gbRes && gbRes.ok) {
            const gbData = await gbRes.json();
            if (gbData.items && gbData.items[0]) {
              const item = gbData.items[0];
              return {
                ...item,
                matchPercentage: rec.matchPercentage,
                reason: rec.reason,
                volumeInfo: {
                  ...item.volumeInfo,
                  description: `${item.volumeInfo.description || rec.description}\n\n✨ Why it matches your vibe: ${rec.reason}`
                }
              };
            }
          }
        } catch (e) {
          console.warn('Enriching cover failed:', e);
        }
        return null;
      }));

      // Only show valid Google Books matches
      setSearchResults(enrichedResults.filter(item => item !== null));
    } catch (err: any) {
      setVibeError(err.message || 'Connecting to discovery assistant failed.');
      console.error(err);
    } finally {
      setIsVibeLoading(false);
    }
  };

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    setIsLoading(true);
    setError('');
    setSearchResults([]);
    setSelectedBook(null);

    try {
      let response: Response | null = null;
      let fetchError: Error | null = null;

      // 1. Try to search via server-side proxy
      try {
        response = await fetch(
          `/api/books/search?q=${encodeURIComponent(searchQuery)}&maxResults=8`
        );
      } catch (err: any) {
        fetchError = err;
      }

      // 2. Fallback to direct client-side call if server proxy was unreachable or returned an error status
      if (!response || !response.ok) {
        console.log('[Google Books Search] Server proxy unavailable, trying direct client-side fetch...');
        try {
          response = await fetch(
            `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(searchQuery)}&maxResults=8`
          );
        } catch (fallbackErr: any) {
          throw new Error(
            `Search failed. Proxy Error: ${fetchError?.message || 'Server returned ' + (response?.status || 'no response')}. Direct Fetch Error: ${fallbackErr.message || 'CORS / Blocked'}`
          );
        }
      }

      if (!response || !response.ok) {
        throw new Error(`Google Books API returned status ${response ? response.status : 'Unknown'}`);
      }

      const data = await response.json();
      if (data.items && data.items.length > 0) {
        setSearchResults(data.items);
      } else {
        setError('No books found matching your query. Try another title or author!');
      }
    } catch (err: any) {
      setError(`Search Error: ${err.message || 'Failed to search books. Please try again.'}`);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const executeAddBook = (volume: any, statusToSet: ReadingStatus) => {
    const volumeInfo = volume.volumeInfo;
    const cleanId = volume.id;
    
    // Fallback images
    const thumbnail = volumeInfo.imageLinks?.thumbnail || 
                      volumeInfo.imageLinks?.smallThumbnail || 
                      `https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&w=150&q=80`;

    const mappedBook = {
      id: cleanId,
      title: volumeInfo.title || 'Untitled Book',
      authors: volumeInfo.authors || ['Unknown Author'],
      categories: volumeInfo.categories || ['General'],
      thumbnail: thumbnail,
      publishedDate: volumeInfo.publishedDate || 'Unknown',
      pageCount: volumeInfo.pageCount || 200,
      description: volumeInfo.description || 'No description available for this volume.',
      status: statusToSet,
    };

    addBook(mappedBook);
    
    // Visual feedback/reset
    setSelectedBook(null);
  };

  const isBookOnShelf = (id: string) => {
    return books.some(b => b.id === id);
  };

  const getBookShelfStatus = (id: string) => {
    const found = books.find(b => b.id === id);
    return found ? found.status : null;
  };

  return (
    <div className="space-y-6">
      {/* Search Header Container */}
      <div className="rounded-3xl border-4 border-brand-navy bg-brand-paper p-6 shadow-[6px_6px_0px_0px_var(--color-brand-navy)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-extrabold text-brand-navy flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-brand-clay animate-pulse" />
              Global Library Finder
            </h2>
            <p className="text-xs font-semibold text-brand-navy/70">
              {searchMode === 'standard' 
                ? 'Search the live Google Books database to automatically import metadata, descriptions, page counts, and covers.'
                : 'Describe how you want to feel or the exact atmosphere you are craving. Gemini will search literature to discover the perfect matches.'
              }
            </p>
          </div>

          {/* Mode Selector Toggle Switch */}
          <div className="flex gap-1 bg-white border-2 border-brand-navy p-1 rounded-2xl w-max self-start shrink-0">
            <button
              type="button"
              onClick={() => {
                setSearchMode('standard');
                setSearchResults([]);
                setSelectedBook(null);
                setError('');
                setVibeError('');
              }}
              className={`px-3 py-1 text-[10px] font-black uppercase rounded-xl transition-all ${
                searchMode === 'standard' 
                  ? 'bg-brand-clay text-white shadow-sm' 
                  : 'text-brand-navy/70 hover:bg-brand-paper'
              }`}
            >
              🔍 Standard Search
            </button>
            <button
              type="button"
              onClick={() => {
                setSearchMode('vibe');
                setSearchResults([]);
                setSelectedBook(null);
                setError('');
                setVibeError('');
              }}
              className={`px-3 py-1 text-[10px] font-black uppercase rounded-xl transition-all flex items-center gap-1 ${
                searchMode === 'vibe' 
                  ? 'bg-brand-navy text-white shadow-sm' 
                  : 'text-brand-navy/70 hover:bg-brand-paper'
              }`}
            >
              <Sparkles className="h-3 w-3 text-brand-sand animate-bounce" /> Vibe AI
            </button>
          </div>
        </div>

        {searchMode === 'standard' ? (
          <>
            {/* Input Field */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-brand-navy/40" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch(query)}
                  placeholder="Search by book title, author, genre or ISBN..."
                  className="w-full rounded-2xl border-2 border-brand-navy bg-white py-3 pl-12 pr-4 text-sm font-bold text-brand-navy outline-none placeholder:text-brand-navy/40 focus:bg-brand-cream focus:ring-2 focus:ring-brand-clay/20 transition-all"
                />
              </div>
              <button
                onClick={() => handleSearch(query)}
                disabled={isLoading || !query.trim()}
                className="rounded-2xl border-2 border-brand-navy bg-brand-clay px-6 py-3 text-sm font-bold text-white shadow-[3px_3px_0px_0px_var(--color-brand-navy)] hover:shadow-[1px_1px_0px_0px_var(--color-brand-navy)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all disabled:opacity-40 disabled:pointer-events-none"
                id="book-search-btn"
              >
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : 'Search'}
              </button>
            </div>

            {/* Search Suggestions */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-navy/50 mr-1">Popular:</span>
              {suggestions.map((sug) => (
                <button
                  key={sug}
                  onClick={() => {
                    setQuery(sug);
                    handleSearch(sug);
                  }}
                  className="text-xs font-semibold rounded-lg border border-brand-navy/30 bg-white px-2.5 py-1 text-brand-navy hover:bg-brand-sand hover:border-brand-navy transition-colors"
                >
                  {sug}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            {/* Vibe input form */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Sparkles className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-brand-navy/40 animate-pulse" />
                <input
                  type="text"
                  value={vibeInput}
                  onChange={(e) => setVibeInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleVibeSearch(vibeInput)}
                  placeholder="Describe your desired mood, e.g. cozy cottage, gothic libraries, suspenseful deep sea..."
                  className="w-full rounded-2xl border-2 border-brand-navy bg-white py-3 pl-12 pr-4 text-sm font-bold text-brand-navy outline-none placeholder:text-brand-navy/40 focus:bg-brand-cream focus:ring-2 focus:ring-brand-clay/20 transition-all"
                />
              </div>
              <button
                onClick={() => handleVibeSearch(vibeInput)}
                disabled={isVibeLoading || !vibeInput.trim()}
                className="rounded-2xl border-2 border-brand-navy bg-brand-navy px-6 py-3 text-sm font-bold text-white shadow-[3px_3px_0px_0px_var(--color-brand-navy)] hover:shadow-[1px_1px_0px_0px_var(--color-brand-navy)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all disabled:opacity-40 disabled:pointer-events-none flex items-center gap-2 shrink-0"
                id="book-vibe-search-btn"
              >
                {isVibeLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 text-brand-sand animate-pulse" /> Discover Vibe
                  </>
                )}
              </button>
            </div>

            {/* Vibe Presets */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-navy/50 mr-1">Try Vibe Presets:</span>
              {vibePresets.map((preset) => (
                <button
                  key={preset}
                  onClick={() => {
                    setVibeInput(preset);
                    handleVibeSearch(preset);
                  }}
                  className="text-[10px] font-bold rounded-lg border border-brand-navy/30 bg-white px-2 py-1 text-brand-navy hover:bg-brand-sand hover:border-brand-navy transition-colors text-left"
                >
                  {preset}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Main Results / Expand Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Results List */}
        <div className={`space-y-4 lg:col-span-7 ${searchResults.length === 0 ? 'lg:col-span-12' : ''}`}>
          {(isLoading || isVibeLoading) && (
            <div className="flex flex-col items-center justify-center py-12 rounded-3xl border-4 border-dashed border-brand-navy/20 bg-brand-paper animate-pulse">
              <Loader2 className="h-10 w-10 animate-spin text-brand-clay mb-3" />
              <p className="text-sm font-bold text-brand-navy/60">
                {isVibeLoading ? 'Gemini is scanning the universe of literature for your vibe...' : 'Quizzing the global catalog...'}
              </p>
            </div>
          )}

          {error && (
            <div className="p-6 rounded-3xl border-4 border-brand-navy bg-brand-cream text-center shadow-[4px_4px_0px_0px_var(--color-brand-navy)]">
              <p className="text-sm font-bold text-brand-clay">{error}</p>
            </div>
          )}

          {vibeError && (
            <div className="p-6 rounded-3xl border-4 border-brand-navy bg-brand-cream text-center shadow-[4px_4px_0px_0px_var(--color-brand-navy)]">
              <p className="text-sm font-bold text-brand-clay">{vibeError}</p>
            </div>
          )}

          {!isLoading && !error && searchResults.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {searchResults.map((volume) => {
                const info = volume.volumeInfo;
                const isOnShelf = isBookOnShelf(volume.id);
                const shelfStatus = getBookShelfStatus(volume.id);
                
                const thumb = info.imageLinks?.thumbnail || 
                              info.imageLinks?.smallThumbnail || 
                              `https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&w=150&q=80`;

                return (
                  <motion.div
                    key={volume.id}
                    layoutId={`search-card-${volume.id}`}
                    onClick={() => setSelectedBook(volume)}
                    className={`group cursor-pointer rounded-2xl border-2 border-brand-navy bg-white p-3 flex gap-3 shadow-[4px_4px_0px_0px_var(--color-brand-navy)] hover:shadow-[6px_6px_0px_0px_var(--color-brand-navy)] transition-all hover:-translate-y-0.5 ${
                      selectedBook?.id === volume.id ? 'ring-2 ring-brand-clay bg-brand-cream/40' : ''
                    }`}
                  >
                    {/* Book Cover */}
                    <div className="relative h-24 w-16 shrink-0 overflow-hidden rounded-lg border border-brand-navy bg-brand-paper shadow-sm">
                      <img
                        src={thumb}
                        alt={info.title}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                        referrerPolicy="no-referrer"
                      />
                      {isOnShelf && (
                        <div className="absolute top-0 right-0 bg-brand-sage border-b border-l border-brand-navy text-white p-0.5 rounded-bl-md">
                          <Check className="h-3 w-3 stroke-[3]" />
                        </div>
                      )}
                    </div>

                    {/* Book Info Summary */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                      <div>
                        <h4 className="text-xs font-bold text-brand-navy truncate leading-snug group-hover:text-brand-clay transition-colors" title={info.title}>
                          {info.title}
                        </h4>
                        <p className="text-[11px] font-semibold text-brand-navy/60 truncate flex items-center gap-1 mt-0.5">
                          <User className="h-3 w-3 shrink-0" />
                          {info.authors ? info.authors.join(', ') : 'Unknown Author'}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {info.categories && info.categories.slice(0, 1).map((cat: string) => (
                            <span key={cat} className="text-[9px] font-bold uppercase bg-brand-paper text-brand-navy/70 border border-brand-navy/20 px-1.5 py-0.5 rounded-md">
                              {cat}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[10px] font-mono text-brand-navy/50 font-semibold mt-1">
                        <span>{info.pageCount || 200} pgs</span>
                        {isOnShelf ? (
                          <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md border border-brand-navy/30 bg-brand-sage/20 text-brand-navy">
                            {shelfStatus}
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold text-brand-clay flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                            Details <ArrowRight className="h-2.5 w-2.5" />
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {searchResults.length === 0 && !isLoading && !isVibeLoading && !error && !vibeError && (
            <div className="space-y-6">
              {/* Cozy Informative Card */}
              <div className="rounded-3xl border-4 border-brand-navy bg-brand-cream/40 p-5 text-center flex flex-col items-center justify-center space-y-2 border-dashed">
                <Sparkles className="h-7 w-7 text-brand-clay animate-pulse" />
                <h3 className="text-sm font-extrabold text-brand-navy">Search Global Libraries</h3>
                <p className="text-xs text-brand-navy/60 max-w-lg">
                  Use the bar above to search and fetch any real book in the world from the live Google Books database, and start building your customized shelf with actual progress tracking!
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Selected Book Details Panel (Expand View) */}
        <AnimatePresence>
          {selectedBook && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="lg:col-span-5 rounded-3xl border-4 border-brand-navy bg-brand-cream p-5 shadow-[6px_6px_0px_0px_var(--color-brand-navy)] space-y-4"
            >
              {/* Card Title Header */}
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand-clay flex items-center gap-1 bg-brand-sand/30 border border-brand-clay/30 px-2 py-0.5 rounded-full">
                  <Bookmark className="h-3 w-3" /> Volume Selected
                </span>
                <button
                  onClick={() => setSelectedBook(null)}
                  className="p-1 rounded-full border-2 border-brand-navy hover:bg-brand-sand transition-colors text-brand-navy"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Book Overview Row */}
              <div className="flex gap-4">
                <img
                  src={
                    selectedBook.volumeInfo.imageLinks?.thumbnail || 
                    selectedBook.volumeInfo.imageLinks?.smallThumbnail || 
                    `https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&w=150&q=80`
                  }
                  alt={selectedBook.volumeInfo.title}
                  className="h-32 w-22 object-cover rounded-xl border-2 border-brand-navy shadow-sm bg-white shrink-0"
                  referrerPolicy="no-referrer"
                />
                <div className="flex-1 min-w-0 space-y-1">
                  <h3 className="text-sm font-extrabold text-brand-navy leading-tight line-clamp-2">
                    {selectedBook.volumeInfo.title}
                  </h3>
                  <p className="text-xs font-bold text-brand-clay truncate">
                    By {selectedBook.volumeInfo.authors ? selectedBook.volumeInfo.authors.join(', ') : 'Unknown Author'}
                  </p>
                  
                  <div className="text-[11px] font-medium text-brand-navy/70 space-y-0.5 pt-1.5">
                    <p className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5 shrink-0 text-brand-navy/40" /> Published: {selectedBook.volumeInfo.publishedDate || 'N/A'}</p>
                    <p className="flex items-center gap-1"><BookOpen className="h-3.5 w-3.5 shrink-0 text-brand-navy/40" /> Pages: {selectedBook.volumeInfo.pageCount || 200} pages</p>
                  </div>
                </div>
              </div>

              {/* Vibe Match Alert */}
              {selectedBook.matchPercentage && (
                <div className="bg-brand-sand/10 border-2 border-brand-sand p-3 rounded-2xl space-y-1 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-brand-navy flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5 text-brand-clay animate-pulse" /> Vibe Match Pick
                    </span>
                    <span className="text-xs font-black text-brand-clay bg-white border border-brand-navy/20 px-2 py-0.5 rounded-full">
                      {selectedBook.matchPercentage}% Match
                    </span>
                  </div>
                  <p className="text-[10px] font-bold text-brand-navy/80 italic leading-relaxed">
                    "{selectedBook.reason}"
                  </p>
                </div>
              )}

              {/* Description Expandable Box */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-brand-navy/60 mb-1">Synopsis</h4>
                <div className="max-h-36 overflow-y-auto text-xs font-medium text-brand-navy/80 leading-relaxed pr-1 border-b border-t border-brand-navy/10 py-2">
                  {selectedBook.volumeInfo.description ? (
                    <div dangerouslySetInnerHTML={{ __html: selectedBook.volumeInfo.description }} />
                  ) : (
                    'No description provided for this volume catalog entry.'
                  )}
                </div>
              </div>

              {/* Add to Shelf Status Selector and Action Button */}
              <div className="pt-2 space-y-4">
                {isBookOnShelf(selectedBook.id) ? (
                  <div className="space-y-3">
                    <div className="rounded-xl border-2 border-brand-sage bg-brand-sage/10 p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-brand-sage flex items-center justify-center text-white">
                          <Check className="h-4 w-4 stroke-[3]" />
                        </div>
                        <span className="text-xs font-extrabold text-brand-navy">Already on your shelf!</span>
                      </div>
                      <span className="text-xs font-bold uppercase bg-brand-paper px-2 py-0.5 rounded-lg border border-brand-navy/20 text-brand-navy">
                        {getBookShelfStatus(selectedBook.id)}
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        const found = books.find(b => b.id === selectedBook.id);
                        onStartReading?.({
                          id: selectedBook.id,
                          title: selectedBook.volumeInfo.title,
                          author: selectedBook.volumeInfo.authors ? selectedBook.volumeInfo.authors.join(', ') : 'Unknown Author',
                          pageCount: selectedBook.volumeInfo.pageCount || 200,
                          initialPage: found ? found.currentPage : 1
                        });
                      }}
                      className="w-full py-3 bg-[#4ECDC4] hover:bg-[#4ECDC4]/90 text-brand-navy border-2 border-brand-navy rounded-2xl font-black flex items-center justify-center gap-2 shadow-[3px_3px_0px_0px_var(--color-brand-navy)] hover:shadow-none transition-all hover:translate-x-[2px] hover:translate-y-[2px]"
                      id="search-book-resume-btn"
                    >
                      <BookOpen className="h-5 w-5" />
                      Resume Immersive Reading
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-extrabold uppercase tracking-wider text-brand-navy/60 mb-1.5">
                          Choose Shelf Status:
                        </label>
                        <div className="grid grid-cols-4 gap-1.5">
                          {(['TBR', 'reading', 'read', 'DNF'] as ReadingStatus[]).map((st) => (
                            <button
                              type="button"
                              key={st}
                              onClick={() => setAddStatus(st)}
                              className={`py-1.5 text-xs font-bold rounded-xl border-2 border-brand-navy transition-all ${
                                addStatus === st
                                  ? 'bg-brand-clay text-white shadow-none'
                                  : 'bg-white text-brand-navy shadow-[2px_2px_0px_0px_var(--color-brand-navy)]'
                              }`}
                            >
                              {st}
                            </button>
                          ))}
                        </div>
                      </div>

                      <button
                        onClick={() => executeAddBook(selectedBook, addStatus)}
                        className="w-full py-2.5 bg-brand-navy hover:bg-brand-navy/90 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-[2px_2px_0px_0px_var(--color-brand-clay)] hover:shadow-none transition-all hover:translate-x-[1px] hover:translate-y-[1px]"
                        id="add-book-shelf-btn"
                      >
                        <Plus className="h-4.5 w-4.5" />
                        Add to Bookshelf
                      </button>
                    </div>

                    <div className="border-t border-brand-navy/10 pt-3">
                      <button
                        onClick={() => {
                          executeAddBook(selectedBook, 'reading');
                          onStartReading?.({
                            id: selectedBook.id,
                            title: selectedBook.volumeInfo.title,
                            author: selectedBook.volumeInfo.authors ? selectedBook.volumeInfo.authors.join(', ') : 'Unknown Author',
                            pageCount: selectedBook.volumeInfo.pageCount || 200,
                            initialPage: 1
                          });
                        }}
                        className="w-full py-3 bg-[#4ECDC4] hover:bg-[#4ECDC4]/90 text-brand-navy border-2 border-brand-navy rounded-2xl font-black flex items-center justify-center gap-2 shadow-[3px_3px_0px_0px_var(--color-brand-navy)] hover:shadow-none transition-all hover:translate-x-[2px] hover:translate-y-[2px]"
                        id="search-book-read-btn"
                      >
                        <BookOpen className="h-5 w-5" />
                        Read Instantly for Free
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
