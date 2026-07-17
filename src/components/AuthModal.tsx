import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { motion, AnimatePresence } from 'motion/react';
import { X, Lock, Sparkles, LogIn, Mail, Key, User, ArrowRight } from 'lucide-react';
import { 
  initFirebaseClient, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile 
} from '../lib/firebase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type AuthTab = 'google' | 'email';
type EmailMode = 'signin' | 'signup';

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { login } = useApp();
  const [activeTab, setActiveTab] = useState<AuthTab>('google');
  const [emailMode, setEmailMode] = useState<EmailMode>('signin');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Email/password form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError('');
    let isFirebaseConfigLoaded = false;
    try {
      // 1. Try to initialize client-side Firebase Auth first (User's custom project)
      const { auth, googleProvider, isInitialized } = await initFirebaseClient();
      isFirebaseConfigLoaded = isInitialized;
      
      if (isInitialized && auth && googleProvider) {
        console.log('[Firebase Client] Attempting direct client-side Google popup sign-in...');
        const userCredential = await signInWithPopup(auth, googleProvider);
        const fbUser = userCredential.user;
        if (fbUser && fbUser.email) {
          console.log('[Firebase Client] Direct Google sign-in successful:', fbUser.email);
          login(
            fbUser.displayName || fbUser.email.split('@')[0],
            fbUser.email,
            fbUser.photoURL || undefined,
            fbUser.uid
          );
          onClose();
          setIsLoading(false);
          return;
        }
      }
    } catch (fbErr: any) {
      console.warn('[Firebase Client Warning] Client-side Google Sign-In bypass/failure:', fbErr.message || fbErr);
      if (isFirebaseConfigLoaded) {
        // Since we have a custom Firebase configuration, do NOT fall back to server-side Google OAuth.
        // Instead, explain the sandbox limitation and instruct the user to use the Email & Password tab.
        setError('Google Popup authentication is restricted inside the preview sandbox iframe. Please use the "Email & Password" tab above to sign up/login, or open the app in a new tab to try Google Sign-In.');
        setIsLoading(false);
        return;
      }
    }

    // 2. Fall back to standard server-side Google OAuth popup flow (only if custom Firebase is NOT loaded)
    try {
      const origin = window.location.origin;
      const response = await fetch(`/api/auth/url?origin=${encodeURIComponent(origin)}`);
      if (!response.ok) {
        throw new Error('Failed to retrieve authentication details from server.');
      }
      const { url } = await response.json();

      // Open OAuth popup window
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
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all required fields.');
      return;
    }
    if (emailMode === 'signup' && !displayName) {
      setError('Please provide a display name.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const { auth, isInitialized } = await initFirebaseClient();
      if (!isInitialized || !auth) {
        throw new Error('Firebase is not yet configured or reachable. Please check your firebase-applet-config.json file.');
      }

      if (emailMode === 'signup') {
        // Register new user
        console.log('[Firebase Client] Creating new email user:', email);
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const fbUser = userCredential.user;
        
        // Update profile with display name
        await updateProfile(fbUser, {
          displayName: displayName
        });

        console.log('[Firebase Client] Registration successful for:', fbUser.email);
        login(displayName, fbUser.email || email, undefined, fbUser.uid);
      } else {
        // Sign in existing user
        console.log('[Firebase Client] Signing in existing user:', email);
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const fbUser = userCredential.user;
        
        console.log('[Firebase Client] Login successful for:', fbUser.email);
        login(
          fbUser.displayName || fbUser.email?.split('@')[0] || 'Reader',
          fbUser.email || email,
          fbUser.photoURL || undefined,
          fbUser.uid
        );
      }
      
      onClose();
    } catch (err: any) {
      console.error('[Email Auth Error]:', err);
      let friendlyMessage = err.message || 'Authentication failed.';
      if (err.code === 'auth/invalid-credential') {
        friendlyMessage = 'Invalid email or password. Please try again.';
      } else if (err.code === 'auth/email-already-in-use') {
        friendlyMessage = 'This email is already registered. Try signing in instead!';
      } else if (err.code === 'auth/weak-password') {
        friendlyMessage = 'Password is too weak. Please use at least 6 characters.';
      } else if (err.code === 'auth/invalid-email') {
        friendlyMessage = 'Invalid email address format.';
      }
      setError(friendlyMessage);
    } finally {
      setIsLoading(false);
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
          onClose();
        }
        setIsLoading(false);
      }
    };

    window.addEventListener('message', handleAuthMessage);
    return () => window.removeEventListener('message', handleAuthMessage);
  }, [login, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-brand-navy"
        />

        {/* Modal content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative w-full max-w-md overflow-hidden rounded-3xl border-4 border-brand-navy bg-brand-cream p-6 shadow-[8px_8px_0px_0px_var(--color-brand-navy)]"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 rounded-full border-2 border-brand-navy bg-brand-paper hover:bg-brand-sand transition-colors text-brand-navy"
            id="auth-close-btn"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Header */}
          <div className="mb-6 mt-2 text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-brand-navy bg-brand-sand text-brand-navy mb-3">
              <Sparkles className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight text-brand-navy">
              Bookworm Clubhouse
            </h2>
            <p className="text-sm font-medium text-brand-navy/70 mt-1">
              Connect your Firebase project database & auth
            </p>
          </div>

          {/* Authentication Tabs */}
          <div className="flex border-2 border-brand-navy rounded-xl overflow-hidden bg-brand-paper mb-6">
            <button
              type="button"
              onClick={() => { setActiveTab('google'); setError(''); }}
              className={`flex-1 py-2 text-xs font-black uppercase tracking-wider transition-colors ${
                activeTab === 'google' 
                  ? 'bg-brand-navy text-white' 
                  : 'text-brand-navy hover:bg-brand-sand'
              }`}
            >
              Google Account
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('email'); setError(''); }}
              className={`flex-1 py-2 text-xs font-black uppercase tracking-wider transition-colors ${
                activeTab === 'email' 
                  ? 'bg-brand-navy text-white' 
                  : 'text-brand-navy hover:bg-brand-sand'
              }`}
            >
              Email & Password
            </button>
          </div>

          {/* Auth Forms */}
          <div className="space-y-4">
            {error && (
              <div className="p-3 rounded-xl border-2 border-brand-navy bg-[#FF6B6B]/15 text-xs font-bold text-[#FF6B6B] text-center">
                {error}
              </div>
            )}

            {isLoading ? (
              <div className="py-8 flex flex-col items-center justify-center space-y-3">
                <div className="h-10 w-10 rounded-full border-4 border-brand-navy border-t-brand-clay animate-spin" />
                <p className="text-xs font-black uppercase tracking-widest text-brand-navy/60 animate-pulse">Authenticating...</p>
              </div>
            ) : (
              <div>
                {activeTab === 'google' ? (
                  <div className="space-y-4 py-2">
                    <button
                      type="button"
                      onClick={handleGoogleSignIn}
                      className="w-full flex items-center justify-center gap-3 p-4 rounded-2xl border-2 border-brand-navy text-sm font-bold bg-[#FF6B6B] text-white shadow-[4px_4px_0px_0px_var(--color-brand-navy)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
                      id="auth-google-btn"
                    >
                      <svg className="h-5 w-5 bg-white p-0.5 rounded-full mr-1 shrink-0" viewBox="0 0 24 24">
                        <path fill="#EA4335" d="M20.6,10.2C20.6,9.6,20.5,9,20.4,8.5H12v3.3h4.8c-0.2,1.1-0.8,2-1.8,2.7v2.2h2.9C19.7,15.2,20.6,12.9,20.6,10.2z"/>
                        <path fill="#4285F4" d="M12,21c2.4,0,4.5-0.8,6-2.2l-2.9-2.2c-0.8,0.5-1.9,0.9-3.1,0.9c-2.4,0-4.4-1.6-5.1-3.8H3.9v2.3C5.4,19.1,8.5,21,12,21z"/>
                        <path fill="#FBBC05" d="M6.9,13.7C6.7,13.1,6.6,12.6,6.6,12c0-0.6,0.1-1.1,0.3-1.7V8H3.9C3.3,9.2,3,10.6,3,12c0,1.4,0.3,2.8,0.9,4l3-2.3H6.9z"/>
                        <path fill="#34A853" d="M12,6.6c1.3,0,2.5,0.5,3.4,1.3l2.6-2.6C16.5,4,14.4,3,12,3C8.5,3,5.4,4.9,3.9,8l3,2.3C7.6,8.2,9.6,6.6,12,6.6z"/>
                      </svg>
                      Sign In with Google
                    </button>
                    <p className="text-[11px] text-center font-medium text-brand-navy/60 leading-relaxed px-4">
                      Uses direct Google popup client-side Auth if your Firebase config is loaded, otherwise falls back to standard secure Google Sandbox OAuth.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleEmailAuth} className="space-y-4">
                    {emailMode === 'signup' && (
                      <div className="space-y-1">
                        <label className="text-xs font-black uppercase text-brand-navy/70">Display Name</label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-navy/40" />
                          <input
                            type="text"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder="Alex Reader"
                            className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-brand-navy bg-brand-paper text-sm font-bold text-brand-navy placeholder-brand-navy/30 focus:outline-none focus:ring-2 focus:ring-brand-clay"
                            required
                          />
                        </div>
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="text-xs font-black uppercase text-brand-navy/70">Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-navy/40" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="alex@example.com"
                          className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-brand-navy bg-brand-paper text-sm font-bold text-brand-navy placeholder-brand-navy/30 focus:outline-none focus:ring-2 focus:ring-brand-clay"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-black uppercase text-brand-navy/70">Password</label>
                      <div className="relative">
                        <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-navy/40" />
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-brand-navy bg-brand-paper text-sm font-bold text-brand-navy placeholder-brand-navy/30 focus:outline-none focus:ring-2 focus:ring-brand-clay"
                          minLength={6}
                          required
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full flex items-center justify-center gap-2 p-3.5 rounded-xl border-2 border-brand-navy text-sm font-black uppercase tracking-wider bg-brand-sand text-brand-navy shadow-[4px_4px_0px_0px_var(--color-brand-navy)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all mt-4"
                    >
                      {emailMode === 'signin' ? 'Sign In' : 'Create Account'}
                      <ArrowRight className="h-4 w-4 shrink-0 ml-1" />
                    </button>

                    <div className="text-center mt-3">
                      <button
                        type="button"
                        onClick={() => {
                          setEmailMode(emailMode === 'signin' ? 'signup' : 'signin');
                          setError('');
                        }}
                        className="text-xs font-bold text-brand-navy hover:underline focus:outline-none"
                      >
                        {emailMode === 'signin' 
                          ? "New to Clubhouse? Create a brand new account" 
                          : "Already have an account? Sign in here"
                        }
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>

          {/* Footer note */}
          <div className="mt-5 flex items-center justify-center gap-1 text-[11px] font-bold text-brand-navy/50 uppercase tracking-wider text-center">
            <Lock className="h-3 w-3" /> Secure Firebase Auth Sandbox Enabled
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
