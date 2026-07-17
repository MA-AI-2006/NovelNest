import React, { createContext, useContext, useState, useEffect } from 'react';
import { Book, ForumPost, UserProfile, Streak, ReadingStatus, BookNote, ForumReply } from '../types';
import { DEFAULT_USER, DEFAULT_BOOKS, DEFAULT_STREAK, DEFAULT_FORUM_POSTS } from '../defaultData';
import { initFirebaseClient, onAuthStateChanged, signOut as firebaseSignOut } from '../lib/firebase';

const MOCK_BOOK_IDS = ['hobb1t', 'atom1c', 'tomorr0w', 'inf1n1te'];
const MOCK_KEYS = [
  '2026-07-11', '2026-07-12', '2026-07-13', '2026-07-14', '2026-07-15',
  '2026-07-01', '2026-07-02', '2026-07-03', '2026-07-05', '2026-07-06',
  '2026-07-07', '2026-07-08'
];

function cleanRetrievedBooks(booksList: Book[]): Book[] {
  if (!booksList) return [];
  return booksList.filter(b => !MOCK_BOOK_IDS.includes(b.id));
}

function cleanRetrievedStreak(streakObj: Streak): Streak {
  if (!streakObj) return { currentStreak: 0, longestStreak: 0, lastActiveDate: '', activityHistory: {} };
  const cleanHistory = { ...streakObj.activityHistory };
  let hasMockKeys = false;
  MOCK_KEYS.forEach(key => {
    if (cleanHistory[key] !== undefined) {
      delete cleanHistory[key];
      hasMockKeys = true;
    }
  });

  if (hasMockKeys || streakObj.currentStreak === 5 || streakObj.longestStreak === 14) {
    return {
      currentStreak: streakObj.currentStreak === 5 ? 0 : streakObj.currentStreak,
      longestStreak: streakObj.longestStreak === 14 ? 0 : streakObj.longestStreak,
      lastActiveDate: streakObj.lastActiveDate === '2026-07-15' ? '' : streakObj.lastActiveDate,
      activityHistory: cleanHistory
    };
  }
  return streakObj;
}

interface AppContextType {
  user: UserProfile | null;
  books: Book[];
  streak: Streak;
  forumPosts: ForumPost[];
  isSyncing: boolean;
  login: (displayName: string, email: string, photoURL?: string, uid?: string) => void;
  logout: () => void;
  addBook: (book: Omit<Book, 'currentPage' | 'userRating' | 'review' | 'dateAdded'>) => void;
  updateBookStatus: (id: string, status: ReadingStatus) => void;
  updateBookProgress: (id: string, page: number) => void;
  rateBook: (id: string, rating: number) => void;
  reviewBook: (id: string, review: string) => void;
  addBookNote: (id: string, content: string, page?: number, chapter?: string) => void;
  deleteBookNote: (bookId: string, noteId: string) => void;
  removeBook: (id: string) => void;
  logPagesRead: (pages: number) => void;
  addForumPost: (content: string, type: 'review' | 'thought' | 'milestone', bookId?: string, bookTitle?: string, rating?: number) => void;
  addForumReply: (postId: string, content: string) => void;
  toggleLikePost: (postId: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('lib_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [books, setBooks] = useState<Book[]>(() => {
    const saved = localStorage.getItem('lib_books');
    return saved ? cleanRetrievedBooks(JSON.parse(saved)) : DEFAULT_BOOKS;
  });

  const [streak, setStreak] = useState<Streak>(() => {
    const saved = localStorage.getItem('lib_streak');
    return saved ? cleanRetrievedStreak(JSON.parse(saved)) : DEFAULT_STREAK;
  });

  const [forumPosts, setForumPosts] = useState<ForumPost[]>(() => {
    const saved = localStorage.getItem('lib_forum');
    return saved ? JSON.parse(saved) : DEFAULT_FORUM_POSTS;
  });

  const [isSyncing, setIsSyncing] = useState(false);

