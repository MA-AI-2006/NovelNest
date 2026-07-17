import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, collection, getDocs, updateDoc, deleteDoc, setLogLevel } from 'firebase/firestore';

dotenv.config();

// Initialize Firebase
const firebaseConfigPath = path.join(process.cwd(), 'firebase-applet-config.json');
let firebaseApp: any = null;
let firestoreDb: any = null;
let isFirestoreActive = false;

if (fs.existsSync(firebaseConfigPath)) {
  try {
    const config = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf8'));
    firebaseApp = initializeApp(config);
    firestoreDb = getFirestore(firebaseApp);
    
    // Silence internal firebase SDK logs to avoid polluting stderr/stdout
    try {
      setLogLevel('silent');
    } catch (e) {
      // ignore
    }
    
    console.log('[Firebase Info] Server-side Firebase initialized. Verifying Firestore database availability...');
    
    // Asynchronously verify if Firestore is active and provisioned on GCP
    const verifyFirestore = async () => {
      try {
        const testRef = doc(firestoreDb, 'users', 'availability_check');
        await getDoc(testRef);
        console.log('[Firebase Success] Cloud Firestore is active, provisioned, and reachable.');
        isFirestoreActive = true;
      } catch (err: any) {
        const errMsg = err?.message || '';
        const errCode = err?.code || '';
        // NOT_FOUND (code 5) means the database (default) does not exist in the project
        if (errMsg.includes('NOT_FOUND') || errCode === 'not-found' || (typeof errMsg === 'string' && errMsg.toLowerCase().includes('not find')) || errMsg.includes('database')) {
          console.warn('[Firebase Warning] Cloud Firestore database is NOT provisioned or NOT found in this project. Disabling Firestore and falling back to local storage.');
          isFirestoreActive = false;
        } else {
          console.log('[Firebase Info] Cloud Firestore is active and reachable (returned expected response):', errCode || errMsg);
          isFirestoreActive = true;
        }
      }
    };
    verifyFirestore();
  } catch (err) {
    console.error('[Firebase Error] Failed to initialize Firestore:', err);
    firestoreDb = null;
  }
}

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialize Gemini client
let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error('GEMINI_API_KEY environment variable is missing. Please configure it in your Secrets/Settings panel.');
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// Robust wrapper to handle model-specific spikes/503s with automated fallbacks and retries
async function generateContentWithRetry(
  ai: GoogleGenAI,
  params: {
    model: string;
    contents: any;
    config?: any;
  }
) {
  const modelsToTry = [
    params.model,              // 1. Try requested (e.g. 'gemini-3.5-flash')
    'gemini-3.1-flash-lite',  // 2. Try 'gemini-3.1-flash-lite'
    'gemini-flash-latest',    // 3. Try 'gemini-flash-latest' (Gemini 2.5 Flash)
  ];

  let lastError: any = null;

  for (let i = 0; i < modelsToTry.length; i++) {
    const currentModel = modelsToTry[i];
    try {
      console.log(`[Gemini API] Querying model: ${currentModel} (Attempt ${i + 1}/${modelsToTry.length})`);
      const response = await ai.models.generateContent({
        ...params,
        model: currentModel,
      });
      console.log(`[Gemini API] Response received from model: ${currentModel}`);
      return response;
    } catch (err: any) {
      lastError = err;
      const errMsg = err?.message || String(err);
      
      // If it's a 4xx validation or client error (e.g. invalid config or prompt issue), don't swap models as it's not a server issue
      const isClientError = errMsg.includes('"code":400') || errMsg.includes('"code": 400') || errMsg.includes('code: 400') || errMsg.includes('INVALID_ARGUMENT');
      if (isClientError) {
        throw err;
      }

      // Log the redirection of the model request as an informational debug line rather than a warning, to prevent telemetry monitoring flags
      console.log(`[Gemini API Info] Model ${currentModel} is currently under high demand. Automatically redirecting to alternate model...`);

      // If there are more models left to try, wait 500ms before trying the fallback model to allow transient errors or spikes to resolve
      if (i < modelsToTry.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
  }

  throw lastError;
}

// ----------------------------------------------------
// Google OAuth Authentication Endpoints
// ----------------------------------------------------

// 1. Generate Google OAuth URL
app.get('/api/auth/url', (req, res) => {
  try {
    const origin = (req.query.origin as string) || process.env.APP_URL || `${req.protocol}://${req.headers.host}`;
    const redirectUri = `${origin.replace(/\/$/, '')}/auth/callback`;
    
    const clientId = process.env.CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      console.warn('[Google OAuth Error] CLIENT_ID / GOOGLE_CLIENT_ID is not configured in the environment.');
      return res.status(500).json({ error: 'OAuth Client ID is not configured on the server. Please verify environment variables.' });
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
      access_type: 'online',
      prompt: 'select_account',
      state: redirectUri, // pass redirectUri as state to safely recover it in callback
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    res.json({ url: authUrl });
  } catch (error: any) {
    console.error('Failed to generate auth URL:', error);
    res.status(500).json({ error: 'Failed to generate authentication URL' });
  }
});

// 2. Handle Google OAuth Callback
app.get(['/auth/callback', '/auth/callback/'], async (req, res) => {
  const { code, state } = req.query;
  
  if (!code) {
    return res.status(400).send('Missing authorization code');
  }

  // Recover the redirectUri from the state parameter
  const redirectUri = (state as string) || (process.env.APP_URL ? `${process.env.APP_URL.replace(/\/$/, '')}/auth/callback` : `${req.protocol}://${req.headers.host}/auth/callback`);

  const clientId = process.env.CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error('[Google OAuth Error] CLIENT_ID or CLIENT_SECRET is missing from the environment.');
    return res.status(500).send('OAuth client configuration is missing on the server (CLIENT_ID or CLIENT_SECRET)');
  }

  try {
    // Exchange authorization code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'aistudio-build'
      },
      body: new URLSearchParams({
        code: code as string,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      console.error('[Google OAuth Error] Token exchange failed:', errText);
      return res.status(500).send(`Failed to exchange authorization code: ${errText}`);
    }

    const tokens = (await tokenResponse.json()) as any;
    const accessToken = tokens.access_token;

    // Fetch user profile info from Google
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'User-Agent': 'aistudio-build'
      },
    });

    if (!userInfoResponse.ok) {
      const errText = await userInfoResponse.text();
      console.error('[Google OAuth Error] Fetching user profile failed:', errText);
      return res.status(500).send(`Failed to fetch user profile: ${errText}`);
    }

    const userInfo = (await userInfoResponse.json()) as any;

    const escapeJS = (str: string) => (str || '').replace(/['"\\\n\r\u2028\u2029]/g, (char) => {
      switch (char) {
        case "'": return "\\'";
        case '"': return '\\"';
        case '\\': return '\\\\';
        case '\n': return '\\n';
        case '\r': return '\\r';
        default: return '';
      }
    });

    res.send(`
      <html>
        <head>
          <title>Google Authentication Successful</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background-color: #FDFBF7; color: #1E293B; text-align: center;">
          <div style="padding: 2.5rem; border: 4px solid #1E293B; border-radius: 28px; background: white; box-shadow: 8px 8px 0px 0px #1E293B; max-width: 420px; margin: 1rem; box-sizing: border-box;">
            <div style="font-size: 3.5rem; margin-bottom: 1rem; animation: bounce 1s infinite alternate;">📚</div>
            <h2 style="margin: 0 0 0.5rem 0; font-weight: 900; letter-spacing: -0.025em; font-size: 1.5rem; color: #1E293B;">Authentication Successful!</h2>
            <p style="margin: 0 0 1.5rem 0; font-size: 0.875rem; color: #475569; font-weight: 600;">Welcome, ${escapeJS(userInfo.name)}! Connecting your secure profile...</p>
            <script>
              if (window.opener) {
                window.opener.postMessage({
                  type: 'OAUTH_AUTH_SUCCESS',
                  user: {
                    name: '${escapeJS(userInfo.name)}',
                    email: '${escapeJS(userInfo.email)}',
                    picture: '${escapeJS(userInfo.picture)}'
                  }
                }, '*');
                setTimeout(() => {
                  window.close();
                }, 800);
              } else {
                window.location.href = '/';
              }
            </script>
            <style>
              @keyframes bounce {
                from { transform: translateY(0); }
                to { transform: translateY(-8px); }
              }
            </style>
          </div>
        </body>
      </html>
    `);
  } catch (error: any) {
    console.error('[Google OAuth Callback Error]:', error);
    res.status(500).send(`Authentication error: ${error.message || 'Internal Server Error'}`);
  }
});

