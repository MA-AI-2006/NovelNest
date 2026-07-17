import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Bookshelf } from './components/Bookshelf';
import { BookSearch } from './components/BookSearch';
import { StreakTracker } from './components/StreakTracker';
import { StatsDashboard } from './components/StatsDashboard';
import { Forum } from './components/Forum';
import { DigitalReader } from './components/DigitalReader';
import { AuthModal } from './components/AuthModal';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, Search, Flame, BarChart3, MessageSquare, 
  LogIn, LogOut, Sparkles, User, HelpCircle, GraduationCap, 
  Laptop, Shield, Mail, CheckCircle2, Star, ArrowRight
} from 'lucide-react';

type TabType = 'shelf' | 'search' | 'streak' | 'stats' | 'forum';

const MainAppContent: React.FC = () => {
  const { user, login, logout, streak, updateBookProgress, logPagesRead, isSyncing } = useApp();
  const [activeTab, setActiveTab] = useState<TabType>('shelf');
  
  // Auth modal open state (defaults to true for non-authenticated users)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [signInError, setSignInError] = useState('');

  // Active immersive reading state
  const [readingBook, setReadingBook] = useState<{
    id: string;
    title: string;
    author: string;
    pageCount?: number;
    initialPage?: number;
  } | null>(null);

  // Tabs structure
  const tabs = [
    { id: 'shelf', label: 'My Bookshelf', icon: BookOpen, color: 'border-brand-clay' },
    { id: 'search', label: 'Library Finder', icon: Search, color: 'border-brand-clay' },
    { id: 'streak', label: 'Streak Tracker', icon: Flame, color: 'border-brand-clay' },
    { id: 'stats', label: 'Visual Stats', icon: BarChart3, color: 'border-brand-clay' },
    { id: 'forum', label: 'Reading Circle', icon: MessageSquare, color: 'border-brand-clay' },
  ];

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    setSignInError('');
    try {
      const origin = window.location.origin;
      const response = await fetch(`/api/auth/url?origin=${encodeURIComponent(origin)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch Google OAuth URL. Please verify server configuration.');
      }
      const { url } = await response.json();

      // Open Google OAuth popup window in center of screen
      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      const authWindow = window.open(
        url,
        'google_oauth_popup',
        `width=${width},height=${height},top=${top},left=${left},scrollbars=yes,status=yes`
      );

      if (!authWindow) {
        throw new Error('Popup window was blocked by your browser. Please allow popups for this site to sign in.');
      }
    } catch (err: any) {
      console.error('[OAuth Client Error]:', err);
      setSignInError(err.message || 'Authentication failed. Please try again.');
      setIsSigningIn(false);
    }
  };

  React.useEffect(() => {
    const handleAuthMessage = (event: MessageEvent) => {
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost') && !origin.includes('127.0.0.1')) {
        return;
      }

      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        const profile = event.data.user;
        if (profile && profile.email) {
          login(profile.name, profile.email, profile.picture);
        }
        setIsSigningIn(false);
      }
    };

    window.addEventListener('message', handleAuthMessage);
    return () => window.removeEventListener('message', handleAuthMessage);
  }, [login]);

  const handleSaveProgress = (pagesReadThisSession: number, finalPage: number) => {
    if (readingBook) {
      // 1. Sync reading progress of the book on their shelf
      updateBookProgress(readingBook.id, finalPage);
      
      // 2. Log actual pages read into the streak/habit tracker
      if (pagesReadThisSession > 0) {
        logPagesRead(pagesReadThisSession);
      }
    }
    setReadingBook(null);
  };

  // Render sub-components
  const renderActiveComponent = () => {
    switch (activeTab) {
      case 'shelf':
        return <Bookshelf onStartReading={(book) => setReadingBook(book)} />;
      case 'search':
        return <BookSearch onStartReading={(book) => setReadingBook(book)} />;
      case 'streak':
        return <StreakTracker />;
      case 'stats':
        return <StatsDashboard />;
      case 'forum':
        return <Forum />;
      default:
        return <Bookshelf onStartReading={(book) => setReadingBook(book)} />;
    }
  };

  // 1. Gate standard app entirely behind Sign In / Registration
  if (!user) {
    return (
      <div className="min-h-screen bg-brand-cream text-brand-navy flex flex-col justify-between p-4 sm:p-6 font-sans selection:bg-brand-sand selection:text-brand-navy">
        
        {/* Floating Background Accents */}
        <div className="absolute top-10 left-10 w-32 h-32 bg-[#4ECDC4]/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-48 h-48 bg-[#FF6B6B]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-md w-full mx-auto my-auto relative z-10">
          
          {/* Main Logo Card */}
          <div className="text-center mb-8">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-3xl border-4 border-brand-navy bg-[#FF6B6B] text-white shadow-[4px_4px_0px_0px_var(--color-brand-navy)] mb-4 animate-bounce">
              <BookOpen className="h-8 w-8 stroke-[2.5]" />
            </div>
            <h1 className="text-4xl font-black tracking-tight font-serif text-brand-navy">
              Novel<span className="text-[#FF6B6B]">Nest</span>.
            </h1>
            <p className="text-xs font-bold text-brand-navy/60 uppercase tracking-widest mt-2">
              Where books meet soul.
            </p>
          </div>

          {/* Login Gate Box */}
          <div className="rounded-3xl border-4 border-brand-navy bg-white p-6 sm:p-8 shadow-[8px_8px_0px_0px_var(--color-brand-navy)] space-y-6">
            
            {/* Box Header */}
            <div className="text-center pb-2 border-b-2 border-dashed border-brand-navy/10">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFE66D]/20 border border-[#FFE66D] text-xs font-bold text-brand-navy">
                <Sparkles className="h-3.5 w-3.5 text-orange-500 fill-orange-100" /> Firebase Integration Active
              </div>
              <h2 className="text-lg font-black text-brand-navy mt-3">Clubhouse Auth Gateway</h2>
              <p className="text-xs font-semibold text-brand-navy/60 mt-1">
                Access your personal bookshelf, track reader stats, and join the community circle.
              </p>
            </div>

            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className="w-full py-4 rounded-2xl border-2 border-brand-navy bg-[#FF6B6B] hover:bg-[#FF6B6B]/90 text-xs font-black uppercase tracking-wider text-white shadow-[4px_4px_0px_0px_var(--color-brand-navy)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all flex items-center justify-center gap-2"
                id="open-auth-portal-btn"
              >
                <LogIn className="h-5 w-5 mr-1" />
                Open Auth Portal (Google / Email)
              </button>
              
              <p className="text-[10px] text-center font-bold text-brand-navy/50 uppercase tracking-wider">
                Click above to log in or create a brand new account
              </p>
            </div>

            {/* Platform Security Banner */}
            <div className="bg-[#4ECDC4]/10 rounded-2xl border border-[#4ECDC4]/30 p-3 flex gap-2.5 items-start">
              <Shield className="h-5 w-5 text-brand-clay shrink-0 mt-0.5" />
              <div className="text-[10px] font-bold text-brand-navy/70 leading-relaxed">
                <strong>Custom Firebase Auth Project:</strong> Your login connects directly to your newly configured Firebase authentication database for full cross-device security.
              </div>
            </div>

          </div>
        </div>

        {/* Auth Modal renders here so it's active in the tree */}
        <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />

        {/* Mini landing footer */}
        <footer className="text-center text-[10px] font-bold opacity-40 mt-8">
          NovelNest Reading App • Connected to Firebase Auth & Firestore
        </footer>
      </div>
    );
  }

  // 2. Main Authenticated Application Dashboard
  return (
    <div className="min-h-screen bg-brand-cream text-brand-navy flex flex-col pb-12 font-sans selection:bg-brand-sand selection:text-brand-navy relative">
      
      {/* Immersive Reader Overlay (Renders full-screen over the whole app when active!) */}
      <AnimatePresence>
        {readingBook && (
          <motion.div
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="fixed inset-0 z-50"
          >
            <DigitalReader
              bookId={readingBook.id}
              title={readingBook.title}
              author={readingBook.author}
              pageCount={readingBook.pageCount}
              initialPage={readingBook.initialPage}
              onClose={() => setReadingBook(null)}
              onSaveProgress={handleSaveProgress}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Navigation Header */}
      <header className="border-b-4 border-brand-navy bg-brand-paper py-4 px-4 sm:px-6 shadow-[0px_4px_0px_0px_var(--color-brand-navy)]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          
          {/* Logo Brand Title */}
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl border-2 border-brand-navy bg-brand-clay flex items-center justify-center text-white shadow-[3px_3px_0px_0px_var(--color-brand-navy)]">
              <BookOpen className="h-6 w-6 stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-1.5 leading-none font-serif">
                Novel<span className="text-brand-clay">Nest</span>.
              </h1>
              <p className="text-[10px] sm:text-xs font-bold text-brand-navy/60 uppercase tracking-widest mt-1">
                Your Aesthetic Reading Companion & Interactive Library
              </p>
            </div>
          </div>

          {/* User Section & Authentication Trigger */}
          <div className="flex items-center gap-3">
            {/* Real-time server sync indicator badge */}
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border-2 border-brand-navy bg-white text-[10px] font-bold shadow-[2px_2px_0px_0px_var(--color-brand-navy)] transition-all ${isSyncing ? 'text-brand-clay animate-pulse' : 'text-brand-navy'}`}>
              <span className={`h-2 w-2 rounded-full ${isSyncing ? 'bg-brand-clay animate-ping' : 'bg-brand-sage'}`} />
              {isSyncing ? 'Saving to Cloud...' : 'Cloud Synced ☁️'}
            </div>

            <div className="flex items-center gap-3 bg-white border-2 border-brand-navy p-1.5 pr-3 rounded-2xl shadow-[3px_3px_0px_0px_var(--color-brand-navy)]">
              <img
                src={user.photoURL}
                alt={user.displayName}
                className="h-9 w-9 rounded-full border-2 border-brand-navy object-cover"
              />
              <div className="hidden sm:block leading-none">
                <p className="text-xs font-extrabold text-brand-navy truncate max-w-28">{user.displayName}</p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="h-2 w-2 rounded-full bg-brand-sage border border-brand-navy animate-pulse" />
                  <span className="text-[9px] font-mono font-bold text-brand-navy/50">{streak.currentStreak}d Streak</span>
                </div>
              </div>
              <button
                onClick={logout}
                className="p-1.5 rounded-xl border border-brand-navy/20 hover:border-brand-navy hover:bg-brand-paper transition-all ml-1"
                title="Sign Out of Library"
                id="signout-header-btn"
              >
                <LogOut className="h-4.5 w-4.5 text-brand-navy/60" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Primary Navigation Tabs */}
      <nav className="my-6 px-4">
        <div className="max-w-6xl mx-auto overflow-x-auto no-scrollbar py-2">
          <div className="flex gap-2.5 min-w-max justify-start md:justify-center px-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border-2 text-xs font-bold transition-all ${
                    isActive
                      ? 'border-brand-navy bg-brand-clay text-white shadow-none translate-y-[2px]'
                      : 'border-brand-navy bg-white text-brand-navy shadow-[4px_4px_0px_0px_var(--color-brand-navy)] hover:-translate-y-[1px]'
                  }`}
                  id={`tab-${tab.id}`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                  {tab.id === 'streak' && streak.currentStreak > 0 && (
                    <span className="ml-0.5 bg-brand-sand text-brand-navy text-[9px] font-black px-1.5 py-0.2 rounded-md animate-pulse">
                      {streak.currentStreak}d
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Container Stage */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {renderActiveComponent()}
          </motion.div>
        </AnimatePresence>
      </main>


    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainAppContent />
    </AppProvider>
  );
}