  // Sync to local storage
  useEffect(() => {
    if (user) {
      localStorage.setItem('lib_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('lib_user');
    }
  }, [user]);

  useEffect(() => {
    localStorage.setItem('lib_books', JSON.stringify(books));
  }, [books]);

  useEffect(() => {
    localStorage.setItem('lib_streak', JSON.stringify(streak));
  }, [streak]);

  useEffect(() => {
    localStorage.setItem('lib_forum', JSON.stringify(forumPosts));
  }, [forumPosts]);

  // Purge any leftover mock data from previous sessions to guarantee a clean state
  useEffect(() => {
    if (books.some(b => ['hobb1t', 'atom1c', 'tomorr0w', 'inf1n1te'].includes(b.id)) || (streak.activityHistory && streak.activityHistory['2026-07-11'] !== undefined)) {
      setBooks([]);
      const freshStreak: Streak = {
        currentStreak: 0,
        longestStreak: 0,
        lastActiveDate: '',
        activityHistory: {}
      };
      setStreak(freshStreak);
      localStorage.setItem('lib_books', JSON.stringify([]));
      localStorage.setItem('lib_streak', JSON.stringify(freshStreak));
    }
  }, []);

  // Daily app-open streak tracker (e.g. 1 today, 2 tomorrow)
  useEffect(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    
    setStreak(prev => {
      const lastActive = prev.lastActiveDate;
      if (lastActive === todayStr) {
        return prev;
      }
      
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      let current = prev.currentStreak;
      let longest = prev.longestStreak;
      
      if (lastActive === yesterdayStr || lastActive === '') {
        current += 1;
      } else {
        // Streak was broken or reset
        current = 1;
      }
      
      if (current > longest) {
        longest = current;
      }
      
      const updatedHistory = { ...prev.activityHistory };
      if (updatedHistory[todayStr] === undefined) {
        updatedHistory[todayStr] = 0;
      }
      
      return {
        currentStreak: current,
        longestStreak: longest,
        lastActiveDate: todayStr,
        activityHistory: updatedHistory
      };
    });
  }, [user]);

  // Load shared global forum posts on startup
  useEffect(() => {
    const fetchForum = async () => {
      try {
        const res = await fetch('/api/forum');
        if (res.ok) {
          const data = await res.json();
          setForumPosts(data.forumPosts);
        }
      } catch (err) {
        console.error('Failed to load shared forum posts:', err);
      }
    };
    fetchForum();
  }, []);