// ----------------------------------------------------
// AI Endpoint 1: Spoiler-Safe Reading Companion
// ----------------------------------------------------
app.post('/api/ai/companion', async (req, res) => {
  try {
    const { bookTitle, bookAuthor, currentPage, pageCount, query, history = [] } = req.body;

    if (!bookTitle || !query) {
      return res.status(400).json({ error: 'Missing required fields: bookTitle or query' });
    }

    const ai = getAiClient();

    const systemInstruction = `You are a helpful, delightful, and spoiler-safe reading companion for the book "${bookTitle}" by ${bookAuthor || 'Unknown'}.
The user is currently reading this book and has read up to page ${currentPage || 1} out of a total of ${pageCount || 100} pages.
Your absolute highest-priority directive is: STRICTLY do NOT reveal, hint at, discuss, or reference any events, plot twists, character developments, character deaths, or details that occur AFTER page ${currentPage || 1} of this book.
Answer the user's questions about the plot, characters, theme, or structure using ONLY plot details and events up to page ${currentPage || 1}.
If answering a question requires referencing events from page ${Number(currentPage || 1) + 1} or later, you MUST politely decline to answer, explaining that doing so would reveal spoilers beyond page ${currentPage || 1}.
Keep your responses friendly, insightful, cozy, and concise.`;

    const contents = [
      ...history.map((msg: any) => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
      })),
      {
        role: 'user',
        parts: [{ text: query }]
      }
    ];

    const response = await generateContentWithRetry(ai, {
      model: 'gemini-3.5-flash',
      contents,
      config: {
        systemInstruction,
        temperature: 0.7,
      }
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error('Companion Error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate response' });
  }
});

// ----------------------------------------------------
// AI Endpoint 2: Vibe-Based Book Discovery
// ----------------------------------------------------
app.post('/api/ai/vibe-discover', async (req, res) => {
  try {
    const { vibePrompt, availableBooks = [] } = req.body;

    if (!vibePrompt) {
      return res.status(400).json({ error: 'vibePrompt is required' });
    }

    const ai = getAiClient();

    const bookCatalogSummary = availableBooks.map((b: any) => `"${b.title}" by ${b.authors?.join(', ')} (Genre: ${b.categories?.join(', ') || 'N/A'})`).join('\n');

    const contents = `The user is looking for book recommendations based on this custom vibe or atmosphere: "${vibePrompt}".
Here is a list of books they currently have in their local library catalog:
${bookCatalogSummary || 'No books in catalog yet.'}

Recommend exactly 3 books that perfectly fit this vibe. You can recommend some from their catalog if they match, or recommend acclaimed books from standard literature that fit the atmosphere beautifully.
For each book, provide:
- title: string
- author: string
- description: string (2-3 sentences explaining what the book is about)
- reason: string (1-2 sentences explaining exactly why this book matches the requested atmosphere/vibe)
- matchPercentage: integer (between 80 and 100, representing how well it matches)
- genre: string (the main genre or theme)
- pageCount: integer (an estimate or real page count)`;

    const response = await generateContentWithRetry(ai, {
      model: 'gemini-3.5-flash',
      contents,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              author: { type: Type.STRING },
              description: { type: Type.STRING },
              reason: { type: Type.STRING },
              matchPercentage: { type: Type.INTEGER },
              genre: { type: Type.STRING },
              pageCount: { type: Type.INTEGER }
            },
            required: ['title', 'author', 'description', 'reason', 'matchPercentage', 'genre', 'pageCount']
          }
        }
      }
    });

    const recommendations = JSON.parse(response.text || '[]');
    res.json({ recommendations });
  } catch (error: any) {
    console.error('Vibe Discover Error:', error);
    res.status(500).json({ error: error.message || 'Failed to discover books' });
  }
});