  // Synchronize client-side Firebase Auth state with local AppContext user state
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    
    const setupAuthListener = async () => {
      try {
        const { auth } = await initFirebaseClient();
        if (!auth) return;
        
        unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
          if (firebaseUser) {
            console.log('[Firebase Client] Auth user state detected:', firebaseUser.email);
            const email = firebaseUser.email || '';
            const displayName = firebaseUser.displayName || email.split('@')[0] || 'Reader';
            const photoURL = firebaseUser.photoURL || `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${encodeURIComponent(displayName)}`;
            
            setUser(prevUser => {
              // Only update if not already logged in with this exact user, to prevent infinite loops
              if (prevUser && prevUser.email === email && prevUser.uid === firebaseUser.uid) {
                return prevUser;
              }
              return {
                uid: firebaseUser.uid,
                displayName,
                email,
                photoURL,
                joinedAt: prevUser?.joinedAt || new Date().toISOString().split('T')[0],
                dailyGoal: prevUser?.dailyGoal || 30,
                yearlyGoal: prevUser?.yearlyGoal || 12
              };
            });
          }
        });
      } catch (err) {
        console.warn('[Firebase Client] Failed to register auth state listener:', err);
      }
    };
    
    setupAuthListener();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Sync from cloud database when user loads or signs in
  useEffect(() => {
    if (!user) return;

    const syncFromCloud = async () => {
      setIsSyncing(true);
      try {
        const res = await fetch(`/api/user/data?email=${encodeURIComponent(user.email)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.exists) {
            if (data.profile) setUser(data.profile);
            if (data.books) setBooks(cleanRetrievedBooks(data.books));
            if (data.streak) setStreak(cleanRetrievedStreak(data.streak));
          } else {
            // Seed cloud database with the current local storage data
            await fetch('/api/user/data', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: user.email,
                profile: user,
                books,
                streak
              })
            });
          }
        }
      } catch (err) {
        console.error('Cloud load failed, falling back to local database:', err);
      } finally {
        setIsSyncing(false);
      }
    };

    syncFromCloud();
  }, [user?.email]);

  // Autosave and back-up to server-side DB on change
  useEffect(() => {
    if (!user) return;

    const delayDebounce = setTimeout(async () => {
      setIsSyncing(true);
      try {
        await fetch('/api/user/data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: user.email,
            profile: user,
            books,
            streak
          })
        });
      } catch (err) {
        console.error('Autosave sync failed:', err);
      } finally {
        setIsSyncing(false);
      }
    }, 1500);

    return () => clearTimeout(delayDebounce);
  }, [books, streak, user]);

  const login = (displayName: string, email: string, photoURL?: string, uid?: string) => {
    const newUser: UserProfile = {
      uid: uid || (displayName.toLowerCase().replace(/\s+/g, '_') + '_' + Math.floor(Math.random() * 1000)),
      displayName,
      email,
      photoURL: photoURL || `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${encodeURIComponent(displayName)}`,
      joinedAt: new Date().toISOString().split('T')[0],
      dailyGoal: 30,
      yearlyGoal: 12,
    };
    setUser(newUser);
  };

  const logout = () => {
    setUser(null);
    initFirebaseClient().then(({ auth }) => {
      if (auth) {
        firebaseSignOut(auth).catch(err => console.warn('[Firebase SignOut Error]', err));
      }
    });
  };

  const addBook = (newBookData: Omit<Book, 'currentPage' | 'userRating' | 'review' | 'dateAdded'>) => {
    // Check if book already exists
    if (books.some(b => b.id === newBookData.id)) return;

    const newBook: Book = {
      ...newBookData,
      currentPage: 0,
      userRating: 0,
      review: '',
      dateAdded: new Date().toISOString().split('T')[0],
      notes: [],
    };
    setBooks(prev => [newBook, ...prev]);

    // Post to forum
    if (user) {
      addForumPost(
        `Just added "${newBook.title}" by ${newBook.authors.join(', ')} to my ${newBook.status} shelf! Can't wait to dive into this.`,
        'thought',
        newBook.id,
        newBook.title
      );
    }
  };

  const updateBookStatus = (id: string, status: ReadingStatus) => {
    setBooks(prev => prev.map(book => {
      if (book.id !== id) return book;
      
      const updates: Partial<Book> = { status };
      const today = new Date().toISOString().split('T')[0];
      
      if (status === 'reading' && !book.dateStarted) {
        updates.dateStarted = today;
      } else if (status === 'read') {
        updates.dateCompleted = today;
        updates.currentPage = book.pageCount; // auto max pages
        
        // Post a milestone
        if (user) {
          addForumPost(
            `Celebration time! 🎉 I have successfully finished reading "${book.title}"! Page count: ${book.pageCount} pages. What an incredible journey!`,
            'milestone',
            book.id,
            book.title
          );
        }
      } else if (status === 'DNF' && user) {
        // Post a milestone/thought
        addForumPost(
          `Decided to close "${book.title}" for now. Marked as DNF. Not every book is for every moment, and that's okay! On to the next adventure.`,
          'milestone',
          book.id,
          book.title
        );
      }
      
      return { ...book, ...updates };
    }));
  };

  const updateBookProgress = (id: string, page: number) => {
    setBooks(prev => prev.map(book => {
      if (book.id !== id) return book;
      
      const cleanPage = Math.max(0, Math.min(book.pageCount, page));
      const pagesDiff = cleanPage - book.currentPage;
      
      const updates: Partial<Book> = { currentPage: cleanPage };
      
      if (cleanPage === book.pageCount && book.status !== 'read') {
        updates.status = 'read';
        updates.dateCompleted = new Date().toISOString().split('T')[0];
        
        if (user) {
          addForumPost(
            `Finished reading "${book.title}"! Reached page ${cleanPage} of ${book.pageCount}. 🎉`,
            'milestone',
            book.id,
            book.title
          );
        }
      } else if (cleanPage > 0 && book.status === 'TBR') {
        updates.status = 'reading';
        updates.dateStarted = new Date().toISOString().split('T')[0];
      }
      
      // Log reading activity if positive
      if (pagesDiff > 0) {
        setTimeout(() => logPagesRead(pagesDiff), 50);
      }
      
      return { ...book, ...updates };
    }));
  };

  const rateBook = (id: string, rating: number) => {
    setBooks(prev => prev.map(book => {
      if (book.id !== id) return book;
      return { ...book, userRating: rating };
    }));
  };

  const reviewBook = (id: string, review: string) => {
    setBooks(prev => prev.map(book => {
      if (book.id !== id) return book;
      
      // Update book and trigger forum post
      if (user && review.trim().length > 0) {
        addForumPost(
          review,
          'review',
          book.id,
          book.title,
          book.userRating || 5
        );
      }
      
      return { ...book, review };
    }));
  };

  const addBookNote = (id: string, content: string, page?: number, chapter?: string) => {
    const newNote: BookNote = {
      id: Math.random().toString(36).substr(2, 9),
      page,
      chapter,
      content,
      timestamp: new Date().toISOString(),
    };

    setBooks(prev => prev.map(book => {
      if (book.id !== id) return book;
      return {
        ...book,
        notes: [newNote, ...(book.notes || [])]
      };
    }));
  };

  const deleteBookNote = (bookId: string, noteId: string) => {
    setBooks(prev => prev.map(book => {
      if (book.id !== bookId) return book;
      return {
        ...book,
        notes: (book.notes || []).filter(note => note.id !== noteId)
      };
    }));
  };

  const removeBook = (id: string) => {
    setBooks(prev => prev.filter(book => book.id !== id));
  };

  const logPagesRead = (pages: number) => {
    if (pages <= 0) return;

    const todayStr = new Date().toISOString().split('T')[0];
    
    setStreak(prev => {
      const history = { ...prev.activityHistory };
      history[todayStr] = (history[todayStr] || 0) + pages;
      
      // Re-calculate streak
      let current = prev.currentStreak;
      let longest = prev.longestStreak;
      
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      const lastActive = prev.lastActiveDate;
      
      if (lastActive !== todayStr) {
        if (lastActive === yesterdayStr || lastActive === '') {
          current += 1;
        } else {
          // Streak was broken, reset to 1
          current = 1;
        }
      }
      
      if (current > longest) {
        longest = current;
      }
      
      return {
        currentStreak: current,
        longestStreak: longest,
        lastActiveDate: todayStr,
        activityHistory: history
      };
    });
  };

  const addForumPost = async (
    content: string,
    type: 'review' | 'thought' | 'milestone',
    bookId?: string,
    bookTitle?: string,
    rating?: number
  ) => {
    if (!user) return;

    const newPost: ForumPost = {
      id: 'fp_' + Math.random().toString(36).substr(2, 9),
      userId: user.uid,
      userDisplayName: user.displayName,
      userPhotoURL: user.photoURL,
      bookId,
      bookTitle,
      type,
      content,
      rating,
      timestamp: new Date().toISOString(),
      likes: [],
      replies: []
    };

    setForumPosts(prev => [newPost, ...prev]);

    try {
      const res = await fetch('/api/forum/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post: newPost })
      });
      if (res.ok) {
        const data = await res.json();
        setForumPosts(data.forumPosts);
      }
    } catch (err) {
      console.error('Failed to post to forum:', err);
    }
  };

  const addForumReply = async (postId: string, content: string) => {
    if (!user) return;

    const newReply: ForumReply = {
      id: 'fr_' + Math.random().toString(36).substr(2, 9),
      userId: user.uid,
      userDisplayName: user.displayName,
      userPhotoURL: user.photoURL,
      content,
      timestamp: new Date().toISOString()
    };

    setForumPosts(prev => prev.map(post => {
      if (post.id !== postId) return post;
      return {
        ...post,
        replies: [...post.replies, newReply]
      };
    }));

    try {
      const res = await fetch('/api/forum/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, reply: newReply })
      });
      if (res.ok) {
        const data = await res.json();
        setForumPosts(data.forumPosts);
      }
    } catch (err) {
      console.error('Failed to reply:', err);
    }
  };

  const toggleLikePost = async (postId: string) => {
    if (!user) return;

    setForumPosts(prev => prev.map(post => {
      if (post.id !== postId) return post;
      
      const hasLiked = post.likes.includes(user.uid);
      const likes = hasLiked
        ? post.likes.filter(id => id !== user.uid)
        : [...post.likes, user.uid];
        
      return { ...post, likes };
    }));

    try {
      const res = await fetch('/api/forum/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, userId: user.uid })
      });
      if (res.ok) {
        const data = await res.json();
        setForumPosts(data.forumPosts);
      }
    } catch (err) {
      console.error('Failed to toggle like:', err);
    }
  };

  return (
    <AppContext.Provider value={{
      user,
      books,
      streak,
      forumPosts,
      isSyncing,
      login,
      logout,
      addBook,
      updateBookStatus,
      updateBookProgress,
      rateBook,
      reviewBook,
      addBookNote,
      deleteBookNote,
      removeBook,
      logPagesRead,
      addForumPost,
      addForumReply,
      toggleLikePost
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