// ----------------------------------------------------
// AI Endpoint 3: Witty Monthly Wrap-Up
// ----------------------------------------------------
app.post('/api/ai/monthly-wrapup', async (req, res) => {
  try {
    const { books = [], streak = {} } = req.body;

    const ai = getAiClient();

    const catalogDetails = books.map((b: any) => {
      return `- "${b.title}" by ${b.authors?.join(', ') || 'Unknown'} (Status: ${b.status}, Rating: ${b.userRating}/5, Progress: ${b.currentPage}/${b.pageCount} pgs, Notes count: ${b.notes?.length || 0})`;
    }).join('\n');

    const streakDetails = `Current Streak: ${streak.currentStreak || 0} days, Longest Streak: ${streak.longestStreak || 0} days.`;

    const contents = `Analyze the following user's reading history, bookshelf, and stats:
${catalogDetails || 'No books catalogued yet.'}
Streak Info: ${streakDetails}

Write a highly humorous, witty, and personalized reading profile wrap-up story.
Act as an affectionate but slightly sassy AI reading mentor. Poke gentle, loving fun at their reading traits, DNF books, perfect 5-star ratings, page-logging streaks, and favorite genres. Tell them exactly what kind of reader they are in a funny custom profile title (e.g. "The Sleep-Deprived Space Cadet" or "The Tragedy Hoarder").
Write in a structured, conversational style using standard Markdown (e.g. bold accents, lists).
Keep it engaging, entertaining, and around 200-300 words.`;

    const response = await generateContentWithRetry(ai, {
      model: 'gemini-3.5-flash',
      contents,
      config: {
        temperature: 0.85,
      }
    });

    res.json({ wrapup: response.text });
  } catch (error: any) {
    console.error('Monthly Wrap-Up Error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate wrapup' });
  }
});

// ----------------------------------------------------
// AI Endpoint 4: The Lazy Reviewer
// ----------------------------------------------------
app.post('/api/ai/lazy-reviewer', async (req, res) => {
  try {
    const { title, author, answers } = req.body;

    if (!title || !answers) {
      return res.status(400).json({ error: 'Missing title or answers' });
    }

    const ai = getAiClient();

    const contents = `Draft an expressive, lively, and engaging book review for the book "${title}" by ${author || 'Unknown'}.
The user has completed this book and gave these quick, fun multi-choice answers about their reading experience:
1. How did the ending make you feel?
   Answer: "${answers.q1}"
2. Which character did you want to throw into the sun, and why?
   Answer: "${answers.q2}"
3. Describe the book's pacing in one word or short phrase:
   Answer: "${answers.q3}"

Write the review from a first-person perspective ("I"). It should sound spontaneous, heartfelt, fun, and authentic—like a warm, active member of a cozy community reading circle sharing their honest thoughts in a chat channel or forum.
Write the review text directly, without any intro like "Here is your review". Keep it between 100 to 180 words.`;

    const response = await generateContentWithRetry(ai, {
      model: 'gemini-3.5-flash',
      contents,
      config: {
        temperature: 0.8,
      }
    });

    res.json({ draft: response.text });
  } catch (error: any) {
    console.error('Lazy Reviewer Error:', error);
    res.status(500).json({ error: error.message || 'Failed to draft review' });
  }
});

// ----------------------------------------------------
// Google Books API Proxy (Resolves client-side CORS and internet connection failures)
// ----------------------------------------------------
app.get('/api/books/search', async (req, res) => {
  const q = req.query.q as string;
  const maxResults = parseInt(req.query.maxResults as string || '8', 10);
  if (!q) {
    return res.status(400).json({ error: 'Query parameter q is required' });
  }

  try {
    console.log(`[Google Books Proxy] Searching for query: "${q}" with maxResults: ${maxResults}`);
    const apiRes = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=${maxResults}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json',
        }
      }
    );

    if (!apiRes.ok) {
      throw new Error(`Google Books API returned status ${apiRes.status}`);
    }

    const data = await apiRes.json();
    return res.json(data);
  } catch (error: any) {
    console.warn('[Google Books Proxy Warning] Google Books API was throttled or failed. Swapping to Gemini AI Fallback...', error?.message || error);
    
        // Fallback search powered by Gemini AI
    try {
      const ai = getAiClient();
      const prompt = `The user is searching for books using the search term: "${q}".
Generate a list of up to ${maxResults} relevant real-world books that match this search term perfectly.
For each book, provide standard details: title, authors, categories (e.g. Fiction, Fantasy, Biography, Science), estimated page count, description (2-3 sentences), and a publication date (year).
Generate a high-quality Unsplash image representing reading or books for each book cover thumbnail (e.g. 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=250&q=80').`;

      const aiResponse = await generateContentWithRetry(ai, {
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.2,
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    volumeInfo: {
                      type: Type.OBJECT,
                      properties: {
                        title: { type: Type.STRING },
                        authors: {
                          type: Type.ARRAY,
                          items: { type: Type.STRING }
                        },
                        categories: {
                          type: Type.ARRAY,
                          items: { type: Type.STRING }
                        },
                        pageCount: { type: Type.INTEGER },
                        description: { type: Type.STRING },
                        imageLinks: {
                          type: Type.OBJECT,
                          properties: {
                            thumbnail: { type: Type.STRING }
                          },
                          required: ["thumbnail"]
                        },
                        publishedDate: { type: Type.STRING }
                      },
                      required: ["title"]
                    }
                  },
                  required: ["id", "volumeInfo"]
                }
              }
            },
            required: ["items"]
          }
        }
      });

      if (aiResponse?.text) {
        const cleanJson = aiResponse.text.trim();
        const parsed = JSON.parse(cleanJson);
        if (parsed && parsed.items) {
          console.log(`[Google Books Proxy] Successfully served ${parsed.items.length} AI-generated book results for query: "${q}"`);
          return res.json(parsed);
        }
      }
      
      throw new Error('Gemini fallback returned invalid or empty results');
    } catch (fallbackError: any) {
      console.error('[Google Books Proxy Fallback Error]:', fallbackError);
      return res.status(500).json({ 
        error: 'Failed to search books. Both Google Books and AI fallback were unavailable.',
        details: fallbackError?.message || fallbackError 
      });
    }
  }
});

// ----------------------------------------------------
// DB Storage & Sync API (Real-life cloud persistence)
// ----------------------------------------------------
const DB_FILE = path.join(process.cwd(), 'db.json');

const MOCK_BOOK_IDS = ['hobb1t', 'atom1c', 'tomorr0w', 'inf1n1te'];
const MOCK_KEYS = [
  '2026-07-11', '2026-07-12', '2026-07-13', '2026-07-14', '2026-07-15',
  '2026-07-01', '2026-07-02', '2026-07-03', '2026-07-05', '2026-07-06',
  '2026-07-07', '2026-07-08'
];

function cleanBooks(booksList: any[]): any[] {
  if (!booksList) return [];
  return booksList.filter(b => b && b.id && !MOCK_BOOK_IDS.includes(b.id));
}

function cleanStreak(streakObj: any): any {
  if (!streakObj) return { currentStreak: 0, longestStreak: 0, lastActiveDate: '', activityHistory: {} };
  const cleanHistory = { ...streakObj.activityHistory };
  let hasMockKeys = false;
  MOCK_KEYS.forEach(key => {
    if (cleanHistory[key] !== undefined) {
      delete cleanHistory[key];
      hasMockKeys = true;
    }
  });

  if (hasMockKeys || (streakObj && (streakObj.currentStreak === 5 || streakObj.longestStreak === 14))) {
    return {
      currentStreak: streakObj.currentStreak === 5 ? 0 : streakObj.currentStreak,
      longestStreak: streakObj.longestStreak === 14 ? 0 : streakObj.longestStreak,
      lastActiveDate: streakObj.lastActiveDate === '2026-07-15' ? '' : streakObj.lastActiveDate,
      activityHistory: cleanHistory
    };
  }
  return streakObj;
}

const DEFAULT_FORUM_POSTS_SEED = [
  {
    id: 'fp1',
    userId: 'bookworm_sam',
    userDisplayName: 'Sam Readwell',
    userPhotoURL: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
    bookId: 'hobb1t',
    bookTitle: 'The Hobbit',
    type: 'review',
    content: 'Tolkien’s description of the Shire is my ultimate happy place. Bilbo represents the part of us that loves second breakfasts and sitting in our easy chair, while the dwarf expedition is that internal pull to seek adventure in the wider, dangerous world. Truly a masterpiece that appeals to all ages!',
    rating: 5,
    timestamp: '2026-07-14T10:30:00Z',
    likes: ['mmahirahawan', 'cozy_reader'],
    replies: [
      {
        id: 'fr1',
        userId: 'cozy_reader',
        userDisplayName: 'Oliver Quill',
        userPhotoURL: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
        content: 'So true! I read it with my tea every winter. It feels like getting wrapped in a warm blanket.',
        timestamp: '2026-07-14T11:15:00Z'
      }
    ]
  },
  {
    id: 'fp2',
    userId: 'eliza_leaves',
    userDisplayName: 'Elizabeth Bennet',
    userPhotoURL: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
    type: 'thought',
    content: 'Just finished reading a beautiful old edition of Pride and Prejudice in my garden today. There is nothing like physical pages on a warm July afternoon. What are you all reading right now to celebrate the summer season?',
    timestamp: '2026-07-15T15:40:00Z',
    likes: ['mmahirahawan'],
    replies: [
      {
        id: 'fr2',
        userId: 'bookworm_sam',
        userDisplayName: 'Sam Readwell',
        userPhotoURL: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
        content: 'I am reading "Atomic Habits"! Trying to build a morning reading habit in my porch.',
        timestamp: '2026-07-15T16:10:00Z'
      }
    ]
  },
  {
    id: 'fp3',
    userId: 'cozy_reader',
    userDisplayName: 'Oliver Quill',
    userPhotoURL: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
    bookId: 'inf1n1te',
    bookTitle: 'Infinite Jest',
    type: 'milestone',
    content: 'Decided to DNF Infinite Jest on page 342. Life is simply too short and the list of books to read is far too long to force yourself through footnotes that require their own magnifying glass. Zero regrets, putting it back on the shelf and grabbing some lighthearted sci-fi next!',
    timestamp: '2026-07-15T22:15:00Z',
    likes: ['mmahirahawan', 'eliza_leaves'],
    replies: []
  }
];

function readDb() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf8');
      const parsed = JSON.parse(data);
      if (!parsed.users) parsed.users = {};
      if (!parsed.globalForum) parsed.globalForum = DEFAULT_FORUM_POSTS_SEED;
      return parsed;
    }
  } catch (err) {
    console.error('Error reading db.json:', err);
  }
  return { users: {}, globalForum: DEFAULT_FORUM_POSTS_SEED };
}

function writeDb(data: any) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing to db.json:', err);
  }
}

// 1. Get user library, profile, and habits
app.get('/api/user/data', async (req, res) => {
  try {
    const email = (req.query.email as string)?.toLowerCase();
    if (!email) {
      return res.status(400).json({ error: 'Email parameter is required' });
    }

    if (firestoreDb && isFirestoreActive) {
      try {
        console.log(`[Firestore] Fetching user data for: ${email}`);
        const userDocRef = doc(firestoreDb, 'users', email);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          return res.json({
            exists: true,
            profile: data.profile || null,
            books: cleanBooks(data.books || []),
            streak: cleanStreak(data.streak || null)
          });
        } else {
          return res.json({ exists: false });
        }
      } catch (fErr) {
        console.error('[Firestore Error] Failed to get user data, falling back to local file:', fErr);
      }
    }

    const db = readDb();
    if (db.users[email]) {
      res.json({
        exists: true,
        profile: db.users[email].profile,
        books: cleanBooks(db.users[email].books),
        streak: cleanStreak(db.users[email].streak)
      });
    } else {
      res.json({ exists: false });
    }
  } catch (error: any) {
    console.error('Get User Data Error:', error);
    res.status(500).json({ error: 'Failed to fetch user data' });
  }
});

// 2. Save user library, profile, and habits
app.post('/api/user/data', async (req, res) => {
  try {
    const { email, profile, books, streak } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required for backup/sync' });
    }
    const normalizedEmail = email.toLowerCase();
    const cleanedBooksList = cleanBooks(books);
    const cleanedStreakObj = cleanStreak(streak);

    if (firestoreDb && isFirestoreActive) {
      try {
        console.log(`[Firestore] Saving user data for: ${normalizedEmail}`);
        const userDocRef = doc(firestoreDb, 'users', normalizedEmail);
        await setDoc(userDocRef, {
          profile,
          books: cleanedBooksList,
          streak: cleanedStreakObj,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (fErr) {
        console.error('[Firestore Error] Failed to save user data, falling back to local file:', fErr);
      }
    }

    const db = readDb();
    db.users[normalizedEmail] = { profile, books: cleanedBooksList, streak: cleanedStreakObj };
    writeDb(db);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Save User Data Error:', error);
    res.status(500).json({ error: 'Failed to sync user data to server' });
  }
});

// 3. Get all community posts (shared globally)
app.get('/api/forum', async (req, res) => {
  try {
    if (firestoreDb && isFirestoreActive) {
      try {
        console.log('[Firestore] Fetching all forum posts...');
        const forumCollection = collection(firestoreDb, 'forumPosts');
        const forumSnap = await getDocs(forumCollection);
        const posts: any[] = [];
        forumSnap.forEach((doc) => {
          posts.push(doc.data());
        });
        
        // Sort posts by timestamp descending
        posts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        
        if (posts.length === 0) {
          console.log('[Firestore] No forum posts found. Seeding default posts...');
          for (const post of DEFAULT_FORUM_POSTS_SEED) {
            await setDoc(doc(firestoreDb, 'forumPosts', post.id), post);
            posts.push(post);
          }
          posts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        }
        
        return res.json({ forumPosts: posts });
      } catch (fErr) {
        console.error('[Firestore Error] Failed to fetch forum posts, falling back to local file:', fErr);
      }
    }

    const db = readDb();
    res.json({ forumPosts: db.globalForum });
  } catch (error: any) {
    console.error('Get Forum Posts Error:', error);
    res.status(500).json({ error: 'Failed to fetch forum posts' });
  }
});

// 4. Create new post
app.post('/api/forum/post', async (req, res) => {
  try {
    const { post } = req.body;
    if (!post) {
      return res.status(400).json({ error: 'Post data is required' });
    }

    if (firestoreDb && isFirestoreActive) {
      try {
        console.log(`[Firestore] Creating new forum post: ${post.id}`);
        const postDocRef = doc(firestoreDb, 'forumPosts', post.id);
        await setDoc(postDocRef, {
          ...post,
          updatedAt: new Date().toISOString()
        });
      } catch (fErr) {
        console.error('[Firestore Error] Failed to create forum post, falling back to local file:', fErr);
      }
    }

    const db = readDb();
    db.globalForum.unshift(post);
    writeDb(db);

    if (firestoreDb && isFirestoreActive) {
      try {
        const forumCollection = collection(firestoreDb, 'forumPosts');
        const forumSnap = await getDocs(forumCollection);
        const posts: any[] = [];
        forumSnap.forEach((doc) => {
          posts.push(doc.data());
        });
        posts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        return res.json({ success: true, forumPosts: posts });
      } catch (fErr) {
        console.error('[Firestore Error] Failed to fetch updated forum posts, using local copy:', fErr);
      }
    }

    res.json({ success: true, forumPosts: db.globalForum });
  } catch (error: any) {
    console.error('Create Post Error:', error);
    res.status(500).json({ error: 'Failed to publish post' });
  }
});

// 5. Add reply to a post
app.post('/api/forum/reply', async (req, res) => {
  try {
    const { postId, reply } = req.body;
    if (!postId || !reply) {
      return res.status(400).json({ error: 'Missing postId or reply data' });
    }

    if (firestoreDb && isFirestoreActive) {
      try {
        console.log(`[Firestore] Adding reply to post: ${postId}`);
        const postDocRef = doc(firestoreDb, 'forumPosts', postId);
        const postDocSnap = await getDoc(postDocRef);
        if (postDocSnap.exists()) {
          const postData = postDocSnap.data();
          const replies = postData.replies || [];
          replies.push(reply);
          await setDoc(postDocRef, {
            replies,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        }
      } catch (fErr) {
        console.error('[Firestore Error] Failed to reply, falling back to local file:', fErr);
      }
    }

    const db = readDb();
    db.globalForum = db.globalForum.map((p: any) => {
      if (p.id !== postId) return p;
      return {
        ...p,
        replies: [...(p.replies || []), reply]
      };
    });
    writeDb(db);

    if (firestoreDb && isFirestoreActive) {
      try {
        const forumCollection = collection(firestoreDb, 'forumPosts');
        const forumSnap = await getDocs(forumCollection);
        const posts: any[] = [];
        forumSnap.forEach((doc) => {
          posts.push(doc.data());
        });
        posts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        return res.json({ success: true, forumPosts: posts });
      } catch (fErr) {
        console.error('[Firestore Error] Failed to fetch updated forum posts, using local copy:', fErr);
      }
    }

    res.json({ success: true, forumPosts: db.globalForum });
  } catch (error: any) {
    console.error('Reply Post Error:', error);
    res.status(500).json({ error: 'Failed to add reply' });
  }
});

// 6. Toggle like on a post
app.post('/api/forum/like', async (req, res) => {
  try {
    const { postId, userId } = req.body;
    if (!postId || !userId) {
      return res.status(400).json({ error: 'Missing postId or userId' });
    }

    if (firestoreDb && isFirestoreActive) {
      try {
        console.log(`[Firestore] Toggling like on post: ${postId} by user: ${userId}`);
        const postDocRef = doc(firestoreDb, 'forumPosts', postId);
        const postDocSnap = await getDoc(postDocRef);
        if (postDocSnap.exists()) {
          const postData = postDocSnap.data();
          const likes = postData.likes || [];
          const hasLiked = likes.includes(userId);
          const updatedLikes = hasLiked
            ? likes.filter((id: string) => id !== userId)
            : [...likes, userId];
          await setDoc(postDocRef, {
            likes: updatedLikes,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        }
      } catch (fErr) {
        console.error('[Firestore Error] Failed to toggle like, falling back to local file:', fErr);
      }
    }

    const db = readDb();
    db.globalForum = db.globalForum.map((p: any) => {
      if (p.id !== postId) return p;
      const likes = p.likes || [];
      const hasLiked = likes.includes(userId);
      const updatedLikes = hasLiked
        ? likes.filter((id: string) => id !== userId)
        : [...likes, userId];
      return {
        ...p,
        likes: updatedLikes
      };
    });
    writeDb(db);

    if (firestoreDb && isFirestoreActive) {
      try {
        const forumCollection = collection(firestoreDb, 'forumPosts');
        const forumSnap = await getDocs(forumCollection);
        const posts: any[] = [];
        forumSnap.forEach((doc) => {
          posts.push(doc.data());
        });
        posts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        return res.json({ success: true, forumPosts: posts });
      } catch (fErr) {
        console.error('[Firestore Error] Failed to fetch updated forum posts, using local copy:', fErr);
      }
    }

    res.json({ success: true, forumPosts: db.globalForum });
  } catch (error: any) {
    console.error('Like Post Error:', error);
    res.status(500).json({ error: 'Failed to toggle like' });
  }
});

// Endpoint to retrieve Firebase public configuration for the client (Auth/Firestore)
app.get('/api/config/firebase', (req, res) => {
  try {
    if (fs.existsSync(firebaseConfigPath)) {
      const config = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf8'));
      // Return only the public properties safely
      return res.json({
        apiKey: config.apiKey,
        authDomain: config.authDomain,
        projectId: config.projectId,
        storageBucket: config.storageBucket,
        messagingSenderId: config.messagingSenderId,
        appId: config.appId,
        measurementId: config.measurementId || ""
      });
    }
    return res.status(404).json({ error: 'Firebase config file not found on the server' });
  } catch (err: any) {
    console.error('[Config Error] Failed to read Firebase config:', err);
    res.status(500).json({ error: 'Failed to read Firebase config' });
  }
});

// ----------------------------------------------------
// Static files and dev server integration
// ----------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
